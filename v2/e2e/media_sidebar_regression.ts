import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync } from "node:fs";
import { chromium, type Browser, type Page } from "playwright";

const BASE_PORT = 5349;
const SERVER_JS = new URL(
  "../_build/js/release/build/server/server.js",
  import.meta.url,
).pathname;
const FEATURES_MD = new URL("../../examples/test-features.md", import.meta.url).pathname;
const LOCK_DIR = join(tmpdir(), "dozo-media-sidebar-locks");

mkdirSync(LOCK_DIR, { recursive: true });

let failed = 0;

function pass(msg: string, detail?: unknown): void {
  console.log(`PASS: ${msg}`);
  if (detail !== undefined) {
    console.log(JSON.stringify(detail, null, 2));
  }
}

function fail(msg: string, detail?: unknown): void {
  failed++;
  console.error(`FAIL: ${msg}`);
  if (detail !== undefined) {
    console.error(JSON.stringify(detail, null, 2));
  }
}

function assert(condition: boolean, msg: string, detail?: unknown): void {
  if (condition) {
    pass(msg, detail);
  } else {
    fail(msg, detail);
  }
}

function waitForServerOutput(proc: ChildProcess): Promise<number> {
  let stdout = "";
  let resolved = false;
  return new Promise((resolve, reject) => {
    proc.stdout!.on("data", (chunk: Buffer) => {
      stdout += String(chunk);
      if (resolved) return;
      const match = stdout.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        resolved = true;
        resolve(parseInt(match[1], 10));
      }
    });
    proc.stderr!.on("data", (chunk: Buffer) => {
      stdout += String(chunk);
    });
    proc.on("exit", (code: number | null) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`server exited before ready (code=${code})\n${stdout}`));
      }
    });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`server startup timeout\n${stdout}`));
      }
    }, 10000);
  });
}

async function waitForHealth(port: number): Promise<void> {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (res.ok) return;
    } catch (_: unknown) {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`healthz timeout on ${port}`);
}

interface MinimapSelectors {
  source: string;
  wrapper: string;
  viewport: string;
  minimap: string;
  minimapSvg: string;
  minimapViewport: string;
}

interface MinimapMeasurement {
  ok: boolean;
  reason?: string;
  found?: Record<string, boolean>;
  sourceRect?: DOMRect;
  wrapperRect?: DOMRect;
  viewportRect?: DOMRect;
  minimapRect?: DOMRect;
  minimapSvgRect?: DOMRect;
  actualRect?: Record<string, number>;
  expectedRect?: Record<string, number>;
  delta?: Record<string, number>;
  maxAbsDelta?: number;
  zoom?: number;
  panX?: number;
  panY?: number;
}

async function measureMinimap(page: Page, selectors: MinimapSelectors): Promise<MinimapMeasurement> {
  return page.evaluate((sel) => {
    const source = document.querySelector(sel.source);
    const wrapper = document.querySelector(sel.wrapper);
    const viewport = document.querySelector(sel.viewport);
    const minimap = document.querySelector(sel.minimap);
    const minimapSvg = document.querySelector(sel.minimapSvg);
    const minimapViewport = document.querySelector(sel.minimapViewport);

    if (!source || !wrapper || !viewport || !minimap || !minimapSvg || !minimapViewport) {
      return {
        ok: false,
        reason: "missing-elements",
        found: {
          source: !!source,
          wrapper: !!wrapper,
          viewport: !!viewport,
          minimap: !!minimap,
          minimapSvg: !!minimapSvg,
          minimapViewport: !!minimapViewport,
        },
      };
    }

    const rect = (el: Element) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      };
    };

    const sourceRect = rect(source);
    const wrapperRect = rect(wrapper);
    const viewportRect = rect(viewport);
    const minimapRect = rect(minimap);
    const minimapSvgRect = rect(minimapSvg);
    const actualRect = rect(minimapViewport);

    const matrix = new DOMMatrixReadOnly(
      getComputedStyle(wrapper).transform === "none" ? undefined : getComputedStyle(wrapper).transform,
    );
    const zoom = matrix.a || 1;
    const panX = matrix.e || 0;
    const panY = matrix.f || 0;
    const naturalWidth = wrapperRect.width / zoom;
    const naturalHeight = wrapperRect.height / zoom;

    if (
      sourceRect.width <= 0 ||
      sourceRect.height <= 0 ||
      naturalWidth <= 0 ||
      naturalHeight <= 0 ||
      viewportRect.width <= 0 ||
      viewportRect.height <= 0
    ) {
      return {
        ok: false,
        reason: "invalid-geometry",
        sourceRect,
        wrapperRect,
        viewportRect,
        minimapRect,
        minimapSvgRect,
        actualRect,
      } as any;
    }

    const visibleW = viewportRect.width / zoom;
    const visibleH = viewportRect.height / zoom;
    const worldX = -panX / zoom;
    const worldY = -panY / zoom;
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const visibleLeft = clamp(worldX, 0, naturalWidth);
    const visibleTop = clamp(worldY, 0, naturalHeight);
    const visibleRight = clamp(worldX + visibleW, 0, naturalWidth);
    const visibleBottom = clamp(worldY + visibleH, 0, naturalHeight);
    const scaleX = minimapSvgRect.width / naturalWidth;
    const scaleY = minimapSvgRect.height / naturalHeight;
    const expectedRect = {
      left:
        (minimapSvgRect.left - minimapRect.left) +
        visibleLeft * scaleX,
      top:
        (minimapSvgRect.top - minimapRect.top) +
        visibleTop * scaleY,
      width: Math.max(0, visibleRight - visibleLeft) * scaleX,
      height: Math.max(0, visibleBottom - visibleTop) * scaleY,
    };
    const actualNormalized = {
      left: actualRect.left - minimapRect.left,
      top: actualRect.top - minimapRect.top,
      width: actualRect.width,
      height: actualRect.height,
    };

    const delta = {
      left: actualNormalized.left - expectedRect.left,
      top: actualNormalized.top - expectedRect.top,
      width: actualNormalized.width - expectedRect.width,
      height: actualNormalized.height - expectedRect.height,
    };
    const maxAbsDelta = Math.max(
      Math.abs(delta.left),
      Math.abs(delta.top),
      Math.abs(delta.width),
      Math.abs(delta.height),
    );

    return {
      ok: true,
      sourceRect,
      wrapperRect,
      viewportRect,
      minimapRect,
      minimapSvgRect,
      actualRect: actualNormalized,
      expectedRect,
      delta,
      maxAbsDelta,
      zoom,
      panX,
      panY,
    } as any;
  }, selectors);
}

interface NavState {
  activeIndex: number | null;
  highlightedIndex: number | null;
  highlightCount: number;
  visibleRatio: number | null;
}

// Video extensions accepted by the runtime (collect_media_items in media_sidebar.mbt).
// Keep in sync so test indices never drift from sidebar thumb indices.
const VIDEO_EXTS = [".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v", ".ogv"];

// Snapshot of the scroll-navigator state: which thumb is active, which
// preview media is highlighted, and how visible the media at `index` is.
async function measureNavState(page: Page, index: number): Promise<NavState> {
  return page.evaluate(({ idx, exts }) => {
    const preview = document.querySelector(".md-preview");
    const mediaEls = preview
      ? Array.from(preview.querySelectorAll("img, video.video-preview, .mermaid-container")).filter((el) => {
          if (el.tagName === "IMG" && el.closest(".video-timeline")) return false;
          if (el.tagName !== "VIDEO") return true;
          const src = (el.getAttribute("src") || "").toLowerCase();
          return exts.some((ext: string) => src.endsWith(ext));
        })
      : [];
    const activeThumb = document.querySelector(".media-sidebar-thumb.active");
    const activeIndex = activeThumb
      ? parseInt(activeThumb.getAttribute("data-media-index") || "-1", 10)
      : null;
    const highlighted = Array.from(document.querySelectorAll(".media-nav-highlight"));
    const highlightedIndex = highlighted.length === 1 ? mediaEls.indexOf(highlighted[0]) : null;

    let visibleRatio: number | null = null;
    const target = mediaEls[idx];
    if (target) {
      const r = target.getBoundingClientRect();
      const vh = window.innerHeight;
      const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      visibleRatio = visible / Math.min(r.height, vh);
    }

    return {
      activeIndex,
      highlightedIndex,
      highlightCount: highlighted.length,
      visibleRatio,
    };
  }, { idx: index, exts: VIDEO_EXTS });
}

// Wait until the smooth scroll towards media `index` settles (target rect
// stable for several consecutive polls) instead of a fixed sleep.
async function waitForNavSettle(page: Page, index: number): Promise<void> {
  await page.waitForFunction(
    ({ idx, exts }) => {
      const w = window as any;
      const preview = document.querySelector(".md-preview");
      if (!preview) return false;
      const mediaEls = Array.from(preview.querySelectorAll("img, video.video-preview, .mermaid-container")).filter((el) => {
        if (el.tagName === "IMG" && el.closest(".video-timeline")) return false;
        if (el.tagName !== "VIDEO") return true;
        const src = (el.getAttribute("src") || "").toLowerCase();
        return exts.some((ext: string) => src.endsWith(ext));
      });
      const target = mediaEls[idx];
      if (!target) return false;
      const top = target.getBoundingClientRect().top;
      if (!w.__navSettle || w.__navSettle.idx !== idx) {
        w.__navSettle = { idx, top, stable: 0 };
        return false;
      }
      if (Math.abs(w.__navSettle.top - top) < 0.5) {
        w.__navSettle.stable++;
      } else {
        w.__navSettle.top = top;
        w.__navSettle.stable = 0;
      }
      return w.__navSettle.stable >= 3;
    },
    { idx: index, exts: VIDEO_EXTS },
    { timeout: 10000, polling: 100 },
  );
}

// Start sampling preview media counts (50ms interval) to prove nothing
// disappears mid-navigation — guards the original "blank flash" complaint.
async function startMediaSampler(page: Page): Promise<void> {
  await page.evaluate((exts) => {
    const w = window as any;
    w.__mediaSamples = [];
    w.__mediaSampler = setInterval(() => {
      const preview = document.querySelector(".md-preview");
      const els = preview
        ? Array.from(preview.querySelectorAll("img, video.video-preview, .mermaid-container")).filter((el) => {
            if (el.tagName === "IMG" && el.closest(".video-timeline")) return false;
            if (el.tagName !== "VIDEO") return true;
            const src = (el.getAttribute("src") || "").toLowerCase();
            return exts.some((ext: string) => src.endsWith(ext));
          })
        : [];
      let rendered = 0;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none") rendered++;
      });
      w.__mediaSamples.push({ total: els.length, rendered });
    }, 50);
  }, VIDEO_EXTS);
}

async function stopMediaSampler(page: Page): Promise<Array<{ total: number; rendered: number }>> {
  return page.evaluate(() => {
    const w = window as any;
    clearInterval(w.__mediaSampler);
    return w.__mediaSamples as Array<{ total: number; rendered: number }>;
  });
}

const proc = spawn(
  "node",
  [SERVER_JS, "--no-open", "--port", String(BASE_PORT), FEATURES_MD],
  {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, DOZO_LOCK_DIR: LOCK_DIR },
  },
);

let browser: Browser | undefined;

try {
  const port = await waitForServerOutput(proc);
  await waitForHealth(port);

  browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const pageErrors: string[] = [];

  page.on("pageerror", (err) => {
    pageErrors.push(String(err));
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      pageErrors.push(`console:${msg.text()}`);
    }
  });

  await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  const thumbSummary = await page.evaluate((exts) => {
    const preview = document.querySelector(".md-preview");
    const thumbs = Array.from(document.querySelectorAll(".media-sidebar-thumb"));
    const expected = preview
      ? Array.from(preview.querySelectorAll("img, video.video-preview, .mermaid-container")).filter((el) => {
          if (el.tagName === "IMG" && el.closest(".video-timeline")) return false;
          if (el.tagName !== "VIDEO") return true;
          const src = (el.getAttribute("src") || "").toLowerCase();
          return exts.some((ext: string) => src.endsWith(ext));
        }).length
      : 0;
    return {
      expected,
      actual: thumbs.length,
      details: thumbs.map((thumb, index) => {
        const media = thumb.querySelector("img, video, svg");
        const rect = media?.getBoundingClientRect();
        return {
          index,
          childTag: media?.tagName || null,
          width: rect?.width || 0,
          height: rect?.height || 0,
          text: thumb.textContent!.trim().slice(0, 80),
        };
      }),
    };
  }, VIDEO_EXTS);

  assert(pageErrors.length === 0, "ページ初期化でJS例外が出ない", pageErrors);
  assert(
    thumbSummary.actual === thumbSummary.expected && thumbSummary.actual > 0,
    "Media Sidebar が全メディア分のサムネイルを描画する",
    thumbSummary,
  );
  assert(
    thumbSummary.details.every((item) => item.width >= 20 && item.height >= 20),
    "各サムネイルに可視メディアが入る",
    thumbSummary.details,
  );

  // --- Scroll-navigator spec: the 45vw sidebar viewer panel is gone ---
  const viewerGone = await page.evaluate(() => ({
    viewerEl: !!document.querySelector("#media-sidebar-viewer"),
    viewerClass: !!document.querySelector(".media-sidebar-viewer"),
  }));
  assert(
    !viewerGone.viewerEl && !viewerGone.viewerClass,
    "サイドバービューアパネルがDOMに存在しない（スクロールナビ仕様）",
    viewerGone,
  );

  // --- Click the last thumbnail: preview scrolls to that media + highlight ---
  const lastIdx = thumbSummary.actual - 1;
  await page.locator(`.media-sidebar-thumb[data-media-index="${lastIdx}"]`).click();
  await waitForNavSettle(page, lastIdx);

  const afterClick = await measureNavState(page, lastIdx);
  assert(
    afterClick.activeIndex === lastIdx,
    "サムネクリックで該当サムネが active になる",
    afterClick,
  );
  assert(
    afterClick.visibleRatio !== null && afterClick.visibleRatio >= 0.5,
    "サムネクリックでメインプレビューが該当メディアまでスクロールする",
    afterClick,
  );
  assert(
    afterClick.highlightCount === 1 && afterClick.highlightedIndex === lastIdx,
    "スクロール先のメディアにハイライトリングが付く",
    afterClick,
  );

  // --- Highlight auto-clears after ~1.6s (poll instead of fixed sleep) ---
  const highlightCleared = await page.waitForFunction(
    () => document.querySelectorAll(".media-nav-highlight").length === 0,
    undefined,
    { timeout: 5000 },
  ).then(() => true).catch(() => false);
  assert(highlightCleared, "ハイライトリングは約1.6秒で自動的に消える");

  // --- Arrow navigation while sampling media counts: nothing may disappear
  //     mid-transition (guards the original "blank flash" complaint) ---
  await startMediaSampler(page);

  await page.keyboard.press("ArrowUp");
  await waitForNavSettle(page, lastIdx - 1);
  const afterUp = await measureNavState(page, lastIdx - 1);
  assert(
    afterUp.activeIndex === lastIdx - 1 &&
      afterUp.visibleRatio !== null &&
      afterUp.visibleRatio >= 0.5 &&
      afterUp.highlightedIndex === lastIdx - 1,
    "ArrowUp で前のメディアへスクロール＆ハイライトする",
    afterUp,
  );

  await page.keyboard.press("ArrowDown");
  await waitForNavSettle(page, lastIdx);
  const afterDown = await measureNavState(page, lastIdx);
  assert(
    afterDown.activeIndex === lastIdx &&
      afterDown.visibleRatio !== null &&
      afterDown.visibleRatio >= 0.5,
    "ArrowDown で次のメディアへ戻る",
    afterDown,
  );

  const samples = await stopMediaSampler(page);
  const expectedCount = thumbSummary.expected;
  const flickered = samples.filter((s) => s.total !== expectedCount || s.rendered !== expectedCount);
  assert(
    samples.length >= 5 && flickered.length === 0,
    "矢印キー遷移中もプレビューのメディアが一切消えない（チラつき非再発）",
    { sampleCount: samples.length, expectedCount, flickered: flickered.slice(0, 5) },
  );

  // --- Escape clears the active selection and highlight ---
  await page.keyboard.press("Escape");
  const escaped = await page.waitForFunction(
    () =>
      !document.querySelector(".media-sidebar-thumb.active") &&
      document.querySelectorAll(".media-nav-highlight").length === 0,
    undefined,
    { timeout: 3000 },
  ).then(() => true).catch(() => false);
  const afterEscape = await measureNavState(page, lastIdx);
  assert(
    escaped && afterEscape.activeIndex === null && afterEscape.highlightCount === 0,
    "Escape で active とハイライトが解除される",
    afterEscape,
  );

  // --- Fullscreen Mermaid minimap (full-size viewing now lives here) ---
  await page.locator(".mermaid-fullscreen-btn").first().click();
  await page.waitForTimeout(800);
  const fullscreenMeasure = await measureMinimap(page, {
    source: "#fs-wrapper svg",
    wrapper: "#fs-wrapper",
    viewport: "#fs-content",
    minimap: "#fs-minimap",
    minimapSvg: "#fs-minimap-content svg",
    minimapViewport: "#fs-minimap-viewport",
  });
  assert(
    fullscreenMeasure.ok && fullscreenMeasure.maxAbsDelta! <= 3,
    "Fullscreen Mermaid ミニマップが表示領域に追従する",
    fullscreenMeasure,
  );

  const fullscreenViewport = page.locator("#fs-content");
  const fullscreenBox = await fullscreenViewport.boundingBox();
  await page.mouse.move(fullscreenBox!.x + fullscreenBox!.width * 0.72, fullscreenBox!.y + fullscreenBox!.height * 0.46);
  await page.mouse.down();
  await page.mouse.move(fullscreenBox!.x + fullscreenBox!.width * 0.54, fullscreenBox!.y + fullscreenBox!.height * 0.34, {
    steps: 8,
  });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const fullscreenAfterPan = await measureMinimap(page, {
    source: "#fs-wrapper svg",
    wrapper: "#fs-wrapper",
    viewport: "#fs-content",
    minimap: "#fs-minimap",
    minimapSvg: "#fs-minimap-content svg",
    minimapViewport: "#fs-minimap-viewport",
  });
  assert(
    fullscreenAfterPan.ok && fullscreenAfterPan.maxAbsDelta! <= 3,
    "Fullscreen Mermaid ミニマップがパン後も表示領域に追従する",
    fullscreenAfterPan,
  );

  await page.keyboard.down("Control");
  await page.mouse.move(fullscreenBox!.x + fullscreenBox!.width / 2, fullscreenBox!.y + fullscreenBox!.height / 2);
  await page.mouse.wheel(0, -500);
  await page.keyboard.up("Control");
  await page.waitForTimeout(250);
  const fullscreenAfterZoom = await measureMinimap(page, {
    source: "#fs-wrapper svg",
    wrapper: "#fs-wrapper",
    viewport: "#fs-content",
    minimap: "#fs-minimap",
    minimapSvg: "#fs-minimap-content svg",
    minimapViewport: "#fs-minimap-viewport",
  });
  assert(
    fullscreenAfterZoom.ok && fullscreenAfterZoom.maxAbsDelta! <= 3,
    "Fullscreen Mermaid ミニマップがズーム後も表示領域に追従する",
    fullscreenAfterZoom,
  );

  // --- Fullscreen video viewer: settings panel button functionality ---
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const fsBtn = page.locator(".video-fs-overlay-btn").first();
  if (await fsBtn.count() > 0) {
    await fsBtn.click();
    await page.waitForTimeout(1500);

    const overlayVisible = await page.evaluate(() => {
      const overlay = document.querySelector("#video-fullscreen");
      return overlay ? overlay.classList.contains("visible") : false;
    });
    assert(overlayVisible, "動画フルスクリーンビューアが開く");

    // Open settings panel
    const settingsBtn = page.locator("#video-settings-btn");
    if (await settingsBtn.count() > 0) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      const panelVisible = await page.evaluate(() => {
        const p = document.querySelector("#video-settings-panel");
        return p ? p.classList.contains("visible") : false;
      });
      assert(panelVisible, "Video settings panel opens on button click");

      // Click a non-selected button in the first settings row
      const result = await page.evaluate(() => {
        const rows = document.querySelectorAll("#video-settings-panel .video-settings-buttons");
        if (!rows[0]) return { ok: false, reason: "no button row", rowCount: rows.length };
        const buttons = rows[0].querySelectorAll("button");
        if (buttons.length < 2) return { ok: false, reason: "not enough buttons", count: buttons.length };
        const initialSelected = Array.from(buttons).findIndex(b => b.classList.contains("selected"));
        const targetIdx = initialSelected === 0 ? 1 : 0;
        (buttons[targetIdx] as HTMLElement).click();
        const newSelected = Array.from(buttons).findIndex(b => b.classList.contains("selected"));
        return { ok: newSelected === targetIdx, initialSelected, newSelected, targetIdx };
      });
      assert(result.ok, "Video settings button click updates selected state", result);
    } else {
      fail("動画フルスクリーンの settings ボタンが見つからない");
    }
  } else {
    fail("動画の fullscreen ボタン (.video-fs-overlay-btn) が見つからない");
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
} catch (err: unknown) {
  fail("media sidebar regression test aborted", { message: (err as Error).message, stack: (err as Error).stack });
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close().catch(() => {});
  }
  proc.kill("SIGKILL");
}
