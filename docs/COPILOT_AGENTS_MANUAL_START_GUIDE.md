# GitHub Copilot Agents 手動起動手順 - PR #18
**最終更新**: 2026-01-17 14:07:03  
**作成日**: 2026-01-17  

**PR #18**: https://github.com/hadayalab-web/cryptosignal-ai/pull/18

---

## ⚠️ 重要: Copilot Agentsは手動起動が必要です

GitHub Copilot Agentsは、GitHub.com上で手動で起動する必要があります。CLI経由のコメントだけでは自動起動しません。

---

## 🚀 手動起動の手順

### 方法1: PRのCopilot Agentsパネルから起動（推奨）

1. **PR #18を開く**
   - https://github.com/hadayalab-web/cryptosignal-ai/pull/18

2. **Copilot Agentsパネルを開く**
   - PRページの右上またはサイドバーの「**Copilot Agents**」または「**Ask Copilot**」ボタンをクリック
   - または、コメント欄で `@` キーを押してCopilot Chatを開く

3. **以下の依頼内容を入力**

```
Vercelデプロイエラーを修正してください。

問題: `vercel.json`の`includeFiles`設定が機能せず、`Cannot find module '../config/marketProfiles'`エラーが発生しています。

依存関係の構造:
- api/cron.js → services/grok/client.js → config/marketProfiles.js

現在の設定: `includeFiles: ["config/**/*", "config/*"]`

試行した修正（すべて失敗）:
1. `"includeFiles": "config/**"` (文字列)
2. `"includeFiles": ["config/**"]` (配列)
3. `"includeFiles": ["config/**/*", "config/*"]` (明示的パターン)

依頼事項:
1. 根本原因の特定
2. 修正案の提案
3. 修正の実装

詳細: docs/COPILOT_VERCEL_DEBUG_REQUEST_2025-12-25.md
```

4. **送信してCopilot Agentsの作業開始を待つ**

---

### 方法2: PRのコメント欄から直接依頼

1. **PR #18のコメント欄を開く**
   - https://github.com/hadayalab-web/cryptosignal-ai/pull/18

2. **以下のコメントを入力**

```markdown
@copilot Please review and fix the Vercel deployment error.

**Error**: `Cannot find module '../config/marketProfiles'`
**Issue**: `includeFiles` configuration is not working
**Dependency chain**: `api/cron.js` → `services/grok/client.js` → `config/marketProfiles.js`

Please investigate the root cause and implement a fix.
See: `docs/COPILOT_VERCEL_DEBUG_REQUEST_2025-12-25.md`
```

3. **コメントを投稿**

---

### 方法3: GitHub.comのCopilot Agentsダッシュボードから起動

1. **GitHub.comのCopilot Agentsダッシュボードを開く**
   - リポジトリページの「**Agents**」タブをクリック
   - または、https://github.com/hadayalab-web/cryptosignal-ai/pulls を開く

2. **新しいタスクを作成**
   - 「**New task**」または「**Ask Copilot**」をクリック

3. **PR #18を指定して依頼内容を入力**

---

## 📋 確認事項

### Copilot Agentsが起動しない場合

1. **GitHub Copilot Proの有効化を確認**
   - Settings → Copilot で確認
   - https://github.com/settings/copilot

2. **リポジトリへの書き込み権限を確認**
   - Copilot Agentsは書き込み権限が必要です

3. **Copilot AgentsがPRに割り当てられているか確認**
   - PRページでCopilot Agentsの状態を確認

4. **セッションのタイムアウトを確認**
   - 1時間後にタイムアウトするため、再起動が必要な場合があります

---

## 🔗 関連リンク

- **PR #18**: https://github.com/hadayalab-web/cryptosignal-ai/pull/18
- **詳細ドキュメント**: `docs/COPILOT_VERCEL_DEBUG_REQUEST_2025-12-25.md`
- **GitHub Copilot Agents ドキュメント**: https://docs.github.com/en/copilot/how-tos/agents

---

**作成日時**: 2026-01-17 14:07:03

