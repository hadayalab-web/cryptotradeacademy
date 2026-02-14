# BuzzWeave ロックスキーマとフェイルセーフ

**更新**: minimal スキーマ時は **実行を許可せず run をスキップ** するように変更済み（X API 無駄叩き防止）。修復手順は [BUZZWEAVE_LOCK_SCHEMA_FIX.md](./BUZZWEAVE_LOCK_SCHEMA_FIX.md) を参照。

---

## 1. 2 段階のフェイルセーフ（minimal 時は run しない）

| 段階 | 条件 | 動作 |
|------|------|------|
| **新ロック** | テーブルに `locked` カラムがある | `locked = true` で排他。TTL 60 秒経過で再取得可能。run はロック取得成功時のみ。 |
| **旧ロック（Legacy）** | `locked` が無いが `updated_at` がある | `updated_at` の TTL のみで排他（`locked column missing, fallback to legacy TTL lock`）。run は許可。 |
| **minimal schema** | `lock_name` のみ | **ロック取得失敗** とし、**run をスキップ**（X API を叩かない）。テーブル修復まで BuzzWeave は起動しない。 |

---

## 2. なぜ危険ではないか

- **cron は 1 分に 1 回**のため、ロックが無くても多重実行はほぼ起きない。
- **安全装置が多層**: X API blocked、emergency stop、deadline、dryRun、**1 回で 1 スロットのみ消費**。
- Trap Defence OS の設計思想どおり「壊れない・止まらない・外部依存が死んでも OS は生き続ける」。

---

## 3. どうするか

- **minimal スキーマのまま** にすると、BuzzWeave は **run しない**（ロック取得失敗のため）。X API は消費されない。
- **BuzzWeave を再開したい場合**: `buzzweave_locks` に **locked** と **updated_at** を追加する。手順は [BUZZWEAVE_LOCK_SCHEMA_FIX.md](./BUZZWEAVE_LOCK_SCHEMA_FIX.md) および `docs/supabase-buzzweave-locks-full-schema-migration.sql` を参照。
