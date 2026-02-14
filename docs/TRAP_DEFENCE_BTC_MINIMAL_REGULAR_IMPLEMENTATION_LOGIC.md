# Trap Defence BTC Minimal / Regular 実装ロジック

**目的**: Minimal（無料版）と Regular（有料版）の配信判定・スナップショット取得・テンプレート・送信経路の実装ロジックをコード準拠でまとめる。

---

## 1. 全体の位置づけ

| 商品 | 性質 | 配信経路 | トリガー |
|------|------|----------|----------|
| **Minimal** | 無料・表面レベル・堅牢 | **別 API**（`/api/minimal-tg-delivery`）・別 Cron 想定 | KV に early/full が存在する限り配信可能 |
| **Regular** | 有料・深層構造 | **cron 内**（`/api/cron`）。deliveryMode === "regular" のときのみ REGULAR ブロック実行 | 定期スロット or force or イベント駆動 |

- **cron** は Stage 1 完了後に **writeEarlySnapshot**（毎回）、isRegularSlot または force 時に **writeFullSnapshot** + **persistSnapshotToDb** + runAssetSnapshot("BTC") を実行。
- **Minimal** は cron とは独立した API で、KV からスナップショットを読んで 6 言語配信する。Regular と同時刻にしないため別 Cron で別時刻に実行する設計。
- **Regular** は cron の 1 回の実行のなかで、deliveryMode が regular のときだけ「7-A. REGULAR」ブロックに入り、6 言語分の Telegram（＋オプションで Email / X Proof）を送信する。

---

## 2. deliveryMode の判定（evaluateDeliveryMode）

**ロジック**: `logic/deliveryModeEvaluator.js`

**優先順位**（上から適用）:

1. **force**（query `?force=true`）→ **regular**（reason: "force"）
2. **isRegularSlot**（UTC の定期時刻、デフォルト 0,6,12,18 時 :00）→ **regular**（reason: "regular_slot"）
3. **evaluateRegularEventDriven(snapshot, lastSnapshot)** が fire → **regular**（reason: "event_driven: ${reason}"）
4. 上記いずれでもない → **minimal**（reason: "default"）

**補足**: Emergency は廃止。evaluateEmergencyTrigger は存在するが、evaluateDeliveryMode の戻り値では **emergency を返さない**。

### 2.1 定期スロット（isRegularSlot）

- **REGULAR_HOURS**: デフォルト `[0, 6, 12, 18]`（6h）。`REGULAR_DELIVERY_HOURS_UTC` でカンマ区切り指定可。`REGULAR_SCHEDULE=4h` のときは 4h 用の時刻配列。
- **REGULAR_DELIVERY_MINUTE**: デフォルト 0。`REGULAR_DELIVERY_MINUTE` で指定。
- **isRegularSlot** = 現在 UTC が (REGULAR_HOURS のいずれか) かつ (分 === REGULAR_DELIVERY_MINUTE)。

### 2.2 イベント駆動 Regular（evaluateRegularEventDriven）

以下のいずれかで **fire: true**。lastSnapshot は DB 等から取得した「前回の btcSnapshot」。

| 条件 | 閾値定数 | 内容 |
|------|----------|------|
| whale_spike | REGULAR_WHALE_SPIKE_WHALE_RATIO = 0.85 | cqDeep.whaleRatio >= 0.85 |
| volatility_regime_shift | REGULAR_VOLATILITY_CHANGE24H = 5 | \|raw.change24h\| >= 5 |
| sentiment_flip | REGULAR_SENTIMENT_FLIP_SCORE_DELTA = 25 | \|market_score - lastSnapshot.market_score\| >= 25 |
| liquidity_shock | REGULAR_LIQUIDITY_SHOCK_DELTA = 0.15 | liquidity depth の変化量 >= 0.15 |
| derivatives_unwind | REGULAR_FUNDING_DELTA = 0.0005, REGULAR_OI_DROP_PCT = 0.05 | funding 変化 >= 0.0005 かつ OI 減少率 >= 5% |

### 2.3 メタフラグ（computeMetaFlags）

- **watch**: market_score 変化 >= 30、または mpi <= -20、または kimchiPremium >= 0.05。テンプレートの文言調整用（minimal の亜種としての扱い）。
- **standbyBreak**: 前回スナップショットから 24h 以上経過かつ、前回は standby（trapScore < 40 かつ trapDetected なし）で今回が active（trapScore >= 40 または trapDetected）。regular の亜種としてテンプレートで文言調整。

---

## 3. cron 内の分岐（Minimal は送らない）

- **deliveryResult** = `evaluateDeliveryMode(btcSnapshot, { isRegularSlot, force, lastSnapshot })`。
- **deliveryMode** = deliveryResult.mode（"minimal" | "regular"）。

**早期 return**:

- `!force && !isRegularSlot && deliveryMode === "minimal"` のとき、**REGULAR ブロックには入らず**、その時点で 200 を返して終了。
- このとき cron は **Minimal 用の Telegram は送らない**。Minimal は **別 API（minimal-tg-delivery）** で別 Cron により配信する。

**REGULAR ブロック**:

- `deliveryMode === "regular"` のときのみ「7-A. REGULAR」に入り、6 言語分の Regular 配信（Telegram ＋ オプションで Email / X Proof）を実行。

---

## 4. Minimal の実装ロジック（api/minimal-tg-delivery.js）

### 4.1 エントリ

- **メソッド**: GET のみ。
- **認証**: `CRON_SECRET` が設定されているときは `Authorization: Bearer ${CRON_SECRET}` 必須。未設定なら認証なしで通過。
- **KV**: `getKV()` が無い場合は 503。

### 4.2 スナップショット取得（KV）

**読み順**（コメントと実装どおり）:

1. `btc:snapshot:early`
2. `btc:snapshot`
3. `minimal:btc:latest`（移行期フォールバック）

いずれも無い場合は 503 で「Run /api/cron first」を返す。

- **early** は cron が Stage 1 完了後に **writeEarlySnapshot** で毎回書き込む。
- **btc:snapshot** は cron が **isRegularSlot || force** のときに **writeFullSnapshot** で書き込む。

### 4.3 言語・チャンネル

- **SUPPORTED_LANGS**: `["en", "es", "pt-br", "ar", "ja", "ko"]`（cron の SUPPORTED_LANGS と同一）。
- **getTargetLangs()**: `MINIMAL_MULTI_LANG` が true（デフォルト）なら SUPPORTED_LANGS 全体、否则は `LANG` または "en" のみ。
- **resolveMinimalChatId(lang)**: `TELEGRAM_CHAT_ID_MINIMAL_${LANG}`（例: `TELEGRAM_CHAT_ID_MINIMAL_JA`）。PT_BR/PTBR、JA/JP、KO/KR のバリアントを試す。フォールバックは `TELEGRAM_CHAT_ID_MINIMAL_EN` → `TELEGRAM_CHAT_ID_MINIMAL`。

### 4.4 フォーマットと送信

- **loadMinimalFormatter(lang)**: `services/telegram/messages/user/${lang}/minimal-high-quality.${lang}` の `formatMinimalBriefing` または `formatMinimalBriefingOSv26`。失敗時は en の同モジュールをフォールバック。
- **minimalText** = `formatMinimal(payload, targetLang)`。payload は KV から取得した btcSnapshot（early または full）または legacy 形状。
- **sendMessageToAsset**(minimalText, "MINIMAL", langCode, { reply_markup: getSocialProofButton(targetLang) }) で Telegram 送信。
- **ENABLE_TELEGRAM** が "false" の場合は送信せず 200 で skipped。

---

## 5. Regular の実装ロジック（cron 内 7-A）

### 5.1 配信対象言語

- **getTargetLanguagesForRegular()**: `REGULAR_MULTI_LANG` が true（デフォルト）なら **SUPPORTED_LANGS**（`["en", "es", "pt-br", "ar", "ja", "ko"]`）、否则は `LANG` のみ。
- 言語が 0 件の場合は 500 を返して終了。

### 5.2 チャンネル ID

- 各言語の **marketCode** = getMarketCode(targetLang)（例: EN, JA, KO, PT_BR）。
- **TELEGRAM_CHAT_ID_BTC_${marketCodeEnv}** または **TELEGRAM_CHAT_ID** が無い言語はログ警告。送信時は channelId が無いとその言語はスキップ。

### 5.3 スナップショットとオプション（言語ごと）

- **snapshotForRegular** = `{ ...btcSnapshot, cqDeep: cqDeep || btcSnapshot.cqDeep, highResX: highResXData || btcSnapshot.highResX }`。REGULAR ブロック内でマージした cqDeep / highResX を使用。
- **langPsychologicalSupport** = `diagnoseUserSentimentCompat(btcSnapshot, targetLang)`（Dr. Grok 心理診断）。失敗時は null。
- **missedOpportunities** = 過去 24h の「見逃した機会」を一度だけ計算。**langNonUserImpactReport** = 各言語用に GPT で生成（任意）。
- **regularOpts** = { psychologicalSupport, nonUserImpactReport, missedOpportunities, grokXAnalysis, marketBug, **internalImpact: kibaResult?.impact** }。
- 市場別オプション: KO のとき kimchiPremium / upbitPrice、EN のとき trapScore / whaleFlows / liquidations を marketSnapshotService に追加（テンプレートから参照）。

### 5.4 テンプレートと本文

- **loadUserTemplates(targetLang)** で `formatRegularBriefing` を取得。`services/telegram/messages/user/${lang}/regular.${lang}`。無い場合はスキップ。
- **regularText** = `langFormatRegularBriefing(snapshotForRegular, targetLang, regularOpts)`。

### 5.5 送信

- **Telegram**: `sendMessageToChannel(regularText, "BTC", marketCode, { reply_markup: socialProofButton })`。または後方互換で `sendMessage(regularText, { reply_markup })`。
- **Email**: `formatRegularBriefingHTML(snapshotForRegular, targetLang, opts)` で HTML を生成し、getRecipientEmails(targetLang) が存在すれば sendBatchEmails。
- **X Proof Post**: `ENABLE_X_PROOF_POST` かつ targetLang === "en" のときのみ postProofToX（英語版のみ）。

### 5.6 送信可否

- **ENABLE_TELEGRAM** が false の場合は Telegram は送らない。regularActuallySent は Telegram 送信成功時のみ true。メッセージログは regularActuallySent のときだけ記録。

---

## 6. スナップショットの書き込み（cron）

| タイミング | 処理 | KV キー |
|------------|------|---------|
| Stage 1 完了後（毎回） | writeEarlySnapshot(kv, raw, market_score, trap) | **btc:snapshot:early** |
| isRegularSlot \|\| force 時 | writeFullSnapshot(kv, btcSnapshot); persistSnapshotToDb(btcSnapshot); runAssetSnapshot("BTC", btcSnapshot) | **btc:snapshot**、DB、**asset:snapshot:BTC** |

- **buildEarlySnapshot(raw, market_score, trap)**: snapshot_id, as_of_utc, raw, market_score, trapDetection（trap から trapScore/trapDetected を簡易変換）。
- **buildFullSnapshot(params)**: raw, cqDeep, xSentiment, highResX, gpt* 系, sosovalueArticle, drGrok, trapDetection, trapAlert, divergenceSignal, market_score, tradeSignal, marketRegime, diff, **macroContext** 等をまとめたフルスナップショット。macroContext は isRegularSlot || force 時に NASDAQ/GOLD から buildMacroContextFromAssets で組み、buildFullSnapshot に渡す。

---

## 7. 定数・閾値一覧

### deliveryModeEvaluator

| 名前 | 値 | 用途 |
|------|-----|------|
| REGULAR_WHALE_SPIKE_WHALE_RATIO | 0.85 | イベント駆動 regular: whale_spike |
| REGULAR_SENTIMENT_FLIP_SCORE_DELTA | 25 | イベント駆動 regular: sentiment_flip |
| REGULAR_VOLATILITY_CHANGE24H | 5 | イベント駆動 regular: volatility_regime_shift |
| REGULAR_LIQUIDITY_SHOCK_DELTA | 0.15 | liquidity_shock |
| REGULAR_FUNDING_DELTA | 0.0005 | derivatives_unwind |
| REGULAR_OI_DROP_PCT | 0.05 | derivatives_unwind |
| WATCH_SCORE_CHANGE_THRESHOLD | 30 | meta.watch |
| WATCH_MPI_THRESHOLD | -20 | meta.watch |
| WATCH_KIMCHI_PREMIUM_THRESHOLD | 0.05 | meta.watch |
| STANDBY_BREAK_HOURS | 24 | meta.standbyBreak |

### cron（配信・言語）

| 名前 | 値 | 説明 |
|------|-----|------|
| SUPPORTED_LANGS | ["en", "es", "pt-br", "ar", "ja", "ko"] | Minimal / Regular 共通の 6 言語 |
| REGULAR_MULTI_LANG | デフォルト true | true なら getTargetLanguagesForRegular が SUPPORTED_LANGS 全体 |
| MINIMAL_MULTI_LANG | デフォルト true | true なら getTargetLangs が SUPPORTED_LANGS 全体 |
| KV_EARLY_TTL / KV_FULL_TTL | 1200 | early / full の TTL（秒） |

---

## 8. 参照ファイル

| ファイル | 役割 |
|----------|------|
| `logic/deliveryModeEvaluator.js` | evaluateDeliveryMode, evaluateRegularEventDriven, computeMetaFlags |
| `api/cron.js` | Stage 1〜6、buildFullSnapshot、writeEarlySnapshot/writeFullSnapshot、evaluateDeliveryMode、早期 return（minimal 時）、7-A REGULAR ブロック、テンプレート読み込み・送信 |
| `api/minimal-tg-delivery.js` | KV 読み（early → full → minimal:btc:latest）、formatMinimal、sendMessageToAsset |
| `services/snapshot/btcSnapshotSchema.js` | buildEarlySnapshot, buildFullSnapshot |
| `services/snapshot/btcSnapshotWriter.js` | writeEarlySnapshot, writeFullSnapshot, persistSnapshotToDb |
| `services/telegram/messages/user/${lang}/minimal-high-quality.${lang}` | formatMinimalBriefing / formatMinimalBriefingOSv26 |
| `services/telegram/messages/user/${lang}/regular.${lang}` | formatRegularBriefing |
| `services/email/messages/user/${lang}/regular.${lang}` | formatRegularBriefingHTML |
| `services/telegram/bot.js` | sendMessageToChannel, sendMessageToAsset |

---

## 9. 補足

- **Minimal** は「cron が書いた KV を読むだけ」のため、cron の実行タイミングと minimal-tg-delivery の実行タイミングをずらすと、Regular と同時刻にならない。
- **Regular** は「同じ cron 実行内で 1 本の btcSnapshot」を全言語で共有。言語ごとに psychologicalSupport / nonUserImpactReport などだけ差し替え。
- **standbyBreak** は deliveryMode を regular にする条件ではなく、regular 配信時のテンプレート用メタ。イベント駆動で regular になる条件は evaluateRegularEventDriven の 5 つのみ。
