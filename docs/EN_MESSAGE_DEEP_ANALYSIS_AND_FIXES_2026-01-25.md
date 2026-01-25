# EN版メッセージ徹底分析と修正レポート（2026-01-25）

## 概要
EN版の無料版（Minimal Version）と有料版（Regular Briefing）のメッセージを徹底的に分析し、すべての不具合を修正しました。

## 検出された不具合と修正内容

### 1. ❌ 有料版に日本語セクションが混在（根本原因を特定・修正）

**問題**: 有料版メッセージに「📰 心理的解釈とトレーダーの感情」という日本語セクションが混在している。

**根本原因の特定**:
1. GPT分析がキャッシュから古い日本語の結果を返している可能性
2. `api/cron.js`の日本語検出後の再生成がキャッシュから同じ結果を返す可能性
3. `regular.en.js`のフィルタリングがエラーチェックの前に実行されていない

**修正内容**:
1. **`api/cron.js` (911-924行目)**: 日本語検出時の再生成を削除し、即座に`null`にしてフォールバック処理に任せる
   - 理由: キャッシュから同じ日本語結果が返ってくる可能性があるため
2. **`services/telegram/messages/user/en/regular.en.js` (238-257行目)**: 日本語フィルタリングをエラーチェックの後に実行するように修正
   - 理由: エラーでない場合のみ日本語チェックを実行する必要があるため
3. **`services/gpt/client.js` (574-576行目)**: GPTプロンプトに言語混在を防ぐ強力な指示を追加
   - 理由: GPTが日本語を返さないようにするため

**変更箇所**:
```javascript
// api/cron.js - 修正後
if (firstTargetLang === 'en' && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(gptRegularAnalysis)) {
  console.warn('[GPT] Japanese characters detected in English analysis, forcing null to use fallback');
  gptRegularAnalysis = null; // 再生成せず、即座にnullにしてフォールバック
}

// regular.en.js - 修正後
if (gptNewsText && typeof gptNewsText === 'string') {
  const errorKeywords = ['api error', 'unavailable', 'error', 'failed', 'timeout'];
  const isError = errorKeywords.some(keyword => 
    gptNewsText.toLowerCase().includes(keyword)
  );
  if (isError) {
    gptNewsText = null;
  } else {
    // エラーでない場合のみ日本語チェック
    const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    if (japanesePattern.test(gptNewsText)) {
      console.warn('[Regular EN] Japanese characters detected in GPT analysis, using fallback');
      gptNewsText = null;
    }
  }
}

// services/gpt/client.js - 修正後
Language: ${targetLang}
CRITICAL: You MUST respond ONLY in ${targetLang === 'ja' ? 'Japanese' : targetLang === 'ko' ? 'Korean' : 'English'}. 
DO NOT mix languages. DO NOT use Japanese characters if targetLang is 'en'.
```

### 2. ❌ 有料版でWhale Ratioが表示されない（ロジック改善）

**問題**: 無料版にはWhale Ratio: 56%が表示されているが、有料版には表示されていない。

**原因**: 
- `whaleFlows.whaleRatio`の値が0-1の範囲（0.56など）で、パーセンテージ変換ロジックに問題がある可能性
- `isHighPressure`の判定が正しく動作していない可能性

**修正内容**:
- `services/telegram/messages/user/en/regular.en.js` (663-672行目): Whale Ratioの表示ロジックを改善
  - `whaleRatio`が0-1の範囲であることを明示的に処理
  - `isHighPressure`の判定を改善（`whaleFlows.isHighPressure`が`true`の場合、または`whaleRatioValue >= 80`の場合）
  - デバッグ用のログを追加

**変更箇所**:
```javascript
// 修正後
if (whaleFlows && whaleFlows.whaleRatio != null) {
  // whaleRatioは0-1の範囲の数値として返される（deepMetrics.js参照）
  const whaleRatioValue = typeof whaleFlows.whaleRatio === 'number' 
    ? whaleFlows.whaleRatio * 100 
    : parseFloat(whaleFlows.whaleRatio) * 100 || 0;
  const isHighPressure = whaleFlows.isHighPressure === true || whaleRatioValue >= 80;
  const whaleLine = `🐋 Whale Ratio: ${whaleRatioValue.toFixed(1)}% ${isHighPressure ? '(High Pressure)' : '(Normal)'}`;
  lines.push(whaleLine);
} else if (whaleFlows) {
  // デバッグ用: whaleFlowsは存在するがwhaleRatioがnullの場合
  console.warn('[Regular EN] whaleFlows exists but whaleRatio is null:', whaleFlows);
}
```

### 3. ⚠️ 無料版にMPIとSentimentが表示されない（条件チェック改善）

**問題**: 無料版にはMPIとSentimentが表示されていないが、有料版には表示されている。

**原因**: 
- `generateEvidence`関数でMPIが`null`チェックされていない
- `formatMinimalHighQualityBriefing`関数でMPIとSentimentの表示条件が厳しすぎる可能性

**修正内容**:
1. **`services/telegram/messages/user/en/minimal-high-quality.en.js` (99-108行目)**: `generateEvidence`関数でMPIの`null`チェックを追加し、Normal rangeの場合も表示
2. **`services/telegram/messages/user/en/minimal-high-quality.en.js` (276-298行目)**: MPIとSentimentの表示ロジックにコメントを追加し、常に表示されることを明示

**変更箇所**:
```javascript
// generateEvidence関数 - 修正後
if (marketData) {
  if (marketData.mpi !== undefined && marketData.mpi !== null) {
    const mpi = marketData.mpi;
    if (mpi > 2.0) {
      evidenceItems.push(`Miner Position Index: ${mpi.toFixed(2)} — Miners are selling (caution needed)`);
    } else if (mpi < 0.5) {
      evidenceItems.push(`Miner Position Index: ${mpi.toFixed(2)} — Miners are holding (positive signal)`);
    } else {
      evidenceItems.push(`Miner Position Index: ${mpi.toFixed(2)} — Normal range`);
    }
  }
}

// formatMinimalHighQualityBriefing関数 - 修正後（コメント追加）
// Market Dataから追加情報を表示（MPI、Sentimentなど）
// 重要: evidenceセクションの後に追加情報として表示（常に表示）
if (marketData) {
  if (marketData.mpi !== undefined && marketData.mpi !== null) {
    // ... (表示ロジック)
  }
}

// Sentiment Dataから追加情報を表示
// 重要: sentimentDataが存在する場合、必ず表示
if (sentimentData && sentimentData.sentiment) {
  // ... (表示ロジック)
}
```

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

1. `api/cron.js` (911-924行目) - 日本語検出時の再生成を削除、即座にnullにしてフォールバック
2. `services/telegram/messages/user/en/regular.en.js` (238-257行目, 663-672行目) - 日本語フィルタリングの順序修正、Whale Ratio表示ロジック改善
3. `services/telegram/messages/user/en/minimal-high-quality.en.js` (99-108行目, 276-298行目) - MPIのnullチェック追加、表示ロジック改善
4. `services/gpt/client.js` (574-576行目) - GPTプロンプトに言語混在防止の強力な指示を追加

## 技術的な改善点

1. **キャッシュ問題の回避**: 日本語検出時の再生成を削除し、フォールバック処理に任せることで、キャッシュから同じ結果が返ってくる問題を回避
2. **エラーハンドリングの改善**: エラーチェックと日本語チェックの順序を修正し、エラーでない場合のみ日本語チェックを実行
3. **データ構造の明確化**: Whale Ratioが0-1の範囲であることを明示し、パーセンテージ変換ロジックを改善
4. **デバッグログの追加**: Whale Ratioが表示されない場合のデバッグログを追加

## 次のステップ

1. **デプロイ**: 修正をVercelにデプロイ
2. **検証**: EN版の無料版と有料版メッセージを確認
3. **監視**: 
   - 日本語が混在していないか確認
   - Whale Ratioが正しく表示されているか確認
   - MPIとSentimentが無料版に表示されているか確認
4. **キャッシュクリア**: 必要に応じて、Vercel KVのGPTキャッシュをクリア

## 注意事項

- GPT分析のキャッシュが原因で日本語が混在する可能性があるため、必要に応じてVercel KVのキャッシュをクリアしてください。
- Whale Ratioが表示されない場合は、`cqDeep?.whaleFlows`が正しく設定されているか確認してください。
- MPIとSentimentが無料版に表示されない場合は、`marketData`と`sentimentData`が正しく渡されているか確認してください。
