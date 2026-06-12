# dozo Plugin for Claude Code

dozo CLI ツールを Claude Code と連携させるプラグインです。タスク管理、レビューワークフロー、報告書作成を効率化します。

## インストール

```bash
# Claude Code で実行
/plugin marketplace add kazuph/dozo
/plugin install dozo-plugin@dozo-plugins
```

## `npx skills` で使う

Claude Code プラグインではなく、Codex、OpenCode、Cursor などの skills 対応エージェントへ task skill 群だけを入れたい場合は `npx skills` を使います。Claude Code は上の導線を使ってください。

```bash
# 検出される skill を確認
npx skills add https://github.com/kazuph/dozo --list

# 例: Codex にグローバルインストール
npx skills add https://github.com/kazuph/dozo -g -a codex -s '*' --copy -y

# 例: Codex / OpenCode にまとめてインストール
npx skills add https://github.com/kazuph/dozo -g -a codex -a opencode -s '*' --copy -y
```

この経路で入るのは `plugin/skills/` の skill だけです。`-a codex -g --copy` を付けると、Codex のグローバルスキル置き場である `~/.agents/skills/` にコピーされます。`~/.agents/skills` が symlink の場合は、そのリンク先に実体が置かれます。

Claude Code の command や hooks まで含めたい場合は、上のプラグイン導線を使ってください。

## 更新

プラグインを最新版に更新するには、一度アンインストールしてから再インストールしてください：

```bash
claude plugin uninstall dozo-plugin@dozo-plugins
claude plugin install dozo-plugin@dozo-plugins
```

※ 新しいエージェントや機能を反映するには、Claude Code の再起動も必要です。

## 旧マーケットプレイス名からの移行

`dozo-marketplace`（旧名）を使用していた場合は、以下で削除してください：

```bash
# 旧プラグインのアンインストール
claude plugin uninstall dozo-plugin@dozo-marketplace

# 旧マーケットプレイスの削除（どちらか一方を実行）
/plugin marketplace remove dozo-marketplace          # Claude Code内で実行
claude plugin marketplace remove dozo-marketplace    # ターミナルで実行
```

その後、上記の「インストール」セクションの手順で再インストールしてください。

## 機能一覧

### Task Skills（スラッシュスキル）

| スキル | 説明 |
|--------|------|
| `/dozo:ask` | 要件を深掘りして AskUserQuestion で認識ズレを防ぐ |
| `/dozo:check-yourself` | 推測を禁止し、実機検証を強制する |
| `/dozo:commit-and-push` | 変更をコミットして push まで完了させる |
| `/dozo:do <タスク説明>` | タスク開始スキル - git wt で worktree 作成、計画策定、Todo 登録 |
| `/dozo:done` | タスク完了スキル - エビデンス収集、dozo でレビュー開始 |
| `/dozo:open <file-or-url>` | macOS の `open` でファイルや URL を開く |
| `/dozo:tiny-do <タスク説明>` | 小タスク向け軽量開始スキル |
| `/dozo:tiny-done` | 小タスク向け軽量完了スキル |
| `/dozo:bucho <指示>` | Claude Code と Codex を束ねる部長モード |

#### Task Skill 一覧

| 名前 | 用途 |
|------|------|
| `ask` | 実装前に AskUserQuestion を使って要求・制約・成功条件を明確化する |
| `bucho` | Claude Code と Codex を tmux 経由で指揮してチーム開発フローを回す |
| `check-yourself` | 推測を止めて、webapp-testing / backend-testing / mobile-testing による実検証へ強制する |
| `commit-and-push` | 変更内容からコミットメッセージを作り、commit / push / 最終状態確認まで実行する |
| `do` | worktree 作成、計画策定、Todo 登録、レビュー準備を含むフルのタスク開始フローを始める |
| `done` | 完了条件チェック、証跡収集、レビュー起動を含むフルのタスク完了フローを実行する |
| `exit-notifier` | tmux / Herdr で background task の終了と stdout/stderr を現在 pane に通知する |
| `open` | 直近で触れたファイルや URL、または明示したパスを macOS の `open` で開く |
| `tiny-do` | 小さなタスク向けに、軽量な開始フローで実装へ入る |
| `tiny-done` | 小さなタスク向けに、軽量な検証と確認フローで完了へ進む |
| `validate-report` | `done` から呼ばれる内部 helper として、REPORT.md が artifact-proof の 5 ルールを満たしているかをチェックする |

### Agents（サブエージェント）

| エージェント | 説明 |
|-------------|------|
| `report-builder` | レビューしてもらうための報告書・エビデンス整理専門 |
| `e2e-health-reviewer` | E2Eテストの健全性レビュー（goto制限、レコードアサーション、ハードコード検出） |

使用方法:
```
Task ツールで subagent_type: "report-builder" を指定
Task ツールで subagent_type: "e2e-health-reviewer" を指定
（/done時は両方を並列実行）
```

### Skills（自動参照スキル）

| スキル | 説明 |
|--------|------|
| `artifact-proof` | エビデンス収集（スクショ・動画・ログ）+ dozo でのレビューワークフロー |
| `exit-notifier` | background で実行した `npx dozo` などの終了結果と stdout/stderr を tmux / Herdr pane に返す |

### Hooks（自動フック）

| イベント | 動作 |
|---------|------|
| `PreToolUse` (git commit/push) | dozo でのレビュー完了確認リマインダー |
| `UserPromptSubmit` | **完了報告前チェックリスト**（AIへのカンペ） |

#### UserPromptSubmit hook の詳細

ユーザーがメッセージを送信した直後、AIが応答を生成する**前**に、以下のチェックリストがAIのコンテキストに追加されます（ユーザーには見えません）：

- 実装完了（1/3）: ビルド成功・型エラーなし
- 動作検証完了（2/3）: 開発サーバー起動・webapp-testing で検証
- レビュー完了（3/3）: エビデンス収集・`/done` スキル実行・dozo でレビュー・ユーザー承認

これにより、AIが「実装しました！」だけで完了報告することを防ぎ、dozo のワークフローに従うよう促します。

## ワークフロー

```
/dozo:do <タスク説明>
    ↓
git wt で worktree 作成 + 計画策定
    ↓
実装作業
    ↓
/dozo:done
    ↓
エビデンス収集 + 報告書作成
    ↓
npx dozo で報告書を開く（フォアグラウンド）
    ↓
ユーザーがコメント → Submit & Exit
    ↓
フィードバックを Todo に登録
    ↓
修正 → 再レビュー
    ↓
承認されたら完了
```

## 完了基準

| 段階 | 内容 |
|------|------|
| 1/3 | 実装完了 |
| 2/3 | ビルド・起動・動作検証完了 |
| 3/3 | dozo でレビュー → ユーザー承認 |

**実装完了だけでは 1/3。dozo でレビューを受けて初めて完了。**

## ディレクトリ構成

```
dozo-plugin/
├── .claude-plugin/
│   └── plugin.json          # プラグインマニフェスト
├── agents/
│   └── report-builder.md    # 報告書作成エージェント
├── skills/
│   ├── ask/
│   │   └── SKILL.md         # 要件ヒアリングスキル
│   ├── bucho/
│   │   └── SKILL.md         # 部長オーケストレーションスキル
│   ├── do/
│   │   └── SKILL.md         # タスク開始スキル
│   ├── done/
│   │   └── SKILL.md         # タスク完了スキル
│   ├── exit-notifier/
│   │   ├── SKILL.md         # background task 終了通知スキル
│   │   └── scripts/
│   │       └── watch-exit-notify.sh
│   ├── tiny-do/
│   │   └── SKILL.md         # 軽量タスク開始スキル
│   ├── tiny-done/
│   │   └── SKILL.md         # 軽量タスク完了スキル
│   ├── validate-report/
│   │   └── SKILL.md         # REPORT.md検証の内部 helper
│   └── artifact-proof/
│       └── SKILL.md         # エビデンス収集 + dozo レビュースキル
├── hooks/
│   └── hooks.json           # 自動フック設定
└── README.md
```

## dozo の基本的な使い方

```bash
# Markdown を開く
npx dozo report.md

# CSV を開く
npx dozo data.csv

# git diff を開く
git diff HEAD | npx dozo

# 複数ファイル
npx dozo file1.md file2.csv
```

詳細は `dozo-master` スキルを参照してください。

## License

MIT
