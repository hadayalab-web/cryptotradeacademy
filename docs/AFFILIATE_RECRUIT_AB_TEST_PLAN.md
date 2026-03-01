# アフィリエイト獲得DM 最適化プラン (ABテスト・マッチング)

## 1. 目的
DMの「誰に(Who)」と「何を(What)」の整合性を高め、開封後の反応率（CTR/CVR）を最大化する。
具体的には、検索クエリの意図（Crypto vs AI/SaaS）に合わせた訴求を行い、かつ「募集要項型（事務的）」から「提案型（収益直結）」への切り替えをテストする。

## 2. 施策概要

### 2.1 クエリ×DMマッチング設計（コンテキスト駆動）
ユーザーが「何を探していたか」に基づき、DMの訴求軸（Angle）を動的に切り替える。

| Angle | 定義・対象キーワード | DM訴求ポイント | 
| :--- | :--- | :--- |
| **`crypto`** | `bitcoin`, `btc`, `trading`, `signals`, `gem` | 「BTC市場の知見を収益化」「トレーダー向け商材」 |
| **`ai_saas`** | `ai`, `gpt`, `saas`, `tool`, `automation` | 「AIトレンドに乗る」「高単価SaaS報酬」 |
| **`side_hustle`** | `money`, `affiliate`, `side hustle`, `income` | 「スキル不要」「既存フォロワーで収益化」 |

**判定ロジック:**
1.  **Search Query:** ヒットした検索キーワードの所属グループを最優先。
2.  **Bio Keyword:** クエリが汎用的な場合、Bio内の単語で補正。
3.  **Default:** 判定不能時は市場規模最大の `crypto` を適用。

### 2.2 DM文面 ABテスト設計
全6言語で実施。送信対象をランダムに50:50で分割し、2週間検証する。

| Variant | コンセプト | 仮説 | 特徴 |
| :--- | :--- | :--- | :--- |
| **A (Control)** | **募集要項型** | 「選出された」特別感で開封させるが、中身が堅い。 | ・件名: 特別ご招待<br>・本文: 箇条書き要項<br>・印象: 公的、事務的 |
| **B (Challenger)**| **収益提案型** | アフィリエイターは「報酬と商材」を最速で知りたい。 | ・件名: パートナーシップ提案<br>・本文: メリット提示<br>・印象: ビジネス、単刀直入 |

**Variant B (JA) 文面例:**
```text
{handle} 様、{angle} 関連の投稿を拝見しご連絡しました。

Trap Defence BTC — パートナーシップのご提案
• 報酬：50％リカーリング（継続報酬）
• 商材：{product_name}（Whopにて販売）
• メリット：あなたの既存フォロワーに対し、追加の収益源を即座に構築可能です。

すでにプロモーション用素材は完備されています。
詳細と参加リンクはこちら：
{inviteUrl}
```

## 3. 実装仕様

### 3.1 ファイル構成
- `config/affiliateRecruitConfig.js`: Angle定義、Product Name定義
- `config/affiliateRecruitDmTemplates.js`: Variant B テンプレート追加
- `services/td/affiliateRecruitSearch.js`: Angle判定ロジック追加
- `api/affiliate-recruit-run.js`: Variant振り分け、ログ記録

### 3.2 ログ・計測
KVおよび送信ログに以下を記録し、効果測定を行う。

- `dm_variant`: `v1_requirements` vs `v2_partnership`
- `dm_angle`: `crypto`, `ai_saas`, `side_hustle`
- `detected_via`: `query` vs `bio`

## 4. 評価・意思決定

### 4.1 勝ち判定基準 (2週間後)
- **Click / Sent (CTR)** が Variant A より **20%以上** 高い場合 → B を採用。
- 差が **±10%以内** → 文字数が少なくリスクの低い B を採用。
- **Signup / Click (CVR)** が著しく低い場合 → A に戻す。

### 4.2 早期停止条件 (Fail Fast)
- 開始48時間以内に、Variant B でのスパム報告（DM送信エラー・ブロック示唆）が A の2倍を超えた場合、直ちにテストを中止し A に戻す。
