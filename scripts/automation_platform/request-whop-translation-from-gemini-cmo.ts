import { callGemini3Pro } from '../api/unified-api.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    console.log('📝 Gemini CMOにWhop翻訳依頼を送信中...\n');

    // 翻訳依頼ドキュメントを読み込む
    const requestDocPath = path.join(__dirname, '../docs/GEMINI_CMO_WHOP_TRANSLATION_REQUEST.md');
    const requestDoc = fs.readFileSync(requestDocPath, 'utf-8');

    // VSL1字幕ファイルを読み込む（参考資料として）
    const vsl1SubtitlePath = 'c:\\Users\\chiba\\Downloads\\task1_Bitcoin Trap Defence-caption.srt';
    let vsl1Subtitle = '';
    try {
      vsl1Subtitle = fs.readFileSync(vsl1SubtitlePath, 'utf-8');
    } catch (error) {
      console.warn('⚠️ VSL1字幕ファイルが見つかりませんでした。参考資料なしで続行します。');
    }

    // Gemini CMOへのプロンプト
    const prompt = `あなたはGemini CMO（最高マーケティング責任者）です。

以下のWhop EN版ページの内容を、他5言語（JA, KO, ES, AR, PT-BR）に翻訳してください。

**重要**: 実際のWhop EN版ページの形式（絵文字とセクション分け）を維持してください。

---

## 📋 翻訳依頼内容

${requestDoc}

---

## 📚 参考資料（VSL1字幕）

VSL1の内容も参考にしてください：

\`\`\`
${vsl1Subtitle}
\`\`\`

---

## 🎯 出力形式

以下のJSON形式で出力してください：

\`\`\`json
{
  "JA": {
    "headline": "[日本語翻訳]",
    "description": "[日本語翻訳、絵文字とセクション分けを維持]",
    "features": [
      "[Feature 1の日本語翻訳]",
      "[Feature 2の日本語翻訳]",
      "[Feature 3の日本語翻訳]",
      "[Feature 4の日本語翻訳]",
      "[Feature 5の日本語翻訳]"
    ],
    "faq": [
      {
        "question": "[FAQ 1の質問の日本語翻訳]",
        "answer": "[FAQ 1の回答の日本語翻訳]"
      },
      {
        "question": "[FAQ 2の質問の日本語翻訳]",
        "answer": "[FAQ 2の回答の日本語翻訳]"
      },
      {
        "question": "[FAQ 3の質問の日本語翻訳]",
        "answer": "[FAQ 3の回答の日本語翻訳]"
      },
      {
        "question": "[FAQ 4の質問の日本語翻訳]",
        "answer": "[FAQ 4の回答の日本語翻訳]"
      },
      {
        "question": "[FAQ 5の質問の日本語翻訳]",
        "answer": "[FAQ 5の回答の日本語翻訳]"
      }
    ]
  },
  "KO": {
    "headline": "[韓国語翻訳]",
    "description": "[韓国語翻訳、絵文字とセクション分けを維持]",
    "features": [
      "[Feature 1の韓国語翻訳]",
      "[Feature 2の韓国語翻訳]",
      "[Feature 3の韓国語翻訳]",
      "[Feature 4の韓国語翻訳]",
      "[Feature 5の韓国語翻訳]"
    ],
    "faq": [
      {
        "question": "[FAQ 1の質問の韓国語翻訳]",
        "answer": "[FAQ 1の回答の韓国語翻訳]"
      },
      {
        "question": "[FAQ 2の質問の韓国語翻訳]",
        "answer": "[FAQ 2の回答の韓国語翻訳]"
      },
      {
        "question": "[FAQ 3の質問の韓国語翻訳]",
        "answer": "[FAQ 3の回答の韓国語翻訳]"
      },
      {
        "question": "[FAQ 4の質問の韓国語翻訳]",
        "answer": "[FAQ 4の回答の韓国語翻訳]"
      },
      {
        "question": "[FAQ 5の質問の韓国語翻訳]",
        "answer": "[FAQ 5の回答の韓国語翻訳]"
      }
    ]
  },
  "ES": {
    "headline": "[スペイン語翻訳]",
    "description": "[スペイン語翻訳、絵文字とセクション分けを維持]",
    "features": [
      "[Feature 1のスペイン語翻訳]",
      "[Feature 2のスペイン語翻訳]",
      "[Feature 3のスペイン語翻訳]",
      "[Feature 4のスペイン語翻訳]",
      "[Feature 5のスペイン語翻訳]"
    ],
    "faq": [
      {
        "question": "[FAQ 1の質問のスペイン語翻訳]",
        "answer": "[FAQ 1の回答のスペイン語翻訳]"
      },
      {
        "question": "[FAQ 2の質問のスペイン語翻訳]",
        "answer": "[FAQ 2の回答のスペイン語翻訳]"
      },
      {
        "question": "[FAQ 3の質問のスペイン語翻訳]",
        "answer": "[FAQ 3の回答のスペイン語翻訳]"
      },
      {
        "question": "[FAQ 4の質問のスペイン語翻訳]",
        "answer": "[FAQ 4の回答のスペイン語翻訳]"
      },
      {
        "question": "[FAQ 5の質問のスペイン語翻訳]",
        "answer": "[FAQ 5の回答のスペイン語翻訳]"
      }
    ]
  },
  "AR": {
    "headline": "[アラビア語翻訳]",
    "description": "[アラビア語翻訳、絵文字とセクション分けを維持]",
    "features": [
      "[Feature 1のアラビア語翻訳]",
      "[Feature 2のアラビア語翻訳]",
      "[Feature 3のアラビア語翻訳]",
      "[Feature 4のアラビア語翻訳]",
      "[Feature 5のアラビア語翻訳]"
    ],
    "faq": [
      {
        "question": "[FAQ 1の質問のアラビア語翻訳]",
        "answer": "[FAQ 1の回答のアラビア語翻訳]"
      },
      {
        "question": "[FAQ 2の質問のアラビア語翻訳]",
        "answer": "[FAQ 2の回答のアラビア語翻訳]"
      },
      {
        "question": "[FAQ 3の質問のアラビア語翻訳]",
        "answer": "[FAQ 3の回答のアラビア語翻訳]"
      },
      {
        "question": "[FAQ 4の質問のアラビア語翻訳]",
        "answer": "[FAQ 4の回答のアラビア語翻訳]"
      },
      {
        "question": "[FAQ 5の質問のアラビア語翻訳]",
        "answer": "[FAQ 5の回答のアラビア語翻訳]"
      }
    ]
  },
  "PT-BR": {
    "headline": "[ポルトガル語（ブラジル）翻訳]",
    "description": "[ポルトガル語（ブラジル）翻訳、絵文字とセクション分けを維持]",
    "features": [
      "[Feature 1のポルトガル語（ブラジル）翻訳]",
      "[Feature 2のポルトガル語（ブラジル）翻訳]",
      "[Feature 3のポルトガル語（ブラジル）翻訳]",
      "[Feature 4のポルトガル語（ブラジル）翻訳]",
      "[Feature 5のポルトガル語（ブラジル）翻訳]"
    ],
    "faq": [
      {
        "question": "[FAQ 1の質問のポルトガル語（ブラジル）翻訳]",
        "answer": "[FAQ 1の回答のポルトガル語（ブラジル）翻訳]"
      },
      {
        "question": "[FAQ 2の質問のポルトガル語（ブラジル）翻訳]",
        "answer": "[FAQ 2の回答のポルトガル語（ブラジル）翻訳]"
      },
      {
        "question": "[FAQ 3の質問のポルトガル語（ブラジル）翻訳]",
        "answer": "[FAQ 3の回答のポルトガル語（ブラジル）翻訳]"
      },
      {
        "question": "[FAQ 4の質問のポルトガル語（ブラジル）翻訳]",
        "answer": "[FAQ 4の回答のポルトガル語（ブラジル）翻訳]"
      },
      {
        "question": "[FAQ 5の質問のポルトガル語（ブラジル）翻訳]",
        "answer": "[FAQ 5の回答のポルトガル語（ブラジル）翻訳]"
      }
    ]
  }
}
\`\`\`

**重要**: 
- 絵文字（🛡️ 🤖 📊 ⏳ 🚀）はすべて維持してください
- セクション分けの構造を維持してください
- 文字数制限を守ってください（Headline 30字以内、Features 各140字以内）
- 専門用語（Trap Defence BTC、CryptoQuant AI、Grok AI、GPT Logic、Gemini Engine、Trap Score）は統一してください
- 各言語の文化的配慮をしてください（JA: 安住紳一郎スタイル、KO: データ重視、ES: 情熱的かつ冷静、AR: 文化的に適切、PT-BR: ブラジル市場に適した表現）

JSON形式で出力してください。`;

    console.log('🤖 Gemini CMOに依頼中...\n');

    // Gemini CMOに依頼
    const result = await callGemini3Pro(prompt, {
      thinkingLevel: 'high',
      temperature: 0.7,
      maxOutputTokens: 8000
    });

    console.log('✅ Gemini CMOからの回答:\n');
    console.log('---\n');
    console.log(result.text);
    console.log('\n---\n');

    // 結果をファイルに保存
    const outputPath = path.join(__dirname, '../data/whop-translations-gemini-cmo.json');
    
    // JSONを抽出（マークダウンのコードブロックから）
    let jsonText = result.text;
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      // JSONコードブロックがない場合、全体をJSONとして扱う
      const jsonOnlyMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonOnlyMatch) {
        jsonText = jsonOnlyMatch[0];
      }
    }

    try {
      const jsonData = JSON.parse(jsonText);
      fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
      console.log(`✅ 翻訳結果を保存しました: ${outputPath}\n`);
    } catch (parseError) {
      console.error('⚠️ JSON解析エラー。生のテキストを保存します。');
      fs.writeFileSync(outputPath.replace('.json', '.txt'), result.text, 'utf-8');
      console.log(`✅ 生のテキストを保存しました: ${outputPath.replace('.json', '.txt')}\n`);
    }

    // 使用量情報
    if (result.usage) {
      console.log('📊 使用量情報:');
      console.log(`  Prompt Tokens: ${result.usage.promptTokenCount || 'N/A'}`);
      console.log(`  Candidates Tokens: ${result.usage.candidatesTokenCount || 'N/A'}`);
      console.log(`  Total Tokens: ${result.usage.totalTokenCount || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    if (error instanceof Error) {
      console.error('エラーメッセージ:', error.message);
      console.error('スタック:', error.stack);
    }
    process.exit(1);
  }
}

main();
