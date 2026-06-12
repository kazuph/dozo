---
name: open
description: Open files or URLs with macOS open command
argument-hint: <file-or-url>
allowed-tools: Bash, Read
---

# /dozo-plugin:open

<command-name>open</command-name>

macOSの`open`コマンドでファイルやURLを開きます。

## 使い方

### 引数ありの場合
```
/dozo-plugin:open /path/to/file.png
/dozo-plugin:open https://localhost:3000
```

### 引数なしの場合
直前の会話で言及されたファイルパス、URL、またはエビデンスを開きます。

## 実行内容

1. 引数があればそれを`open`コマンドで開く
2. 引数がなければ直前のassistantメッセージから以下を探す：
   - `.artifacts/` 配下のファイルパス
   - スクリーンショットや動画のパス（.png, .gif, .mp4）
   - localhost URL
   - その他のURL
3. 見つかったものを`open`コマンドで開く

## 例

```bash
# ファイルを開く
open /Users/kazuph/.artifacts/feature/screenshot.png

# URLを開く
open https://localhost:5173
```
