# Xアルゴリズム解析に grok-4-1-fast-reasoning を使う
**作成日**: 2026-01-31

---

## 結論：可能です

**grok-4-1-fast-reasoning** で X（Twitter）アルゴリズムを解析する処理は、このプロジェクト内で **すでに実装されています**。

- **実装**: `services/grok/xAlgorithmAnalyzer.js`
- **モデル**: `GROK_MODEL_X_LIVE = 'grok-4-1-fast-reasoning'`（固定）
- **認証**: 環境変数 **`XAI_API_KEY`** を使用（XAI API 用キー）

---

## どこで使われているか

| 用途 | 呼び出し元 |
|------|------------|
| 引用リポスト・コンテンツ最適化 | `services/x/contentOptimizer.js`（Grok で X アルゴリズム分析） |
| Grok×Gemini 統合最適化 | `services/integrated/grokGeminiOptimizer.js`（analyzeXAlgorithmOptimization） |
| Cron「Xアルゴリズム分析」 | **アルゴリズム分析は Grok（grok-4-1-fast-reasoning）**。`api/x-algorithm-analysis.js` で `analyzeXAlgorithmOptimization` を呼ぶ。Grok が失敗した場合のみ GPT にフォールバック。戦略レポートは従来どおり GPT。 |

---

## 設定

1. **API キー**
   - **`.env` にのみ** 設定してください。チャットやコードに貼り付けないでください。
   - 例: `XAI_API_KEY=xai-...`（XAI のダッシュボードで発行したキー）

2. **オプション**
   - `GROK_MODEL_X_LIVE` でモデルを上書き可能（未設定時は `grok-4-1-fast-reasoning`）。
   - `XAI_BASE_URL` は未設定でよい（デフォルト: `https://api.x.ai/v1`）。

---

## Cron での Grok 利用（反映済み）

`/api/x-algorithm-analysis` の **アルゴリズム分析** は、  
**grok-4-1-fast-reasoning**（`analyzeXAlgorithmOptimization`）を優先して実行するように変更済みです。  
Grok がエラーや null を返した場合のみ、従来どおり GPT（`performAlgorithmAnalysis`）にフォールバックします。  
戦略レポートは従来どおり GPT です。
