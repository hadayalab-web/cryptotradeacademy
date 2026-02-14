# BuzzWeave ロックスキーマとフェイルセーフ

**要点**: ログに `buzzweave_locks has minimal schema (lock_name only), allowing run without lock` が出るのは**異常ではなく、意図されたフェイルセーフ**。BuzzWeave は壊れていない。

---

## 1. 3 段階のフェイルセーフ

| 段階 | 条件 | 動作 |
|------|------|------|
| **新ロック** | テーブルに `locked` カラムがある | `locked = true` で排他。TTL 60 秒経過で再取得可能。 |
| **旧ロック（Legacy）** | `locked` が無いが `updated_at` がある | `updated_at` の TTL のみで排他（`locked column missing, fallback to legacy TTL lock`）。 |
| **ロック無しで実行** | `lock_name` のみの minimal schema | ロック取得を諦め、**実行を許可**（`minimal schema (lock_name only), allowing run without lock`）。 |

現在、テーブルが **lock_name のみ** のため、上記 3 段階目の「ロック無しで実行」になっている。

---

## 2. なぜ危険ではないか

- **cron は 1 分に 1 回**のため、ロックが無くても多重実行はほぼ起きない。
- **安全装置が多層**: X API blocked、emergency stop、deadline、dryRun、**1 回で 1 スロットのみ消費**。
- Trap Defence OS の設計思想どおり「壊れない・止まらない・外部依存が死んでも OS は生き続ける」。

---

## 3. どうするか

- **今すぐ直す必要はない**。フェイルセーフで動いているので、ログは「通知」であり「危険」ではない。
- **スキーマを整えたい場合**: `buzzweave_locks` に **locked** と **updated_at** を足すと、新ロック方式で動作しログが静かになり、多重実行の可能性がゼロに近づく。
- 完全スキーマ用の SQL は `docs/supabase-buzzweave-locks-add-locked.sql` および **minimal から一括で完全版にする場合** は `docs/supabase-buzzweave-locks-full-schema-migration.sql` を参照。
