# 6市場DMキャンペーン実装：Grok × Gemini × GPT

**作成日時**: 2026-01-12  
**目標**: 週末までに$10万達成

---

## 🎯 実装概要

### AI役割分担

1. **💰 Grok (CSO)**: `grok-4-1-fast-reasoning` - TG/X/Emailを想定したユーザーリスト収集
2. **📢 Gemini (CMO)**: `gemini-3-flash-preview` - VSL挿入セールスレター作成
3. **⚙️ GPT (CTO)**: `gpt-5-2-2025-12-11` - DM配信準備とKPIのPDCA管理
4. **👤 COO**: Whopオペレーション対応

**⚠️ 重要**: 実際のDM送信はCEOのGOサインが出てから実行されます。

---

## 📋 実装フロー

```
フェーズ1: 6市場Whopページ完成（COO）
  ↓
フェーズ2: DM用VSLファイルを読み込む（タスク3のVSLファイル）
  ↓
フェーズ3: Grok（CSO）にTG/X/Emailを想定したリストを集めてもらう
  ↓
フェーズ4: Gemini（CMO）がリストの感度に合ったセールスレターを作成（VSL挿入）
  ↓
フェーズ5: GPT（CTO）がDM配信準備（TG/Email対応、Xは後で対応）
```

---

## 🔧 実装ファイル

- **メインスクリプト**: `scripts/complete-6markets-whop-and-send-dm.ts`

---

## 📊 各フェーズの詳細

### フェーズ1: 6市場Whopページ完成

- EN, AR, KO, JA, ES, PT-BRの6市場のWhopページを確認
- Whop APIでプロダクト情報を取得
- 各市場のWhopページURLを確認

### フェーズ2: DM用VSLスクリプトを読み込む

**実装関数**: `loadVSLScriptForDM()`

- 修正版の英語版VSLスクリプトを読み込む（Gemini CMOが生成）
- ファイルパス: `data/vsl-scripts/revised-dm-vsl-script.txt`
- タスク1のTwo Young Menストーリーとタスク3の詳細説明を統合
- **Whop版VSL**: タスク1のHeyGen動画をそのまま使用（変更なし）
- **DM版VSL**: 修正版英語版スクリプトを使用（Whopページの動画と整合性を保持）

### フェーズ3: Grok（CSO）にTG/X/Emailを想定したリストを集めてもらう

**実装関数**: `collectUsersWithGrokCSO(market: string)`

- Grok（CSO）に3つのチャネルを想定してユーザーリストを収集してもらう：
  1. **Telegram**: TGチャンネル/グループのメンバー、TGで活動しているトレーダー
  2. **X（Twitter）**: Xで投稿しているトレーダー、Xでフォローしているユーザー
  3. **Email**: メールアドレスが公開されている、またはメール配信を受け取っているトレーダー

- 市場別の検索クエリを使用：
  - EN: "crypto trading", "bitcoin analysis", "trading signals", "crypto trap", "defensive trading"
  - AR: "تداول العملات المشفرة", "تحليل البيتكوين", "إشارات التداول"
  - KO: "암호화폐 거래", "비트코인 분석", "트레이딩 시그널"
  - JA: "暗号通貨取引", "ビットコイン分析", "トレーディングシグナル"
  - ES: "trading de criptomonedas", "análisis de bitcoin", "señales de trading"
  - PT-BR: "trading de criptomoedas", "análise de bitcoin", "sinais de trading"

**収集する情報**:
- X（Twitter）のユーザー名、表示名、プロフィールURL
- フォロワー数、エンゲージメント率
- 最近の投稿トピック、ペインポイント
- Telegram User ID、メールアドレス、優先チャネル（TG/X/Email）
- マッチスコア（0-10点）

**期待収集数**: 各市場100-500人

### フェーズ4: Gemini（CMO）がリストの感度に合ったセールスレターを作成（VSL挿入）

**実装関数**: `generatePersonalizedSalesLetterWithGeminiCMO(market: string, user: any, vslScript: string)`

- 各ユーザーの感度（興味関心、ペインポイント、コンテンツタイプ）に合わせてパーソナライズ
- **VSLスクリプトを自然にセールスレターに挿入**
- ユーザー情報を基に、自然で効果的なセールスレターを生成
- 200-400文字程度の簡潔な文章

**VSLファイル読み込み**: `loadVSLScript()`
- Whopに埋め込まれているVSLファイル（`.srt`形式）を読み込む
- ファイルパス: `C:\Users\chiba\Downloads\タスク3 VSL用コンテンツ（Video Sales Letterスクリプト）.srt`
- SRTファイルからテキストを抽出して使用

### フェーズ5: GPT（CTO）がDM配信準備（送信は行わない）

**実装関数**: `prepareDMWithGPTCTO(market: string, users: any[], vslScript: string)`

- 各ユーザーごとに：
  1. Gemini（CMO）がパーソナライズされたセールスレターを生成（VSL挿入済み）
  2. 優先チャネル（TG/X/Email）に応じてDMメッセージを構築
  3. WhopページURLを含むDMメッセージを生成
  4. **DMメッセージをデータベースに保存（送信は行わない）**
  5. 配信準備完了として記録

**チャネル対応**:
- ✅ **Telegram**: `sendTelegramMessage`を使用（準備のみ）
- ✅ **Email**: `sendResendEmail`を使用（準備のみ）
- ⏳ **X（Twitter）**: 後で対応（X APIが必要）

**⚠️ 重要**: 
- 実際のDM送信は行いません
- CEOのGOサインが出てから送信を開始してください
- DMメッセージの内容は`affiliate_candidates`テーブルの`notes`フィールドに保存されます
- KPIのPDCA管理はGPT（CTO）が担当

---

## 📊 期待される結果

### KPI

- **ユーザー収集数**: 各市場100-500人 × 6市場 = 600-3,000人
- **DM送信数**: 600-3,000件
- **期待CVR**: 4-6%
- **期待購入件数**: 24-180件
- **期待売上**: $16,560〜$105,840

### 目標達成

- **週末までに$10万達成**

---

## 🚀 実行方法

```bash
npx tsx scripts/complete-6markets-whop-and-send-dm.ts
```

---

## 📝 注意事項

1. **VSLファイル読み込み**: タスク3のVSLファイル（既存のレビュー済みコンテンツ）を読み込んで使用（DMに挿入用）
2. **チャネル対応**: TG、Emailに対応（Xは後で対応）
3. **パーソナライゼーション**: 各ユーザーの感度に合わせてセールスレターを生成（VSL挿入済み）
4. **配信準備のみ**: 実際のDM送信は行いません。CEOのGOサインを待ちます
5. **データベース保存**: DMメッセージの内容を`affiliate_candidates`テーブルの`notes`フィールドに保存
6. **送信時のレート制限**: 実際の送信時はTelegram APIのレート制限（20メッセージ/秒）を遵守
7. **KPI管理**: GPT（CTO）がKPIのPDCA管理を担当
8. **APIコスト最適化**: 各オペレーションでAPIコストを勘案したAIモデル選択を実施（詳細は`docs/API_COST_OPTIMIZATION.md`を参照）

---

**作成日時**: 2026-01-12  
**責任者**: COO（Cursor/Composer 1）
