# CryptoQuant API リファレンス

このドキュメントは、CryptoQuant APIの公式ドキュメントとカタログへのクイックアクセスを提供します。

## 📚 公式リファレンス

### API ドキュメント
- **URL**: https://cryptoquant.com/docs
- **説明**: CryptoQuant APIの完全なドキュメント
- **用途**: APIエンドポイント、認証方法、リクエスト/レスポンス形式の確認

### API カタログ
- **URL**: https://cryptoquant.com/catalog
- **説明**: 利用可能なすべてのAPIエンドポイントとデータセットのカタログ
- **用途**: 利用可能なデータセットの検索、エンドポイントの一覧確認

---

## 🔗 クイックアクセス

### ブラウザブックマーク
以下のURLをブラウザのブックマークに追加することを推奨します：

```
📖 CryptoQuant Docs: https://cryptoquant.com/docs
📦 CryptoQuant Catalog: https://cryptoquant.com/catalog
```

### VS Code / Cursor クイックオープン
このファイルを開くには：
- `Ctrl+P` (Windows) / `Cmd+P` (Mac) を押す
- `cryptoquant-reference` と入力

### ローカル保存スクリプト
ドキュメントをローカルに保存するには、以下のPowerShellスクリプトを実行：

```powershell
# プロジェクトルートから実行
.\scripts\fetch-cryptoquant-docs.ps1

# ダウンロード後に自動でリファレンスファイルを開く
.\scripts\fetch-cryptoquant-docs.ps1 -OpenAfterDownload
```

**注意**: Cloudflareのチャレンジがある場合、スクリプトでは取得できない可能性があります。その場合は、ブラウザから手動でアクセスしてください。

---

## 📝 使用例

### API認証
```bash
# API Keyを使用した認証例
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.cryptoquant.com/v1/...
```

### よく使用するエンドポイント
（実際の使用時にカタログから確認してください）

---

## 🔄 更新履歴

- 2024-XX-XX: 初版作成

---

## 💡 ヒント

1. **オフライン参照**: 重要なエンドポイントの情報は、このファイルに追記して保存することを推奨します
2. **定期確認**: APIの更新があるため、定期的に公式ドキュメントを確認してください
3. **MCP統合**: 将来的にMCPリソースとして統合する可能性があります

---

## 📞 サポート

- **公式ドキュメント**: https://cryptoquant.com/docs
- **サポート**: CryptoQuant公式サイトのサポートページを参照

