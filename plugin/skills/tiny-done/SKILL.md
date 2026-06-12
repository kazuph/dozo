---
name: tiny-done
description: Lightweight task completion - screenshot/video capture, open for review, user approval
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, TodoWrite, Task, AskUserQuestion
---

# /dozo-plugin:tiny-done

<command-name>tiny-done</command-name>

軽量タスクの完了検証コマンド。
スクショ・動画を撮影 → openで開く → ユーザー承認で完了。

**ALL checkpoints must be passed before task completion. Do NOT report completion without user approval.**

**tiny-doneは/doneの軽量版です。REPORT.md・レビューエージェント・npx dozoを省略する代わりに、スクショ・動画をopenで直接開いてユーザー確認します。完了基準は同じ（ユーザー承認まで終わらない）。**

## doneとの違い

| | done（フル） | tiny-done（軽量） |
|---|---|---|
| ビルド検証 | あり | あり |
| スクショ・動画撮影 | あり | あり |
| 保存先 | `.artifacts/<feature>/` | `/tmp/tiny-done/` |
| レビューエージェント | 4並列（code-security, e2e, ui-ux, Codex） | なし |
| REPORT.md | 作成+検証 | 作らない |
| npx dozo | 必須 | なし |
| 確認方法 | dozo上でレビュー | **openコマンドで直接開く** |
| ユーザー承認 | 必須 | 必須 |

---

## ☑ 1. ビルド検証

```bash
# プロジェクトに応じたビルドコマンドを実行
npm run build  # or pnpm build, etc.
```

- ビルドエラーがないことを確認
- 型エラー、lintエラーがないことを確認

---

## ☑ 2. スクショ・動画撮影

### Web / Fullstack の場合

1. **webapp-testing skill でスクショ撮影**
   - 実装した画面をPlaywrightで開く
   - スクリーンショットを撮影
   - 必要に応じてGIF動画も撮影

2. **撮影したファイルを `/tmp/tiny-done/` に保存**

### Backend の場合

1. **テストスイートを実行してエビデンス取得**
   - プロジェクトのテストフレームワークを実行
   - テスト結果の出力を `/tmp/tiny-done/test-output.txt` に保存

### Mobile の場合

1. **Maestro MCP でスクショ撮影**
   - シミュレータ/デバイスが起動していることを確認
   - Maestro MCP の `take_screenshot` で現在の画面を撮影
   - `/tmp/tiny-done/` に保存

---

## ☑ 3. openコマンドで開く（必須）

**撮影したスクショ・動画・テスト結果を必ずopenで開く。**

```bash
# スクショを開く
open /tmp/tiny-done/screenshot.png

# 動画を開く
open /tmp/tiny-done/demo.mp4

# テスト結果を開く（backendの場合）
open /tmp/tiny-done/test-output.txt
```

**openせずに完了報告することは禁止。ユーザーが目で確認できる状態にする。**

---

## ☑ 4. ユーザー承認

**AskUserQuestionでユーザーに確認を求める。**

```
Question: "この内容でOKですか？"
Header: "確認"
Options:
  1. "OK" - 承認する
  2. "修正が必要" - フィードバックを伝える
```

---

## NGフィードバック時のループ

ユーザーがOKと言わなかった場合:

```
☑ 4 → ユーザー「NG: ○○を直して」
  ↓
修正実装（TDDサイクル維持）
  ↓
再度 ☑ 2 → ☑ 3 → ☑ 4（撮影→open→ユーザー確認）
  ↓
ユーザーがOKと言うまでループ
```

- ユーザーのフィードバックは原文のままTodoListに登録
- 修正後は必ずテストを再実行してからスクショ撮影

---

## セッション復帰

中断後にセッションを再開した場合:

```bash
# worktreeの確認
git wt
# worktreeに移動
cd .worktree/<branch-name>
# TodoListで進捗確認 → 未完了タスクから再開
```

---

## 禁止事項

- REPORT.mdを作成する
- artifact-proof skillを使う
- npx dozoを起動する
- レビューエージェントを使う
- codexスキルを使う
- openせずに完了報告する
- ユーザー承認なしで完了にする

## 完了条件

1. ビルドが通っている
2. スクショ/動画/テスト結果が撮影されている
3. openコマンドで開かれている
4. ユーザーがOKと言っている
