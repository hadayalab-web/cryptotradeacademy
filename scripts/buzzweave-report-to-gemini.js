#!/usr/bin/env node
/**
 * BuzzWeave 現状を Gemini（CMO）に報告し、「成果ゼロのうえで現状で回してよいか」を確認する。
 * 【Gemini CMO 役割は終了】通常運用では使わない。必要時のみ手動実行。→ docs/BUZZWEAVE_GEMINI_CMO_ENDED.md
 * 実行: node scripts/buzzweave-report-to-gemini.js
 * 出力: docs/ai-analysis-results/BUZZWEAVE_CMO_REPORT_CONFIRM_YYYY-MM-DDTHH-mm-ss.md
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-pro-preview";

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY が設定されていません");
  process.exit(1);
}

const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);

const REPORT_AND_QUESTION = `
## CSO/CTO から CMO への報告

あなたは当社の **CMO** です。私は **CSO/CTO**（Cursor 上の AI）です。

### 伝えたいこと（3 点）

1. **Gemini（CMO）推奨の実装を完了したことを報告する。** 以下、すべて実装済みである。

2. **あなたが以前に推奨した戦略と実装では成果がゼロだったことを、こちらはしっかり認識している。** リプライのインプレ・CTR・成約に繋がる改善はこれまで出ていなかった。その事実を踏まえたうえで、次の一点を伝えたい。

3. **今回完了した新しい実装で成果が得られることを期待する。** 同じ CMO 推奨であっても、実装の出そろい方・パラメータ・Cron 設計が前回と異なる。この状態で運用を回し、結果を見る。

---

### 実装完了サマリ（CMO 推奨に基づく）

- **Cron**: 4 本に分割。en 15 分毎、asia/latam 30 分毎（region で ja/ko, es/pt を UTC で選択）、ar 60 分毎。
- **検索**: 6 言語のキーワード拡張（en: gem, alpha, dyor, $SOL, $ETH 等 / ja: エアドロ, 爆益, 銘柄 等 / ko: 가즈아, 떡상 等 / ar: $BTC, $ETH, $SOL, تداول, توصية）。AR は BUZZWEAVE_AR_INFLUENCER_IDS があれば from:userId 検索を追加。
- **インプレスコア**: velocity 0.5, freshness 0.3, conversation/repost 0.1, author_reach 0.3（Gemini 推奨値）。HYPE_BOOST 0.5, CTR_BOOST 0.9（CopyFit 優先）。
- **言語別品質フィルター**: en は min 1000 フォロワー・5 リプ、ja は min 3000 フォロワー、ko は 20 分以内の投稿のみ、ar は min 1000 フォロワー・3 リプ。es/pt は条件なし（量優先）。
- **EN A/B**: 緊急性（fear）vs 権威性（authority）を 50/50 で出し分け。UTM（utm_source=twitter_bot, utm_lang, utm_content）付与でテンプレート別 CTR 計測可能。
- **時間窓**: ja 30 分、ar 90 分。LOW_VOLUME_LANGS は ar, ko のみ。

以上、実装完了の報告と、過去の成果ゼロの認識・新実装への期待を伝える。
`;

async function callGemini(prompt) {
  const model = geminiClient.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
  });
  const result = await model.generateContent(prompt);
  const text = result.response?.text?.() ?? "";
  return { text, usage: result.response?.usageMetadata ?? {} };
}

async function main() {
  console.log("📤 Gemini（CMO）に現状報告と確認を送信中...\n");

  const role = "You are the CMO of a product that parasitizes pump/bot hype posts on X with reply CTAs. Your counterpart is the CSO/CTO (Cursor AI). You are receiving a report that (1) your recommended implementation is complete, (2) the client acknowledges that previous strategy/implementation produced zero results, and (3) they expect results from this new implementation. Acknowledge briefly in Japanese; if you have one short recommendation or caveat, add it. Otherwise a simple acknowledgment is enough.";

  let response;
  try {
    response = await callGemini(`${role}\n\n${REPORT_AND_QUESTION}`);
    console.log("   ✅ CMO 回答を取得しました");
  } catch (e) {
    console.error("   ❌ 失敗:", e.message);
    process.exit(1);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "..", "docs", "ai-analysis-results");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `BUZZWEAVE_CMO_REPORT_CONFIRM_${ts}.md`);

  const md = `# BuzzWeave：CMO への報告（実装完了・過去成果ゼロの認識・新実装への期待）

**作成日時**: ${new Date().toISOString()}
**モデル**: ${GEMINI_MODEL}

---

## 1. CSO/CTO からの報告（送信内容）

${REPORT_AND_QUESTION.trim()}

---

## 2. CMO の回答

${response.text || "—"}

---

*scripts/buzzweave-report-to-gemini.js で生成*
`;

  fs.writeFileSync(outPath, md, "utf8");
  console.log(`\n✅ 保存しました: ${outPath}`);
  return { outPath, response };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { main, REPORT_AND_QUESTION };
