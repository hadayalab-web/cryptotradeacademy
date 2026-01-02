# Grokモデル更新ガイド

## 現在の設定

- **GROK_MODEL_REASONING**: `grok-4-0709`
- **GROK_MODEL_LIVE**: `GROK_MODEL_REASONING`と同じ（デフォルト）

## grok-4-1-fast-reasoningへの更新手順

### 1. .envファイルの更新

`C:\Users\chiba\hadayalab-automation-platform\.env`ファイルを編集：

```bash
# 変更前
GROK_MODEL_REASONING=grok-4-0709

# 変更後
GROK_MODEL_REASONING=grok-4-1-fast-reasoning
GROK_MODEL_LIVE=grok-4-1-fast-reasoning
```

### 2. コードでの確認

`services/grok/client.js`では既に環境変数を読み込む実装になっているため、コード変更は不要です：

```javascript
const GROK_MODEL_REASONING = process.env.GROK_MODEL_REASONING || 'grok-4-0709';
const GROK_MODEL_LIVE = process.env.GROK_MODEL_LIVE || GROK_MODEL_REASONING;
```

### 3. 使用箇所

- **GROK_MODEL_REASONING**: `analyzeMarket`関数（市場分析）
- **GROK_MODEL_LIVE**: `analyzeXSentimentLive`関数（Xセンチメント分析）

### 4. 動作確認

環境変数を更新後、アプリケーションを再起動して動作を確認してください。

---

**注意**: `.env`ファイルを直接編集する場合は、バックアップを取ることをお勧めします。

