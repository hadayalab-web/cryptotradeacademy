# BuzzWeave 復旧チェックリスト

## 調査結果

### 1. コードの状態
- `utils/supabase.js` に `SUPABASE_PROJECT_REF` 対応あり
- **未コミット・未プッシュ**（git status で M 表示）
- → デプロイされているのは旧コード。修正が反映されていない

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
| column locked does not exist | Vercel が別の Supabase DB に接続している |
| ALTER TABLE 後も同じエラー | 修正した DB と API が参照する DB が別 |
| [Supabase] connecting to が出ない | 修正コードが未デプロイ |
