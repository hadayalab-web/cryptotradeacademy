# Gemini統合後の配信形式
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  

**作成日**: 2026-01-17
**目的**: Gemini API統合後のTelegram配信メッセージ形式の説明

---

## 📊 現在の配信形式（統合前）

現在の配信メッセージは**テキストのみ**です：

```
📚 Dr. Grok's Market Leak
Session Briefing @ 2026-01-07 12:00:04 UTC

💰 BTC Price: $92,084 (-1.84% / 24h)
📊 Exchange Netflow: Inflow 114 BTC
...
```

---

## 🎨 Gemini統合後の配信形式

Gemini統合後は、**3つのメッセージが順番に配信**されます：

### 1. 🎥 AIキャスター動画（最初に送信）

**生成元**: Gemini Veo 3.1 (`veo-3.1-generate-preview`)  
**内容**: AIアンカーが市場分析を説明する8秒間の動画  
**形式**: Base64 Data URL または URL  
**キャプション**: テキストメッセージの最初の1024文字

**例**:
```
[動画メッセージ]
キャプション: 📚 Dr. Grok's Market Leak
Session Briefing @ 2026-01-07 12:00:04 UTC

💰 BTC Price: $92,084 (-1.84% / 24h)...
```

**プロンプト例**:
```
Create a professional 8-second cryptocurrency market analysis video with an AI news anchor presenting:
- BTC Price: $92,084
- Market Score: -1/100
- Sentiment: Fear
- 24h Change: -1.84%
```

---

### 2. 📸 市場分析画像（次に送信）

**生成元**: Gemini Nano Banana Pro (`nano-banana-pro`)  
**内容**: 市場データを視覚化したインフォグラフィック画像  
**形式**: Base64 Data URL  
**アスペクト比**: 16:9  
**サイズ**: 2K  
**キャプション**: テキストメッセージの最初の1024文字

**例**:
```
[画像メッセージ]
キャプション: 📚 Dr. Grok's Market Leak
Session Briefing @ 2026-01-07 12:00:04 UTC

💰 BTC Price: $92,084 (-1.84% / 24h)...
```

**プロンプト例**:
```
Create a professional cryptocurrency market analysis infographic image showing:
- BTC Price: $92,084 (-1.84%)
- Market Score: -1/100
- Exchange Inflow: +114 BTC
- Sentiment: Fear
- Signal: BUG STANDBY
Style: Modern, clean, data-driven, with charts and indicators
```

---

### 3. 📝 テキストメッセージ（最後に送信）

**内容**: 現在と同じテキスト形式のメッセージ  
**形式**: Markdown形式のテキスト

**例**:
```
📚 Dr. Grok's Market Leak
Session Briefing @ 2026-01-07 12:00:04 UTC

💰 BTC Price: $92,084 (-1.84% / 24h)
📊 Exchange Netflow: Inflow 114 BTC
⛏ Miners' Position Index (MPI): 0.12
🧠 Sentiment: Fear

📈 Market Score: -1/100
🎯 Trap Score: 0/100 ✅ LOW
...
```

---

## 🔄 配信フロー

### Phase 1: コンテンツ準備（`api/prepare.js`）

**実行タイミング**: 定時配信の5分前（例: 11:55, 15:55, 19:55）  
**処理内容**:
1. 市場データ取得
2. Grok分析実行
3. **Gemini画像生成** → `imageUrl`
4. **Gemini動画生成** → `videoUrl`（非同期、最大10分）
5. Vercel KVに保存

**保存されるデータ**:
```javascript
{
  imageUrl: "data:image/png;base64,...",  // または URL
  videoUrl: "data:video/mp4;base64,...",  // または URL（生成完了時）
  summary: "AI analysis text...",
  marketData: { ... }
}
```

---

### Phase 2: コンテンツ配信（`api/cron.js`）

**実行タイミング**: 定時配信時刻（例: 12:00, 16:00, 20:00）  
**処理内容**:
1. 保存されたコンテンツを取得（Vercel KV）
2. 保存された動画があれば送信
3. 保存された画像があれば送信
4. テキストメッセージを送信

**送信順序**:
```
1. 🎥 動画（savedVideoUrl）
   ↓
2. 📸 画像（savedImageUrl または imageUrl）
   ↓
3. 📝 テキスト（regularText）
```

---

## 📋 実際の配信例（統合後）

### 英語市場（EN）

```
[メッセージ1: 動画]
🎥 AI Caster Video
キャプション: 📚 Dr. Grok's Market Leak
Session Briefing @ 2026-01-07 12:00:04 UTC
💰 BTC Price: $92,084 (-1.84% / 24h)
📊 Exchange Netflow: Inflow 114 BTC
...

[メッセージ2: 画像]
📸 Market Analysis Infographic
キャプション: 📚 Dr. Grok's Market Leak
Session Briefing @ 2026-01-07 12:00:04 UTC
💰 BTC Price: $92,084 (-1.84% / 24h)
...

[メッセージ3: テキスト]
📚 Dr. Grok's Market Leak
Session Briefing @ 2026-01-07 12:00:04 UTC

💰 BTC Price: $92,084 (-1.84% / 24h)
📊 Exchange Netflow: Inflow 114 BTC
⛏ Miners' Position Index (MPI): 0.12
🧠 Sentiment: Fear

📈 Market Score: -1/100
🎯 Trap Score: 0/100 ✅ LOW
✅ Trap Detector: No critical trap detected.
✅ Trap Risk Score: 0/100 (LOW)

🎯 Trade Verdict
🛡️ Signal: BUG STANDBY (Defense Active)
...
```

---

## ⚙️ 設定と有効化

### 環境変数

```bash
# Gemini API統合を有効化
ENABLE_GEMINI_IMAGES=true

# Gemini APIキー
GEMINI_API_KEY=AIzaSyBeKmuRBImr1ZYtQMsOqpU-cqkdzQh3fig
```

### 動作条件

1. **`ENABLE_GEMINI_IMAGES=true`** が設定されている
2. **`GEMINI_API_KEY`** が設定されている
3. **`api/prepare.js`** が正常に実行されている（定時5分前）
4. **Vercel KV** にコンテンツが保存されている

---

## 🎯 期待される効果

### 視覚的インパクト

- ✅ **動画**: AIキャスターによる説明で、プロフェッショナルな印象
- ✅ **画像**: データを視覚化して、一目で市場状況を把握可能
- ✅ **テキスト**: 詳細な分析とトレード推奨

### エンゲージメント向上

- 📈 **リテンション**: 動画・画像があることで、メッセージを最後まで読む確率が向上
- 📈 **シェア**: 視覚的に魅力的なコンテンツは、シェアされやすい
- 📈 **ブランド**: 「AI生成コンテンツ」として差別化

---

## ⚠️ 注意事項

### 動画生成のタイミング

- 動画生成は最大10分かかる場合がある
- `api/prepare.js` は定時5分前に実行される
- 動画が完了しない場合は、**次回の配信で使用される**

### フォールバック動作

- `GEMINI_API_KEY` が設定されていない場合 → テキストのみ配信
- 画像生成に失敗した場合 → テキストのみ配信
- 動画生成に失敗した場合 → 画像 + テキストのみ配信

### コスト考慮

- Gemini APIの無料枠を超過する可能性
- 動画生成は特にリソースを消費
- 使用量を定期的に確認することを推奨

---

## 📚 関連ドキュメント

- [Vercel環境変数設定ガイド](./VERCEL_ENV_SETUP.md)
- [ローカル環境変数設定ガイド](./LOCAL_ENV_SETUP.md)
- [デプロイチェックリスト](./DEPLOYMENT_CHECKLIST.md)
- [修正レポート](./GEMINI_IMPLEMENTATION_FIXES.md)
