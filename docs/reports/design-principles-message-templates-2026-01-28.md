# メッセージテンプレート設計原則

**作成日**: 2026-01-28  
**最終更新**: 2026-01-28  
**設計者**: COO（Cursor/Composer 1）  
**ステータス**: 確立済み

## 概要

今回のリファクタリングで確立したメッセージテンプレートの設計原則とパターンを文書化します。

## 設計原則

### 1. DRY（Don't Repeat Yourself）
- **共通ロジックの抽出**: 重複コードを共通ヘルパー関数に集約
- **統一パターンの確立**: 全言語版で同じパターンを使用
- **メンテナンス性の向上**: 変更は1箇所で済む

### 2. 単一責任の原則
- **`contentFilters.js`**: コンテンツフィルタリング専用
- **各言語版テンプレート**: 言語固有の表示ロジックのみ
- **明確な責務分離**: フィルタリングと表示の分離

### 3. 一貫性の優先
- **統一された実装パターン**: 全言語版で同じアプローチ
- **予測可能な動作**: 同じ入力に対して同じ出力
- **保守性の向上**: コードの理解が容易

### 4. 防御的プログラミング
- **日本語混在の防止**: 複数レイヤーでのチェック
- **フォールバック機能**: エラー時の安全な代替処理
- **型安全性**: 入力検証とエラーハンドリング

## 確立されたパターン

### 共通ヘルパー関数（`contentFilters.js`）

```javascript
// 1. 日本語チェック
hasJapanese(text) → boolean

// 2. 配列からの日本語フィルタリング
filterJapaneseFromArray(items) → string[]

// 3. タイミング情報のクリーンアップ
cleanTimingInfo(timings) → string[]

// 4. psychologicalInsights全体の日本語チェック
hasJapaneseInPsychologicalInsights(insights) → boolean

// 5. バイラルスコアのフォーマット
formatViralScore(score, labels) → {emoji, label, score}
```

### 使用パターン

#### 1. バイラルスコア表示
```javascript
const { emoji, label, score } = formatViralScore(opt.viralPotential, {
  high: '[HIGH]',
  medium: '[MEDIUM]',
  low: '[LOW]'
});
lines.push(`   ${emoji} ${label} Viral Potential Score: ${score}/100`);
```

#### 2. タイミング情報のクリーンアップ
```javascript
const cleanedTimings = cleanTimingInfo(opt.timing);
if (cleanedTimings.length > 0) {
  lines.push(`⏰ Optimal Posting Times: ${cleanedTimings.slice(0, 2).join(', ')}`);
}
```

#### 3. 日本語フィルタリング
```javascript
const englishFactors = filterJapaneseFromArray(opt.viralFactors);
if (englishFactors.length > 0) {
  lines.push(`   📊 Key Factors: ${englishFactors.slice(0, 2).join(', ')}`);
}
```

#### 4. psychologicalInsightsのチェック
```javascript
if (hasJapaneseInPsychologicalInsights(psyInsights)) {
  // フォールバック処理
  // psychologicalSupportを使用
} else {
  // 正常な表示処理
}
```

## 設計の優位性

### 1. 拡張性
- 新しいフィルタリング機能の追加が容易
- 新しい言語版の追加が容易
- 共通ヘルパー関数の拡張で全言語版に反映

### 2. 保守性
- 変更は1箇所で済む
- コードの理解が容易
- デバッグが容易

### 3. 一貫性
- 全言語版で同じパターンを使用
- 予測可能な動作
- 品質の統一

### 4. パフォーマンス
- 関数の再利用によるコードサイズ削減
- 最適化が1箇所で済む

## 今後の方針

### 1. 一貫性の維持
- **原則**: 新しい機能追加時も、このパターンに従う
- **レビュー**: 大きな変更時は、この原則に準拠しているか確認

### 2. 拡張時の考慮事項
- 共通ヘルパー関数の拡張を優先
- 言語固有のロジックは最小限に
- パターンの一貫性を保つ

### 3. 品質保証
- 次回配信時に全言語版を確認
- 問題があれば、このパターンに基づいて修正
- 継続的な改善

## 関連ファイル

- `services/telegram/messages/shared/contentFilters.js` - 共通ヘルパー関数
- `services/telegram/messages/user/*/regular.*.js` - 有料版テンプレート
- `services/telegram/messages/user/*/minimal-high-quality.*.js` - 無料版テンプレート

## メモ

- この設計原則は、今回のリファクタリングで確立された
- 今後の変更は、この原則に従うことで一貫性を保てる
- COO（Cursor/Composer 1）のセンスに統一することで、品質を維持
