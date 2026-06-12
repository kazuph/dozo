---
name: check-yourself
description: Force actual verification with webapp-testing - no assumptions allowed
allowed-tools: Bash, Read, Glob, Grep, Task
---

# /dozo-plugin:check-yourself

<command-name>check-yourself</command-name>

ユーザーがキレています。以下を厳守してください。

## 禁止事項（絶対にやるな）

- ❌ `curl` でのAPI確認 → 禁止
- ❌ 「動くはずです」「問題ないと思います」 → 禁止
- ❌ 推測での回答 → 禁止
- ❌ ユーザーに確認を丸投げ → 禁止

## Step 0: プロジェクトタイプ検出

```bash
PROJECT_TYPE=$(grep -m1 '^Project-Type:' .artifacts/*/REPORT.md 2>/dev/null | awk '{print $2}')
if [ -z "$PROJECT_TYPE" ]; then
  # Auto-detect if not recorded
  if [ -f package.json ] && grep -qE '"(react|vue|svelte|next|nuxt|@angular/core|solid-js|astro)"' package.json 2>/dev/null; then
    PROJECT_TYPE="web"
  elif [ -f Podfile ] || [ -f pubspec.yaml ] || ([ -f app.json ] && grep -q '"expo"' app.json 2>/dev/null); then
    PROJECT_TYPE="mobile"
  elif [ -f go.mod ] || [ -f Cargo.toml ] || [ -f pyproject.toml ] || [ -f requirements.txt ]; then
    PROJECT_TYPE="backend"
  else
    PROJECT_TYPE="web"
  fi
fi
echo "Project type: $PROJECT_TYPE"
```

## 必須事項（今すぐやれ）

### Web / Fullstack の場合

1. **webapp-testing skill を使え**
   - Playwrightでブラウザを起動しろ
   - 実際にページを開け
   - スクリーンショットを撮れ
   - 自分の目で確認しろ

### Backend の場合

1. **backend-testing skill を使え**
   - プロジェクトのテストフレームワークを実行しろ（jest/vitest/pytest/go test/cargo test）
   - テスト結果を全件確認しろ
   - 失敗しているテストがあれば原因を特定しろ
   - カバレッジレポートを生成しろ
   - **curl でのAPI確認は禁止** → テストフレームワークを使え

### Mobile の場合

1. **mobile-testing skill を使え（Maestro MCP）**
   - シミュレータ/デバイスが起動していることを確認しろ
   - Maestro MCP の `take_screenshot` でスクショを撮れ
   - E2Eフローを実行して動作を確認しろ
   - 自分の目でスクショを確認しろ

## 共通（全プロジェクトタイプ）

2. **エビデンスを見せろ**
   - スクショ/テスト結果のパスを明記しろ
   - 何を確認したか具体的に報告しろ

3. **問題があれば直せ**
   - 見つけた問題は即座に修正しろ
   - 修正後に再度確認しろ（スクショ再撮影 or テスト再実行）

## 今すぐ実行

プロジェクトタイプに応じて適切なスキルを実行しろ：

| Project Type | 実行するスキル |
|-------------|---------------|
| web / fullstack | `/dozo-plugin:webapp-testing` |
| backend | `backend-testing` skill（テストフレームワーク実行） |
| mobile | `mobile-testing` skill（Maestro MCP） |

報告を待っている。
