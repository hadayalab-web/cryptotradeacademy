# 詳細投稿スケジュールと根拠（2026-01-25）
**作成日時**: 2026-01-25  
**作成者**: COO（Cursor/Composer 1）  
**目的**: 24時間で期待されるビジネス指標の根拠となる、具体的な投稿スケジュールの完全な詳細

---

## 📋 エグゼクティブサマリー

このドキュメントは、`scripts/analyze_business_metrics_24h_correct.py`で計算された期待値の根拠となる、**具体的な投稿スケジュール**を完全に記録したものです。

### 投稿タイプ別の1日あたりの投稿数

| 投稿タイプ | 1日あたりの投稿数 | 根拠 |
|-----------|-----------------|------|
| **Quote Reposts（引用リポスト）** | **10回** | vercel.json: UTC 0,1,20,21（4時間）× 2-3言語/時間 = 10回 |
| **Free Reports（無料版レポート）** | **5回** | vercel.json: UTC 12,13,14,15,18（5時間）× 1言語/時間 = 5回 |
| **Minimal Version（無料版）** | **1回** | vercel.json: UTC 8,20（2時間、1日1回のみ） = 1回 |
| **合計** | **16回** | 全投稿タイプの合計 |

---

## 🕐 詳細投稿スケジュール（UTC時刻別）

### UTC 0:00（引用リポスト）

**投稿タイプ**: Quote Reposts（引用リポスト）  
**対象言語**: AR（アラビア語）、JA（日本語）  
**各言語の投稿数**: 2回/言語  
**合計投稿数**: 4回

#### AR（アラビア語）- 2回

**インフルエンサー選択基準**:
- ストックから選択: 10人ストック済み（`config/influencerStrategy.js`より）
- インプレッション目標: 30,000-80,000/投稿（`config/influencerStrategy.js`より）
- 選択方法: `selectInfluencersForImpressionTarget()`関数により、インプレッション数でソートして上位2人を選択

**投稿内容**:
- Grok APIが動的に生成（`api/x-quote-repost.js`の`generateQuoteRepostTextWithGrok()`関数）
- フォールバック: `FALLBACK_QUOTE_REPOST_TEMPLATES.ar`テンプレート
- テンプレート例: `"موافق! TrapDefence اكتشف هذا 🚀 ${whopLink} ${freeLink} ${question} #Bitcoin #تحليل_بيتكوين #TrapDefence"`
- 文字数制限: 140文字以内（引用リポスト用）

**期待インプレッション数**: 80,000/日（SSOTより）

#### JA（日本語）- 2回

**インフルエンサー選択基準**:
- ストックから選択: 10人ストック済み（`config/influencerStrategy.js`より）
- インプレッション目標: 30,000-80,000/投稿（`config/influencerStrategy.js`より）
- 選択方法: `selectInfluencersForImpressionTarget()`関数により、インプレッション数でソートして上位2人を選択

**投稿内容**:
- Grok APIが動的に生成（`api/x-quote-repost.js`の`generateQuoteRepostTextWithGrok()`関数）
- フォールバック: `FALLBACK_QUOTE_REPOST_TEMPLATES.ja`テンプレート
- テンプレート例: `"同意！TrapDefenceで検知済み 🚀 ${whopLink} ${freeLink} ${question} #ビットコイン #ビットコイン分析 #TrapDefence"`
- 文字数制限: 140文字以内（引用リポスト用）

**期待インプレッション数**: 90,000/日（SSOTより）

---

### UTC 1:00（引用リポスト）

**投稿タイプ**: Quote Reposts（引用リポスト）  
**対象言語**: KO（韓国語）  
**各言語の投稿数**: 2回  
**合計投稿数**: 2回

#### KO（韓国語）- 2回

**インフルエンサー選択基準**:
- ストックから選択: 10人ストック済み（`config/influencerStrategy.js`より）
- インプレッション目標: 50,000-100,000/投稿（`config/influencerStrategy.js`より）
- 選択方法: `selectInfluencersForImpressionTarget()`関数により、インプレッション数でソートして上位2人を選択

**投稿内容**:
- Grok APIが動的に生成（`api/x-quote-repost.js`の`generateQuoteRepostTextWithGrok()`関数）
- フォールバック: `FALLBACK_QUOTE_REPOST_TEMPLATES.ko`テンプレート
- テンプレート例: `"동의! TrapDefence가 이것을 감지했습니다 🚀 ${whopLink} ${freeLink} ${question} #비트코인 #비트코인분석 #TrapDefence"`
- 文字数制限: 140文字以内（引用リポスト用）

**期待インプレッション数**: 100,000/日（SSOTより）

---

### UTC 8:00（Minimal Version）

**投稿タイプ**: Minimal Version（無料版）  
**対象言語**: 全6言語（EN, ES, PT-BR, AR, JA, KO）  
**各言語の投稿数**: 1回/言語  
**合計投稿数**: 6回（スレッド形式）

#### 全6言語 - 各1回（スレッド形式）

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ（AR/JAは単一投稿）
- メイン投稿: `TWEET_TEMPLATES[lang]`テンプレートを使用（`api/x-post-free-report.js`より）
- リプライ: `generateThreadReply()`関数により生成（データ深掘り、インサイト、CTA）

**期待インプレッション数**: 
- EN: 250,000/日
- ES: 120,000/日
- PT-BR: 110,000/日
- AR: 80,000/日
- JA: 90,000/日
- KO: 100,000/日
- **合計**: 750,000/日（SSOTより）

**根拠**: `docs/SSOT_KPI_FUNNEL_STATUS_2026-01-24.md`より

---

### UTC 12:00（Free Reports）

**投稿タイプ**: Free Reports（無料版レポート）  
**対象言語**: JA（日本語）  
**各言語の投稿数**: 1回  
**合計投稿数**: 1回

#### JA（日本語）- 1回

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ（`getThreadStrategy()`により、JAは単一投稿に設定可能）
- メイン投稿: `TWEET_TEMPLATES.ja`テンプレートを使用
- リプライ: `generateThreadReply()`関数により生成

**期待インプレッション数**: 90,000/日（SSOTより）

---

### UTC 13:00（Free Reports）

**投稿タイプ**: Free Reports（無料版レポート）  
**対象言語**: KO（韓国語）  
**各言語の投稿数**: 1回  
**合計投稿数**: 1回

#### KO（韓国語）- 1回

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ
- メイン投稿: `TWEET_TEMPLATES.ko`テンプレートを使用
- リプライ: `generateThreadReply()`関数により生成

**期待インプレッション数**: 100,000/日（SSOTより）

---

### UTC 14:00（Free Reports）

**投稿タイプ**: Free Reports（無料版レポート）  
**対象言語**: EN（英語）、PT-BR（ポルトガル語）  
**各言語の投稿数**: 1回/言語  
**合計投稿数**: 2回

#### EN（英語）- 1回

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ
- メイン投稿: `TWEET_TEMPLATES.en`テンプレートを使用
- リプライ: `generateThreadReply()`関数により生成

**期待インプレッション数**: 250,000/日（SSOTより）

#### PT-BR（ポルトガル語）- 1回

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ
- メイン投稿: `TWEET_TEMPLATES['pt-br']`テンプレートを使用
- リプライ: `generateThreadReply()`関数により生成

**期待インプレッション数**: 110,000/日（SSOTより）

---

### UTC 15:00（Free Reports）

**投稿タイプ**: Free Reports（無料版レポート）  
**対象言語**: ES（スペイン語）  
**各言語の投稿数**: 1回  
**合計投稿数**: 1回

#### ES（スペイン語）- 1回

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ
- メイン投稿: `TWEET_TEMPLATES.es`テンプレートを使用
- リプライ: `generateThreadReply()`関数により生成

**期待インプレッション数**: 120,000/日（SSOTより）

---

### UTC 18:00（Free Reports）

**投稿タイプ**: Free Reports（無料版レポート）  
**対象言語**: AR（アラビア語）  
**各言語の投稿数**: 1回  
**合計投稿数**: 1回

#### AR（アラビア語）- 1回

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ（ARは単一投稿に設定可能）
- メイン投稿: `TWEET_TEMPLATES.ar`テンプレートを使用
- リプライ: `generateThreadReply()`関数により生成

**期待インプレッション数**: 80,000/日（SSOTより）

---

### UTC 20:00（引用リポスト + Minimal Version）

**投稿タイプ**: Quote Reposts（引用リポスト）、Minimal Version（無料版）  
**対象言語**: EN（英語）、PT-BR（ポルトガル語）  
**各言語の投稿数**: 引用リポスト2回/言語、Minimal Version 1回/言語  
**合計投稿数**: 6回（引用リポスト4回 + Minimal Version 2回）

#### EN（英語）- 引用リポスト2回

**インフルエンサー選択基準**:
- ストックから選択: 20人ストック済み（`config/influencerStrategy.js`より）
- インプレッション目標: 100,000-200,000/投稿（`config/influencerStrategy.js`より）
- 選択方法: `selectInfluencersForImpressionTarget()`関数により、インプレッション数でソートして上位4人を選択（ENは4本/日）

**投稿内容**:
- Grok APIが動的に生成（`api/x-quote-repost.js`の`generateQuoteRepostTextWithGrok()`関数）
- フォールバック: `FALLBACK_QUOTE_REPOST_TEMPLATES.en`テンプレート
- テンプレート例: `"Agree! TrapDefence detected this 🚀 ${whopLink} ${freeLink} ${question} #Bitcoin #BTCAnalysis #TrapDefence"`
- 文字数制限: 140文字以内（引用リポスト用）

**期待インプレッション数**: 250,000/日（SSOTより）

#### PT-BR（ポルトガル語）- 引用リポスト2回

**インフルエンサー選択基準**:
- ストックから選択: 10人ストック済み（`config/influencerStrategy.js`より）
- インプレッション目標: 50,000-100,000/投稿（`config/influencerStrategy.js`より）
- 選択方法: `selectInfluencersForImpressionTarget()`関数により、インプレッション数でソートして上位2人を選択

**投稿内容**:
- Grok APIが動的に生成（`api/x-quote-repost.js`の`generateQuoteRepostTextWithGrok()`関数）
- フォールバック: `FALLBACK_QUOTE_REPOST_TEMPLATES['pt-br']`テンプレート
- テンプレート例: `"Concordo! TrapDefence detectou isso 🚀 ${whopLink} ${freeLink} ${question} #Bitcoin #AnáliseBTC #TrapDefence"`
- 文字数制限: 140文字以内（引用リポスト用）

**期待インプレッション数**: 110,000/日（SSOTより）

#### EN（英語）- Minimal Version 1回

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ
- メイン投稿: `TWEET_TEMPLATES.en`テンプレートを使用
- リプライ: `generateThreadReply()`関数により生成

**期待インプレッション数**: 250,000/日（SSOTより）

#### PT-BR（ポルトガル語）- Minimal Version 1回

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ
- メイン投稿: `TWEET_TEMPLATES['pt-br']`テンプレートを使用
- リプライ: `generateThreadReply()`関数により生成

**期待インプレッション数**: 110,000/日（SSOTより）

---

### UTC 21:00（引用リポスト）

**投稿タイプ**: Quote Reposts（引用リポスト）  
**対象言語**: ES（スペイン語）  
**各言語の投稿数**: 2回  
**合計投稿数**: 2回

#### ES（スペイン語）- 2回

**インフルエンサー選択基準**:
- ストックから選択: 10人ストック済み（`config/influencerStrategy.js`より）
- インプレッション目標: 50,000-100,000/投稿（`config/influencerStrategy.js`より）
- 選択方法: `selectInfluencersForImpressionTarget()`関数により、インプレッション数でソートして上位2人を選択

**投稿内容**:
- Grok APIが動的に生成（`api/x-quote-repost.js`の`generateQuoteRepostTextWithGrok()`関数）
- フォールバック: `FALLBACK_QUOTE_REPOST_TEMPLATES.es`テンプレート
- テンプレート例: `"¡De acuerdo! TrapDefence detectó esto 🚀 ${whopLink} ${freeLink} ${question} #Bitcoin #AnálisisBTC #TrapDefence"`
- 文字数制限: 140文字以内（引用リポスト用）

**期待インプレッション数**: 120,000/日（SSOTより）

---

## 📊 言語別投稿スケジュールサマリー

| 言語 | Quote Reposts | Free Reports | Minimal Version | 合計投稿数 | 期待インプレッション数/日 |
|------|--------------|--------------|----------------|-----------|---------------------|
| **EN** | 4回（UTC 20:00 × 2） | 1回（UTC 14:00） | 1回（UTC 8:00, 20:00） | **6回** | **250,000** |
| **ES** | 2回（UTC 21:00 × 2） | 1回（UTC 15:00） | 1回（UTC 8:00） | **4回** | **120,000** |
| **PT-BR** | 2回（UTC 20:00 × 2） | 1回（UTC 14:00） | 1回（UTC 8:00, 20:00） | **4回** | **110,000** |
| **AR** | 2回（UTC 0:00 × 2） | 1回（UTC 18:00） | 1回（UTC 8:00） | **4回** | **80,000** |
| **JA** | 2回（UTC 0:00 × 2） | 1回（UTC 12:00） | 1回（UTC 8:00） | **4回** | **90,000** |
| **KO** | 2回（UTC 1:00 × 2） | 1回（UTC 13:00） | 1回（UTC 8:00） | **4回** | **100,000** |
| **合計** | **14回** | **6回** | **6回** | **26回** | **750,000** |

**注意**: 実際の投稿数は、`vercel.json`の設定と`api/x-quote-repost.js`のロジックにより、以下のように調整されます：
- Quote Reposts: 10回/日（UTC 0,1,20,21の4時間で実行、各時間2-3言語）
- Free Reports: 5回/日（UTC 12,13,14,15,18の5時間で実行、各時間1言語）
- Minimal Version: 1回/日（UTC 8,20の2時間で実行、1日1回のみ）

---

## 🎯 インフルエンサー選択ロジックの詳細

### ストック管理

**ストック数設定**（`config/influencerStrategy.js`より）:
- EN: 20人ストック（投稿数4 × 5倍）
- その他言語: 10人ストック（投稿数2 × 5倍）

**ストック更新タイミング**:
- 各言語ごとに`/api/x-update-influencer-stock?lang={lang}`を実行
- Cron設定: UTC 2:00（EN）、UTC 6:00（ES）、UTC 10:00（PT-BR）、UTC 14:00（AR）、UTC 18:00（JA）、UTC 22:00（KO）

**ストック選択基準**（`selectInfluencersForHighEngagement()`関数より）:
- エンゲージメント率: 50%の重み
- インプレッション数: 30%の重み
- フォロワー数: 20%の重み（10万-50万フォロワーが最適）

### 投稿時選択ロジック

**選択基準**（`selectInfluencersForImpressionTarget()`関数より）:
- インプレッション数でソート（降順）
- 目標インプレッション規模を達成するために最適な組み合わせを選択
- 目標の上限（max × 0.9）に近づいたら停止

**言語別の投稿数**（`config/influencerStrategy.js`より）:
- EN: 4本/日（10万～20万インプレッション規模達成）
- その他言語: 2本/日（5万～10万インプレッション規模）

**言語別のインプレッション目標**（`config/influencerStrategy.js`より）:
- EN: 100,000-200,000/投稿
- ES: 50,000-100,000/投稿
- PT-BR: 50,000-100,000/投稿
- AR: 30,000-80,000/投稿
- KO: 50,000-100,000/投稿
- JA: 30,000-80,000/投稿

---

## 📝 投稿内容の詳細

### Quote Reposts（引用リポスト）

**生成方法**:
1. Grok APIが動的に生成（`api/x-quote-repost.js`の`generateQuoteRepostTextWithGrok()`関数）
2. フォールバック: `FALLBACK_QUOTE_REPOST_TEMPLATES[lang]`テンプレート

**テンプレート要素**:
- Trap Score（0-100）
- BTC価格（USD）
- 24時間変動率
- Exchange Netflow（取引所流入）
- Whale Ratio（クジラ比率）
- Telegram Deep Link（無料版オプトイン用）
- Whop Product Link（有料版成約用、プロモコードDEFEND50）
- 質問CTA（アルゴリズム評価UP）
- ハッシュタグ（2-3個、動的取得）

**文字数制限**: 140文字以内（引用リポスト用）

**最適化要素**:
- ソーシャルプルーフ追加（「👥 350 Saved」など）
- 動的ハッシュタグ（トレンド1+ニッチ2）
- Minimal Version URL追加（クロスポリネーション）

### Free Reports（無料版レポート）

**生成方法**:
- `TWEET_TEMPLATES[lang]`テンプレートを使用（`api/x-post-free-report.js`より）

**テンプレート要素**:
- Trap Score（0-100）とリスクレベル表示
- BTC価格と24時間変動率
- Exchange Netflow（取引所流入）
- Whale Ratio（クジラ比率）
- Dr. Grokの心理的インサイト
- Mental Note（戦略的メンタルトレーニング）
- Whop Product Link（有料版成約用、プロモコードDEFEND50）
- Telegram Deep Link（無料版オプトイン用）
- 質問CTA（アルゴリズム評価UP）
- ハッシュタグ（2-3個、動的取得）

**スレッド形式**:
- 1メイン投稿 + 3リプライ（AR/JAは単一投稿に設定可能）
- リプライ内容: データ深掘り、インサイト、CTA

**最適化要素**:
- 動画優先（10xエンゲージメント）
- ポール追加（4xエンゲージメント）
- 画像添付（2xエンゲージメント）
- ソーシャルプルーフ追加
- ベロシティ戦術（投稿直後のポール追加と自己質問）

### Minimal Version（無料版）

**生成方法**:
- `api/x-post-minimal-version.js`の`postMinimalVersionToX()`関数を使用

**テンプレート要素**:
- 無料版（Minimal Version）メッセージをスレッド形式で投稿
- 6言語対応（EN, ES, PT-BR, AR, JA, KO）
- 長文メッセージを280文字ずつに分割してスレッド化

**スレッド形式**:
- 1メイン投稿 + 複数リプライ（280文字ずつに分割）

**投稿URL保存**:
- Vercel KVに保存: `x:minimal-version:url:{lang}:{date}`
- 引用リポストで使用（クロスポリネーション）

---

## 🔍 期待値計算の根拠

### 1. X投稿数

**計算式**:
```
Quote Reposts: 10回/日（言語別に分割されない）
Free Reports: 5回/日（6言語で分割）
Minimal Version: 1回/日（6言語で分割）

言語別の投稿数 = (10 / 6) + (5 / 6) + (1 / 6) = 2.67回/言語/日
```

**根拠**: `vercel.json`のCron設定と`docs/GROK_X_POSTING_SCHEDULE_CONFIRMATION_2026-01-24.md`

### 2. インプレッション数

**計算式**:
```
言語別の期待インプレッション数 = SSOTより定義された値

EN: 250,000/日
ES: 120,000/日
PT-BR: 110,000/日
AR: 80,000/日
KO: 100,000/日
JA: 90,000/日

合計: 750,000/日
```

**根拠**: `docs/SSOT_KPI_FUNNEL_STATUS_2026-01-24.md`

### 3. エンゲージメント数

**計算式**:
```
エンゲージメント数 = インプレッション数 × エンゲージメント率（10%）

言語別の期待エンゲージメント数:
EN: 250,000 × 0.10 = 25,000/日
ES: 120,000 × 0.10 = 12,000/日
PT-BR: 110,000 × 0.10 = 11,000/日
AR: 80,000 × 0.10 = 8,000/日
KO: 100,000 × 0.10 = 10,000/日
JA: 90,000 × 0.10 = 9,000/日

合計: 75,000/日
```

**根拠**: `docs/X_METRICS_EXPLANATION.md`（目標: 10%以上のエンゲージメント率）

### 4. 無料版（Minimal Version）オプトイン数

**計算式**:
```
無料版オプトイン数 = インプレッション数 × オプトイン率（SSOTより言語別）

EN: 250,000 × 0.025 = 6,250人/日
ES: 120,000 × 0.022 = 2,640人/日
PT-BR: 110,000 × 0.021 = 2,310人/日
AR: 80,000 × 0.018 = 1,440人/日
KO: 100,000 × 0.020 = 2,000人/日
JA: 90,000 × 0.019 = 1,710人/日

合計: 16,350人/日
```

**根拠**: `docs/SSOT_KPI_FUNNEL_STATUS_2026-01-24.md`

### 5. Whopトラフィック数

**計算式**:
```
Whopトラフィック数 = インプレッション数 × Whopクリック率（中程度シナリオ: 2%）

言語別の期待Whopトラフィック数:
EN: 250,000 × 0.02 = 5,000クリック/日
ES: 120,000 × 0.02 = 2,400クリック/日
PT-BR: 110,000 × 0.02 = 2,200クリック/日
AR: 80,000 × 0.02 = 1,600クリック/日
KO: 100,000 × 0.02 = 2,000クリック/日
JA: 90,000 × 0.02 = 1,800クリック/日

合計: 15,000クリック/日
```

**根拠**: `docs/CONVERSION_EXPECTATIONS_2026-01-25.md`（中程度シナリオ）

### 6. 有料版（Regular Briefing）成約数

**計算式**:
```
有料版成約数 = 無料版オプトイン数 × コンバージョン率（SSOTより言語別）

EN: 6,250 × 0.120 = 750.0人/日
ES: 2,640 × 0.100 = 264.0人/日
PT-BR: 2,310 × 0.095 = 219.5人/日
AR: 1,440 × 0.080 = 115.2人/日
KO: 2,000 × 0.105 = 210.0人/日
JA: 1,710 × 0.100 = 171.0人/日

合計: 1,729.7人/日
```

**根拠**: `docs/SSOT_KPI_FUNNEL_STATUS_2026-01-24.md`

---

## 📚 参照ドキュメント

1. **`vercel.json`**: Cron設定（投稿タイミング）
2. **`config/influencerStrategy.js`**: インフルエンサー選択ロジック
3. **`api/x-quote-repost.js`**: 引用リポスト投稿ロジック
4. **`api/x-post-free-report.js`**: 無料版レポート投稿ロジック
5. **`api/x-post-minimal-version-cron.js`**: 無料版投稿Cron
6. **`docs/SSOT_KPI_FUNNEL_STATUS_2026-01-24.md`**: 言語別KPI（Single Source of Truth）
7. **`docs/CONVERSION_EXPECTATIONS_2026-01-25.md`**: コンバージョン率と期待値
8. **`docs/X_METRICS_EXPLANATION.md`**: Xメトリクスの説明
9. **`docs/GROK_X_POSTING_SCHEDULE_CONFIRMATION_2026-01-24.md`**: Grok推奨投稿スケジュール
10. **`docs/INFLUENCER_EXPECTED_PERFORMANCE_2026-01-25.md`**: インフルエンサー期待パフォーマンス

---

**作成日時**: 2026-01-25  
**最終更新**: 2026-01-25  
**作成者**: COO（Cursor/Composer 1）
