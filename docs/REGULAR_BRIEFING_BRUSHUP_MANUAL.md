# 有料版（Regular Briefing）ブラッシュアップ完全マニュアル

**最終更新**: 2026-01-26  
**目的**: 有料版（Regular Briefing）の6言語版を効率的にブラッシュアップするための完全マニュアル

---

## 📋 目次

1. [前提条件と準備](#前提条件と準備)
2. [参照すべき設計ドキュメント](#参照すべき設計ドキュメント)
3. [核心要件の定義](#核心要件の定義)
4. [GPTレビュープロンプトテンプレート](#gptレビュープロンプトテンプレート)
5. [修正チェックリスト](#修正チェックリスト)
6. [効率的な作業フロー](#効率的な作業フロー)
7. [各言語版の修正ポイント](#各言語版の修正ポイント)
8. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件と準備

### 必要なファイルの確認

有料版のファイルは以下の場所に存在します：

```
services/telegram/messages/user/
├── en/regular.en.js
├── es/regular.es.js
├── pt-br/regular.pt-br.js
├── ar/regular.ar.js
├── ja/regular.ja.js
└── ko/regular.ko.js
```

### 必要な環境

- Node.js環境
- OpenAI APIキー（GPTレビュー用）
- 設計ドキュメントへのアクセス

---

## 参照すべき設計ドキュメント

### 1. Grok × Gemini 最適化分析ログ

**ファイルパス**: `output/grok-gemini-optimization-2026-01-26T02-22-26-013Z.md`

**重要なセクション**:
- **Grok Xアルゴリズム最適化案** (行8-114)
  - Xアルゴリズムの動作原理
  - スレッド形式の推奨構造
  - エンゲージメント戦略
  - ポール・リプライ最適化

- **Gemini深層心理分析と最適化案** (行115-415)
  - 認知的不協和の活用
  - レイテンシ不安の創出
  - 油断警告の実装
  - 防御第一フレーミング

### 2. GPTネイティブ設計書

**ファイルパス**: `output/gpt-native-design-2026-01-26T02-29-35-581Z.md`

**重要なセクション**:
- **Overall Design Philosophy** (行7-47)
  - Xアルゴリズム対策
  - 心理的エンジン
  - ブランドボイスルール

- **Language-Specific Tone Guidelines** (行49-756)
  - EN, ES, PT-BR, AR, JA, KO のトーンガイドライン
  - 使用すべき表現・避けるべき表現
  - 文化的ニュアンス

- **有料版（Regular Briefing）の設計** (行350以降)
  - ニュース番組構造
  - 各セクションの役割
  - ネイティブ表現の要件

### 3. 無料版の実装例（参考）

**ファイルパス**: `services/telegram/messages/user/{lang}/minimal-high-quality.{lang}.js`

無料版で実装された以下の要素を参考にします：
- 4ブロック構造（[1/4] → [2/4] → [3/4] → [4/4]）
- 油断警告（「0/100は油断を生む」）
- 15分ウィンドウの明示
- ネイティブ表現の実装

---

## 核心要件の定義

有料版のブラッシュアップでは、以下の4つの核心要件を満たす必要があります。

### 1. GrokのXアルゴリズム対策

**必須要素**:
- ✅ **スレッド形式の構造**: 複数の投稿に分割可能な構造
- ✅ **矛盾フック**: Fear vs Trap Score の矛盾を明確に提示
- ✅ **Quick Reads**: 1-2行の簡潔なデータ解釈
- ✅ **ポール + CTA**: エンゲージメントを促すポールとCTA
- ✅ **15分ウィンドウ**: 有料版の優位性を強調（無料版との差別化）

**評価基準**:
- Xアルゴリズムが好む「会話を生むコンテンツ」になっているか
- リプライ・ポールへの参加を促す構造になっているか
- エンゲージメント率を向上させる要素が含まれているか

### 2. Geminiの深層心理対策

**必須要素**:
- ✅ **認知的不協和**: Fear/ugly chart vs low Trap Score の矛盾
- ✅ **油断警告**: 低スコア時の油断を防ぐ警告
- ✅ **レイテンシ不安**: 「無料版は遅れる」という不安の創出
- ✅ **防御第一フレーミング**: 「Don't revenge-trade」「防御モード」などの表現
- ✅ **価値の明確化**: 有料版の優位性を心理的に訴求

**評価基準**:
- 無料版から有料版へのアップグレード意欲を喚起するか
- 心理的フックが適切に配置されているか
- ユーザーの不安を適切に活用しているか

### 3. GPT設計構造

**必須要素**:
- ✅ **ニュース番組構造**: Opening → Data Presentation → Commentator → Closing
- ✅ **適切なラベリング**: セクションの明確な区切り
- ✅ **Telegram適応**: 単一メッセージとして機能する構造
- ✅ **情報の階層化**: 重要度に応じた情報の配置

**評価基準**:
- GPT設計書の構造に準拠しているか
- 各セクションの役割が明確か
- ユーザーが理解しやすい構造になっているか

### 4. ネイティブ表現

**必須要素**:
- ✅ **禁止フレーズの削除**: 「market conditions appear」「remain vigilant」などの翻訳調表現を避ける
- ✅ **ネイティブなフレージング**: 会話的、trader-to-trader トーン
- ✅ **言語固有の適応**: LATAM Spanish（Spainではない）、Brazilian Portuguese（Portugalではない）、Gulf Arabic（generic MSAではない）、自然な日本語・韓国語

**評価基準**:
- 翻訳調ではない自然な表現になっているか
- 各言語の文化的ニュアンスが適切に反映されているか
- 禁止フレーズが含まれていないか

---

## GPTレビュープロンプトテンプレート

以下のテンプレートを使用して、GPTレビューを効率的に実施します。

### スクリプトファイル

**ファイルパス**: `scripts/ask-gpt-final-check-all-regular.js`

```javascript
#!/usr/bin/env node
/**
 * GPT-5.2に修正後の有料版（Regular Briefing）の6言語版を最終チェックしてもらうスクリプト
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const OpenAI = require('openai');

// .envファイルを読み込む
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is not set');
  process.exit(1);
}

const openaiClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// 設計ドキュメントを読み込む
const designFile = path.join(__dirname, '..', 'output', 'gpt-native-design-2026-01-26T02-29-35-581Z.md');
const grokGeminiFile = path.join(__dirname, '..', 'output', 'grok-gemini-optimization-2026-01-26T02-22-26-013Z.md');

const designGuidelines = fs.readFileSync(designFile, 'utf-8');
const grokGeminiAnalysis = fs.readFileSync(grokGeminiFile, 'utf-8');

// 実装ファイルを読み込む
const langFiles = {
  en: path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'en', 'regular.en.js'),
  es: path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'es', 'regular.es.js'),
  'pt-br': path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'pt-br', 'regular.pt-br.js'),
  ar: path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'ar', 'regular.ar.js'),
  ja: path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'ja', 'regular.ja.js'),
  ko: path.join(__dirname, '..', 'services', 'telegram', 'messages', 'user', 'ko', 'regular.ko.js'),
};

const implementations = {};
for (const [lang, filePath] of Object.entries(langFiles)) {
  if (fs.existsSync(filePath)) {
    implementations[lang] = fs.readFileSync(filePath, 'utf-8');
  } else {
    console.warn(`⚠️ ファイルが見つかりません: ${filePath}`);
  }
}

async function askGPTForFinalReview() {
  try {
    const prompt = `You are reviewing the Regular Briefing (Paid) message implementations for 6 languages (EN, ES, PT-BR, AR, JA, KO).

**CRITICAL: Focus ONLY on these 4 CORE REQUIREMENTS. If these are met, approve immediately. Minor polish is OPTIONAL, not required.**

## CORE REQUIREMENTS (Must-Have for Approval):

### 1. Grok's X Algorithm Strategy (from Grok analysis)
- ✅ **Thread-ready structure**: Message can be split into multiple posts for X (Twitter)
- ✅ **Hook contains**: Fear vs Trap Score contradiction or market insight
- ✅ **Quick data reads**: 1-2 lines max, trader interpretation (not report-style)
- ✅ **Poll + CTA**: Engagement-driving poll and clear CTA
- ✅ **15-minute window advantage**: Explicitly mention paid version's real-time advantage over free version

### 2. Gemini's Deep Psychological Strategy (from Gemini analysis)
- ✅ **Cognitive dissonance hook**: Fear/ugly chart vs data contradiction
- ✅ **Complacency warning**: Warn against complacency when score is low
- ✅ **Latency anxiety**: Emphasize free version's delay vs paid version's real-time alerts
- ✅ **Defense-first framing**: "Don't revenge-trade", "defense mode", "wait for confirmation"
- ✅ **Value proposition**: Clearly communicate paid version's psychological and practical advantages

### 3. GPT Design Structure (from GPT design document)
- ✅ **News program structure**: Opening → Data Presentation → Commentator → Closing
- ✅ **Proper section labeling**: Clear section breaks and labels
- ✅ **Telegram adaptation**: Single message that works as a cohesive unit
- ✅ **Information hierarchy**: Important information prioritized appropriately

### 4. Native Expression (not translation-style)
- ✅ **Banned phrases removed**: No "market conditions appear", "remain vigilant", "exercise caution", etc.
- ✅ **Native phrasing**: Conversational, trader-to-trader tone (not corporate/report)
- ✅ **Language-specific**: LATAM Spanish (not Spain), Brazilian Portuguese (not Portugal), Gulf Arabic (not generic MSA), natural Japanese/Korean

## EVALUATION CRITERIA:

**APPROVE** if ALL 4 core requirements above are met, even if there are minor polish opportunities.

**REJECT** only if:
- Structure is wrong (not following news program structure, missing sections)
- Core psychological hooks are missing (no contradiction, no latency anxiety, no complacency warning)
- Translation-style/banned phrases are present in the final rendered message
- Native expression is fundamentally broken (e.g., Spain Spanish instead of LATAM, Portugal Portuguese instead of Brazilian)
- Value proposition is unclear or missing

**DO NOT REJECT** for:
- Minor wording tweaks
- Optional polish
- Hashtag placement
- Unused helper functions (as long as final message is correct)

## Design Guidelines:

${designGuidelines.substring(0, 5000)}

## Grok × Gemini Analysis:

${grokGeminiAnalysis.substring(0, 5000)}

## Current Implementations:

### EN (English):
\`\`\`javascript
${implementations.en || 'Not found'}
\`\`\`

### ES (Spanish - Latin American):
\`\`\`javascript
${implementations.es || 'Not found'}
\`\`\`

### PT-BR (Portuguese - Brazilian):
\`\`\`javascript
${implementations['pt-br'] || 'Not found'}
\`\`\`

### AR (Arabic - Dubai/Gulf):
\`\`\`javascript
${implementations.ar || 'Not found'}
\`\`\`

### JA (Japanese):
\`\`\`javascript
${implementations.ja || 'Not found'}
\`\`\`

### KO (Korean):
\`\`\`javascript
${implementations.ko || 'Not found'}
\`\`\`

## Review Format:

For each language, provide:
1. **Core Requirements Check**: ✅ or ❌ for each of the 4 requirements
2. **Verdict**: APPROVED / REJECTED (with specific reason if rejected)
3. **Optional Polish** (only if approved): Minor suggestions, clearly marked as "optional"

**Final Summary**: List which languages are APPROVED and which are REJECTED (with specific blocking issues only).`;

    console.log('🤖 GPT-5.2に最終チェックを依頼中...\n');
    
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'You are a strict but fair reviewer focusing on CORE REQUIREMENTS only. You approve implementations that meet the 4 core requirements (Grok X algorithm strategy, Gemini psychological strategy, GPT design structure, native expression). You reject only for blocking issues. Minor polish suggestions are clearly marked as optional.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 15000,
      temperature: 0.7,
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    return text || 'No response from GPT';
  } catch (error) {
    console.error('[GPT] Error:', error.message);
    return `Error: ${error.message}`;
  }
}

async function main() {
  console.log('🚀 GPT-5.2 有料版（Regular Briefing）最終チェックスクリプト\n');
  
  const result = await askGPTForFinalReview();

  console.log('\n' + '='.repeat(80));
  console.log('📊 GPT-5.2 最終レビュー結果');
  console.log('='.repeat(80) + '\n');
  console.log(result);

  // 結果をファイルに保存
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(outputDir, `gpt-final-check-all-regular-${timestamp}.md`);

  const outputContent = `# GPT-5.2 有料版（Regular Briefing）最終チェック

生成日時: ${new Date().toISOString()}

## レビュー結果

${result}
`;

  fs.writeFileSync(outputFile, outputContent, 'utf-8');
  console.log(`\n✅ 結果を保存しました: ${outputFile}`);
}

main().catch((error) => {
  console.error('\n❌ 予期しないエラー:', error.message);
  process.exit(1);
});
```

---

## 修正チェックリスト

### 各言語版で確認すべき項目

#### 1. 構造チェック

- [ ] ニュース番組構造が実装されているか（Opening → Data → Commentator → Closing）
- [ ] セクションのラベリングが明確か
- [ ] Telegram単一メッセージとして機能するか
- [ ] X（Twitter）スレッド形式に分割可能な構造か

#### 2. Grok Xアルゴリズム対策

- [ ] 矛盾フックが含まれているか（Fear vs Trap Score）
- [ ] Quick Readsが1-2行に収まっているか
- [ ] ポール + CTAが含まれているか
- [ ] 15分ウィンドウの優位性が明示されているか

#### 3. Gemini深層心理対策

- [ ] 認知的不協和フックが実装されているか
- [ ] 油断警告が含まれているか（低スコア時）
- [ ] レイテンシ不安が創出されているか（無料版との差別化）
- [ ] 防御第一フレーミングが使用されているか
- [ ] 有料版の価値提案が明確か

#### 4. ネイティブ表現チェック

- [ ] 禁止フレーズが含まれていないか
  - "market conditions appear"
  - "remain vigilant"
  - "exercise caution"
  - その他の翻訳調表現
- [ ] 会話的トーンになっているか
- [ ] 言語固有の文化的ニュアンスが反映されているか
  - ES: LATAM（Spainではない）
  - PT-BR: Brazilian（Portugalではない）
  - AR: Gulf/Dubai（generic MSAではない）
  - JA/KO: 自然な表現

---

## 効率的な作業フロー

### ステップ1: 現状確認

1. 各言語版のファイルを読み込む
2. GPTレビュースクリプトを実行して現状を把握
3. レビュー結果を `output/gpt-final-check-all-regular-{timestamp}.md` に保存

### ステップ2: 修正の優先順位付け

GPTレビュー結果に基づいて、以下の順序で修正を実施：

1. **REJECTED項目の修正**（ブロッキング問題）
   - 構造の問題
   - 核心的心理フックの欠如
   - 禁止フレーズの存在
   - ネイティブ表現の根本的な問題

2. **APPROVED項目の微調整**（オプショナル）
   - 細かい表現の改善
   - トーンの微調整

### ステップ3: 修正の実施

1. 1言語ずつ修正を実施
2. 修正後、該当言語のみGPTレビューを再実行して確認
3. APPROVEDを取得したら次の言語へ

### ステップ4: 最終確認

1. 全6言語の修正が完了したら、全体レビューを再実行
2. 全言語がAPPROVEDを取得するまで繰り返す

---

## 各言語版の修正ポイント

### EN (English)

**特徴**:
- Trader-to-trader tone
- 直接的で冷静な表現
- 少しウィットに富んだ表現

**修正ポイント**:
- "The part nobody talks about" のようなフレーズを使用
- "Don't confuse red candles with real risk" のような表現
- "Cash is a position" のようなtrader用語

**避けるべき表現**:
- "Market conditions appear stable"
- "It's important to remain vigilant"

### ES (Spanish - Latin American)

**特徴**:
- LATAM street-smart tone
- 情熱的で直接的な表現
- 地域的な表現を使用（"Ojo", "te pica la mano"）

**修正ポイント**:
- "Ojo con esto" のような注意喚起
- "No te dejes llevar por el pánico" のような防御的表現
- "La trampa no es el precio… es tu impulso" のような心理的フレーミング

**避けるべき表現**:
- Spain Spanish（"vale", "vosotros", "tío"）
- 過度にフォーマルな金融スペイン語

### PT-BR (Brazilian Portuguese)

**特徴**:
- Brazilian conversational tone
- カジュアルで親しみやすい表現
- ブラジル特有の表現を使用

**修正ポイント**:
- "Calma. Respira." のような落ち着かせる表現
- "Não deixa o medo te empurrar" のような防御的表現
- "Muita armadilha nasce no silêncio" のような油断警告

**避けるべき表現**:
- Portugal Portuguese
- 過度にフォーマルな表現

### AR (Arabic - Dubai/Gulf)

**特徴**:
- Gulf/Dubai polished tone
- 洗練された表現
- 地域的な表現を使用（"خلّك هادي", "تبغى"）

**修正ポイント**:
- "الجزء اللي ما أحد يتكلم عنه" のような注意喚起
- "نافذة الـ15 دقيقة" のような15分ウィンドウの明示
- "خلّك هادي" のような防御的表現

**避けるべき表現**:
- Generic MSA（Modern Standard Arabic）
- 過度にフォーマルな表現

### JA (Japanese)

**特徴**:
- Natural Japanese trading tone
- 自然な日本語の表現
- trader用語を適切に使用

**修正ポイント**:
- "油断を生みます" のような油断警告
- "寝ている間に" のようなレイテンシ不安
- "焦って触らない" のような防御的表現

**避けるべき表現**:
- 翻訳調の表現
- 過度にフォーマルな表現

### KO (Korean)

**特徴**:
- Friendly-pro tone
- 親しみやすくプロフェッショナルな表現
- 簡潔で明確な表現

**修正ポイント**:
- "방심하기 쉬워요" のような油断警告
- "자다가" のようなレイテンシ不安
- "먼저 들어가지 마요" のような防御的表現

**避けるべき表現**:
- 教科書的な表現
- 過度にフォーマルな表現

---

## トラブルシューティング

### よくある問題と解決策

#### 問題1: GPTレビューが迷走する

**原因**: プロンプトが核心要件に集中していない

**解決策**:
- プロンプトテンプレートの「CRITICAL」セクションを強調
- 評価基準を明確に定義
- オプショナルな改善提案を明確に分離

#### 問題2: 全言語がREJECTEDになる

**原因**: 核心要件の理解が不十分

**解決策**:
- 設計ドキュメントを再確認
- 無料版の実装例を参考にする
- 1言語ずつ丁寧に修正

#### 問題3: ネイティブ表現の判断が難しい

**原因**: 言語固有の文化的ニュアンスの理解不足

**解決策**:
- GPT設計書の言語固有セクションを参照
- 禁止フレーズリストを確認
- ネイティブスピーカーに確認（可能な場合）

#### 問題4: 構造が複雑で修正が難しい

**原因**: ニュース番組構造の理解不足

**解決策**:
- GPT設計書の構造セクションを再確認
- 無料版の4ブロック構造を参考にする
- セクションごとに分割して修正

---

## 成功の指標

### 短期的指標（1-2週間）

- [ ] 全6言語がGPTレビューでAPPROVEDを取得
- [ ] 核心要件がすべて満たされている
- [ ] 禁止フレーズがすべて削除されている

### 中期的指標（1-3ヶ月）

- [ ] 有料版へのアップグレード率が向上
- [ ] エンゲージメント率が向上
- [ ] ユーザーリテンションが改善

### 長期的指標（3-6ヶ月）

- [ ] ブランド認知度が向上
- [ ] 競合優位性が確立
- [ ] グローバル展開が加速

---

## 参考資料

### 設計ドキュメント

1. **Grok × Gemini 最適化分析ログ**
   - `output/grok-gemini-optimization-2026-01-26T02-22-26-013Z.md`

2. **GPTネイティブ設計書**
   - `output/gpt-native-design-2026-01-26T02-29-35-581Z.md`

3. **無料版の実装例**
   - `services/telegram/messages/user/{lang}/minimal-high-quality.{lang}.js`

### レビュー結果の保存先

- `output/gpt-final-check-all-regular-{timestamp}.md`

---

## まとめ

このマニュアルに従って作業を進めることで、有料版（Regular Briefing）のブラッシュアップを効率的に実施できます。

**重要なポイント**:
1. 核心要件に集中する（4つの要件を常に意識）
2. GPTレビューを活用する（迷走を防ぐ）
3. 1言語ずつ丁寧に修正する（全体を一度に修正しない）
4. 設計ドキュメントを常に参照する（推測で進めない）

**成功の鍵**:
- 無料版で実証されたアプローチを有料版にも適用
- 核心要件を満たすことに集中
- 細かい微調整は後回しにする

---

**最終更新**: 2026-01-26  
**バージョン**: 1.0
