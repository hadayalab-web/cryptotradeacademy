# 高性能アフィリエイター抽出のシグナルとスコアリング

候補を「送る順」に並べるためのシグナル案。

---

## 1. 今すぐ使えるシグナル（X API から取得可能）

| シグナル | 意味 | 取得方法 |
|----------|------|----------|
| **エンゲージメント率** | フォロワーあたりの反応率＝発信力の目安 | post.public_metrics (like, retweet) ÷ user.public_metrics.followers_count |
| **フォロワー数ティア** | 一定規模以上＝到達範囲 | user.public_metrics.followers_count |
| **アフィリ言及密度** | 投稿内の「アフィリ・案件・稼ぎ」系ワード数 | テキスト解析（既存 scoreWhopImmune の逆） |
| **投稿頻度** | 直近の投稿数＝活動度 | 検索結果の投稿数 |
| **bio の関連キーワード** | プロフィールに affiliate, 副業, crypto 等 | user.description |

**X API の拡張**: `user.fields` に `public_metrics,description` を追加すれば取得可能。

---

## 2. 将来使えるシグナル（FirstPromoter で溜まったデータ）

| シグナル | 意味 |
|----------|------|
| **登録 → 初回売上までの日数** | 短い＝意欲が高い |
| **累計紹介売上** | 実際の成約力 |
| **リカーリング率** | サブスク継続＝質の高い紹介 |
| **クリック → 登録率** | ref リンクの効果 |

これらは FirstPromoter のデータが溜まってから「過去に成約したプロフィール」と照合する形で使える。

---

## 3. スコアリング案（Phase 1）

```
score = 0
+ engagement_rate * 30         （上限30。0.01 = 1%, 高エンゲージメントは稼ぐ力の代理）
+ log10(followers) * 5         （上限25。1000→15, 1万→20）
+ affiliate_bio_bonus (0 or 10) （bio に affiliate/副業/案件 等があれば +10）
+ posting_frequency_bonus (0-10) （直近7日投稿数に応じて）
```

**除外条件**: フォロワー100未満、engagement_rate が異常低い（Bot 疑い）など。

---

## 4. 実装ステップ

1. **affiliateScoutSearch** のレスポンスに `user.public_metrics`, `user.description` を含める（search の user.fields 拡張）
2. **scoreAffiliateCandidate(author, posts, usersById)** を新規作成
3. **affiliate-scout-run** で候補をスコアでソートし、上位から DM 送信
4. **KV** に「送信先 handle → スコア」を保存し、後から FirstPromoter の成約と突き合わせ（Phase 2）

---

## 5. Gemini の提案（2026-02 時点）

**案件との相性**: 50%リカーリング＋1日無料トライアル＋「狩られる側から守る側へ」VSL → **教育型アフィリエイター**と相性が良い。

### 成約率が高いシグナル

| シグナル | 内容 |
|----------|------|
| **キーワード適合性** | bio/tweet に「分析」「Structure」「Whale」「Liq」「オンチェーン」等。解説・教育のニュアンス |
| **メンション/リプライの質** | 「勉強になります」「参考にしています」など感謝リプライが多い＝フォロワーが信頼 |
| **外部リンクの有無** | whop.com, linktree, Telegram を貼っている＝マネタイズ動線ができているプロ |
| **多言語ポテンシャル** | ES/PT 圏はクリプト熱が高く競合が少ない |

### 除外ロジック（Bot・フォロワー買い）

- エンゲージメント異常: Like 極端に少ない／Like だけ多く Reply ゼロ
- FF 比 ≈ 1:1: 相互フォローで膨らませた可能性
- 1ヶ月以内で数万フォロワー: 除外
- 同一ハッシュタグ連投・コピペ多い: 除外

### 狙い目の層（Trap Defence 向け）

- **無料シグナル配信者**: TG/Discord で無料シグナル出しているが有料化できていない層
- **TradingView 投稿者**: チャート分析を論理的にアップ、VSL に共感しやすい
- **Whop/Launchpass 利用者**: bio に記載＝導入ハードル低い

### スコアリング変数例

- Keyword Score（教育系キーワード含有数）
- Engagement（Like+RT+Reply）/ Tweets 数
- log(Followers)（数の暴力を抑える）
- 減点: FF 比≈1, Bot パターン

### 除外条件例

- `followers_count < 1000`
- `listed_count == 0`（誰のリストにも入っていない）
- `verified == false` かつ `followers_count > 50000`（フェイク疑い）

### DM 文案のヒント

「多くのトレーダーが Whale Trap で資金を溶かす中、あなたのフォロワーに『守るためのシステム』を提供しませんか？」（相手のフォロワーを救うスタンス）

---

## 6. Grok の提案（2026-02 時点）

**実務知見**: フォロワー 1k〜10k のミッドティア（ER 1〜5%）が CVR 最高。100k+ は飽和・Bot 率高。クリプト系は「signals」「whale alert」投稿者が 2〜3x ROI。

### 成約しやすいシグナル（優先順位）

| シグナル | 計算式 | 高性能閾値 |
|----------|--------|------------|
| **エンゲージメント率 (ER)** | (likes + RT + replies + quotes) / followers × 100 | >1.5% |
| **フォロワー数** | log10 正規化 | 1k〜50k |
| **Bio キーワード** | affiliate, crypto, trading, BTC, signals, whale, passive income | 2+ |
| **投稿頻度** | tweet_count / アカウント日数 | 2〜10/日 |
| **クリプト投稿率** | BTC, ETH, whale, trap, signal 等マッチ率 | >40% |
| **サブスク言及率** | subscription, monthly, recurring, passive | >10% |

**効く順**: ER > Bio キーワード > 投稿率 > フォロワー

### Bot・フォロワー買い除外

| チェック | 条件 |
|----------|------|
| FF 比異常 | followers/following > 10 または < 0.1 |
| 低 ER 高フォロワー | followers > 10k AND ER < 0.05% |
| アカウント年齢 | 180 日未満 |
| プロフィール不備 | description 空 or default アイコン |
| スパム投稿 | 同一テキスト重複 >50% or リンク率 >80% |

### スコアリング式（0–100、>70 で DM 優先）

```
norm_er = min(ER/5, 1)      × 0.35  （最重要）
norm_followers = log10/5    × 0.20
norm_bio = キーワード数/5   × 0.20
norm_freq = 投稿頻度/10     × 0.15
norm_crypto = クリプト率    × 0.10
```

除外: FF 比 >10 or <0.1、ER<0.1%、180日未満、bio 空 → score=0

### 検索クエリ最適化

- `"affiliate crypto" OR "looking for promo BTC" OR "trading signals affiliate" lang:en`
- `"earn $ with crypto" min_faves:10`（質フィルタ）

### 意欲シグナル

- ツイートに「DM for collab」「open to affiliate」「need promo deals」
- Bio に「Trader | Affiliate Marketer | DM open」
- Telegram 言及（TG channel）＝配信商品に親和性

### DM 文案ヒント

「Whale traps avoid like your posts」挿入で開封率 2x。VSL 活用。

---

## 7. Copilot の提案（2026-02 時点）

### 主要シグナル（優先度順）

| シグナル | 理由 | 算出方法 |
|----------|------|----------|
| **ER** | CTA で動きやすい | (likes+replies+RT+quotes) / followers、直近 N 投稿で平均 |
| **有効リーチ** | 安定トラフィック | ER × フォロワー数 |
| **投稿頻度・一貫性** | 定期購読商品に重要 | 週あたり投稿数、安定性 |
| **Bio キーワード** | crypto, trade, bitcoin, whale, liquidity | キーワードスコア |
| **アフィリ履歴** | 過去の ref/クーポン使用＝意欲高 | リンク・プロモ言及 |

### Bot 除外チェック

- アカウント年齢 vs フォロワー増加速度
- 写真なし・空 bio・外部リンクなし
- FF 比の極端な不均衡
- 24/7 投稿、一定間隔、同文大量 RT（機械性）
- コメントが「Nice」「Great」等テンプレ率高
- フォロワーサンプルで Bot 率 >20% → 除外

### 意欲高い層の抽出

- トレード系プロダクト紹介歴、アフィリリンク・ref 言及
- bio に earn, signals, paid, revenue
- Telegram/Discord 運営者＝サブスク親和性高
- 短期テスト：上位 100 に DM → 反応・承諾・トライアル登録を計測 → 係数チューニング

### スコアリング式（0–100）

```
ER_score (0-30)     = norm(ER) × 30
Reach_score (0-25)  = norm(log followers) × 25
Activity_score (0-15) = norm(週投稿数) × 15
Bio_score (0-15)    = キーワードマッチ × 15
Affiliate_history (0-15) = アフィリ履歴あれば満点
Penalty_bot (0-50)  = ボット疑いで減点
```

**即除外**: Penalty_bot ≥ 30、フォロワー Bot 率 > 40%

**初期ウェイト**: ER 0.30, Reach 0.25, Activity 0.15, Bio 0.15, History 0.15

### 実行プラン

1. user + 直近 20 投稿取得（user.fields=public_metrics,description,created_at）
2. スコア算出 → 上位 300 抽出
3. フォロワーサンプルで Bot 率推定 → 除外
4. 上位 100 にパーソナライズ DM → 反応・承諾・トライアル登録を計測
5. 実績データでウェイト調整 → スケールアップ

### DM 文面のヒント

短く、成果ベース（CVR、LTV、50% リカーリング）と**自由度**（使える素材）を提示。「テストで少数枠」「トライアル付き」を強調で反応率↑。

---

## 8. 3 AI 比較サマリー

| 項目 | Gemini | Grok | Copilot |
|------|--------|------|---------|
| **ER** | 重視 | 最重視 (0.35) | 最重視 (0.30) |
| **狙い目** | 教育型、無料シグナル配信者 | 1k〜50k ミッドティア | 有効リーチ (ER×followers) |
| **除外** | FF≈1, listed_count=0 | FF>10 or <0.1, 180日未満 | フォロワー Bot 率サンプル |
| **独自** | listed_count, TradingView | min_faves 検索, Python 式 | フォロワーサンプル Bot 検証 |
| **DM** | フォロワー救うスタンス | Whale traps 文言で開封 2x | 少数枠・トライアル強調 |

**共通**: ER > Bio キーワード > フォロワー／活動性。ミッドティア（1k〜50k）重視。Bot 除外必須。

---

## 9. 注意点（共通）

- エンゲージメント率は「フォロワー買い」で水増しされている場合がある
- 最初はスコアを「参考」にしつつ、幅広く送って実績データを貯める方が学習しやすい
- スコア上位だけ送ると偏りがち。A/B テスト（高スコア層 vs 低スコア層）で検証するのもあり
