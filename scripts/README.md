# scripts/

このディレクトリには、Trap Defence / CryptoTrade Academy 用の各種スクリプトが含まれます。

## BuzzWeave 単体OS について

X 投稿ロジックは **BuzzWeave Engine のみ**で行われます。投稿関連の実行は `api/buzzweave-run.js`（Cron 毎分）を経由します。

### 運用スクリプト

- **`release-buzzweave-lock.js`** — ロックが残り続けて BWE が走らない場合に、`buzzweave_main` ロックを手動解除する。
- **`clear-buzzweave-x-api-blocked.js`** — X API 402 で立った `x_api_blocked` フラグを手動解除する（Token 修正後など）。詳細は [docs/TRAP_DEFENCE_OS_X_API_401_BLOCKED_VERIFICATION.md](../docs/TRAP_DEFENCE_OS_X_API_401_BLOCKED_VERIFICATION.md) を参照。

## `_archive/` について

**`scripts/_archive/`** には、旧世代ロジック（インフルエンサーストック・KV 補充等）に依存するスクリプトを退避しています。

- **実行不可**: これらは `services/x/influencerStock.js` および `services/x/discoverAndStockFromTargets.js` を参照しており、当該モジュールは BuzzWeave 単体OS にて削除済みのため、**そのままでは実行できません**。
- **保持理由**: 歴史的経緯・参照用としてのみ保持しています。復元する場合は、モジュールの復元またはスクリプトの書き換えが必要です。

詳細は [docs/X_POSTING_BUZZWEAVE_ONLY.md](../docs/X_POSTING_BUZZWEAVE_ONLY.md) および [docs/X_POSTING_BUZZWEAVE_SINGLE_OS_IMPLEMENTATION_REPORT_2026-02-13.md](../docs/X_POSTING_BUZZWEAVE_SINGLE_OS_IMPLEMENTATION_REPORT_2026-02-13.md) を参照してください。
