# 動画タイムライン機能 - 実装計画

## 概要

E2Eテスト動画で「変化があった部分だけ」をサムネイル表示するタイムライン機能。
時間ベースではなく**変化ベース**で、重要な状態遷移を一目で把握できる。

## 解決する問題

- 0.3秒でログイン完了など、細かいUI操作が追えない
- 冒頭の10秒間何も起きない時間が無駄
- 証拠としての動画の価値が下がる

## アルゴリズム: 安定化フレーム抽出法

```
1. 低閾値でフレーム間差分を全検出（scene=0.05程度）
2. 連続する類似フレームをグループ化
3. 各グループの最後（安定した状態）をサムネイルとして採用
```

**なぜ効くか:**
- スピナー → 常に変化し続けるので「安定しない」→ 無視
- いいね → 押した後は新しい状態で安定 → 検出
- 画面遷移 → 明らかに安定する → 検出

## 技術設計

### サーバーサイド（cli.cjs）

#### 1. ffmpeg存在確認
```javascript
function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
```

#### 2. 新規エンドポイント: `/video-timeline`
- GET `/video-timeline?path=<videoPath>`
- SSEでサムネイル情報をストリーミング返却
- レスポンス形式:
  ```json
  {"type": "thumbnail", "time": 1.5, "index": 0, "path": "/tmp/dozo-thumb-xxx/0001.jpg"}
  {"type": "thumbnail", "time": 3.2, "index": 1, "path": "/tmp/dozo-thumb-xxx/0002.jpg"}
  {"type": "complete", "total": 15}
  ```

#### 3. サムネイル抽出処理
```javascript
// Step 1: ffmpegでシーン検出
spawn('ffmpeg', [
  '-i', videoPath,
  '-vf', 'select=gt(scene\\,0.05),showinfo',
  '-vsync', 'vfr',
  '-frame_pts', '1',
  `${tmpDir}/frame_%04d.jpg`
]);

// Step 2: 安定化フィルタ（連続類似フレームの除去）
// → 類似度が高いフレームが連続したらグループ化
// → 各グループの最後のフレームを採用
```

#### 4. 一時ファイル管理
- `/tmp/dozo-timeline-<sessionId>/` にサムネイル保存
- サーバー終了時にクリーンアップ

### クライアントサイド（HTML/JS in cli.cjs）

#### 1. タイムラインUI（フルスクリーンモーダル下部）
```css
.video-timeline {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: rgba(0,0,0,0.8);
  display: flex;
  overflow-x: auto;
  padding: 8px;
  gap: 4px;
}
.timeline-thumb {
  height: 64px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
  flex-shrink: 0;
}
.timeline-thumb.active {
  border-color: #3b82f6;
}
```

#### 2. サムネイル読み込み（SSE）
```javascript
function loadTimeline(videoPath) {
  const es = new EventSource(`/video-timeline?path=${encodeURIComponent(videoPath)}`);
  es.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'thumbnail') {
      appendThumbnail(data);
    } else if (data.type === 'complete') {
      es.close();
    }
  };
}
```

#### 3. クリックでシーク
```javascript
thumb.onclick = () => {
  video.currentTime = thumb.dataset.time;
};
```

#### 4. 現在位置ハイライト
```javascript
video.ontimeupdate = () => {
  // 現在時刻に最も近いサムネイルをactiveに
};
```

## ファイル変更箇所

| ファイル | 変更内容 |
|---------|---------|
| `cli.cjs` | ffmpeg確認、/video-timelineエンドポイント、サムネイル抽出、CSS、JS |

## フォールバック

- ffmpegがない場合: タイムライン非表示、通常の動画再生のみ
- 抽出エラー時: エラー通知後、通常再生にフォールバック

## 検証方法

1. ffmpegインストール済み環境でテスト用動画を表示
2. フルスクリーンモーダルを開く
3. 下部にサムネイルが順次追加されることを確認
4. サムネイルクリックで動画がシークすることを確認
5. ffmpegなし環境でフォールバック動作を確認

## 実装ステップ

1. [ ] ffmpeg存在確認関数の追加
2. [ ] `/video-timeline` SSEエンドポイント実装
3. [ ] サムネイル抽出処理（spawn + 安定化フィルタ）
4. [ ] 一時ファイル管理（作成・クリーンアップ）
5. [ ] タイムラインUI CSS追加
6. [ ] クライアントJS（SSE受信、DOM生成、シーク連携）
7. [ ] 動作検証（Playwright/手動）
