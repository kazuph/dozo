---
name: video-decompose
description: ffmpegで動画をシーン検出ベースのフレーム分解し、意味のあるキーフレームだけを抽出する。dozoのシーン検出ロジックと同じ手法を使用。
license: Complete terms in LICENSE.txt
---

# Video Decompose（動画フレーム分解）

動画ファイルをffmpegのシーン検出フィルタでフレーム分解し、意味のあるキーフレーム画像を抽出する。

## 前提条件

- `ffmpeg` がインストールされていること（`which ffmpeg` で確認）
- 対応フォーマット: `.mp4`, `.mov`, `.webm`, `.avi`, `.mkv`, `.m4v`, `.ogv`

## 使い方

### 1. シーン検出ベースのフレーム抽出

dozoと同じシーン検出アルゴリズムを使用する:

```bash
# 出力ディレクトリ作成
OUTDIR="/tmp/video-decompose-$(date +%s)"
mkdir -p "$OUTDIR"

# シーン検出でキーフレーム抽出（閾値 0.01 = 標準感度）
ffmpeg -i <video_path> \
  -vf "select='gt(scene,0.01)',showinfo,scale=640:-1" \
  -vsync vfr \
  -q:v 3 \
  "$OUTDIR/scene_%04d.jpg" 2>"$OUTDIR/ffmpeg_stderr.log"
```

**パラメータ解説:**
- `select='gt(scene,0.01)'`: シーン変化スコアが閾値を超えたフレームのみ抽出
- `showinfo`: stderr にタイムスタンプ（`pts_time:N.NNNNN`）を出力
- `scale=640:-1`: 幅640px、高さはアスペクト比維持（確認用に十分な解像度）
- `-vsync vfr`: 可変フレームレートで選択フレームのみ出力
- `-q:v 3`: JPEG品質（1=最高, 31=最低。3=高品質）

### 2. タイムスタンプ抽出

```bash
# stderr からタイムスタンプを抽出
grep "pts_time:" "$OUTDIR/ffmpeg_stderr.log" | sed 's/.*pts_time:\([0-9.]*\).*/\1/'
```

### 3. 感度調整

| 感度 | 閾値 | 用途 |
|------|------|------|
| 少なめ | 0.3 | 明らかなシーン切り替えのみ |
| やや少 | 0.1 | 大きな変化 |
| **標準** | **0.01** | **通常はこれを使う** |
| やや多 | 0.005 | 細かい変化も検出 |
| 多め | 0.001 | あらゆる変化を検出 |

### 4. 動画の基本情報取得

```bash
# 動画の長さ（秒）を取得
ffprobe -v error -show_entries format=duration -of csv=p=0 <video_path>

# フレーム数を取得
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 <video_path>
```

### 5. 抽出結果が少なすぎる場合

シーン変化が少ない動画（静的な画面表示など）の場合、シーン検出では1-2枚しか抽出されない。
これ自体が **「この動画は表示しただけで操作がない」** ことの証拠になる。

- 抽出フレーム数 ≤ 2 → **操作がない動画の可能性が高い（要警告）**
- 動画の長さが5秒未満 → **表示確認だけの可能性が高い（要警告）**

### 6. 完全なワンライナー（コピペ用）

```bash
OUTDIR="/tmp/video-decompose-$(date +%s)" && mkdir -p "$OUTDIR" && ffmpeg -i <video_path> -vf "select='gt(scene,0.01)',showinfo,scale=640:-1" -vsync vfr -q:v 3 "$OUTDIR/scene_%04d.jpg" 2>"$OUTDIR/ffmpeg_stderr.log" && echo "Frames: $(ls "$OUTDIR"/scene_*.jpg 2>/dev/null | wc -l)" && echo "Timestamps:" && grep "pts_time:" "$OUTDIR/ffmpeg_stderr.log" | sed 's/.*pts_time:\([0-9.]*\).*/\1/' && echo "Output: $OUTDIR"
```
