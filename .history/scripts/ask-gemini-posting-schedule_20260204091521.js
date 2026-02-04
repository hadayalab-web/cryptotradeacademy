// scripts/ask-gemini-posting-schedule.js
// Gemini-3-pro-previewによる投稿スケジュール最適化：Grok分析に基づく投稿パターンの決定

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is not set");
  process.exit(1);
}

const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Gemini-3-pro-previewに投稿スケジュールを聞く
 */
async function askGeminiPostingSchedule() {
  console.log("🔍 Gemini-3-pro-previewによる投稿スケジュール最適化を開始...\n");

  // Grokの分析結果を読み込む
  const grokAnalysisPath = path.join(
    __dirname,
    "..",
    "docs",
    "reports",
    "grok-optimal-posts-per-influencer-2026-01-27T03-45-57-646Z.md"
  );
  let grokAnalysis = "";
  try {
    grokAnalysis = fs.readFileSync(grokAnalysisPath, "utf-8");
    console.log(`✅ Grok分析結果を読み込みました: ${grokAnalysisPath}`);
  } catch (error) {
    console.warn(`⚠️ Grok分析結果の読み込みに失敗: ${error.message}`);
  }

  const prompt = `あなたはX（旧Twitter）の投稿戦略とスケジューリングの専門家です。以下の情報を基に、最適な投稿スケジュールを提案してください。

## Grok-4-1-fast-reasoningの分析結果

${grokAnalysis}

## 現在のX投稿パターン

**重要**: 以下の4種類はすべてX（旧Twitter）への実際の投稿です。Telegram配信とは別物です。

### 1. 引用リポスト（Quote Repost）
- **エンドポイント**: \`api/x-quote-repost.js\`
- **目的**: 70人の高品質なインフルエンサーリストへの引用リポスト
- **現在のスケジュール**: UTC 0,1,13,14,20,21,22（1日7回）
- **投稿数**: 言語別に1-2人/回（合計70人リスト）
- **特徴**: インフルエンサーのツイートを引用して、TrapDefenceの分析を追加
- **X投稿**: ✅ はい（引用リポスト形式）

### 2. VSL1投稿
- **エンドポイント**: \`api/vsl1-post.js\`
- **目的**: VSL1動画へのオプトイン誘導（X/Twitterのみ）
- **現在のスケジュール**: UTC 14,20（1日2回）
- **投稿数**: 6言語 × 1回 = 6投稿/回 = 12投稿/日
- **特徴**: YouTube動画リンク + Telegram Deep Link
- **X投稿**: ✅ はい（通常ツイート形式）

### 3. 無料版（Minimal Version）X投稿
- **エンドポイント**: \`api/x-post-minimal-version-cron.js\` → \`api/x-post-minimal-version.js\`
- **目的**: 無料版（Minimal Version）のX投稿（スレッド形式）
- **現在のスケジュール**: UTC 8,12,18,20（1日4回）
- **投稿数**: 6言語 × 1回 = 6投稿/回 = 24投稿/日
- **特徴**: スレッド形式（複数ツイート）、市場分析、無料版への誘導
- **X投稿**: ✅ はい（スレッド形式）
- **注意**: Telegram配信の「無料版（Minimal Version）」とは別物。Telegram配信は1日4回だが、X投稿も1日4回（独立したスケジュール）

### 4. 無料レポート（Free Report）X投稿
- **エンドポイント**: \`api/x-post-free-report.js\`
- **目的**: 無料レポートのX投稿
- **現在のスケジュール**: UTC 12,13,14,15,18（1日5回）
- **投稿数**: 6言語 × 1回 = 6投稿/回 = 30投稿/日
- **特徴**: 市場分析レポート、無料版への誘導
- **X投稿**: ✅ はい（通常ツイート形式）

## Telegram配信（X投稿ではない）

以下の2つはTelegramチャットグループへの配信であり、X投稿ではありません：

- **無料版（Minimal Version）Telegram配信**: Telegramチャットグループにオプトインしないと配信されない。1日4回配信（\`api/cron.js\`内）
- **有料版（Regular Briefing）Telegram配信**: Whopで購入しないと配信されない。1日4回配信（\`api/cron.js\`内）

これらはX投稿のスケジュール最適化には含めません。

## X APIレート制限

- **Per User (OAuth 1.0a)**: 100/15min（15分ごとにリセット）
- **Per App (Bearer Token)**: 10,000/24hrs
- **投稿コスト**: 5クレジット/投稿 = $0.005/投稿（極めて低い）
- **ROI**: 非常に高い（インプレッション→コンバージョン→収益）

## Grok分析の推奨事項

1. **インフルエンサー1人あたり**: 1-2回/日（条件クリア時3回/日）
2. **クールダウン時間**: 8時間（同一インフルエンサー）
3. **ストック更新頻度**: 2時間ごと
4. **全体の投稿数上限**: 200-300/日（1人2-3回分散）
5. **最適な投稿間隔**: 20-30分（全体）、8時間（同一インフルエンサー）
6. **安全な時間帯**: 朝8-10時/夕18-20時（ユーザーアクティブ高）
7. **避ける時間帯**: 夜中0-5時（低反応でスパム疑い）

## 質問事項

1. **各X投稿パターンの最適なスケジュールは？**
   - 引用リポスト（Quote Repost）: どの時間帯に何回/日？
   - VSL1投稿: どの時間帯に何回/日？
   - 無料版（Minimal Version）X投稿: どの時間帯に何回/日？
   - 無料レポート（Free Report）X投稿: どの時間帯に何回/日？

2. **投稿パターン間の競合を避ける方法は？**
   - 同じ時間帯に複数のパターンが重複しないようにする
   - 各パターンの優先順位は？

3. **ROI最大化の観点から、どのパターンを優先すべきか？**
   - 引用リポスト（Quote Repost）はROIが高い可能性がある
   - 他のパターンとのバランスは？

4. **スパム判定を避けるための時間分散は？**
   - 各パターンを24時間にどう分散するか？
   - ジッター（揺らぎ）の推奨値は？

5. **言語別の最適化は？**
   - 6言語（EN, ES, PT-BR, AR, JA, KO）をどう分散するか？
   - 言語別のピーク時間を考慮すべきか？

6. **実装すべき最適なスケジュールは？**
   - 各パターンの具体的なスケジュール（UTC時間）
   - 投稿数の上限
   - その他の推奨事項

## 期待される回答形式

以下の形式で回答してください：

### 1. エグゼクティブサマリー（200-300字）
最適な投稿スケジュールの総合的な結論

### 2. 各投稿パターンの最適なスケジュール

#### 2.1 引用リポスト（Quote Repost）
- **推奨スケジュール**: UTC X時, Y時, Z時...（根拠）
- **投稿数**: X回/日（根拠）
- **優先順位**: 高/中/低（根拠）

#### 2.2 VSL1投稿
- **推奨スケジュール**: UTC X時, Y時...（根拠）
- **投稿数**: X回/日（根拠）
- **優先順位**: 高/中/低（根拠）

#### 2.3 無料版（Minimal Version）X投稿
- **推奨スケジュール**: UTC X時, Y時...（根拠）
- **投稿数**: X回/日（根拠）
- **優先順位**: 高/中/低（根拠）

#### 2.4 無料レポート（Free Report）X投稿
- **推奨スケジュール**: UTC X時, Y時...（根拠）
- **投稿数**: X回/日（根拠）
- **優先順位**: 高/中/低（根拠）

### 3. 投稿パターン間の競合回避

- **時間分散**: 各パターンをどう分散するか
- **優先順位**: 競合時の優先順位
- **ジッター（揺らぎ）**: 推奨値と実装方法

### 4. ROI最大化戦略

- **優先すべきパターン**: どのパターンを優先すべきか（根拠）
- **投稿数の配分**: 各パターンへの投稿数の配分
- **期待されるROI**: 最適化後のROI向上予測

### 5. スパム判定回避戦略

- **時間分散**: 24時間への分散方法
- **言語分散**: 6言語の分散方法
- **ジッター（揺らぎ）**: 推奨値と実装方法

### 6. 言語別最適化

- **言語別ピーク時間**: 各言語の最適な投稿時間帯
- **言語分散**: 6言語をどう分散するか
- **言語別優先順位**: どの言語を優先すべきか

### 7. 実装推奨事項

- **具体的なスケジュール**: 各X投稿パターンのUTC時間スケジュール（4種類すべて）
- **投稿数の上限**: 各パターンの日次上限
- **合計投稿数の上限**: 4種類すべてを合計した1日の総投稿数上限
- **その他の推奨事項**: 実装時の注意点

### 8. 結論と次のアクション

- **総合的な結論**: 最適な投稿スケジュールの最終結論
- **即座に実行すべき具体的なアクション**: 3-5項目

日本語で回答してください。`;

  try {
    console.log("🔄 Gemini-3-pro-previewに質問を送信中...\n");

    const model = geminiClient.getGenerativeModel({
      model: "gemini-3-flash-preview",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8000
      }
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();
    const usage = response.usageMetadata || {};

    // 結果を保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputDir = path.join(__dirname, "..", "docs", "reports");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `gemini-posting-schedule-${timestamp}.md`);
    const outputContent = `# 投稿スケジュール最適化（Gemini-3-pro-preview解析）
**作成日時**: ${new Date().toISOString()}
**解析AI**: Gemini-3-pro-preview
**目的**: Grok分析に基づく投稿パターンの最適なスケジュール決定
**ベース**: Grok-4-1-fast-reasoningの分析結果

---

${responseText}

---

## API使用量

- **入力トークン**: ${usage.promptTokenCount || 0}
- **出力トークン**: ${usage.candidatesTokenCount || 0}
- **合計トークン**: ${usage.totalTokenCount || 0}
`;

    fs.writeFileSync(outputFile, outputContent, "utf-8");

    console.log(`\n✅ 解析結果を保存しました: ${outputFile}`);
    console.log(`\n📊 レスポンス長: ${responseText.length} chars`);
    console.log(`📈 API使用量:`);
    console.log(`  - 入力トークン: ${usage.promptTokenCount || 0}`);
    console.log(`  - 出力トークン: ${usage.candidatesTokenCount || 0}`);
    console.log(`  - 合計トークン: ${usage.totalTokenCount || 0}`);
    console.log("\n" + "=".repeat(80));
    console.log(responseText);
    console.log("=".repeat(80));

    return responseText;
  } catch (error) {
    console.error("❌ Geminiへの質問に失敗:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
    throw error;
  }
}

// 実行
if (require.main === module) {
  askGeminiPostingSchedule()
    .then(() => {
      console.log("\n✅ 完了");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ エラー:", error);
      process.exit(1);
    });
}

module.exports = { askGeminiPostingSchedule };
