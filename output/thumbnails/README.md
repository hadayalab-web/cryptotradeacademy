# サムネイル圧縮用フォルダ

圧縮したい画像をここに置き、以下を実行してください：

```
npm run compress:thumbnails
```

または特定のファイルを指定：

```
node scripts/compress-thumbnails.js ./output/thumbnails/thumb_A.png ./output/thumbnails/thumb_B.png
```

圧縮結果（約15%削減）は `*_compressed.png` または `*_compressed.webp` として同じフォルダに保存されます。
