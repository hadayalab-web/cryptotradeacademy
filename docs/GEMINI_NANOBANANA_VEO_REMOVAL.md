# Gemini Nano Banana & Veo 実装削除理由

**作成日**: 2026-01-28  
**理由**: VercelのServerless Functions制限により動作しないため

## 🔴 問題の概要

VercelのCronJobsでNano Banana（画像生成）とVeo（動画生成）が**一度も正常に動作したことが確認できていない**。

## ⚠️ 致命的な問題点

### 1. Veo 3.1動画生成
- **問題**: 非同期ポーリングが最大600秒（10分）かかる
  - ポーリング: 最大60回 × 10秒間隔 = 600秒
- **Vercel制限**: Serverless Functionsは**60秒のタイムアウト制限**がある
- **結果**: **必ずタイムアウトして動作しない**

### 2. Nano Banana画像生成
- **問題**: 画像生成APIの処理時間が長い
- **Vercel制限**: 60秒のタイムアウト制限
- **結果**: タイムアウトの可能性が高い

## ✅ 実施した対応

### 1. `api/prepare.js`から削除
- `generateMarketImage`の呼び出しをコメントアウト
- `generateMarketVideo`の呼び出しをコメントアウト
- インポート文もコメントアウト

### 2. 削除されたコード
```javascript
// 削除前
const { generateMarketImage } = require('../services/gemini/imageGenerator');
const { generateMarketVideo } = require('../services/gemini/videoGenerator');

// 画像生成処理
imageUrl = await generateMarketImage(snapshot, LANG);

// 動画生成処理
videoUrl = await generateMarketVideo(snapshot, aiAnalysis, LANG);
```

## 📝 今後の対応

### オプション1: 完全削除（推奨）
- `services/gemini/imageGenerator.js`を削除
- `services/gemini/videoGenerator.js`を削除
- 関連ドキュメントを更新

### オプション2: 別環境での使用
- ローカル環境や長時間実行可能な環境（例: Cloud Run、Cloud Functions Gen2）でのみ使用
- VercelのCronJobsでは使用しない

### オプション3: 代替実装
- 画像生成: Canvas APIやSVG生成など、軽量な代替手段を検討
- 動画生成: 事前生成した動画テンプレートを使用

## 🎯 結論

**VercelのCronJobsでは、Nano BananaとVeoの実装は使用不可能**。  
これらの実装は削除または別環境でのみ使用すべき。
