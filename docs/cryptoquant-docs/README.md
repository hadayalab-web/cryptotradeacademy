# CryptoQuant ドキュメント保存ディレクトリ

このディレクトリには、CryptoQuantのAPIドキュメントとカタログを保存します。

## 📁 ファイル構成

```
cryptoquant-docs/
├── README.md (このファイル)
├── docs.html (APIドキュメント - 手動で保存)
├── catalog.html (APIカタログ - 手動で保存)
└── docs-structured.md (構造化されたドキュメント - 自動生成または手動作成)
```

## 🔄 更新方法

### 方法1: ブラウザから手動保存（推奨）

1. ブラウザで https://cryptoquant.com/docs にアクセス
2. Cloudflareのチャレンジを通過
3. ページを右クリック → 「名前を付けて保存」または「ページを保存」
4. `docs.html` としてこのディレクトリに保存

同様に、https://cryptoquant.com/catalog も `catalog.html` として保存

### 方法2: ブラウザの開発者ツールを使用

1. ブラウザでページを開く（Cloudflareチャレンジ通過後）
2. `F12` で開発者ツールを開く
3. `Elements` タブでHTMLを確認
4. `<html>` タグを右クリック → `Copy` → `Copy outerHTML`
5. コピーした内容を `docs.html` に保存

### 方法3: スクリプトで取得（Cloudflare通過後）

```powershell
# ブラウザで一度アクセスしてCloudflareを通過した後、
# 同じセッションでスクリプトを実行
.\scripts\fetch-cryptoquant-docs.ps1
```

## 📝 構造化ドキュメントの作成

HTMLファイルを保存した後、重要な情報を抽出して `docs-structured.md` に構造化して保存することを推奨します。

### 抽出すべき情報

- APIエンドポイント一覧
- 認証方法
- リクエスト/レスポンス形式
- エラーハンドリング
- レート制限情報
- 使用例

## 🔍 Cursorでの参照

Cursorはこのディレクトリ内のファイルを自動的に読み込むことができます。

### 検索方法

```
# Cursor Chatで
「CryptoQuantのAPIドキュメントを確認して」
「CryptoQuantのカタログからエンドポイントを探して」
```

Cursorは `docs/cryptoquant-docs/` 内のファイルを参照します。


