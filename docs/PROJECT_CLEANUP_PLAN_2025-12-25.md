# 🗂️ プロジェクト整理計画 - 2025-12-25
**最終更新**: 2026-01-17 14:07:03  
**作成日**: 2026-01-17  

**整理日時**: 2025-12-25
**対象**: `C:\Users\chiba\cryptosignal-ai`

---

## 📋 整理方針

### 1. アーカイブフォルダ構成
```
_archive/
  └── 2025-12-25/
      ├── documents/          # 一時ドキュメント
      ├── verification/       # 検証関連ドキュメント
      ├── completion/         # 完了報告ドキュメント
      ├── logs/              # 一時ログファイル
      ├── backups/           # バックアップファイル
      └── empty-files/       # 空ファイル
```

---

## 🔍 整理対象ファイル

### A. ルートディレクトリの一時ドキュメント（`docs/`に移動すべき）

**検証関連**:
- `CRYPTOQUANT_API_VERIFICATION_COMPLETE.md`
- `CRYPTOQUANT_API_VERIFICATION_FINAL.md`
- `CRYPTOQUANT_API_VERIFICATION_RESULT.md`
- `CRYPTOQUANT_API_VERIFICATION_SUMMARY.md`
- `CRYPTOQUANT_ENDPOINT_CORRECTIONS.md`
- `CRYPTOQUANT_ENDPOINTS_NOT_AVAILABLE.md`
- `API_VERIFICATION_TASK_SUMMARY.md`

**Copilot Review関連**:
- `COPILOT_REVIEW_RESULT_PR10.md`
- `COPILOT_REVIEW_RESULT_PR12.md`
- `COPILOT_REVIEW_RESULT_PR14.md`
- `COPILOT_REVIEW_COMMENT.md`
- `COPILOT_AGENTS_API_VERIFICATION_REQUEST.md`
- `COPILOT_AGENT_BACKTEST_REQUEST.md`
- `COPILOT_AGENTS_TASK_ASSIGNMENT_SUMMARY.md`

**完了報告関連**:
- `ALGORITHM_UPDATE_COMPLETION_STATUS.md`
- `COMPLETION_FINAL_REPORT.md`
- `FINAL_TASKS_COMPLETION.md`
- `PROJECT_COMPLETION_SUMMARY.md`
- `README_COMPLETION_STATUS.md`

**その他の一時ドキュメント**:
- `PR14_COMPATIBILITY_FIXES.md`
- `PR14_IMPACT_ANALYSIS.md`
- `PR_BODY_TEST_SUITE.md`
- `PR_REVIEW_LINKS.md`
- `TEST_SUITE_IMPLEMENTATION_SUMMARY.md`

---

### B. 一時ログファイル

**Vercelログ**:
- `docs/vercel_log/logs_result_ar.csv`
- `docs/vercel_log/logs_result_en.csv`
- `docs/vercel_log/logs_result_es.csv`
- `docs/vercel_log/logs_result_ja.csv`
- `docs/vercel_log/logs_result_ko.csv`
- `docs/vercel_log/logs_result_ptbr.csv`

**注意**: `docs/vercel_log/`フォルダ全体をアーカイブ（将来の参照のため）

---

### C. バックアップファイル

- `vercel.json.bak`

---

### D. 空ファイル（確認が必要）

**確認が必要な空ファイル**:
- `logic/tier2_altseason/ethFlow.js` (0バイト)
- `logic/tier2_altseason/stablecoinPower.js` (0バイト)
- `logic/tier3_alpha/whaleDump.js` (0バイト)
- `logic/tier3_alpha/tokenVelocity.js` (0バイト)
- `services/cryptoquant/endpoints/eth.js` (0バイト)
- `services/cryptoquant/endpoints/erc20.js` (0バイト)
- `services/cryptoquant/endpoints/stablecoins.js` (0バイト)
- `services/cryptoquant/utils.js` (0バイト)
- `services/telegram/messages/admin/notification.js` (0バイト)

**判断**: 将来実装予定のプレースホルダーファイルの可能性があるため、アーカイブに移動（削除せず）

---

## ✅ 保持するファイル

### 重要なドキュメント（`docs/`に移動またはそのまま保持）

**重要ドキュメント**:
- `docs/CryptoTrade Academy - *.md` → 保持
- `docs/MAINTENANCE_*.md` → 保持（最新メンテナンス情報）
- `docs/DEPLOYMENT_*.md` → 保持（最新デプロイ情報）
- `docs/POST_DEPLOYMENT_VERIFICATION_*.md` → 保持（検証予定）
- `docs/VERCEL_LOG_REVIEW_*.md` → 保持（重要なレビュー）
- `docs/cryptoquant-reference.md` → 保持（リファレンス）
- `docs/COPILOT_REVIEW_REQUEST_TEMPLATE.md` → 保持（テンプレート）

---

## 📊 整理後の構造

### ルートディレクトリ
```
cryptosignal-ai/
├── api/
├── config/
├── data/
├── docs/                    # 主要ドキュメントのみ
├── logic/
├── node_modules/
├── scripts/
├── services/
├── utils/
├── _archive/                # 新規作成（アーカイブ）
├── package.json
├── package-lock.json
├── vercel.json
└── README.md
```

---

## 🎯 整理手順

1. `_archive/2025-12-25/`フォルダ構造を作成
2. 上記A〜Dのファイルを適切なサブフォルダに移動
3. 移動後のフォルダ構造を確認
4. `.gitignore`に`_archive/`を追加（オプション）

---

**作成日時**: 2026-01-17 14:07:03





