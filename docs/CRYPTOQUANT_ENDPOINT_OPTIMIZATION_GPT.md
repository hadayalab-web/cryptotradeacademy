# CryptoQuantエンドポイント最適化案（GPT CTO/CPO）

**レビュー日**: 2026-01-10T11:17:01.968Z
**レビュアー**: GPT（CTO/CPO）
**目的**: CryptoQuantエンドポイント呼び出しの最適化案

---

## 📝 最適化案

以下、CTO兼CPOとして「最終判断」を出します。結論から言うと **“複数エンドポイントを個別に叩く設計自体は妥当”** ですが、現状実装は **(1) 404前提の無駄呼び出し、(2) Vercel Serverless前提のレート制限設計不整合、(3) 同一データの重複取得、(4) キャッシュ/集約レイヤ不足** があり、**最適解ではありません**。  
「バッチ/統合エンドポイントで一発取得」は、CryptoQuant APIの性質上 **基本的に期待しない方がよい**（後述）ため、**“呼び出し回数を減らす”最適化は、バッチAPI探しよりも「集約・キャッシュ・機能フラグ・重複排除・同時実行制御」で達成**するのが正攻法です。

---

## 1) 現在の実装の評価（最終判断）

### 1-1. 複数エンドポイント個別呼び出しは最適か？
- **API構造的に“メトリクスごとにエンドポイントが分かれている”**ため、個別呼び出しは自然です。
- ただし現状は、同一cron内で  
  - basic（netflow/mpi）  
  - deepMetrics（whale ratio, sopr, nupl, etc）  
  - highResolution（netflow/mpiを複数windowで再取得）  
  が並行し、**同じ指標を別モジュールで重複取得**している可能性が高い。ここは最適ではないです。

**判断**: 「個別呼び出し」自体は妥当だが、**“取得設計（集約/重複排除）”が未最適**。

### 1-2. CryptoQuantにバッチ/統合エンドポイントは存在するか？
- CryptoQuantのドキュメント/カタログの設計思想は「**指標カタログ + 指標ごとの時系列取得**」で、一般的に
  - “複数メトリクスを1リクエストでまとめて返す”タイプの **汎用バッチAPIは提供されにくい** です。
- もし存在するとしても限定的（特定カテゴリのまとめ）で、プロダクト要件（複数カテゴリ跨ぎ：exchange flows / flow-indicator / market-indicator / utxo-data / derivatives）を満たす「統合一発」は期待薄。

**判断**: **バッチエンドポイント前提での最適化は筋が悪い**。やるなら「自前集約API（自社側で1回にまとめる）」。

### 1-3. レート制限対策として現在の実装は適切か？
- `highResolution.js` に「client.jsのrate limitingで3秒間隔に制御」とコメントがありますが、提示された `client.js` には **実際のレート制限（キュー/スリープ）が実装されていません**。
- さらにVercel Serverlessは **同時に複数インスタンスが立つ**（cronの重なり、手動叩き、緊急配信など）ため、プロセス内スリープ方式は **分散環境で破綻**します。

**判断**: 現状のレート制限対策は **不十分（実装不在 + 分散非対応）**。

---

## 2) エンドポイント呼び出し最適化（具体策）

### 2-1. Promise.all の活用は適切か？
- **同時実行は、レート制限に余裕がある時だけ有効**です。
- Professional（20 req/min級が一般的）だと、Promise.allで一気に投げると **瞬間的に上限超過**しやすい。
- したがって **「Promise.all」ではなく「同時実行数を絞ったキュー（例: concurrency=1〜2）」**が正解。

**提案**: `p-limit` 等で `concurrency=1`（Professional）/ `2〜3`（Premium以上）に可変。

### 2-2. エンドポイント統合/バッチ化の可能性
- CryptoQuant側でのバッチが薄い前提なので、**自社側で集約**します。
- 具体的には `getCQSnapshot()` のような **“1回呼ぶと必要指標を全部返す”集約関数**を作り、内部で
  - windowごとのnetflow/mpi
  - deep metrics（whale ratio, sopr, nupl…）
  を **重複なく**取得して返す。

**効果**:
- API呼び出し回数そのものは大きく減らせない場合でも、**同一指標の二重取得を確実に潰せる**（これは確実に効く）。

### 2-3. 404が発生しているエンドポイントの削除（重要）
現状コードは「404は期待される」として握りつぶしている箇所がありますが、プロダクト運用としては **“期待される404”を定期ジョブで打ち続けるのはコストとレート枠の無駄**です。

**提案（必須）**:
- `derivatives/liquidations-long/btc`, `derivatives/liquidations-short/btc`, `utxo-data/nupl/btc` など、**カタログで利用可否が確認できない/プランで不可**なものは
  1) 起動時に一度だけ “capability check” して結果をキャッシュ  
  2) 以降は **機能フラグで呼ばない**
- もしくは最初から `CRYPTOQUANT_FEATURE_LIQUIDATIONS=false` のように環境変数でOFF。

**最終判断**: 404前提の呼び出しは **削除が最適解**（“静かに失敗する”は品質面でも悪手）。

---

## 3) レート制限とパフォーマンス

### 3-1. Professionalプランでの「3秒間隔」制御は適切か？
- 理屈としては、20 req/minなら **3秒に1回=20 req/min**で妥当。
- ただし前述の通り **現実装に3秒間隔が存在しない**、かつ **Serverless分散で担保できない**。

**提案（Professionalの正解）**:
- **分散ロック + キュー**
  - Upstash Redis 等で `rate_limit_bucket` を持ち、トークンバケット or 固定窓で制御
  - もしくはVercel KV/Upstashで `SETNX lock` + TTL を使い、同時実行を直列化
- さらに **キャッシュ（後述）**でそもそも叩かない。

### 3-2. Premiumプラン以上での最適化案
- Premiumで hour/4hour が使えるなら、SSOT要件の「複数時間窓分析」は価値が出ます。
- ただし **毎回 hour/4hour/day を全指標で取るのはコスト増**なので、SSOTの目的（トラップ検出）に直結する指標だけを高解像度化する。

**推奨（Premium以上）**:
- 高解像度（hour/4hour/day）対象を **コア2〜3指標に限定**
  - netflow, mpi, whale_ratio（取れるなら）
- その他（SOPR, NUPLなど）は day のみで十分（変化が遅い/ノイズ増）。

### 3-3. キャッシュ戦略（Vercel前提の推奨）
プロダクトの配信が **6時間ごと**で、Professionalは **day解像度**が中心。つまり同じ値を何度も取る必要が薄いです。

**推奨キャッシュ**:
- **CQレスポンスを「endpoint+params」をキーにしてKVキャッシュ**
  - day/window=day&limit=1 系: TTL 2〜6時間（cron周期に合わせる）
  - hour/4hour 系: TTL 5〜15分（Premium時のみ）
- **stale-while-revalidate**（古い値を返しつつ裏で更新）を採用すると、緊急配信時も安定。

---

## 4) SSOT準拠（複数時間窓分析・高解像度トラップ検出・精度/確度）

### 4-1. 「hour,4hour,day」を実現する最適な呼び出し
- 最適解は「**指標×windowの直積を全部取る**」ではなく、
  - **トラップ検出の因果に直結する指標だけ**を multi-timeframe
  - それ以外は day で補助
です。

**SSOTに沿うコア**（例）:
- multi-timeframe: netflow, mpi（+ whale ratioが安定提供されるなら追加）
- dayのみ: SOPR, NUPL など（入手性/安定性が担保できるものだけ）

### 4-2. 「高解像度トラップ検出」を実現するデータ取得
- 高解像度は「データの細かさ」よりも **“整合性（consistency）”と“異常検知の再現性”**が重要。
- そのためには、取得失敗（404/429/一時エラー）を減らし、**同じ指標を同じタイミングで揃える**必要がある。

**提案**:
- 1回のcronで「スナップショット」を作る（同一timestamp基準）
- 指標ごとの欠損は許容するが、欠損理由をメタデータ化（`missing_reason: 'not_supported'|'rate_limited'|'timeout'`）
- trapScoreの品質ゲートに「データ品質（coverage）」を入れる（精度/確度に直結）

### 4-3. 「精度/確度の追求」を実現するエンドポイント選択
- “取れるか分からない指標”を混ぜるほど、スコアが不安定になり品質が落ちます。
- よって **Professionalで確実に取れる指標に絞る**のが、短期の最適。

**最終判断**:
- 404の可能性がある指標を前提にスコア設計するのはSSOTの「統一品質ゲート」と相性が悪い。  
→ **利用可能な指標セットを固定**し、プランが上がったら段階的に追加する。

---

## 5) 実装上の推奨事項（すぐやる順）

### A. まずやる（今週）
1) **404エンドポイントを機能フラグ化して呼ばない**
   - `capabilities`（利用可能エンドポイント一覧）を一度確認して固定
2) **取得の集約（SSOT Snapshot関数）**
   - `getExchangeInflow/getMinerPositionIndex/deepMetrics/highResolution` をバラで呼ぶのをやめ、`getCQSnapshot({windows, includeDeep})` に統合
3) **キャッシュ導入**
   - Upstash Redis / Vercel KV で `endpoint+params` キャッシュ

### B. 次にやる（今月）
4) **分散レート制限**
   - トークンバケット or 固定窓をKVで実装
   - Professionalは concurrency=1 を基本にする
5) **エラーハンドリング標準化**
   - `fetchCryptoQuant`で `status`, `endpoint`, `params`, `retryable` を含む独自Errorを投げる
   - 429/5xxは指数バックオフでリトライ（ただしcronの制限時間に注意）

### C. Premium以降の拡張
6) multi-timeframe対象を最小にして拡張（netflow/mpi中心）
7) 緊急配信条件（liquidations>$500M）をCryptoQuant依存にしない  
   - 取れないならBinance等の代替ソースで実装し、CQは補助にする（SSOTの安定性優先）

---

## 最終結論（COO兼エンジニアへの回答として）
- **「複数エンドポイントを個別に叩く」方針自体はCryptoQuantのAPI設計上妥当**。ただし現状は最適解ではない。  
- 最適化の本丸は「CryptoQuantにバッチがあるか探す」ではなく、**自社側での(1)集約、(2)重複排除、(3)キャッシュ、(4)分散レート制限、(5)404呼び出し停止**。  
- SSOT準拠の観点では、**Professionalではday前提で品質を安定させ、Premium以上で“コア指標のみ”multi-timeframe**に段階拡張するのが、精度/確度とコスト効率の両立に最も適う。

必要なら次のステップとして、こちらで「`getCQSnapshot()`のインターフェース案（戻り値スキーマ）」「KVキャッシュキー設計」「分散レート制限の疑似コード（Upstash前提）」まで落とした実装指示を書きます。

---

## 📊 API使用量

```json
{
  "prompt_tokens": 8836,
  "completion_tokens": 3209,
  "total_tokens": 12045,
  "prompt_tokens_details": {
    "cached_tokens": 0,
    "audio_tokens": 0
  },
  "completion_tokens_details": {
    "reasoning_tokens": 0,
    "audio_tokens": 0,
    "accepted_prediction_tokens": 0,
    "rejected_prediction_tokens": 0
  }
}
```

## 📋 現在の実装状況

- **基本エンドポイント**: Exchange Netflow, MPI
- **深掘りメトリクス**: Whale Ratio, Liquidations, NUPL, SOPR等
- **高解像度データ**: 複数時間窓（hour/4hour/day）でのデータ取得
- **呼び出し方法**: 個別エンドポイントを並列呼び出し（Promise.all）
