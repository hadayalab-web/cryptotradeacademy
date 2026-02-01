# プロモーション用TG配信の見直し（2026-01-31）

有料版（Regular Briefing）・無料版（Minimal Version）とは別の、**プロモーション用TG配信（VSL1/VSL2）** を整理し、Whop URL・プロモコードを一元化した。

---

## プロモTG配信の構成

| 種別 | 概要 | 配信先 | Cron |
|------|------|--------|------|
| **VSL1** | オプトイン誘導（YouTube + Telegram Deep Link） | **X のみ**（TGチャンネルには配信しない） | 0 1,13,21 * * *（1日3回） |
| **VSL1 Reminder** | VSL1未視聴ユーザーへのリマインド | TG DM | 0 */12 * * *（12時間ごと） |
| **VSL2** | アップセル/クーポン（Whop 50% OFF） | **TG DM**（無料版ユーザー個別） | vsl2-post は無効、vsl2-free-users で配信 |
| **VSL2 Free Users** | 無料版登録ユーザーへVSL2を送信 | TG DM | 0 * * * *（1時間ごと） |
| **VSL2 Last Call** | 終了直前リマインド（24h以内の成約促進） | TG DM | 0 * * * *（1時間ごと） |
| **Promo Stock Monitor** | プロモコード残り枠監視・リマインド | 内部/メール | */15 * * * *（15分ごと） |

---

## 見直し内容

### 1. Whop URL・プロモコードの一元化

**変更前**: 各API（vsl2-post, vsl2-free-users, vsl2-last-call）で  
- 有料版URLを `aio-media-llc/trap-defence-btc-*` でハードコード  
- プロモコードを `DEFEND50` でハードコード  

**変更後**:  
- **有料版URL**: `services/telegram/whop-links.js` の `getWhopProductUrl(lang)` を使用（trapdefence/btc-regular-*）  
- **プロモコード**: `services/telegram/whop-links.js` の `getPromoCode()` を使用（デフォルト: defend50）  

### 2. 修正したファイル

| ファイル | 変更内容 |
|----------|----------|
| **api/vsl2-post.js** | ローカル `WHOP_PRODUCT_URLS`・`PROMO_CODE` を削除。`getWhopProductUrl`, `getPromoCode` を whop-links から使用。 |
| **api/vsl2-free-users.js** | 同上。VSL2メッセージ・インラインボタンの Whop URL とプロモを whop-links に統一。 |
| **api/vsl2-last-call.js** | 同上。Last Call メッセージ・インラインボタンの Whop URL とプロモを whop-links に統一。 |

### 3. 変更していないファイル（参照のみ）

- **services/telegram/messages/vsl1.js** … VSL1は YouTube + Deep Link のみ。Whop URLは使わない。  
- **services/telegram/messages/vsl2.js** … 引数で `whopUrl`, `promoCode` を受け取るため、呼び出し元を修正すれば自動的に新URL・defend50 が使われる。  
- **services/telegram/messages/vsl2-last-call.js** … 同上。  
- **services/gemini/messageOptimizer.js** … VSL2最適化時に呼び出し元から渡される `whopUrl`, `promoCode` をそのまま使用。  
- **services/whop/promo-monitor.js** … 既に trapdefence URL と defend50 に更新済み（別PRで対応）。  

---

## プロモTG配信の流れ（確認用）

```
[VSL1] X に投稿（YouTube + t.me/...?start=minimal_*）
         ↓
  ユーザーが Deep Link で Bot 開始 → 無料版（Minimal）登録
         ↓
[VSL2 Free Users] 無料版ユーザーに TG DM で VSL2 送信（Whop 50% OFF + プロモコード）
         ↓
[VSL2 Last Call] 一定時間経過後、Last Call を TG DM で送信（同じ Whop URL + プロモコード）
         ↓
  Whop で成約（?promo=defend50）
```

- **VSL1**: 無料版チャンネルには配信しない（既存ユーザーにノイズになるため）。X のみ。  
- **VSL2**: チャンネル一斉送信は無効。無料版登録ユーザーへの **個別DM** のみ（vsl2-free-users / vsl2-last-call）。  

---

## 環境変数（必要に応じて設定）

- **WHOP_PROMO_CODE** … プロモコード（未設定時: defend50）  
- **WHOP_PRODUCT_URL_EN / ES / …** … 有料版URLを上書きする場合（未設定時: trapdefence/btc-regular-*）  
- **VSL1_YOUTUBE_LINK** / **VSL2_YOUTUBE_LINK** … プロモ用YouTubeリンク  
- **TELEGRAM_BOT_USERNAME** … Deep Link 用 Bot ユーザー名  

---

## まとめ

- プロモ用TG配信（VSL1/VSL2/VSL2 Last Call）で使う **Whop URL とプロモコード** を、有料版・無料版・X投稿と同じく **whop-links + 環境変数** に統一した。  
- 今後のURL・プロモ変更は `services/telegram/whop-links.js` と環境変数だけで対応できる。
