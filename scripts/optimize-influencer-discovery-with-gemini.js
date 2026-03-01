// scripts/optimize-influencer-discovery-with-gemini.js
// Gemini-3-pro-previewに包括的分析を共有して最適化案を強化

const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-3.1-pro-preview';

/**
 * Gemini APIを呼び出してテキスト生成
 */
async function callGeminiAPI(prompt, apiKey) {
  try {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not set');
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    };

    console.log(`[Gemini] Calling Gemini API: ${MODEL}`);
    console.log(`[Gemini] Prompt length: ${prompt.length} chars`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts) {
        const text = candidate.content.parts
          .map(part => part.text)
          .join('');
        return text;
      }
    }

    throw new Error('No text content in Gemini response');
  } catch (error) {
    console.error('[Gemini] Error calling API:', error);
    throw error;
  }
}

/**
 * 包括的分析を読み込む
 */
function loadComprehensiveAnalysis() {
  const analysisPath = path.join(__dirname, '..', 'docs', 'INFLUENCER_DISCOVERY_COMPREHENSIVE_ANALYSIS_2026-01-30.md');
  if (!fs.existsSync(analysisPath)) {
    throw new Error(`Analysis file not found: ${analysisPath}`);
  }
  return fs.readFileSync(analysisPath, 'utf-8');
}

/**
 * Geminiに最適化案の強化を依頼
 */
async function optimizeWithGemini() {
  try {
    console.log('====================================================================');
    console.log('Gemini-3-pro-previewによる最適化案の強化');
    console.log('====================================================================\n');

    // 包括的分析を読み込む
    const analysis = loadComprehensiveAnalysis();
    console.log(`✅ 包括的分析を読み込みました（${analysis.length}文字）\n`);

    // Geminiへのプロンプト
    const prompt = `あなたは、マーケティング戦略とデータ分析の専門家です。以下のインフルエンサー発見プロセスの包括的分析を読み、私の最適化案を強化・拡張してください。

## 背景
- 6言語（EN, ES, PT-BR, AR, JA, KO）でインフルエンサー発見を実施
- 総目標数: 840人、総取得数: 675人、総達成率: 80.4%
- Grok APIを使用してインフルエンサーを発見・検証・保存

## 包括的分析

${analysis}

## 依頼内容

以下の観点から、私の最適化案を強化・拡張してください：

1. **階層バランスの改善**: すべての言語で100%が「top」階層という問題を解決する具体的な戦略
2. **リトライロジックの強化**: 特にKO（35.7%達成率）、JA（69.4%達成率）の達成率向上
3. **重複防止の強化**: AR、PT-BRで後半バッチで重複が90%に達する問題の解決
4. **Grok APIの応答不良**: KO、JAで複数のバッチが失敗する問題の解決
5. **Username長さ制限**: 16文字以上のusernameが除外される問題の解決

## 出力形式

以下の形式で、強化された最適化案を提供してください：

### 1. 階層バランスの改善（強化版）

#### 1.1 プロンプトエンジニアリング戦略
- [具体的なプロンプトテンプレート]
- [階層ごとの検索クエリ例]
- [期待される効果]

#### 1.2 段階的取得の実装詳細
- [実装手順]
- [コード例]
- [期待される効果]

#### 1.3 後処理での階層調整
- [アルゴリズム]
- [実装手順]
- [期待される効果]

### 2. リトライロジックの強化（強化版）

#### 2.1 適応的リトライ戦略
- [言語別のリトライパラメータ]
- [動的調整ロジック]
- [期待される効果]

#### 2.2 エラー分類と対応
- [エラータイプの分類]
- [各エラーに対する対応]
- [期待される効果]

### 3. 重複防止の強化（強化版）

#### 3.1 取得済みリストの活用
- [リストの構造]
- [プロンプトへの組み込み方法]
- [期待される効果]

#### 3.2 多様性の強制
- [多様性指標の定義]
- [プロンプトでの指定方法]
- [期待される効果]

### 4. Grok APIの応答不良対策（強化版）

#### 4.1 プロンプト最適化（言語別）
- [各言語の具体的なプロンプト]
- [キーワード戦略]
- [期待される効果]

#### 4.2 代替検索戦略
- [検索クエリの多様化]
- [フォールバック戦略]
- [期待される効果]

### 5. Username長さ制限の解決（強化版）

#### 5.1 X API制限の確認方法
- [確認手順]
- [実際の制限値]
- [推奨される対応]

#### 5.2 プロンプトでの明示
- [具体的なプロンプト例]
- [検証ロジックの調整]
- [期待される効果]

## 追加の推奨事項

上記の5つの課題以外にも、以下の観点から追加の最適化案を提案してください：

1. **コスト最適化**: API呼び出し回数の削減、キャッシュ戦略
2. **パフォーマンス最適化**: 並列処理、バッチ処理の最適化
3. **データ品質向上**: 検証ロジックの強化、データクリーニング
4. **モニタリング**: メトリクスの定義、アラート設定
5. **スケーラビリティ**: 将来の拡張性を考慮した設計

## 重要な注意事項

- 実装可能性を重視（理論的ではなく、実際に実装できる内容）
- 具体的なコード例やプロンプト例を含める
- 期待される効果を定量的に示す（例: 達成率35.7% → 75%+）
- 優先順位を明確にする（即座に実施 vs 中期的に実施）

日本語で回答してください。`;

    console.log('📤 Gemini-3-pro-previewに分析を送信中...\n');
    const response = await callGeminiAPI(prompt, GEMINI_API_KEY);

    // 結果を保存
    const outputPath = path.join(__dirname, '..', 'docs', 'INFLUENCER_DISCOVERY_OPTIMIZATION_ENHANCED_BY_GEMINI_2026-01-30.md');
    const outputContent = `# インフルエンサー発見最適化案（Gemini-3-pro-preview強化版）

**生成日時**: ${new Date().toISOString()}  
**モデル**: ${MODEL}  
**元の分析**: INFLUENCER_DISCOVERY_COMPREHENSIVE_ANALYSIS_2026-01-30.md

---

${response}

---

## 元の包括的分析

<details>
<summary>クリックして展開</summary>

\`\`\`
${analysis}
\`\`\`

</details>
`;

    fs.writeFileSync(outputPath, outputContent, 'utf-8');
    console.log(`\n✅ 強化された最適化案を保存しました: ${outputPath}\n`);

    // コンソールにも出力
    console.log('====================================================================');
    console.log('Gemini-3-pro-previewからの回答');
    console.log('====================================================================\n');
    console.log(response);
    console.log('\n====================================================================\n');

    return response;
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  }
}

// メイン実行
if (require.main === module) {
  optimizeWithGemini()
    .then(() => {
      console.log('✅ 完了しました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 失敗しました:', error);
      process.exit(1);
    });
}

module.exports = { optimizeWithGemini };
