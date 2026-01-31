# X_MAX_DAILY_POSTS削除の記録

**作成日**: 2026-01-31  
**理由**: X APIレート制限のみを守る方針に統一

## 削除内容

### 削除した関数
- `checkDailyPostLimit()` - `services/x/optimization.js`から削除

### 削除した環境変数
- `X_MAX_DAILY_POSTS` - 使用されていないため削除（`.env.example`にコメントアウト）

### 削除理由
1. **X APIレート制限のみを守る方針**: [X API Rate Limits](https://docs.x.com/x-api/fundamentals/rate-limits)に基づく制限のみを守る
2. **実際には使用されていない**: コメントで「日次上限を撤廃（Cronスケジュールで制御されているため不要）」と記載されており、実際には呼び出されていない
3. **スパム検出回避のためのAI推奨値は不要**: X APIのレート制限を守っていれば、スパム検出のリスクは低い

## 残す制限

### X APIレート制限に基づく制限（維持）
- **X_MAX_HOURLY_POSTS**: デフォルト100/時間
  - X APIレート制限: Per User 100/15min = 理論上400/時間
  - 安全のため100/時間をデフォルトに設定
  - `checkHourlyPostLimit()`で実際に使用されている

### X APIレート制限（参考）
- **POST `/2/tweets`**: Per User 100/15min, Per App 10,000/24hrs
- **POST `/2/users/:id/retweets`**: Per User 50/15min

## 変更ファイル

1. `services/x/optimization.js`
   - `checkDailyPostLimit()`関数を削除
   - エクスポートから`checkDailyPostLimit`を削除

2. `api/x-quote-repost.js`
   - `checkDailyPostLimit`のインポートを削除

3. `scripts/test-x-optimization.js`
   - `checkDailyPostLimit`のインポートを削除
   - テスト10をスキップ（コメント追加）

4. `.env.example`
   - `X_MAX_DAILY_POSTS`をコメントアウト（削除済みの旨を記載）

## 参考資料

- [X API Rate Limits](https://docs.x.com/x-api/fundamentals/rate-limits)
