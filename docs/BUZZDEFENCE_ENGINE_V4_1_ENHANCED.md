# BuzzDefence Engine v4.1 Enhanced Spec（CSO 反映版）

v4.1 Spec に CSO レビュー改善提案を追加。Cursor は v4.1 Spec + 本差分を統合して実装。

---

## 1. Python 強化（kiba_chain_integration.py）

### 1-1. CQ フェッチ耐性

- `fetch_cq_btc()`: try/except で囲み、失敗時は `oi_spike=False`, `whale_inflow=False`, `long_short_ratio=1.0` を返す
- タイムアウト: 環境変数 `CQ_FETCH_TIMEOUT`（デフォルト 5 秒）

### 1-2. 動的 2SD 閾値

- `compute_dynamic_oi_threshold(data)`: `open_interest_history_24h` から平均・分散を算出し、avg + 2*SD を閾値に
- 履歴が 10 件未満の場合は `current_oi * 1.2` をフォールバック

### 1-3. kiba_chain_fusion 出力

```python
{
  "psychology_tag": "CHAIN_RAID" | "BOTNET" | ...,
  "fusion_score": 0.0 ~ 1.0,
  "chain_data": { "oi_spike", "whale_inflow", "long_short_ratio" }
}
```

- trap_score > 0.8 で psychology_tag = CHAIN_RAID

---

## 2. StructuredPost / KPI 拡張

### 2-1. StructuredPost 追加フィールド

- `chain_data`: { oi_spike, whale_inflow, long_short_ratio, graph_url? }
- `fusion_score`: number
- `averted_loss_est`: number（将来: ユーザー報告から推定）

### 2-2. ログ拡張

- `insertBuzzweavePostLog`: slot_mode=`v4_chain` または `v4.1_chain`
- 将来: `insertXPost` に `chain_data` JSON カラム追加可能

---

## 3. JS ビジュアル自動生成フック

### 3-1. GIF 生成（プレースホルダ）

```js
// Python 側で matplotlib → GIF 生成済み URL を渡す
// もしくは chart service に POST して URL を受け取る
// 現状: chainData.graph_url をそのまま使用
```

- `buildMediaConfig(visualPayload, chainData)`: chainData.graph_url があれば `{ type: "gif", url }` を返す

---

## 4. 環境変数

| 変数 | 説明 | デフォルト |
|------|------|------------|
| `CQ_API_KEY` / `CRYPTOQUANT_API_KEY` | CryptoQuant API キー | （未設定時はモック） |
| `CQ_API_BASE` | API ベース URL | https://api.cryptoquant.com/v1 |
| `CQ_FETCH_TIMEOUT` | フェッチタイムアウト秒 | 5 |

※ オンチェーンデータは CQ（CryptoQuant）のみ。CQ API のレスポンス形式は要確認。

---

*本 Enhanced Spec は v4.1 実装の耐性・KPI・ビジュアルを強化する差分である。*
