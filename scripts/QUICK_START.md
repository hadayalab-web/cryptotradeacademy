# 🚨 緊急: インフルエンサーストック復旧 - クイックスタート

## ✅ 最も簡単な方法（推奨）

### ステップ1: バッチファイルを実行

```bash
scripts\emergency-rebuild-influencer-stock.bat
```

**これだけです！** バッチファイルには環境変数が設定済みです。

---

## 📋 実行前の確認

### 必要な環境変数（バッチファイルに設定済み）
- ✅ KV_REST_API_URL
- ✅ KV_REST_API_TOKEN
- ✅ KV_URL
- ✅ REDIS_URL

### 追加で必要な環境変数
- ⚠️ **XAI_API_KEY** - これだけ手動で設定が必要です

---

## 🔧 XAI_API_KEYの設定方法

### 方法1: 環境変数として設定（推奨）

**PowerShellの場合:**
```powershell
$env:XAI_API_KEY="your_xai_api_key_here"
```

**コマンドプロンプトの場合:**
```cmd
set XAI_API_KEY=your_xai_api_key_here
```

### 方法2: バッチファイルを編集

`scripts\emergency-rebuild-influencer-stock.bat`を開いて、以下の行を追加：

```batch
set XAI_API_KEY=your_xai_api_key_here
```

---

## 🚀 実行手順（完全版）

### 1. PowerShellまたはコマンドプロンプトを開く

### 2. プロジェクトディレクトリに移動
```bash
cd c:\Users\chiba\hadayalab-automation-platform\cryptotradeacademy
```

### 3. XAI_API_KEYを設定
```powershell
# PowerShellの場合
$env:XAI_API_KEY="your_xai_api_key_here"
```

### 4. バッチファイルを実行
```bash
scripts\emergency-rebuild-influencer-stock.bat
```

---

## ⏱️ 実行時間

- **全言語の再構築**: 約30-60秒
- **単一言語**: 約5-10秒

---

## ✅ 実行後の確認

実行が完了したら、以下で確認できます：

```bash
scripts\check-kv-direct.bat
```

期待される結果：
- en: 150人以上
- es: 76人以上
- pt-br: 58人以上
- ar: 40人以上
- ja: 40人以上
- ko: 22人以上
- **合計: 386人以上**

---

## 🆘 トラブルシューティング

### エラー: XAI_API_KEY not set
→ XAI_API_KEYを設定してください（上記参照）

### エラー: KV接続エラー
→ バッチファイル内の環境変数を確認してください

### タイムアウトエラー
→ 単一言語ずつ実行してください：
```bash
node scripts/update-influencer-stock.js --lang=en
node scripts/update-influencer-stock.js --lang=es
# ... など
```

---

## 📞 サポート

問題が解決しない場合は、エラーメッセージを確認してください。
