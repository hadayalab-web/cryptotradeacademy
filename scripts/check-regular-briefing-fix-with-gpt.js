// scripts/check-regular-briefing-fix-with-gpt.js
// GPT-5.2-2025-12-11による有料版（Regular Briefing）配信停止問題の修正レビュー

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// レビュー対象ファイル
const FILES_TO_REVIEW = [
  'api/cron.js',
];

/**
 * ファイルを読み込む
 */
function readFile(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (error) {
    console.error(`❌ Failed to read ${filePath}:`, error.message);
    return null;
  }
}

/**
 * GPT-5.2にレビューを依頼
 */
async function reviewWithGPT() {
  console.log('🔍 GPT-5.2-2025-12-11による有料版（Regular Briefing）配信停止問題の修正レビューを開始...\n');

  // ファイルを読み込む
  const files = {};
  for (const filePath of FILES_TO_REVIEW) {
    const content = readFile(filePath);
    if (content) {
      files[filePath] = content;
      console.log(`✅ Loaded: ${filePath} (${content.length} chars)`);
    }
  }

  console.log(`\n📊 Total files: ${Object.keys(files).length}\n`);

  // 問題の説明と修正内容をまとめる
  const problemDescription = `
## 問題の報告

### 症状
- 無料版（Minimal Version）は正常に定期配信されている
- 有料版（Regular Briefing）が正常に配信されていない

### 根本原因の分析

1. **無料版の配信経路**:
   - api/cron.js内の無料版配信ロジック（1592行目）
   - 独立したCron Job（api/x-post-minimal-version-cron）からも配信
   - vercel.jsonで"0 8,12,18,20 * * *"に設定

2. **有料版の配信経路**:
   - api/cron.jsのみから配信（1230行目）
   - 独立したCron Jobがない

3. **問題のシナリオ**:
   - ENABLE_EVENT_DRIVENが有効（true）の場合
   - isRegularSlotがtrue（定期配信スロット、UTC 0, 6, 12, 18時）
   - evaluateTriggerがshouldSend = falseを返した場合
   - willSend = shouldSend = falseになる
   - forceがfalseの場合、1201行目で早期リターンする
   - その結果、1230行目の有料版ブロックに到達しない

4. **なぜ無料版は正常だったのか**:
   - 無料版は独立したCron Job（api/x-post-minimal-version-cron）からも配信されている
   - api/cron.jsで早期リターンが発生しても、別のCron Jobから配信されていた
   - 一方、有料版はapi/cron.jsのみから配信されるため、早期リターンが発生すると配信されない

### 修正内容

修正前（1230行目）:
\`\`\`javascript
if (isRegularSlot || force || (ENABLE_EVENT_DRIVEN && triggerType === 'REGULAR')) {
\`\`\`

修正後（1230行目）:
\`\`\`javascript
// P0 FIX: shouldSendの判定を追加（無料版と同様の条件に統一）
// isRegularSlotがtrueの場合は定期配信なので、willSendを無視して配信する
// forceがtrueの場合も強制配信なので、willSendを無視する
// ENABLE_EVENT_DRIVENが有効でtriggerTypeが'REGULAR'の場合も、willSendを確認して配信する
if (isRegularSlot || force || (ENABLE_EVENT_DRIVEN && triggerType === 'REGULAR' && willSend)) {
\`\`\`

### 修正の意図

- isRegularSlotがtrueの場合は定期配信なので、willSendを無視して配信する
- forceがtrueの場合も強制配信なので、willSendを無視する
- ENABLE_EVENT_DRIVENが有効でtriggerTypeが'REGULAR'の場合のみ、willSendを確認する
`;

  // レビュープロンプトを作成
  const prompt = `あなたはGPT-5.2-2025-12-11です。有料版（Regular Briefing）の配信停止問題とその修正について、コードレビューを実施してください。

## 問題の報告

${problemDescription}

## レビュー観点

1. **根本原因の分析が正確か**: 問題の原因分析が正しいか
2. **修正内容が適切か**: 修正が問題を解決するか、副作用がないか
3. **ロジックの整合性**: 修正後の条件が論理的に正しいか
4. **エッジケース**: 修正が想定外のケースで問題を引き起こさないか
5. **コードの品質**: 修正がコードの可読性・保守性を損なっていないか
6. **無料版との整合性**: 無料版と有料版の配信条件が適切に統一されているか

## 出力形式

以下の形式でレビュー結果を出力してください：

### 総合評価
- 根本原因の分析: [正確/部分的に正確/不正確]
- 修正内容の適切性: [適切/部分的に適切/不適切]
- 動作可能性: [高/中/低]
- 重大な問題: [有/無]
- 軽微な問題: [有/無]

### 根本原因の分析について

[根本原因の分析が正確かどうか、追加の観点があれば記載]

### 修正内容の評価

#### 修正の妥当性
[修正が問題を解決するか、副作用がないか]

#### ロジックの整合性
[修正後の条件が論理的に正しいか]

#### エッジケース
[想定外のケースで問題を引き起こさないか]

### 発見された問題（優先度順）

#### P0: 重大な問題
[もしあれば]

#### P1: 重要な問題
[もしあれば]

#### P2: 軽微な問題
[もしあれば]

### 推奨される改善点

[改善すべき点があれば]

### 結論

[総合的な評価と推奨事項]

---

以下、レビュー対象ファイルのコードです：

${Object.entries(files).map(([filePath, content]) => `\n## ${filePath}\n\`\`\`javascript\n${content}\n\`\`\``).join('\n\n')}`;

  try {
    console.log('📤 GPT-5.2にレビューを依頼中...\n');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'あなたはGPT-5.2-2025-12-11です。コードレビューの専門家として、問題の根本原因分析と修正内容の適切性を徹底的にレビューしてください。ロジックの整合性、エッジケース、コードの品質の観点から評価してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 8000,
      temperature: 0.3,
    });

    const reviewResult = response.choices[0]?.message?.content;
    if (!reviewResult) {
      console.error('❌ GPT-5.2からのレスポンスが空です');
      console.error('Response:', JSON.stringify(response, null, 2));
      return;
    }

    // 結果を保存
    const outputDir = path.join(__dirname, '..', 'docs', 'reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `regular-briefing-fix-review-${timestamp}.md`);
    
    const markdown = `# 有料版（Regular Briefing）配信停止問題の修正レビュー結果
生成日時: ${new Date().toISOString()}
モデル: gpt-5.2-2025-12-11

${reviewResult}

---

## 問題の報告

${problemDescription}

## レビュー対象ファイル

${Object.keys(files).map((filePath) => `- ${filePath}`).join('\n')}
`;

    fs.writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`\n✅ レビュー結果を保存しました: ${outputPath}\n`);
    console.log('📋 レビュー結果:\n');
    console.log(reviewResult);
    
  } catch (error) {
    console.error('❌ GPT-5.2レビュー中にエラーが発生しました:', error.message);
    if (error.response) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  reviewWithGPT().catch(console.error);
}

module.exports = { reviewWithGPT };
