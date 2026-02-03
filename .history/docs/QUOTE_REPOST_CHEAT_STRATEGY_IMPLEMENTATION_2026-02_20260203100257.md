# 引用リポスト チート戦略 実装記録

**日付**: 2026-02-03  
**参照**: Grok & Gemini 分析 (`QUOTE_REPOST_CHEAT_STRATEGY_2026-02-03`) + レビュー評価

## 実装済み施策

### 1. ヘッドラインに絵文字追加（Grokプロンプト）

**ファイル**: `services/salesLetterContest.js` — `buildGrokOnlyPrompt`

- HEADLINE パートに「Add 1 relevant emoji (e.g. 🔴) for visual emphasis where it fits naturally」を追加
- 視認性向上・初期エンゲージメント向上を狙う

### 2. 反論処理を2文に圧縮（Grokプロンプト）

**ファイル**: `services/salesLetterContest.js` — `buildGrokOnlyPrompt`

- OBJECTION HANDLING を「One short paragraph」から「Exactly 2 short sentences. Be concise.」に変更
- 例文を追加: `"Expensive? 1-day trial, risk zero. Code defend50 for 50% off."`
- 決断疲れ軽減・完読率向上

### 3. ハッシュタグ3個厳選（Grokプロンプト）

**ファイル**: `services/salesLetterContest.js` — `buildGrokOnlyPrompt`

- 従来: 「Add 1–2 more if they fit」→ 新: 「Use exactly 3 hashtags: #BTC #TrapDefence and 1 more (e.g. #Crypto). Do not exceed 3.」
- スパムフラグ回避・検索インプレ最適化

### 4. リンクブロックに「推奨」ラベル追加（6言語）

**ファイル**: `services/salesLetterContest.js` — `LINK_BLOCK_GROK_STYLE`

無料登録リンクに「👇推奨」系ラベルを追加:

| 言語 | 変更後ラベル |
|------|-------------|
| ja | 👇【推奨】無料登録はこちら（カード不要・すぐにお試しいただけます） |
| en | 👇 Recommended: Free sign-up here (no card required) |
| es | 👇 Recomendado: Registro gratis aquí (sin tarjeta) |
| pt-br | 👇 Recomendado: Cadastro grátis aqui (sem cartão) |
| ar | 👇 موصى به: تسجيل مجاني هنا (بدون بطاقة) |
| ko | 👇 추천: 무료 가입 여기 (카드 불필요) |

- 思考停止中のユーザーに「まずここ」を明示し、クリック率向上を狙う

## 未実装（検証・慎重検討対象）

- **長さ250文字短縮**: CVRとのトレードオフ要計測
- **リンク順入れ替え**（無料最優先）: ファネル設計の変更となるため A/B 検証後に検討
- **具体的損失額例示**（-$2,500等）: 規制・表現リスク
- **セルフリプライ自動化**: Xポリシー違反リスク
- **緊急性誇張**（「残り4時間」等）: 信頼毀損リスク

## 次ステップ

1. 1〜2週間 A/B テストでインプレッション・CTR・CVR を計測
2. 効果が認められた施策を本格適用
3. リンク順・長さ短縮は計測結果を踏まえて段階的に検証
