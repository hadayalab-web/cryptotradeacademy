# Gemini へのレビュー依頼：KIBA（転換点アラート）実装ロジック

以下の文章をそのまま Gemini に貼り付けて、実装ロジックのレビューを依頼してください。

---

## 依頼文（コピー用）

```

あなたに、当プロダクトの「転換点アラート」（内部コード名: KIBA）の実装ロジックをレビューしてほしいです。ユーザーには「転換点アラート」のみを露出しており、KIBA という名前や内部スコアは一切公開していません。

### 目的

- **ビジネス目的**: 構造転換・流動性異常のシグナルを検知し、条件を満たした場合にのみ、有料会員向けに多言語（6言語）の Critical Alert を Telegram で配信する。
- **技術目的**: CryptoQuant（CQ）のオンチェーンデータと X（Twitter）センチメントのみを入力とし、Kaiko・orderbook・クラスタ・清算データは使わない。誤検出を抑えつつ、発火時は 1 時間のクールダウンで重複配信を防ぐ。

### 全体フロー

1. **トリガー**: メインの cron が一定間隔で実行され、`ENABLE_KIBA` が有効な場合に `POST /api/kiba/run` を呼ぶ。
2. **入力取得**: KV から `btcSnapshot`（BTC 市況）、必要に応じて NASDAQ / GOLD スナップショットを取得。`lastKibaSnapshot`（直近発火時のスナップショット）も取得。
3. **エンジン実行**: `btcSnapshot` を検知器用入力に正規化 → 6 検知器（flow, whale, sentiment, retail, liquidity, algo）を並列実行 → 各 0〜5 のスコアを重み付き合計 → 0〜100 にスケール → サプレッション条件で最大 30 にキャップ → スコアから level（CRITICAL/HIGH/ELEVATED/NONE）を算出。
4. **発火判定**: `level` が CRITICAL / HIGH / ELEVATED のいずれか **かつ** スコア ≥ 65。さらに「直近 1 時間以内に KIBA が発火していない」ことを確認。両方満たすときのみ発火。
5. **発火時のみ**: スナップショットを KV に保存し、6 言語分のアラート文を生成して `dispatchPayload.alerts` に格納。cron が Telegram に送信。

### 入力マッピング（btcSnapshot → 検知器入力）

- **データソース**: `btcSnapshot.cqDeep`（CQ オンチェーン）、`btcSnapshot.xSentiment`（X センチメント）、`btcSnapshot.raw`（価格・F&G 等）のみ。
- **flow**: netflow（inflow - outflow のフォールバック含む）、mean=0, std=1。
- **whale**: whaleIn = inflow, whaleOut = |outflow|、mean=0, std=1。
- **sentiment**: postVolume, avgVolume、fearScore（F&G 25以下→1、75以上→0、それ以外は (75-fng)/50）。
- **retail**: panicKeywords（または panicRatio）, bullishDrop（または retailBias）。
- **liquidity**: netflowChange=0（将来用）、priceImpact = min(1, |change24h|/10)、volumeSpike = flowTotal から log10 スケールで 0〜1。
- **algo**: flowPriceCorr=0, periodicWhale=0（将来用。現状は常に 0）。
- **サプレッション用メタ**: hasCq（CQ 由来の flow が 1 つでもあるか）、postVolume, avgVolume, change24h、whaleImbalanceNorm = |inflow - outflow| / (flowTotal + 1e-6)。

### 各検知器のロジック（出力はすべて 0〜5）

- **flow**: z = (netflow - mean) / std、出力 = clamp(z, 0, 5)。std=0 のとき 0。
- **whale**: imbalance = |whaleIn - whaleOut|、z = (imbalance - mean) / std、出力 = clamp(z, 0, 5)。
- **sentiment**: volumeDrop = (avgVolume - postVolume) / avgVolume、raw = volumeDrop×0.6 + fearScore×0.4、出力 = clamp(raw×5, 0, 5)。avgVolume≤0 のとき 0。
- **retail**: raw = panicKeywords×0.6 + bullishDrop×0.4、出力 = clamp(raw×5, 0, 5)。
- **liquidity**: raw = netflowChange×0.4 + priceImpact×0.3 + volumeSpike×0.3、出力 = clamp(raw, 0, 5)。
- **algo**: raw = flowPriceCorr×0.7 + periodicWhale×0.3、出力 = clamp(raw×5, 0, 5)。現状は常に 0。

### スコア集約

- **重み（crypto-weighted）**: flow 0.25, whale 0.30, sentiment 0.20, liquidity 0.10, algo 0.10, retail 0.05。
- **式**: 加重合計（0〜5）を ×20 して 0〜100 にスケールし、clamp(0, 100)。

### サプレッション（誤検出抑制）

以下のいずれかを満たす場合、スコアを **min(score, 30)** にキャップする。

1. CQ データなし（!hasCq）
2. avgVolume < 10 または postVolume < 10（X ボリューム不足）
3. |change24h| < 0.5（低ボラティリティ）
4. whaleImbalanceNorm ≤ 0.5（ホエールの偏りが小さい）

→ 発火閾値 65 に届かないようにし、弱いシグナルでの誤配信を防ぐ。

### インパクト評価（スコア → level / intensity）

- 85 以上: CRITICAL, intensity "max"
- 75 以上 85 未満: HIGH, "strong"
- 65 以上 75 未満: ELEVATED, "moderate"
- 65 未満: NONE, "none"

### 発火条件（両方満たすときのみ）

1. level が CRITICAL / HIGH / ELEVATED（＝ スコア ≥ 65 と同値）
2. スコア ≥ 65
3. **時間窓**: 直近の KIBA 発火（lastKibaSnapshot.as_of_utc）から 1 時間未満の場合は発火しない（重複アラート防止）。

### 出力と配信

- 発火時のみ: スナップショット（level, intensity, btcContext, macroContext, as_of_utc）を KV に保存（`kiba:snapshot:latest` および履歴キー `kiba:snapshot:YYYYMMDDHHmm`）。
- 6 言語（en, ja, es, ko, pt-br, ar）のアラート文を `formatCriticalAlert(snapshot, lang)` で生成し、cron が Telegram で送信。
- マクロコンテキスト: NASDAQ / GOLD のスナップショットから nasdaqRegime, goldWhaleBias, macroRiskOnOff を渡し、アラート文に含める。

### 定数一覧

| 名前 | 値 | 用途 |
|------|-----|------|
| SUPPRESSION_WINDOW_MS | 3600000 (1h) | 発火後の再発火を防ぐクールダウン |
| LOW_VOLATILITY_THRESHOLD | 0.5 | \|change24h\| がこれ未満ならスコアを 30 以下にキャップ |
| X_VOLUME_MIN | 10 | postVolume または avgVolume がこれ未満ならスコア 30 キャップ |
| WHALE_SIGMA | 0.5 | whaleImbalanceNorm がこれ以下ならスコア 30 キャップ |
| 発火スコア閾値 | 65 | これ以上かつ level が ELEVATED 以上で発火 |
| CRITICAL 下限 | 85 | スコア 85 以上で level=CRITICAL |
| HIGH 下限 | 75 | スコア 75 以上で level=HIGH |
| ELEVATED 下限 | 65 | スコア 65 以上で level=ELEVATED |

### 補足: BuzzWeave との連携

- 5 分ごとの KIBA 実行（別 API）で、発火の有無にかかわらず `kiba:activity:latest` に { score, level, as_of_utc } を書き込んでいる。
- BuzzWeave（X リプライ投下エンジン）は実行時にこのキーを読み、レスポンスに `kibaActivity` として含める。分析で「リプライ run が KIBA 活発窓と重なったか」を後から検証できる。現時点では cap 増やしや間隔短縮などの自動連携は未実装。

---

### レビューしてほしい点

1. **設計の一貫性**: 入力（CQ + X のみ）→ 6 検知器 → 重み付きスコア → サプレッション → 発火判定 の流れに、論理の飛躍や矛盾はないか。重み（whale 0.30, flow 0.25 等）の根拠は「crypto で流動性・ホエールが効く」という仮説でよいか。
2. **閾値の妥当性**: 発火 65、CRITICAL 85、HIGH 75、およびサプレッションの 0.5 / 10 / 0.5 は、誤検出（false positive）と見逃し（false negative）のバランスとして妥当か。調整の方向性があれば教えてほしい。
3. **検知器の設計**: flow / whale は z-score 型、sentiment / retail は比率の線形結合。liquidity は priceImpact と volumeSpike を組み合わせている。algo は現状 0。この分割と式に、統計的・行動経済学的な観点で問題や改善案はないか。
4. **時間窓サプレッション**: 1 時間のクールダウンは、トレンド転換が連続して起きる場合に「2 本目を出さない」リスクがある。1h で妥当か、あるいはレベルに応じた差し替え（CRITICAL のみ短くする等）の必要性はあるか。
5. **その他**: 多言語配信のタイミング、マクロコンテキストの扱い、将来の多アセット（BTC 以外）拡張時の注意点など、気づいた点があれば挙げてほしい。

出力形式の希望:
- 各項目に対して簡潔に所見と、修正を推奨する場合は「現状 → 推奨」または具体的な値・式を記載。
- 最後に「総評」（2〜3 文）で、実装の強みと注意点をまとめてほしい。
```

---

## 使い方

1. 上記の「依頼文（コピー用）」の \`\`\` … \`\`\` で囲まれたブロック全体をコピーする。
2. Gemini のチャットに貼り付けて送信する。
3. 必要に応じて、`docs/KIBA_IMPLEMENTATION_LOGIC.md` や `docs/KIBA_IMPLEMENTATION_SUMMARY.md` を参照用として追記できる。

## レビュー反映（Gemini 推奨の実装済み内容）

- **重み**: Algo 未実装の間は algo 0.10 を liquidity に振り、liquidity 0.20 / algo 0 に変更（`kiba_score.js`）。
- **サプレッション**: `WHALE_SIGMA` を 0.5 → 0.4 に変更（`kiba_engine.js`）。
- **Liquidity priceImpact**: `raw.change5min`（または `raw.change_5m`）があれば `min(1, |change5min|×20)`、なければ従来どおり `min(1, |change24h|/10)`（`kiba_engine.js`）。5 分データはパイプラインで未取得の場合は 24h フォールバック。
- **時間窓**: 1h クールダウン中でも、今回の level が前回より高い（CRITICAL > HIGH > ELEVATED）場合は発火する例外を追加（`kiba_engine.js`）。

## 参照ファイル（実装）

| ファイル | 役割 |
|----------|------|
| `api/kiba/run.js` | エントリ・認証・KV 読み・runKibaOnce・dispatchPayload 生成 |
| `core/kiba/kiba_engine.js` | 入力マッピング、6 検知器呼び出し、スコア・サプレッション・時間窓・発火判定 |
| `core/kiba/scoring/kiba_score.js` | 重み付きスコア計算（0〜5 → ×20 → 0〜100） |
| `core/kiba/evaluator/kiba_trigger.js` | スコア → level / intensity |
| `core/kiba/detectors/*.js` | flow, whale, sentiment, retail, liquidity, algo |
| `services/snapshot/kibaSnapshotSchema.js` | KV キー・buildKibaSnapshot |
| `services/snapshot/kibaSnapshotBuilder.js` | スナップショット構築と KV 書き込み |
| `services/ai/gpt5mini.js` | formatCriticalAlert(snapshot, lang) で 6 言語アラート文 |
