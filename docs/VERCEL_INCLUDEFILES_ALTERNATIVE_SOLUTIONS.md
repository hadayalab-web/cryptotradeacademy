# Vercel includeFiles 代替解決策 - 2025-12-25

**問題**: `includeFiles: ["config/**"]` が正しく動作していない
**エラー**: `Cannot find module '../config/marketProfiles'`

---

## 🔍 現在の設定

```json
{
  "functions": {
    "api/cron.js": {
      "includeFiles": ["config/**"]
    }
  }
}
```

---

## 🔧 代替解決策

### 解決策1: includeFilesのパスを変更

#### 案1-1: より明示的なパス

```json
{
  "functions": {
    "api/cron.js": {
      "includeFiles": ["config/**/*", "config/*"]
    }
  }
}
```

#### 案1-2: ファイルを明示的に指定

```json
{
  "functions": {
    "api/cron.js": {
      "includeFiles": [
        "config/marketProfiles.js",
        "config/thresholds.js"
      ]
    }
  }
}
```

#### 案1-3: ディレクトリ全体を指定

```json
{
  "functions": {
    "api/cron.js": {
      "includeFiles": ["config"]
    }
  }
}
```

---

### 解決策2: ビルドスクリプトでconfig/をapi/にコピー

#### package.jsonにビルドスクリプトを追加

```json
{
  "scripts": {
    "build": "node scripts/copy-config.js",
    "vercel-build": "npm run build"
  }
}
```

#### scripts/copy-config.jsを作成

```javascript
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../config');
const dest = path.join(__dirname, '../api/config');

// api/configディレクトリを作成
if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
}

// config/内のファイルをコピー
fs.readdirSync(src).forEach(file => {
  fs.copyFileSync(
    path.join(src, file),
    path.join(dest, file)
  );
});

console.log('config/フォルダをapi/config/にコピーしました');
```

#### vercel.jsonを更新

```json
{
  "buildCommand": "npm run build",
  "functions": {
    "api/cron.js": {}
  }
}
```

#### services/grok/client.jsのインポートパスを変更

```javascript
// 変更前
const { getMarketProfile } = require('../config/marketProfiles');

// 変更後
const { getMarketProfile } = require('./config/marketProfiles');
```

---

### 解決策3: config/フォルダをapi/内に移動（構造変更）

#### ファイル構造を変更

```
api/
  config/
    marketProfiles.js
    thresholds.js
  cron.js
```

#### services/grok/client.jsのインポートパスを変更

```javascript
// 変更前
const { getMarketProfile } = require('../config/marketProfiles');

// 変更後（api/からの相対パス）
const { getMarketProfile } = require('../api/config/marketProfiles');
```

**注意**: この方法は構造変更が必要で、他のファイルへの影響も確認が必要

---

### 解決策4: Vercelのファイルシステムの確認

Vercelのデプロイログで、config/フォルダが実際に含まれているか確認する必要があります。

---

## 🎯 推奨される解決策

### 優先順位

1. **解決策1-1**: `includeFiles: ["config/**/*", "config/*"]` を試す（最も簡単）
2. **解決策1-2**: ファイルを明示的に指定（確実だが保守性が低い）
3. **解決策2**: ビルドスクリプトでコピー（確実で構造変更不要）
4. **解決策3**: 構造変更（最後の手段）

---

## 📋 実装手順（解決策1-1）

1. `vercel.json`を更新:
   ```json
   {
     "functions": {
       "api/cron.js": {
         "includeFiles": ["config/**/*", "config/*"]
       }
     }
   }
   ```

2. コミット・プッシュ:
   ```bash
   git add vercel.json
   git commit -m "fix: Update includeFiles pattern to include all config files"
   git push origin main
   ```

3. Vercelでデプロイを確認

4. 最新ログで動作確認

---

**作成日時**: 2025-12-25
**目的**: includeFilesが正しく動作しない問題の代替解決策


