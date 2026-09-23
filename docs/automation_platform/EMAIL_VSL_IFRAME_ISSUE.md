# Email送信時のVSL iframe問題と解決策

**作成日時**: 2026-01-13  
**問題**: Gmailがiframeタグをブロックするため、VSLが表示されない

---

## ⚠️ 問題点

### 現在の状況

- ✅ DMメッセージにはiframeタグが含まれている
- ✅ Email送信は成功している
- ❌ **GmailでVSLのiframeが表示されない**

### 原因

**Gmailはセキュリティ上の理由でiframeタグをブロックします**

- Gmailは外部コンテンツの埋め込みを制限
- iframeタグは削除されるか、表示されない
- これはGmailの標準的な動作

---

## ✅ 解決策

### Email送信時にiframeタグをVSL URLリンクに変換

**実装方法**:
1. iframeタグを検出
2. `src`属性からVSL URLを抽出
3. クリック可能なボタンリンクに変換

**変換例**:
```html
<!-- 変換前 -->
<iframe width="560" height="315" src="https://app.heygen.com/embedded-player/..." ...></iframe>

<!-- 変換後 -->
<div style="margin: 20px 0; text-align: center;">
  <a href="https://app.heygen.com/videos/3aaf47b98f4b49c59c14999a16038af3" 
     style="display: inline-block; padding: 15px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
    📹 Watch Our VSL Video
  </a>
</div>
```

---

## 🔧 実装内容

### `scripts/send-ceo-test-dm-csv.ts`

Email送信時に以下の処理を追加：

1. **iframeタグの検出と変換**
   ```typescript
   .replace(/<iframe[^>]*src=["']([^"']+)["'][^>]*>.*?<\/iframe>/gi, (match, url) => {
     const vslUrl = process.env.HEYGEN_VSL_SHARE_URL || 'https://app.heygen.com/videos/3aaf47b98f4b49c59c14999a16038af3';
     return `<div style="...">
       <a href="${vslUrl}" style="...">📹 Watch Our VSL Video</a>
     </div>`;
   })
   ```

2. **HTMLエスケープ処理**
   - 改行を`<br>`に変換
   - 既存のHTMLタグを保護

---

## 📊 期待される結果

### Email受信時

- ✅ VSLへのクリック可能なボタンリンクが表示される
- ✅ ボタンをクリックすると、VSLページが開く
- ✅ メッセージの他の部分は正常に表示される

### Telegram送信時

- ✅ iframeタグは削除される（既存の処理）
- ✅ VSL URLがテキストリンクとして送信される

---

## 🎯 次のステップ

1. ✅ **Email送信時のiframe変換処理を実装**（完了）
2. ⏳ **再テスト送信を実行**
3. ⏳ **GmailでVSLリンクが正しく表示されることを確認**

---

## 📝 注意事項

1. **Gmailの制限**: Gmailはiframeをサポートしていないため、リンクに変換する必要がある
2. **他のメールクライアント**: Outlook、Apple Mailなどもiframeをブロックする可能性がある
3. **推奨アプローチ**: Emailでは常にVSL URLをリンクとして提供する

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
