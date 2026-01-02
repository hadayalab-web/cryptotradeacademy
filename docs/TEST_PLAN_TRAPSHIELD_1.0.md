# TrapShield 1.0 テスト計画

## 📋 テスト対象

TrapShield 1.0の実装内容（Phase 2-5）の動作確認

## 🎯 テスト範囲

### 1. Phase 2: プロダクト名の変更

#### 1.1 設定ファイルの確認
- [ ] `config/marketProfiles.js`のEN市場ブランド名が「TrapShield」になっているか
- [ ] タグラインが「Spot traps before you fall」になっているか

#### 1.2 実行時確認
- [ ] メッセージ内で「TrapShield」が表示されるか（全市場）
- [ ] ブランド名が正しく読み込まれるか

**テスト方法**:
```bash
# ローカル環境で実行（環境変数を設定した状態）
node -e "const { getMarketProfile } = require('./api/config/marketProfiles'); console.log(getMarketProfile('EN').brandName);"
# 期待値: TrapShield
```

---

### 2. Phase 3: TelegramメッセージUIの最適化

#### 2.1 定期配信メッセージの確認（6市場）

**確認項目**:
- [ ] ヘッダーに「TrapShield Market Brief」が表示される（各言語版）
- [ ] シグナル情報が最上部に配置されている
- [ ] 視覚的区切り（`━━━`）が使用されている
- [ ] Markdown記法（太字）が正しく使用されている
- [ ] 情報の階層化（シグナル → 市場状況 → 基本データ → AI分析）が正しい
- [ ] フッターに適切な免責事項が表示されている

**各市場の確認**:
- [ ] EN市場（`services/telegram/messages/user/en/regular.en.js`）
- [ ] JA市場（`services/telegram/messages/user/ja/regular.ja.js`）- 300文字制限確認
- [ ] KO市場（`services/telegram/messages/user/ko/regular.ko.js`）
- [ ] AR市場（`services/telegram/messages/user/ar/regular.ar.js`）
- [ ] ES市場（`services/telegram/messages/user/es/regular.es.js`）
- [ ] PT-BR市場（`services/telegram/messages/user/pt-br/regular.pt-br.js`）

#### 2.2 緊急配信メッセージの確認（6市場）

**確認項目**:
- [ ] ヘッダーに緊急性を示す複数の警告絵文字（🚨🚨🚨）が使用されている
- [ ] 「TRAP ALERT」（各言語版）が表示される
- [ ] Trap情報が最上部に配置されている
- [ ] 「ACTION REQUIRED」セクションが表示される（各言語版）
- [ ] アクショナブルな情報が明確に表示される
- [ ] 視覚的区切り（`━━━`）が使用されている

**各市場の確認**:
- [ ] EN市場（`services/telegram/messages/user/en/emergency.en.js`）
- [ ] JA市場（`services/telegram/messages/user/ja/emergency.ja.js`）
- [ ] KO市場（`services/telegram/messages/user/ko/emergency.ko.js`）
- [ ] AR市場（`services/telegram/messages/user/ar/emergency.ar.js`）
- [ ] ES市場（`services/telegram/messages/user/es/emergency.es.js`）
- [ ] PT-BR市場（`services/telegram/messages/user/pt-br/emergency.pt-br.js`）

**テスト方法**:
```javascript
// テスト用スクリプト（例）
const { formatRegularBriefing } = require('./services/telegram/messages/user/en/regular.en');
const testData = {
  now: new Date(),
  inflow: 100,
  mpi: 0.5,
  sentimentLabel: 'Neutral',
  priceUsd: 50000,
  change24h: 2.5,
  score: 50,
  tradeSignal: { signal: 'BUY', tp: 52000, sl: 48000, rr: 2.0 },
  trap: { isTrap: false },
  aiAnalysis: 'Test analysis',
};
const message = formatRegularBriefing(testData);
console.log(message);
// 構造を確認
```

---

### 3. Phase 4: 配信頻度の変更

#### 3.1 コード確認
- [ ] `api/cron.js`の`REGULAR_HOURS`が`[0, 12]`になっているか
- [ ] コメントに「TrapShield 1.0: 1日6回 → 2回に変更」が記載されているか

#### 3.2 実行時確認
- [ ] 定期配信が0時UTC、12時UTCに実行されるか
- [ ] 他の時刻には定期配信が実行されないか
- [ ] 緊急配信が適切に発火するか

**テスト方法**:
```bash
# テスト用スクリプト（時刻シミュレーション）
node -e "
const now = new Date();
const utcHour = now.getUTCHours();
const REGULAR_HOURS = [0, 12];
const isRegularSlot = REGULAR_HOURS.includes(utcHour);
console.log('Current UTC Hour:', utcHour);
console.log('Is Regular Slot:', isRegularSlot);
console.log('Expected slots:', REGULAR_HOURS);
"
```

**本番環境での確認**:
- [ ] Vercel Cronログで0時UTC、12時UTCに実行されることを確認
- [ ] 他の時刻に定期配信が実行されていないことを確認

---

### 4. Phase 5: GPT API統合

#### 4.1 コード確認
- [ ] `services/openai/client.js`が存在するか
- [ ] `analyzeMarketGPT`関数が実装されているか
- [ ] `services/grok/client.js`にGPT API統合コードが追加されているか
- [ ] `options.useGPT`パラメータが正しく処理されているか

#### 4.2 動作確認

**環境変数未設定時（デフォルト動作）**:
- [ ] `OPENAI_API_KEY`が未設定の場合、Grok APIのみが使用されるか
- [ ] エラーが発生しないか

**環境変数設定時（フォールバック動作）**:
- [ ] `OPENAI_API_KEY`が設定されている場合、GPT APIクライアントが読み込まれるか
- [ ] Grok APIエラー時、GPT APIフォールバックが動作するか
- [ ] Grok APIレート制限時、GPT APIフォールバックが動作するか

**テスト方法**:
```javascript
// テスト用スクリプト（モック）
// services/grok/client.jsの動作確認
const { analyzeMarket } = require('./services/grok/client');

// デフォルト動作（Grok APIのみ）
const result1 = await analyzeMarket(
  JSON.stringify({ priceUsd: 50000 }),
  JSON.stringify({ whaleBias: 50 }),
  'en',
  'EN',
  null,
  {} // options未指定 = Grok APIのみ
);
console.log('Default:', result1);

// GPT APIフォールバック使用
const result2 = await analyzeMarket(
  JSON.stringify({ priceUsd: 50000 }),
  JSON.stringify({ whaleBias: 50 }),
  'en',
  'EN',
  null,
  { useGPT: true } // GPT APIフォールバック有効
);
console.log('With GPT fallback:', result2);
```

---

## 🔍 統合テスト

### 5.1 エンドツーエンドテスト

**テストシナリオ**:
1. 定期配信（0時UTC、12時UTC）
   - [ ] 正しい時刻に配信されるか
   - [ ] 新しいメッセージ構造で配信されるか
   - [ ] 「TrapShield」ブランド名が表示されるか

2. 緊急配信
   - [ ] 緊急条件が満たされた場合、緊急配信が発火するか
   - [ ] 新しいメッセージ構造で配信されるか
   - [ ] 緊急性が適切に表現されているか

3. 複数市場
   - [ ] 各市場（EN, JA, KO, AR, ES, PT-BR）で正しく動作するか
   - [ ] 各言語でメッセージが正しく表示されるか

**テスト方法**:
```bash
# ローカル環境でのテスト（環境変数を設定）
npm run test:local

# または、直接cron.jsを実行（デバッグモード）
node -e "
const handler = require('./api/cron.js').default;
handler({ query: { debug: 'local' } }, { status: (code) => ({ json: (data) => console.log(data) }) });
"
```

---

## 📊 パフォーマンステスト

### 6.1 レスポンス時間
- [ ] メッセージ生成時間が許容範囲内か
- [ ] GPT APIフォールバック時のレスポンス時間が許容範囲内か

### 6.2 エラー処理
- [ ] Grok APIエラー時のフォールバックが正常に動作するか
- [ ] GPT APIエラー時のエラーハンドリングが適切か
- [ ] 両方のAPIがエラー時の動作が適切か

---

## 🚨 回帰テスト

### 7.1 既存機能の確認
- [ ] イベント駆動配信システムが正常に動作するか
- [ ] CryptoQuant API統合が正常に動作するか
- [ ] 市場別プロファイルが正しく適用されるか

---

## 📝 テスト結果の記録

### テスト実行ログ
- テスト実行日時
- テスト実行者
- テスト環境（ローカル/ステージング/本番）
- テスト結果（成功/失敗）
- 発見された問題と対応状況

### テスト結果テンプレート
```
## テスト結果

### Phase 2: プロダクト名の変更
- 実行日時: YYYY-MM-DD HH:MM
- 結果: ✅ 成功 / ❌ 失敗
- 備考: [問題があれば記載]

### Phase 3: TelegramメッセージUIの最適化
- 実行日時: YYYY-MM-DD HH:MM
- 結果: ✅ 成功 / ❌ 失敗
- 備考: [問題があれば記載]

...

### 統合テスト
- 実行日時: YYYY-MM-DD HH:MM
- 結果: ✅ 成功 / ❌ 失敗
- 備考: [問題があれば記載]
```

---

## 🔄 次のステップ

1. **ローカル環境でのテスト実行**
   - 上記のテスト計画に基づき、各項目を確認

2. **ステージング環境でのテスト**
   - 本番環境に近い環境でテスト実行

3. **本番環境での段階的ロールアウト**
   - 1市場（EN市場）でテスト
   - 問題がなければ他の市場にも展開

4. **監視とログ確認**
   - Vercel Dashboardでログを確認
   - Telegram Bot APIの統計で開封率を確認

