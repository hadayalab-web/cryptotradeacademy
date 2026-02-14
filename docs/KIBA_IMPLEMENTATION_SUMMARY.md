# KIBA（転換点アラート）実装サマリ

**目的**: 構造転換シグナルを検知し、条件を満たした場合に多言語アラートを Telegram で配信する。

---

## 1. 概要

| 項目 | 内容 |
|------|------|
| **ユーザー向け名称** | 転換点アラート（Critical Alert） |
| **内部コード名** | KIBA（ユーザーには露出しない） |
| **トリガー** | cron 実行時に `ENABLE_KIBA` が有効な場合に `/api/kiba/run` を POST |
| **配信** | 発火時のみ、6 言語（en, ja, es, ko, pt-br, ar）を Telegram で送信 |

---

## 2. 主なファイルと役割

| パス | 役割 |
|------|------|
| `api/kiba/run.js` | エントリポイント。認証・KV 読み・エンジン実行・スナップショット保存・`dispatchPayload.alerts` 生成。 |
| `core/kiba/kiba_engine.js` | エンジン本体。CQ + X データから検知器（flow / whale / sentiment / retail / liquidity / algo）を実行し、スコア・impact を算出。 |
| `core/kiba/evaluator/kiba_trigger.js` | スコア → レベル（CRITICAL / HIGH / ELEVATED / NONE）の変換。 |
| `core/kiba/scoring/kiba_score.js` | 各検知器の結果を集約して KIBA スコアを計算。 |
| `services/snapshot/kibaSnapshotBuilder.js` | エンジン結果をスキーマに沿ったスナップショットに変換し、KV に保存。 |
| `services/snapshot/kibaSnapshotSchema.js` | `kiba:snapshot:latest` / 履歴キー定義、`buildKibaSnapshot`。 |
| `services/ai/gpt5mini.js` | `formatCriticalAlert(snapshot, lang)` で多言語アラート文を生成。 |
| `api/cron.js` | `ENABLE_KIBA` 時に `/api/kiba/run` を呼び、`kibaResult.dispatchPayload.alerts` を 6 言語分 `sendMessageToChannel` で送信。 |

---

## 3. 処理フロー

```
cron 実行
  → (isRegularSlot || force 時) btc スナップショット・macroContext 構築済み
  → ENABLE_KIBA かつ CRON_SECRET あり
      → POST /api/kiba/run?cron_secret=...
  → run.js:
      - 認証（Bearer CRON_SECRET または query cron_secret）
      - KV から BTC / NASDAQ / GOLD / lastKiba 取得
      - buildMacroSnapshot（btcSnapshot.macroContext 優先、無ければ buildMacroContextFromAssets）
      - runKibaEngine(btcSnapshot, macroSnapshot, lastKiba)
      - triggered なら buildAndWriteKibaSnapshot → dispatchPayload.alerts 生成
  → cron:
      - kibaResult.triggered && dispatchPayload.alerts && ENABLE_TELEGRAM
          → 各言語で sendMessageToChannel
```

---

## 4. 認証

- **run.js**: `Authorization: Bearer CRON_SECRET` または `?cron_secret=CRON_SECRET`（body の `cron_secret` / `cronSecret` も可）で 200。不一致時は 401 とログ。
- **cron**: 内部呼び出しで `cron_secret` を query に付与。

---

## 5. KV キー

| キー | 用途 |
|------|------|
| `asset:snapshot:BTC`, `btc:snapshot` | run.js が BTC スナップショット取得に使用（この順でフォールバック）。 |
| `asset:snapshot:NASDAQ`, `asset:snapshot:GOLD` | macroContext 補完用。 |
| `kiba:snapshot:latest` | 直近の KIBA スナップショット（サプレッション判定にも使用）。 |
| `kiba:snapshot:YYYYMMDDHHmm` | 履歴用（15 分バケット）。 |

---

## 6. 発火条件と抑制

- **発火**: `impact.level` が CRITICAL / HIGH / ELEVATED のいずれか **かつ** `kibaScore >= 65`。
- **サプレッション**: 直近の KIBA 発火から 1 時間以内は再発火しない（`SUPPRESSION_WINDOW_MS`）。
- **スコア上限 30**: CQ データなし・X ボリューム低・低ボラ・ホエール偏りが小さい場合はスコアを 30 以下にキャップ。

---

## 7. 配信条件（cron）

- `kibaResult?.triggered === true`
- `kibaResult?.dispatchPayload?.alerts` が存在
- `ENABLE_TELEGRAM` が有効

上記を満たすとき、`alerts[lang]` を各言語で Telegram に送信。

---

## 8. 参照ドキュメント

- **統合実装完了レポート**: `docs/TRAP_DEFENCE_OS_IMPLEMENTATION_COMPLETION_REPORT.md`（KIBA の認証・KV・配信の完了内容を含む）
- **構造監査**: `docs/TRAP_DEFENCE_OS_STRUCTURAL_AUDIT_REPORT.md`
- **アーキテクチャ**: `docs/TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md`
