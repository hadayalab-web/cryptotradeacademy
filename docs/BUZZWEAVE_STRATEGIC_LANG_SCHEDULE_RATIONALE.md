# 戦略的言語・時間帯配分の根拠

BuzzWeave の **STRATEGIC_UTC_TO_LANG**（UTC 時間→言語の 1 時間単位割り当て）は、**均等配分ではなく**、以下 2 つに基づいて決めている。

---

## 1. Run 数配分の根拠：share_ratio（LANGUAGE_ALLOCATION）

言語別 Run 数は **mlPqtScheduleConfig.js の LANGUAGE_ALLOCATION** の `share_ratio` に従う。

| 言語 | share_ratio | 根拠 |
|------|-------------|------|
| **en** | 0.40 | 英語圏（米国・英国・豪等）のリーチ・成約ボリュームが最大。クリプト投稿・Whop/Vidalytics の主要市場。 |
| **es** | 0.20 | スペイン・LATAM のクリプト盛り上がりとコンバージョン実績。英語に次ぐ優先度。 |
| **pt** | 0.15 | ブラジル中心。クリプト・FX 需要が高く、成約単価・ボリュームを考慮した配分。 |
| **ar** | 0.10 | 中東・北アフリカ。リーチとコンバージョンのバランスで 1 割確保。 |
| **ko** | 0.08 | 韓国はクリプト関心が高いが、言語別 KPI と競合量を踏まえ英語以下に設定。 |
| **ja** | 0.07 | 日本は単価は期待できるが、絶対ボリューム・クリプト投稿密度は他より控えめに設定。 |

**Run 数への変換**: 日次 24 Run を上記比率で配分し、端数は四捨五入で 24 に合わせる。

- 24 × 0.40 → **en 9**
- 24 × 0.20 → **es 5**
- 24 × 0.15 → **pt 4**
- 24 × 0.10 → **ar 2**
- 24 × 0.08 → **ko 2**
- 24 × 0.07 → **ja 2**  
合計 24。

---

## 2. 時間帯割り当ての根拠：現地ピークと UTC マッピング

X のエンゲージメントは **現地の「朝〜昼」で伸びやすい** という前提で、各言語の **主な利用者タイムゾーン** に合わせて UTC を割り当てている。

| 言語 | 主なタイムゾーン | 現地ピーク（目安） | 割り当て UTC | 根拠 |
|------|------------------|--------------------|--------------|------|
| **ja** | JST (UTC+9) | 9–12 時 | 0, 3 | JST 9 時・12 時前後に合わせて UTC 0 と 3 を割り当て。 |
| **ko** | KST (UTC+9) | 9–12 時 | 1, 2 | KST 朝のピーク。UTC 1–2 = KST 10–11 時。 |
| **en** | EST/PST, GMT | 米朝 8–11, 欧州 8–12 | 4–5, 8–16 | 欧州早朝(4–5)、欧州昼(8–11)、米国朝(12–16) をカバー。Run 数最多のため幅広く配置。 |
| **ar** | GST/EGY 等 (UTC+3〜4) | 現地 9–14 時 | 6, 7 | UTC 6–7 = サウジ・UAE 等 10–11 時前後。 |
| **es** | CET, ART (UTC-3) 等 | スペイン昼、LATAM 朝 | 15–17, 21–22 | スペイン 16–18 時、LATAM 夕方〜夜に合わせ 15–17 と 21–22。 |
| **pt** | BRT (UTC-3) | ブラジル 9–12, 18–21 | 18–20, 23 | BRT 15–17 時(UTC 18–20)、BRT 20 時(UTC 23) を優先。 |

上記を 24 コマに展開したものが **STRATEGIC_UTC_TO_LANG**（`mlPqtScheduleConfig.js`）である。

---

## 3. 参照・更新方針

- **share_ratio の変更**: 成約実績・市場方針が変わったら `LANGUAGE_ALLOCATION` を更新し、**STRATEGIC_UTC_TO_LANG** の各言語の「本数」だけを再計算して 24 に合わせる（時間帯の優先度は上表のまま再利用可）。
- **時間帯の見直し**: 実測 CTR・インプレッションが「言語×時間帯」で取れれば、ピーク時間のずれに応じて UTC 割り当てを調整する。
- **実装**: `services/td/mlPqtScheduleConfig.js` の `STRATEGIC_UTC_TO_LANG`、`api/buzzweave-run.js` の言語決定、`services/td/buzzWeaveSchedulePlan.js` の `getLangByUtcHour` がこの配分を参照している。

---

## 4. 関連ドキュメント

- **BUZZWEAVE_DAILY_POST_TARGET_RATIONALE.md** — 日次 Run 数・上限の根拠
- **BUZZWEAVE_ML_PQT_SCHEDULE_SPEC.md** — TIME_DISTRIBUTION・LANGUAGE_ALLOCATION の仕様
- **CAMPAIGN_72H_PAID_FOCUS.md** — キャンペーン時の 1h 間隔・48h 希少性
