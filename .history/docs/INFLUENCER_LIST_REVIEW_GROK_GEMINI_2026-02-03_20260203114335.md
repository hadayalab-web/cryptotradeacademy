# インフルエンサーリスト レビュー（Grok × Gemini 高精度手法）

**レビュー日**: 2026-02-03  
**対象**: grok-4-1-fast-reasoning × gemini-3-pro-preview で構築したインフルエンサーリスト  
**参照**: ドキュメント・ログ・実データ（data/influencers/\*.json）

**整合メモ**: **引用リポストの実運用で参照するリストは KV の 300 件**。この 300 は **Grok × Gemini で抽出 → X API でフィルタ** を何週間も回し、抽出が枯れてきた時点でストップしたリスト。目標は 824/840 だったが 300 で運用開始。経緯: `docs/INFLUENCER_LIST_300_ORIGIN.md`。

---

## 1. 手法の評価（相当精度高い方法）

### 1.1 パイプラインの整理

| 段階            | 役割                                  | モデル                      | 成果物                                               |
| --------------- | ------------------------------------- | --------------------------- | ---------------------------------------------------- |
| **発見**        | X上の crypto/BTC インフルエンサー抽出 | **grok-4-1-fast-reasoning** | 生リスト（バッチ単位）                               |
| **分析**        | 1周目結果の定量・定性分析             | 手動＋ドキュメント          | INFLUENCER_DISCOVERY_COMPREHENSIVE_ANALYSIS          |
| **最適化設計**  | リトライ・階層・重複対策の強化案      | **gemini-3-pro-preview**    | INFLUENCER_DISCOVERY_OPTIMIZATION_ENHANCED_BY_GEMINI |
| **実装・2周目** | 強化案を反映して再実行                | grok-4-1-fast-reasoning     | 確定リスト 824人/840人（98.1%）                      |

- **Grok**: `services/grok/client.js` の `discoverInfluencersForQuoteRepost()` で **GROK_MODEL_X_LIVE = grok-4-1-fast-reasoning** を利用。エンゲージメント率7%+・バイラル・tweetId必須など条件が明示されたプロンプトで一貫して発見している。
- **Gemini**: `scripts/optimize-influencer-discovery-with-gemini.js` で包括分析を読み込み、**gemini-3-pro-preview** に「階層バランス・リトライ・重複防止・KO/JA対策・username制限」の強化案を出力させ、INFLUENCER_DISCOVERY_OPTIMIZATION_FINAL に反映している。

→ **「Grokで発見 → 分析 → Geminiで最適化案 → 再実行」のループになっており、設計として高精度を狙った流れになっている。**

---

## 2. ドキュメント・ログの一貫性

- **1周目**: INFLUENCER_DISCOVERY_COMPREHENSIVE_ANALYSIS（675人/840人、80.4%、言語別・階層・重複・リトライの課題を整理）。
- **最適化**: Gemini 強化版（ENHANCED_BY_GEMINI）→ OPTIMIZATION_FINAL（Phase 1/2/3 の実装案・コード例付き）。
- **2周目**: INFLUENCER_DISCOVERY_SECOND_ROUND_COMMANDS（言語別コマンド）、INFLUENCER_LIST_FINALIZATION（824人、98.1%確定）。

数値の流れ（675 → 824、80.4% → 98.1%）と、Grok 再実行・言語別目標数がドキュメント間で一致している。

---

## 3. リスト品質の確認

### 3.1 構造・カバレッジ

- **言語**: EN 210, ES 168, AR 112, JA 98, PT-BR 158, KO 78。全6言語で `lang` 付き。
- **スキーマ**: `username`, `tweetId`, `tweetText`, `followerCount`, `engagementRate`, `recentImpressions`, `tier`, `discoveredAt` 等が揃っている。
- **検証**: `discover-influencers-single-lang-robust.js` の `strictValidate` で tweetId（18–19桁）、username（1–15文字）、tweetText（1–280文字）をチェック。

### 3.2 注意点：tweetId の実在性

**data/influencers/influencers-en.json** の先頭付近では、tweetId が次のような**連番的・パターン化**した値になっている:

- `1845123456789012345`, `1845234567890123456`, `1845345678901234567` …

実際の X の snowflake ID は時刻ベースで、ここまで規則的には並ばないことが多い。  
このことから、**少なくとも EN の一部は Grok が「形式だけ正しい」tweetId を生成している可能性**がある。

- 現状フローでは **X API による tweet 実在チェックは行っていない**（形式チェックのみ）。
- 引用リポスト実行時に、存在しない tweetId だと X API でエラーになるリスクがある。

**推奨**:  
本番で大量に引用リポストを回す前に、**各言語からサンプル（例: 5–10件）を抽出し、X API で tweet 取得可否を確認**することを推奨する。問題があれば、該当言語のみ Grok 再取得＋「可能なら X API 検証ステップの追加」を検討するとよい。

### 3.3 階層分布

- INFLUENCER_LIST_FINALIZATION および現状の `tier` は **100% top（followerCount ≥ 10,000）** と記載されている。
- OPTIMIZATION_FINAL の Phase 2 で「Top/Mid/Bottom のクォータ取得」が案として出ているが、今回の確定リスト時点では未反映と考えられる。
- 運用上は「まずはリーチ優先で top 中心」という判断であれば妥当。Mid/Bottom を増やしたい場合は、Phase 2 の階層別プロンプト・クォータ制の実装を後から追加する形で対応できる。

---

## 4. 総合評価とアクション

### 良い点

1. **手法**: Grok（発見）と Gemini（最適化案）を組み合わせた「分析→設計→再実行」になっており、再現性と改善サイクルが明確。
2. **達成率**: 824/840（98.1%）で、目標にほぼ到達している。
3. **ドキュメント**: 1周目分析 → Gemini 強化案 → 2周目手順 → 確定、の流れが追いやすく、ログと数値が一致している。
4. **データ形式**: スキーマ・言語・必須項目は引用リポスト用途として揃っている。

### 要確認・推奨

1. **tweetId の実在性**: EN を中心に、連番的な tweetId が含まれる可能性がある。**サンプルを X API で検証**し、失敗する ID が多ければ該当言語の再取得または X API 検証ステップの追加を検討する。
2. **階層**: 現状は 100% top。Mid/Bottom を増やしたい場合は、INFLUENCER_DISCOVERY_OPTIMIZATION_FINAL の Phase 2（階層別取得・クォータ）の実装を検討する。

---

## 5. 結論

- **grok-4-1-fast-reasoning** による発見と、**gemini-3-pro-preview** による最適化案の組み合わせは、「相当精度の高い方法」として設計・ドキュメントともに一貫している。
- リストの規模・言語バランス・スキーマは、引用リポスト用として**高品質に整っている**。
- 本番運用前に **tweetId の実在確認（X API サンプル検証）** を行うと、引用リポスト時のエラーを減らし、リストの信頼性をさらに高められる。

---

## 6. KV リスト数との整合（2026-02-03 追記）

- **実運用のストック**: 引用リポストは **KV**（`services/x/influencerStock.js`）から取得。**KV のリスト数は 300 件**。
- **300 の成り立ち**: **grok-4-1-fast-reasoning** と **gemini-3-pro-preview** で抽出したリストを **X API でフィルタ**（user 存在・直近ツイート取得 → 実在 tweetId 採用）し、何週間も回した。目標は 824/840 だったが **抽出数が枯れてきたため 300 でストップ**して運用開始。スクリプト: `build-influencer-list-per-lang.js`, `rebuild-influencer-list-from-seed.js`。ログ・手順: `docs/INFLUENCER_LIST_PROGRESS_2026-02-01.md`, `docs/BUILD_INFLUENCER_LIST_PER_LANG_2026-02-01.md`。経緯まとめ: **`docs/INFLUENCER_LIST_300_ORIGIN.md`**。
- **824/840**: ファイル確定用の目標/達成数（2周目・`data/influencers/*.json`）。KV の 300 とは別経路の数値。
- **設定**: `config/influencerStrategy.js` の `STOCK_COUNT_BY_LANG` 合計が 300（en 124, es 48, pt-br 35, ar 52, ko 30, ja 11）。`scripts/check-kv-stock-status.js` の目標も 300（KV）に合わせてある。
