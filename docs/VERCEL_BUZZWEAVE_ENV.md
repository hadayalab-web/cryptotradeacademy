# Vercel で BuzzWeave / 引用リポストを動かすための環境変数

**重要**: Vercel では `.env` はリポジトリに含めない前提のため、**必要な環境変数は Vercel ダッシュボードの「Environment Variables」に手動で追加**する必要があります。

---

## 1. 現状の .env で BuzzWeave 関連のもの

| 変数 | 役割 |
|------|------|
| `AUTONOMOUS_SLOT_MODE` | 自律スロットモード（true で有効） |
| `BUZZWEAVE_DAILY_PQT_TARGET` | 1日の PQT 投稿目標数（例: 250） |
| `QUOTE_REPOST_USE_MINIMAL_REGULAR_TEMPLATES` | 引用リポストのテンプレ種別 |
| `QUOTE_REPOST_TURBO_MODE` | 引用リポストのターボモード |

上記は **Vercel にも同じ名前・同じ値で設定**しておくと、Cron で `buzzweave-run` が動くときに正しく参照されます。

---

## 2. 「刺さるターゲット + インプレ伸びるロジック」を有効にする追加設定

コード上は **品質スコア選定** を有効にしないと、以下のロジックは動きません。

- コピー適合 (copy fit) によるランキング
- インプレ足切り（velocity / topic fit / copy fit の閾値）

**Vercel に追加を推奨する環境変数:**

| 変数 | 推奨値 | 説明 |
|------|--------|------|
| **BUZZWEAVE_USE_QUALITY_SCORE_SELECTION** | `true` | 品質スコア選定を有効にする（必須）。未設定のままだと Fisherman 選定のまま。 |
| **BUZZWEAVE_IMPRESSION_FILTER** | （未設定でOK） | 品質スコア時はデフォルトでインプレ足切り有効。無効にしたいときだけ `false`。 |
| **BUZZWEAVE_MIN_VELOCITY** | `0` または `15` | 最小 velocity（0=足切りなし）。インプレを厳格にしたいときは 15 など。 |
| **BUZZWEAVE_MIN_TOPIC_FIT** | `0` または `0.2` | 最小 topic fit 0..1。 |
| **BUZZWEAVE_MIN_COPY_FIT** | `0` または `0.15` | 最小 copy fit 0..1。 |

まずは **BUZZWEAVE_USE_QUALITY_SCORE_SELECTION=true** だけ Vercel に追加すれば、刺さるターゲット＋インプレ足切り（閾値は 0 なので「ランキングのみ」）が有効になります。  
その後、`buzzweave_post_log` の our_impressions を見ながら、必要なら MIN_VELOCITY / MIN_TOPIC_FIT / MIN_COPY_FIT を設定してください。

---

## 3. その他 BuzzWeave で参照される主な環境変数（未設定時はコード内デフォルト）

Cron が期待どおり動くために、必要に応じて Vercel に追加してください。

| 変数 | 主なデフォルト | 用途 |
|------|----------------|------|
| BUZZWEAVE_PQT_ONLY | 未設定 | true で PQT 専用モード |
| BUZZWEAVE_MAX_CANDIDATES | 50 | スロット選定に渡す候補の最大数 |
| BUZZWEAVE_RISING_WINDOW_MAX_SEC | 420（7分） | 品質スコア選定時の rising 窓（秒） |
| BUZZWEAVE_VOLUME_TOPUP | 有効 | false/0 でトップアップ無効 |
| BUZZWEAVE_FALLBACK_FILL_CAP | 無効 | true で Fisherman=0 時 cap まで fallback |
| **BUZZWEAVE_IMPRESSION_BOOST** | `0.6` | シンプル選定で impressionScore の効かせ方（0〜2）。高インプレに乗せる強さ。 |
| **BUZZWEAVE_CTR_BOOST** | `0.4` | シンプル選定で copyFit の効かせ方（0〜2）。刺さる投稿を優先して CTR 向上。 |
| **BUZZWEAVE_USE_LANG_SPECIFIC_CAP** | 未設定 | `true`/`1` で言語別投稿数最適化。EN 40%・ES 20%・PT 15%・AR 10%・KO 8%・JA 7%（mlPqtScheduleConfig）で 1 run あたりの cap を設定。 |
| BUZZWEAVE_EMERGENCY_STOP | 未設定 | true で buzzweave-run 即停止 |

X API・Supabase・KV など、引用リポスト以外で使っている変数も、Vercel の Environment Variables に同じように設定してください（本ドキュメントでは省略）。

---

## 4. 設定手順（Vercel）

1. Vercel ダッシュボード → 対象プロジェクト → **Settings** → **Environment Variables**
2. 上記の **Name** と **Value** を追加（Production / Preview / Development は必要に応じて選択）
3. 再デプロイ、または次回の Cron 実行で反映
