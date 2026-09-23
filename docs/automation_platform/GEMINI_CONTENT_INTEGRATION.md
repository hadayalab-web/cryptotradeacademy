# Geminiコンテンツ（USP2）統合実装

**作成日**: 2026-01-13  
**目的**: 有料版のTelegramメッセージにGemini番組プロデューサー（テキストベース）のコンテンツを統合

---

## 🎯 実装概要

`produceShow`関数で生成されるテキストベースのGeminiコンテンツを、有料版のTelegramメッセージに統合しました。

### 実装内容

1. **テンプレート側の拡張** (`regular.en.js`)
   - `formatRegularBriefing`関数に`showContent`パラメータを追加
   - `showContent`がある場合、以下のセクションを表示：
     - **Story Arc (Opening)**: 物語の円環を開く（問題の提示）
     - **Data Presentation**: 市場分析（問題の可視化）
     - **Analysis**: Trap Defense戦略（計画の提示）
     - **Avoid Failure**: 回避したい失敗
     - **Success Ending**: 成功する結末 + Key Idea

2. **cron.js側の統合**
   - `produceShow`の結果を`showContent`として取得
   - `showContent`がある場合、メッセージを再生成して`showContent`を渡す
   - 最初の`formatRegularBriefing`呼び出しでも`showContent: null`を明示的に渡す

---

## 📋 表示されるコンテンツ

### Story Arc (Opening)
```
📖 【Story Arc】Opening
━━━━━━━━━━━━━━━━━━━━
You want to protect your capital, but traps are everywhere. [問題の説明]
```

### Data Presentation
```
📊 【Data Presentation】Market Analysis
━━━━━━━━━━━━━━━━━━━━
[市場のトラップや問題の可視化]
```

### Analysis (Trap Defense Strategy)
```
🛡️ 【Analysis】Trap Defense Strategy
━━━━━━━━━━━━━━━━━━━━
Step 1: Recognize the trap. Step 2: Standby (70% waiting strategy)...
💡 Key Idea: 70% of the time, do nothing...
```

### Avoid Failure
```
⚠️ 【Avoid Failure】
━━━━━━━━━━━━━━━━━━━━
Losing capital by falling into traps. Making emotional decisions...
```

### Success Ending
```
✅ 【Success Ending】
━━━━━━━━━━━━━━━━━━━━
Become a disciplined trader who protects capital...
💡 Key Idea: 70% of the time, do nothing. Defend until clear advantage emerges.
```

---

## 🔧 技術的詳細

### データ構造

`showContent`オブジェクトの構造：
```javascript
{
  script: {
    hero: { desire: string },
    villain: {
      external: { description: string },
      internal: { blocks: array },
      philosophical: string
    },
    guide: { name: string, empathy: string, authority: string },
    plan: { process: string, promise: string },
    callToAction: { direct: string, transitional: string },
    failureToAvoid: string,
    successEnding: string
  },
  opening: {
    narrative: string,
    problem: string
  },
  dataPresentation: {
    cryptoQuantData: object,
    problemVisualization: string
  },
  analysis: {
    trapDefenseEngine: { process: string, promise: string },
    gptMentalTrainer: string
  },
  commentary: {
    mentalBlocks: object,
    drGrok: object
  },
  callToAction: {
    avoidFailure: string,
    successEnding: string,
    cta: object
  },
  narrativeArc: {
    open: string,
    close: string
  },
  keyIdea: string
}
```

### 実装ファイル

- `cryptosignal-ai/services/telegram/messages/user/en/regular.en.js`
  - `formatRegularBriefing`関数に`showContent`パラメータを追加
  - `showContent`を表示するセクションを追加

- `cryptosignal-ai/api/cron.js`
  - `produceShow`の結果を`showContent`として取得
  - `showContent`がある場合、メッセージを再生成

---

## ✅ 実装完了項目

- [x] `formatRegularBriefing`に`showContent`パラメータを追加
- [x] テンプレート側で`showContent`を表示するセクションを追加
- [x] `cron.js`で`showContent`を`formatRegularBriefing`に渡す
- [ ] 多言語テンプレートにも同様の変更を適用（後日実装）

---

## 🎨 ユーザー体験への影響

### メリット

1. **ストーリーテリング**: StoryBrand 2.0フレームワークに基づいた物語構造で、ユーザーが自分の状況を理解しやすくなる
2. **明確な戦略**: Trap Defense戦略が段階的に説明される
3. **心理的サポート**: 失敗を回避し、成功する結末への道筋が示される
4. **Key Ideaの強調**: 「70%の時間、何もしない」という核となる概念が繰り返し強調される

### 期待される効果

- **エンゲージメント向上**: 物語構造により、ユーザーがメッセージを最後まで読む可能性が高まる
- **理解度向上**: 段階的な説明により、Trap Defense戦略の理解が深まる
- **コンバージョン率向上**: 成功する結末への道筋が明確になることで、有料版への興味が高まる

---

## 📝 注意事項

1. **後方互換性**: `hasGeminiContent`パラメータは残しており、画像・動画版との互換性を維持
2. **エラーハンドリング**: `produceShow`が`null`を返した場合、`showContent`は`null`のままメッセージが生成される（エラーは発生しない）
3. **多言語対応**: 現在は英語版のみ実装。他の言語（JA, ES, AR, KO, PT-BR）にも同様の変更を適用する必要がある

---

## 🚀 次のステップ

1. **テスト配信**: CEOにテスト配信して、メッセージの表示を確認
2. **フィードバック収集**: ユーザー体験への影響を評価
3. **多言語対応**: 他の言語テンプレートにも同様の変更を適用
4. **最適化**: フィードバックに基づいて、コンテンツの表示順序や内容を最適化

---

**状態**: ✅ 実装完了（英語版）、テスト待ち
