# Gemini-3-Flash-Preview Analysis Result

**Generated**: 2026-01-31T03:31:54.411Z
**Model**: gemini-3-flash-preview
**Usage**: 
- Prompt Tokens: 7272
- Candidates Tokens: 1618
- Total Tokens: 9870

---

504 Gateway Timeout（60秒制限）の根本解決に向けた、技術的分析と具体的な修正案を提示します。

### 1. 根本原因の特定

| 行番号（付近） | 処理名 | 原因の詳細 |
| :--- | :--- | :--- |
| **315〜** | `generateQuoteRepostTextWithGrok` | **最大のボトルネック。** Grok (xAI) や Gemini への外部API呼び出しは応答に10〜30秒かかることがあり、これを言語ごと、またはインフルエンサーごとに順次実行すると確実に60秒を超えます。 |
| **218〜310** | `getMinimalVersionContent` | **ファイルI/Oと解析のオーバーヘッド。** `require` による動的テンプレート読み込みと、巨大な正規表現によるテキスト解析をリクエストの度に行うのは非効率です。 |
| **338〜345** | `Promise.allSettled` | **不完全な並列化。** KV取得などは並列化されていますが、その後のメインロジック（LLM生成）が重すぎるため、トータル時間を押し下げられていません。 |
| **全体構造** | 逐次ループ処理 | もし1回のリクエストで複数言語・複数投稿を処理している場合、Vercelの制限内での完結は物理的に不可能です。 |

---

### 2. 優先度付き最適化案

#### 【P0】即座に実装すべき最優先事項
- **1リクエスト1投稿に限定:** 1回のAPI呼び出しで処理するのは「1言語・1インフルエンサー」のみに絞り、呼び出し側（Cron等）で分割する。
- **LLMタイムアウトの設定:** Grok/Geminiの呼び出しに厳格なタイムアウト（例: 25秒）を設定し、失敗時は即座に「固定テンプレート」へフォールバックする。

#### 【P1】構造的改善
- **重い解析処理の事前計算:** `getMinimalVersionContent` の正規表現解析をやめ、データソース（JSON等）から直接値を取得する。
- **動的 `require` の廃止:** 起動時に全言語のテンプレートを読み込んでおく。

#### 【P2】パフォーマンス向上
- **Vercel Edge Config / Cache の利用:** 頻繁に参照する `minimalVersionPostUrl` などをキャッシュし、KVへのアクセス回数を減らす。

---

### 3. 具体的なコード修正案

#### 修正案①：LLM呼び出しのタイムアウトとフォールバックの実装（P0）

```javascript
// 修正前: 外部APIの応答を無限に待機するリスクがある
// const text = await generateQuoteRepostTextWithGrok(...);

// 修正後: タイムアウト付き実行関数の導入
async function withTimeout(promise, ms, fallbackValue) {
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Timeout] Action exceeded ${ms}ms. Using fallback.`);
      resolve(fallbackValue);
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

// generateQuoteRepostTextWithGrok 内での使用例
async function generateQuoteRepostTextWithGrok(lang, influencerTweet, reportData, deadlineMs, langRunId) {
  // ...前処理...

  // LLM生成を25秒で打ち切り、失敗時は固定テンプレートを使用する
  const generatedText = await withTimeout(
    optimizeContentAndFunnel(currentMetrics, marketData, xSentiment, lang), 
    25000, // 25秒制限
    null   // タイムアウト時はnullを返す
  );

  if (!generatedText) {
    // P0: タイムアウト時のフォールバック（収益化リンクを確実に含める）
    return FALLBACK_QUOTE_REPOST_TEMPLATES[lang](
      reportData?.trapScore, 
      reportData?.priceUsd, 
      reportData?.change24h, 
      getTelegramDeepLinkWithSource(lang)
    );
  }
  return generatedText;
}
```

#### 修正案②：重い解析処理の軽量化（P1）

```javascript
// 修正前: 毎回ファイルをrequireし、正規表現で解析している
// const langTemplates = loadUserTemplates(lang);
// const minimalText = formatMinimalBriefing(...);
// const insightMatch = minimalText.match(/.../);

// 修正後: 解析済みのオブジェクトを直接生成するか、キャッシュを利用する
const templateCache = {}; // グローバルスコープで保持

async function getMinimalVersionContent(lang, reportData = null) {
  try {
    // requireのキャッシュ化
    if (!templateCache[lang]) {
      const normalizedLang = lang.toLowerCase().replace('-', '');
      templateCache[lang] = require(`../services/telegram/messages/user/${normalizedLang}/minimal-high-quality.${normalizedLang}`);
    }
    
    // テキストを生成して正規表現でバラすのではなく、
    // reportDataから直接必要な「キーポイント」を抽出するロジックに変更
    return {
      trapScore: reportData?.trapScore || 0,
      insight: reportData?.drGrokInsight || "Market volatility is high.", // 元データから直接取る
      link: getWhopProductUrl(lang)
    };
  } catch (error) {
    return null; 
  }
}
```

---

### 4. 実装の難易度と効果の見積もり

| 対策内容 | 難易度 | 処理時間の短縮見積もり | 期待される効果 |
| :--- | :--- | :--- | :--- |
| **1リクエスト1投稿への制限** | 低 | **30〜40秒削減** | 累積的な遅延を排除し、504をほぼゼロにする |
| **LLM 25秒タイムアウト設定** | 低 | **最大30秒削減** | APIが重い時でも60秒以内に必ずレスポンスを返す |
| **テンプレート読み込みのキャッシュ化** | 中 | **2〜5秒削減** | CPU負荷の軽減とメモリ効率の向上 |
| **正規表現解析の廃止** | 中 | **3〜8秒削減** | 処理の安定化（正規表現のバックトラック問題回避） |

### 結論：今すぐすべきこと
1.  **`/api/x-quote-repost-en` の呼び出しパラメータに `influencer_index` 等を追加**し、1回の実行で1人分しか処理しないようにループを外してください。
2.  `optimizeContentAndFunnel`（LLM呼び出し）に **25秒の `Promise.race` によるタイムアウト**を実装してください。
3.  タイムアウト時に **`FALLBACK_QUOTE_REPOST_TEMPLATES` を返す**ように修正してください。これにより、収益化リンク（Whop）を含む投稿が「最悪の状況でも」実行されるようになります。