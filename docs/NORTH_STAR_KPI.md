# 北極星 KPI — 思考の起点

**100成約/日 = KPI（ノルマ）。ここからすべて逆算で思考を統一する。**

**仕手系・提灯ターゲットにこだわらなくてよい。とにかく100成約/日がノルマ。どんな手段使ってでも全世界走り回って売ってこい。**

---

## 1. 唯一のゴール

| 項目 | 内容 |
|------|------|
| **KPI（ノルマ）** | **100成約/日**（Whop / Vidalytics の Minimal + Regular 成約） |
| **環境変数** | `BUZZWEAVE_DAILY_CONVERSION_TARGET` = 100（デフォルト） |
| **逆算** | すべての設計・運用・分析はこの数値から逆算する。 |
| **手段** | 仕手系・提灯に限定しない。PQT・ファネル・Whop・TG・VSL・言語・時間帯・引用元は「成約に効くなら使う」。成約が足りなければ手段を増やす・変える。 |

成約したいプロダクトと、それを売る手段はコードとドキュメントにすべて書いてある。調べればわかる。

---

## 2. 逆算の連鎖

1. **100成約/日** が欲しい  
   → 必要投稿数 = 100 × (1成約あたり投稿数)  
   → `BUZZWEAVE_BASE_POSTS_PER_CONVERSION`（例: 5）→ **500投稿/日** がフロア。

2. **500投稿/日** を達成したい  
   → run 数・cap・検索供給・スロット・言語配分・時間帯を逆算。

3. **成約に効く条件** を知りたい  
   → インプレ・クリックは「入り口」、**成約（our_subs）** が取れている条件を最優先で分析・配分に反映。

4. **何を変えるか** 迷ったら  
   → 「100成約/日に近づくか？」で判断。近づくレバーを選ぶ。

---

## 3. ブレ禁止・手段は自由

- **「バズ（インプレ）を追う」** だけではダメ。バズは成約への入り口指標。
- **「成約に効く条件」** を出し、そのランキングで言語・クラスタ・時間帯・引用元の配分を変えて成約に寄せる。
- **仕手系・提灯にこだわらなくてよい。** Fisherman / 品質スコア / 2–7分ウィンドウは「成約に効くなら使う」であり、ノルマ達成の邪魔になるなら緩める・フォールバックで volume を確保する。
- 分析・機能追加・パラメータ変更はすべて **「100成約/日への貢献」** で評価する。**どんな手段でも100成約/日に届かせるのが最優先。**

---

## 4. 参照

| 用途 | ファイル |
|------|----------|
| 日次ターゲット・投稿/成約・dynamic 逆算 | `services/td/buzzWeaveEngine.js`（`resolveDailyPqtTarget`, `DAILY_CONVERSION_TARGET`） |
| 運用の索引・次の1アクション | `docs/OPERATION_PLAYBOOK.md` |
| 成約に効く条件の検証 | `docs/OUR_PQT_BUZZ_VERIFICATION.md`、`scripts/analyze-our-pqt-buzz.js` |
| ML PQT 環境変数・検証項目 | `docs/ML_PQT_ENGINE_FOR_OPERATION_AND_VERIFICATION.md` |
| **武器: X スキャン＋自前分析でアルゴを丸裸に** | `docs/WEAPON_X_SCAN_AND_ALGO_ANALYSIS.md` |
| **投稿CTRをいかにクリックさせるか**（心理・フォーマット・クリック計測） | `docs/PQT_CTR_HOW_TO_GET_CLICKS.md` |
| **投稿が伸びないとき**（Content Create 少・500/日へのレバー） | `docs/POST_VOLUME_NOT_GROWING.md` |
| **インプレがほぼゼロのとき**（クリック以前・リーチ確保） | `docs/IMPRESSIONS_NEAR_ZERO_WHAT_TO_DO.md` |
| **引用リポストのロジック差分**（検証に基づく volume トップアップ・fallback 拡張） | `docs/QUOTE_REPOST_LOGIC_DIFF_FROM_VERIFICATION.md` |
