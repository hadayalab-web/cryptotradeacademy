# 高性能アフィリエイター抽出：3 AI アイデア統合

Gemini・Grok・Copilot の提案を統合した実行可能なフレームワーク。

---

## 1. スコアリングに使うシグナル（統合版）

### 優先度順

| 順位 | シグナル | 全 AI 共通 | 算出方法 |
|------|----------|------------|----------|
| 1 | **エンゲージメント率 (ER)** | ◎ | (likes + RT + replies + quotes) / followers × 100。直近 10〜20 投稿で平均 |
| 2 | **Bio キーワード** | ◎ | affiliate, crypto, trading, BTC, signals, whale, passive income, earn, liquidity 等 |
| 3 | **フォロワー数（リーチ）** | ◎ | log10 正規化。1k〜50k が最適帯（ミッドティア） |
| 4 | **投稿頻度・活動性** | ◎ | 週あたり投稿数、日平均 2〜10 が目安 |
| 5 | **クリプト/トレード投稿率** | Grok | 直近ツイートで BTC, whale, trap, signal 等マッチ率 >40% |
| 6 | **有効リーチ** | Copilot | ER × フォロワー数（安定トラフィックの proxy） |
| 7 | **アフィリ履歴** | Copilot | 過去に ref, クーポン, whop.com, linktree 等を使用 |
| 8 | **外部リンク有無** | Gemini | whop, linktree, Telegram を bio に貼っている |
| 9 | **listed_count** | Gemini | 誰かのリストに入っている＝価値あり |
| 10 | **サブスク言及率** | Grok | subscription, recurring, passive 等（50% リカーリングに刺さる） |

---

## 2. 除外条件（Bot・フォロワー買い）

**3 AI 共通で使う除外:**

| チェック | 条件 |
|----------|------|
| FF 比異常 | followers/following > 10 または < 0.1 |
| 低 ER 高フォロワー | followers > 10k AND ER < 0.05% |
| アカウント年齢 | 180 日未満（6 ヶ月） |
| プロフィール不備 | description 空、default アイコン |
| スパム投稿 | 同一テキスト重複 >50%、リンク率 >80% |
| 機械的投稿 | 24/7 一定間隔、同文大量 RT |

**Gemini 追加:** listed_count == 0、verified=false かつ followers > 50k

**Copilot 追加:** フォロワー 20〜50 人サンプルで Bot 率 >20% → 除外（実装コスト高）

---

## 3. 狙い目の層（Trap Defence 向け）

| 層 | 出典 | 理由 |
|----|------|------|
| **無料シグナル配信者** | Gemini | TG/Discord で無料シグナル、有料化できていない。提案が刺さる |
| **TradingView 投稿者** | Gemini | チャート分析を論理的にアップ。VSL に共感しやすい |
| **Whop/Launchpass 利用者** | Gemini | bio に記載＝導入ハードル低 |
| **1k〜50k ミッドティア** | Grok | CVR 最高。100k+ は飽和・Bot 率高 |
| **signals / whale alert 投稿者** | Grok | クリプトで 2〜3x ROI |
| **Telegram 運営者** | Copilot, Grok | 配信商品と親和性高 |
| **DM for collab / open to affiliate 等** | Grok | 意欲が高い明示シグナル |

---

## 4. 統合スコアリング式（0–100）

```
score = 
  0.30 × norm_er +           // ER（最重要）
  0.20 × norm_bio +         // Bio キーワード（2+ で高得点）
  0.20 × norm_followers +   // log10、1k〜50k で適正
  0.15 × norm_activity +    // 投稿頻度
  0.15 × norm_crypto -      // クリプト投稿率 or アフィリ履歴
  penalty_bot
```

**閾値:** score > 70 で DM 優先。40〜70 はウォッチリスト。

**除外で score=0:** FF 比異常、ER<0.1%、180日未満、bio 空、listed_count=0（オプション）

---

## 5. 検索クエリ最適化（Grok）

```
"affiliate crypto" OR "looking for promo BTC" OR "trading signals affiliate" lang:en
"earn $ with crypto" min_faves:10
```

言語別に lang:ja, lang:es 等に切り替え。`min_faves` で質フィルタ。

---

## 6. DM 文案の統合ヒント

| 要素 | 出典 | 内容 |
|------|------|------|
| **ストーリー** | Gemini | 「多くのトレーダーが Whale Trap で資金を溶かす中、あなたのフォロワーに『守るためのシステム』を提供しませんか？」 |
| **開封率** | Grok | 「Whale traps avoid like your posts」等、VSL の世界観を挿入で開封率 2x |
| **成果ベース** | Copilot | 短く。CVR、LTV、50% リカーリング、使える素材（自由度）を提示 |
| **希少性** | Copilot | 「テストで少数枠」「トライアル付き」で反応率↑ |

---

## 7. 実行プラン（Copilot ベース）

1. **データ取得**: user + 直近 20 投稿。`user.fields=public_metrics,description,created_at`
2. **スコア算出**: 統合式で 0–100 スコア
3. **除外**: Bot 条件に該当する候補を除外
4. **DM 送信**: 上位から順に（例: 1 日 60 通の枠内で）
5. **計測**: 反応率、承諾率、トライアル登録率、成約率
6. **チューニング**: 実績データでウェイト調整

---

## 8. 実装の優先順位

| Phase | 内容 |
|-------|------|
| **1** | user.fields 拡張（public_metrics, description）、ER・Bio・フォロワーで基本スコア |
| **2** | 除外条件（FF 比、年齢、bio 空）の実装 |
| **3** | 検索クエリに min_faves や意欲系キーワード追加 |
| **4** | クリプト投稿率、アフィリ履歴スコア（テキスト解析） |
| **5** | 実績との突き合わせ、ウェイトの機械学習（将来） |
