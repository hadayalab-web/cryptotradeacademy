# VSL実装・デプロイチェックリスト

**作成日時**: 2026-01-14  
**対象**: VSL1（無料オプトイン誘導）& VSL2（有料版コンバージョン）

---

## 📹 VSL情報

### VSL1: フロントエンド（無料オプトイン誘導用）
- **URL**: https://youtu.be/zdLFYwFJQd4
- **目的**: 投稿から無料版へのオプトイン誘導
- **使用場所**: Telegram/X投稿に埋め込み

### VSL2: バックエンド（Whopプロモコード使用アピール）
- **URL**: https://youtu.be/QpAJa4ZkfmE
- **目的**: 無料版ユーザーへのWhopプロモコード（DEFEND50）使用アピール
- **使用場所**: 
  - 無料版ユーザーへのDM/メール
  - Whopプロダクトページ（Hero Section）
  - `/upgrade`コマンド

---

## ✅ コード実装状況

### 1. 無料版メッセージテンプレート ✅ 完了
- **ファイル**: `services/telegram/messages/user/en/minimal-high-quality.en.js`
- **変更内容**: VSL2リンクを環境変数`VSL2_YOUTUBE_LINK`または`VSL_YOUTUBE_LINK`から取得
- **状態**: ✅ 実装完了

### 2. Botコマンド（/upgrade） ✅ 完了
- **ファイル**: `services/telegram/bot-commands.js`
- **変更内容**: VSL2リンクを環境変数`VSL2_YOUTUBE_LINK`または`VSL_YOUTUBE_LINK`から取得
- **状態**: ✅ 実装完了

---

## 📋 CEOが対応すべき項目

### 1. 環境変数の設定（Vercel Dashboard）

以下の環境変数をVercel Dashboardで設定してください：

```bash
# VSL1: フロントエンド（無料オプトイン誘導用）
VSL1_YOUTUBE_LINK=https://youtu.be/zdLFYwFJQd4

# VSL2: バックエンド（有料版コンバージョン用）
VSL2_YOUTUBE_LINK=https://youtu.be/QpAJa4ZkfmE

# 後方互換性のため、既存のVSL_YOUTUBE_LINKも設定（VSL2を使用）
VSL_YOUTUBE_LINK=https://youtu.be/QpAJa4ZkfmE
```

**設定手順**:
1. Vercel Dashboard → プロジェクト: `cryptosignal-ai` → **Settings** → **Environment Variables**
2. 上記の3つの環境変数を追加
3. 保存

---

### 2. WhopプロダクトページへのVSL2統合

**手順**:
1. [Whop Dashboard](https://whop.com/dashboard)にアクセス
2. **Products** → 更新したい市場のプロダクトを選択
3. **Edit** → **Product Media** → **Hero Section** → **Video URL**
4. VSL2のYouTube URLを貼り付け: `https://youtu.be/QpAJa4ZkfmE`
5. Video Settings:
   - **Autoplay**: ON（自動再生）
   - **Loop**: OFF（1回のみ）
   - **Controls**: ON（一時停止可能）
6. **Save**

**対象プロダクト（全6市場）**:
- **EN**: `prod_6RjqaJMGyEw1F` - https://whop.com/products/prod_6RjqaJMGyEw1F
- **JA**: `prod_756mUZhSfLAkL` - https://whop.com/products/prod_756mUZhSfLAkL
- **KO**: `prod_HouQTKTN1F7vD` - https://whop.com/products/prod_HouQTKTN1F7vD
- **ES**: `prod_Eg1V8et0WTg69` - https://whop.com/products/prod_Eg1V8et0WTg69
- **AR**: `prod_l4ipnvNhwFpdQ` - https://whop.com/products/prod_l4ipnvNhwFpdQ
- **PT-BR**: `prod_Cpz4oQla16GUB` - https://whop.com/products/prod_Cpz4oQla16GUB

---

## 🔄 動作確認

### 1. 無料版メッセージでのVSL2表示確認

環境変数設定後、次回のCron実行（15分後）で無料版メッセージにVSL2リンクが表示されることを確認：

```bash
cd cryptosignal-ai
node scripts/test-actual-telegram-delivery.js
```

**期待される表示**:
```
🎬 Watch Our Story (2 min):
https://youtu.be/QpAJa4ZkfmE
```

### 2. `/upgrade`コマンドでのVSL2表示確認

Telegram Botで`/upgrade`コマンドを実行し、VSL2リンクが表示されることを確認

### 3. WhopプロダクトページでのVSL2再生確認

各市場のWhopプロダクトページでVSL2がHero Sectionに表示され、再生できることを確認

---

## 📊 実装完了後の動作

### 無料版メッセージ
- ✅ 無料版メッセージのCTAセクションにVSL2リンクが表示される
- ✅ Telegramが自動的にサムネイル付きで表示
- ✅ ユーザーがVSL2を視聴してからWhopページに遷移

### `/upgrade`コマンド
- ✅ `/upgrade`コマンド実行時にVSL2リンクが表示される
- ✅ ユーザーがVSL2を視聴してからWhopページに遷移

### Whopプロダクトページ
- ✅ Hero SectionにVSL2が自動再生される
- ✅ ユーザーがVSL2を視聴してから購入に進む

---

## 🚀 次のステップ（今後実装）

### 優先度1: Telegram/X投稿の自動化（VSL1使用）
- **目的**: VSL1を埋め込んだ投稿で無料版オプトインを誘導
- **実装内容**: 
  - YouTube VSL1を埋め込んだ投稿
  - Telegram Bot経由のワンクリック参加リンク（@TrapDefenceBot /start minimal）
- **参考**: `docs/VSL1_VSL2_NEXT_TASKS.md`

### 優先度2: 無料版ユーザーへのVSL2配信システム
- **目的**: 無料版ユーザーにVSL2を送信し、Whopプロモコード（DEFEND50）使用をアピール
- **実装内容**: 
  - 無料版ユーザーリストの抽出
  - VSL2（YouTube URL）を埋め込んだDM/メール送信
  - 送信タイミング: 無料版参加後48時間経過時
- **参考**: `docs/VSL1_VSL2_NEXT_TASKS.md`

---

## ✅ チェックリスト

### 即座に実装可能
- [x] 無料版メッセージテンプレートへのVSL2統合（コード修正完了）
- [x] Botコマンド（/upgrade）へのVSL2統合（コード修正完了）
- [ ] 環境変数の設定（Vercel Dashboard）
- [ ] WhopプロダクトページへのVSL2統合（全6市場）

### 動作確認
- [ ] 無料版メッセージでVSL2リンクが表示されることを確認
- [ ] `/upgrade`コマンドでVSL2リンクが表示されることを確認
- [ ] WhopプロダクトページでVSL2が再生されることを確認

---

**最終更新**: 2026-01-14  
**状態**: ✅ **コード実装完了（環境変数設定・Whop統合待ち）**
