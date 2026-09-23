# GPT CFOによる改修後シミュレーションモデルの仕様

**作成日時**: 2026-01-13T00:57:22.405Z  
**作成者**: GPT CFO（gpt-5-2-2025-12-11）  
**目的**: 解像度の高いKPI達成確度シミュレーションモデル

---

## 📊 改修後モデルの仕様

以下は、Trap Defence BTCのCFOとして「経営判断に耐える」ことを目的に、**改修後のモンテカルロ・シミュレーションモデル仕様**を、**数式＋疑似コード＋TypeScript実装仕様＋具体パラメータ（Base/Upside/Downside）**まで落とし込んだものです。  
（注：ここでの数値は“初期キャリブレーション値”です。運用開始後、週次で事後分布更新＝再推定する前提で設計しています。）

---

## 0. モデルの全体像（前提）

- 1日単位で「市場別にリスト収集 → CVR生成 → CVを離散化 → 合算」を行う。
- **停止日（BAN/凍結/配信停止）**が発生した日はCV=0（または劣化）。
- **市場別に供給上限（cap）**を持つ（CSO見解：EN以外は50〜80が現実的）。
- **リスト数とCVRに負の相関**（量を取りに行くほど質が落ちる）を導入。
- CVは**Binomial(N, p)**で離散化（N=リスト数、p=CVR）。  
  ※CVRが小さくNが大きいときはPoisson近似も可能だが、上限がNであること・市場別上限が小さめであることからBinomialを標準採用。

---

# 1. 改修後モデル仕様（数式 / 疑似コード）

## 1.1 Phase定義（Phase 0–4）

Phaseは「運用成熟度」として扱い、以下を変化させる：

- リスト収集分布の平均・分散（改善で平均↑、分散↓）
- CVR分布（平均↑、分散↓）
- 停止日確率（改善で↓）
- 劣化日確率（改善で↓）
- 相関（改善で負の相関が弱まる＝品質管理が効く）

> 実務上は Phase を「週次/隔週で評価して更新」し、Phaseごとにパラメータを持つ。

---

## 1.2 市場集合と日次プロセス

市場 \( m \in \{EN, AR, KO, JA, ES, PTBR\} \)

日 \( t \) の市場別リスト数：
\[
L_{m,t} = \min(\text{cap}_{m}, \; \lfloor X_{m,t} \rceil )
\]
ここで \(X_{m,t}\) は **Gamma** もしくは **LogNormal**。実装容易性と右裾表現の安定性から、初期はGamma推奨：

- **Gamma分布**（推奨）
\[
X_{m,t} \sim \text{Gamma}(k_{m}, \theta_{m})
\]
平均 \( \mu = k\theta \)、分散 \( \sigma^2 = k\theta^2 \)

- **LogNormal分布**（代替）
\[
X_{m,t} \sim \text{LogNormal}(\mu_{LN,m}, \sigma_{LN,m})
\]

---

## 1.3 CVR分布（Beta）と負の相関の導入

市場別CVR（停止日でない場合）：
\[
p_{m,t} \sim \text{Beta}(\alpha_{m,t}, \beta_{m,t})
\]

**負の相関（リスト数↑ → CVR↓）**は、独立サンプルではなく、共通の潜在変数 \(Z\) を介して実装します。

### 実装方法（推奨：Gaussian copula + rank link）
1) 相関付き正規を生成：
\[
\begin{pmatrix} Z_L \\ Z_P \end{pmatrix} \sim \mathcal{N}\left(
\begin{pmatrix}0\\0\end{pmatrix},
\begin{pmatrix}1 & \rho\\ \rho & 1\end{pmatrix}
\right), \quad \rho < 0
\]

2) 正規CDFで一様へ：
\[
U_L = \Phi(Z_L), \quad U_P = \Phi(Z_P)
\]

3) 一様から分布へ写像：
- リスト数： \(X = F^{-1}_{Gamma}(U_L; k,\theta)\)
- CVR： \(p = F^{-1}_{Beta}(U_P; \alpha,\beta)\)

これにより、**リスト数とCVRにSpearman/順位相関として負の関係**が入り、極端値も自然に表現できます。

---

## 1.4 停止日（ゼロ化）と劣化日（degraded）

Phaseごとに以下を持つ：

- 停止日確率 \(p_{\text{stop,phase}}\)
- 劣化日確率 \(p_{\text{degraded,phase}}\)
- 劣化倍率 \(d \in (0,1)\)（例：CVR×0.6、リスト×0.8など）

日次で：
- stopなら：全市場CV=0（または市場別停止でも可。初期は“全停止”で保守的）
- degradedなら：CVR平均を下げる（またはBetaの有効サンプルサイズを下げ分散を増やす）

疑似コード：
```text
stop ~ Bernoulli(p_stop[phase])
if stop: CV_total = 0; return

degraded ~ Bernoulli(p_degraded[phase])
for market m:
  (Z_L, Z_P) ~ N(0, Σ(ρ_phase))
  U_L=Φ(Z_L), U_P=Φ(Z_P)
  L = min(cap[m], round(GammaInv(U_L; k[m], θ[m])))
  p = BetaInv(U_P; α[m], β[m])
  if degraded: p = clamp(p * degradeCvrMultiplier[phase], 0, 1)
  CV_m ~ Binomial(n=L, p=p)
CV_total = Σ CV_m
```

---

## 1.5 CVの離散化（Binomial/Poisson）

- 標準：  
\[
CV_{m,t} \sim \text{Binomial}(n=L_{m,t}, p=p_{m,t})
\]
- 近似（任意）：Nが大きくpが小さい場合  
\[
CV_{m,t} \sim \text{Poisson}(\lambda=L_{m,t}\cdot p_{m,t})
\]
**本件は市場別capが小さめなのでBinomialを推奨**（上限がnで自然）。

---

## 1.6 ファネル分解（到達→返信→商談→決済）

CVRを1つで持たず、以下に分解可能（Phaseが進むほど精緻化）：

\[
p_{m} = p^{reach}_{m}\cdot p^{reply}_{m}\cdot p^{meet}_{m}\cdot p^{pay}_{m}
\]

各要素をBetaで持ち、合成して最終CVRにする：
- \(p^{reach}\sim Beta(\alpha,\beta)\) …配信到達率（BAN/制限の影響）
- \(p^{reply}\sim Beta(\alpha,\beta)\) …返信率（コピー/ターゲティング）
- \(p^{meet}\sim Beta(\alpha,\beta)\) …商談化率（オペ品質）
- \(p^{pay}\sim Beta(\alpha,\beta)\) …決済率（商品/価格/信頼）

**初期実装は「最終CVR Beta」＋停止/劣化で十分**。Phase 3以降で分解モデルへ移行を推奨。

---

# 2. Base/Upside/Downside：具体パラメータ表（市場別）

## 2.1 供給上限（cap）— CSO見解反映

| Market | cap（日次上限） |
|---|---:|
| EN | 260 |
| AR | 70 |
| KO | 60 |
| JA | 60 |
| ES | 70 |
| PT-BR | 80 |
| 合計上限 | 600 |

---

## 2.2 リスト収集分布（Gamma）パラメータ（市場別）

Gammaは「平均 μ」「標準偏差 σ」から変換：
- \(k=(\mu/\sigma)^2\)
- \(\theta=\sigma^2/\mu\)

### Base（合計期待 ≒ 500/日）
| Market | μ_list | σ_list | k | θ |
|---|---:|---:|---:|---:|
| EN | 240 | 35 | 47.0 | 5.11 |
| AR | 60 | 12 | 25.0 | 2.40 |
| KO | 55 | 11 | 25.0 | 2.20 |
| JA | 55 | 11 | 25.0 | 2.20 |
| ES | 55 | 11 | 25.0 | 2.20 |
| PT-BR | 55 | 12 | 21.0 | 2.62 |
| 合計 | 520 |  |  |  |

> capで頭打ちされるため、期待は概ね500近辺に収束（EN以外もcap近辺で抑制）。

### Upside（合計期待 ≒ 600/日）
- ENをcap近辺に寄せ、非ENも上限寄せ（ただし現実的上限内）
| Market | μ_list | σ_list |
|---|---:|---:|
| EN | 260 | 30 |
| AR | 70 | 10 |
| KO | 60 | 9 |
| JA | 60 | 9 |
| ES | 70 | 10 |
| PT-BR | 80 | 10 |

### Downside（合計期待 ≒ 400/日）
| Market | μ_list | σ_list |
|---|---:|---:|
| EN | 190 | 40 |
| AR | 45 | 15 |
| KO | 40 | 14 |
| JA | 40 | 14 |
| ES | 45 | 15 |
| PT-BR | 40 | 15 |

---

## 2.3 CVR分布（Beta）パラメータ（市場別）

Betaは「平均 m」「濃度 s（=α+β）」で表現：
- \(\alpha=m\cdot s\)
- \(\beta=(1-m)\cdot s\)

濃度sが大きいほど日々のブレが小さい（運用が安定）。

### Base（CMO現実：最適化後 全体CVR ≒ 4.5%）
市場別に微差を付け、加重平均が4.5%程度になるよう設定。

| Market | mean CVR m | concentration s | α | β |
|---|---:|---:|---:|---:|
| EN | 0.050 | 220 | 11.0 | 209.0 |
| AR | 0.040 | 180 | 7.2 | 172.8 |
| KO | 0.045 | 200 | 9.0 | 191.0 |
| JA | 0.040 | 200 | 8.0 | 192.0 |
| ES | 0.040 | 180 | 7.2 | 172.8 |
| PT-BR | 0.042 | 180 | 7.56 | 172.44 |

### Upside（全体CVR ≒ 5.5%）
| Market | mean CVR m | concentration s |
|---|---:|---:|
| EN | 0.062 | 240 |
| AR | 0.050 | 200 |
| KO | 0.055 | 220 |
| JA | 0.050 | 220 |
| ES | 0.050 | 200 |
| PT-BR | 0.052 | 200 |

### Downside（全体CVR ≒ 3.5%）
| Market | mean CVR m | concentration s |
|---|---:|---:|
| EN | 0.038 | 160 |
| AR | 0.030 | 140 |
| KO | 0.035 | 140 |
| JA | 0.030 | 140 |
| ES | 0.030 | 140 |
| PT-BR | 0.032 | 140 |

---

## 2.4 停止日確率・劣化日確率・相関（シナリオ別）

| Scenario | p_stop（日次） | p_degraded（日次） | degraded時CVR倍率 | ρ(list, CVR) |
|---|---:|---:|---:|---:|
| Base | 0.020 | 0.060 | 0.70 | -0.35 |
| Upside | 0.010 | 0.040 | 0.80 | -0.20 |
| Downside | 0.035 | 0.090 | 0.60 | -0.50 |

---

## 2.5 期待CV/日 と 30CV/日達成確率（概算設計値）

厳密にはモンテカルロで出しますが、経営議論用に概算を置きます（停止日を期待値で織り込む）：

\[
E[CV] \approx (1-p_{stop}) \cdot \sum_m E[L_m]\cdot E[p_m]\cdot \text{(degraded補正)}
\]

- Base：リスト≈500、CVR≈4.5%、停止2%  
  → 0.98×500×0.045 ≈ **22.1 CV/日**（30未達）
- Upside：リスト≈600、CVR≈5.5%、停止1%  
  → 0.99×600×0.055 ≈ **32.7 CV/日**（30超）
- Downside：リスト≈400、CVR≈3.5%、停止3.5%  
  → 0.965×400×0.035 ≈ **13.5 CV/日**

達成確率（30CV/日）は分散・相関・停止混入で大きく変わるため、**ここでは“目安レンジ”**として置きます（実際はsimulateで確定）：
- Base：**10–25%**
- Upside：**55–75%**
- Downside：**0–5%**

---

# 3. P50/P75での「30CV/日」達成設計（条件設計）

ここは「設計ターゲット」＝逆算の考え方です。  
停止日があるので、停止を織り込んだ必要期待値は：

\[
E[CV \mid \text{稼働}] \ge \frac{30}{1-p_{stop}}
\]

- Base想定 p_stop=2% → 稼働日の必要期待CV ≈ 30.6

## 3.1 P50で30CV/日（中央値で達成）
P50達成は「日次分布の中央値が30以上」。概算として、中央値≒期待値に近い（分散が小さい）状態を作る必要があるため：
- **濃度sを上げる（CVRのブレを減らす）**
- **リストσを下げる**
- **相関の絶対値を弱める（ρを0に近づける）**
- **p_stop/p_degradedを下げる**

### P50達成の設計目標（提案）
- 合計リスト（cap内）目標：**560/日**
- 加重平均CVR目標：**5.6%**
- p_stop上限：**1.5%/日**
- 相関 ρ 下限（悪化しない条件）：**ρ ≥ -0.25**（=負相関は弱め）

市場別の「必要リスト数（目標配分）」例（合計560）：
| Market | target lists |
|---|---:|
| EN | 260 |
| AR | 65 |
| KO | 55 |
| JA | 55 |
| ES | 65 |
| PT-BR | 60 |

市場別「必要CVR（平均）」例（加重で5.6%程度）：
| Market | target mean CVR |
|---|---:|
| EN | 6.2% |
| AR | 5.0% |
| KO | 5.6% |
| JA | 5.0% |
| ES | 5.0% |
| PT-BR | 5.2% |

## 3.2 P75で30CV/日（上位25%ではなく“75%の確率で達成”）
「75%の確率で30以上」＝より保守的。停止・相関・分散をさらに抑える必要。

### P75達成の設計目標（提案）
- 合計リスト目標：**600/日（cap合計）**
- 加重平均CVR目標：**6.0%**
- p_stop上限：**1.0%/日**
- 相関条件：**ρ ≥ -0.15**
- degraded倍率：**0.8以上**（劣化しても落ち幅を小さく）

市場別配分（cap張り付き）：
| Market | target lists |
|---|---:|
| EN | 260 |
| AR | 70 |
| KO | 60 |
| JA | 60 |
| ES | 70 |
| PT-BR | 80 |

市場別CVR目標例：
| Market | target mean CVR |
|---|---:|
| EN | 6.5% |
| AR | 5.3% |
| KO | 6.0% |
| JA | 5.3% |
| ES | 5.3% |
| PT-BR | 5.5% |

> 重要：P75達成は「供給上限に張り付く」ため、**EN以外の上限を増やせない限り、CVR改善と停止率低下が支配的**になります（=CMO/オペ改善が主戦場）。

---

# 4. TypeScript実装可能なコード仕様（関数I/Fと責務）

## 4.1 型定義（例）

```ts
type Market = "EN" | "AR" | "KO" | "JA" | "ES" | "PTBR";
type Phase = "P0" | "P1" | "P2" | "P3" | "P4";
type Scenario = "Base" | "Upside" | "Downside";

type GammaParams = { k: number; theta: number; cap: number };
type BetaParams = { alpha: number; beta: number };

type ScenarioParams = {
  rho: number; // negative
  pStop: Record<Phase, number>;
  pDegraded: Record<Phase, number>;
  degradedCvrMultiplier: Record<Phase, number>;
  listGamma: Record<Phase, Record<Market, GammaParams>>;
  cvrBeta: Record<Phase, Record<Market, BetaParams>>;
};

type DayResult = {
  stop: boolean;
  degraded: boolean;
  byMarket: Record<Market, { lists: number; cvr: number; cv: number }>;
  cvTotal: number;
};

type SimulationResult = {
  days: DayResult[];
  cvDaily: number[];
  p50: number;
  p75: number;
  probAtLeastTarget: number; // e.g. P(CV>=30)
};
```

---

## 4.2 乱数ユーティリティ要件

実装には以下が必要：
- `randUniform()`
- `randNormal()`（Box-Muller等）
- `normCdf(z)`（近似でOK）
- `gammaInv(u,k,theta)`（近似 or ライブラリ利用推奨）
- `betaInv(u,alpha,beta)`（同上）
- `binomial(n,p)`（逐次/BTPE/正規近似など。n<=260程度なら逐次でも可）

**実装現実解**：TypeScript単体で頑張るより、  
- `jstat`（分布のcdf/inv）  
- もしくは `@stdlib` 系  
の採用を推奨（監査可能性・再現性のためseeded RNGも必須）。

---

## 4.3 関数仕様

### simulateListCollection
**目的**：市場×Phaseのリスト数を1日分生成（停止/劣化は別関数で処理）

```ts
function simulateListCollection(args: {
  market: Market;
  phase: Phase;
  scenarioParams: ScenarioParams;
  u: number; // correlated uniform for lists
}): number
```

- 入力：`u` は copulaで生成した `U_L`
- 処理：`x = gammaInv(u; k, theta)` → `lists = round(x)` → `min(cap, max(0, lists))`
- 出力：整数リスト数

---

### simulateCVR
```ts
function simulateCVR(args: {
  market: Market;
  phase: Phase;
  scenarioParams: ScenarioParams;
  u: number; // correlated uniform for CVR
  degraded: boolean;
}): number
```

- `p = betaInv(u; alpha, beta)`
- `if degraded: p *= degradedCvrMultiplier[phase]`
- `return clamp(p, 0, 1)`

---

### simulateStopDay
```ts
function simulateStopDay(args: {
  phase: Phase;
  scenarioParams: ScenarioParams;
  rng: () => number;
}): { stop: boolean; degraded: boolean }
```

- `stop ~ Bernoulli(pStop[phase])`
- `degraded ~ Bernoulli(pDegraded[phase])`（stopならdegradedは無視してよい）

---

### simulateCV
```ts
function simulateCV(args: {
  lists: number;
  cvr: number;
  stop: boolean;
  rng: () => number;
}): number
```

- if stop return 0
- else return `binomial(lists, cvr)`

---

### simulatePhaseImproved
```ts
function simulatePhaseImproved(args: {
  phase: Phase;
  scenario: Scenario;
  scenarioParams: ScenarioParams;
  targetCvPerDay: number; // e.g. 30
  nDays: number;          // e.g. 30 or 60
  nIter: number;          // e.g. 20000
  rngSeed: number;
}): SimulationResult
```

責務：
1) 各iterでnDays分のCVを生成
2) 日次CV配列から、`P50/P75`、`P(CV>=target)`を算出
3) 市場別寄与（lists/cvr/cv）も保存可能（重いのでオプション化推奨）

---

## 4.4 相関（copula）の実装ポイント

相関付き正規の生成（2次元）：
```ts
// Z1 ~ N(0,1), Z2 = rho*Z1 + sqrt(1-rho^2)*E, E~N(0,1)
```
これで相関ρの正規が作れます。  
`U = normCdf(Z)` で一様へ。

---

# 5. 市場別制約（EN以外50–80現実的）の実装

- capは上表の通り固定（またはPhaseで微増させてもよいが、CSO評価を優先し固定推奨）
- リスト分布はGammaで右裾を表現しつつ、**capでクリップ**
- CVRは市場別Beta（ENが最も改善余地/運用資産が多い前提で平均を高めに設定）

---

# 付記：経営判断としての読み方（CFO視点の結論）

- **Base（500/日・4.5%）は期待CVが約22で、30CV/日は構造的に届かない**（停止日がなくても 500×4.5%=22.5）。  
  → 30を「日次KPI」とするなら、Baseは未達が標準で、Upside条件（供給+CVR+停止率低下）が必要。
- **P75で30CV/日**を狙うなら、供給上限が効いているため、**停止率1%以下＋CVR6%近辺**が実質条件。

---

必要なら次に、上記パラメータをそのまま `ScenarioParams` のJSON/TS定数として吐き出し、さらに「Phase 0–4でどう遷移させるか（学習曲線）」まで含めたテンプレ（例：P0→P4でCVR平均+0.3pt/Phase、p_stop -0.3pt/Phase等）も提示します。

---

**作成日時**: 2026-01-13T00:57:22.411Z  
**作成者**: GPT CFO（gpt-5-2-2025-12-11）
