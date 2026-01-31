# 環境変数設定ガイド（GPT-5-mini推奨P0最適化）
**作成日**: 2026-01-31  
**目的**: GPT-5-mini推奨のP0最適化に必要な環境変数の設定方法

---

## 📋 必要な環境変数

### 【P0】即座に設定すべき環境変数

#### 1. `SKIP_MINIMAL_FETCH`
**説明**: オプション処理（`getMinimalVersionPostUrl` / `getMinimalVersionContent`）を強制的にスキップするフラグ

**値**:
- `1`: スキップ有効（本番環境推奨）
- `0` または未設定: スキップ無効（デフォルト）

**効果**: 数秒〜10秒の短縮

**設定方法**:
```bash
# Vercel Dashboard
SKIP_MINIMAL_FETCH=1

# ローカル環境（.env）
SKIP_MINIMAL_FETCH=1
```

---

#### 2. `QUOTE_REPOST_CONCURRENCY`
**説明**: 並列処理の同時実行数（p-limitで使用）

**値**:
- `3`: デフォルト（推奨）
- `5`: より高速だが、レート制限に注意
- `1`: 逐次処理（デバッグ用）

**効果**: 48秒→20-25秒（理想的）

**設定方法**:
```bash
# Vercel Dashboard
QUOTE_REPOST_CONCURRENCY=3

# ローカル環境（.env）
QUOTE_REPOST_CONCURRENCY=3
```

---

#### 3. `MAX_POSTS_PER_RUN`
**説明**: 1回のリクエストで処理する最大投稿数（超過分は次回に回す）

**値**:
- `10`: デフォルト（推奨）
- `5`: より安全（確実に60秒以内）
- `20`: より多くの投稿を処理（リスクあり）

**効果**: 中（確実性の向上）

**設定方法**:
```bash
# Vercel Dashboard
MAX_POSTS_PER_RUN=10

# ローカル環境（.env）
MAX_POSTS_PER_RUN=10
```

---

## 🔧 Vercelでの設定方法

### 1. Vercel Dashboard経由

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクト `cryptotradeacademy` を選択
3. **Settings** → **Environment Variables** をクリック
4. 以下の環境変数を追加：

| Key | Value | Environment |
|-----|-------|-------------|
| `SKIP_MINIMAL_FETCH` | `1` | Production, Preview, Development |
| `QUOTE_REPOST_CONCURRENCY` | `3` | Production, Preview, Development |
| `MAX_POSTS_PER_RUN` | `10` | Production, Preview, Development |

5. **Save** をクリック
6. **Redeploy** を実行（環境変数の変更を反映）

---

### 2. Vercel CLI経由

```bash
# 環境変数を設定
vercel env add SKIP_MINIMAL_FETCH production
# Value: 1

vercel env add QUOTE_REPOST_CONCURRENCY production
# Value: 3

vercel env add MAX_POSTS_PER_RUN production
# Value: 10

# デプロイを実行
vercel --prod
```

---

## 📝 ローカル環境での設定（.envファイル）

`.env`ファイルに以下を追加：

```env
# GPT-5-mini推奨P0最適化
SKIP_MINIMAL_FETCH=1
QUOTE_REPOST_CONCURRENCY=3
MAX_POSTS_PER_RUN=10
```

---

## ✅ 設定確認方法

### 1. Vercel Dashboardで確認
- **Settings** → **Environment Variables** で設定値を確認

### 2. ログで確認
以下のログが出力されれば設定が反映されています：

```
[Quote Repost] SKIP_MINIMAL_FETCH is enabled — skipping minimal version fetch
[Quote Repost] Using concurrency limit: 3
[Quote Repost] Max posts per run: 10
```

---

## 🎯 推奨設定（本番環境）

### 最小構成（確実性優先）
```env
SKIP_MINIMAL_FETCH=1
QUOTE_REPOST_CONCURRENCY=3
MAX_POSTS_PER_RUN=5
```

### 標準構成（バランス型）
```env
SKIP_MINIMAL_FETCH=1
QUOTE_REPOST_CONCURRENCY=3
MAX_POSTS_PER_RUN=10
```

### 最大構成（高速優先、リスクあり）
```env
SKIP_MINIMAL_FETCH=1
QUOTE_REPOST_CONCURRENCY=5
MAX_POSTS_PER_RUN=20
```

---

## ⚠️ 注意事項

1. **`SKIP_MINIMAL_FETCH=1`を有効にすると**: minimal contentによる微妙な投稿微調整は失われますが、投稿自体（収益化の要）が残ることを優先してください。

2. **`QUOTE_REPOST_CONCURRENCY`の調整**: 
   - 最初は`3`で始めてログを確認
   - X APIのレート制限に注意
   - 必要に応じて上げ下げしてください

3. **`MAX_POSTS_PER_RUN`の調整**:
   - 確実に60秒以内に完了するように設定
   - 実測を取りながら調整してください

---

## 📊 期待される効果

### 設定前
- 処理時間: 60秒（504タイムアウト発生）
- 確実性: 低

### 設定後（最小構成）
- 処理時間: 15-20秒
- 確実性: 高（ほぼ100%のケースで60秒以内）

---

## 🔄 設定変更後の動作確認

1. 環境変数を設定
2. Vercelで再デプロイ
3. テスト実行:
   ```powershell
   .\scripts\test-grok-p0-optimization.ps1
   ```
4. Vercelログで確認:
   - `SKIP_MINIMAL_FETCH is enabled` が表示されるか
   - 処理時間が短縮されているか
   - 504タイムアウトが発生していないか
