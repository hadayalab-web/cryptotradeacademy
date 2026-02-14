# Vercel 環境変数セットアップガイド（BWE ロック解消）

## 問題の本質

**「Locked が続く」＝本当のロック競合ではない場合が多い。**

- Vercel で Supabase に繋がっていない
- または **ローカルと別の Supabase プロジェクト** を見ている
- → `acquireBuzzweaveLock()` が毎回 false
- → メッセージだけ「Locked」と出ている状態

## 今すぐやること（3ステップ）

### 1. ローカルの .env を確認

以下の値をコピーしておく：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

- `SUPABASE_URL` を .env で使っている場合、`NEXT_PUBLIC_SUPABASE_URL` に同じ値を Vercel にも設定
- URL の末尾 `/` の有無に注意（両方同じにする）

### 2. Vercel の環境変数を設定・確認

1. [Vercel Dashboard](https://vercel.com/dashboard) → プロジェクト選択
2. **Settings** → **Environment Variables**
3. 以下が存在するか確認し、**値がローカル .env と完全一致**しているかチェック

| 変数名 | 必須 | 用途 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` または `SUPABASE_URL` | ✅ | Supabase プロジェクト URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ロック・DB 操作に必要 |
| `SUPABASE_PROJECT_REF` | 推奨 | 接続先ズレ対策。例: `qctmnyoyanisxxsekcjj` を設定すると `https://{ref}.supabase.co` を強制し、連携の誤設定を上書きする |

- **Production / Preview / Development** のうち、使う環境すべてに設定
- 値の末尾スペース・改行が入っていないか確認

### 3. 接続を検証

デプロイ後、以下を叩く：

```bash
# CRON_SECRET 未設定時は ? なしでアクセス可
curl "https://<your-app>.vercel.app/api/buzzweave-health"
```

**期待する応答（Supabase 接続 OK）：**

```json
{
  "ok": true,
  "status": "healthy",
  "checks": {
    "supabase": {
      "configured": true,
      "lock": {
        "locked": false,
        "updated_at": "2026-02-14T..."
      }
    }
  }
}
```

**Supabase 未設定の場合：**

```json
{
  "ok": false,
  "reason": "supabase_not_configured",
  "hint": "Vercel の環境変数 NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY がローカル .env と一致しているか確認してください。"
}
```

→ この場合は環境変数を追加・修正し、**Redeploy** する。

---

## ローカルと Vercel で「同じ DB」か確認する方法

1. ローカルで `node scripts/release-buzzweave-lock.js` を実行
2. 直後に `GET /api/buzzweave-health` を叩く
3. レスポンスの `checks.supabase.lock.updated_at` が **直近（数秒以内）** なら、同じ DB を参照している
4. `updated_at` が古いまま（例：何時間も前）なら、**Vercel は別の Supabase を見ている**

---

## 環境変数変更後は必ず Redeploy

Vercel は環境変数変更後、**次回デプロイ**まで反映されない。

- **Deployments** → 最新の **⋯** → **Redeploy**
- または `git push` で新規デプロイをトリガー

---

## チェックリスト

- [ ] `NEXT_PUBLIC_SUPABASE_URL` または `SUPABASE_URL` がローカルと一致
- [ ] `SUPABASE_SERVICE_ROLE_KEY` がローカルと一致
- [ ] URL 末尾の `/` がローカルと同じ
- [ ] 環境変数変更後に Redeploy した
- [ ] `/api/buzzweave-health` で `supabase.configured: true` かつ `lock` が読める
- [ ] `/api/buzzweave-run?dry_run=true` で `lock acquired` → `BWE SCAN:` まで進む
