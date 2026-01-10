# Trap Defence BTC メッセージUI仕様レビュー

## レビュー依頼日
2025年1月

## 目的
Trap Defence BTCのメッセージUIにNanoBananaとVeoのコンテンツを挿入する仕様が正確に動作するかチェックし、Geminiにレビューを依頼する。

---

## 1. メッセージUIの仕様概要

### 1.1 ニュース番組構造
メッセージは以下の構造で配信される：

1. **Opening（オープニング）** - GPT Reporter
   - CryptoQuantデータ解析によるトラップニュース
   - 市場の現状を簡潔に伝える（15-30秒相当のテキスト）

2. **Data Presentation（データ提示）** - Gemini NanoBanana Pro
   - 市場分析画像を生成・表示
   - オンチェーンデータ、ダイバージェンス、トラップスコアを視覚化

3. **Commentator（コメンテーター）** - Dr. Grok
   - Xセンチメント分析 + 心理的サポート診断
   - 癒し系コメンテーターとして感情エンゲージメントを提供

4. **Closing（クロージング）**
   - トラップアラート: `AVOID_LONG`、`AVOID_SHORT`、`STANDBY`
   - 次の配信予定時刻

### 1.2 Geminiコンテンツ生成仕様

#### NanoBanana（画像生成）
- **モデル**: `gemini-3-pro-image-preview` (nano-banana-pro)
- **アスペクト比**: `16:9`（横長のダッシュボードスタイル）
- **画像サイズ**: `2K`
- **生成タイミング**: 定期配信時（REGULAR）
- **プロンプト**: 市場データ（価格、スコア、センチメント、変動率、フロー）に基づく多言語プロンプト

#### Veo（動画生成）
- **モデル**: `veo-3.1-generate-preview`
- **動画長**: 8秒
- **解像度**: 720p
- **生成タイミング**: 定期配信時（REGULAR）
- **プロンプト**: AIニュースアンカーが市場データを説明する動画

---

## 2. 実装の流れ

### 2.1 コンテンツ生成フロー（`api/cron.js`）

```javascript
// 1. 画像生成（NanoBanana）
imageUrl = await generateMarketImage(enhancedSnapshot, LANG);

// 2. 動画生成（Veo）
videoUrl = await generateMarketVideo(enhancedSnapshot, videoSummary, LANG);

// 3. hasGeminiContentフラグの設定
const hasGeminiContent = !!(imageUrl || videoUrl);

// 4. メッセージ再生成（hasGeminiContent=trueの場合）
if (hasGeminiContent) {
  regularText = formatRegularBriefing({
    // ... パラメータ
    hasGeminiContent: true,
  });
}

// 5. メッセージ送信
// 動画がある場合は先に動画を送信
if (savedVideoUrl) {
  await sendVideo(savedVideoUrl, regularText.substring(0, 1024));
}

// 画像がある場合は先に画像を送信
if (imageUrl) {
  await sendPhoto(imageUrl, regularText.substring(0, 1024));
}

// テキストメッセージを送信
await sendMessage(regularText);
```

### 2.2 メッセージテンプレート（`services/telegram/messages/user/{lang}/regular.{lang}.js`）

```javascript
// USP2: Geminiコンテンツ生成（データ提示セクション）
if (hasGeminiContent) {
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('📊 【Data Presentation】NanoBanana Infographic');
  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push('🎬 Check attached image/video!');
  lines.push('');
}
```

---

## 3. 発見された問題点

### 3.1 変数名の不一致
- **問題**: `api/cron.js`の1250行目で`savedVideoUrl`をチェックしているが、実際に生成される変数は`videoUrl`
- **影響**: 動画が生成されても送信されない可能性がある
- **場所**: `api/cron.js:1250`

```javascript
// 現在のコード
if (savedVideoUrl) {  // ❌ savedVideoUrlは定義されていない
  await sendVideo(savedVideoUrl, regularText.substring(0, 1024));
}

// 修正案
if (videoUrl) {  // ✅ videoUrlを使用
  await sendVideo(videoUrl, regularText.substring(0, 1024));
}
```

### 3.2 メッセージ送信順序
- **現在**: 動画 → 画像 → テキスト
- **推奨**: 画像 → 動画 → テキスト（または動画 → 画像 → テキストのままでも可）
- **理由**: Telegramでは画像の方が軽量で、先に送信するとユーザー体験が向上する可能性がある

### 3.3 エラーハンドリング
- **現在**: 画像/動画生成が失敗してもテキストメッセージは送信される（適切）
- **改善点**: 生成失敗時のログが詳細でない可能性がある

### 3.4 日本語メッセージテンプレートの重複定義
- **問題**: `services/telegram/messages/user/ja/regular.ja.js`の109-115行目で`hasGeminiContent`パラメータが重複定義されている
- **影響**: コードの可読性が低下
- **場所**: `regular.ja.js:109-115`

---

## 4. 確認事項

### 4.1 動作確認が必要な項目
1. ✅ `hasGeminiContent`フラグが正しく設定されるか
2. ✅ 画像/動画が生成された場合にメッセージテンプレートが更新されるか
3. ✅ 画像/動画がTelegramに正しく送信されるか
4. ❌ `savedVideoUrl`と`videoUrl`の変数名不一致（修正必要）
5. ✅ エラー時にテキストメッセージのみ送信されるか

### 4.2 多言語対応
- **対応言語**: EN, JA, KO, ES, PT-BR, AR（6言語）
- **確認**: 全言語で`hasGeminiContent`フラグが正しく処理されるか

---

## 5. Geminiレビュー依頼

以下の観点でレビューをお願いします：

1. **実装の正確性**: NanoBananaとVeoのコンテンツ挿入仕様が正確に実装されているか
2. **エラーハンドリング**: 生成失敗時の処理が適切か
3. **ユーザー体験**: メッセージ送信順序が最適か
4. **コード品質**: 変数名の不一致や重複定義などの問題
5. **パフォーマンス**: 画像/動画生成のタイムアウトやリトライロジックが適切か
6. **セキュリティ**: APIキーの扱いやエラーメッセージの漏洩リスク

---

## 6. 推奨修正

### 6.1 変数名の修正
```javascript
// api/cron.js:1250
// 修正前
if (savedVideoUrl) {
  await sendVideo(savedVideoUrl, regularText.substring(0, 1024));
}

// 修正後
if (videoUrl) {
  await sendVideo(videoUrl, regularText.substring(0, 1024));
}
```

### 6.2 日本語テンプレートの重複削除
```javascript
// regular.ja.js:109-115
// 重複しているパラメータ定義を削除
```

---

## 7. テストシナリオ

### 7.1 正常系
1. 画像のみ生成される場合
2. 動画のみ生成される場合
3. 画像と動画の両方が生成される場合
4. 画像も動画も生成されない場合（テキストのみ）

### 7.2 異常系
1. 画像生成が失敗する場合
2. 動画生成が失敗する場合
3. 画像/動画の送信が失敗する場合
4. APIキーが設定されていない場合

---

## 8. 参考資料

- SSOT: `docs/SSOT_TRAP_DEFENSE_BTC.md`
- 実装ファイル:
  - `api/cron.js` (メッセージ送信ロジック)
  - `services/gemini/imageGenerator.js` (NanoBanana画像生成)
  - `services/gemini/videoGenerator.js` (Veo動画生成)
  - `services/telegram/messages/user/{lang}/regular.{lang}.js` (メッセージテンプレート)
  - `services/telegram/bot.js` (Telegram送信関数)
