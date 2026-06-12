---
name: commit-and-push
description: Auto-generate commit message, commit all changes, and push
allowed-tools: Bash, Read, Glob, Grep
---

# /dozo-plugin:commit-and-push

<command-name>commit-and-push</command-name>

現在の変更をすべてコミットしてpushし、ワーキングディレクトリをクリーンな状態にします。

## 実行内容

1. `git status` で現在の状態を確認
2. 変更があれば適切なコミットメッセージを生成
3. `git add` で変更をステージング
4. `git commit` でコミット（Co-Authored-By付き）
5. `git push` でリモートにプッシュ
6. 不要なファイル（.DS_Store等）があれば`.gitignore`に追加
7. 最終的な `git status` でクリーンな状態を確認

## 注意事項

- コミットメッセージは変更内容から自動生成
- 機密ファイル（.env等）は除外
- untracked filesがあれば確認してから追加
- pushが失敗した場合はエラーを報告

## 完了条件

`git status` の出力が以下のようになること：
```
On branch <branch>
nothing to commit, working tree clean
```
