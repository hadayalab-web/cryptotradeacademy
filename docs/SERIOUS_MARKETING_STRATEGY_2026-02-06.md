# 本気のマーケティング戦略 — CryptoTrade Academy / Trap Defence（2026-02-06）

**目的**: 露出・収益を最大化する「他にできることすべて」を整理し、即効〜中期のロードマップに落とす。

---

## 1. 現状サマリ

| 項目 | 状態 |
|------|------|
| X 引用リポスト | 約800投稿/日、6言語、約300人ストック、Grok セールスレター＋統合導線 |
| その他 X | Free Report・Minimal Version の Cron あり |
| ファネル | Telegram（Minimal オプトイン）→ Whop（$99 トライアル、PRO 50% OFF） |
| ペルソナ | 含み損・トレード依存・「痛み→対価を安いと感じる」層 |
| 技術 | X Webhook、KV、CryptoQuant、6言語、Vercel |

**直近の強化**: 引用リポスト 1回あたり投稿数2倍・オフピーク撤廃で約800投稿/日へ増加済み。

---

## 2. 3AI からアイデアを集める

GPT-5.2 / Gemini-3-pro / Grok-4-1 から「他にできることすべて」を収集する:

```bash
node scripts/ask-gpt-gemini-grok-marketing-strategy.js
```

- 出力: `docs/ai-analysis-results/MARKETING_STRATEGY_3AI_*.md`
- **レビュー（反映済み）**: `docs/ai-analysis-results/MARKETING_STRATEGY_3AI_REVIEW_2026-02-06.md`

---

## 3. 即効施策（明日〜1週間）

**3AI 共通の即効施策**（レビュー反映）:

- **Telegram を「販売導線」に再設計**: 固定メッセを 3ブロック（30秒で理解 → 使い方 → 24h限定オファー＋FAQ）。Bot コマンド /start, /pro, /faq で迷子を減らす。
- **引用リポストの「勝ちテンプレ」化**: 直近7日をクリック・オプトイン・購入でランキングし、上位をテンプレ化。**70% 勝ちテンプレ・30% テスト**に割り振り。UTM でバリアント識別。
- **Whop の入り口を1つ追加**: $99 の前に $7〜19 の 3日パス or 初月大幅割引を設置（Tripwire）。
- **LP（Minimal）ファーストビュー改善**: 痛み → 解決（Trap Score）→ 証拠 → CTA の順に統一。
- **未購入者へ 48h 限定オファー**: Telegram で Whop 到達済み未購入者に期限付き割引を 1 通送る（手動→効果出たら Bot 化）。
- **X 本番・計測の土台**: `X_POSTING_DRY_RUN=false` 確認、引用・Minimal・Whop リンクに UTM 付与。

---

## 4. 中期施策（1〜3ヶ月）

- **Webhook スコアリング有効化**: インフルエンサー別エンゲージメントで `enableScoring: true` を有効化し、「買う人を連れてくる人」を優先ローテ。
- **セールスレター A/B**: Grok 生成＋テンプレートを 2 バリアント（痛み vs 緊急）で回し、CVR の高い方を固定。
- **Minimal→Regular の自動フォロー**: オプトイン後 3日・7日で「有料トライアル」案内を Bot/メールで送る。
- **Whop 3段オファー＋年額**: Starter（低価格）→ Regular → Pro/Elite、年額割引で LTV 最大化。
- **アフィリエイト本格化**: 紹介報酬 20〜40%（継続課金連動）。既存会員・インフルに紹介リンクを配布。
- **Trap Score Daily/Weekly の IP 化**: 毎日定時で「Trap Score Daily」、週次で「Weekly Review」を 6言語で発行し、指名検索・リピートを増やす。
- **YouTube Shorts / TikTok**: 15秒の Trap Score 解説を EN/ES/JA から開始し、LP 誘導。
- **SEO**: 「BTC 含み損」「Trap Score」等の痛み KW で記事＋毎週データ記事を更新し、検索流入→オプトイン。

---

## 5. 大胆アイデア・チャネル拡張

**推奨度が高いもの（実装コスト vs インパクト）**  
- **Trap Score ウィジェット / API 配布**: ブログ・メディア・インフルが埋め込める「今日の Trap Score」で被リンク・流入を自動増殖。  
- **Trap Score Index の業界標準化 PR**: 「BTC 危険度指数」としてプレスリリース→暗号メディア引用。  
- **大型インフル・取引所との提携**: 共同コース・レベニューシェア型。小規模パイロットから。  
- **X 以外**: 有料広告（Crypto 特化アドネット）、Discord コミュニティ、Paid Ads（Coinzilla 等）。

**注意して検討するもの**  
- 独自トークン / NFT: 法務・開発コスト大。優先度は下げてよい。  
- 損失補填キャンペーン: 条件設計・運用リスクあり。軽い保証から後で検討。

---

## 6. 測定・PDCA

**必須ファネル（言語別）**: X インプレ → LP クリック（CTR）→ Telegram 参加 → Whop 到達 → 購入 → 30日継続率。

**まず追う KPI**: 日次投稿数、CTR（投稿→LP）、LP→Telegram 参加率、Telegram→Whop 到達率、Whop 購入率・AOV、解約率。テンプレ別・インフルエンサー別の下流 CVR。

**AB テスト優先順**: (1) Telegram 固定メッセ (2) LP ファーストビュー (3) 引用リポストの角度（痛み/緊急/数字） (4) Whop 入り口価格 (5) 投稿時間帯（言語別）。

**用意するもの**: 引用・Minimal・Whop リンクへの UTM（`utm_source=quote_repost` 等）、テンプレ/バリアント ID、言語別日次集計（手集計 or 簡易スクリプト）。

---

## 7. 優先ロードマップ

| フェーズ | 期間 | アクション |
|----------|------|------------|
| **Phase 1** | 今週 | Telegram 固定メッセ再設計、引用リポスト UTM 付与・勝ちテンプレ抽出の準備、LP ファーストビュー改善、未購入者へ 48h オファー（手動で試す） |
| **Phase 2** | 2週間以内 | Whop 入り口追加（$7〜19 Tripwire）、Webhook スコアリング有効化、セールスレター 2 バリアント A/B |
| **Phase 3** | 1ヶ月 | Minimal→Regular 自動フォロー、Whop 3段＋年額、アフィリエイト開放、Trap Score Daily 定例化 |
| **Phase 4** | 2〜3ヶ月 | YouTube Shorts / SEO 記事、広告 or インフル提携パイロット、KPI ダッシュボード整備 |

---

## 8. トップ5アクション（明日から）— レビュー反映版

1. **Telegram 固定メッセを「販売導線」に作り替える**: 30秒理解 → 使い方 → 24h 限定オファー → FAQ。Bot で /start, /pro, /faq を用意。
2. **引用リポストに UTM を付与し、勝ちテンプレを決める準備**: 直近 7 日分をクリック・オプトインでランキングし、上位の角度を 70% で回す設計にする。
3. **Whop に「入り口」を1つ追加**: $7〜19 の 3日パス or 初月大幅割引を設置。
4. **LP（Minimal）のファーストビューだけ改善**: 痛み → 解決 → 証拠 → CTA の順に統一。
5. **未購入者に 48h 限定オファーを 1 回送る**: Telegram で Whop 到達済み未購入者を対象に手動で送り、反応を見てから Bot 化を検討。

---

## 9. 参照

- 引用リポスト即効性アップ: `docs/QUOTE_REPOST_IMMEDIATE_REVENUE_2026-02-06.md`
- ビジネス全体像: `docs/BUSINESS_OVERVIEW.md`
- 3AI アイデア生出力: `docs/ai-analysis-results/MARKETING_STRATEGY_3AI_*.md`
- **3AI レビュー（本戦略の根拠）**: `docs/ai-analysis-results/MARKETING_STRATEGY_3AI_REVIEW_2026-02-06.md`
