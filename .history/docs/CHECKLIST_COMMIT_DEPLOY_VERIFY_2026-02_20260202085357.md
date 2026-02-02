# チェックリスト：コミット → プッシュ → 自動デプロイ → Vercelログ検証（2026-02）

チャットで実施した改善は完了済み。この手順でリリース・検証してよい。

---

## 1. 実施済み改善の確認（コード上は反映済み）

| 項目 | ファイル | 状態 |
|------|----------|------|
| ユーザーリプライ重複防止 | `services/x/userReplyHandler.js` | ✅ 処理済みマークをリプライ取得直後に設定 |
| テスト投稿ガード | `services/x/client.js` | ✅ rejectTestOrTrashPost で「テスト」「test」のみブロック |
| 引用リポスト 0 でも投稿 | `api/x-quote-repost.js` | ✅ impressions === 0 のときはスキップせず投稿許可 |
| X投稿Cron整理 | `vercel.json` | ✅ 引用リポスト12本のみ（x-post-minimal/free-report は削除済み） |
| cron.js 整理 | `api/cron.js` | ✅ 無料版・無料レポートのX投稿呼び出し削除 |

---

## 2. コミット・プッシュ対象（目安）

以下をコミットしてよい。

- **修正**: `services/x/userReplyHandler.js`, `services/x/client.js`, `api/x-quote-repost.js`, `api/cron.js`, `vercel.json`
- **追加**: `scripts/analyze-logs-result-5.js`, `docs/X_POSTING_BUG_FIXES_*.md`, `docs/VERCEL_LOGS_1H_ANALYSIS_*.md`, `docs/READTHROUGH_*.md`, `docs/CHECKLIST_COMMIT_DEPLOY_VERIFY_*.md`

`.history/` や一時ファイルはコミットしない。

---

## 3. 手順

### Step 1: コミット・プッシュ

```bash
git add api/cron.js api/x-quote-repost.js services/x/client.js services/x/userReplyHandler.js vercel.json
git add scripts/analyze-logs-result-5.js docs/X_POSTING_BUG_FIXES_DUPLICATE_AND_TRASH_2026-02-01.md docs/VERCEL_LOGS_1H_ANALYSIS_X_POSTING_2026-02-02.md docs/READTHROUGH_X_POSTING_IMPLEMENTATION_2026-02.md docs/CHECKLIST_COMMIT_DEPLOY_VERIFY_2026-02-02.md
git status   # 確認
git commit -m "fix: X投稿の重複防止・テスト投稿ガード・引用リポスト0許可・Cron整理"
git push
```

（必要に応じて `git add` の対象を増減してください。）

### Step 2: 自動デプロイ

- プッシュ後、Vercel の自動デプロイが走る。
- ダッシュボードでデプロイ完了を確認。

### Step 3: 時間を置く

- 引用リポストは毎時 0,5,10,15,20,25,30,35,40,45,50,55 分に発火。
- 少なくとも **1時間以上** 経過してからログを取得すると検証しやすい。

### Step 4: Vercelログの取得・検証

1. **Vercel** → プロジェクト → **Logs** で、デプロイ後の時間帯のログを取得（例: 1時間分をダウンロード）。
2. 取得したログを `logs_result (6).json` などで保存。
3. 解析スクリプトで集計:

   ```bash
   node scripts/analyze-logs-result-5.js "c:\Users\chiba\Downloads\logs_result (6).json"
   ```

4. **確認したいこと**:
   - `x-quote-repost-*` が呼ばれているか（各言語でログが出ているか）。
   - 「Skipping quote repost … low impressions: 0」が減り、「has no impression data (0) - allowing post」や実際の投稿ログが出ているか。
   - 意図しないエラーや 5xx がないか。

---

## 4. 問題が出た場合

- ログの該当時刻・エンドポイント・メッセージをメモし、再度チャットで共有してもらえれば原因切り分けと修正案を出します。
- 同じスクリプトで別のログファイルを指定すれば、何度でも集計し直せます。

---

**結論**: 必要な改善はコード上完了している。**コミット → プッシュ → 自動デプロイ → 時間を置く → Vercelログ取得 → 上記スクリプトで検証** の流れで進めてよい。
