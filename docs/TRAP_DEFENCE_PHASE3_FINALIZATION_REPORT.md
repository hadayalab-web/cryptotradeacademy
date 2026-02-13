# Trap Defence Phase 3 Finalization 実装完了報告

**作成日**: 2026-02-13  
**ステータス**: Phase 3 Finalization 一部完了（Task 7 完了、Tasks 8–13 は未着手）

---

## 1. 実装サマリー

Phase 3 Finalization（Tasks 7–13）のうち、**Task 7** を完了した。formatRegularBriefing を snapshot-native 化し、6 言語（en, es, pt-br, ar, ja, ko）で `formatRegularBriefing(snapshot, lang, opts)` を実装した。Q1–Q6 の正式回答に基づき進捗した。cron は引き続きレガシーペイロードを渡すが、後方互換により動作する。

---

## 2. Q1–Q6 正式回答の反映状況

| # | 回答 | 実装反映 |
|---|------|----------|
| Q1 | diagnoseUserSentimentCompat に snapshot オーバーロード追加 | Task 10 で実施予定 |
| Q2 | nonUserImpactReport / missedOpportunities は opts で渡す | formatRegularBriefing の opts で受け付け可能 |
| Q3 | Gemini Stage 5 は EN 固定で 1 回 | Task 8 で実施予定 |
| Q4 | Dr.Grok base は EN 固定で 1 回 | Task 9 で実施予定 |
| Q5 | Stage 5/6 は deliveryMode に関係なく常に実行 | Task 10 で実施予定 |
| Q6 | Email アダプタは utils/snapshotToRegularEmailPayload.js に切り出す | Task 10 で実施予定 |

---

## 3. 実施した変更（Task 7）

### 3.1 formatRegularBriefing(snapshot, lang, opts) — 6 言語

| ファイル | 変更内容 |
|----------|----------|
| `services/telegram/messages/user/en/regular.en.js` | extractPayloadFromSnapshot、formatRegularBriefing(snapshotOrPayload, lang, opts)、formatRegularBriefingCore を追加。snapshot から raw, cqDeep, market_score, trapDetection 等を抽出して Core に渡す。 |
| `services/telegram/messages/user/es/regular.es.js` | 同上、ES 文言 |
| `services/telegram/messages/user/pt-br/regular.pt-br.js` | 同上、PT-BR |
| `services/telegram/messages/user/ar/regular.ar.js` | 同上、AR |
| `services/telegram/messages/user/ja/regular.ja.js` | 同上、JA |
| `services/telegram/messages/user/ko/regular.ko.js` | 同上、KO |

### 3.2 新シグネチャ

```js
formatRegularBriefing(snapshotOrPayload, lang, opts)
```

- **snapshotOrPayload**: btcSnapshot（`.raw` あり）またはレガシーペイロード（後方互換）
- **lang**: en, es, pt-br, ar, ja, ko
- **opts**: `{ psychologicalSupport, nonUserImpactReport, missedOpportunities, grokXAnalysis, marketBug }`

### 3.3  snapshot からの抽出フィールド

| フィールド | 導出元 |
|------------|--------|
| now | snapshot.as_of_utc |
| inflow, mpi, priceUsd, change24h, sentimentLabel | snapshot.raw |
| score | snapshot.market_score |
| tradeSignal | snapshot.tradeSignal |
| trap | snapshot.trapDetection から導出 |
| aiAnalysis | snapshot.drGrok?.base ?? snapshot.gptStructureReasoning |
| trapScore, whaleFlows, liquidations, riskReward, nupl, sopr30d, kimchiPremium, upbitPrice | snapshot.cqDeep |
| trapDetection, trapAlert, divergenceSignal | snapshot |
| psychologicalSupport, grokXAnalysis | opts |
| sosovalueArticle | snapshot.sosovalueArticle |
| gptReporterAnalysis | snapshot.gptStructureReasoning |

### 3.4 後方互換

第 1 引数がレガシーペイロード（`.raw` なし）の場合、`formatRegularBriefingCore(payload)` を直接呼び出し。Task 10 で cron を snapshot 渡しに更新するまで、既存動作を維持。

### 3.5 計画書の更新

| ファイル | 変更内容 |
|----------|----------|
| `docs/TRAP_DEFENCE_PHASE3_FINALIZATION_PLAN.md` | Q1–Q6 の正式回答をセクション 9 に追記 |

---

## 4. 変更ファイル一覧（Task 7）

| ファイル | 種別 |
|----------|------|
| `services/telegram/messages/user/en/regular.en.js` | 拡張 |
| `services/telegram/messages/user/es/regular.es.js` | 拡張 |
| `services/telegram/messages/user/pt-br/regular.pt-br.js` | 拡張 |
| `services/telegram/messages/user/ar/regular.ar.js` | 拡張 |
| `services/telegram/messages/user/ja/regular.ja.js` | 拡張 |
| `services/telegram/messages/user/ko/regular.ko.js` | 拡張 |
| `docs/TRAP_DEFENCE_PHASE3_FINALIZATION_PLAN.md` | 更新 |

---

## 5. Phase 3 全体の進捗

### 完了済み

| フェーズ | タスク | 内容 |
|----------|--------|------|
| 前半 | 1–6 | btcSnapshot 拡張、computeDivergenceSignal、computeMarketRegime、trapDetection 強化、formatMinimalBriefing、formatTrapAlertFromSnapshot、minimal-tg-delivery、cron Emergency |
| 後半 | 7 | formatRegularBriefing snapshot-native 化（6 言語） |

### 残タスク（Phase 3 Finalization）

| 順序 | タスク | 状態 |
|------|--------|------|
| 8 | Stage 5 (Gemini) snapshotBuilder 統合 | 未着手 |
| 9 | Stage 6 (Dr.Grok base) snapshotBuilder 統合 | 未着手 |
| 10 | cron.js パイプライン再構成 | 未着手 |
| 11 | BWE deep snapshot alignment | 未着手 |
| 12 | アーキテクチャドキュメント更新 | 未着手 |
| 13 | scripts モック snapshot 更新 | 未着手 |

---

## 6. データフロー（Task 7 完了後の Regular）

```
cron Regular dispatch（現状）:
  formatRegularBriefing(legacyPayload)  ← 後方互換で formatRegularBriefingCore を呼び出し

cron Regular dispatch（Task 10 完了後）:
  psychologicalSupport = diagnoseUserSentimentCompat(snapshot, targetLang)
  formatRegularBriefing(btcSnapshot, targetLang, { psychologicalSupport, nonUserImpactReport, missedOpportunities })
```

---

## 7. 検証方法

### 7.1 単体

- モック btcSnapshot を `formatRegularBriefing(snapshot, 'en', { psychologicalSupport: mockPS })` に渡し、期待フォーマットの出力になることを確認。
- レガシーペイロードを `formatRegularBriefing(legacyPayload)` に渡し、従来通り出力されることを確認（後方互換）。

### 7.2 統合

- cron Regular 配信: 現状のレガシーペイロード渡しで問題なく動作すること。
- Task 10 完了後: snapshot 渡しで `formatRegularBriefing(btcSnapshot, targetLang, opts)` が呼ばれること。

---

## 8. 注意点

- **cron 連携**: Task 10 で cron を `formatRegularBriefing(btcSnapshot, targetLang, opts)` に切り替えるまで、レガシーペイロードが使われる。
- **diagnoseUserSentimentCompat**: Task 10 で `(snapshot, lang)` オーバーロードを追加する必要あり。
- **Email**: Phase 4 で snapshot-native 化予定。Task 10 では `utils/snapshotToRegularEmailPayload.js` アダプタを導入。
