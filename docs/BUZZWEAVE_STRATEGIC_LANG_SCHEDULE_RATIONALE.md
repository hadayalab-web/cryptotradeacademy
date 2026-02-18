# 戦略的言語・時間帯配分の根拠

BuzzWeave の **STRATEGIC_UTC_TO_LANG**（UTC 時間→言語の 1 時間単位割り当て）は、**均等配分ではなく**、以下 2 つに基づいて決めている。

---

## 0. 目的と Cron の現状（要約）

- **目的**: **リプライの高インプレ獲得** と **高 CTR 獲得**。この 2 つからブレていない（選定スコア・スケジュール・キーワードはいずれもこの目的に紐づいている）。
- **Cron の現状**: Vercel では **4 本の Cron**（CMO 推奨どおり）。en は 15 分ごと、asia/latam は 30 分ごと、ar は 60 分ごと。各 Cron は `/api/buzzweave-cron-en` 等のラッパー経由で `buzzweave-run` を `?lang=xx` または `?region=asia` で呼ぶ。region 指定時は API 内で **STRATEGIC_UTC_TO_LANG** に基づき言語を 1 つ選択。
- **言語別配信スケジュール**: region を使う asia/latam では「何時（UTC）にどの言語か」は **STRATEGIC_UTC_TO_LANG** で決まる。en と ar は固定で lang=en / lang=ar。

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

## 4. 言語別に分けた Cron（CMO 推奨・実装済み）

- **経緯**: CSO/CMO 戦略セッションで CMO が「4 本の Cron で言語・地域を分割」を推奨（en 15 分、asia 30 分、latam 30 分、emea 60 分）。
- **実装**: Vercel の Cron は **4 本** に分割済み。単一の `*/30` は廃止。
  - **cron-en**: `*/15` → `/api/buzzweave-cron-en`（`?lang=en`）
  - **cron-asia**: `*/30` → `/api/buzzweave-cron-asia`（`?region=asia` → API 内で ja/ko を UTC から選択）
  - **cron-latam**: `*/30` → `/api/buzzweave-cron-latam`（`?region=latam` → es/pt を選択）
  - **cron-emea**: `0 * * * *` → `/api/buzzweave-cron-emea`（`?lang=ar`）
- **詳細**: `docs/BUZZWEAVE_CMO_IMPLEMENTATION_COMPLETE.md` を参照。

---

## 5. 言語別配信スケジュール（UTC 時間 → 言語）

30 分ごと 48 Run/日のうち、**各 UTC 時** に割り当たる言語は次のとおり（:00 と :30 の 2 Run とも同じ言語）。

| UTC 時 | 言語 | 備考 |
|--------|------|------|
| 0, 3 | ja | アジア朝（JST 9–12 時） |
| 1, 2 | ko | アジア朝（KST） |
| 4, 5 | en | 欧州早朝 |
| 6, 7 | ar | 中東朝 |
| 8–15 | en | 欧州〜米国朝（en が最多のため幅広く配置） |
| 15–17, 21, 22 | es | スペイン・LATAM |
| 18–20, 23 | pt | ブラジル中心 |

※ 正確な 24 コマは `services/td/mlPqtScheduleConfig.js` の **STRATEGIC_UTC_TO_LANG** を参照。

---

## 6. 目的との整合（高インプレ・高 CTR）

| レイヤー | 目的との対応 |
|----------|----------------|
| **スケジュール** | 各言語の現地ピークに Run を割り当て → スレが盛り上がる時間に寄生し、**リプライのインプレ** を最大化。 |
| **選定スコア** | Freshness / Velocity / Author Reach で「伸びる投稿」を優先 → インプレ最大化。CopyFit > Hype で「刺さる文脈」を優先 → **CTR 最大化**（Gemini CMO 推奨・BUZZWEAVE_STRATEGY_RATIONALE.md）。 |
| **キーワード・窓** | 言語別キーワードと時間窓でヒット数と質を確保 → インプレの母数と CTR の分母の両方に効く。 |

目的（リプライの高インプレ獲得・高 CTR 獲得）からブレていない。

---

## 7. 関連ドキュメント

- **BUZZWEAVE_DAILY_POST_TARGET_RATIONALE.md** — 日次 Run 数・上限の根拠
- **BUZZWEAVE_ML_PQT_SCHEDULE_SPEC.md** — TIME_DISTRIBUTION・LANGUAGE_ALLOCATION の仕様
- **BUZZWEAVE_STRATEGY_RATIONALE.md** — Gemini CMO 推奨（選定重み・HYPE/CTR・キーワード）と根拠
- **CAMPAIGN_72H_PAID_FOCUS.md** — キャンペーン時の 1h 間隔・48h 希少性
