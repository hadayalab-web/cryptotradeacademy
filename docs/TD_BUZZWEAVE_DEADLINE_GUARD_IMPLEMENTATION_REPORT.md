# TD BuzzWeave Engine Deadline Guard 実装レビュー報告書

実施日: 2026-02-12  
対象ファイル: `services/td/buzzWeaveEngine.js`

---

## 1. 実装目的

`/api/buzzweave-run` が Vercel `maxDuration: 60s` を超過しないよう、実行時間上限ガードを導入し、途中打ち切り時も部分進行できる構造へ改善する。

---

## 2. 実装内容

## 2.1 `runBuzzWeaveCycle` に deadline 制御を追加

- 追加仕様:
  - `deadlineMs` を導入（デフォルト `55000`）
  - 関数先頭で `startMs = Date.now()` を保持
- 追加ガード（deadline超過時は warn + 途中結果返却）:
  - `collectBuzzCandidates` 実行前
  - `X 投稿直前`（`postQuoteTweet` の直前）
- 返却強化:
  - `deadlineExceeded` フラグを応答に含める
  - 超過時は `message` で段階を明示

## 2.2 候補収集ロジックの高速化

- `BUZZWEAVE_MAX_TARGETS` を導入（デフォルト `12`）
- `collectBuzzCandidates` は「十分な候補」で早期終了
  - `BUZZWEAVE_ENOUGH_CANDIDATES`（デフォルト `24`）
- GPT分類を上位N件へ制限
  - `BUZZWEAVE_GPT_CLASSIFY_TOP_N`（デフォルト `10`）
- 分類前ガード追加:
  - `before-gpt-classification-loop` で deadline 超過チェック
- 分類ループ中の超過時:
  - 途中までの結果を返し、残りはフォールバック文脈で補完して「部分進行」を維持

## 2.3 追加環境変数

- `BUZZWEAVE_DEADLINE_MS`（既定 `55000`）
- `BUZZWEAVE_MAX_TARGETS`（既定 `12`）
- `BUZZWEAVE_GPT_CLASSIFY_TOP_N`（既定 `10`）
- `BUZZWEAVE_ENOUGH_CANDIDATES`（既定 `24`）

---

## 3. 要件対応表

| 要件 | 実装結果 |
|---|---|
| `runBuzzWeaveCycle` に `deadlineMs`（default 55000） | ✅ 対応 |
| 先頭で `start = Date.now()` | ✅ 対応（`startMs`） |
| 重い処理ブロック前の deadline ガード | ✅ 対応 |
| `collectBuzzCandidates` 前ガード | ✅ 対応 |
| GPT分類ループ前ガード | ✅ 対応 |
| X投稿直前ガード | ✅ 対応 |
| 期限超過時 warn ログ + 現時点結果返却 | ✅ 対応 |
| `BUZZWEAVE_MAX_TARGETS` default 12 | ✅ 対応 |
| 十分候補で即終了 | ✅ 対応 |
| GPT分類を上位N件に限定 | ✅ 対応（default 10） |

---

## 4. 検証結果

## 4.1 構文・Lint

- `node -c services/td/buzzWeaveEngine.js`: ✅ OK
- Lint: ✅ エラーなし

## 4.2 dry-run 実測

- 実行: `runBuzzWeaveCycle({ dryRun: true })`
- 結果:
  - `elapsedMs: 10835`
  - `deadlineExceeded: false`
  - candidate summary:
    - `maxTargets: 12`
    - `rawCandidates: 24`
    - `candidates: 10`
    - `earlyExitEnoughCandidates: true`

判定: **60秒制約に対して十分な余裕で完了**

---

## 5. 影響範囲と留意点

- 変更は `services/td/buzzWeaveEngine.js` のみ。
- 候補抽出対象を意図的に絞るため、精度と速度のトレードオフが発生。
- 必要に応じて以下で調整可能:
  - `BUZZWEAVE_MAX_TARGETS` を増減
  - `BUZZWEAVE_GPT_CLASSIFY_TOP_N` を増減
  - `BUZZWEAVE_DEADLINE_MS` を運用環境に合わせ調整

---

## 6. 結論

BuzzWeave Engine は deadline guard と候補収集最適化により、  
`/api/buzzweave-run` の 504 リスクを大幅に低減しつつ、途中打ち切り時も部分進行できる挙動を獲得した。  
「400投稿モード」運用の安定性向上に有効な実装である。

