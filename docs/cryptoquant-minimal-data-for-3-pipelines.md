# CryptoQuant 必要データの最小セット（3本パイプライン）

**結論**: 以下の3本に「必要なCQデータだけ」渡せばよく、それ以上はオーバースペック。

| パイプライン | モデル | 必要なCQデータ |
|-------------|--------|----------------|
| Trap分析 | gpt-5-mini-2025-08-07 | **inflow, mpi** ＋ priceUsd, change24h, sentiment（価格・F&Gは別ソース） |
| Xセンチメントとのバグ解析 | grok-4-1-fast-reasoning | **exchangeNetflow(inflow), minerMPI(mpi)** ＋ XはGrokが取得。highResCQ/highResX は省略可 |
| SoSoValue風記事 | gemini-3-flash-preview | **inflow, mpi** ＋ marketData(price, change24h, score, sentiment)。trapScore用に **whaleRatio** があるとよい |

---

## 1. Trap分析 → GPT (gpt-5-mini-2025-08-07)

- **使っているAPI**: `analyzeCryptoQuantData`, `generateCryptoQuantAnalysis`
- **渡しているもの**: `cryptoQuantData`: inflow, mpi, priceUsd, change24h, sentiment
- **CQ由来で必要なのは**: **inflow（Exchange Netflow）, mpi（Miner Position Index）** のみ。priceUsd / change24h / sentiment は価格API・F&Gで取得済みでよい。
- **不要**: 高解像度、深掘り時系列、Whale Ratio（GPTのトラップ判定プロンプトは inflow/mpi ベースで完結可能。trapScoreの「表示値」だけ別で欲しければ whaleRatio 1本で可）

---

## 2. Xセンチメントとのバグ解析 → Grok (grok-4-1-fast-reasoning)

- **使っているAPI**: `analyzeXSentimentHighResolutionCompat`（X側）, `detectTrapDetection`（CQ＋Xのバグ/トラップ）
- **detectTrapDetection の引数**: exchangeNetflow, minerMPI, whaleBias, retailFomo, priceChange24h, highResCQ, highResX
- **CQ由来で必要なのは**: **exchangeNetflow (= inflow), minerMPI (= mpi)**。whaleBias / retailFomo は Grok の X 解析結果。priceChange24h は価格API。
- **不要**: **highResCQ, highResX** は「あればトレンド転換の兆候を足す」だけで、省略すると基本の inflow/mpi ＋ X でバグ・トラップ検出は動作する（前回整理のとおり）。
- trapScore を「数値」として使う場合は、**whaleRatio** を 1 本取って trapScore 計算に使う程度で十分。

---

## 3. SoSoValue風記事 → Gemini (gemini-3-flash-preview)

- **使っているAPI**: `produceShow`（showProducer）
- **渡しているもの**: marketData（price, change_24h, market_score, sentiment, inflow, mpi）, cryptoQuantData（cqDeep）, trapDetection, psychologicalSupport, gptMentalTrainerAnalysis
- **CQ由来で必要なのは**: **inflow, mpi** と、trapScore 表示用の **whaleRatio**（cqDeep の代わりに「trapScore + whaleRatio」だけ渡す形でも可）。
- **不要**: 高解像度、複数時間窓、NUPL/SOPR など深掘り指標は SoSoValue 風の短い記事では必須ではない。

---

## CryptoQuant で「取るべき最小セット」

| 取得 | 用途 |
|------|------|
| **getExchangeInflow()** | inflow → GPT / Grok / Gemini の3本すべて |
| **getMinerPositionIndex()** | mpi → GPT / Grok / Gemini の3本すべて |
| **getWhaleFlows()** | whaleRatio → trapScore 計算＆メッセージ／Gemini用 |

この **3 API 呼び出し** で 3 本すべてに必要な CQ データを賄える。

- **getHighResolutionCQData()** → 不要（オーバースペック）
- **getCQDeepMetrics()** の「高解像度渡しての再利用」→ 不要。trapScore だけ欲しければ whaleRatio から簡易計算するか、getCQDeepMetrics を **highResCQ なし** で 1 回呼ぶ（内部で getWhaleFlows される）で十分。

---

## まとめ

- **Trap分析（GPT）**: CQ は **inflow, mpi** だけでよい。
- **Xセンチメント＋バグ解析（Grok）**: CQ は **inflow, mpi**。高解像度は省略可。
- **SoSoValue風記事（Gemini）**: **inflow, mpi** と **whaleRatio**（trapScore 用）があればよい。

→ **CryptoQuant からは「inflow / mpi / whaleRatio」の 3 つを渡してやればよく、それ以上はオーバースペック。**
