#!/usr/bin/env bash
# PreToolUse hook (matcher: Write)
# テストファイルへの書き込み前にモック/スタブパターンを検出してブロック

INPUT=$(cat)

FILE_PATH=$(printf '%s' "$INPUT" | /usr/bin/jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
CONTENT=$(printf '%s' "$INPUT" | /usr/bin/jq -r '.tool_input.content // empty' 2>/dev/null || true)

# jqが使えない場合はhomebrew版を試す
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(printf '%s' "$INPUT" | /opt/homebrew/bin/jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
  CONTENT=$(printf '%s' "$INPUT" | /opt/homebrew/bin/jq -r '.tool_input.content // empty' 2>/dev/null || true)
fi

# FILE_PATHが取れなければスキップ
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# テストファイルでなければスキップ
if ! printf '%s' "$FILE_PATH" | grep -qE '\.(test|spec|e2e)\.(ts|tsx|js|jsx)$|__tests__/|_test\.go$|test_.*\.py$|.*_test\.py$|tests/.*\.py$'; then
  exit 0
fi

# モックパターン定義
MOCK_PATTERNS='jest\.fn|jest\.mock|jest\.spyOn|vi\.fn|vi\.mock|vi\.spyOn|sinon\.|\.stub\(|createMock|mockReturnValue|mockResolvedValue|mockImplementation|mockRejectedValue|nock\(|setupServer|fake[A-Z]|unittest\.mock|@mock\.|@patch\(|MagicMock|AsyncMock|monkeypatch\.|gomock\.NewController|mock\.NewMock|testify/mock'

# 書き込もうとしている内容にモックパターンがあるか検出
if [ -n "$CONTENT" ] && printf '%s' "$CONTENT" | grep -qE "$MOCK_PATTERNS"; then
  DETECTED=$(printf '%s' "$CONTENT" | grep -oE "$MOCK_PATTERNS" | sort -u | head -5 | tr '\n' ', ' | sed 's/,$//')

  # JSON出力でdeny（jqを使わずcatで出力）
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "[dozo-plugin] テストファイルにモック/スタブパターンを検出: ${DETECTED}\n\n禁止パターン: jest.fn(), jest.mock(), vi.fn(), vi.mock(), sinon.stub(), nock(), msw 等\n\n代わりに以下を使ってください:\n- 実際のサーバーを起動してPlaywright/ブラウザでテスト\n- vitest + 実プロセス起動の結合テスト\n- DI経由のローカルエミュレータ（Firebase Emulator等）は許可"
  }
}
EOF
  exit 0
fi

# テストファイルだけどモックなし → context追加でリマインド
cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "additionalContext": "[dozo-plugin] テストファイルを書いています。モック/スタブは禁止です。実サーバー起動 + Playwright/vitest で実環境テストを書いてください。jest.fn(), vi.mock() 等を使うとブロックされます。"
  }
}
EOF
exit 0
