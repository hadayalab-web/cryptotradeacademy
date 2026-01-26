# JST 21時から24時間の投稿計画（2026-01-25）
**作成日時**: 2026-01-25  
**作成者**: COO（Cursor/Composer 1）  
**目的**: JST 21時から24時間後までの詳細な投稿スケジュール

---

## 📋 エグゼクティブサマリー

このドキュメントは、**JST 21:00から24時間後（翌日JST 21:00）まで**の投稿計画を完全に記録したものです。

### 24時間の合計投稿数

| 投稿タイプ | 投稿数 | 詳細 |
|-----------|--------|------|
| **Quote Reposts（引用リポスト）** | **10回** | UTC 0,1,20,21の4時間で実行 |
| **Free Reports（無料版レポート）** | **5回** | UTC 12,13,14,15,18の5時間で実行 |
| **Minimal Version（無料版）** | **1回** | UTC 8,20の2時間で実行（1日1回のみ） |
| **合計** | **16回** | 全投稿タイプの合計 |

---

## 🕐 詳細投稿スケジュール（JST時刻順）

### JST 21:00（UTC 12:00）- Free Report

**投稿タイプ**: Free Reports（無料版レポート）  
**対象言語**: JA（日本語）  
**投稿数**: 1回

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ（`getThreadStrategy()`により、JAは単一投稿に設定可能）
- メイン投稿: `TWEET_TEMPLATES.ja`テンプレートを使用
- リプライ: `generateThreadReply()`関数により生成（データ深掘り、インサイト、CTA）

**期待インプレッション数**: 90,000/日（SSOTより）

---

### JST 22:00（UTC 13:00）- Free Report

**投稿タイプ**: Free Reports（無料版レポート）  
**対象言語**: KO（韓国語）  
**投稿数**: 1回

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ
- メイン投稿: `TWEET_TEMPLATES.ko`テンプレートを使用
- リプライ: `generateThreadReply()`関数により生成

**期待インプレッション数**: 100,000/日（SSOTより）

---

### JST 23:00（UTC 14:00）- Free Report

**投稿タイプ**: Free Reports（無料版レポート）  
**対象言語**: EN（英語）、PT-BR（ポルトガル語）  
**投稿数**: 2回（各言語1回）

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ
- メイン投稿: `TWEET_TEMPLATES.en`、`TWEET_TEMPLATES['pt-br']`テンプレートを使用
- リプライ: `generateThreadReply()`関数により生成

**期待インプレッション数**: 
- EN: 250,000/日
- PT-BR: 110,000/日

---

### JST 00:00（翌日）（UTC 15:00）- Free Report

**投稿タイプ**: Free Reports（無料版レポート）  
**対象言語**: ES（スペイン語）  
**投稿数**: 1回

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ
- メイン投稿: `TWEET_TEMPLATES.es`テンプレートを使用
- リプライ: `generateThreadReply()`関数により生成

**期待インプレッション数**: 120,000/日（SSOTより）

---

### JST 03:00（翌日）（UTC 18:00）- Free Report

**投稿タイプ**: Free Reports（無料版レポート）  
**対象言語**: AR（アラビア語）  
**投稿数**: 1回

**投稿内容**:
- スレッド形式: 1メイン投稿 + 3リプライ（ARは単一投稿に設定可能）
- メイン投稿: `TWEET_TEMPLATES.ar`テンプレートを使用
- リプライ: `generateThreadReply()`関数により生成

**期待インプレッション数**: 80,000/日（SSOTより）

---

### JST 05:00（翌日）（UTC 20:00）- Quote Repost + Minimal Version

**投稿タイプ**: Quote Reposts（引用リポスト）、Minimal Version（無料版）  
**対象言語**: EN（英語）、PT-BR（ポルトガル語）  
**投稿数**: 引用リポスト4回（EN 2回 + PT-BR 2回）+ Minimal Version 2回（EN 1回 + PT-BR 1回）

#### EN（英語）- 引用リポスト2回

**インフルエンサー選択基準**:
- ストックから選択: 20人ストック済み（`config/influencerStrategy.js`より）
- インプレッション目標: 100,000-200,000/投稿
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
- インプレッション目標: 50,000-100,000/投稿
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

### JST 06:00（翌日）（UTC 21:00）- Quote Repost

**投稿タイプ**: Quote Reposts（引用リポスト）  
**対象言語**: ES（スペイン語）  
**投稿数**: 2回

**インフルエンサー選択基準**:
- ストックから選択: 10人ストック済み（`config/influencerStrategy.js`より）
- インプレッション目標: 50,000-100,000/投稿
- 選択方法: `selectInfluencersForImpressionTarget()`関数により、インプレッション数でソートして上位2人を選択

**投稿内容**:
- Grok APIが動的に生成（`api/x-quote-repost.js`の`generateQuoteRepostTextWithGrok()`関数）
- フォールバック: `FALLBACK_QUOTE_REPOST_TEMPLATES.es`テンプレート
- テンプレート例: `"¡De acuerdo! TrapDefence detectó esto 🚀 ${whopLink} ${freeLink} ${question} #Bitcoin #AnálisisBTC #TrapDefence"`
- 文字数制限: 140文字以内（引用リポスト用）

**期待インプレッション数**: 120,000/日（SSOTより）

---

### JST 09:00（翌日）（UTC 00:00）- Quote Repost

**投稿タイプ**: Quote Reposts（引用リポスト）  
**対象言語**: AR（アラビア語）、JA（日本語）  
**投稿数**: 4回（各言語2回）

#### AR（アラビア語）- 2回

**インフルエンサー選択基準**:
- ストックから選択: 10人ストック済み（`config/influencerStrategy.js`より）
- インプレッション目標: 30,000-80,000/投稿
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
- インプレッション目標: 30,000-80,000/投稿
- 選択方法: `selectInfluencersForImpressionTarget()`関数により、インプレッション数でソートして上位2人を選択

**投稿内容**:
- Grok APIが動的に生成（`api/x-quote-repost.js`の`generateQuoteRepostTextWithGrok()`関数）
- フォールバック: `FALLBACK_QUOTE_REPOST_TEMPLATES.ja`テンプレート
- テンプレート例: `"同意！TrapDefenceで検知済み 🚀 ${whopLink} ${freeLink} ${question} #ビットコイン #ビットコイン分析 #TrapDefence"`
- 文字数制限: 140文字以内（引用リポスト用）

**期待インプレッション数**: 90,000/日（SSOTより）

---

### JST 10:00（翌日）（UTC 01:00）- Quote Repost

**投稿タイプ**: Quote Reposts（引用リポスト）  
**対象言語**: KO（韓国語）  
**投稿数**: 2回

**インフルエンサー選択基準**:
- ストックから選択: 10人ストック済み（`config/influencerStrategy.js`より）
- インプレッション目標: 50,000-100,000/投稿
- 選択方法: `selectInfluencersForImpressionTarget()`関数により、インプレッション数でソートして上位2人を選択

**投稿内容**:
- Grok APIが動的に生成（`api/x-quote-repost.js`の`generateQuoteRepostTextWithGrok()`関数）
- フォールバック: `FALLBACK_QUOTE_REPOST_TEMPLATES.ko`テンプレート
- テンプレート例: `"동의! TrapDefence가 이것을 감지했습니다 🚀 ${whopLink} ${freeLink} ${question} #비트코인 #비트코인분석 #TrapDefence"`
- 文字数制限: 140文字以内（引用リポスト用）

**期待インプレッション数**: 100,000/日（SSOTより）

---

### JST 17:00（翌日）（UTC 08:00）- Minimal Version

**投稿タイプ**: Minimal Version（無料版）  
**対象言語**: 全6言語（EN, ES, PT-BR, AR, JA, KO）  
**投稿数**: 6回（各言語1回、スレッド形式）

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

## 📊 24時間の投稿数サマリー

| 時刻（JST） | UTC時刻 | 投稿タイプ | 対象言語 | 投稿数 |
|------------|---------|-----------|---------|--------|
| **21:00** | 12:00 | Free Report | JA | 1回 |
| **22:00** | 13:00 | Free Report | KO | 1回 |
| **23:00** | 14:00 | Free Report | EN, PT-BR | 2回 |
| **00:00（翌日）** | 15:00 | Free Report | ES | 1回 |
| **03:00（翌日）** | 18:00 | Free Report | AR | 1回 |
| **05:00（翌日）** | 20:00 | Quote Repost | EN, PT-BR | 4回 |
| **05:00（翌日）** | 20:00 | Minimal Version | EN, PT-BR | 2回 |
| **06:00（翌日）** | 21:00 | Quote Repost | ES | 2回 |
| **09:00（翌日）** | 00:00 | Quote Repost | AR, JA | 4回 |
| **10:00（翌日）** | 01:00 | Quote Repost | KO | 2回 |
| **17:00（翌日）** | 08:00 | Minimal Version | 全6言語 | 6回 |
| **合計** | - | - | - | **26回** |

**注意**: 実際の投稿数は、`vercel.json`の設定と`api/x-quote-repost.js`のロジックにより、以下のように調整されます：
- Quote Reposts: 10回/日（UTC 0,1,20,21の4時間で実行、各時間2-3言語）
- Free Reports: 5回/日（UTC 12,13,14,15,18の5時間で実行、各時間1言語）
- Minimal Version: 1回/日（UTC 8,20の2時間で実行、1日1回のみ）

---

## 🎯 言語別投稿数（24時間）

| 言語 | Quote Reposts | Free Reports | Minimal Version | 合計投稿数 | 期待インプレッション数/日 |
|------|--------------|--------------|----------------|-----------|---------------------|
| **EN** | 2回 | 1回 | 1回 | **4回** | **250,000** |
| **ES** | 2回 | 1回 | 1回 | **4回** | **120,000** |
| **PT-BR** | 2回 | 1回 | 1回 | **4回** | **110,000** |
| **AR** | 2回 | 1回 | 1回 | **4回** | **80,000** |
| **JA** | 2回 | 1回 | 1回 | **4回** | **90,000** |
| **KO** | 2回 | 1回 | 1回 | **4回** | **100,000** |
| **合計** | **12回** | **6回** | **6回** | **24回** | **750,000** |

---

## 📚 参照ドキュメント

1. **`vercel.json`**: Cron設定（投稿タイミング）
2. **`config/influencerStrategy.js`**: インフルエンサー選択ロジック
3. **`api/x-quote-repost.js`**: 引用リポスト投稿ロジック
4. **`api/x-post-free-report.js`**: 無料版レポート投稿ロジック
5. **`api/x-post-minimal-version-cron.js`**: 無料版投稿Cron
6. **`docs/SSOT_KPI_FUNNEL_STATUS_2026-01-24.md`**: 言語別KPI（Single Source of Truth）
7. **`docs/DETAILED_POSTING_SCHEDULE_2026-01-25.md`**: 詳細な投稿スケジュール（UTC時刻版）

---

**作成日時**: 2026-01-25  
**最終更新**: 2026-01-25  
**作成者**: COO（Cursor/Composer 1）
