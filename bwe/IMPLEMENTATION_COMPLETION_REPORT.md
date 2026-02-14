# BuzzWeave Engine (BWE) 統合完了レポート

作成日: 2026-02-14  
対象: Trap Defence OS 内 BWE 実装（先行実装 + 拡張実装）

---

## 1. エグゼクティブサマリー

本レポートは、以下2フェーズの実装を統合して完了報告するものである。

1. **フェーズA（先行実装）**  
   - BWE Master Blueprint  
   - Algorithm-Drift Blueprint
2. **フェーズB（今回拡張）**  
   - Scaling Curve Blueprint  
   - Multi-Account Network Blueprint  
   - Growth Flywheel Blueprint  
   - Network Topology Blueprint  
   - Media Scaling Blueprint  
   - Penalty Risk Curve Blueprint

結論として、要求されたモジュール群・パイプライン・データ構造・保存先を実装済み。  
型チェック・JSON妥当性・Lint診断も通過している。

---

## 2. 最終アーキテクチャ（統合後）

```text
/bwe
  /api
    xclient.ts
  /core
    allocation.ts
    chains.ts
    content.ts
    crosslang.ts
    drift.ts
    metrics.ts
    penalties.ts
    scheduler.ts
  /data
    priors.json
    /templates
      en.json
      pt.json
      es.json
      ja.json
      ar.json
      ko.json
  /runtime
    state.json
    schedule.json
    network.json
    /schedules
      acct1.json
      acct2.json
      acct3.json
      acct4.json
      acct5.json
  /scale
    topology.ts
    media.ts
    risk.ts
    flywheel.ts
    multiaccount.ts
  index.ts
```

---

## 3. フェーズA（先行実装）完了内容

### 3.1 Adaptive Allocation Engine

- `Beta(α,β)` の言語別 posterior 管理
- 日次更新: `α += successes`, `β += failures`
- 100 draw/言語の Thompson Sampling
- sample mean の softmax 化
- `n_i = clip(2, round(N * weight_i), 12)` 実装
- hot/cold 判定と chain depth cap 制御

### 3.2 Time-Wave Scheduler

- APAC/EU/AMER 時間窓での24h配置
- 45–90分 gap と ±15分 jitter
- quote の次リージョンピーク整列
- 2層/3層チェーン遅延窓を反映

### 3.3 Quote-Chain / Cross-language

- 深さ分布 1/2/3層 = 10/60/30
- self/cross = 70/30
- 遅延窓 4–12h 制約
- 類似度 `<70%` をコサインで判定
- quote 比率上限管理
- cross-language 伝播重み（hub/spoke系）を実装

### 3.4 Content Blueprint

- 言語別テンプレート読込
- 文字数制約（ja 80–110, 他 110–160）
- Hook → Value → CTA → Media 構造
- media / emoji / poll 比率制御
- quote rewrite エンジン（類似度制約）
- 外部LLM統合ポイント（関数インターフェース）実装

### 3.5 Penalty Guardrails

- 速度・内容・引用・メディア・行動のブロック判定
- 違反理由を structured data で返却

### 3.6 Drift Detection & Recovery

- KS-test (7d vs 30d)
- EWMA residual 検知
- drift score 算出 + フラグ判定
- 回復:
  - chain depth 縮退
  - exploration 増加
  - time window シフト
  - prior リセット（`0.7 old + 0.3 bootstrap`）

### 3.7 日次パイプライン（初版）

- metrics収集 → posterior更新 → drift → allocation
- content生成 → chains → schedule
- guardrails → schedule保存 → posting実行 → outcome保存

---

## 4. フェーズB（今回拡張）完了内容

### 4.1 Topology（`scale/topology.ts`）

- 5アカウント構成（Hub + 4 Spokes）を固定モデル化
- チェーンパターン比率を実装:
  - Hub↔AMER 50%
  - Hub→APAC 30%
  - Spoke↔Spoke 15%
  - APAC→Hub 5%
- inter-account share <15%/account の制約計算
- 4–8h relay delay 制約
- isolationTag の一意性チェック（ペナルティ隔離）
- `network descriptor` 出力機能

### 4.2 Media Scaling（`scale/media.ts`）

- 投稿規模帯別メディア比率を実装
- 言語別メディア嗜好（en/pt/es/ja/ko/ar）を実装
- exact reuse 比率管理（<10%）
- overlay variant 比率管理（<30%）
- overlay variant 自動生成（caption/zoom/crop）
- 増幅係数:
  - chain reuse = x1.8
  - hub-video→spokes = x2.2

### 4.3 Risk Curve（`scale/risk.ts`）

- 速度/重複/引用密度/信頼減衰/早期警告を実装
- safe operating zones（1/2/5 account）を実装
- recovery actions を structured に返却:
  - pause 2h
  - rotate templates
  - force fresh assets
  - reduce chain depth

### 4.4 Growth Flywheel（`scale/flywheel.ts`）

- Profit tier → posts/day → accounts の制御を実装
- scale up/down 条件判定
- 日次評価 + 週次スケーリングゲート

### 4.5 Multi-Account Coordination（`scale/multiaccount.ts`）

- global TS + per-account TS 配分統合
- account cap, quarantine を反映
- inter-account quote chain 統合
- cross-account time-wave scheduling 統合

---

## 5. 既存モジュール拡張差分（主要）

### `core/allocation.ts`

- multi-account state / delta 構造を追加
- `computeGlobalAllocationAcrossAccounts` を追加
- global言語目標と account cap を同時充足する配賦ロジックを実装

### `core/chains.ts`

- `ChainPost` に `accountId/sourceAccountId/targetAccountId/interAccount` を追加
- account単位 chain 生成対応
- inter-account quote chain 生成関数を追加

### `core/scheduler.ts`

- `ScheduleEntry` に `accountId` 系フィールドを追加
- account別 offset / density cap / global cap 対応
- inter-account relay delay（4–8h）強制
- `buildMultiAccountSchedule` を追加

### `core/drift.ts`

- scale-aware drift scoring を追加（scaling pressure / penalty pressure）
- recovery plan に scale-down 推奨値を追加

### `api/xclient.ts`

- `fetchLatestMetricsForAccounts` 追加
- `executeMultiAccountSchedules` 追加
- 単一実行関数は後方互換ラッパーへ整理

### `index.ts`

- 新12ステップパイプラインへ更新
- 旧state形式から multi-account state への正規化ロジック追加
- `network.json` と `runtime/schedules/*.json` 保存追加

---

## 6. パイプライン（最終版）

最終パイプラインは以下を実行する:

1. 全アカウント metrics 読込  
2. global + per-account posterior 更新  
3. drift 検知  
4. risk model 実行  
5. global + per-account allocation  
6. account別 content pool 生成  
7. inter-account quote-chain 生成  
8. multi-account schedule 構築  
9. penalty guardrails 適用  
10. schedule 保存（global/per-account/network）  
11. posting 実行  
12. outcomes ログ保存  

---

## 7. 生成データ/永続化

- `bwe/runtime/state.json`  
  multi-account runtime state（seed, allocation states, drift, account trust/quarantine, flywheel履歴）

- `bwe/runtime/schedule.json`  
  全体統合スケジュール（guardrail通過分）

- `bwe/runtime/schedules/acct*.json`  
  アカウント別スケジュール

- `bwe/runtime/network.json`  
  トポロジー・制約・チェーン経路・容量情報

---

## 8. 検証結果

### 実施済み

- TypeScriptチェック: `bwe/index.ts` 起点で成功
- Lint診断: `bwe`配下でエラーなし
- JSON parse: `bwe`配下JSONの妥当性確認済み

### 実行時の環境依存事項

- `tsx bwe/index.ts` 実行時に、既存 `services/x/client.js` の依存
  - `oauth-1.0a` 未解決で停止する環境を確認
- これはBWEロジック不整合ではなく、実行環境依存のモジュール解決問題

---

## 9. 既知の運用前提

1. multi-account投稿の実運用では、アカウント別認証を `executeMultiAccountSchedules` のアダプタ注入で接続する前提。  
2. `accountProfiles` の username/enabled 設定が未投入の場合は、有効アカウント数が縮退する。  
3. risk/quarantine 判定は保守的に設計しているため、初期は投稿数が抑制される可能性がある。  

---

## 10. 総合完了判定

- フェーズA（Master + Drift）: **完了**
- フェーズB（Scaling + Multi-Account + Media + Risk + Flywheel）: **完了**
- 統合パイプライン更新: **完了**
- ドキュメント化: **完了（本書）**

以上。  
