# /api/cron 300秒タイムアウトの分解解説

`/api/cron` は **15分ごと** に実行され、**maxDuration: 300秒** の制限があります。  
処理が「CryptoQuant 取得 → GPT 解析 → Grok 解析 → 配信」と**直列＋多言語ループ**で積み重なるため、定期枠（isRegularSlot）時に 300 秒を超えやすくなります。

---

## 1. 全体の流れ（どこで時間がかかるか）

```
[0s] 開始
  ↓
[〜30s] 1. オンチェーン・価格・閾値判定
  ↓
[〜60s] 2. GPT（条件付き） / Grok（X解析）
  ↓
[〜120s] 3. 定期枠のみ: CQ深掘り + 高解像度
  ↓
[〜180s] 4. 定期枠のみ: GPT詳細解析 + Grok再実行 + トラップ検出
  ↓
[〜300s+] 5. 6言語ループ: Dr.Grok + Gemini統合 + produceShow + Telegram送信  ← ここで溢れる
  ↓
[その後] 6. Minimal Version 配信 / X投稿 / 緊急配信  ← 到達前に 504
```

---

## 2. 処理の内訳（重い順）

### 2.1 データ取得（CryptoQuant まわり）

| 処理 | いつ実行 | 目安時間 | 内容 |
|------|----------|----------|------|
| `fetchCQData()` | 毎回 | 5〜15s | Exchange Inflow + MPI（リトライ付き 2 本） |
| `fetchPriceData()` | 毎回 | 5〜15s | BTC価格 + Fear&Greed |
| `getHighResolutionCQData()` | **定期枠のみ** | 20〜60s | 高解像度 CQ（複数窓・Whale Ratio 等） |
| `getCQDeepMetrics()` | **定期枠のみ** | 10〜40s | 深掘り（trapScore, whaleFlows 等）、highRes を渡して再利用 |
| KO 市場時: Upbit/為替 | 定期枠・KO 時 | 5〜10s | fetchBTCKRWPrice, fetchUSDKRWRate |

- 定期枠では「基本 2 本 ＋ 高解像度 ＋ 深掘り」が**直列**に近い形で走り、**合計 40〜140 秒**程度になり得る。

---

### 2.2 外部 API（GPT / Grok / Gemini）

| 処理 | いつ実行 | 目安時間 | 内容 |
|------|----------|----------|------|
| `analyzeCryptoQuantData()` | 15分監視・閾値超え時 | 10〜30s | 緊急用 GPT（CQ 解析・シグナル判定） |
| `analyzeXSentimentHighResolutionCompat()` | needsXIntel 時（定期 or 監視） | 15〜45s | Grok による X 高解像度解析（1 回目） |
| `generateCryptoQuantAnalysis()` | **定期枠のみ** | 20〜60s | 定期配信用 GPT（1 言語分を生成） |
| `analyzeXSentimentHighResolutionCompat()` | **定期枠のみ（2 回目）** | 15〜45s | 定期用 Grok X 解析 |
| `detectTrapDetection()` / `generateTrapAlert()` | 定期枠のみ | 1〜5s | トラップ検出（重いのは上記 API） |
| **6言語ループ内（各言語）** | | | |
| `diagnoseUserSentimentCompat()` | 定期枠・各言語 | 10〜25s × 6 | Dr.Grok 心理診断 |
| `integrateGrokGeminiOptimization()` | 定期枠・各言語 | 15〜40s × 6 | Grok×Gemini 統合最適化 |
| `produceShow()` | 定期枠・各言語 | 15〜35s × 6 | Gemini 番組プロデューサー（ストーリーブランド） |
| `sendMessageToChannel()` | 定期枠・各言語 | 2〜8s × 6 | Telegram 送信 |

- 定期枠の「6 言語ループ」だけで、**Dr.Grok + 統合最適化 + produceShow** が **6 回ずつ** 走るため、**約 240〜600 秒** になり得る。
- ここが 300 秒を超える**最大の要因**。

---

### 2.3 配信・その他

| 処理 | いつ実行 | 目安時間 | 内容 |
|------|----------|----------|------|
| `calculateMissedOpportunities()` | 定期枠 | 5〜15s | 見逃し機会計算（1 回） |
| `generateNonUserImpactReport()` | 定期枠・各言語 | 5〜15s × 6 | 非ユーザー影響レポート |
| `postMinimalVersionToX()` | 定期枠 & force 時 | 30〜90s | 無料版 6 言語の X スレッド投稿 |
| `postFreeReportToX()` | 同上 | 10〜30s | 無料レポート X 投稿 |
| EMERGENCY 配信 | トリガー時 | 20〜60s | 緊急用メッセージ・Telegram |

- 7-A MINIMAL / 7-B EMERGENCY / X 投稿は、**6 言語ループの後**に実行されるため、  
  ループで 300 秒を超えると **504 で打ち切られ、これらの処理に到達しない**。

---

## 3. なぜ 300 秒で終わらないか（要約）

1. **CryptoQuant**  
   基本 2 本は軽いが、定期枠で「高解像度 ＋ 深掘り」が加わり **40〜140 秒** 程度かかる。
2. **GPT**  
   緊急用 1 回 ＋ 定期用 1 回で **30〜90 秒**。
3. **Grok**  
   X 解析が 1 回〜2 回で **30〜90 秒**。
4. **6 言語ループ**  
   各言語で **Dr.Grok + Grok×Gemini 統合 + Gemini produceShow + Telegram** が走り、  
   1 言語あたり **約 40〜100 秒 × 6 ＝ 240〜600 秒** と、**ここだけで 300 秒を超える**。
5. **Minimal / X / 緊急**  
   上記の「後ろ」に並んでいるため、ループが長引くと **実行されず 504** になる。

---

## 4. 改善の方向性（参考）

- **実行時刻の分散（時間ずらし）**  
  → 有効な Cron のみ実行分をずらしている。詳細は [timeout-avoidance-schedule.md](./timeout-avoidance-schedule.md)（無料版TG・有料版TG・引用リポストのみ）。
- **無料版（Minimal Version）**  
  → すでに **専用 Cron（`/api/x-post-minimal-version`）** で 1 日 1 回・120 秒枠に分離済み。cron が 504 でも Minimal は配信される。
- **cron の 504 を減らす**  
  - 6 言語ループの「1 回の cron でやる量」を減らす（例: 言語ごとに別 API に分割し、cron は「どの言語を送るか」だけ決めてキック）。  
  - または **Dr.Grok / 統合最適化 / produceShow** を「全言語共通 1 回」にし、文言だけ言語別テンプレで差し替える。  
  - または **並列度を上げる**（同時 2 言語など）。Vercel の 300 秒制限は変わらないので、「300 秒以内に収まる仕事量に落とす」ことが必要。
- **CryptoQuant**  
  定期枠でも「高解像度 or 深掘りどちらか」にするとか、キャッシュを効かせて 1 実行あたりの呼び出しを減らすと、序盤の 40〜140 秒を削れる。

---

*このドキュメントは `api/cron.js` の処理フローに基づいて作成した、300 秒タイムアウトの分解解説です。*
