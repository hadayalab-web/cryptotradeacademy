# BuzzWeave ロックテーブル修復手順（X API 消費ゼロ化のため）

**背景**: `buzzweave_locks` が **lock_name のみの minimal スキーマ** の場合、以前は「ロックなしで実行許可」され、毎分 X API が叩かれ得る状態でした。  
**変更後**: minimal スキーマのときは **ロック取得を失敗** とみなし、**run をスキップ** します（X API を叩かない）。

ログに次のように出たら、テーブル修復が必要です。

```
[buzzweave-run] acquireBuzzweaveLock: buzzweave_locks has minimal schema (locked column missing), refusing run. Run migration: docs/supabase-buzzweave-locks.sql
```

**minimal スキーマ時は run を拒否**（暴走防止）。テーブル修復まで投稿は再開しない。

---

## 1. 修復手順（Supabase）

1. **Supabase Dashboard** を開き、Vercel が利用しているプロジェクトを選択する。
2. **SQL Editor** で次を実行する（推奨: 一括移行用）:
   - [supabase-buzzweave-locks-full-schema-migration.sql](./supabase-buzzweave-locks-full-schema-migration.sql)
3. 実行後、`SELECT lock_name, locked, updated_at FROM buzzweave_locks;` で `locked` と `updated_at` が存在することを確認する。

これで **新ロック方式** で動き、ロック取得成功時のみ run が行われます。

---

## 2. あわせて確認したいこと

- **x_api_blocked**: 402 後に `true` になっている場合は、Token 修正・クレジット補充後に [scripts/clear-buzzweave-x-api-blocked.js](../scripts/clear-buzzweave-x-api-blocked.js) または `GET /api/buzzweave-clear-x-api-blocked?cron_secret=xxx` で解除。
- **スロットを時間帯で絞る**: 環境変数 `BUZZWEAVE_ACTIVE_HOURS_JST` を設定すると、その時間帯（JST）のみスロットを生成し、それ以外は X API を叩きません。例: `8,9,10,11,12,13,14,17,18,19,20,21,22,23`

以上で、「投稿する時だけ X API を叩く」状態に近づけられます。
