# SSOT Trap Defense BTC - コード実装最終チェック（GPT CTO/CPO）

**レビュー日**: 2026-01-10T10:47:45.633Z
**レビュアー**: GPT（CTO/CPO）
**SSOTファイル**: docs/SSOT_TRAP_DEFENSE_BTC.md
**SSOT総行数**: 3416行（全体を確認）
**確認コードファイル数**: 10ファイル（全体を確認）

---

## 📝 最終チェック結果

以下、CTO/CPOとして「SSOT Trap Defense BTC（v2.2/2.3混在を含む“確定SSOT”）」と、提示されたコード一式（主に `api/cron.js` / `logic/core/*` / `services/grok/*` / `services/gemini/*` / `services/cryptoquant/highResolution.js` / `services/telegram/messages/user/en/regular.en.js`）の**最終整合チェック結果**です。  
結論から言うと、**USP1/2/3の“骨格”は実装済み**ですが、SSOTの「品質ゲート（trapScore>=60 & multipleDivergences>=3）」「用語統一（TRAP_STANDBY）」「BUY/SELL完全排除の徹底」「動画生成（Veo）の実運用」「価格/6デプロイの実装」などに**致命的な不一致・未実装・バグが残っています**。このままだと“SSOTがコードに完全再現”とは言えません。

---

## 1) 3つのUSPがコードに完全実装されているか

### USP1: Trap Defense Engine（CryptoQuant + Grok X統合、AVOID_LONG/AVOID_SHORT/STANDBY）
**実装状況: 部分的にOK（ただし品質ゲート不一致 + BUY/SELL残骸 + 変数バグあり）**

#### 実装されている点（OK）
- **CryptoQuantデータ取得**  
  - `getExchangeInflow()` / `getMinerPositionIndex()` を `api/cron.js` で取得。
  - 高解像度版: `services/cryptoquant/highResolution.js` の `getHighResolutionCQData()` を `api/cron.js` で利用。
- **Grok Xセンチメント統合**  
  - `services/grok/highResolution.js` の `analyzeXSentimentHighResolutionCompat()` を `api/cron.js` で利用し、`whaleBias / retailFomo / newsImpact` を `xSentiment` に反映。
- **トラップ検出・アラート生成**  
  - `logic/core/trapDetector.js` の `detectTrapDetection()` と `generateTrapAlert()` が存在し、  
    `trapType` に応じて `AVOID_LONG` / `AVOID_SHORT` / `STANDBY` を返す設計になっている。

#### SSOTと不一致/欠落（NG）
- **SSOTの統一品質ゲート条件が“実装として担保されていない”**
  - SSOT要件（最重要）  
    - *「trapScore>=60 かつ multipleDivergences>=3」*（高品質保証）
  - 現状コード  
    - `logic/core/trapDetector.js` の `trapDetected` 判定が `trapScore >= 15`（低すぎる）  
    - `generateTrapAlert()` は `trapDetection.trapDetected && divergence.confidence >= 0.70` などで生成しうる  
    - `api/cron.js` の「trapScore>=60でEMERGENCY」も**trapScoreではなく** `trap.isTrap && trap.confidence==='HIGH'` 等が中心で、SSOTの `trapScore>60` トリガーとズレ
- **“BUY/SELL完全削除”がロジック層で未完**
  - `logic/core/divergenceDetector.js` の `evaluateDivergenceSignalHighResolution()` が `signal: 'SELL'/'BUY'` を返す（SSOTではユーザー向けも内部も原則 AVOID/STANDBY へ統一）
  - `logic/core/trapDetector.js` でも `evaluateDivergenceSignalHighResolution()` を呼び、返却オブジェクトに `divergenceSignal` を載せるが、その中身が BUY/SELL になり得る
  - `regular.en.js` は “Trade Verdict” を trapAlertベースにしているのでユーザー表示は回避できているが、**内部オブジェクトにBUY/SELLが残る**のはSSOTの「完全削除」と矛盾（将来のテンプレ/ログ/他言語で漏れるリスク大）
- **`api/cron.js` に変数未定義・順序バグが複数あり、USP1の統合が“動かない可能性”が高い**
  - `trapAlert` を参照している箇所が、`trapAlert` 生成より前に存在（`trapAlert` がスコープ上未定義のまま参照されるパスがある）
  - `shouldCallGrok` という変数が出てくるが、提示範囲では定義されていない
  - `divergenceSignalResult` を `diagnoseUserSentimentCompat` に渡しているが、その変数がその時点で未定義の可能性
  - `trapDetection / marketBugDetection / psychologicalSupport` もスコープが `if (needsLongReport && shouldCallAI && isRegularSlot)` 内で宣言されており、後段の `formatRegularBriefing()` 呼び出しで参照する時に未定義になり得る
- **用語統一がSSOTと逆行**
  - SSOTは「Trap Detection → Trap Defense」「BUG_STANDBY → TRAP_STANDBY」へ統一
  - コードは `BUG_STANDBY` がまだ残存（`api/cron.js` 正規化コメントも “BUG” 前提、`psychologicalSupport.js` の文言も “BUG STANDBY”）

**USP1判定**: 機能の存在はOK。ただし、SSOTの「品質ゲート」「用語統一」「BUY/SELL完全排除」「実行可能性（バグ）」の観点で**未達**。

---

### USP2: Gemini Content Generation（NanoBanana Pro画像、Veo 3.1動画）
**実装状況: 画像は概ねOK / 動画は“実装はあるが実運用で危険” / SSOTの番組構造とは部分一致**

#### 実装されている点（OK）
- 画像生成:
  - `services/gemini/imageGenerator.js` が NanoBanana Pro 相当（`gemini-3-pro-image-preview`）へRESTで投げる
  - `api/cron.js` の REGULAR で `generateMarketImage()` を呼び、Telegramへ `sendPhoto()`
- 動画生成:
  - `services/gemini/videoGenerator.js` が Veo API（`veo-3.1-generate-preview`）を呼ぶ実装を持つ
  - `api/cron.js` の REGULAR で `generateMarketVideo()` を呼び、Telegramへ `sendVideo()`

#### SSOTと不一致/リスク（NG/要修正）
- **SSOTは「Opening=Veo 3.1」「Data Presentation=NanoBanana Pro」**  
  現在 `regular.en.js` は Opening をテキスト（GPT Reporter）としており、Veo動画は「添付があれば」扱い。  
  → 体験としては近いが、SSOTの“番組構造の主役”が逆転している（動画が必須構造になってない）
- **Veo APIは非同期 job を返す前提で `operations/{jobId}` をポーリングしているが、Google GenAIのoperation形式が一致する保証がない**  
  実装はそれっぽいが、実際のレスポンス仕様にズレると動画生成が常時失敗する。  
  また、**cron（サーバレス）内で最大60回×10秒=10分ポーリング**はVercelの実行時間制限に抵触しやすく、運用上かなり危険。
- **`services/gemini/imageGenerator.js` が `generateMarketVideo()` を同一ファイル内に持っている（プレースホルダ）**  
  いまは `api/cron.js` が `services/gemini/videoGenerator.js` を使っているので致命ではないが、混乱の元（SSOT的にも“唯一の真実”に反する）

**USP2判定**: 画像はOK寄り。動画は“存在するが運用設計が未完成”で、SSOT通りに安定稼働する状態ではない。

---

### USP3: Dr. Grok’s Psychological Support（Xセンチメント + 心理サポート診断）
**実装状況: 概ねOK（ただし用語/スタンバイ表現がSSOTと不一致）**

#### 実装されている点（OK）
- `services/grok/psychologicalSupport.js` に
  - 高解像度Xがあればそれを利用、なければ `analyzeXSentimentLive()` で補完
  - 心理状態（FOMO/FEAR/GREED/PANIC/EUPHORIA/CONFUSION/NEUTRAL）とリスク（LOW〜CRITICAL）
  - 多言語アドバイス（en/ja/ko/es/pt-br/ar）
- `api/cron.js` で定期/Watch/Standby_break等で `diagnoseUserSentimentCompat()` を呼ぶ導線がある
- `regular.en.js` の Commentator セクションに心理状態を表示しており、SSOTの「癒し系コメンテーター」体験は実装されている

#### SSOTと不一致（NG）
- 文言に **BUG STANDBY** が残っている（SSOTは TRAP_STANDBY に統一）
- そもそも `regular.en.js` に絵文字が入っている（SSOTは絵文字禁止ではないが、プロダクトトーン統一の観点で他言語テンプレとの整合確認が必要。※今回はENしか提示されていないため断定できない）

**USP3判定**: 機能は実装済み。ただし用語統一（TRAP_STANDBY）未完。

---

## 2) 技術仕様（SSOT）の反映チェック

### (A) 「trapScore>=60 + multipleDivergences>=3」の統一品質ゲート
**現状: 未達（最重要の不一致）**

- SSOT:
  - “高品質保証”として `trapScore>=60` かつ `multipleDivergences>=3` を強く要求
- コード:
  - `logic/core/trapDetector.js` は `trapScore>=15` で `trapDetected` 扱い
  - `generateTrapAlert()` は `divergence.confidence>=0.70` などで発火しうる
  - `api/cron.js` の EMERGENCY 判定も `trapScore>60` ではなく `trap.isTrap && trap.confidence==='HIGH'` が主
- つまり、**SSOTが狙う「出さない判断（品質ゲート）」がコードで担保できていない**  
  （“出す/出さない”の最終ゲートが分散・曖昧）

### (B) 複数時間窓分析（hour, 4hour, day）
**現状: 条件付きで部分OK（ただしSSOTの表現と齟齬）**

- `services/cryptoquant/highResolution.js` は `CRYPTOQUANT_PLAN` により
  - premium/enterprise: `['hour','4hour','day']`
  - それ以外: `['day']`
- SSOTには「Professionalは dayのみ」とあるので、これは合理的。  
  ただしSSOT本文の“特徴”として複数窓を強調しているため、**Professional運用時はSSOTの訴求と実態がズレる**（マーケ/プロダクト表現側で調整が必要）

### (C) ニュース番組構造（Opening → Data Presentation → Commentator → Closing）
**現状: ENテンプレは概ね実装（ただしVeoの位置づけが弱い）**

- `services/telegram/messages/user/en/regular.en.js` に
  - Opening（GPT Reporter）
  - Data Presentation（Geminiコンテンツがある場合）
  - Commentator（Dr. Grok）
  - Closing
が存在し、構造自体はOK。

---

## 3) メッセージング反映チェック

### (A) タグライン「70%の時間、何もするな」
**現状: “思想”は入っているが、タグライン文字列としての統一実装は未確認/未統一**

- ENテンプレでは `Mode: Trap Standby — wait for clear edge. Prioritize defense.` のような表現はある  
- ただしSSOTの統一タグライン（各言語）を**定数として強制**している形跡は提示範囲にはない  
- さらに `BUG_STANDBY` 文言が残存しているため、SSOTのブランドメッセージと衝突

### (B) BUY/SELL/LONG/SHORT完全削除
**現状: ユーザー表示はほぼ削除できているが、内部ロジックに残存（危険）**

- `regular.en.js` は trapAlertがなければ `TRAP STANDBY`、あれば `Avoid Long/Short` で表示  
  → ユーザー向けはOK寄り
- しかし、`divergenceDetector.js` は BUY/SELL を返す関数が残り、trapAlert生成にも混入可能  
  → **“完全削除”の要件としては未達**

### (C) AVOID_LONG / AVOID_SHORT / STANDBY のみ
**現状: 表示は概ねOK / 内部は未完**

- `logic/core/trapDetector.js` の `generateTrapAlert()` が recommendation に AVOID/Standby を返すのはOK
- ただし `evaluateDivergenceSignalHighResolution()` が BUY/SELL を返すので、データ経路が汚染される

---

## 4) 価格設定（6市場別）と 6独立デプロイ

**現状: 提示コード範囲では“未実装/未確認”**

- 価格テーブル（EN/ES/PT-BR/JA/KO/AR）はSSOTにあるが、
  - `api/cron.js` / テンプレ / config から価格を表示している形跡が提示範囲にない
  - Whopプラン/価格をコードで参照・出し分けしている実装も提示範囲にない
- 6独立デプロイ（Vercel 6 deployments）についても
  - `vercel.json`、プロジェクト分割、環境変数（LANG固定）などの証跡が提示範囲にない
  - `api/cron.js` は `process.env.LANG` から言語を決めているので、**“言語ごとに別デプロイ”を前提にした作り**ではあるが、実際に6デプロイされているかはコードだけでは確証できない

> ここは「コードに完全再現されているか」の観点では、**現状は未達**（少なくとも価格は）。

---

## 5) 不足実装・不一致・改善点（具体指摘）

### A. 今すぐ直すべき“致命的”項目（SSOT再現を阻害）
1) **`api/cron.js` の未定義変数/スコープ崩壊を解消**
   - `trapAlert` を参照しているのに生成前（またはスコープ外）  
   - `shouldCallGrok` 未定義  
   - `trapDetection / marketBugDetection / psychologicalSupport / divergenceSignalResult` のスコープを REGULAR ブロック外でも参照している疑い  
   → これはSSOT以前に本番事故要因。最優先で静的解析/テストで潰すべき。

2) **統一品質ゲートを“単一箇所”で強制**
   - SSOT: `trapScore>=60` + `multipleDivergences>=3`（最重要）
   - 対応案:
     - `logic/core/signalQualityGate.js` がSSOTにある前提だが、提示コードでは使われていない/存在不明  
     - `generateTrapAlert()` の返却を最終ゲートにし、`alert=true` はこの条件を満たした場合のみ、満たさない場合は必ず `STANDBY` にする  
     - `api/cron.js` 側では **“trapAlertだけ”** を見て配信/EMERGENCY判定する（trap.isTrap等の別系統を排除）

3) **用語統一: BUG_STANDBY を完全撤去し TRAP_STANDBY に統一**
   - `api/cron.js` の正規化
   - `psychologicalSupport.js` の文言
   - テンプレ（全言語）  
   → SSOTで明確に「Trap Detection→Trap Defense」「BUG→TRAP」へ統一済み。

4) **BUY/SELLの内部残骸を撤去（“完全削除”を本当に完遂）**
   - `evaluateDivergenceSignalHighResolution()` の返却 `signal` を `AVOID_LONG/AVOID_SHORT/STANDBY` に置き換えるか、少なくとも外部に露出しないよう型を分離
   - `divergenceSignal` という名前で BUY/SELL が紛れ込むのは危険（他言語テンプレやログで漏れる）

### B. SSOT上は必須だが、コード上は未達/弱い項目
5) **EMERGENCYトリガーのSSOT一致**
   - SSOT: `trapScore > 60`、`liquidations > $500M`、（KOのみ kimchiPremium>8%）
   - 現状:
     - trapScore基準が中心になっていない
     - liquidations>500M の即時トリガーが `api/cron.js` には見当たらない（highResCQで取得しているのに使っていない）

6) **Veo動画生成の運用設計を見直し**
   - cron内で長時間ポーリングは危険
   - “別ジョブで事前生成→保存→配信時に添付”に寄せるべき（SSOTにも `contentStorage` があるので方向性は合っている）

7) **価格（6市場）をコードへ反映**
   - 価格をテンプレに表示するなら、`config/pricing.js` のようなSSOT直結の定数を作り、全言語テンプレが参照する形にする
   - SSOT内で v2.2/v2.3 で価格が揺れている（$69/$165/$588 vs $147/$397/$997 等）ため、**どれが最終かをコード側で確定**しないと整合しない  
     ※提示SSOTは「2.2 FINAL」と言いつつ更新履歴に2.3があり、価格が二系統ある。ここは“SSOT自体が矛盾”しているので、コードがどちらでも必ず不一致になります。最終価格を1つに確定させてください（CPO判断が必要）。

---

## 6) 総合評価（コード品質 × SSOT整合）

### 総合判定: **SSOT完全再現 = 未達**
- USP1/2/3の“存在”は揃っているが、  
  **品質ゲート・用語統一・BUY/SELL完全削除・配信トリガー・価格/デプロイ**がSSOT通りに固まっていない。
- 加えて `api/cron.js` のスコープ/未定義変数問題があり、**現状のままだと本番で不定動作する可能性が高い**。

---

## 最終提案（最短でSSOT準拠にする修正優先順位）
1) `api/cron.js` を **一度“実行可能状態”に整える**（未定義変数、スコープ、分岐の整理）
2) **アラートの唯一の出力を `trapAlert.recommendation` に統一**（他の signal 系を全廃）
3) **統一品質ゲート（trapScore>=60 & multipleDivergences>=3）を `generateTrapAlert()` で強制**
4) **BUG→TRAP 用語統一を全コード・全テンプレで完遂**
5) EMERGENCY/WATCH/STANDBY_BREAK のトリガーをSSOT通りに再実装（trapScore/liquidations/kimchi）
6) 価格テーブルと6デプロイ構成を“コード（設定）として”反映（SSOTの最終価格が確定してから）

必要なら、こちらで「SSOT準拠の最終形（アラート型・ゲート・用語・トリガー）に向けた `api/cron.js` のリファクタリング方針（関数分割・データフロー図・責務分離）」を、差分前提で具体パッチ設計まで落とします。

---

## 📊 API使用量

```json
{
  "prompt_tokens": 119295,
  "completion_tokens": 4965,
  "total_tokens": 124260,
  "prompt_tokens_details": {
    "cached_tokens": 0,
    "audio_tokens": 0
  },
  "completion_tokens_details": {
    "reasoning_tokens": 0,
    "audio_tokens": 0,
    "accepted_prediction_tokens": 0,
    "rejected_prediction_tokens": 0
  }
}
```

## 📋 確認したコードファイル

- **`api/cron.js`** (1616行): メインの定期配信・緊急配信API。USP1/2/3の統合実装
- **`logic/core/trapDetector.js`** (307行): USP1: Trap Defense Engineの核心ロジック
- **`logic/core/divergenceDetector.js`** (548行): USP1: 複数ダイバージェンス検出ロジック
- **`services/grok/psychologicalSupport.js`** (606行): USP3: Dr. Grok's Psychological Supportの実装
- **`services/grok/client.js`** (296行): USP1/3: Grok Xセンチメント解析
- **`services/grok/highResolution.js`** (354行): USP1: Grok X高解像度解析
- **`services/gemini/imageGenerator.js`** (237行): USP2: Gemini NanoBanana Pro画像生成
- **`services/gemini/videoGenerator.js`** (267行): USP2: Gemini Veo 3.1動画生成
- **`services/telegram/messages/user/en/regular.en.js`** (378行): ニュース番組構造のメッセージフォーマット（EN市場）
- **`services/cryptoquant/highResolution.js`** (473行): USP1: CryptoQuant高解像度データ取得（複数時間窓分析）
