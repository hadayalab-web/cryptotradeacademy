# DM挿入用VSL（Video Sales Letter）参照

**作成日時**: 2026-01-13  
**用途**: DMメッセージに挿入するVSL動画

---

## 📹 VSL情報

### HeyGen埋め込みプレーヤー

**URL**: `https://app.heygen.com/embedded-player/3aaf47b98f4b49c59c14999a16038af3`

**埋め込みコード**:
```html
<iframe width="560" height="315" src="https://app.heygen.com/embedded-player/3aaf47b98f4b49c59c14999a16038af3" title="HeyGen ビデオプレーヤー" frameborder="0" allow="encrypted-media; fullscreen;" allowfullscreen></iframe>
```

**タイトル**: HeyGen ビデオプレーヤー

---

## 🎯 使用方法

### DMメッセージへの挿入

このVSLはDMメッセージ（Telegram/Email）に挿入されます。

**Telegram**: 
- Telegramは埋め込みiframeをサポートしていないため、VSLのURLをリンクとして送信
- または、VSLのスクリプトテキストをDMメッセージに含める

**Email**:
- HTMLメールとして送信する場合、埋め込みiframeを使用可能
- テキストメールの場合は、VSLのURLをリンクとして送信

---

## 📝 DMメッセージテンプレートへの統合

### テンプレート例

```
🚀 Exclusive Offer: Trap Defence BTC

Hi [DISPLAY_NAME],

We're launching Trap Defence BTC - a revolutionary tool to protect your crypto trades.

📹 Watch our VSL: [VSL_URL]

🎯 Key Features:
- Trap Defense Engine
- Real-time market analysis
- 70% wait strategy

💰 Special Offer: Limited time pricing

🚀 Get started: [WHOP_URL]
```

**変数**:
- `[DISPLAY_NAME]`: ユーザーの表示名
- `[VSL_URL]`: VSLのURL（`https://app.heygen.com/embedded-player/3aaf47b98f4b49c59c14999a16038af3`）
- `[WHOP_URL]`: WhopページのURL

---

## 🔗 関連ファイル

- **VSLスクリプト**: `docs/` 内のVSLスクリプトファイル（確認が必要）
- **DMメッセージテンプレート**: `data/dm-templates-en.json`（作成予定）
- **DMメッセージ**: `data/dm-messages-en.json`（Gemini CMOが作成）

---

## ✅ 次のステップ

1. ✅ VSLのURLを記録（完了）
2. ⏳ CSVファイルの作成を待機（M365 Copilotで作成中）
3. 📝 DMメッセージテンプレートにVSL URLを統合
4. 🤖 Gemini CMOがDMメッセージを作成する際にVSL URLを含める

---

**作成日時**: 2026-01-13  
**報告者**: COO兼CTO（Cursor/Composer 1）
