# 運用プレイブック（成約・posted 最優先）

**北極星**: [100成約/日 = KPI。ここからすべて逆算](NORTH_STAR_KPI.md)。思考の起点はこの1つ。

**目的**: 成約・posted・CVR を最優先に、迷わず判断・再現できるようにする。何が欲しいか → どこを見るか → 何をするか、を一覧にした索引。

---

## 1. いちばん求めてるもの

- **成約**（Whop / Vidalytics）— **100/日が KPI**
- **posted**（run あたりの投稿数が cap に近いこと）— 成約数に直結
- **CVR・CTR**（品質を落とさない）— 成約への変換効率

それ以外（長いチェックリスト・受け取り確認・検証プランの羅列）は目的に直結しない。**診断→因果→正しいレバー** だけを出す。迷ったら「100成約/日に近づくか？」で判断する。

---

## 2. いつ何を見るか

| タイミング | 見るもの | 参照 |
|------------|----------|------|
| **run のあと** | 短報（posts_fetched, candidates, slots, cap, posted, fill_rate） | ログの `[buzzweave-run] short_report` または ML_PQT 7.1 |
| **fill_rate が低い** | 原因は検索ヒット不足か → 次の1アクション | Gemini にログを投げる（下記プロンプト定型）。ML_PQT 7.2 合格ライン |
| **ログに GET ---** | どの API が落ちたか・対処 | docs/LOGS_TROUBLESHOOTING.md |
| **パラメータを変える** | ロールフォワード順・ロールバック順 | ML_PQT 7.3 |
| **Grok に意思決定を聞く** | 選択肢を明示してから聞く（自由記述だと誤レバー） | TRAP_DEFENCE_GROK_GEMINI_ROLES.md |
| **Cursor のモデル** | 布陣（おれに最大限貢献できる組み合わせ） | CURSOR_MODELS_CONFIG.md |

---

## 3. ドキュメント索引（何がどこにあるか）

| 欲しいもの | ファイル |
|------------|----------|
| run 解析の型（原因・次の1アクション・理由だけ） | ML_PQT_ENGINE_FOR_OPERATION_AND_VERIFICATION.md § Composer/解析AI 出力方針 |
| run 短報の項目定義 | 同上 § 7.1 Run 短報フォーマット |
| 検証指標・合格ライン・ロールバック順 | 同上 § 7.2, 7.3 |
| 検索ログの読み方（pagesFetched, lowVolumeBackfill） | 同上 § 4.6 |
| Gemini に投げる用の定型プロンプト | RUN_ANALYSIS_PROMPT_TEMPLATE.md |
| Grok / Gemini の役割と注意（Grok は選択肢明示） | TRAP_DEFENCE_GROK_GEMINI_ROLES.md |
| X API 料金・実データ・JST19時以降の想定 | X_API_GROK_PROMPT_REFERENCE.md |
| ログ GET --- の意味と対処 | LOGS_TROUBLESHOOTING.md |
| Cursor Models の布陣 | CURSOR_MODELS_CONFIG.md |
| 最終試験（Composer / Gemini） | COMPOSER_GEMINI_FINAL_EXAM.md |

---

## 4. 次の1アクションを決めるとき

1. 直近 run のログ（または short_report 1行）を用意する。
2. **Gemini** に `RUN_ANALYSIS_PROMPT_TEMPLATE.md` の定型で投げる（Chrome または API）。
3. 返答は「原因・次の1アクション・理由」の3ブロックだけ。それ以外は使わない。
4. アクションが **BUZZWEAVE_SEARCH_WINDOW_MIN 拡大** か **FALLBACK_SLOT_COUNT** かで迷ったら、**候補不足なら検索ウィンドウが先**。fallback は候補が十分あるときに効く。
