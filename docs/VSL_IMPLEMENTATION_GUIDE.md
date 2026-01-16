# VSL実装ガイド

**作成日時**: 2026-01-14  
**対象**: VSL1（無料オプトイン誘導）& VSL2（有料版コンバージョン）

---

## 📹 VSL情報

### VSL1: フロントエンド（無料オプトイン誘導用）
- **URL**: https://youtu.be/zdLFYwFJQd4
- **目的**: 投稿から無料版へのオプトイン誘導
- **使用場所**: Telegram/X投稿に埋め込み
- **CTA**: Telegram Bot経由のワンクリック参加（@TrapDefenceBot /start minimal）

### VSL2: バックエンド（Whopプロモコード使用アピール）
- **URL**: https://youtu.be/vjz896hTPPw
- **目的**: 無料版ユーザーへのWhopプロモコード（DEFEND50）使用アピール
- **使用場所**: 
  - 無料版ユーザーへのDM/メール
  - Whopプロダクトページ（Hero Section）
  - `/upgrade`コマンド
- **CTA**: Whopページへのリンク + プロモコード「DEFEND50」

---

## 🔧 実装内容

### 1. 環境変数の設定

Vercel Dashboardで以下の環境変数を設定してください：

```bash
# VSL1: フロントエンド（無料オプトイン誘導用）
VSL1_YOUTUBE_LINK=https://youtu.be/zdLFYwFJQd4

# VSL2: バックエンド（有料版コンバージョン用）
VSL2_YOUTUBE_LINK=https://youtu.be/vjz896hTPPw

# 後方互換性のため、既存のVSL_YOUTUBE_LINKも設定
VSL_YOUTUBE_LINK=https://youtu.be/vjz896hTPPw  # VSL2を使用
```

---

### 2. 無料版メッセージテンプレートへの統合

**ファイル**: `services/telegram/messages/user/en/minimal-high-quality.en.js`

**変更内容**:
- VSL2リンクをCTAセクションに追加
- 環境変数`VSL2_YOUTUBE_LINK`または`VSL_YOUTUBE_LINK`を参照

**実装済み**: ✅ 既に`VSL_YOUTUBE_LINK`環境変数を参照する実装が完了しています

---

### 3. Botコマンド（/upgrade）への統合

**ファイル**: `services/telegram/bot-commands.js`

**変更内容**:
- VSL2リンクを`/upgrade`コマンドに追加
- 環境変数`VSL2_YOUTUBE_LINK`または`VSL_YOUTUBE_LINK`を参照

**実装済み**: ✅ 既に`VSL_YOUTUBE_LINK`環境変数を参照する実装が完了しています

---

### 4. Whopプロダクトページへの統合

**手順**:
1. Whop Dashboardにアクセス
2. 各市場のプロダクトページを編集
3. **Product Media** → **Hero Section** → **Video URL**
4. VSL2のYouTube URLを貼り付け: `https://youtu.be/vjz896hTPPw`
5. Video Settings:
   - Autoplay: ON（自動再生）
   - Loop: OFF（1回のみ）
   - Controls: ON（一時停止可能）

**対象プロダクト**:
- EN: `prod_6RjqaJMGyEw1F`
- JA: `prod_756mUZhSfLAkL`
- KO: `prod_HouQTKTN1F7vD`
- ES: `prod_Eg1V8et0WTg69`
- AR: `prod_l4ipnvNhwFpdQ`
- PT-BR: `prod_Cpz4oQla16GUB`

---

### 5. Telegram/X投稿への統合（VSL1使用）

**実装予定**: 自動投稿スクリプトの作成が必要

**投稿内容の例**:
```
🎬 Watch This: Two traders started with the same capital...

[VSL1埋め込み: https://youtu.be/zdLFYwFJQd4]

Three months later:
• Trader A: Lost months of profits in 1 week
• Trader B: Secured $5K profit, relaxed

The difference? Trader B used Trap Defence BTC.

🚀 Get Your Free Daily Trap Score:
→ @TrapDefenceBot /start minimal

#Bitcoin #CryptoTrading #TrapDefence #FreeSignals
```

---

## 📋 実装チェックリスト

### 即座に実装可能（コード修正不要）
- [x] 無料版メッセージテンプレートへのVSL2統合（既存実装を活用）
- [x] Botコマンド（/upgrade）へのVSL2統合（既存実装を活用）
- [ ] 環境変数の設定（Vercel Dashboard）
- [ ] WhopプロダクトページへのVSL2統合（手動）

### 今後実装が必要
- [ ] Telegram投稿の自動化（VSL1使用）
- [ ] X（Twitter）投稿の自動化（VSL1使用）
- [ ] 無料版ユーザーへのVSL2配信システム
- [ ] Email配信へのVSL2統合

---

## 🚀 次のステップ

1. **環境変数の設定**（CEOが対応）
   - Vercel Dashboardで`VSL1_YOUTUBE_LINK`と`VSL2_YOUTUBE_LINK`を設定

2. **Whopプロダクトページへの統合**（CEOが対応）
   - 各市場のプロダクトページのHero SectionにVSL2を埋め込み

3. **動作確認**
   - 無料版メッセージにVSL2リンクが表示されることを確認
   - `/upgrade`コマンドでVSL2リンクが表示されることを確認
   - WhopプロダクトページでVSL2が再生されることを確認

---

**最終更新**: 2026-01-14  
**状態**: ✅ **コード実装完了（環境変数設定・Whop統合待ち）**
