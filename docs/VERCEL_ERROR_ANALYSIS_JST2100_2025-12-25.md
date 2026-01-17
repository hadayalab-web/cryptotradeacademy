# Vercel エラー分析レポート - JST 21:00配信全滅
**最終更新**: 2026-01-17 14:07:03  
**作成日**: 2026-01-17  

**日時**: 2025-12-25
**対象**: JST 21:00（UTC 12:00）配信失敗
**ログ期間**: 24時間（2025-12-24 13:30 UTC ～ 2025-12-25 13:15 UTC）

---

## 🔴 実行結果サマリー

### 全体的な状況
- **総ログ数**: 464件
- **エラー数（500）**: 100件
- **成功実行（200）**: 364件
- **JST 21:00（UTC 12:00）のエラー**: 8件

### タイムライン

#### ✅ 最後の成功実行
- **時刻**: 2025-12-25 00:45:23 (UTC) = **JST 09:45**
- **デプロイID**: `dpl_7xctBUeLMmAaeMQE2WZBJjJ4HKAe`
- **ステータス**: 200 (成功)

#### ❌ エラー開始
- **最初のエラー**: 2025-12-25 01:00:10 (UTC) = **JST 10:00**
- **エラー発生後**: すべてのCron実行が失敗（500エラー）

#### 📊 エラー発生パターン
- **01:00 UTC (JST 10:00)**: 8エラー
- **02:00 UTC (JST 11:00)**: 8エラー
- **03:00 UTC (JST 12:00)**: 8エラー
- **04:00 UTC (JST 13:00)**: 8エラー
- **05:00 UTC (JST 14:00)**: 8エラー
- **06:00 UTC (JST 15:00)**: 8エラー
- **07:00 UTC (JST 16:00)**: 8エラー
- **08:00 UTC (JST 17:00)**: 8エラー
- **09:00 UTC (JST 18:00)**: 8エラー
- **10:00 UTC (JST 19:00)**: 8エラー
- **11:00 UTC (JST 20:00)**: 8エラー
- **12:00 UTC (JST 21:00)**: 8エラー ⚠️ **配信全滅**
- **13:00 UTC (JST 22:00)**: 4エラー

---

## 🎯 根本原因分析

### エラーメッセージ
```
Cannot find module '../config/marketProfiles'
Require stack:
- /var/task/services/grok/client.js
- /var/task/api/cron.js
Did you forget to add it to "dependencies" in `package.json`?
Node.js process exited with exit status: 1.
```

### デプロイID分析

#### エラーを発生させた3つのデプロイ

1. **`dpl_93umtFsvTWMbi2yz2KevRKwb33`**
   - エラー数: 26件
   - 期間: 2025-12-25 01:00:10 ～ 04:00:10 (UTC)
   - ステータス: 全て `Cannot find module '../config/marketProfiles'`

2. **`dpl_4Z1iqYMpKXQs1TS16yQozymmyD`**
   - エラー数: 36件
   - 期間: 2025-12-25 04:15:21 ～ 08:30:21 (UTC)
   - ステータス: 全て `Cannot find module '../config/marketProfiles'`

3. **`dpl_4nm9UAC4CqS43HRwC8PupLo298XU`** ⚠️ **最新デプロイ**
   - エラー数: 38件
   - 期間: 2025-12-25 08:45:12 ～ 13:15:12 (UTC)
   - ステータス: 全て `Cannot find module '../config/marketProfiles'`

---

## 🔍 問題の詳細

### 1. `vercel.json`の設定状況

現在の`vercel.json`（コミット `9b3812f`、`c1380d9`、`9908118`）:
```json
{
  "crons": [
    { "path": "/api/cron", "schedule": "*/15 * * * *" }
  ],
  "functions": {
    "api/cron.js": {
      "includeFiles": "config/**"
    }
  }
}
```

### 2. 修正履歴

- **9b3812f**: `vercel.json`に`includeFiles: "config/**"`を追加（JST 17:00エラー対応）
- **c1380d9**: 再度修正（重複コミット）
- **9908118**: エラー分析レポート追加（最新コミット）

### 3. 問題点の仮説

#### 仮説A: `includeFiles`の構文が不正
- `config/**`は正しい構文のはずだが、Vercelが認識していない可能性
- もしかすると`config/**/*`や`config/`が必要かもしれない

#### 仮説B: デプロイが古いコードを使用
- 新しいデプロイ（`dpl_4nm9UAC4CqS43HRwC8PupLo298XU`）でも同じエラーが発生
- `vercel.json`の変更がデプロイに反映されていない可能性

#### 仮説C: `includeFiles`が関数固有の設定である必要がある
- `api/cron.js`のみに設定しているが、実際にはより広範囲の設定が必要かもしれない

#### 仮説D: `config/`フォルダがGitリポジトリに含まれていない
- `.gitignore`で除外されている可能性

---

## 📋 確認事項

### ✅ 確認済み
1. `vercel.json`は正しくコミット・プッシュされている
2. `config/marketProfiles.js`はGitリポジトリに存在する
3. ローカルでは`services/grok/client.js`が`../config/marketProfiles`を正しく読み込める

### ❓ 確認が必要
1. Vercel Dashboardで最新デプロイの`vercel.json`が正しく認識されているか
2. `includeFiles`の構文が正しいか（Vercel公式ドキュメントで確認）
3. `config/`フォルダがデプロイバンドルに含まれているか
4. デプロイログで`config/`フォルダが含まれているか確認

---

## 🛠️ 推奨される対処法

### 即座の対応

1. **Vercel Dashboardで最新デプロイを確認**
   - デプロイID: `dpl_4nm9UAC4CqS43HRwC8PupLo298XU`
   - `vercel.json`が正しく認識されているか確認
   - デプロイログで`config/`フォルダが含まれているか確認

2. **`vercel.json`の構文を確認・修正**
   ```json
   {
     "crons": [
       { "path": "/api/cron", "schedule": "*/15 * * * *" }
     ],
     "functions": {
       "api/cron.js": {
         "includeFiles": "config/**/*"
       }
     }
   }
   ```
   または
   ```json
   {
     "crons": [
       { "path": "/api/cron", "schedule": "*/15 * * * *" }
     ],
     "functions": {
       "api/cron.js": {
         "includeFiles": "config/"
       }
     }
   }
   ```

3. **代替案: `config/`を直接`api/`にコピー**
   - ビルド時に`config/`を`api/config/`にコピーするスクリプトを追加
   - より確実だが、構成が複雑になる

4. **代替案: `marketProfiles`を`api/`フォルダ内に移動**
   - `api/config/marketProfiles.js`に移動
   - `services/grok/client.js`のインポートパスを修正

### 根本的な解決策

1. **Vercelのデプロイバンドルを確認**
   - Vercel CLIでローカルビルドを実行し、バンドル内容を確認
   ```bash
   vercel build --prod
   ```

2. **Vercel公式ドキュメントで`includeFiles`の正確な構文を確認**
   - 最新のドキュメントを参照

3. **デプロイログの詳細確認**
   - Vercel Dashboardでデプロイログを確認し、`config/`フォルダが含まれているか確認

---

## 📊 統計データ

### エラー発生率
- **総実行数**: 464件
- **エラー数**: 100件（21.6%）
- **成功数**: 364件（78.4%）

### 時間帯別エラー発生率
- **正常時（2025-12-24 13:30 ～ 2025-12-25 00:45）**: 0%
- **エラー時（2025-12-25 01:00 ～ 13:15）**: 100%

### デプロイID別エラー数
| デプロイID | エラー数 | 期間 |
|-----------|---------|------|
| `dpl_93umtFsvTWMbi2yz2KevRKwb33` | 26 | 01:00-04:00 UTC |
| `dpl_4Z1iqYMpKXQs1TS16yQozymmyD` | 36 | 04:15-08:30 UTC |
| `dpl_4nm9UAC4CqS43HRwC8PupLo298XU` | 38 | 08:45-13:15 UTC |

---

## ⚠️ 重要な発見

1. **3つの連続したデプロイが全て同じエラーを発生**
   - これは`vercel.json`の修正が反映されていないことを示唆
   - または、`includeFiles`の構文が正しくない可能性

2. **成功したデプロイ（`dpl_7xctBUeLMmAaeMQE2WZBJjJ4HKAe`）とエラーが発生したデプロイの違い**
   - 成功デプロイは2025-12-25 00:45まで動作
   - その後、新しいデプロイがデプロイされ、エラーが開始

3. **JST 21:00（UTC 12:00）の配信全滅**
   - この時点で既に8時間以上エラーが続いていた
   - 最新のデプロイ（`dpl_4nm9UAC4CqS43HRwC8PupLo298XU`）でもエラーが継続

---

## 🔄 次のステップ

1. **Vercel Dashboardで最新デプロイの詳細を確認**
2. **`vercel.json`の構文をVercel公式ドキュメントで確認**
3. **必要に応じて`includeFiles`の構文を修正**
4. **修正後、新しいコミット・プッシュで再デプロイ**
5. **デプロイ完了後、次回のCron実行（15分後）で動作確認**

---

**作成日時**: 2026-01-17 14:07:03
**分析対象**: 24時間のVercelログ（464件）
**エラー件数**: 100件（全て同じエラー）



