# Cron ジョブ精査（kiba-5min / refresh-chain-raid-mv / 72h-master-plan / x-metrics-fetcher）

## 1. `/api/kiba-5min` — 5分周期

### 役割
- **CQ（CryptoQuant）を 5 分ごとに取得**し、`cq:latest` として KV に保存。
- **KIBA エンジン**を実行: CQ ベースで異常スコア（kibaScore ≥ 40）を検知したときだけ **Grok** を呼び、総合判定。
- **発火時**: Telegram で 6 言語アラート送信（`ENABLE_KIBA` / `ENABLE_TELEGRAM` が有効な場合）。

### 依存関係
- **書き出し**: `cq:latest`（KV）
- **参照元**:
  - **`api/cron.js`**: 15 分ごとのメイン cron で `getCqLatest(kv, 15*60*1000)` を参照し、CQ API の二重取得を避けている。kiba-5min が動いていないと cron は毎回 `getCQDeepMetrics` を叩く。
  - その他: `build-chain-post-with-cq.js` など（スクリプト利用）。

### コスト・負荷
- 5 分ごと: CQ API 呼び出し 1 回。異常時のみ Grok API。
- CryptoQuant のレート制限・Grok の呼び出し回数に依存。

### 結論
- **維持推奨**。cron の CQ 取得の単一ソースになっており、KIBA アラートもこの Cron に依存している。
- 負荷を下げたい場合は「15 分周期」への変更は可能（cron が 15 分なので、そのタイミングに合わせる形）。

---

## 2. `/api/refresh-chain-raid-mv` — 5分周期

### 役割
- Supabase の **Materialized View を更新**: `refresh_chain_raid_mvs()` RPC を実行（`mv_lang_ctr_realtime` 等を REFRESH）。
- **言語別 CTR**（`mv_lang_ctr_realtime` の `lang`, `avg_ctr`）を読んで、**低 CTR 言語のペナルティ**を算出し、**KV `chain_raid:lang_penalty`** に書き込む（TTL 1h）。  
  - 例: avg_ctr ≥ 15% → 1.0、≥ 8% → 0.7、それ以外 → 0.4。

### 依存関係
- **書き出し**: KV `chain_raid:lang_penalty`（言語別 0.4 / 0.7 / 1.0）。
- **参照元**:
  - **`utils/langPenalty.js`** → `getLangPenalty()` / `getPenaltyForLang(lang)`。
  - **`services/scheduler/peakClusterScheduler.js`**: `getLangPenalty()` でペナルティマップを取得し、**スロットの weight 計算**（ピーク×金クラスタ×penalty）に使用。
  - **BuzzWeave**: `buzzWeaveEngine.js` が `sortSlotsByWeight`（peakClusterScheduler）を使う。**PQT-only（リプライ）運用でも、言語別の重み付けに lang_penalty が効く**。
  - **autonomousSlotGenerator.js**: `computeQueueWeightForSlot` で同様に penalty を参照。

### 結論
- **維持推奨**。リプライ運用でも「低 CTR 言語の投稿頻度抑制」に使われている。
- 更新頻度は「5 分」でなくてもよく、**15 分や 30 分**に緩和することは可能（CTR は急激には変わらない）。

---

## 3. `/api/72h-master-plan` — 6時間周期

### 役割
- **72h ナラティブローテ**（FOMO → ATH → CRASH）のインデックスを 6h ごとに 1 つ進め、**KV `chain_raid:72h_narrative_index`** に保存（TTL 24h）。
- レスポンスで `narrative` / `prevNarrative` / `index` を返す。

### 依存関係
- **書き出し**: KV `chain_raid:72h_narrative_index`（0 / 1 / 2 のいずれか）。
- **参照元**: **なし**。コードベース内でこの KV キーを読んでいる箇所は **72h-master-plan.js 自身のみ**（前回インデックス取得のため）。
- **設計変更**: `services/td/autonomousSlotGenerator.js` に「**v5.5: ナラティブは市場スナップショットから直接判定（72hローテーションを廃止）**」と明記されている。ナラティブは `narrativeDetector.js`（市場スナップショット）で決める方式に移行済み。

### 結論
- **削除してよい**。どの処理も `chain_raid:72h_narrative_index` を参照しておらず、72h ローテーションは廃止済み。Cron を止めても影響なし。

---

## 4. `/api/x-metrics-fetcher` — 5分周期

### 役割
- **tweet_queue**（未処理最大 50 件）を取得し、X API `GET /2/tweets/:id` で **public_metrics**（インプレッション・いいね・RT・引用・リプライ等）を取得。
- 結果を **tweet_metrics** に保存し、**chain_raid_post_kpi** の該当行を `updateChainRaidPostKpiWithMetrics` で更新。
- 処理済みは `markQueueProcessed` でマーク。

### データの流れ
- **tweet_queue への投入**: **`api/x-webhook.js`** のみ。X Developer の **Account Activity API（Webhook）** で「自アカウントのツイート作成」イベント（`tweet_create_events`）を受信したときに、その tweet_id を `insertTweetQueue` でキューに積む。
- つまり「**Webhook で自投稿イベントを受けている場合**」にだけ、tweet_queue にレコードが入り、x-metrics-fetcher がそれを処理する。

### 他との役割分担
- **buzzweave-metrics-poll**（15 分周期）: **buzzweave_post_log** の「メトリクス未取得」行に対して X API で metrics を取得し、同テーブルを更新。**BuzzWeave リプライ投稿**用のメトリクス収集。
- **x-metrics-fetcher**: **tweet_queue → tweet_metrics / chain_raid_post_kpi**。Webhook 経由で入ってきた「自投稿」全般（リプライに限らない）のメトリクス収集。

### 結論
- **Webhook で自アカウントの tweet_create を受けているか**で判断するとよい。
  - **受けている**: 自投稿の実測（インプレ・CTR 等）を取るなら **維持**。5 分でなく **15 分**にしても運用上は問題ないことが多い。
  - **受けていない**: tweet_queue は常に空なので、x-metrics-fetcher は毎回 `processed: 0` で終わる。**Cron から外す**か、**無効化**（例: 環境変数でスキップ）してよい。
- 現状が「BuzzWeave リプライのみ」で、そのメトリクスは buzzweave-metrics-poll に任せているなら、**x-metrics-fetcher は Webhook 利用時のみ意味がある**。

---

## まとめ

| Cron | 周期 | 推奨 | 備考 |
|------|------|------|------|
| **kiba-5min** | 5分 | 維持 | cron の CQ 単一ソース＋KIBA アラート。負荷削減なら 15 分も可。 |
| **refresh-chain-raid-mv** | 5分 | 維持 | lang_penalty → BuzzWeave の言語重み。15〜30 分への緩和は可。 |
| **72h-master-plan** | 6時間 | **削除可** | 参照元なし。72h ローテ廃止済み。 |
| **x-metrics-fetcher** | 5分 | **Cron 削除済** | リプライのみ運用のため不要。tweet_queue は Webhook 経由でのみ投入される。 |
