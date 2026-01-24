// scripts/ask-grok-language-metrics.js
// Grokに言語別の期待インプレッション数、オプトイン率、コンバージョン率、期待売上単価を質問

require('dotenv').config();
const OpenAI = require('openai');

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is not set');
  process.exit(1);
}

const grokClient = new OpenAI({
  apiKey: XAI_API_KEY,
  baseURL: XAI_BASE_URL,
});

/**
 * Grok CSO+CFO（grok-4-1-fast-reasoning）で言語別指標を分析
 */
async function askGrokLanguageMetrics() {
  const prompt = `あなたはTrap Defence BTCのCSO（Chief Strategy Officer）兼CFO（Chief Financial Officer）として、言語別の期待インプレッション数、オプトイン率、コンバージョン率、期待売上単価を分析してください。

## 📊 現在のWhop価格設定（実際の設定）

### 言語別プラン価格

| 言語 | 月額 | 3ヶ月 | 年間 | プランタイプ |
|------|------|-------|------|------------|
| **EN** | $99 | $237 | $845 | renewal |
| **ES** | $89 | $214 | $758 | renewal |
| **PT-BR** | $87 | $209 | $741 | renewal |
| **AR** | $79 | $190 | $673 | renewal |
| **KO** | $95 | $228 | $809 | renewal |
| **JA** | $95 | $228 | $809 | renewal |

### プラン分散（実際の選択率）
- **月額**: 21.4%
- **3ヶ月**: 35.7%
- **年間**: 42.9%

### 言語別ARPU（プロモコード50%割引適用後、Whop手数料3%差し引き後）

| 言語 | 最終利益ARPU |
|------|------------|
| **EN** | $227.13 |
| **ES** | $204.00 |
| **PT-BR** | $199.39 |
| **AR** | $181.12 |
| **KO** | $217.66 |
| **JA** | $217.66 |

### 言語別売上配分（目標）
- **EN**: 55%
- **ES**: 20%
- **PT-BR**: 12%
- **JA**: 8%
- **KO**: 3%
- **AR**: 2%

## 🎯 現在のX投稿戦略（vercel.json確認済み）

### X投稿頻度（実際のCron設定）
- **引用リポスト** (x-quote-repost): **UTC 0,1,20,21**（1日4回実行、1時間ごとに1言語ずつ処理）
- **無料版レポート** (x-post-free-report): **UTC 12,13,14,15,18**（1日5回、6言語対応）
- **Minimal Version X投稿** (x-post-minimal-version-cron): **UTC 8**（1日1回、6言語対応）
- **VSL1投稿** (vsl1-post): **UTC 14,20**（1日2回、6言語対応）

### 引用リポストの詳細戦略（config/influencerStrategy.js確認済み）

**言語別インフルエンサー数設定**:
- **EN**: 4人/日（目標インプレッション: 10万～20万）
- **ES**: 2人/日（目標インプレッション: 5万～10万）
- **PT-BR**: 2人/日（目標インプレッション: 5万～10万）
- **AR**: 2人/日（目標インプレッション: 3万～8万）
- **KO**: 2人/日（目標インプレッション: 5万～10万）
- **JA**: 2人/日（目標インプレッション: 3万～8万）

**引用リポストの実行方法**:
- Cron実行: UTC 0,1,20,21（1日4回）
- 各実行時: ピーク時間帯（UTC 12-22）の言語を1時間ごとに処理
- 1言語あたり: 目標インフルエンサー数分の引用リポストを投稿
- 投稿間隔: 同一言語内で5-10分間隔、言語間で1-2分間隔
- 1時間あたりの投稿上限: 3-4投稿（スパム判定回避）

**インフルエンサー発見方法**:
- Grok API（discoverInfluencersForQuoteRepost）を使用
- 候補数: 目標数の3倍（最低5人）
- フィルタリング: インプレッション規模でフィルタリング（目標の80%以上）
- 選択: インプレッション数でソートし、目標範囲内に収まる組み合わせを選択

### 無料版（Minimal Version）配信
- **定期配信** (api/cron.js): **6時間ごと**（UTC 0, 6, 12, 18時、6言語対応）
- **1日4回配信** × 6言語 = **24回/日**

### VSL配信
- **VSL2配信** (vsl2-free-users): **1時間ごと**（無料版ユーザー登録から24時間後）
- **VSL1リマインダー** (vsl1-reminder): **12時間ごと**（登録から12-24時間後）
- **VSL2ラストコール** (vsl2-last-call): **1時間ごと**（登録から22時間後）

## 📈 市場特性（参考情報）

### 言語別の購買力・市場特性
- **EN（US/UK）**: 購買力最高、CryptoユーザーPCI $65k、Coinbase ARPU $280平均、トレーダー1.85億
- **ES（LATAM）**: 購買力中、PCI $12k、Crypto採用率#1地域、FOMO高、トレーダー6,360万
- **PT-BR（ブラジル）**: 購買力中、PCI $15k、TGユーザー多、トレーダー4,770万
- **JA（日本）**: 購買力高だが保守的、PCI $40k、bitFlyer ARPU $150、トレーダー2,650万
- **KO（韓国）**: 購買力中高だが規制厳、PCI $35k、Upbit ARPU $155、トレーダー3,180万
- **AR（MENA）**: 購買力低、PCI $8k、ボラティリティ高、Islamic Finance準拠需要

## 📊 現在の市況とXセンチメント（分析時に考慮）

**重要**: 以下の現在の市況データを分析時に考慮してください。

### 現在のBTC市場状況（一般的なパターン）
- **BTC価格**: $89,000-90,000付近（2026年1月時点の一般的な範囲）
- **24時間変動率**: -0.5%～+2.0%の範囲（ボラティリティ中程度）
- **Exchange Netflow**: 通常±1,000-3,000 BTCの範囲（流入/流出が交互に発生）
- **MPI（Miners' Position Index）**: 通常-1.0～+1.0の範囲
- **Fear & Greed Index**: 通常40-70の範囲（Neutral～Greed）

### Xセンチメント（一般的なパターン）
- **whaleBias**: -1（売り）～+1（買い）の範囲、通常0付近
- **retailFomo**: 0-100の範囲、通常40-70（中程度のFOMO）
- **newsImpact**: 0-100の範囲、通常0-30（ニュース影響は限定的）

**分析時の考慮事項**:
- **現在の市況がオプトイン率に与える影響**: 高ボラティリティ時はオプトイン率が高くなる可能性、低ボラティリティ時は低くなる可能性
- **Xセンチメントがコンバージョン率に与える影響**: retailFomoが高い時はコンバージョン率が高くなる可能性、whaleBiasが強い時はプラン選択（年間プラン）に影響する可能性
- **Trap Scoreがオプトイン率に与える影響**: Trap Scoreが高い時（70以上）は無料版の価値が高く見え、オプトイン率が高くなる可能性

## 💡 分析依頼事項

以下の視点から、言語別の指標を分析してください：

### 1. 期待インプレッション数/日と実行計画

各言語について、1日あたりの期待インプレッション数を予測し、**それを達成するための具体的な実行計画**を提示してください。

**考慮要素**:
- X投稿頻度（引用リポストUTC 0,1,20,21、無料版レポートUTC 12,13,14,15,18、Minimal Version UTC 8、VSL1 UTC 14,20）
- 言語別のインフルエンサー数設定（EN: 4人/日、その他: 2人/日）
- 引用リポストの実行タイミング（UTC 0,1,20,21、ピーク時間帯UTC 12-22のみ）
- インフルエンサー引用リポストの効果（1引用リポストあたりのインプレッション数）
- 言語別のXユーザー数とエンゲージメント率
- 言語別の市場規模とCryptoトレーダー数

**具体的な実行計画を提示してください**:
- **1日に何人のインフルエンサーを見つける必要があるか**（現在の設定: EN 4人/日、その他 2人/日で十分か？）
- **1日に何回の引用リポストを投稿する必要があるか**（現在の設定: UTC 0,1,20,21で4回実行、1時間ごとに1言語ずつ処理）
- **各引用リポストが何インプレッションを生み出すか**（インフルエンサーのフォロワー数、エンゲージメント率、引用リポストの拡散率を考慮）
- **期待インプレッション数を達成するために必要なインフルエンサーのフォロワー数・エンゲージメント率の基準**
- **無料版レポートX投稿（UTC 12,13,14,15,18）とMinimal Version X投稿（UTC 8）が生み出すインプレッション数**
- **引用リポスト以外の投稿（無料版レポート、Minimal Version、VSL1）が生み出すインプレッション数の合計**

### 2. 無料版（Minimal Version）オプトイン率

各言語について、インプレッションから無料版登録への転換率を予測してください。

**実装済みの無料版コンテンツ（実際のコード確認済み）**:
- **Trap Score表示**: 0-100のスコア + リスクレベル説明（HIGH/MODERATE/LOW/VERY LOW）
- **Data-Backed Reasons（証拠）**: Exchange Netflow、Whale Ratio、MPI、価格変動などのデータポイント
- **What to Avoid（回避行動）**: Trap Scoreに基づく具体的な回避行動（例: "Avoid LONG positions — High trap risk detected"）
- **Dr. Grok's Quick Insight**: Trap Scoreとセンチメントに基づく心理的インサイト
- **Mental Note**: 戦略的メンタルトレーニングメッセージ（70%待機戦略など）
- **CTA**: "Unlock Full Intelligence Report"（完全版へのアップセル）

**配信頻度**:
- **定期配信**: 6時間ごと（UTC 0, 6, 12, 18時、6言語対応）
- **X投稿**: UTC 8（1日1回、6言語対応）
- **無料版レポートX投稿**: UTC 12,13,14,15,18（1日5回、6言語対応）

**考慮要素**:
- **コンテンツの完成度**: Trap Score + 証拠 + 回避行動 + Dr. Grokコメント + Mental Noteの5要素が揃っている
- **価値提供の明確性**: 無料版でも具体的なデータポイント（Exchange Netflow、Whale Ratio）を提供
- **CTAの効果**: "Unlock Full Intelligence Report"で完全版への期待を喚起
- **言語別のCVR特性**: 市場別の購買行動パターン
- **引用リポスト経由 vs 直接投稿経由の違い**: 引用リポストはインフルエンサーの信頼性を借りるため、CTRが高い可能性
- **現在の市況**: BTC価格、24時間変動率、Exchange Netflow、MPI、Fear & Greed Index、Xセンチメント（whaleBias、retailFomo、newsImpact）を考慮
- **Xセンチメントの影響**: 現在のX上のトレーダー感情（FOMO、Fear、Greed）がオプトイン率に与える影響

### 3. 有料版（Regular Briefing）コンバージョン率

各言語について、無料版ユーザーから有料版購入への転換率を予測してください。

**実装済みの有料版コンテンツ（実際のコード確認済み）**:
- **完全なオンチェーン分析**: Exchange Netflow、MPI、Fear & Greed Index、Market Score
- **Trap Detection**: Trap Score（0-100）、Trap Type、Trap Severity、Trap Alert（AVOID_LONG/AVOID_SHORT/STANDBY）
- **Trade Verdict**: エントリー、TP、SL、RR、シグナル（LONG/SHORT/STANDBY）
- **Exit Map**: 利確ゾーン、撤退条件、推奨事項
- **Psychological Support**: Dr. Grokの心理診断、リスクレベル、サポートメッセージ
- **GPT Reporter Analysis**: CryptoQuantデータ解析に基づくトラップニュース分析
- **Grok X Analysis**: Xセンチメント分析（whaleBias、retailFomo、newsImpact）
- **Gemini Content**: ストーリー構造（Opening、Narrative Arc、Data Presentation、Evidence）

**VSL2配信戦略（実際の実装確認済み）**:
- **VSL2配信**: 無料版ユーザー登録から**24時間後**（1時間ごとにCron実行）
- **VSL1リマインダー**: 登録から**12-24時間後**（12時間ごとにCron実行）
- **VSL2ラストコール**: 登録から**22時間後**（1時間ごとにCron実行、VSL2配信の2時間前）

**VSL2メッセージ内容（実際のコード確認済み）**:
- **価値提案**: "Complete On-Chain Analysis"、"Real-Time Alerts"、"Dr. Grok Support"
- **YouTube動画リンク**: 6言語字幕対応
- **プロモコード**: DEFEND50（50%割引）
- **インラインボタン**: "Watch Video" + "Get 50% OFF"（ワンタップアクセス）

**考慮要素**:
- **コンテンツの完成度**: 無料版（5要素）から有料版（8要素以上）への価値の飛躍
- **VSL2の配信タイミング**: 24時間後（ユーザーの熱量が高いうちにアプローチ）
- **VSL1リマインダーの効果**: 12時間後のリマインダーで再エンゲージメント
- **VSL2ラストコールの効果**: 22時間後の緊急性喚起（"Only 2 hours left"）
- **プロモコードの効果**: 50%割引（DEFEND50）の心理的インパクト
- **言語別の価格弾力性**: 現在のWhop価格設定（EN $99、ES $89、PT-BR $87、AR $79、KO $95、JA $95）
- **現在の市況**: BTC価格、24時間変動率、Trap Score、Exchange Netflow、MPI、Fear & Greed Index、Xセンチメントを考慮
- **Xセンチメントの影響**: 現在のX上のトレーダー感情（FOMO、Fear、Greed）がコンバージョン率に与える影響
- **無料版の価値提供**: 無料版でも十分な価値を提供しているため、有料版への期待が高い可能性

### 4. 期待売上単価（ARPU）

各言語について、プロモコード適用後の期待売上単価を予測してください。

**現在のWhop価格設定（実際のAPI確認済み）**:
- **EN**: 月額$99、3ヶ月$237、年間$845
- **ES**: 月額$89、3ヶ月$214、年間$758
- **PT-BR**: 月額$87、3ヶ月$209、年間$741
- **AR**: 月額$79、3ヶ月$190、年間$673
- **KO**: 月額$95、3ヶ月$228、年間$809
- **JA**: 月額$95、3ヶ月$228、年間$809

**プラン分散（Alt Bundle効果考慮済み）**:
- **月額**: 21.4%
- **3ヶ月**: 35.7%
- **年間**: 42.9%

**プロモコード**: DEFEND50（50%割引）

**考慮要素**:
- **現在のWhop価格設定**: 実際のAPIから取得した価格を使用
- **プラン分散**: Alt Bundle限定予約販売効果で年間プランが42.9%に増加
- **プロモコード50%割引**: すべてのコンバージョンでDEFEND50が適用される
- **言語別の購買力**: PCI（EN $65k、ES $12k、PT-BR $15k、AR $8k、KO $35k、JA $40k）
- **プラン選択傾向**: 購買力が高い言語ほど年間プラン選択率が高い可能性
- **現在の市況**: BTC価格、24時間変動率、Trap Score、Xセンチメントがプラン選択に与える影響
- **VSL2の効果**: VSL2で年間プランを推奨している場合、年間プラン選択率がさらに高くなる可能性

## 📋 出力形式

以下の形式で分析結果を出力してください：

### 1. エグゼクティブサマリー（300-400字）
言語別指標の重要性と、最終利益シミュレーションへの影響を要約

### 2. 言語別指標表

| 言語 | 期待インプレッション数/日 | 無料版オプトイン率 | 有料版コンバージョン率 | 期待売上単価（プロモコード適用後） |
|------|------------------------|------------------|---------------------|---------------------------|
| **EN** | XX,XXX | X.X% | X.X% | $XXX |
| **ES** | XX,XXX | X.X% | X.X% | $XXX |
| **PT-BR** | XX,XXX | X.X% | X.X% | $XXX |
| **AR** | XX,XXX | X.X% | X.X% | $XXX |
| **KO** | XX,XXX | X.X% | X.X% | $XXX |
| **JA** | XX,XXX | X.X% | X.X% | $XXX |

### 3. 指標の根拠

各言語について、なぜその指標値が適切かを説明してください：
- 期待インプレッション数/日の根拠
- 無料版オプトイン率の根拠
- 有料版コンバージョン率の根拠
- 期待売上単価の根拠

### 4. ファネル分析

各言語について、以下のファネルを計算してください：
- インプレッション → クリック（CTR）
- クリック → 無料版オプトイン
- 無料版オプトイン → 有料版コンバージョン
- 有料版コンバージョン → 売上（プロモコード適用後）
- 売上 → 最終利益（Whop手数料3%差し引き後）

### 5. 1日あたりの期待コンバージョン数

各言語について、1日あたりの期待コンバージョン数を計算してください。

### 6. 結論と次のアクション

- 総合的な結論
- 最終利益シミュレーションに必要な情報のまとめ

日本語で回答してください。`;

  try {
    console.log('🔄 Grok CSO+CFO（grok-4-1-fast-reasoning）で言語別指標分析を実行中...');
    console.log('='.repeat(80));

    const response = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのCSO（Chief Strategy Officer）兼CFO（Chief Financial Officer）です。戦略的かつ財務的な視点から、言語別の期待インプレッション数、オプトイン率、コンバージョン率、期待売上単価を分析してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const analysis = response.choices[0].message.content;
    
    console.log('\n📊 Grok分析結果:');
    console.log('='.repeat(80));
    console.log(analysis);
    console.log('='.repeat(80));

    // 結果をファイルに保存
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '../docs/GROK_LANGUAGE_METRICS_ANALYSIS_2026-01-24.md');
    
    const output = `# Grok分析: 言語別指標（インプレッション数、オプトイン率、コンバージョン率、期待売上単価）
**作成日時**: ${new Date().toISOString().split('T')[0]}  
**分析者**: Grok CSO+CFO（grok-4-1-fast-reasoning）

---

${analysis}

---

**データソース**: Whop API（実際の製品設定）、X投稿戦略（vercel.json）  
**分析スクリプト**: scripts/ask-grok-language-metrics.js
`;

    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`\n✅ 分析結果を保存しました: ${outputPath}`);

    return analysis;
  } catch (error) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('レスポンス:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  askGrokLanguageMetrics()
    .then(() => {
      console.log('\n✅ 分析完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { askGrokLanguageMetrics };
