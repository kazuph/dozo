<p align="center">
  <img src="https://raw.githubusercontent.com/kazuph/reviw/main/assets/logo.svg" alt="reviw - Human-in-the-loop Review" width="600">
</p>

<p align="center">
  <strong>AIコーディングワークフローのためのHuman-in-the-loopレビューインターフェース</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/reviw"><img src="https://img.shields.io/npm/v/reviw.svg" alt="npm version"></a>
  <a href="https://github.com/kazuph/reviw/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/reviw.svg" alt="license"></a>
  <a href="./README.md">English</a>
</p>

---

# reviw

表形式データ、テキスト、Markdown、diffファイルをレビュー・注釈するための軽量ブラウザベースツール。[MoonBit](https://www.moonbitlang.com/)で書かれており、手書きJavaScriptはゼロ。CSV、TSV、プレーンテキスト、Markdown、unified diff形式をサポート。コメントはYAML形式で標準出力に出力されます。

## 機能

### ファイル形式サポート
- **CSV/TSV**: スティッキーヘッダー、カラム固定、フィルタリング、カラムリサイズ付きで表形式データを表示
- **Markdown**: 同期スクロール付きサイドバイサイドプレビュー、プレビューからクリックでコメント
- **Diff/Patch**: シンタックスハイライト付きGitHubスタイルdiffビュー、500行以上の大きなファイルは折りたたみ可能、バイナリファイルは末尾にソート
- **テキスト**: プレーンテキストファイルの行ごとコメント

### Mermaid.jsダイアグラム
- MarkdownファイルのMermaidダイアグラムを自動検出・レンダリング
- ダイアグラムをクリックでミニマップ付きフルスクリーンビューアを開く
- マウスホイールでズーム（カーソル位置を中心に、最大10倍）
- マウスドラッグでパン
- トラックパッドのピンチズーム・タッチジェスチャー対応
- Windows向けShift+スクロールズーム対応
- ダークモードでのサムネイル表示対応
- フルスクリーン終了時にソース行をハイライト
- 構文エラーはトースト通知で表示

### メディアサイドバー
- 左サイドバーに画像・動画のサムネイルギャラリーを表示
- サムネイルクリックで対応するメディアにスクロール＆ソース行ハイライト
- 番号バッジ付きで素早く識別

### メディアフルスクリーン
- Markdownプレビューの画像をクリックでフルスクリーンビューアを開く
- 動画をクリックでYouTube風キーボードショートカット付きフルスクリーン再生（Space/K、J/L、矢印キー、0-9）
- 画像/動画自体を含む任意の場所をクリックでフルスクリーンオーバーレイを閉じる
- メディアをクリックするとMarkdownパネルの対応するソース行が自動ハイライト
- 動画タイムライン設定（シーン検出感度の調整）

### UI機能
- **テーマ切り替え**: ライト/ダークモードの切り替え
- **プレビューオンリーモード**: ソースパネルを非表示にしてプレビューをワイド表示
- **見出し折りたたみ**: 見出しの▼をクリックでセクションを折りたたみ/展開
- **複数ファイルサポート**: 複数ファイルを別々のポートで同時に開く
- **ドラッグ選択**: 矩形領域または複数行を選択してバッチコメント
- **リアルタイム更新**: SSE経由でファイル変更時にホットリロード
- **コメント永続化**: localStorageにコメントを自動保存、リカバリーモーダル付き
- **画像添付**: コメントダイアログとSubmitモーダルで画像添付（Cmd/Ctrl+Vで貼り付け）
- **選択行コピー**: コメントダイアログの📋ボタンで選択行テキストをコピー
- **キーボードショートカット**: Cmd/Ctrl+Enterで送信モーダルを開く
- **マルチタブ同期**: 1つのタブでSubmitすると同じファイルの他のタブも連動して閉じる
- **サーバー検出**: 既存サーバーを再利用（ロックファイルで管理）
- **タブアクティベーション（macOS）**: AppleScript経由で既存ブラウザタブを自動アクティブ化
- **レビュー履歴**: ファイルベースの永続的なレビュー履歴
- **details/summary対応**: HTML details/summaryタグを折りたたみセクションとして表示

### 出力
- file、mode、row、col、value、コメントテキストを含むYAML形式
- レビューノート用のサマリーフィールド
- 画像添付はbase64データとして含む

## インストール

```bash
npm install -g reviw
```

またはnpxで直接実行:

```bash
npx reviw <file>
```

## 使い方

```bash
# 単一ファイル
reviw <file> [--port 4989] [--encoding utf8|shift_jis|...]

# 複数ファイル（各ファイルは連続するポートで開く）
reviw file1.csv file2.md file3.tsv --port 4989

# 標準入力からのdiff
git diff HEAD | reviw

# diffファイル
reviw changes.diff
```

### オプション
- `--port <number>`: 開始ポートを指定（デフォルト: 4989）
- `--encoding <encoding>`: エンコーディングを強制指定（デフォルトは自動検出）
- `--no-open`: ブラウザの自動起動を無効化
- `--help, -h`: ヘルプメッセージを表示
- `--version, -v`: バージョン番号を表示

### ワークフロー
1. ブラウザが自動的に開く（macOS: `open` / Linux: `xdg-open` / Windows: `start`）
2. セル/行をクリックしてコメント追加、またはドラッグで複数選択
3. Cmd/Ctrl+Enterまたは「Submit & Exit」クリックでコメントを出力
4. コメントはYAML形式で標準出力に出力

## スクリーンショット

### Markdownビュー（メディアサイドバー付き）
![Markdown View with Media Sidebar](https://raw.githubusercontent.com/kazuph/reviw/main/assets/screenshot-media-sidebar.png)

### プレビューオンリーモード
![Preview-only Mode](https://raw.githubusercontent.com/kazuph/reviw/main/assets/screenshot-preview-only.png)

### 見出し折りたたみ
![Heading Toggle](https://raw.githubusercontent.com/kazuph/reviw/main/assets/screenshot-heading-toggle.png)

### コメントダイアログ（画像添付対応）
![Comment Dialog](https://raw.githubusercontent.com/kazuph/reviw/main/assets/screenshot-comment-dialog.png)

### 動画フルスクリーン（タイムラインサムネイル付き）
![Video Fullscreen](https://raw.githubusercontent.com/kazuph/reviw/main/assets/screenshot-video-thumbnails.png)

### Mermaidフルスクリーン（ミニマップ付き）
![Mermaid Fullscreen](https://raw.githubusercontent.com/kazuph/reviw/main/assets/screenshot-mermaid-fullscreen.png)

### レビュー送信ダイアログ（画像添付対応）
![Submit Review Dialog](https://raw.githubusercontent.com/kazuph/reviw/main/assets/screenshot-submit-modal.png)

### CSVビュー
![CSV View](https://raw.githubusercontent.com/kazuph/reviw/main/assets/screenshot-csv.png)

### Diffビュー
![Diff View](https://raw.githubusercontent.com/kazuph/reviw/main/assets/screenshot-diff.png)

## 出力例

```yaml
file: data.csv
mode: csv
reason: button
at: '2025-11-26T12:00:00.000Z'
comments:
  - row: 2
    col: 3
    text: This value needs review
    value: '150'
summary: Overall the data looks good, minor issues noted above.
```

## Claude Codeプラグイン

このリポジトリはClaude Codeプラグインマーケットプレイスとしても機能します。プラグインはタスク管理とレビュー自動化でreviwをClaude Codeワークフローに統合します。

### インストール

```bash
# Claude Codeで
/plugin marketplace add kazuph/reviw
/plugin install reviw-plugin@reviw-plugins
```

### `npx skills` でスキルを入れる

Codex、OpenCode、Cursor など、`npx skills` 対応エージェントで reviw のタスクスキルを使いたい場合はこちらを使います。Claude Code は上のプラグイン導線を使ってください。

```bash
# まず検出されるスキルを確認
npx skills add https://github.com/kazuph/reviw --list

# Codex 向けに全スキルをグローバルインストール
npx skills add https://github.com/kazuph/reviw -g -a codex -s '*' --copy -y

# Codex と OpenCode へまとめてグローバルインストール
npx skills add https://github.com/kazuph/reviw -g -a codex -a opencode -s '*' --copy -y
```

`npx skills` が配るのは `plugin/skills/` 配下のスキル群です。Claude Code のプラグイン command や hooks はこの経路では入らず、上の Claude Code プラグイン導線でインストールします。
```

### プラグインディレクトリ構成

```
plugin/
├── .claude-plugin/
│   └── plugin.json          # プラグインメタデータ（名前、バージョン、説明）
├── agents/
│   ├── report-builder.md     # レポート生成エージェント
│   ├── e2e-health-reviewer.md    # E2Eテスト健全性チェック
│   ├── review-code-quality.md    # コード品質レビュー
│   ├── review-security.md        # セキュリティ監査
│   ├── review-a11y-ux.md         # アクセシビリティ & UX
│   ├── review-figma-fidelity.md  # デザイン忠実度
│   ├── review-copy-consistency.md # テキスト整合性
│   └── review-e2e-integrity.md   # E2Eテスト整合性
├── skills/
│   ├── ask/
│   │   └── SKILL.md          # 要件ヒアリングスキル
│   ├── bucho/
│   │   └── SKILL.md          # 部長オーケストレーションスキル
│   ├── do/
│   │   └── SKILL.md          # タスク開始スキル
│   ├── done/
│   │   └── SKILL.md          # タスク完了スキル
│   ├── exit-notifier/
│   │   ├── SKILL.md          # background task 終了通知スキル
│   │   └── scripts/
│   │       └── watch-exit-notify.sh
│   ├── tiny-do/
│   │   └── SKILL.md          # 軽量タスク開始スキル
│   ├── tiny-done/
│   │   └── SKILL.md          # 軽量タスク完了スキル
│   ├── validate-report/
│   │   └── SKILL.md          # REPORT.md検証の内部 helper
│   ├── artifact-proof/
│   │   └── SKILL.md          # エビデンス収集スキル
│   └── webapp-testing/
│       ├── SKILL.md          # Webテストスキル
│       ├── scripts/          # ヘルパースクリプト
│       └── examples/         # 使用例
├── hooks/
│   └── hooks.json            # フック定義
├── hooks-handlers/
│   └── completion-checklist.sh  # UserPromptSubmitハンドラ
└── README.md
```

### コンポーネント概要

| 種類 | 名前 | 説明 |
|------|------|------|
| **タスクスキル** | `/reviw:do` | タスク開始 - git wtでworktree作成、計画、todo登録 |
| **タスクスキル** | `/reviw:done` | 完了チェックリスト - 7レビューエージェント実行、エビデンス収集、レビュー開始 |
| **タスクスキル** | `/reviw:tiny-do` | 小タスク向けの軽量開始フロー |
| **タスクスキル** | `/reviw:tiny-done` | 小タスク向けの軽量完了フロー |
| **タスクスキル** | `/reviw:bucho` | Claude Code と Codex を束ねる部長モード |
| **エージェント** | `report-builder` | ユーザーレビュー用レポート準備 |
| **エージェント** | `review-code-quality` | コード品質: 可読性、DRY、型安全性、エラーハンドリング |
| **エージェント** | `review-security` | セキュリティ: XSS、インジェクション、OWASP Top 10、秘密情報検出 |
| **エージェント** | `review-a11y-ux` | アクセシビリティ: WCAG 2.2 AA、キーボード操作、UXフロー |
| **エージェント** | `review-figma-fidelity` | デザイン: トークン準拠、視覚的一貫性 |
| **エージェント** | `review-copy-consistency` | コピー: テキスト整合性、トーン&マナー、i18n |
| **エージェント** | `review-e2e-integrity` | E2E: ユーザーフロー再現、モック汚染検出 |
| **エージェント** | `e2e-health-reviewer` | E2E: goto制限、レコードアサーション、ハードコード検出 |
| **スキル** | `artifact-proof` | エビデンス収集（スクリーンショット、動画、ログ） |
| **スキル** | `exit-notifier` | background task の終了と stdout/stderr を現在の tmux / Herdr pane に通知 |
| **スキル** | `webapp-testing` | Playwrightによるブラウザ自動化と検証 |
| **フック** | PreToolUse | git commit/push前にレビューを促すリマインダー |
| **フック** | UserPromptSubmit | AI コンテキストに完了チェックリストを注入 |

---

### タスクスキル

#### 同梱タスクスキル一覧

| スキル | 用途 |
|------|------|
| `ask` | 実装前に要求・スコープ・制約・成功条件を明確化する |
| `bucho` | Claude Code と Codex を tmux 経由で束ねてチーム開発フローを回す |
| `check-yourself` | 推測を禁止し、実際の検証を強制する |
| `commit-and-push` | コミットメッセージ生成、commit、push、最終状態確認まで実行する |
| `do` | worktree 作成、計画策定、レビュー準備を含むフルの開始フローを実行する |
| `done` | エビデンス収集と reviw レビューを含むフルの完了フローを実行する |
| `exit-notifier` | background task の終了結果と stdout/stderr を現在の tmux / Herdr pane に返す |
| `open` | ファイル、成果物、URL を macOS の `open` で開く |
| `tiny-do` | 小さなタスク向けの軽量開始フローで実装へ入る |
| `tiny-done` | 小さなタスク向けの軽量完了フローで検証と確認を行う |
| `validate-report` | `done` から呼ばれる内部 helper として `REPORT.md` を検証する |

#### `/reviw:do <タスク説明>`

適切な環境セットアップで新しいタスクを開始します。

**処理内容:**
1. git wtを使用して分離開発用のgit worktreeを作成（`feature/<name>`、`fix/<name>`など）
2. エビデンス用の`.artifacts/<feature>/`ディレクトリをセットアップ
3. 計画とTODOチェックリスト付きの`REPORT.md`を作成
4. 進捗追跡用にTodoWriteにtodoを登録

**作成されるディレクトリ構成:**
```
<worktree>/                   # 例: .worktree/feature-auth/
└── .artifacts/
    └── <feature>/            # 例: auth（feature/authから）
        ├── REPORT.md         # 計画、進捗、エビデンスリンク
        ├── images/           # スクリーンショット
        └── videos/           # 動画録画
```

**タスク再開:** セッション開始時またはコンテキスト圧縮後、スキルは既存のworktreeを確認（`git wt`）し、`REPORT.md`から再開します。

#### `/reviw:done`

タスク完了を許可する前に完了基準を検証します。

**適用されるチェックリスト:**
- [ ] ビルド成功（型/lintエラーなし）
- [ ] 開発サーバー起動・動作
- [ ] `webapp-testing`スキルで検証
- [ ] `.artifacts/<feature>/`にエビデンス収集
- [ ] `artifact-proof`スキルでレポート作成
- [ ] reviwでレビュー（フォアグラウンドモード）
- [ ] ユーザー承認取得

**禁止事項:**
- 検証なしに「実装完了」と言う
- reviwレビュー前にコミット/プッシュ
- エビデンスなしのレポート

---

### エージェント

#### `report-builder`

レビュー資料準備専門エージェント。

**役割:**
- 実装を構造化レポートに整理
- エビデンス（スクリーンショット、動画）を収集・配置
- reviwレビュー用に`REPORT.md`を準備
- reviwフィードバックを解析してtodoに登録

**呼び出し:**
```
Task tool with subagent_type: "report-builder"
```

**自動読み込みスキル:** `artifact-proof`

---

### スキル

#### `artifact-proof`

ビジュアルリグレッションとPRドキュメント用のエビデンス収集を管理。

**機能:**
- `.artifacts/<feature>/`配下にスクリーンショットと動画
- 自動キャプチャ用Playwright統合
- 動画ファイル用Git LFSセットアップ
- コミットハッシュ付きPR画像URL（ブランチ削除後も永続）

**reviw統合:**
```bash
# reviwでレポートを開く（フォアグラウンド必須）
npx reviw .artifacts/<feature>/REPORT.md

# 動画プレビュー付き
open .artifacts/<feature>/videos/demo.webm
npx reviw .artifacts/<feature>/REPORT.md
```

#### `webapp-testing`

Playwrightを使用したブラウザ自動化ツールキット。

**機能:**
- TypeScript Playwright Test (`@playwright/test`)
- webServerサポート付きPlaywright設定
- スクリーンショットと動画キャプチャ
- コンソールログとネットワークリクエスト監視
- 高度なデバッグ用CDP統合

**クイック検証:**
```bash
node -e "const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: '/tmp/webapp.png', fullPage: true });
  await browser.close();
})();"
```

---

### フック

#### PreToolUse（Bashマッチャー）

`git commit`または`git push`検出時にトリガー。

**メッセージ:** コミット前に`/reviw:done`を実行してreviwでレビューするよう促す。

#### UserPromptSubmit

すべてのAI応答コンテキストに完了チェックリストを注入。

**目的:** 適切な検証なしの「実装完了」主張を防止。チェックリストは常にAIに見え、完了基準の一貫した適用を保証。

---

### ワークフロー

```
/reviw:do <タスク説明>
    ↓
Worktree作成 + 計画 + TodoWrite
    ↓
実装（サブエージェント経由）
    ↓
ビルド & 検証（webapp-testing）
    ↓
/reviw:done
    ↓
エビデンス収集（artifact-proof）
    ↓
npx reviwでレポートを開く（フォアグラウンド）
    ↓
ユーザーコメント → Submit & Exit
    ↓
フィードバックをTodoに登録
    ↓
修正 → 承認まで再レビュー
    ↓
コミット & PR（承認後のみ）
```

### 完了基準

| ステージ | 内容 | ステータス |
|----------|------|----------|
| 1/3 | 実装完了 | まだ報告しない |
| 2/3 | ビルド、起動、検証完了 | まだ報告しない |
| 3/3 | reviwでレビュー → ユーザー承認 | 完了 |

### 設計思想

プラグインは**Human-in-the-loop**開発を強制します:

1. **ショートカットなし:** モック、バイパス、検証スキップは禁止
2. **エビデンス必須:** すべての完了主張にはスクリーンショット/動画が必要
3. **ユーザー承認:** ユーザーのみがタスクを完了としてマークできる
4. **コンテキスト保持:** 重い操作はサブエージェントで実行してコンテキスト枯渇を防止

### `.artifacts`ディレクトリポリシー

`.artifacts/`ディレクトリは開発中に生成されたスクリーンショット、動画、レポートを保存します。**デフォルトでは、このディレクトリは`.gitignore`に追加すべきです**。大きなメディアファイルによるリポジトリ肥大化を防ぎます。

```bash
# .gitignoreに追加（推奨）
echo ".artifacts" >> .gitignore
```

**デフォルトで除外する理由:**
- スクリーンショットと動画は大きくなる可能性がある（特に画面録画）
- エビデンスは主にレビュープロセス用で、永続的なドキュメントではない
- リポジトリサイズを管理可能に保つ

**特定のエビデンスをコミットしたい場合:**

`git add --force`で明示的にファイルを追加:

```bash
# 特定のエビデンスファイルを強制追加
git add --force .artifacts/feature/images/final-screenshot.png
git add --force .artifacts/feature/REPORT.md

# または機能全体のエビデンスを強制追加
git add --force .artifacts/feature/
```

**動画ファイル**の場合、リポジトリ肥大化を避けるためGit LFSを使用:

```bash
git lfs track "*.mp4" "*.webm" "*.mov"
git add .gitattributes
git add --force .artifacts/feature/videos/demo.mp4
```

このアプローチで完全なコントロールが可能: デフォルトで除外、必要なものだけをコミット。

## 開発

reviwは[MoonBit](https://www.moonbitlang.com/)で書かれており、JavaScriptにコンパイルされます。

```bash
# ビルド
cd v2 && moon build --target js --release

# テスト実行
cd v2 && moon test --target js

# npmパッケージング（MoonBitビルド + dist/にコピー）
npm run prepack
```

- ソース: `v2/src/`（MoonBit）
- ビルド出力: `dist/server/server.js`、`dist/ui/ui.js`
- プラグイン: `plugin/`ディレクトリ

## ライセンス

MIT
