# Trap Defence OS v4.3 / v4.4 / v4.5 仕様

## v4.3 — BotNet × CTR 相関

### データ構造
- **StructuredPost**: botnet_cluster_id, botnet_density, botnet_coherence
- **chain_raid_post_kpi**: 上記カラム追加。**cluster_id = botnet_cluster_id**（KPI ログは BotNet クラスタ ID を保持）
- **botnet_density / botnet_coherence**: **スケール 0〜1** に固定。閾値 0.7 と整合
- **view_cluster_ctr_stats**: avg_er, avg_botnet_density, **corr_botnet_ctr** — **生データ**（chain_raid_post_kpi の行）を cluster_id で GROUP BY したうえで、グループ内で `CORR(botnet_density, ctr)` を計算。集計後の avg 同士の相関ではない
- **view_cluster_corr**: 金クラスタ判定用

### 金クラスタ条件
- corr_botnet_ctr > 0.7
- avg_ctr > 0.08
- cluster_size >= 20

### 運用
- `getGoldClusters()` で金クラスタ一覧取得
- corr_botnet_ctr <= 0.7 のクラスタは優先度低

---

## v4.4 — 釣り師収益モデル逆算

### データ構造
- **chain_raid_post_kpi**: narrative_tag, asset_class, market_volatility
- **view_narrative_ctr_stats**: ナラティブ × CTR × 資産クラス
- **view_narrative_revenue_est**: revenue_est = ctr × subs × volatility。**volatility は 0〜1 正規化を推奨**（スケールが曖昧だと revenue_est が暴れる）

### market_volatility 定義
- **推奨**: 直近 5 分 or 1h の価格変化率を **0〜1 に正規化**。CQ の OI/whale/inflow の合成でも可だが、スケールを仕様で固定すること。

### ナラティブ分類
- カテゴリ: FOMO, FUD, ATH, CRASH, REVERSAL, SCAM, HYPE, EXIT
- **_infer_narrative_tag 分類ルール（仕様）**:
  - raid + burst ≥ 50 → FOMO
  - burst ≥ 30 → HYPE
  - 上記以外 → NEUTRAL（または CRASH/FUD は別条件で付与）
- Grok 連携で差し替え可能

---

## v4.5 — 提灯心理モデル

### ビュー
- **view_lang_psych_sensitivity**: corr_poll_fusion, corr_poll_burst。**相関は poll_ratio = poll_yes / (poll_yes + poll_no)** を chain_raid_post_kpi の生データで fusion_score / burst_factor と CORR する
- **view_lang_psych_matrix**: 言語 × narrative_tag × CTR/ER

### psych_type 優先順位（BuzzWeave が迷わないよう仕様で固定）
- ポジティブ系: **FOMO > ATH > HYPE**
- ネガティブ系: **FUD > CRASH > EXIT**

### CTA 切り替え条件（仕様）
- `narrative_tag in ['FOMO','ATH']` かつ `corr_poll_fusion > 0.3` → **FOMO_RIDE**
- `narrative_tag in ['FUD','CRASH']` かつ `corr_poll_burst > 0.3` → **FUD_ESCAPE**
- 上記以外は既存 CTA
- CHOICE_CTA_BY_TAG に FOMO_RIDE, FUD_ESCAPE 追加

---

## 実装順序
1. `docs/supabase-chain-raid-kpi-v4.3-v4.4-v4.5.sql` を実行
2. **refresh_chain_raid_mvs が更新する MV 一覧**:
   - mv_lang_ctr_realtime
   - mv_cluster_ctr_stats
   - mv_cluster_corr
   - mv_narrative_ctr_stats
   - mv_narrative_revenue_est
   - mv_lang_psych_sensitivity
   - mv_lang_psych_matrix
