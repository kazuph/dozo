#!/usr/bin/env bash
# Stop / SubagentStop hook
# コード変更があるのにテスト実行の痕跡がなければブロック
# ただし、テスト環境がセットアップされていないプロジェクト（0→1開発）ではスキップ

INPUT=$(cat)

# jqの場所を特定
JQ=/usr/bin/jq
if [ ! -x "$JQ" ]; then
  JQ=/opt/homebrew/bin/jq
fi
if [ ! -x "$JQ" ]; then
  exit 0
fi

# カレントディレクトリからプロジェクトルートを特定
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# テスト環境が存在するかチェックする関数
has_test_environment() {
  # Node.js / JavaScript / TypeScript
  if [ -f "$PROJECT_ROOT/vitest.config.ts" ] || \
     [ -f "$PROJECT_ROOT/vitest.config.js" ] || \
     [ -f "$PROJECT_ROOT/vitest.config.mjs" ] || \
     [ -f "$PROJECT_ROOT/jest.config.ts" ] || \
     [ -f "$PROJECT_ROOT/jest.config.js" ] || \
     [ -f "$PROJECT_ROOT/jest.config.mjs" ] || \
     [ -f "$PROJECT_ROOT/jest.config.json" ] || \
     [ -f "$PROJECT_ROOT/playwright.config.ts" ] || \
     [ -f "$PROJECT_ROOT/playwright.config.js" ]; then
    return 0
  fi

  # package.json に test script があるか
  if [ -f "$PROJECT_ROOT/package.json" ]; then
    if "$JQ" -e '.scripts.test // empty' "$PROJECT_ROOT/package.json" >/dev/null 2>&1; then
      return 0
    fi
  fi

  # Go - テストファイルが存在するか
  if [ -f "$PROJECT_ROOT/go.mod" ]; then
    if find "$PROJECT_ROOT" -name "*_test.go" -type f 2>/dev/null | head -1 | grep -q .; then
      return 0
    fi
  fi

  # Python - pytest/unittest環境
  if [ -f "$PROJECT_ROOT/pytest.ini" ] || \
     [ -f "$PROJECT_ROOT/conftest.py" ] || \
     [ -f "$PROJECT_ROOT/setup.cfg" ] || \
     [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
    # pyproject.toml/setup.cfg にpytest設定があるかチェック
    if [ -f "$PROJECT_ROOT/pyproject.toml" ] && grep -q '\[tool.pytest' "$PROJECT_ROOT/pyproject.toml" 2>/dev/null; then
      return 0
    fi
    if [ -f "$PROJECT_ROOT/setup.cfg" ] && grep -q '\[pytest\]' "$PROJECT_ROOT/setup.cfg" 2>/dev/null; then
      return 0
    fi
    if [ -f "$PROJECT_ROOT/pytest.ini" ] || [ -f "$PROJECT_ROOT/conftest.py" ]; then
      return 0
    fi
  fi

  # Python - test_*.py or *_test.py が存在するか
  if find "$PROJECT_ROOT" -maxdepth 3 -name "test_*.py" -o -name "*_test.py" 2>/dev/null | head -1 | grep -q .; then
    return 0
  fi

  # Rust - testsディレクトリまたはテストモジュール
  if [ -f "$PROJECT_ROOT/Cargo.toml" ]; then
    if [ -d "$PROJECT_ROOT/tests" ]; then
      return 0
    fi
  fi

  return 1
}

# テスト環境がなければスキップ（0→1開発）
if ! has_test_environment; then
  exit 0
fi

TRANSCRIPT_PATH=$(printf '%s' "$INPUT" | "$JQ" -r '.transcript_path // empty' 2>/dev/null || true)

# transcriptがなければスキップ
if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
  exit 0
fi

# 最近のtranscriptエントリを取得（最後200行）
RECENT=$(tail -200 "$TRANSCRIPT_PATH" 2>/dev/null || true)

if [ -z "$RECENT" ]; then
  exit 0
fi

# 最新のassistantメッセージのテキスト内容を取得
LATEST_ASSISTANT_TEXT=$(printf '%s' "$RECENT" | "$JQ" -rs '
  [.[] | select(.type == "assistant")] | last |
  .message.content[]? | select(.type == "text") | .text // empty
' 2>/dev/null || true)

# 完了宣言キーワードのチェック（日本語・英語対応）
# これらのキーワードがないとチェックしない（相談中はブロックしない）
COMPLETION_KEYWORDS="完了しました|実装しました|できました|確認してください|確認お願い|レビューお願い|レビューして|見てください|チェックして|implementation complete|done|finished|please review|please check|ready for review"

COMPLETION_TRIGGER=""
if printf '%s' "$LATEST_ASSISTANT_TEXT" | grep -qiE "$COMPLETION_KEYWORDS"; then
  COMPLETION_TRIGGER=$(printf '%s' "$LATEST_ASSISTANT_TEXT" | grep -oiE "$COMPLETION_KEYWORDS" | head -1)
fi

# 完了宣言がなければスキップ（相談中はブロックしない）
if [ -z "$COMPLETION_TRIGGER" ]; then
  exit 0
fi

# ソースコードの変更があったか確認
# Write/Edit ツールでソースファイル（テストファイル以外）を変更した痕跡を探す
CODE_CHANGED=$(printf '%s' "$RECENT" | "$JQ" -r '
  select(.type == "assistant") |
  .message.content[]? |
  select(.type == "tool_use") |
  select(.name == "Write" or .name == "Edit" or .name == "MultiEdit") |
  .input.file_path // empty
' 2>/dev/null | grep -vE '\.(test|spec|e2e)\.' | grep -vE '__tests__/' | grep -vE '\.(md|json|yaml|yml|toml|txt|css|scss|html|png|jpg|svg)$' | grep -E '\.(ts|tsx|js|jsx|cjs|mjs|py|rb|go|rs|vue|svelte)$' | head -1 || true)

# コード変更がなければチェック不要（質問への回答やドキュメント編集等）
if [ -z "$CODE_CHANGED" ]; then
  exit 0
fi

# テスト実行の痕跡を確認
TEST_RUN=$(printf '%s' "$RECENT" | "$JQ" -r '
  select(.type == "assistant") |
  .message.content[]? |
  select(.type == "tool_use") |
  select(.name == "Bash") |
  .input.command // empty
' 2>/dev/null | grep -cE 'vitest|playwright|jest|npm test|npx test|npm run test|pnpm test|yarn test|pytest|go test|cargo test' || true)

# webapp-testing / backend-testing / mobile-testing skill の使用痕跡を確認
SKILL_TEST=$(printf '%s' "$RECENT" | "$JQ" -r '
  select(.type == "assistant") |
  .message.content[]? |
  select(.type == "tool_use") |
  select(.name == "Skill") |
  .input.skill // empty
' 2>/dev/null | grep -cE 'webapp-testing|backend-testing|mobile-testing' || true)

# Maestro MCP ツールの使用痕跡を確認
MAESTRO_TEST=$(printf '%s' "$RECENT" | "$JQ" -r '
  select(.type == "assistant") |
  .message.content[]? |
  select(.type == "tool_use") |
  .name // empty
' 2>/dev/null | grep -cE 'maestro.*run_flow|maestro.*take_screenshot' || true)

# テスト実行もwebapp-testingも使われていない場合
if [ "${TEST_RUN:-0}" -eq 0 ] && [ "${SKILL_TEST:-0}" -eq 0 ] && [ "${MAESTRO_TEST:-0}" -eq 0 ]; then
  cat >&2 <<BLOCK
[dozo-plugin] テスト未実行での完了宣言を検出しました。

【トリガー】"${COMPLETION_TRIGGER}" という完了宣言がありました
【変更ファイル】${CODE_CHANGED}

完了宣言する前に以下のいずれかを実施してください:

[Webプロジェクト]
1. E2Eテストまたは結合テストを書いて実行する（モック禁止）
2. webapp-testing skill でブラウザ検証する

[Backendプロジェクト]
1. テストフレームワークでテストを書いて実行する（curl禁止）
   - Node.js: vitest/jest + supertest
   - Go: go test + httptest
   - Python: pytest + httpx/TestClient
   - Rust: cargo test
2. backend-testing skill でテスト検証する

[Mobileプロジェクト]
1. Maestro E2Eフロー(.yaml)を書いて実行する
2. mobile-testing skill でMaestro MCP検証する

3. テスト結果のエビデンスを収集する

※相談中・作業途中のやり取りではこのチェックは発動しません。
※完了宣言（完了しました、実装しました、確認してください等）をしたときのみチェックされます。
BLOCK
  exit 2
fi

exit 0
