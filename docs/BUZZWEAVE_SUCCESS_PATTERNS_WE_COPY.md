# BuzzWeave：パクる成功パターン（SSOT）

**方針**: 憶測で積み上げない。仕手Botが実績で使っている語彙・フォーマットを観察して**そのまま検索とリプライに使う**。

出典: `docs/COPILOT_REPORT_SHITEI_BOT_*_X_2026.md`（Copilot リサーチ）および既存 `SHITESHI_BOT_EXPLOIT_LEVERS.md`。

---

## 1. 仕手Botが使っている語（検索・リプライで使う）

### EN（英語）

| 種別 | フレーズ（レポート実例） |
|------|--------------------------|
| 煽り・主張 | "1000% profit guaranteed!", "Next 100x gem!", "Don't miss out!", "Going to the moon!", "Buy now!", "Join the action!", "Retweet to win!" |
| 希少・FOMO | "Limited time only!", "VIP access for early birds!", "Last chance!" |
| 検索で必ず含める | pump, moon, 100x, don't miss, last chance, buy now, VIP, early birds, gem, to the moon |

→ リプライの一行目で同じ語を mirror すると「同じ文脈」に乗れる（例: "Yeah, 100x gets attention. Before you jump — one structure check."）。

### JA（日本語）

- 急騰・乗り遅れるな・今すぐ・最後のチャンス・100倍・月まで・買え・絶対上がる・逃すな
- 養分・靴磨き・エアドロ・爆益・銘柄・アルト

### KO（韓国語）

- 가즈아(行くぞ)・떡상(急騰)・김프・구조대・지금 사세요・마지막 기회・100배

### ES / PT / AR

- 各 Copilot レポートの「よく使う語」を `SEARCH_KEYWORDS_BY_LANG` とリプライの mirror 候補に揃える。

---

## 2. やること（実装）

- **検索**: `SEARCH_KEYWORDS_BY_LANG` に上記フレーズを**外さず**入れる（既に入っていれば維持）。
- **リプライ**: 対象投稿に上記の語が含まれるとき、その語を **mirrorWords** として優先し、一行目で使う（`pqtSecretWeapons` で「Bot 語彙優先」）。
- **余計な条件を増やさない**: 上記は「成功パターンのパクり」だけ。新たなスコア・フィルタは増やさない。

---

## 3. やらないこと

- 仕手Botを「検出して除外」しない。**利用する**だけ。
- 成功していない仮説でロジックを増やさない。観察された語彙のパクりに留める。
