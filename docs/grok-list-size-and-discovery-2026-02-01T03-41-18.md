# Grok と打ち合わせ: リスト必要数・発見可能数

**実行日時**: 2026-02-01T03:41:18.563Z
**モデル**: grok-4-1-fast-reasoning

---

## 質問

- **A)** リストはどれくらいあればいいか（言語別・合計）。目標: 1日あたり約128件の引用リポスト、約64万インプレッション。
- **B)** Grok で現実的にどれくらいの username が発見できるか（言語別）。
- **C)** 言語別の最小/最大件数、リストの更新頻度の推奨。

---

## Grok の回答

- **LIST_SIZE_RECOMMENDATION**: Per language: 150-200 usernames (allows ~20-25 quote reposts/day/language via 4-5 runs/day, picking 1 tweet/influencer/run; supports 7-10 day rotation without daily repeats on same 10 influencers, ensuring variety). Total for 6 languages: 900-1,200 usernames (150-200 x 6).
- **DISCOVERABLE_BY_GROK**: en: 300-500 (abundant); es: 40-70; pt-br: 50-90; ar: 15-35 (fewest); ja: 40-70; ko: 50-80. These are estimates of notable, active crypto/BTC influencers (10k+ followers, regular posts) from public knowledge; all real usernames verifiable via X API.
- **PRIORITY_LANGUAGES**: 1. en (highest volume/impact), 2. pt-br & ko (strong crypto adoption), 3. ja & es, 4. ar (build list slower due to scarcity).
- **REFRESH_RECOMMENDATION**: Every 2 weeks (add 20-30 new per language from emerging influencers; drop any with <1 tweet/week or <5k followers via your X API checks); re-run full verification quarterly.
