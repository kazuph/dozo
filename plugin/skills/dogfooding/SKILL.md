---
name: dogfooding
description: ユーザーと一緒に実装した機能をブラウザで触って検証する。claude-in-chrome MCP 拡張または agent-browser CLI + Chrome Remote Debugging を使い、Cloudflare Access 等の認証済み環境でもユーザーのChromeセッションを共有操作する。疑問を見つけたらコードまで追って原因を特定する。
argument-hint: <url or feature description>
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, AskUserQuestion
---

# /dozo-plugin:dogfooding

<command-name>dogfooding</command-name>

ユーザーと一緒に、実装した機能を**実際に使って**検証するスキル。

## コンセプト

Dogfoodingは「自分で作ったものを自分で使ってみる」こと。
E2Eテストでもなく、スクリーンショット確認でもない。

**Dogfoodingの深さ:**

| レベル | やること | 例 |
|--------|---------|-----|
| ❌ 浅い | 画面見て「動いた」「動かない」 | 「ボタン押せました」で終了 |
| ❌ 浅い | 見た目だけ確認 | 「レイアウト崩れてないです」で終了 |
| ✅ 深い | 疑問→コード追跡→原因特定 | 「このボタン押すと0.5秒遅い→コード見たらN+1クエリが原因」 |
| ✅ 深い | エッジケース探索→再現→修正提案 | 「空文字入力したらエラー表示がない→バリデーション漏れ」 |

**「あれ？」と思ったらコードまで追う。それがDogfooding。**

## なぜclaude-in-chrome（MCP Chrome拡張）を使うか

ユーザーの認証済みChromeセッションをそのまま使えるのが重要。
ここでの比較対象は「新しいブラウザインスタンスを起動する通常のCLIブラウザ操作」であり、後述の `agent-browser + CDP` は別枠の代替手段。

| 要件 | 通常のCLIブラウザ | claude-in-chrome |
|------|----------|-----------------|
| Cloudflare Access | ❌ 認証突破できない | ✅ ユーザーのセッションcookie使える |
| 本番環境 | ❌ 別ブラウザインスタンス | ✅ ユーザーが普段使ってるChrome |
| ユーザーとの対話 | ❌ Agent内で完結 | ✅ メインセッションで直接会話 |
| SSO/OAuth | ❌ ログインフロー必要 | ✅ 認証済み |

## ブラウザ操作方式の選択

dogfooding では2つの方式が使える。状況に応じて使い分ける。

| 方式 | メリット | デメリット | 向いてる場面 |
|------|---------|-----------|-------------|
| **claude-in-chrome (MCP拡張)** | Chrome拡張として深く統合、tabs_context_mcp でタブ一覧取得 | MCPサーバーの接続が不安定な場合あり、拡張インストールが必要 | 既に claude.ai にログイン済み＆拡張が安定動作する環境 |
| **agent-browser + CDP** | CLIだけで完結、接続が安定、Codex/他AIからも同じ方式で呼べる | tabs_context_mcp 相当の機能はない（スナップショットで代用） | claude-in-chrome が接続エラーを出す場合、CLI で自動化したい場合 |

**推奨**: まず claude-in-chrome を試し、接続エラーが出たら agent-browser + CDP に切り替える。

## 実行フロー

### 1. タブ情報の取得

```
mcp__claude-in-chrome__tabs_context_mcp
→ ユーザーが今どのページを開いているか把握
```

ユーザーに「どのタブを確認する？」と聞く。
または $ARGUMENTS にURLが指定されていればそのタブを使う。

### 2. ページ状態の確認（トークン節約優先）

| 方法 | トークン消費 | 用途 |
|------|-------------|------|
| `get_page_text` | 低 | テキスト内容の把握 |
| `read_page` | 中 | DOM構造の確認 |
| `take_screenshot` | 高 | レイアウト・視覚的確認（必要な時だけ） |

**デフォルトは `get_page_text` で状態把握。スクリーンショットは「見た目の問題」が疑われる時だけ。**

### 3. 対話的探索ループ（核心）

**ユーザーとの対話を止めない。調査はbackground agentに投げる。**

```
ユーザー: 「このページ見て」
    ↓
AI: get_page_text で状態確認
    ↓
AI: 「〇〇が表示されてます。△△を試してみません？」
    ↓
ユーザー: クリック / 「クリックして」
    ↓
AI: 結果確認 → 「あれ、遅いですね」
    ↓
AI: Agent(run_in_background: true) でコード調査を投げる ← ★ブロックしない
    ↓
AI: 「調査投げました。次どこ見ます？」← ★ユーザーとの対話を続ける
    ↓
ユーザー: 「じゃあ設定画面も見よう」
    ↓
AI: 次の画面を確認...
    ↓
（background agentから結果が返ってくる）
    ↓
AI: 「さっきの遅延の件、src/api/dashboard.ts:42でN+1でした。修正案は...」
    ↓
ループ
```

**リズム: 画面操作 → 疑問発見 → 調査をbackgroundに投げる → 次の画面操作 → ...**

### 4. 疑問→コード追跡（background agent委譲）

**画面で「あれ？」と思ったら、background agentにコード調査を投げる。**

```javascript
// メインセッションでやること
Agent({
  description: "遅延原因の調査",
  run_in_background: true,
  prompt: `
    dozoのダッシュボード画面でレスポンスが遅い（体感2秒以上）。
    以下を調査して原因と修正案を報告:
    1. ダッシュボードのデータ取得ロジックを特定（Grep "dashboard"）
    2. N+1クエリ、不要なfetch、キャッシュ漏れがないか確認
    3. 修正案を具体的なコード付きで提示
  `
})
```

| 画面の疑問 | background agentへの調査依頼 |
|-----------|---------------------------|
| レスポンスが遅い | API呼び出し元を特定 → N+1, キャッシュ漏れ |
| エラー表示がない | バリデーションロジック確認 → try-catch漏れ |
| 表示がおかしい | CSS/コンポーネント確認 → 条件分岐漏れ |
| 状態が保持されない | 状態管理を追跡 → リセット原因特定 |
| ボタンが反応しない | イベントハンドラ確認 → disabled条件 |
| データが古い | fetch/キャッシュ確認 → refetch漏れ |

**ルール:**
- メインセッションでGrep/Readしない（ユーザーとの対話が止まる）
- 調査は全てbackground agentに投げる
- agentの結果が返ったら、次の対話の合間にユーザーに共有する
- コードを追わずに「動かないです」で終わるのは禁止

### 5. 発見事項の記録

操作しながら発見したことをリアルタイムで報告:

```
=== Dogfooding発見 ===

[HIGH] レスポンス遅延
  画面: ダッシュボードの読み込みが2秒以上
  コード: src/api/dashboard.ts:42 — ユーザー一覧をループで取得（N+1）
  修正案: Promise.all で並列化

[MEDIUM] エラー表示なし
  画面: 空文字で保存ボタンを押してもフィードバックなし
  コード: src/components/Form.tsx:28 — バリデーションが未実装
  修正案: zodスキーマでバリデーション追加

[LOW] UXの違和感
  画面: 保存後にページトップにスクロールされる
  コード: src/hooks/useSubmit.ts:15 — window.scrollTo(0,0) がハードコード
  修正案: scrollTo を削除、またはフォーム位置にスクロール
```

## 代替手段: agent-browser + Chrome Remote Debugging (CDP)

claude-in-chrome MCP 拡張が使えない / 接続が不安定な場合、`agent-browser` CLI で Chrome の Remote Debugging Protocol (CDP) に接続することで、ユーザーの Chrome セッションをそのまま操作できる。

### 前提条件

ユーザー側の Chrome で Remote Debugging を有効化してもらう（初回のみ）。

1. Chrome で `chrome://inspect/#remote-debugging` を開く
2. 「**Allow remote debugging for this browser instance**」をチェック
3. 「Server running at: 127.0.0.1:9222」が表示されることを確認

> Chrome 146+ でこの設定UIが追加された。それ以前のバージョンは `--remote-debugging-port=9222` をコマンドライン引数で起動する必要がある。

### 接続確認

```bash
# CDP ポートが開いているか確認
lsof -i :9222

# agent-browser で接続
agent-browser connect 9222
```

### 主要コマンド

**すべてのコマンドに `--connect 9222` を付ける**（CDP経由でユーザーのChromeを操作する指定）。

| コマンド | 用途 | 例 |
|---------|------|-----|
| `open <url>` | ページ遷移 | `agent-browser open "https://example.com" --connect 9222` |
| `snapshot` | アクセシビリティツリー取得（refID付き） | `agent-browser snapshot --connect 9222` |
| `click '@refID'` | 要素クリック（snapshot で取得した refID を使用） | `agent-browser click '@e42' --connect 9222` |
| `fill <sel> <text>` | テキスト入力 | `agent-browser fill "input[name=email]" "user@example.com" --connect 9222` |
| `press <key>` | キー押下 | `agent-browser press Escape --connect 9222` |
| `scroll <dir> [px]` | スクロール | `agent-browser scroll down 500 --connect 9222` |
| `screenshot <path>` | スクショ保存 | `agent-browser screenshot /tmp/check-01.png --connect 9222` |

### 実例: Cloudflare Access 保護された Preview 環境の確認

```bash
# 1. CDP 接続
agent-browser connect 9222

# 2. admin ページへ遷移（CF Access 認証は既存セッションを再利用）
agent-browser open "https://develop-my-app.id-dev.workers.dev/admin" --connect 9222

# 3. ページ構造を取得（refID で要素を特定）
agent-browser snapshot --connect 9222

# 4. 特定要素をクリック（refID は snapshot 出力から取得）
agent-browser click '@e42' --connect 9222

# 5. スクショ保存
agent-browser screenshot /tmp/dogfood-01-admin.png --connect 9222
```

### 要素セレクタのコツ

- **refID (`@e42`) 方式が最も確実**。CSS セレクタや text セレクタはうまく効かないことがある
- refID を取るには先に `snapshot` を実行する
- snapshot の出力から `[ref=e42]` のような部分を探してそれをクリックに使う

### スクショファイル名エラーに注意

`agent-browser screenshot /tmp/foo.png --connect 9222` のような呼び方で「Screenshot saved to --connect」と表示されることがある。その場合はファイル名を絶対パスで確実に指定し、上書き前の状態を `ls -la /tmp/foo.png` で確認すること。

### Codex / 他のAIエージェントとの協業

agent-browser は CLI なので、**tmux pane で起動した Codex や別の Claude Code インスタンスからも同じ方式で操作できる**。同一ユーザーの Chrome セッション（port 9222）を複数の AI が共有できるので、「メイン AI で基本フロー実行 → サブ AI で別観点から再チェック」のようなクロスチェックが可能。

## 観察ポイント

| カテゴリ | 画面で見ること | コードで追うこと |
|---------|--------------|----------------|
| **パフォーマンス** | 体感の遅さ、ローディング | fetch回数、N+1、キャッシュ |
| **エラーハンドリング** | 不正入力、ネットワーク切断 | try-catch、バリデーション |
| **CRUD反映** | 作成→一覧反映、削除→消える | state更新、refetch、楽観的更新 |
| **エッジケース** | 空データ、大量データ、連打 | 境界値チェック、debounce |
| **a11y** | キーボード操作、スクリーンリーダー | aria属性、role、tabindex |
| **セキュリティ** | URL直打ち、権限外アクセス | 認証チェック、認可ガード |
| **直感** | 「使いにくい」「分かりにくい」 | コンポーネント設計、導線 |

## 禁止事項

- 画面を見て「問題なさそうです」で終わる（浅い）
- 疑問を持ったのにコードを追わない（浅い）
- スクリーンショットを毎回撮る（トークン浪費）
- `agent-browser` を `--connect 9222` なしで実行して新しいブラウザを起動する
- dev API でセッションバイパス禁止: agent-browser + CDP 経由でも、UI検証時は mailpit 経由の正規 OTP ログインを基本とする。ただし super_admin のように OTP 拒否される設計のロールは例外（該当 CLAUDE.md を参照）
- `--connect 9222` の付け忘れ禁止: 付け忘れると agent-browser が新しいブラウザを起動してしまい、ユーザーの認証済みセッションが使えない
- ユーザーに確認せず勝手に操作を進める（寄り添いの意味がない）

## 完了条件

1. 全ストーリーについてユーザーと一緒に操作した
2. 「あれ？」ポイントは全てコードまで追跡した
3. 発見事項に画面の症状 + コードの原因 + 修正案がある
4. ユーザーが「もういい」と言うまで続ける
