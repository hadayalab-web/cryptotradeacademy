# 🎯 SSOT Trap Defense BTC - 最終実装計画（COO最終判断）

**作成日**: 2026-01-10  
**作成者**: COO（Cursor/Composer）  
**承認者**: CEO（Cursor/人間）  
**ベース**: GPT（CTO/CPO）最適化案 + SSOT Trap Defense BTC完全準拠

---

## 📋 エグゼクティブサマリー

GPT（CTO/CPO）からの2つの最適化案（GPT/Grokモデル最適化、CryptoQuantエンドポイント最適化）を統合し、SSOT Trap Defense BTCの完全実装に向けた最終実装計画を策定しました。

**総合判断**: SSOTの要件を100%満たすため、段階的な実装アプローチを採用。優先度の高い項目から順次実装し、品質とコスト効率のバランスを最適化します。

---

## 🎯 実装計画の全体像

### Phase 1: 緊急修正（今週中）
SSOT完全準拠を阻害する致命的な問題を解決

### Phase 2: モデル最適化（今月中）
GPT/Grokモデルの用途別分割と最適化

### Phase 3: CryptoQuant最適化（今月中）
エンドポイント呼び出しの集約・キャッシュ・レート制限

### Phase 4: SSOT完全準拠（来月）
統一品質ゲート、用語統一、BUY/SELL完全削除

---

## 📊 Phase 1: 緊急修正（今週中）

### 1.1 api/cron.jsの未定義変数・スコープ問題の修正

**問題**: GPT（CTO/CPO）が指摘した致命的なバグ
- `trapAlert` が生成前に参照されている
- `shouldCallGrok` が未定義
- `trapDetection / marketBugDetection / psychologicalSupport / divergenceSignalResult` のスコープ問題

**対応**:
- 変数の宣言順序とスコープを修正
- すべての変数を適切なスコープで宣言
- 未定義変数の参照を排除

**優先度**: 🔴 最高（本番事故要因）

---

### 1.2 統一品質ゲートの実装

**問題**: SSOT要件「trapScore>=60 & multipleDivergences>=3」が実装されていない

**対応**:
- `logic/core/signalQualityGate.js` を作成
- `generateTrapAlert()` の返却を最終ゲートにし、`alert=true` はこの条件を満たした場合のみ
- 満たさない場合は必ず `STANDBY` を返す
- `api/cron.js` 側では「trapAlertだけ」を見て配信/EMERGENCY判定する

**優先度**: 🔴 最高（SSOTの核心要件）

---

### 1.3 用語統一: BUG_STANDBY → TRAP_STANDBY

**問題**: SSOTで「Trap Detection→Trap Defense」「BUG→TRAP」に統一済みだが、コードに残存

**対応**:
- `api/cron.js` の正規化ロジックを修正
- `psychologicalSupport.js` の文言を修正
- テンプレ（全6言語）を修正

**優先度**: 🔴 最高（SSOT準拠）

---

### 1.4 BUY/SELLの内部残骸を撤去

**問題**: `evaluateDivergenceSignalHighResolution()` が BUY/SELL を返している

**対応**:
- `evaluateDivergenceSignalHighResolution()` の返却 `signal` を `AVOID_LONG/AVOID_SHORT/STANDBY` に置き換える
- または外部に露出しないよう型を分離
- `divergenceSignal` という名前で BUY/SELL が紛れ込むのを防止

**優先度**: 🔴 最高（SSOTの「完全削除」要件）

---

## 📊 Phase 2: GPT/Grokモデル最適化（今月中）

### 2.1 用途別モデル環境変数の分割

**対応**:
- `services/gpt/client.js` を用途別モデルに分割:
  - `GPT_MODEL_SUMMARY`（前処理・要約）: `gpt-4o-mini`
  - `GPT_MODEL_ANALYSIS`（統合推論）: `gpt-4o`
  - `GPT_MODEL_GATE`（最終判定・品質ゲート）: `gpt-5.2-2025-12-11`
- `services/grok/client.js` を用途別モデルに分割:
  - `GROK_MODEL_MARKET`（定期市場分析）: `grok-4-0709`
  - `GROK_MODEL_MARKET_EMERGENCY`（緊急市場分析）: `grok-4-1-fast-reasoning`
  - `GROK_MODEL_X_LIVE`（Xリアルタイム）: `grok-4-1-fast-reasoning`
  - `GROK_MODEL_HIGH_RES`（高解像度）: `grok-4-1-fast-reasoning`

**開発環境**:
- `APP_ENV=development` 時はすべてハイエンドモデルを使用
- `APP_ENV=production` 時は用途別モデルを使用

**優先度**: 🟡 高（SSOT準拠の品質向上）

---

### 2.2 出力をJSON SSOTフォーマットへ

**対応**:
- 出力を文章ではなく構造化（JSON）に寄せる
- 必須フィールド:
  - `trapScore`: 0-100
  - `multipleDivergences`: 数値
  - `onchainScore`: 数値
  - `socialScore`: 数値
  - `timeWindowConsistency`: boolean
  - `recommendation`: "AVOID_LONG" | "AVOID_SHORT" | "STANDBY"
  - `confidence`: 0-1
  - `reasoning`: 文字列（根拠）
- 文章生成はそのJSONをレンダリングするだけにする（多言語も同様）

**優先度**: 🟡 高（SSOT準拠の精度/確度向上）

---

## 📊 Phase 3: CryptoQuantエンドポイント最適化（今月中）

### 3.1 404エンドポイントの機能フラグ化

**対応**:
- 起動時に一度だけ "capability check" して結果をキャッシュ
- 環境変数で機能フラグ化:
  - `CRYPTOQUANT_FEATURE_LIQUIDATIONS=false`（404が発生している場合）
  - `CRYPTOQUANT_FEATURE_NUPL=false`（404が発生している場合）
- 以降は機能フラグで呼ばない

**優先度**: 🟡 高（コスト削減・レート制限対策）

---

### 3.2 getCQSnapshot()集約関数の作成

**対応**:
- `services/cryptoquant/snapshot.js` を作成
- `getCQSnapshot({windows, includeDeep})` 関数を実装
- 内部で重複なく取得:
  - windowごとのnetflow/mpi
  - deep metrics（whale ratio, sopr, nupl…）
- `api/cron.js` での個別呼び出しを `getCQSnapshot()` に統合

**優先度**: 🟡 高（重複排除・パフォーマンス向上）

---

### 3.3 キャッシュ導入

**対応**:
- Upstash Redis / Vercel KV で `endpoint+params` キャッシュ
- day/window=day&limit=1 系: TTL 2〜6時間（cron周期に合わせる）
- hour/4hour 系: TTL 5〜15分（Premium時のみ）
- stale-while-revalidate を採用

**優先度**: 🟡 高（コスト削減・パフォーマンス向上）

---

### 3.4 分散レート制限の実装

**対応**:
- Upstash Redis / Vercel KV でトークンバケット or 固定窓を実装
- Professionalは concurrency=1 を基本にする
- `p-limit` 等で `concurrency=1`（Professional）/ `2〜3`（Premium以上）に可変

**優先度**: 🟡 高（レート制限対策）

---

## 📊 Phase 4: SSOT完全準拠（来月）

### 4.1 EMERGENCY/WATCH/STANDBY_BREAKトリガーのSSOT準拠

**対応**:
- EMERGENCY: `trapScore>60` 基準を中心に再実装
- liquidations>$500M の即時トリガーを実装（Binance等の代替ソースも検討）
- KO市場: kimchiPremium>8% のトリガーを実装

**優先度**: 🟢 中（SSOT準拠）

---

### 4.2 価格テーブルと6デプロイ構成のコード反映

**対応**:
- `config/pricing.js` を作成（SSOT直結の定数）
- 全言語テンプレが参照する形にする
- SSOTの最終価格を確定（v2.2/v2.3の矛盾を解決）

**優先度**: 🟢 中（SSOT準拠）

---

## 🎯 GPT（CTO/CPO）からの追加オファー対応

GPT（CTO/CPO）は以下の詳細実装指示を提供する用意があると表明：

1. **`getCQSnapshot()`のインターフェース案（戻り値スキーマ）**
2. **KVキャッシュキー設計**
3. **分散レート制限の疑似コード（Upstash前提）**

**対応**: Phase 3実装時に、GPT（CTO/CPO）に詳細実装指示を依頼し、実装に反映する。

---

## 📋 実装優先順位マトリクス

| Phase | 項目 | 優先度 | 期間 | SSOT準拠 |
|-------|------|--------|------|----------|
| Phase 1 | api/cron.jsの未定義変数修正 | 🔴 最高 | 今週 | 必須 |
| Phase 1 | 統一品質ゲート実装 | 🔴 最高 | 今週 | 必須 |
| Phase 1 | 用語統一（BUG→TRAP） | 🔴 最高 | 今週 | 必須 |
| Phase 1 | BUY/SELL完全削除 | 🔴 最高 | 今週 | 必須 |
| Phase 2 | 用途別モデル分割 | 🟡 高 | 今月 | 推奨 |
| Phase 2 | JSON SSOTフォーマット | 🟡 高 | 今月 | 推奨 |
| Phase 3 | 404エンドポイント削除 | 🟡 高 | 今月 | 推奨 |
| Phase 3 | getCQSnapshot()作成 | 🟡 高 | 今月 | 推奨 |
| Phase 3 | キャッシュ導入 | 🟡 高 | 今月 | 推奨 |
| Phase 3 | 分散レート制限 | 🟡 高 | 今月 | 推奨 |
| Phase 4 | EMERGENCYトリガー準拠 | 🟢 中 | 来月 | 推奨 |
| Phase 4 | 価格テーブル反映 | 🟢 中 | 来月 | 推奨 |

---

## 🎯 最終判断サマリー（COO）

### 承認事項

1. **Phase 1（緊急修正）**: 今週中に完了
   - api/cron.jsの未定義変数修正
   - 統一品質ゲート実装
   - 用語統一（BUG→TRAP）
   - BUY/SELL完全削除

2. **Phase 2（モデル最適化）**: 今月中に完了
   - 用途別モデル環境変数の分割
   - JSON SSOTフォーマットへの移行

3. **Phase 3（CryptoQuant最適化）**: 今月中に完了
   - 404エンドポイントの機能フラグ化
   - getCQSnapshot()集約関数の作成
   - キャッシュ導入
   - 分散レート制限の実装

4. **Phase 4（SSOT完全準拠）**: 来月中に完了
   - EMERGENCY/WATCH/STANDBY_BREAKトリガーのSSOT準拠
   - 価格テーブルと6デプロイ構成のコード反映

5. **GPT（CTO/CPO）からの追加オファー**: Phase 3実装時に詳細実装指示を依頼

### 実装方針

- **段階的実装**: 優先度の高い項目から順次実装
- **SSOT準拠優先**: SSOTの要件を100%満たすことを最優先
- **品質とコストのバランス**: 開発環境はハイエンド、本番環境は用途別モデルで最適化
- **堅牢性重視**: エラーハンドリング、フォールバック、レート制限対策を徹底

---

## 📝 次のアクション

1. CEO（Cursor/人間）の承認を待つ
2. 承認後、Phase 1から順次実装を開始
3. 各Phase完了時にGPT（CTO/CPO）にレビューを依頼
4. SSOT完全準拠を確認後、本番デプロイ

---

**作成者**: COO（Cursor/Composer）  
**承認待ち**: CEO（Cursor/人間）
