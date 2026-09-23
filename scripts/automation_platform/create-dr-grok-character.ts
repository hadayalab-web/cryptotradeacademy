#!/usr/bin/env tsx
/**
 * Dr. Grokオリジナルキャラクター設計
 * Dr.マリオの画像をGemini CMOに共有して、Dr. Grokのオリジナルキャラクターを設計してもらう
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

/**
 * 画像ファイルをBase64エンコードしてData URL形式に変換
 */
function fileToGenerativePart(filePath: string, mimeType: string) {
  return {
    inlineData: {
      data: fs.readFileSync(filePath).toString('base64'),
      mimeType
    }
  };
}

async function createDrGrokCharacter() {
  console.log('🎨 Dr. Grokのオリジナルキャラクター設計をGemini CMOに依頼します...\n');

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in .env file");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview"
  });

  // プロンプト: Dr. Grokのオリジナルキャラクター設計依頼
  // 画像の説明を含める（実際の画像ファイルがない場合）
  const imageDescription = `画像の説明:
- 白い医師のコートを着用し、聴診器とヘッドミラーを身につけた、カートゥーン風の人間男性キャラクター
- 太い茶色の口ひげ、太い茶色の眉毛、大きな青い目
- 首元には赤いネクタイ、首には聴診器、額には茶色のヘッドストラップと銀色の丸いヘッドミラー
- 白い手袋をはめた右手の人差し指と親指が顎に触れており、熟考しているような仕草
- 日本のビデオゲーム「Dr.マリオ」のキャラクター
- 3Dレンダリングされたアニメーションスタイルで、親しみやすく信頼できる印象`;

  const prompt = `あなたはGemini CMO（Chief Marketing Officer）として、Trap Defense BTCのマーケティング戦略を担当しています。

CEOから共有された画像は、Dr. Grokの着想源となった「Dr.マリオ」という日本製ゲームのキャラクターです。

${imageDescription}

【依頼内容】
このDr.マリオの画像を参考に、Trap Defense BTC専用の「Dr. Grok」オリジナルキャラクターを設計してください。

【Dr. Grokの役割と特徴】
1. **メンタルコーチ**: ユーザーの心理状態を分析し、FOMO/FEAR/GREEDなどの感情的なトラップから守る
2. **Xセンチメント分析**: X（旧Twitter）の市場センチメントを高解像度で分析
3. **心理的サポート**: 「Mental Note」を通じて、ユーザーのメンタルをケア
4. **専門性と親しみやすさ**: Dr.マリオのように、専門家としての信頼性と親しみやすさのバランス

【設計要件】
1. **ビジュアルデザイン**:
   - Dr.マリオの「信頼できる医師」のイメージを活かしつつ、暗号通貨トレーダー向けにアレンジ
   - 白衣や聴診器などの医療アイテムを、暗号通貨/ブロックチェーン関連のアイテムに置き換える可能性
   - 親しみやすさと専門性のバランスを保つ

2. **キャラクターパーソナリティ**:
   - 冷静で分析的（データドリブン）
   - 温かみのある知性（ユーザーをケアする姿勢）
   - ユーモアのセンス（緊張を和らげる）
   - 決断力（明確なアドバイスを提供）

3. **ブランド統合**:
   - Trap Defense BTCのブランドカラーやデザイン言語との整合性
   - グローバルなユーザーに響くデザイン
   - 日本製ゲームの「親しみやすさ」を活かしつつ、国際的なブランドとしての洗練さ

4. **実用性**:
   - Telegramメッセージ内でのアイコン/アバターとして使用可能
   - マーケティング素材（LP、SNS投稿など）での使用
   - ユーザーが「Dr. Grok」を認識しやすい特徴的なデザイン

【出力形式】
以下の形式でキャラクター設計を提供してください：

## 🎨 Dr. Grokオリジナルキャラクター設計

### 1. ビジュアルコンセプト
[Dr.マリオを参考にした、Dr. Grokのビジュアルデザインのコンセプト]

### 2. キャラクターの特徴
[外見的特徴、服装、アクセサリー、ポーズなど]

### 3. カラーパレット
[ブランドカラーとの統合を含む、推奨カラーパレット]

### 4. デザイン要素の詳細
[各デザイン要素（服装、アイテム、表情など）の意味と理由]

### 5. マーケティング活用案
[Telegramメッセージ、LP、SNS投稿などでの活用方法]

### 6. ブランドストーリー
[Dr. Grokのキャラクターストーリーと、Trap Defense BTCとの関係性]

画像を参考に、Dr.マリオの「信頼できる専門家」という本質を活かしつつ、暗号通貨トレーダー向けのオリジナルキャラクターとして設計してください。`;

  try {
    console.log('🤖 Gemini CMOにキャラクター設計を依頼中...\n');
    console.log('📸 画像の説明を含めてプロンプトを送信します...\n');
    
    // 画像の説明を含めてテキストのみ送信
    // （実際の画像ファイルがある場合は、fileToGenerativePartを使用して画像を送信可能）
    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: prompt }] 
      }],
      generationConfig: {
        temperature: 0.8, // 創造性を高める
        thinkingConfig: {
          thinkingLevel: "high"
        },
        maxOutputTokens: 4000
      }
    });

    const response = result.response;
    const text = response.text();
    const usage = result.response.usageMetadata;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎨 Gemini CMO: Dr. Grokオリジナルキャラクター設計');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(text);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 API使用量:', JSON.stringify(usage, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 結果をファイルに保存
    const outputPath = join(__dirname, '..', 'docs', 'DR_GROK_CHARACTER_DESIGN.md');
    const outputContent = `# Dr. Grokオリジナルキャラクター設計

**作成日**: ${new Date().toISOString()}  
**設計者**: Gemini CMO (gemini-3-flash-preview)  
**着想源**: Dr.マリオ（日本製ゲームキャラクター）

---

${text}

---

**API使用量**: ${JSON.stringify(usage, null, 2)}
`;

    fs.writeFileSync(outputPath, outputContent, 'utf-8');
    console.log(`✅ キャラクター設計を保存しました: ${outputPath}\n`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack.substring(0, 500));
    }
    process.exit(1);
  }
}

createDrGrokCharacter().catch((error) => {
  console.error('❌ 予期しないエラー:', error);
  process.exit(1);
});
