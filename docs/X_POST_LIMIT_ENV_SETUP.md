# X API投稿数上限の環境変数設定ガイド
**作成日時**: 2026-01-26  
**目的**: X APIレート制限に基づく投稿数上限の環境変数設定

---

## 🔑 環境変数

X APIのレート制限に基づいて、投稿数の上限を環境変数で設定できます：

| 変数名 | デフォルト値 | 説明 | X APIレート制限 |
|--------|------------|------|----------------|
| `X_MAX_DAILY_POSTS` | `100` | 1日の最大投稿数 | Per User 100/15min, Per App 10,000/24hrs |
| `X_MAX_HOURLY_POSTS` | `100` | 1時間の最大投稿数 | Per User 100/15min（理論上400/時間、安全のため100/時間） |

---

## 📋 X APIレート制限の詳細

### POST /2/tweets エンドポイント

| Tier | Per User | Per App | 備考 |
|------|----------|---------|------|
| **Free** | 17/24hrs | 17/24hrs | - |
| **Basic** | 100/24hrs | 1,667/24hrs | - |
| **Pro** | **100/15min** | **10,000/24hrs** | 現在の実装はOAuth 1.0a User Context認証を使用 |

### 理論上の最大投稿数（Pro Tier）

- **15分あたり**: 100投稿
- **1時間あたり**: 400投稿（100 × 4）
- **1日あたり**: 9,600投稿（100 × 4 × 24）
- **ただし、アプリ単位の制限**: 10,000投稿/24時間

---

## 🚀 Vercelでの設定手順

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. `cryptotradeacademy` プロジェクトを選択
3. **Settings** → **Environment Variables** に移動
4. 以下の環境変数を追加：

   **Key**: `X_MAX_DAILY_POSTS`  
   **Value**: `100`（または希望する値）  
   **Environment**: 
   - ✅ Production
   - ✅ Preview
   - ✅ Development

   **Key**: `X_MAX_HOURLY_POSTS`  
   **Value**: `100`（または希望する値）  
   **Environment**: 
   - ✅ Production
   - ✅ Preview
   - ✅ Development

5. **Save** をクリック

---

## 💡 推奨設定値

### 安全な設定（推奨）

```bash
X_MAX_DAILY_POSTS=100      # X APIレート制限: 100/15min（Per User）
X_MAX_HOURLY_POSTS=100     # X APIレート制限: 100/15min（理論上400/時間、安全のため100/時間）
```

### 最大活用設定（リスクあり）

```bash
X_MAX_DAILY_POSTS=9600     # 理論上の最大値（Per User、Pro Tier）
X_MAX_HOURLY_POSTS=400     # 理論上の最大値（100/15min × 4）
```

**注意**: 最大活用設定は、X APIのレート制限を超える可能性があるため、慎重に使用してください。

---

## 📝 実装詳細

### 使用箇所

- `services/x/optimization.js` - 投稿数制限チェック関数
- `api/x-quote-repost.js` - 引用リポスト投稿時の制限チェック
- `api/x-post-free-report.js` - 無料レポート投稿時の制限チェック

### 関数

- `checkDailyPostLimit(currentPostCount, maxPosts)` - 1日の投稿上限をチェック
- `checkHourlyPostLimit(currentHourlyPostCount, maxPostsPerHour)` - 1時間の投稿上限をチェック

---

## ⚠️ 注意事項

1. **レート制限の確認**: X APIのレート制限を超えないように設定してください
2. **スパム検知リスク**: 1日100投稿以上は、Xのスパム検知アルゴリズムに引っかかる可能性があります
3. **段階的な増加**: 投稿数を増やす場合は、段階的に増やしてエンゲージメント率を監視してください

---

## 🔗 関連ドキュメント

- [X API Rate Limits](https://docs.x.com/x-api/fundamentals/rate-limits) - X API公式ドキュメント
- [X API Daily Post Limits](./X_API_DAILY_POST_LIMITS.md) - 1日の投稿数上限の詳細
- [X API New Pricing Analysis](./X_API_NEW_PRICING_ANALYSIS.md) - 従量課金制の分析

---

**最終更新**: 2026-01-26
