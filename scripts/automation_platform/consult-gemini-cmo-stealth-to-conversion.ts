// scripts/consult-gemini-cmo-stealth-to-conversion.ts
// Gemini CMO（gemini-3-flash-preview）に初回ステルス投稿からWhopコンバージョンまでの最適な方法を相談

import { callGemini3Pro } from '../api/unified-api.js';
import { join, dirname } from 'path';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function consultGeminiCMO() {
  console.log('📢 Gemini CMO（gemini-3-flash-preview）に相談中...\n');
  console.log('相談内容: 初回のステルス投稿からWhopでコンバージョンさせるまでの最適な方法\n');

  const prompt = `あなたはGemini: CMO（gemini-3-flash-preview）です。Trap Defence BTCのマーケティング戦略とコンバージョン最適化の専門家として、以下の課題について詳細な戦略を提案してください。

## 📋 課題

**初回のステルス投稿からWhopでコンバージョンさせるまでの最適な方法**

### 現状のワークフロー

1. **VSL1投稿**（1日2回: 9時・21時 UTC）
   - Telegram MINIMALチャンネル（EN）にVSL1を自動投稿
   - YouTubeリンク: https://youtu.be/zdLFYwFJQd4
   - メッセージ: "Two traders started with the same capital..." ストーリー型

2. **ユーザーがVSL1を見る**
   - VSL1を見て興味を持ったユーザー

3. **Botコマンド**（@TrapDefenceBot /start minimal）
   - 無料版ユーザーとして登録
   - 参加日時（joinedAt）を記録

4. **48時間経過**

5. **VSL2自動配信**（1時間ごとにチェック）
   - 48時間経過した無料版ユーザーにVSL2を自動送信
   - YouTubeリンク: https://youtu.be/vjz896hTPPw
   - クーポンコード: DEFEND50（50%オフ）

6. **ユーザーがVSL2を見る**

7. **Whopページへアクセス**
   - URL: https://whop.com/aio-media-llc/trap-defense-btc-en/
   - クーポンコード付きリンク

8. **コンバージョン**

### 懸念事項

- **スパム判定のリスク**: 初回のステルス投稿でVSLはスパム扱いされないか？
- **オプトイン率**: VSL1から無料版へのオプトイン率を最大化したい
- **コンバージョン率**: 無料版から有料版へのコンバージョン率を最大化したい

### 制約条件

- **プラットフォーム**: Telegram（X/Twitterは将来実装予定）
- **予算**: 最小限のコストで最大の効果
- **自動化**: 可能な限り自動化したい
- **スパム対策**: スパム判定を避けたい

## 🎯 依頼内容

以下の観点から、**初回のステルス投稿からWhopでコンバージョンさせるまでの最適な方法**を提案してください：

### 1. 初回投稿戦略

- **VSL1投稿 vs 価値提供型投稿**: どちらが最適か？
- **投稿頻度**: 初回はどのくらいの頻度が適切か？
- **投稿タイミング**: 最適な投稿時間は？
- **スパム対策**: スパム判定を避けるための具体的な方法

### 2. オプトイン誘導戦略

- **VSL1からのオプトイン率を最大化する方法**
- **価値提供型投稿からのオプトイン率を最大化する方法**
- **CTA（Call to Action）の最適化**
- **心理的トリガーの活用**

### 3. 48時間待機期間の戦略

- **48時間待機期間の最適性**: もっと短い/長い方が良いか？
- **待機期間中のエンゲージメント**: 無料版ユーザーとの接点をどう保つか？
- **リマインド戦略**: 必要に応じてリマインドを送るべきか？

### 4. VSL2配信戦略

- **VSL2配信のタイミング**: 48時間後が最適か？
- **VSL2メッセージの最適化**: コンバージョン率を最大化するメッセージ
- **クーポンコード戦略**: DEFEND50（50%オフ）が最適か？

### 5. Whopコンバージョン戦略

- **Whopページへの誘導方法**: リンクの配置、メッセージの最適化
- **ランディングページの最適化**: Whopページでコンバージョン率を最大化する方法
- **フォローアップ戦略**: コンバージョンしなかったユーザーへの対応

### 6. 全体最適化戦略

- **ファネル全体の最適化**: 各ステップのコンバージョン率を最大化する方法
- **A/Bテスト戦略**: どの要素をテストすべきか？
- **データ分析**: どのメトリクスを追跡すべきか？

## 📊 期待される成果

- **オプトイン率**: VSL1/価値提供型投稿から無料版へのオプトイン率を最大化
- **コンバージョン率**: 無料版から有料版へのコンバージョン率を最大化
- **スパムリスク**: スパム判定のリスクを最小化
- **ROI**: 最小限のコストで最大の効果

## 💡 回答形式

以下の形式で回答してください：

1. **初回投稿戦略**（推奨アプローチ、理由、実装方法）
2. **オプトイン誘導戦略**（具体的な方法、CTA最適化）
3. **48時間待機期間戦略**（最適な期間、エンゲージメント方法）
4. **VSL2配信戦略**（タイミング、メッセージ最適化）
5. **Whopコンバージョン戦略**（誘導方法、ランディングページ最適化）
6. **全体最適化戦略**（ファネル最適化、A/Bテスト、データ分析）
7. **実装優先順位**（どの順番で実装すべきか）
8. **期待される成果**（各ステップでの期待されるコンバージョン率）

マーケティングの専門家として、データドリブンで実践的な戦略を提案してください。`;

  try {
    console.log('📡 Gemini CMO API呼び出し中...\n');
    const result = await callGemini3Pro(prompt, {
      temperature: 0.7,
      maxOutputTokens: 8000,
      thinkingLevel: 'high',
    });

    console.log('✅ Gemini CMOからの回答を受領\n');
    console.log('='.repeat(80));
    console.log('📊 Gemini CMOの提案:');
    console.log('='.repeat(80));
    console.log(result.text);
    console.log('='.repeat(80));

    // 結果をファイルに保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputPath = join(__dirname, '..', 'docs', `GEMINI_CMO_STEALTH_TO_CONVERSION_STRATEGY_${timestamp}.md`);
    
    const output = `# Gemini CMO提案: 初回ステルス投稿からWhopコンバージョンまでの最適な方法

**作成日**: ${new Date().toISOString()}  
**相談者**: COO（Cursor/Composer 1）  
**回答者**: Gemini CMO（gemini-3-flash-preview）

---

## 📋 相談内容

**初回のステルス投稿からWhopでコンバージョンさせるまでの最適な方法**

### 現状のワークフロー

1. VSL1投稿（1日2回: 9時・21時 UTC）
2. ユーザーがVSL1を見る
3. Botコマンド（@TrapDefenceBot /start minimal）
4. 48時間経過
5. VSL2自動配信（1時間ごとにチェック）
6. ユーザーがVSL2を見る
7. Whopページへアクセス
8. コンバージョン

### 懸念事項

- スパム判定のリスク
- オプトイン率の最大化
- コンバージョン率の最大化

---

## 🎯 Gemini CMOの提案

${result.text || result}

---

**作成者**: Gemini CMO（gemini-3-flash-preview）  
**状態**: ✅ **提案完了**
`;

    writeFileSync(outputPath, output, 'utf8');
    console.log(`\n✅ 結果を保存しました: ${outputPath}`);

    return result;
  } catch (error) {
    console.error('❌ Gemini CMOへの相談エラー:', error.message);
    throw error;
  }
}

consultGeminiCMO()
  .then(() => {
    console.log('\n✅ Gemini CMO相談完了');
  })
  .catch(error => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
