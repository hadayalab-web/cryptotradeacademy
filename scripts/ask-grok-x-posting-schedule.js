// scripts/ask-grok-x-posting-schedule.js
// GrokにX投稿スケジュールの正確な実装方法を確認

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
 * GrokにX投稿スケジュールの正確な実装方法を確認
 */
async function askGrokXPostingSchedule() {
  const prompt = `あなたはTrap Defence BTCのCTO（Chief Technology Officer）として、X（Twitter）投稿スケジュールの正確な実装方法を分析してください。

## 📊 現在の実装状況

### Grok推奨の言語別ピーク時間（UTC）
- **EN/PT-BR**: UTC 14:00/20:00 (US/EU/Brazil active)
- **ES**: UTC 15:00/21:00 (LATAM)
- **AR**: UTC 18:00/00:00 (MENA)
- **JA**: UTC 12:00/00:00 (Tokyo)
- **KO**: UTC 13:00/01:00 (Seoul)

### 現在の実装（間違っている可能性）
- 1日1言語ずつ処理（6言語を6日でローテーション）
- 言語別ピーク時間をチェックして、ピーク時間の言語のみ処理

## ❓ 質問事項

### 1. 投稿頻度の確認
**質問**: 1日6言語すべてを投稿する必要がありますか？それとも1日1言語ずつ（6日でローテーション）ですか？

**私の理解**:
- 1日6言語すべてを時間帯別で回す（各言語のピーク時間に合わせて投稿）
- 例: UTC 12:00にJA、UTC 13:00にKO、UTC 14:00にEN/PT-BR、UTC 15:00にES、UTC 18:00にAR、UTC 20:00にEN/PT-BR、UTC 21:00にES、UTC 00:00にAR/JA、UTC 01:00にKO

### 2. 引用リポストのスケジュール
**質問**: 引用リポスト（x-quote-repost）は1日何回実行すべきですか？

**Grok推奨（ドキュメントより）**:
- "Reduce quote reposts to 12/day (6 langs × 1 influencer × 2 posts) during peak hours only (UTC 12-22)"
- これは1日12回（6言語 × 2投稿）という意味ですか？

**私の理解**:
- 1日6言語すべてを処理（各言語のピーク時間に合わせて）
- 各言語で1回の引用リポスト（1日6回）
- または、各言語で2回の引用リポスト（1日12回）？

### 3. 無料版レポートのスケジュール
**質問**: 無料版レポート（x-post-free-report）は1日何回実行すべきですか？

**現在のCron設定**: "5 6,18 * * *"（UTC 6:05, 18:05）

**Grok推奨（ドキュメントより）**:
- "Shift free report posts to language-specific peaks: EN/PT-BR UTC 14:00/20:00; ES UTC 15:00/21:00; AR UTC 18:00/00:00; JA UTC 12:00/00:00; KO UTC 13:00/01:00"

**私の理解**:
- 各言語のピーク時間に合わせて1日6言語すべてを投稿
- UTC 12:00にJA、UTC 13:00にKO、UTC 14:00にEN/PT-BR、UTC 15:00にES、UTC 18:00にAR、UTC 20:00にEN/PT-BR、UTC 21:00にES、UTC 00:00にAR/JA、UTC 01:00にKO

### 4. Cron設定の最適化
**質問**: Vercel Cron設定はどのようにすべきですか？

**現在の設定**:
- x-post-free-report: "5 6,18 * * *"（1日2回）
- x-quote-repost: "0 14 * * *"（1日1回）

**推奨設定**:
- 各言語のピーク時間に合わせて複数回実行？
- または、1時間ごとに実行して言語別ピーク時間をチェック？

## 📋 出力形式

以下の形式で回答してください：

### 1. 投稿頻度の確認結果
- **引用リポスト**: 1日○回（○言語 × ○投稿）
- **無料版レポート**: 1日○回（○言語 × ○投稿）
- **合計**: 1日○回のX投稿

### 2. 正確なスケジュール表
| UTC時刻 | 処理する言語 | 投稿タイプ | 説明 |
|---|---|---|---|
| 12:00 | JA | 無料版レポート | Tokyoピーク時間 |
| 13:00 | KO | 無料版レポート | Seoulピーク時間 |
| 14:00 | EN, PT-BR | 無料版レポート + 引用リポスト | US/EU/Brazilピーク時間 |
| ... | ... | ... | ... |

### 3. Cron設定の推奨
JSON形式:
{
  "x-post-free-report": "推奨スケジュール",
  "x-quote-repost": "推奨スケジュール"
}

### 4. 実装方法の詳細
- 各Cron実行時にどの言語を処理するか
- 言語別ピーク時間のチェック方法
- 1日6言語すべてを処理する方法

### 5. 重要な注意事項
- X APIのレート制限
- スパム判定の回避
- エンゲージメント最大化のためのタイミング

日本語で回答してください。`;

  try {
    console.log('🔄 Grok CTO（grok-4-1-fast-reasoning）でX投稿スケジュール確認を実行中...');
    
    const response = await grokClient.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'あなたはTrap Defence BTCのCTO（Chief Technology Officer）です。X（Twitter）アルゴリズム最適化の専門家として、正確な実装方法を提案してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const analysis = response.choices[0].message.content;
    console.log('\n' + '='.repeat(80));
    console.log('📊 Grok CTO分析結果: X投稿スケジュールの正確な実装方法');
    console.log('='.repeat(80));
    console.log(analysis);
    console.log('='.repeat(80));

    // 結果をファイルに保存
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '../docs/GROK_X_POSTING_SCHEDULE_CONFIRMATION_2026-01-24.md');
    const timestamp = new Date().toISOString();
    
    const output = `# GrokによるX投稿スケジュール確認結果
**作成日時**: ${timestamp}  
**質問AI**: Grok CTO（grok-4-1-fast-reasoning）  
**目的**: X投稿スケジュールの正確な実装方法の確認

---

${analysis}

---

**確認完了**: ${timestamp}
`;

    fs.writeFileSync(outputPath, output, 'utf8');
    console.log(`\n✅ 結果を保存しました: ${outputPath}`);

    return analysis;
  } catch (error) {
    console.error('❌ Grok API error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  askGrokXPostingSchedule()
    .then(() => {
      console.log('\n✅ 確認完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { askGrokXPostingSchedule };
