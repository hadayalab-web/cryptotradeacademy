#!/usr/bin/env tsx
/**
 * MCPサーバーを最強に磨き上げるスクリプト
 * 
 * 順番:
 * 1. GPT（CTO/CPO）: 技術的な観点からレビュー
 * 2. Grok（CFO/CRO/CGO）: 経営的な観点からレビュー
 * 3. Gemini（CMO/CKO）: マーケティング・知識の観点からレビュー
 */

// 環境変数の読み込み（親ディレクトリの.envファイル）
import dotenv from 'dotenv';
import { resolve } from 'path';
// プロジェクトルートの1階層上の.envファイルを読み込む
dotenv.config({ path: resolve(__dirname, '../../.env') });

import { callGPT52, callGrok41FastReasoning, callGemini3Pro } from './direct-ai-api';
import fs from 'fs';
import { join } from 'path';

async function main() {
  try {
    // 環境変数の確認
    const requiredEnvVars = ['OPENAI_API_KEY', 'XAI_API_KEY', 'GEMINI_API_KEY'];
    const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
    
    if (missingEnvVars.length > 0) {
      console.error('❌ 環境変数が設定されていません:');
      missingEnvVars.forEach((key) => console.error(`  - ${key}`));
      console.error('\n.envファイルに設定するか、環境変数として設定してください。');
      process.exit(1);
    }

    console.log('🚀 MCPサーバーを最強に磨き上げるプロセス開始...\n');

    // MCPサーバーのコードを読み込む
    const mcpServerPath = join(__dirname, '../mcp-servers/backcasting-engine/index.ts');
    const mcpServerCode = fs.readFileSync(mcpServerPath, 'utf-8');
    const packageJsonPath = join(__dirname, '../mcp-servers/backcasting-engine/package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // 関連ファイルも読み込む
    const backcastingEnginePath = join(__dirname, '../services/breakthrough/backcastingEngine.ts');
    const backcastingEngineCode = fs.readFileSync(backcastingEnginePath, 'utf-8');
    const realtimeDecisionEnginePath = join(__dirname, '../services/breakthrough/realtimeDecisionEngine.ts');
    const realtimeDecisionEngineCode = fs.readFileSync(realtimeDecisionEnginePath, 'utf-8');

    // ===== Step 1: GPT（CTO/CPO）による技術レビュー =====
    console.log('='.repeat(80));
    console.log('📋 Step 1: GPT（CTO/CPO）による技術レビュー');
    console.log('='.repeat(80));
    console.log();

    const gptPrompt = `
あなたはCTO/CPO（Chief Technology Officer / Chief Product Officer）のGPTです。
COO（Composer）から、逆算思考エンジンMCPサーバーの技術レビューを依頼されました。

【MCPサーバーコード】
\`\`\`typescript
${mcpServerCode}
\`\`\`

【package.json】
\`\`\`json
${JSON.stringify(packageJson, null, 2)}
\`\`\`

【関連コード（参考）】
\`\`\`typescript
// backcastingEngine.ts (一部)
${backcastingEngineCode.substring(0, 2000)}...
\`\`\`

【依頼内容】
以下の観点から、MCPサーバーを最強に磨き上げるための技術的な改善提案をしてください：

1. **アーキテクチャ設計**:
   - MCPサーバーの構造は最適か？
   - エラーハンドリングは適切か？
   - パフォーマンス最適化の余地はあるか？

2. **コード品質**:
   - TypeScriptの型安全性は確保されているか？
   - モジュールのインポート/エクスポートは適切か？
   - コードの可読性・保守性は高いか？

3. **実装の堅牢性**:
   - エッジケースの処理は適切か？
   - リトライロジックは必要か？
   - ログ出力は適切か？

4. **拡張性**:
   - 新しいツールを追加しやすい構造か？
   - 設定の外部化は適切か？
   - テスト容易性は確保されているか？

5. **セキュリティ**:
   - APIキーの扱いは安全か？
   - 入力検証は適切か？
   - エラーメッセージに機密情報が漏れないか？

6. **パフォーマンス**:
   - レスポンス時間の最適化余地はあるか？
   - メモリ使用量は適切か？
   - 並列処理の最適化は可能か？

【出力形式】
JSON形式で、以下の形式で返してください：
{
  "technicalReview": {
    "architecture": {
      "score": 0-100,
      "issues": ["問題1", "問題2"],
      "recommendations": ["推奨1", "推奨2"]
    },
    "codeQuality": {
      "score": 0-100,
      "issues": ["問題1", "問題2"],
      "recommendations": ["推奨1", "推奨2"]
    },
    "robustness": {
      "score": 0-100,
      "issues": ["問題1", "問題2"],
      "recommendations": ["推奨1", "推奨2"]
    },
    "extensibility": {
      "score": 0-100,
      "issues": ["問題1", "問題2"],
      "recommendations": ["推奨1", "推奨2"]
    },
    "security": {
      "score": 0-100,
      "issues": ["問題1", "問題2"],
      "recommendations": ["推奨1", "推奨2"]
    },
    "performance": {
      "score": 0-100,
      "issues": ["問題1", "問題2"],
      "recommendations": ["推奨1", "推奨2"]
    }
  },
  "priorityFixes": [
    {
      "priority": "CRITICAL | HIGH | MEDIUM | LOW",
      "issue": "問題の説明",
      "fix": "修正方法",
      "code": "修正コード（必要に応じて）"
    }
  ],
  "overallScore": 0-100,
  "summary": "総合評価と推奨事項"
}
`;

    console.log('🤖 GPT（CTO/CPO）に技術レビューを依頼中...');
    const gptResult = await callGPT52(gptPrompt, {
      model: 'gpt-5.2-2025-12-11', // GPT-5.2を使用
      temperature: 0.7,
      maxCompletionTokens: 8000,
    });

    console.log('✅ GPT（CTO/CPO）からの技術レビュー完了\n');
    console.log(gptResult.text);
    console.log();

    // GPTの結果をパース
    let gptReview: any = {};
    try {
      const gptJson = gptResult.text.match(/\{[\s\S]*\}/)?.[0] || '{}';
      gptReview = JSON.parse(gptJson);
    } catch (error) {
      console.warn('GPT結果のJSONパースエラー:', error);
      gptReview = { raw: gptResult.text };
    }

    // ===== Step 2: Grok（CFO/CRO/CGO）による経営レビュー =====
    console.log('='.repeat(80));
    console.log('📊 Step 2: Grok（CFO/CRO/CGO）による経営レビュー');
    console.log('='.repeat(80));
    console.log();

    const grokPrompt = `
あなたはCFO/CRO/CGO（Chief Financial Officer / Chief Revenue Officer / Chief Growth Officer）のGrokです。
COO（Composer）から、逆算思考エンジンMCPサーバーの経営的な価値評価を依頼されました。

【MCPサーバーの概要】
- 名前: backcasting-engine
- 機能: 逆算思考エンジン（未来のゴールから逆算して計画を生成）
- 提供ツール: 4つ（generate_backcasting_plan, update_backcasting_plan, answer_ceo_question, execute_breakthrough_system）
- ターゲット: Cursor IDEユーザー（CEO/経営層）

【GPT（CTO/CPO）の技術レビュー結果】
${JSON.stringify(gptReview, null, 2)}

【依頼内容】
以下の観点から、MCPサーバーを最強に磨き上げるための経営的な改善提案をしてください：

1. **価値提案**:
   - このMCPサーバーの価値提案は明確か？
   - ユーザー（CEO/経営層）にとってのROIは明確か？
   - 競合優位性はあるか？

2. **ユーザー体験**:
   - 使いやすさは十分か？
   - エラーメッセージは分かりやすいか？
   - ドキュメントは充実しているか？

3. **市場適合性**:
   - ターゲット市場（Cursor IDEユーザー）に適合しているか？
   - 価格設定（無料/有料）は適切か？
   - マーケティング戦略はあるか？

4. **収益性**:
   - このMCPサーバーは収益化可能か？
   - コスト（API呼び出しコスト）は適切か？
   - スケーラビリティは確保されているか？

5. **成長戦略**:
   - ユーザー獲得戦略はあるか？
   - リテンション戦略はあるか？
   - 拡張性（新機能追加）はあるか？

6. **リスク評価**:
   - 技術的リスクはあるか？
   - 市場リスクはあるか？
   - 競争リスクはあるか？

【出力形式】
JSON形式で、以下の形式で返してください：
{
  "businessReview": {
    "valueProposition": {
      "score": 0-100,
      "strengths": ["強み1", "強み2"],
      "weaknesses": ["弱み1", "弱み2"],
      "recommendations": ["推奨1", "推奨2"]
    },
    "userExperience": {
      "score": 0-100,
      "strengths": ["強み1", "強み2"],
      "weaknesses": ["弱み1", "弱み2"],
      "recommendations": ["推奨1", "推奨2"]
    },
    "marketFit": {
      "score": 0-100,
      "strengths": ["強み1", "強み2"],
      "weaknesses": ["弱み1", "弱み2"],
      "recommendations": ["推奨1", "推奨2"]
    },
    "profitability": {
      "score": 0-100,
      "strengths": ["強み1", "強み2"],
      "weaknesses": ["弱み1", "弱み2"],
      "recommendations": ["推奨1", "推奨2"]
    },
    "growthStrategy": {
      "score": 0-100,
      "strengths": ["強み1", "強み2"],
      "weaknesses": ["弱み1", "弱み2"],
      "recommendations": ["推奨1", "推奨2"]
    },
    "riskAssessment": {
      "technical": ["リスク1", "リスク2"],
      "market": ["リスク1", "リスク2"],
      "competition": ["リスク1", "リスク2"],
      "mitigations": ["対策1", "対策2"]
    }
  },
  "priorityImprovements": [
    {
      "priority": "CRITICAL | HIGH | MEDIUM | LOW",
      "area": "改善領域",
      "improvement": "改善内容",
      "expectedImpact": "期待される効果"
    }
  ],
  "overallScore": 0-100,
  "summary": "総合評価と推奨事項"
}
`;

    console.log('🤖 Grok（CFO/CRO/CGO）に経営レビューを依頼中...');
    const grokResult = await callGrok41FastReasoning(grokPrompt, {
      temperature: 0.7,
      maxTokens: 8000,
    });

    console.log('✅ Grok（CFO/CRO/CGO）からの経営レビュー完了\n');
    console.log(grokResult.text);
    console.log();

    // Grokの結果をパース（複数のJSONブロックがある場合に対応）
    let grokReview: any = {};
    try {
      // JSONブロックを抽出（最初の完全なJSONオブジェクトを取得）
      const jsonMatches = grokResult.text.match(/\{[\s\S]*\}/g);
      if (jsonMatches && jsonMatches.length > 0) {
        // 最後のJSONブロックを試す（通常は完全なものが最後）
        for (let i = jsonMatches.length - 1; i >= 0; i--) {
          try {
            grokReview = JSON.parse(jsonMatches[i]);
            break; // パース成功したら終了
          } catch (e) {
            // 次のJSONブロックを試す
            continue;
          }
        }
      }
      if (!grokReview || Object.keys(grokReview).length === 0) {
        throw new Error('No valid JSON found');
      }
    } catch (error) {
      console.warn('Grok結果のJSONパースエラー:', error);
      console.warn('Grok生テキスト（最初の500文字）:', grokResult.text.substring(0, 500));
      grokReview = { raw: grokResult.text };
    }

    // ===== Step 3: Gemini（CMO/CKO）によるマーケティング・知識レビュー =====
    console.log('='.repeat(80));
    console.log('🎨 Step 3: Gemini（CMO/CKO）によるマーケティング・知識レビュー');
    console.log('='.repeat(80));
    console.log();

    const geminiPrompt = `
あなたはCMO/CKO（Chief Marketing Officer / Chief Knowledge Officer）のGeminiです。
COO（Composer）から、逆算思考エンジンMCPサーバーのマーケティング・知識の観点からのレビューを依頼されました。

【MCPサーバーの概要】
- 名前: backcasting-engine
- 機能: 逆算思考エンジン（未来のゴールから逆算して計画を生成）
- 提供ツール: 4つ（generate_backcasting_plan, update_backcasting_plan, answer_ceo_question, execute_breakthrough_system）
- ターゲット: Cursor IDEユーザー（CEO/経営層）

【GPT（CTO/CPO）の技術レビュー結果】
${JSON.stringify(gptReview, null, 2)}

【Grok（CFO/CRO/CGO）の経営レビュー結果】
${JSON.stringify(grokReview, null, 2)}

【依頼内容】
以下の観点から、MCPサーバーを最強に磨き上げるためのマーケティング・知識の観点からの改善提案をしてください：

1. **過去の類似MCPサーバーの失敗事例**:
   - 過去に失敗したMCPサーバーの事例を分析
   - 失敗要因を特定
   - 学んだ教訓を提示

2. **ベストプラクティス**:
   - 成功しているMCPサーバーの特徴
   - 業界標準のベストプラクティス
   - 推奨される実装パターン

3. **顧客に刺さる機能**:
   - ユーザー（CEO/経営層）が本当に欲しい機能は何か？
   - 現在の機能で不足しているものは何か？
   - 追加すべき機能は何か？

4. **マーケティング戦略**:
   - このMCPサーバーをどうプロモーションすべきか？
   - ターゲットオーディエンスへの訴求ポイントは何か？
   - 差別化要因は何か？

5. **知識管理**:
   - ドキュメントは十分か？
   - ユーザーガイドは分かりやすいか？
   - トラブルシューティングガイドはあるか？

6. **コミュニティ構築**:
   - ユーザーコミュニティは必要か？
   - フィードバック収集の仕組みはあるか？
   - 継続的な改善の仕組みはあるか？

【出力形式】
JSON形式で、以下の形式で返してください：
{
  "marketingReview": {
    "failureCases": [
      {
        "case": "失敗事例1",
        "failureReason": "失敗理由",
        "lesson": "学んだ教訓"
      }
    ],
    "bestPractices": [
      {
        "practice": "ベストプラクティス1",
        "description": "説明",
        "implementation": "実装方法"
      }
    ],
    "missingFeatures": [
      {
        "feature": "不足している機能1",
        "priority": "CRITICAL | HIGH | MEDIUM | LOW",
        "description": "説明",
        "expectedImpact": "期待される効果"
      }
    ],
    "marketingStrategy": {
      "promotion": ["プロモーション方法1", "プロモーション方法2"],
      "targetAudience": ["ターゲット1", "ターゲット2"],
      "differentiation": ["差別化要因1", "差別化要因2"]
    },
    "knowledgeManagement": {
      "documentation": {
        "score": 0-100,
        "strengths": ["強み1", "強み2"],
        "weaknesses": ["弱み1", "弱み2"],
        "recommendations": ["推奨1", "推奨2"]
      },
      "userGuide": {
        "score": 0-100,
        "strengths": ["強み1", "強み2"],
        "weaknesses": ["弱み1", "弱み2"],
        "recommendations": ["推奨1", "推奨2"]
      },
      "troubleshooting": {
        "score": 0-100,
        "strengths": ["強み1", "強み2"],
        "weaknesses": ["弱み1", "弱み2"],
        "recommendations": ["推奨1", "推奨2"]
      }
    },
    "communityBuilding": {
      "needs": ["必要1", "必要2"],
      "feedbackMechanism": ["フィードバック方法1", "フィードバック方法2"],
      "improvementProcess": ["改善プロセス1", "改善プロセス2"]
    }
  },
  "priorityImprovements": [
    {
      "priority": "CRITICAL | HIGH | MEDIUM | LOW",
      "area": "改善領域",
      "improvement": "改善内容",
      "expectedImpact": "期待される効果"
    }
  ],
  "overallScore": 0-100,
  "summary": "総合評価と推奨事項"
}
`;

    console.log('🤖 Gemini（CMO/CKO）にマーケティング・知識レビューを依頼中...');
    const geminiResult = await callGemini3Pro(geminiPrompt, {
      model: 'gemini-3-pro-preview', // 高品質推論が必要なレビューにはProモデルを使用
      temperature: 0.7,
      maxOutputTokens: 8000,
    });

    console.log('✅ Gemini（CMO/CKO）からのマーケティング・知識レビュー完了\n');
    console.log(geminiResult.text);
    console.log();

    // Geminiの結果をパース
    let geminiReview: any = {};
    try {
      const geminiJson = geminiResult.text.match(/\{[\s\S]*\}/)?.[0] || '{}';
      geminiReview = JSON.parse(geminiJson);
    } catch (error) {
      console.warn('Gemini結果のJSONパースエラー:', error);
      geminiReview = { raw: geminiResult.text };
    }

    // ===== 結果を統合して保存 =====
    console.log('='.repeat(80));
    console.log('📝 レビュー結果を統合中...');
    console.log('='.repeat(80));
    console.log();

    const reviewReport = {
      timestamp: new Date().toISOString(),
      reviewers: {
        gpt: { role: 'CTO/CPO', review: gptReview },
        grok: { role: 'CFO/CRO/CGO', review: grokReview },
        gemini: { role: 'CMO/CKO', review: geminiReview },
      },
      summary: {
        overallScores: {
          technical: gptReview.overallScore || 0,
          business: grokReview.overallScore || 0,
          marketing: geminiReview.overallScore || 0,
        },
        priorityFixes: [
          ...(gptReview.priorityFixes || []),
          ...(grokReview.priorityImprovements || []),
          ...(geminiReview.priorityImprovements || []),
        ],
      },
    };

    // 結果をファイルに保存
    const outputPath = join(
      __dirname,
      '../docs/MCP_SERVER_AI_REVIEW_REPORT.json'
    );
    fs.writeFileSync(outputPath, JSON.stringify(reviewReport, null, 2), 'utf-8');
    console.log(`💾 レビュー結果を保存しました: ${outputPath}`);

    // マークダウンレポートも生成
    const markdownReport = `# MCPサーバー AIレビューレポート

**作成日**: ${new Date().toISOString()}
**レビュアー**: GPT（CTO/CPO）、Grok（CFO/CRO/CGO）、Gemini（CMO/CKO）

---

## 📊 総合スコア

- **技術スコア（GPT/CTO/CPO）**: ${gptReview.overallScore || 'N/A'}/100
- **経営スコア（Grok/CFO/CRO/CGO）**: ${grokReview.overallScore || 'N/A'}/100
- **マーケティングスコア（Gemini/CMO/CKO）**: ${geminiReview.overallScore || 'N/A'}/100

---

## 🔧 GPT（CTO/CPO）の技術レビュー

${gptReview.summary || gptResult.text}

### 優先修正事項

${(gptReview.priorityFixes || [])
  .map(
    (fix: any) => `- **[${fix.priority}]** ${fix.issue}\n  - 修正方法: ${fix.fix}`
  )
  .join('\n')}

---

## 📊 Grok（CFO/CRO/CGO）の経営レビュー

${grokReview.summary || grokResult.text}

### 優先改善事項

${(grokReview.priorityImprovements || [])
  .map(
    (imp: any) =>
      `- **[${imp.priority}]** ${imp.area}: ${imp.improvement}\n  - 期待される効果: ${imp.expectedImpact}`
  )
  .join('\n')}

---

## 🎨 Gemini（CMO/CKO）のマーケティング・知識レビュー

${geminiReview.summary || geminiResult.text}

### 優先改善事項

${(geminiReview.priorityImprovements || [])
  .map(
    (imp: any) =>
      `- **[${imp.priority}]** ${imp.area}: ${imp.improvement}\n  - 期待される効果: ${imp.expectedImpact}`
  )
  .join('\n')}

---

## 📋 次のステップ

1. 優先度CRITICAL/HIGHの修正事項を実装
2. 改善提案を反映
3. テストと検証
4. ドキュメント更新

---

## 📄 詳細レビュー結果

詳細なレビュー結果は \`docs/MCP_SERVER_AI_REVIEW_REPORT.json\` を参照してください。
`;

    const markdownPath = join(
      __dirname,
      '../docs/MCP_SERVER_AI_REVIEW_REPORT.md'
    );
    fs.writeFileSync(markdownPath, markdownReport, 'utf-8');
    console.log(`💾 マークダウンレポートを保存しました: ${markdownPath}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ MCPサーバーAIレビュー完了');
    console.log('='.repeat(80));
    console.log('\n👑 CEO殿、レビュー結果を確認し、優先度の高い修正事項から実装を開始します。\n');
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
