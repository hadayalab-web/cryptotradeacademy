# Trap Defence Phase 3 実装計画

**作成日**: 2026-02-13  
**目的**: snapshot-native intelligence OS への完全移行

---

## 1. Phase 3 実装計画

### 1.1 全体ゴール

Phase 3 で Trap Defence OS を以下にアップグレードする:

- **snapshot-driven** → **snapshot-native intelligence OS**
- 全テンプレートを snapshot-first に書き換え
- 全 reasoning を snapshot から導出
- AI 出力を snapshot に統合
- Stage 5 (Gemini) / Stage 6 (Dr.Grok) を snapshotBuilder パイプラインに組み込み

### 1.2 実装順序（推奨）

| 順序 | タスク | 依存 | 工数目安 |
|------|--------|------|----------|
| 1 | btcSnapshot スキーマ拡張（meta, marketRegime） | - | 小 |
| 2 | computeDivergenceSignal 実装 | cqDeep 拡張済み | 中 |
| 3 | computeMarketRegime 実装 | - | 中 |
| 4 | trapDetection リファinement（whaleRatio, SOPR, NUPL 等） | 2 | 中 |
| 5 | formatMinimalBriefing(snapshot, lang) 書き換え | 1 | 中 |
| 6 | formatTrapAlertFromSnapshot(snapshot, lang) 書き換え | 1 | 小 |
| 7 | formatRegularBriefing(snapshot, lang) 書き換え | 1 | 大 |
| 8 | Stage 5 (Gemini) snapshotBuilder 統合 | - | 小 |
| 9 | Stage 6 (Dr.Grok) snapshotBuilder 統合 | - | 中 |
| 10 | cron.js: snapshotBuilder パイプライン再構成 | 2–9 | 大 |
| 11 | BWE deep snapshot alignment | 2, 3, 4 | 小 |
| 12 | アーキテクチャドキュメント更新 | 1–11 | 小 |
| 13 | scripts モック snapshot 更新（sample-output-*.js 等） | 1–12 | 小 |

---

## 2. ファイル別変更一覧

### 2.1 スキーマ・ロジック（新規・拡張）

| ファイル | 種別 | 変更内容 |
|----------|------|----------|
| `services/snapshot/btcSnapshotSchema.js` | 拡張 | `meta`, `marketRegime` を buildFullSnapshot に追加。snapshotToDbRow に `market_regime` 対応。 |
| `logic/divergence/computeDivergenceSignal.js` | **新規** | `computeDivergenceSignal(snapshot, lastSnapshot)`。whaleRatio, funding, openInterest, liquidity, sentiment flip, volatility を入力に `{ divergenceLevel, reasons, confidence }` を返す。 |
| `logic/regime/computeMarketRegime.js` | **新規** | `computeMarketRegime(snapshot)`。whale-driven, retail-fomo, high-volatility, low-volatility, liquidity-vacuum, miner-capitulation, neutral を判定。 |
| `logic/core/trapDetector.js` | 拡張 | whaleRatio, minerFlows, SOPR, SOPR30d, NUPL, liquidity, derivatives unwind を入力に trapDetection を強化。`reasons` 配列を追加。 |

### 2.2 テンプレート（snapshot-native 書き換え）

| ファイル | 種別 | 変更内容 |
|----------|------|----------|
| `services/telegram/messages/user/en/minimal-high-quality.en.js` | 書き換え | `formatMinimalBriefing(snapshot, lang)` のみ受け取る。snapshot.raw, market_score, trapDetection.trapScore, cqDeep.whaleRatio, meta.watch を参照。 |
| `services/telegram/messages/user/*/minimal-high-quality.*.js` | 同様 | 6 言語分（en, es, pt-br, ar, ja, ko） |
| `services/telegram/messages/user/en/emergency.en.js` | 書き換え | `formatTrapAlertFromSnapshot(snapshot, lang)` を追加。既存 `formatTrapAlert` は内部で snapshot からマッピングして呼ぶ。 |
| `services/telegram/messages/user/*/emergency.*.js` | 同様 | 6 言語分 |
| `services/telegram/messages/user/en/regular.en.js` | 書き換え | `formatRegularBriefing(snapshot, lang, { psychologicalSupport })`。snapshot 全フィールドを参照。 psychologicalSupport はオプションで言語ループ内注入。 |
| `services/telegram/messages/user/*/regular.*.js` | 同様 | 6 言語分（EN 完成後、他 5 言語を一気に揃える） |

### 2.3 SnapshotBuilder・Cron

| ファイル | 種別 | 変更内容 |
|----------|------|----------|
| `services/snapshot/snapshotBuilder.js` | **新規** | Stage 1–6 のパイプライン。Stage 5: generateSosovalueStyleArticle → sosovalueArticle。Stage 6: drGrok.base のみ（言語非依存）。言語別は cron 言語ループ内で diagnoseUserSentimentCompat を呼び psychologicalSupport として注入。 |
| `api/cron.js` | リファクタ | snapshotBuilder を呼び、Stage 5/6 をパイプラインに統合。buildFullSnapshot 前に computeDivergenceSignal, computeMarketRegime を呼び、divergenceSignal, marketRegime をマージ。Regular ループ内で diagnoseUserSentimentCompat を呼び formatRegularBriefing(snapshot, lang, { psychologicalSupport }) に渡す。Email は snapshot からアダプタで既存 formatRegularBriefingHTML に渡す。 |

### 2.4 BWE

| ファイル | 種別 | 変更内容 |
|----------|------|----------|
| `services/ai/gpt5mini.js` | 拡張 | marketStateNote に snapshot.marketRegime, divergenceSignal.divergenceLevel, trapDetection.trapSeverity, xSentiment.whaleBias, xSentiment.retailFomo を追加。軽量・堅牢を維持。 |

### 2.5 呼び出し側（minimal-tg-delivery, cron）

| ファイル | 種別 | 変更内容 |
|----------|------|----------|
| `api/minimal-tg-delivery.js` | 変更 | mapSnapshotToMinimalPayload を廃止し、snapshot をそのまま `formatMinimalBriefing(snapshot, lang)` に渡す。 |
| `api/cron.js` | 変更 | Regular ループ内で `formatRegularBriefing(btcSnapshot, targetLang)`、Emergency で `formatTrapAlertFromSnapshot(btcSnapshot, targetLang)` を呼ぶ。 |

### 2.6 ドキュメント

| ファイル | 種別 | 変更内容 |
|----------|------|----------|
| `docs/TRAP_DEFENCE_UNIFIED_OS_ARCHITECTURE.md` | 更新 | Phase 3 の snapshot-native フロー、Stage 5/6、computeDivergenceSignal、computeMarketRegime、trapDetection リファinement を反映。 |

---

## 3. 正式採用方針（Q1–Q5）

### Q1. Dr.Grok（Stage 6）の言語扱い

**結論**: snapshot には言語非依存の「ベース分析」のみを持たせる。言語別の心理サポートは cron の言語ループ内で生成する。

**具体方針**:
- `snapshot.drGrok` は `base`（言語非依存の構造）のみ保持。
- Telegram Regular 配信時は、各言語ループ内で `diagnoseUserSentimentCompat(snapshot, lang)` を呼び、その結果を `formatRegularBriefing(snapshot, lang, { psychologicalSupport })` のような追加オプションとして渡す。
- snapshot は構造と状態の「土台」。言語別の心理テキストは「配信直前に注入するレイヤー」として扱う。

---

### Q2. formatRegularBriefingHTML（Email）の扱い

**結論**: Phase 3 では Telegram を優先し、Email はアダプタでつなぐ。Email の snapshot-native 化は Phase 4 に回す。

**具体方針**:
- `formatRegularBriefingHTML(snapshot, lang)` にはまだ移行しない。
- cron 側で snapshot から既存シグネチャに必要な値を取り出し、既存の `formatRegularBriefingHTML(...)` に渡すアダプタを用意する。
- Phase 3 のリスクを抑えつつ、Telegram 側の snapshot-native 化を最優先で完了させる。

---

### Q3. scripts（sample-output-*.js 等）の扱い

**結論**: Phase 3 完了後に、モック snapshot を使う形で一括更新する。

**具体方針**:
- `formatRegularBriefing`, `formatMinimalBriefing` を呼ぶサンプルは、legacy 引数ではなく、モックの snapshot オブジェクトを組み立てて `formatX(snapshot, lang)` を呼ぶように変更する。
- Phase 3 の後半タスクとして扱う。

---

### Q4. computeDivergenceSignal と既存 divergenceDetector の関係

**結論**: `computeDivergenceSignal(snapshot, lastSnapshot)` は新しい高レベル要約レイヤーとして実装する。既存 divergenceDetector は trapDetection 内部で継続利用する。

**具体方針**:
- 入力: snapshot / lastSnapshot から whaleRatio, funding, OI, liquidity, sentiment flip, volatility, price change を抽出
- 出力: `{ divergenceLevel, reasons, confidence }`
- 用途: テンプレート（Regular / Minimal / Emergency）、BWE の marketStateNote
- 既存 high-resolution divergence ロジックは trapDetection 内部で継続利用
- **低レイヤー**: 既存 divergenceDetector / **高レイヤー**: computeDivergenceSignal（人間・テンプレート・BWE 向け要約）

---

### Q5. 段階的移行か一括移行か（6 言語テンプレート）

**結論**: EN をリファレンスとして先に snapshot-native 化し、その EN をベースに他 5 言語を一気に揃える。

**具体方針**:
1. まず EN の formatMinimalBriefing, formatRegularBriefing, formatTrapAlertFromSnapshot を snapshot-native で完成させる。
2. EN 実装を「構造の正解」として固定し、ES / PT-BR / AR / JA / KO は EN の構造をコピーしつつ、文言だけ各言語に合わせて調整する。
3. 「EN だけ新・他言語は旧」という状態は作らず、EN 完成 → 他 5 言語を短期間で一気に揃える。

---

### 追加の明示（2026-02-13）

- **Dr.Grok**: snapshot にベース構造のみ保持。言語別は配信直前注入の二層構造。
- **Email**: Phase 3 ではアダプタ対応に留め、Telegram を最優先で snapshot-native 化。
- **divergenceSignal**: テンプレート・BWE 向けの高レベル要約として新規実装。既存 divergenceDetector は trapDetection 内部で継続利用。
- **テンプレート**: EN を基準にし、他 5 言語は EN 構造を踏襲して一気に揃える。

---

## 4. スキーマ拡張（btcSnapshot）

```js
// buildFullSnapshot に追加
meta: { watch: boolean, standbyBreak: boolean }  // deliveryModeEvaluator から注入
marketRegime: string  // computeMarketRegime の結果
divergenceSignal: { divergenceLevel, reasons, confidence }  // computeDivergenceSignal の結果（既存も拡張）

// trapDetection 拡張
trapDetection: {
  trapScore, trapSeverity, trapType,
  reasons: string[],  // 新規
  confidence  // 既存または拡張
}
```

---

## 5. 次のアクション

1. ~~Q1–Q5 について方針を決定~~ → **正式採用済み**  
2. 順序 1 から実装を開始する  
3. 各タスク完了ごとに単体検証を行う  
4.  scripts のモック snapshot 更新は Phase 3 後半タスク

---

## 6. リスク・注意点

- **後方互換性**: formatRegularBriefing 等のシグネチャ変更により、cron 以外の呼び出し元（scripts, email 等）で不整合が発生する可能性がある。段階的移行とアダプタの活用で対処。
- **Dr.Grok コスト**: 6 言語 × 1 回ずつの Grok 呼び出しは現状と同程度。snapshot に全言語分を保持する場合は、1 回の cron で 6 回呼ぶ現状と変わらない。
- **テスト**: 各テンプレートについて、モック snapshot での出力確認が必須。
