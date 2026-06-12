# dozo v2 — MoonBit再設計プラン

## 背景

### なぜ再設計するのか

dozo は「ブラウザでファイルをレビューし、コメントをYAMLとして出力する」ツール。
現行版は `cli.cjs` 1ファイル10,800行のNode.jsモノリスで、以下の問題がある:

- **型安全性ゼロ**: 全てが生JS。テンプレートリテラルにHTML/CSS/JSが混在
- **モジュール分離なし**: パーサー、サーバー、UI、出力ロジックが1ファイルに密結合
- **テスト困難**: モノリスのため関数単位の検証がしづらく、E2Eに全依存
- **バイナリ配布不可**: node_modules（chardet, iconv-lite, marked, js-yaml）が必須

### なぜMoonBitか

- **Wasm第一級**: ブラウザ・サーバー両方のターゲットを単一言語で
- **静的型付け**: パーサーやドメインモデルが型で守られる
- **JS FFI**: `#module` と `extern "js"` で Node.js/DOM API を直接叩ける
- **ゼロJS**: ソースコードは全て `.mbt`、手書きJS不要

## やったこと

### 構成

```
v2/
├── moon.mod.json
├── PLAN.md
├── e2e/
│   └── smoke.mjs          # E2Eスモークテスト（18テスト）
├── src/
│   ├── core/              # 純粋ロジック（FFI依存なし）
│   │   ├── model.mbt      # ドメインモデル（FileMode, Comment, DiffData, MarkdownData等）
│   │   ├── csv.mbt        # RFC4180準拠CSVパーサー
│   │   ├── diff.mbt       # unified diffパーサー
│   │   ├── markdown.mbt   # Markdownパーサー（heading, list, code, table, link, image, blockquote等）
│   │   ├── html.mbt       # HTMLビルダー（CSV, Diff, Text, Markdown用）
│   │   ├── yaml.mbt       # YAMLシリアライザ
│   │   ├── strutil.mbt    # 安全な文字列スライス、整数パース
│   │   ├── css.mbt         # CSSスタイル生成
│   │   ├── csv_test.mbt   # 7テスト
│   │   ├── csv_v2_test.mbt # CSV追加テスト
│   │   ├── diff_test.mbt  # 5テスト
│   │   ├── diff_v2_test.mbt # Diff追加テスト
│   │   ├── diff_html_v2_test.mbt # Diff HTML追加テスト
│   │   ├── markdown_test.mbt # 14テスト
│   │   ├── markdown_html_v2_test.mbt # Markdown HTML追加テスト
│   │   ├── yaml_test.mbt  # 4テスト
│   │   ├── html_test.mbt  # 7テスト
│   │   ├── html_v2_test.mbt # HTML追加テスト
│   │   └── strutil_test.mbt # 9テスト
│   ├── server/            # Node.js HTTPサーバー
│   │   ├── ffi.mbt        # Node.js API FFI（fs, http, path, child_process, os）
│   │   └── main.mbt       # サーバーロジック、CLI引数パース、ファイル監視、ロックファイル
│   └── ui/                # ブラウザUI
│       ├── dom.mbt        # DOM操作FFI（querySelector, localStorage, SSE, fetch等）
│       └── app.mbt        # コメント管理、localStorage永続化、Submit、テーマ切替、SSE
```

### 数字

| 項目 | 旧版 (cli.cjs) | v2 (MoonBit) |
|------|----------------|--------------|
| ソースファイル | 1 | 14 |
| テストファイル | 0 | 12 |
| coreテスト数 | 0 | 112 |
| E2Eテスト数 | 0 | 36 |
| 総行数 | 10,800 | ~2,500 |
| 手書きJS | 10,800行 | 0 |
| 依存npm | 4 (chardet, iconv-lite, marked, js-yaml) | 0 |
| ビルド出力 | - | server.js 201KB, ui.js 46KB |

### 完了した機能

- [x] **CSV/TSV パーサー**: RFC4180準拠（クォート、エスケープ、CRLF対応）
- [x] **Diff パーサー**: unified diff、git prefix strip、複数ファイル対応
- [x] **Markdown パーサー**: heading, paragraph, bold/italic, code block, inline code, ordered/unordered list, link, image, blockquote, horizontal rule, table, YAML frontmatter
- [x] **HTMLビルダー**: CSV/TSV/Diff/Text/Markdown 全モード対応、dark/lightテーマ
- [x] **YAMLシリアライザ**: レビュー結果の出力（特殊文字エスケープ対応）
- [x] **ui.js配信**: サーバーからビルド済みui.jsを配信
- [x] **コメントJSON→モデル**: `/exit` POSTのJSONをComment配列にデシリアライズ
- [x] **EADDRINUSEポートリトライ**: TCP + ロックファイルの二重ガード（最大10回）
- [x] **ロックファイル**: `~/.dozo/locks/{port}.lock`、SIGINT/Submit時に自動クリーンアップ
- [x] **コメント永続化**: localStorage保存/復元
- [x] **Markdownビューワー**: side-by-side（preview + source）、ソース行クリックでコメント
- [x] **SSE ライブリロード**: ファイル変更監視→ブラウザ自動リロード
- [x] **ブラウザ自動起動**: platform検出（darwin/win32/linux/termux）
- [x] **E2Eスモークテスト**: 18テスト（サーバー起動→HTML確認→Submit→ロック解除）

### 技術的に解決したこと

- `#module("node:fs")` 等でESM importを生成（`require` 不要）
- `#external type JsValue` でNode.jsオブジェクトをopaqueに扱う
- `Ref[T]` でトップレベルのmutable state管理（MoonBitの制約）
- `pub(all)` でパッケージ間のstruct/enum構築を許可
- `String` のスライスが `raise` する問題を `safe_slice` で回避
- `String.split()` が `Array[StringView]` を返す問題を `split_to_lines` で対処

## 今後の課題

### Phase 1: 旧版の高度機能

- [ ] **ドラッグ選択**: 矩形選択、複数行選択
- [ ] **画像添付**: コメントへの画像ペースト（base64→ファイル保存）
- [ ] **コメント履歴**: `~/.dozo-history/` への保存と表示
- [ ] **エンコーディング検出**: chardet相当（Shift-JIS, EUC-JP対応）
- [ ] **macOS タブ再利用**: AppleScript経由の既存タブ検出
- [ ] **ビデオタイムライン**: FFmpeg連携（FFI経由のchild_process）
- [ ] **同期スクロール**: Markdownのpreview←→source間のスクロール同期
- [ ] **dozo.questions**: frontmatterのネストYAMLパース（`dozo.questions` 配列）

### Phase 2: テスト強化

- [ ] **Playwright E2E**: ブラウザ操作テスト（クリック→コメント→Submit→YAML検証）
  - 現在の環境（Termux）では実行不可。CI/CD環境で実行する
- [ ] **結合テスト**: 実マークダウン・CSVファイルを使ったパイプラインスナップショットテスト

### Phase 3: 配布

- [ ] **npm配布**: `moon build` → バンドル → `npx dozo` で実行可能に
- [ ] **plugin更新**: v2対応のplugin（agents, skills, hooks）
- [ ] **CLAUDE.md更新**: v2のビルド・テスト手順

## 設計方針（固定）

1. **手書きJS禁止**: ソースは全て `.mbt`。生成されるJSは許容
2. **テストファースト**: 新機能はテストを先に書く。Red→Green→Refactor。`moon test -u` のスナップショットテストを活用
3. **E2E中心テスト**: 結合テスト（実ファイルのパース→レンダリング）+ E2E が主軸
4. **core は純粋**: `src/core/` はFFI依存ゼロ。パーサー・モデル・HTMLビルダーのみ
5. **FFIは境界層に閉じ込める**: `server/ffi.mbt` と `ui/dom.mbt` にのみFFI宣言
6. **上位レイヤーを足す**: 下位の分解は当然やるが、価値があるのはオーケストレーション層の明示化

## テスト現況

### coreパッケージ（112テスト全パス）

- `csv_test.mbt` — 7テスト: RFC4180準拠（quoted fields, escaped quotes, CRLF, 空入力エラー）
- `csv_v2_test.mbt` — CSV追加テスト
- `diff_test.mbt` — 5テスト: unified diff（git prefix strip, 複数ファイル, hunk header）
- `diff_v2_test.mbt` — Diff追加テスト
- `diff_html_v2_test.mbt` — Diff HTML追加テスト
- `markdown_test.mbt` — 14テスト: heading, paragraph, bold/italic, code block, inline code, list, link, image, blockquote, hr, table, frontmatter, empty
- `markdown_html_v2_test.mbt` — Markdown HTML追加テスト
- `yaml_test.mbt` — 4テスト: 特殊文字エスケープ, 空value省略, 複数ファイル出力
- `html_test.mbt` — 7テスト: XSSエスケープ, テーブル構造, diff class
- `html_v2_test.mbt` — HTML追加テスト
- `strutil_test.mbt` — 9テスト: 範囲外アクセス安全性, 整数パース

### E2Eテスト（36テスト全パス）

- `e2e/smoke.mjs` — サーバー起動→HTML/healthz/ui.js配信→Submit→ロック解除
  - Markdown: 12テスト（HTML構造、モード、preview/source pane、healthz、ui.js、404）
  - CSV: 5テスト（テーブル構造、データ内容、data-row属性）
  - Lock: 1テスト（ロックファイル自動クリーンアップ）
  - 追加: 18テスト（v2追加分）
