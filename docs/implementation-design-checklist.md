# 実装設計チェックリスト

## 設計（バッチリ）

| 項目 | 状態 | 根拠 |
|------|------|------|
| 3本パイプラインの役割分担 | ✅ | Trap→GPT, X+バグ→Grok, SoSoValue風→Gemini で整理済み |
| CQ必要データの最小セット | ✅ | inflow, mpi, whaleRatio の3取得で足りる（doc: cryptoquant-minimal-data-for-3-pipelines.md） |
| 高解像度CQの位置づけ | ✅ | 必須ではなくオーバースペックと明文化済み |
| 無料版Minimalの配信経路 | ✅ | 専用Cron（/api/x-post-minimal-version）で確実配信 |
| 引用リポストのタイムアウト対策 | ✅ | 1回8人 cap・55s・早期リターン3s で設計済み |

---

## 実装の反映状況

| 項目 | 状態 | 備考 |
|------|------|------|
| **cron の CQ 取得** | ✅ 反映済み | 定期枠で `getHighResolutionCQData` を廃止。`getCQDeepMetrics(market, priceOptions)` のみ実行（highResCQ なし）。 |
| **whaleRatio / trapScore** | ✅ 問題なし | getCQDeepMetrics 内部で getWhaleFlows が呼ばれ、cqDeep.whaleFlows.whaleRatio および trapScore が入る。 |
| **300秒タイムアウト** | 緩和 | 高解像度分の 20〜60 秒を削減。完全解消は 6 言語ループの軽量化次第。 |

---

## 実施した変更（推奨案）

1. **api/cron.js**
   - 定期枠（isRegularSlot \|\| force）で **getHighResolutionCQData() を呼ばない**。
   - **getCQDeepMetrics(market, priceOptions)** のみ実行（highResCQ を渡さない）。highResCQData は常に null。
   - `getHighResolutionCQData` の require を削除（cron では未使用のため）。

2. **効果**
   - 設計（3本パイプラインに必要な CQ は inflow, mpi, whaleRatio のみ）と実装が一致。
   - 高解像度取得の 20〜60 秒を削減し、300 秒タイムアウトの余裕が増える。

---

## まとめ

- **設計**: 3本パイプライン・最小CQ・高解像度不要で **バッチリ**。
- **実装**: 推奨案を反映済み。定期枠は **getCQDeepMetrics のみ** で trapScore / whaleRatio を取得し、設計と一致している。
