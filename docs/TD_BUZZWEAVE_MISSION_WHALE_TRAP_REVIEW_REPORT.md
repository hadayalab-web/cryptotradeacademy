# TD BuzzWeave Engine レビュー報告書（前回分 + クジラのカモ救済ミッション）

実施日: 2026-02-12  
対象: `services/td/buzzWeaveEngine.js`, `services/ai/gpt5mini.js`, `utils/supabase.js`, `docs/supabase-*.sql`

---

## 1. 報告書の構成

本レポートは以下 2 つの改修を統合してレビューする。

1. **前回**: 集中投下結果回収レイヤー（`buzzweave_post_log` テーブル、ポーリング API）
2. **今回**: クジラのカモ救済ミッション（トレンド危険度分類、投稿モード分岐、GPT プロンプト修正、ログ拡張）

---

## 2. 前回分：集中投下結果回収レイヤー（概要）

### 2.1 実装内容

- **buzzweave_post_log テーブル**: 投稿時に `slot_lang`, `cluster_label`, `cluster_score`, `candidate_tweet_id`, `engagement_score`, `posted_at`, `our_tweet_id`, `slot_mode`, `buzz_summary`, `cluster_psych`, `trap_defence_insight` を保存
- **ポーリング API**: `GET /api/buzzweave-metrics-poll` で X API から public_metrics を取得し、`our_impressions`, `our_likes`, `our_retweets`, `our_quotes`, `our_replies`, `metrics_fetched_at` を紐づけ
- **将来学習**: clusterScore 係数調整、言語別クラスタ重み、buzzSummary/clusterPsych/insight パターン別成果の分析に使用

詳細: `docs/TD_BUZZWEAVE_POST_LOG_MARKET_RECOVERY.md`

---

## 3. 今回分：クジラのカモ救済ミッション

### 3.1 ミッション

「クジラのカモにされているトレーダーを救う」を BuzzWeave Engine に反映する。

### 3.2 1. トレンド危険度分類レイヤー

search/recent で集めた投稿をヒューリスティックで以下の 3 種に分類:

| dangerLabel | 説明 |
|-------------|------|
| **whale_trap** | クジラ側に有利な構造で、個人トレーダーがカモにされやすい煽り・構造 |
| **neutral** | 単なるニュース・情報共有 |
| **educational** | 元から注意喚起・学び系 |

**判定基準（キーワード）**:
- **whale_trap**: 「今すぐ」「乗り遅れるな」「簡単に」「誰でも」「100x」「レバレッジ」「moon」「pump」「easy money」「free money」「guaranteed」等
- **educational**: 「リスク」「注意」「慎重に」「危険」「DYOR」「not financial advice」等（educational を先にチェック）

### 3.3 2. 投稿モード分岐

`dangerLabel` から `usedMode` を解決:

| dangerLabel | usedMode | コピー方針 |
|-------------|----------|------------|
| whale_trap | **trap_defence_warning** | 警告・構造の説明・やってはいけない行動を中心 |
| neutral | **neutral_insight** | 通常の洞察モード（市場構造の解説） |
| educational | **educational_boost** | 補足・深堀りモード（元投稿を強化） |

### 3.4 3. GPT プロンプトの修正

buzzContext に以下を追加し、コピー生成に反映:

| フィールド | 説明 |
|------------|------|
| dangerWhyRetail | このトレンドが個人トレーダーにとって危険な理由 |
| whaleTrapHow | クジラがどうやってカモを作ろうとしているか |
| doNotDoActions | 今やってはいけない典型行動 |

**usedMode 別のプロンプト指示**:
- `trap_defence_warning`: 「WARNING、構造の説明、やってはいけないこと」を強調。クジラの罠から救う。
- `educational_boost`: 元投稿の awareness を強化。教育的な深堀り。
- `neutral_insight`: 市場構造を解説。バランスの取れた視点。

### 3.5 4. ログへのミッション情報追加

`buzzweave_post_log` に以下を追加:

| カラム | 説明 |
|--------|------|
| danger_label | whale_trap / neutral / educational |
| used_mode | trap_defence_warning / neutral_insight / educational_boost |

**検証用途**: 「どれだけ警告として機能したか」を後から検証可能。`danger_label` × `used_mode` × `our_impressions` 等で分析。

---

## 4. 変更ファイル一覧

| ファイル | 前回 | 今回 |
|----------|------|------|
| `services/td/buzzWeaveEngine.js` | collectBuzzCandidates, insertBuzzweavePostLog 呼び出し | classifyDanger, resolveUsedMode, buildBuzzInsights 拡張（dangerWhyRetail, whaleTrapHow, doNotDoActions, usedMode）、dangerLabel 付与 |
| `services/ai/gpt5mini.js` | buzzContext（buzzSummary, clusterPsych, trapDefenceInsight） | dangerWhyRetail, whaleTrapHow, doNotDoActions, usedModeNote を追加 |
| `utils/supabase.js` | insertBuzzweavePostLog | danger_label, used_mode カラムを追加 |
| `docs/supabase-buzzweave-post-log.sql` | テーブル定義 | danger_label, used_mode カラムを追加 |
| `docs/supabase-tweet-metrics-schema.sql` | buzzweave_post_log 追加 | danger_label, used_mode を追加 |

---

## 5. スキーマ変更（buzzweave_post_log）

### 5.1 追加カラム

```sql
danger_label TEXT,   -- whale_trap | neutral | educational
used_mode TEXT,      -- trap_defence_warning | neutral_insight | educational_boost
```

### 5.2 既存テーブルへの追加

Supabase SQL Editor で実行:

```sql
ALTER TABLE buzzweave_post_log ADD COLUMN IF NOT EXISTS danger_label TEXT;
ALTER TABLE buzzweave_post_log ADD COLUMN IF NOT EXISTS used_mode TEXT;
```

---

## 6. フロー概要

1. **collectBuzzCandidates**: search/recent → 動的中央値フィルタ → クラスタリング + **危険度分類（classifyDanger）** → GPT 分類
2. **pickBestBuzzCandidate**: clusterScore 最大クラスタ内で lang 優先して選定
3. **generateParasiticCopy**: buildBuzzInsights で **dangerWhyRetail, whaleTrapHow, doNotDoActions, usedMode** を算出 → generateXPost に渡す
4. **generateXPost**: buzzContext + usedModeNote で GPT プロンプトを構築
5. **insertBuzzweavePostLog**: **danger_label, used_mode** をログに保存

---

## 7. 検証と将来学習

- **danger_label × used_mode**: どの組み合わせが効果的かを our_impressions / our_likes 等で分析
- **trap_defence_warning の効果**: クジラのカモ救済としての「警告としての機能」を検証
- **パターン別成果**: buzz_summary, cluster_psych, trap_defence_insight, danger_label, used_mode を組み合わせた A/B 分析

---

## 8. 関連ドキュメント

- `TD_BUZZWEAVE_REALTIME_CONCENTRATED_REPORT.md` — リアルタイムトレンド監視＋集中投下
- `TD_BUZZWEAVE_POST_LOG_MARKET_RECOVERY.md` — 集中投下結果回収レイヤー
- `TD_BUZZWEAVE_DEADLINE_GUARD_IMPLEMENTATION_REPORT.md` — deadline guard
