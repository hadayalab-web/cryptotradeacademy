import { callGPT52 } from '../api/unified-api.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const affiliateDmCode = `import { NextRequest, NextResponse } from "next/server";
import { getTelegramClient } from "@/lib/telegram";
import { loadCandidatesFromCSV } from "@/lib/data/affiliate-candidates";
import OpenAI from "openai";
import "@/lib/env";

async function generatePersonalizedDM(candidate: any, marketCode: string, template: string): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.warn("OPENAI_API_KEY not set, using template");
    return template.replace(/\\[Name\\]/g, candidate.name || candidate.name || "候補者");
  }
  const prompt = \`以下のアフィリエイター候補情報を基に、パーソナライズドなTelegram DM文面を生成してください。\\n\\n候補情報:\\n- 名前: \${candidate.name || candidate.name || "候補者"}\\n- 市場: \${marketCode}\\n- プラットフォーム: \${candidate.platform || "X"}\\n\\n要件:\\n1. 候補のコンテンツスタイルに合わせた自然なトーン\\n2. 低摩擦CTA（「2分で登録」など）\\n3. 市場コード: \${marketCode}\\n4. 200-300文字程度\\n\\n以下のテンプレートを参考に、パーソナライズドなメッセージを生成してください:\\n\${template}\\n\\n[Name]を実際の名前に置き換え、より自然で親しみやすい文章にしてください。\`;
  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 500
    });
    const generatedText = completion.choices[0]?.message?.content || "";
    return generatedText.replace(/\\[Name\\]/g, candidate.name || "候補者").trim();
  } catch (error) {
    console.warn("GPT-4o DM生成エラー（テンプレートを使用）:", error);
    return template.replace(/\\[Name\\]/g, candidate.name || candidate.name || "候補者");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketCode, candidateIds, limit = 10, status = "New", customMessage } = body;
    const validMarkets = ["EN", "AR", "KO", "JA", "ES", "PT-BR"];
    if (!marketCode || !validMarkets.includes(marketCode)) {
      return NextResponse.json({ error: \`Invalid marketCode. Valid markets: \${validMarkets.join(", ")}\` }, { status: 400 });
    }
    const results = { success: true, marketCode, sent: [] as any[], failed: [] as any[] };
    const candidates = loadCandidatesFromCSV(process.cwd() + "/data/affiliate-candidates/affiliate-candidates-all.csv");
    if (candidateIds && candidateIds.length > 0) {
      const client = getTelegramClient(marketCode);
      for (const candidateId of candidateIds.slice(0, limit)) {
        try {
          const candidate = candidates.find((c) => c.id === candidateId);
          let personalizedMessage = customMessage || dmTemplates[marketCode] || dmTemplates.EN;
          if (candidate && !customMessage) {
            personalizedMessage = await generatePersonalizedDM(candidate, marketCode, dmTemplates[marketCode] || dmTemplates.EN);
          } else if (candidate) {
            personalizedMessage = personalizedMessage.replace(/\\[Name\\]/g, candidate.name || "候補者");
          }
          const telegramUserId = candidate?.telegramUserId;
          if (!telegramUserId) {
            results.failed.push({ candidateId, error: "Telegram User ID not found" });
            continue;
          }
          const result = await client.sendMessage({ userId: telegramUserId, message: personalizedMessage, parseMode: "HTML" });
          if (result.success) {
            results.sent.push({ candidateId, messageId: result.messageId });
          } else {
            results.failed.push({ candidateId, error: result.error });
          }
        } catch (error: any) {
          results.failed.push({ candidateId, error: error.message });
        }
      }
    }
    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Affiliate DM workflow error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute affiliate DM workflow" }, { status: 500 });
  }
}`;

const generateWhopAffiliateLinkCode = `export async function generateWhopAffiliateLink(options: {
  productId: string;
  affiliateId: string;
  planId?: string;
  customCode?: string;
}) {
  const { productId, affiliateId, planId, customCode } = options;
  let affiliateCode: string;
  try {
    const affiliate = await whopRequest("GET", \`/affiliates/\${affiliateId}\`);
    affiliateCode = customCode || \`aff_\${affiliate.data?.id || affiliateId}\`;
  } catch (error: any) {
    affiliateCode = customCode || \`aff_\${affiliateId}\`;
  }
  const product = await whopRequest("GET", \`/products/\${productId}\`);
  const productSlug = product.data?.slug || productId;
  let affiliateLink: string;
  if (planId) {
    affiliateLink = \`https://whop.com/checkout/\${productId}/\${planId}?ref=\${affiliateCode}\`;
  } else {
    affiliateLink = \`https://whop.com/\${productSlug}?ref=\${affiliateCode}\`;
  }
  return { affiliateLink, affiliateCode, productId, planId: planId || null, affiliateId };
}`;

const prompt = `あなたはCTO: GPT (Architect)です。以下のコードレビューを実施してください。

## レビュー対象

### 1. affiliate-dmワークフロー

ファイル: hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja/app/api/workflows/affiliate-dm/route.ts

\`\`\`typescript
${affiliateDmCode}
\`\`\`

### 2. api/unified-api.tsのgenerateWhopAffiliateLink関数

\`\`\`typescript
${generateWhopAffiliateLinkCode}
\`\`\`

## レビュー観点

1. **コードの重複（DRY原則）**
   - affiliate-dmワークフロー内でWhop APIを直接呼び出す実装があるか？
   - api/unified-api.tsの関数を活用できているか？

2. **api/unified-api.tsの活用**
   - affiliate-dmワークフローにWhopアフィリエイトリンク生成機能を統合する場合、api/unified-api.tsのgenerateWhopAffiliateLink関数を使用すべきか？
   - ワークフロー内で直接実装すべきか？

3. **エラーハンドリング**
   - 適切なエラーハンドリングが実装されているか？
   - フォールバック処理は適切か？

4. **型安全性**
   - TypeScript型定義は適切か？
   - 型の一貫性は保たれているか？

5. **パフォーマンス**
   - API呼び出しの最適化は適切か？
   - 不要なAPI呼び出しはないか？

6. **メンテナンス性**
   - コードの可読性は高いか？
   - 将来の変更に対応しやすい構造か？

## 出力形式

以下の形式でレビュー結果を返してください：

# CTOレビュー: affiliate-dmワークフロー + Whop統合

## 1. コードの重複（DRY原則）

## 2. api/unified-api.tsの活用

## 3. エラーハンドリング

## 4. 型安全性

## 5. パフォーマンス

## 6. メンテナンス性

## 推奨事項

## 結論

レビュー結果を日本語で、構造化された形式で返してください。`;

async function main() {
  try {
    console.log('📋 CTO: GPT (Architect)にレビューを依頼中...\n');
    const result = await callGPT52(prompt, {
      maxCompletionTokens: 4000,
      temperature: 0.7,
    });
    console.log('='.repeat(80));
    console.log('CTOレビュー結果');
    console.log('='.repeat(80));
    console.log('\n');
    console.log(result.text);
    console.log('\n');
    console.log('='.repeat(80));
    if (result.usage) {
      console.log('\n📊 使用量:');
      console.log(`  - Prompt Tokens: ${result.usage.prompt_token_count || 'N/A'}`);
      console.log(`  - Completion Tokens: ${result.usage.completion_token_count || 'N/A'}`);
      console.log(`  - Total Tokens: ${result.usage.total_token_count || 'N/A'}`);
    }
    const outputPath = join(__dirname, '..', 'docs', 'CTO_REVIEW_AFFILIATE_DM_OFFICIAL.md');
    const output = `# CTOレビュー: affiliate-dmワークフロー + Whop統合

**レビュー日**: ${new Date().toISOString()}  
**レビュー者**: GPT: CTO (gpt-5.2-2025-12-11)  
**依頼者**: COO: Cursor (Composer)

---

${result.text}

---

## 使用量

${result.usage ? `
- Prompt Tokens: ${result.usage.prompt_token_count || 'N/A'}
- Completion Tokens: ${result.usage.completion_token_count || 'N/A'}
- Total Tokens: ${result.usage.total_token_count || 'N/A'}
` : 'N/A'}

---

**最終更新**: ${new Date().toISOString()}
`;
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`\n✅ レビュー結果を保存しました: ${outputPath}`);
  } catch (error: any) {
    console.error('❌ エラーが発生しました:');
    console.error(error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

main();
