# BuzzWeave 復旧チェックリスト

## ⚠️ column locked does not exist が出る場合

**接続先（qctmnyoyanisxxsekcjj）は正しいが、その DB の `buzzweave_locks` に `locked` カラムが無い。**

→ **Supabase Dashboard（qctmnyoyanisxxsekcjj）→ SQL Editor** で次を実行：

```sql
ALTER TABLE buzzweave_locks ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE buzzweave_locks SET locked = FALSE WHERE locked IS NULL;
```

詳細: `docs/supabase-buzzweave-locks-add-locked.sql`

---

## 調査結果

### 1. コードの状態
- `utils/supabase.js` に `SUPABASE_PROJECT_REF` 対応あり
- → デプロイ済み。接続ログ `[Supabase] connecting to qctmnyoyanisxxsekcjj.supabase.co` が出ていれば OK

### 2. 接続の流れ
```
getSupabase()
  ├─ SUPABASE_PROJECT_REF があれば → https://{ref}.supabase.co を強制
  ├─ なければ NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL
  └─ [Supabase] connecting to {host} をログ出力
```

### 3. ログに `[Supabase] connecting to` が出ない理由
- このログを出力するコードが**まだデプロイされていない**

---

## 実施手順（この順で実行）

### Step 1: コミット＆プッシュ

```powershell
cd "c:\Users\chiba\hadayalab-automation-platform\cryptotradeacademy"
git add utils/supabase.js docs/VERCEL_SUPABASE_SETUP.md docs/BUZZWEAVE_FIX_CHECKLIST.md .env.example
git commit -m "fix(supabase): SUPABASE_PROJECT_REF で接続先強制・isSupabaseConfigured 対応"
git push
```

### Step 2: Vercel に環境変数を追加

Vercel → 対象プロジェクト → Settings → Environment Variables

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_PROJECT_REF` | `qctmnyoyanisxxsekcjj` | Production, Preview, Development |

### Step 3: デプロイ確認

- push 後は自動デプロイされる
- または手動で Redeploy

### Step 4: 動作確認

1. buzzweave-run を叩く
2. Vercel Logs で確認:
   - `[Supabase] connecting to qctmnyoyanisxxsekcjj.supabase.co` が出ているか
   - `column buzzweave_locks.locked does not exist` が消えているか
   - `lock acquired` → `run started` → `BWE SCAN:` が出ているか

---

## 原因の整理

| 事象 | 原因 |
|------|------|
| column locked does not exist | **接続先 DB の buzzweave_locks に locked カラムが無い**。ALTER TABLE で追加が必要 |
| 接続先が違う | SUPABASE_PROJECT_REF で強制すれば解消（接続ログで確認済みなら OK） |
| [Supabase] connecting to が出ない | 修正コードが未デプロイ |
