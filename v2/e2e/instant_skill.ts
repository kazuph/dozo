/**
 * Instant Skill E2E Test
 *
 * `dozo` with no arguments must teach an AI agent the whole approval
 * protocol on the spot:
 *   - `dozo --skill` prints the skill document and exits 0
 *   - no args + TTY stdin prints the same document (covered via --skill;
 *     the TTY branch is exercised with a pty when available)
 *   - empty piped stdin still prints usage and exits 1 (script safety)
 *   - the document carries the load-bearing sections an agent needs
 *
 * Run: node --experimental-strip-types v2/e2e/instant_skill.ts
 */
import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SERVER_JS = join(__dirname, "..", "_build", "js", "release", "build", "server", "server.js");

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string, detail?: unknown): void {
  if (condition) {
    passed++;
    console.log(`  PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
    if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  }
}

interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function run(cmd: string, args: string[], stdin: "ignore" | "pipe"): Promise<RunResult> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: [stdin, "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => { stdout += String(d); });
    proc.stderr.on("data", (d: Buffer) => { stderr += String(d); });
    if (stdin === "pipe") proc.stdin!.end();
    const killer = setTimeout(() => proc.kill("SIGKILL"), 15000);
    proc.on("exit", (code: number | null) => {
      clearTimeout(killer);
      resolve({ code, stdout, stderr });
    });
  });
}

// --- dozo --skill: skill document, exit 0 ---
const skill = await run("node", [SERVER_JS, "--skill"], "ignore");
assert(skill.code === 0, "--skill は exit 0", skill.code);
assert(skill.stdout.startsWith("# dozo"), "出力はスキル文書タイトルから始まる（前置きノイズなし）", skill.stdout.slice(0, 80));
for (const section of [
  "## The approval loop",
  "## REPORT.md rules",
  "## Verdict schema",
  "## Install this skill permanently",
  "npx dozo REPORT.md",
  "decision: approve | request_changes",
  "![alt](path)",
  "~/.claude/skills/dozo/SKILL.md",
]) {
  assert(skill.stdout.includes(section), `スキル文書に「${section}」が含まれる`);
}
assert(!skill.stdout.includes("DOZO_LIVE"), "スキル文書にライブログ行が混ざらない");

// --- no args + TTY: same document (via script(1) pty on macOS/Linux) ---
const tty = await run("script", ["-q", "/dev/null", "node", SERVER_JS], "ignore");
if (tty.code === 0 || tty.stdout.length > 0) {
  assert(tty.stdout.includes("# dozo"), "TTYで引数なし実行するとスキル文書が出る", tty.stdout.slice(0, 120));
  assert(tty.stdout.includes("## Install this skill permanently"), "TTY出力にも永続インストール節がある");
} else {
  console.log("  SKIP: script(1) が使えない環境のため TTY 分岐は --skill で代替検証済み");
}

// --- empty piped stdin: usage + exit 1 (keeps broken pipelines loud) ---
const empty = await run("node", [SERVER_JS], "pipe");
assert(empty.code === 1, "空のパイプ入力は exit 1", empty.code);
assert(empty.stdout.includes("Usage: dozo"), "空パイプではUsageを表示", empty.stdout.slice(0, 120));

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
