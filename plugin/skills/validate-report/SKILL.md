---
name: validate-report
description: Internal helper that validates REPORT.md against artifact-proof reporting rules
user-invocable: false
allowed-tools: Bash, Read, Glob, Grep, Task
---

# validate-report - internal REPORT.md validation helper

`done` スキルから内部的に呼ばれる補助スキル。REPORT.md が artifact-proof スキルの 5 ルールに準拠しているかを検証する。

## 前提条件

- `.artifacts/<feature=branch_name>/REPORT.md` が存在すること
- `do` / `done` フローで `.artifacts/<feature=branch_name>/REPORT.md` が作成済みであること

## 実行手順

### Step 1: REPORT.md存在確認

```bash
# REPORT.mdを探す
REPORT_PATH=$(find .artifacts -name "REPORT.md" -type f 2>/dev/null | head -1)

if [ -z "$REPORT_PATH" ]; then
  echo "❌ REPORT.mdが見つかりません"
  echo ""
  echo "以下のいずれかを実行してください："
  echo "  1. do スキルでタスクを開始する"
  echo "  2. 手動で .artifacts/<feature>/REPORT.md を作成する"
  exit 1
fi

echo "✅ REPORT.md found: $REPORT_PATH"
```

### Step 2: report-validatorエージェント実行

REPORT.mdが存在する場合、report-validatorエージェントを起動して5ルールをチェックする。

```
Launch agent with Task tool:

subagent_type: "dozo-plugin:report-validator"
prompt: |
  以下のREPORT.mdを検証してください:
  ${REPORT_PATH}

  artifact-proofスキルの5ルールに準拠しているか確認し、
  違反があれば具体的な修正方法を提示してください。
```

### Step 3: 結果に基づく対応

| 結果 | 対応 |
|------|------|
| 5/5 Pass | ✅ `done` スキルの dozo 起動フェーズへ進む |
| 3-4/5 Pass | ⚠️ 警告表示、修正推奨 |
| 0-2/5 Pass | ❌ 修正必須、report-builderを再実行 |

## 5ルール概要

| # | ルール | チェック内容 |
|---|--------|-------------|
| 1 | 言語ポリシー | ユーザーの依頼言語と一致しているか |
| 2 | メディアフォーマット | `![]()` 構文 + テーブル配置（縦積み禁止） |
| 3 | 優先順位 | 📌 Attention Required → 📋 Previous Feedback の順序 |
| 4 | フィードバック累積 | 原文記録 + `<details>` タグ + 累積形式 |
| 5 | TodoList連携 | User Request ⇄ Response セクションの存在 |

## 使用例

```bash
# 結果例
## Report Validation Results

| Rule | Check | Status |
|------|-------|--------|
| 1 | 言語ポリシー | ✅ |
| 2 | メディアフォーマット | ❌ |
| 3 | 優先順位 | ✅ |
| 4 | フィードバック累積 | ⚠️ |
| 5 | TodoList連携 | ✅ |

### Overall: 3/5 Rules Passed
```

## 関連スキル

- `do` - タスク開始（REPORT.md作成）
- `done` - タスク完了チェック（内部で validate-report を実行）
