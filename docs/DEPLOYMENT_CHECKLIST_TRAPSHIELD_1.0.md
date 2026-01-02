# TrapShield 1.0 デプロイメントチェックリスト

## 📋 デプロイ前の確認事項

### ✅ 実装完了確認

- [x] Phase 2: プロダクト名の変更
- [x] Phase 3: TelegramメッセージUIの最適化（6市場）
- [x] Phase 4: 配信頻度の変更（1日6回 → 2回）
- [x] Phase 5: GPT API統合
- [x] コードの構文エラー修正
- [x] リンターエラーの確認
- [x] Vercel環境変数設定完了（6言語版すべて）✅ 2026-01-02

### 🔧 環境変数の設定

#### 必須環境変数（既存）
- [ ] `CRYPTOQUANT_API_KEY` - CryptoQuant APIキー
- [ ] `XAI_API_KEY` - Grok APIキー
- [ ] `TELEGRAM_BOT_TOKEN` - Telegram Botトークン
- [ ] `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` - Phase 1: イベント駆動用（使用する場合）
- [ ] `ENABLE_EVENT_DRIVEN` - イベント駆動配信の有効化（使用する場合）

#### オプション環境変数（新規）
- [ ] `OPENAI_API_KEY` - GPT APIフォールバックを使用する場合
- [ ] `OPENAI_MODEL` - OpenAIモデル名（デフォルト: `gpt-4o-mini`）
- [ ] `OPENAI_BASE_URL` - OpenAI APIエンドポイント（デフォルト: `https://api.openai.com/v1`）

**注意**: `OPENAI_API_KEY`が設定されていない場合、既存動作（Grok APIのみ）が維持されます。

#### Grokモデル設定（更新済み）
- [x] `GROK_MODEL_REASONING=grok-4-1-fast-reasoning` ✅ 6言語版すべてで設定完了
- [x] `GROK_MODEL_LIVE=grok-4-1-fast-reasoning` ✅ 6言語版すべてで設定完了

---

## 🚀 デプロイ手順

### 1. ローカル環境での最終確認

```bash
# 構文チェック
node -c services/grok/client.js
node -c services/openai/client.js
node -c api/cron.js

# リンターチェック
npm run lint  # または使用しているリンターコマンド
```

### 2. Gitコミット

```bash
# 変更内容の確認
git status
git diff

# コミット
git add .
git commit -m "feat: TrapShield 1.0 implementation

- Phase 2: Product name change to TrapShield
- Phase 3: Telegram message UI optimization (6 markets)
- Phase 4: Delivery frequency change (6x/day → 2x/day)
- Phase 5: GPT API integration (fallback support)"
```

### 3. Vercelデプロイ

#### 3.1 環境変数の設定
Vercel Dashboardで以下の環境変数を設定：

**必須**:
- `CRYPTOQUANT_API_KEY`
- `XAI_API_KEY`
- `TELEGRAM_BOT_TOKEN`

**オプション（GPT APIフォールバック使用時）**:
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (デフォルト: `gpt-4o-mini`)
- `OPENAI_BASE_URL` (デフォルト: `https://api.openai.com/v1`)

#### 3.2 デプロイ実行
```bash
# Vercel CLIを使用する場合
vercel --prod

# または、GitHub連携で自動デプロイ
# （プッシュ後に自動デプロイ）
git push origin main
```

### 4. デプロイ後の確認

#### 4.1 ログ確認
- [ ] Vercel Dashboardでデプロイログを確認
- [ ] エラーがないことを確認
- [ ] 初回実行時のログを確認

#### 4.2 動作確認（段階的ロールアウト）

**ステップ1: EN市場でのテスト**
- [ ] 定期配信（0時UTC、12時UTC）が正常に実行されるか
- [ ] メッセージが新しい構造で配信されるか
- [ ] 「TrapShield」ブランド名が表示されるか
- [ ] 緊急配信が正常に動作するか（条件が満たされた場合）

**ステップ2: 他の市場での展開**
- [ ] EN市場で問題がないことを確認後、他の市場にも展開
- [ ] 各市場（JA, KO, AR, ES, PT-BR）でメッセージが正常に表示されるか

---

## 📊 監視項目

### デプロイ後1週間の監視

#### 1. 配信頻度
- [ ] 定期配信が1日2回（0時UTC、12時UTC）で実行されているか
- [ ] 緊急配信が適切に発火しているか
- [ ] 配信漏れがないか

#### 2. メッセージ品質
- [ ] メッセージが新しい構造で表示されているか
- [ ] Markdown記法が正しく表示されているか
- [ ] 文字数制限（特にJA市場）が遵守されているか

#### 3. エラー率
- [ ] API呼び出しエラーが発生していないか
- [ ] GPT APIフォールバックが正常に動作しているか（使用している場合）
- [ ] エラーログに異常がないか

#### 4. パフォーマンス
- [ ] メッセージ生成時間が許容範囲内か
- [ ] APIレスポンス時間が許容範囲内か

---

## 🔍 トラブルシューティング

### よくある問題と対処法

#### 1. プロダクト名が「TrapShield」に表示されない
**原因**: キャッシュの問題
**対処**: Vercelの再デプロイまたは環境変数の再読み込み

#### 2. メッセージが古い構造で表示される
**原因**: テンプレートファイルが正しく読み込まれていない
**対処**: ファイルパスとrequire文を確認

#### 3. 配信頻度が変更されていない
**原因**: `REGULAR_HOURS`の設定が反映されていない
**対処**: `api/cron.js`の148行目を確認

#### 4. GPT APIフォールバックが動作しない
**原因**: `OPENAI_API_KEY`が設定されていない、または`options.useGPT`が指定されていない
**対処**: 環境変数の設定を確認（現在の実装では、フォールバックは`options.useGPT: true`が指定された場合のみ動作）

---

## 📝 ロールバック手順

### 問題が発生した場合

1. **Gitで前のバージョンに戻す**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Vercelで前のデプロイメントにロールバック**
   - Vercel Dashboard → Deployments → 前のデプロイメントを選択 → Promote to Production

3. **環境変数を確認**
   - 必要に応じて環境変数を元の値に戻す

---

## 📚 関連ドキュメント

- **実装状況**: `docs/IMPLEMENTATION_STATUS_TRAPSHIELD_1.0.md`
- **テスト計画**: `docs/TEST_PLAN_TRAPSHIELD_1.0.md`
- **テスト結果**: `docs/TEST_RESULTS_TRAPSHIELD_1.0.md`
- **仕様書**: `docs/PRODUCT_REDEFINITION_SPEC.md`

---

## ✅ デプロイ完了確認

デプロイ完了後、以下を確認：

- [ ] 全ての環境変数が正しく設定されている
- [ ] デプロイが成功している
- [ ] ログにエラーがない
- [ ] 定期配信が正常に動作している
- [ ] メッセージが新しい構造で表示されている
- [ ] プロダクト名が「TrapShield」に表示されている

---

**デプロイ準備完了**: 上記のチェックリストを確認後、デプロイを実行してください。

