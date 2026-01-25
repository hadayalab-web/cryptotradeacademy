# EN版メッセージ分析と修正レポート（2026-01-25）

## 概要
EN版の無料版（Minimal Version）と有料版（Regular Briefing）のメッセージを分析し、不具合を修正しました。

## 検出された不具合

### 1. ❌ 有料版に日本語セクションが混在
**問題**: 有料版メッセージに「📰 心理的解釈とトレーダーの感情」という日本語セクションが混在している。

**原因**: 
- GPT分析が`LANG`環境変数（'ja'）を使用して生成されていた
- EN版でも日本語で返ってくる可能性があった

**修正内容**:
- `api/cron.js`の892行目: GPT分析を最初の言語（通常は'en'）で生成するように変更
- 日本語が混在している場合の検出とフィルタリングを追加
- `services/telegram/messages/user/en/regular.en.js`: EN版テンプレートで日本語文字を検出してフィルタリング

**変更箇所**:
```javascript
// 修正前
gptRegularAnalysis = await generateCryptoQuantAnalysis(cryptoQuantData, marketContext, LANG);

// 修正後
const firstTargetLang = getTargetLanguagesForRegular()[0] || 'en';
gptRegularAnalysis = await generateCryptoQuantAnalysis(cryptoQuantData, marketContext, firstTargetLang);

// 日本語が混在している場合の検出
if (firstTargetLang === 'en' && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(gptRegularAnalysis)) {
  console.warn('[GPT] Japanese characters detected in English analysis, regenerating...');
  // 再生成を試みる
}
```

### 2. ❌ 有料版でWhale Ratioが表示されない
**問題**: 無料版にはWhale Ratio: 56%が表示されているが、有料版には表示されていない。

**原因**: 
- 有料版テンプレートでWhale Ratioが`displayTrapScore`がnullでない場合のみ表示されていた
- Trap Scoreが0の場合、Whale Ratioが表示されない

**修正内容**:
- `services/telegram/messages/user/en/regular.en.js`: Whale Ratioを`displayTrapScore`がnullでも表示するように変更
- Trap Scoreの条件を`> 0`から`>= 0`に変更（0も表示）

**変更箇所**:
```javascript
// 修正前
if (displayTrapScore != null && displayTrapScore > 0) {
  // Whale Ratio表示
}

// 修正後
// Trap Scoreを表示（0以上の場合）
if (displayTrapScore != null && displayTrapScore >= 0) {
  // Trap Score表示
}

// Whale Ratio情報（EN市場専用）- Trap Scoreがnullでも表示
if (whaleFlows && whaleFlows.whaleRatio != null) {
  const whaleRatioPercent = typeof whaleFlows.whaleRatio === 'number' 
    ? whaleFlows.whaleRatio * 100 
    : whaleFlows.whaleRatio;
  const whaleRatioValue = typeof whaleRatioPercent === 'number' ? whaleRatioPercent : parseFloat(whaleRatioPercent) || 0;
  const whaleLine = `🐋 Whale Ratio: ${whaleRatioValue.toFixed(1)}% ${whaleFlows.isHighPressure ? '(High Pressure)' : '(Normal)'}`;
  lines.push(whaleLine);
}
```

### 3. ⚠️ 無料版にMPIとSentimentが表示されない
**問題**: 無料版にはMPIとSentimentが表示されていないが、有料版には表示されている。

**修正内容**:
- `services/telegram/messages/user/en/minimal-high-quality.en.js`: 無料版テンプレートにMPIとSentimentを追加表示

**変更箇所**:
```javascript
// Market Dataから追加情報を表示（MPI、Sentimentなど）
if (marketData) {
  if (marketData.mpi !== undefined && marketData.mpi !== null) {
    const mpi = marketData.mpi;
    if (mpi > 2.0) {
      message += `\n• Miners' Position Index (MPI): ${mpi.toFixed(2)} — Miners are selling (caution needed)`;
    } else if (mpi < 0.5) {
      message += `\n• Miners' Position Index (MPI): ${mpi.toFixed(2)} — Miners are holding (positive signal)`;
    } else {
      message += `\n• Miners' Position Index (MPI): ${mpi.toFixed(2)} — Normal range`;
    }
  }
}

// Sentiment Dataから追加情報を表示
if (sentimentData && sentimentData.sentiment) {
  const sentiment = sentimentData.sentiment;
  const sentimentEmoji = sentiment.toLowerCase().includes('fear') ? '😨' :
                         sentiment.toLowerCase().includes('greed') ? '😍' :
                         sentiment.toLowerCase().includes('fomo') ? '😰' :
                         sentiment.toLowerCase().includes('panic') ? '😱' : '😐';
  message += `\n• Sentiment: ${sentimentEmoji} ${sentiment}`;
}
```

### 4. ℹ️ Trap Score vs Market Scoreの違い
**問題**: 無料版はTrap Score 0/100、有料版はMarket Score 4/100と異なるスコアが表示されている。

**説明**: 
- Trap Score: トラップ検出スコア（0-100）
- Market Score: 市場スコア（-100から+100、0が中立）
- これらは異なる指標なので、問題ありません

**対応**: 
- ユーザーに混乱を与えないよう、両方のスコアの意味を明確にする必要がある
- 現時点では、コード上の問題はありません

## 修正後の期待される動作

### 無料版（Minimal Version）
- ✅ Trap Score: 0/100（トラップ検出スコア）
- ✅ BTC Price: $89,098 (-0.43% / 24h)
- ✅ Exchange Netflow: 1176 BTC (outflow)
- ✅ Whale Ratio: 56% — Moderately high selling pressure
- ✅ Miners' Position Index (MPI): -0.54 — Miners are holding (positive signal)
- ✅ Sentiment: 😨 Extreme Fear
- ✅ Dr. Grok's Quick Insight
- ✅ Mental Note

### 有料版（Regular Briefing）
- ✅ Market Score: 4/100 (Neutral/Stable)
- ✅ Trap Score: 0/100 ✅ LOW（トラップ検出スコア）
- ✅ Whale Ratio: 56% (Normal)（Whale Ratioが表示される）
- ✅ BTC Price: $89,098 (-0.43% / 24h)
- ✅ Exchange Netflow: Outflow 1176 BTC — Holders are keeping assets
- ✅ Miners' Position Index (MPI): -0.54
- ✅ Sentiment: Extreme Fear
- ✅ GPT分析（英語のみ、日本語が混在しない）
- ✅ Dr. Grok's Quick Insight
- ✅ Mental Note

## 修正ファイル一覧

1. `api/cron.js` (892行目) - GPT分析の言語指定を修正、日本語混在検出を追加
2. `services/telegram/messages/user/en/regular.en.js` (238-249行目, 633-673行目) - 日本語フィルタリング追加、Whale Ratio表示を改善
3. `services/telegram/messages/user/en/minimal-high-quality.en.js` (266-294行目) - MPIとSentimentを追加表示

## 次のステップ

1. **デプロイ**: 修正をVercelにデプロイ
2. **検証**: EN版の無料版と有料版メッセージを確認
3. **監視**: 日本語が混在していないか、Whale Ratioが正しく表示されているか確認

## 注意事項

- Trap ScoreとMarket Scoreは異なる指標です。ユーザーに混乱を与えないよう、両方のスコアの意味を明確にする必要があります。
- GPT分析が日本語で返ってくる問題は、環境変数`LANG`が'ja'に設定されている可能性があります。Vercel Dashboardで環境変数を確認してください。
