# MCPサーバーエラー トラブルシューティングガイド

## エラー内容

```
Request ID: d7931344-800a-4458-b457-a0dd179faa14
{"error":"ERROR_CUSTOM_MESSAGE","details":{"title":"Model returned error","detail":"The model returned an error. Try disabling MCP servers, or switch models."}}
```

このエラーは、MCPサーバーのいずれかが問題を起こしている可能性があります。

## 現在のMCPサーバー設定

以下の8つのMCPサーバーが設定されています：

1. **heygen** - HeyGen動画作成
2. **gemini** - Gemini (CKO兼CMO)
3. **xai** - XAI/Grok (CFO兼CRO兼CSO)
4. **gpt** - GPT-5.2 (CTO兼CPO)
5. **telegram** - Telegram配信
6. **whop-official** - Whop公式MCP
7. **resend** - Resendメール送信
8. **cryptoquant-verification** - CryptoQuant検証

## 解決方法

### 方法1: すべてのMCPサーバーを一時的に無効化（推奨）

エラーを解決するために、まずすべてのMCPサーバーを無効化します。

#### PowerShellで実行:

```powershell
cd c:\Users\chiba\hadayalab-automation-platform
powershell -ExecutionPolicy Bypass -File scripts/disable-all-mcp-servers.ps1
```

#### Pythonで実行:

```powershell
cd c:\Users\chiba\hadayalab-automation-platform
python scripts/disable-all-mcp-servers.py
```

#### 手動で実行:

1. `%USERPROFILE%\.cursor\mcp.json` を開く
2. `mcpServers` セクションを空のオブジェクト `{}` に置き換える
3. ファイルを保存

### 方法2: Cursorを再起動

MCP設定を変更した後、**Cursorを完全に再起動**してください。

### 方法3: エラーが解決したか確認

1. Cursorを再起動後、エラーが発生しないか確認
2. エラーが解決した場合、次は問題のあるサーバーを特定します

### 方法4: 問題のあるサーバーを特定（段階的復元）

エラーが解決したら、1つずつサーバーを有効化して問題のあるサーバーを特定します。

#### 復元スクリプトを使用:

```powershell
cd c:\Users\chiba\hadayalab-automation-platform
python scripts/restore-mcp-servers.py
```

#### 手動で復元:

1. `%USERPROFILE%\.cursor\mcp.json.backup.*.json` ファイルを確認
2. 最新のバックアップファイルを `mcp.json` にコピー
3. 1つずつサーバーを削除して、エラーが発生するか確認

## バックアップファイルの場所

バックアップファイルは以下の場所に保存されます：

```
%USERPROFILE%\.cursor\mcp.json.backup.YYYYMMDD_HHMMSS.json
```

## 推奨される対応手順

1. ✅ **すべてのMCPサーバーを無効化**
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/disable-all-mcp-servers.ps1
   ```

2. ✅ **Cursorを完全に再起動**

3. ✅ **エラーが解決したか確認**

4. ✅ **必要に応じて、段階的にサーバーを復元**
   - まず重要なサーバー（gemini, gpt, xai）から復元
   - 1つずつ追加して、エラーが発生するサーバーを特定

5. ✅ **問題のあるサーバーを特定したら、そのサーバーを無効化**

## 個別サーバーの無効化

特定のサーバーだけを無効化したい場合：

### HeyGen MCPを無効化:

```powershell
python scripts/disable-heygen-mcp.py
```

### その他のサーバー:

`mcp.json` を編集して、該当するサーバー設定を削除してください。

## 設定ファイルの場所

- **MCP設定ファイル**: `%USERPROFILE%\.cursor\mcp.json`
- **バックアップファイル**: `%USERPROFILE%\.cursor\mcp.json.backup.*.json`

## 追加のトラブルシューティング

### MCPサーバーの状態確認

Cursorの **Settings** → **Tools & MCP** で各サーバーの状態を確認できます。

### ログの確認

MCPサーバーのエラーログは、Cursorの開発者ツールで確認できます：
1. `Ctrl+Shift+I` で開発者ツールを開く
2. Consoleタブでエラーメッセージを確認

### APIキーの確認

`.env` ファイルに必要なAPIキーが設定されているか確認してください：

- `XAI_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `HEYGEN_API_KEY`
- `RESEND_API_KEY`
- `WHOP_API_KEY`
- `TELEGRAM_BOT_TOKEN_*`
- `CRYPTOQUANT_API_KEY`

## 参考ドキュメント

- [Executive MCP Setup](./EXECUTIVE_MCP_SETUP.md)
- [MCP Tools Optimization Guide](./setup/MCP_TOOLS_OPTIMIZATION_GUIDE.md)

---

**最終更新**: 2026-01-02  
**作成者**: COO (Composer 1)
