# WarriorPlus Affiliate Guidebook v1.0 - PDF Layout Guide

## 1. 目的

このドキュメントは、`Trap Defence BTC WarriorPlus Affiliate Guidebook` の統合原稿をドキュメントツールへ貼り込み、PDF に仕上げるための運用ガイドである。

これは最終PDFにそのまま入れる本文ではない。

---

## 2. 元原稿

作業の基準ファイルは以下。

- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_COMPLETE_MANUSCRIPT.md`
- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PASTE_READY.md`

補助的に参照してよいファイル:

- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_FRONT_MATTER.md`
- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PROJECT_TRACKER.md`
- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PLACEHOLDER_REPLACEMENT_MASTER.md`
- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_FINAL_HANDOFF.md`
- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_PRE_FLIGHT_CHECKLIST.md`
- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_LAST_5_MINUTES.md`

重要:

- `Complete Manuscript` は編集母艦である
- `PASTE_READY` はドキュメントへそのまま貼るための一本化ファイルである
- 現在の `Complete Manuscript` は generic 配布版として正規化済みで、free-layer link は live 値に置換済み
- paid-layer だけは `[INSERT YOUR ... WARRIORPLUS AFFILIATE LINK]` 形式で残してある
- 現在の `PASTE_READY` は、コードフェンスと Markdown table を除去した文書貼り込み用の体裁へ再整形済みである

---

## 3. 推奨ワークフロー

最も安全な流れは以下。

最短で入口だけ掴みたい場合は、先に `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_FINAL_HANDOFF.md` を読むとよい。
PDF 書き出し直前の点検は `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_PRE_FLIGHT_CHECKLIST.md` を使うとよい。
本当に最後の 5 分だけの確認は `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_LAST_5_MINUTES.md` を使うとよい。

1. `WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_COMPLETE_MANUSCRIPT.md` を編集母艦として保持する
2. ドキュメントへ貼るときは `WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PASTE_READY.md` を使う
3. 配布モードを決める
4. generic 版なら `[INSERT YOUR ...]` 表記をそのまま残す
5. personalized 版なら `[INSERT YOUR ...]` 表記を affiliate 自身の実リンクへ置換する
6. `PASTE_READY` をドキュメントツールへ貼り込む
7. 見出しスタイルを適用する
8. 改ページを入れる
9. 目次を更新する
10. PDF として出力する

---

## 4. 2つの組版モード

### Fast Mode

最短で仕上げたい場合は以下だけ守ればよい。

- 表紙を1ページにする
- 各 `Chapter` の前で改ページする
- 各 `Appendix` の前で改ページする

### Professional Mode

より完成度を上げたい場合は以下を採用する。

- 表紙を単独ページにする
- Front Matter を独立した前半ページ群として置く
- 各 `Part` を区切りページとして独立させる
- 各 `Chapter` を新しいページから始める
- 各 `Appendix` を新しいページから始める

本案件では `Professional Mode` を推奨する。

---

## 5. 推奨改ページルール

最低限のルールは以下。

1. 表紙の後で改ページ
2. `# Part I - Start Fast and Understand the Offer` の前で改ページ
3. すべての `# Chapter` の前で改ページ
4. `# Part VI - Appendices for Safe Execution` の前で改ページ
5. すべての `# Appendix` の前で改ページ

より見栄えを上げるなら、以下の順でそれぞれ新ページ開始にする。

1. 表紙
2. Front Matter
3. `Part I`
4. `Chapter 01`
5. `Chapter 02`
6. `Part II`
7. `Chapter 03`
8. `Chapter 04`
9. `Chapter 05`
10. `Part III`
11. `Chapter 06`
12. `Chapter 07`
13. `Part IV`
14. `Chapter 08`
15. `Chapter 09`
16. `Part V`
17. `Chapter 10`
18. `Chapter 11`
19. `Chapter 12`
20. `Part VI`
21. `Appendix A`
22. `Appendix B`

---

## 6. 見出しスタイルの割り当て

Markdown をそのまま貼ると記号が残る場合がある。

その場合は、先頭記号を外しながら以下のスタイルで整える。

| Markdown 記法 | 推奨スタイル | 用途 |
| ------------- | ------------- | ------------- |
| `# Trap Defence BTC` | Title | 表紙タイトル |
| `## WarriorPlus Affiliate Guidebook` | Subtitle または Heading 1 相当 | 表紙サブタイトル |
| `### v1.0 Professional Field Manual` | Subtitle 2 または 強調本文 | 表紙の補足行 |
| `# Part ...` | Heading 1 または専用 Part Style | 部の区切りページ |
| `# Chapter ...` | Heading 1 | 章タイトル |
| `# Appendix ...` | Heading 1 | 付録タイトル |
| `## ...` | Heading 2 | 章内セクション |
| `### ...` | Heading 3 | 小見出し |

実務上のコツ:

- `Part` は本文より大きくし、余白を広く取る
- `Chapter` は見出し番号込みで太字にする
- `Appendix` は章と同格で扱う

---

## 7. 表紙の作り方

表紙は統合原稿の冒頭3ブロックを使えば十分。

使う要素:

- `Trap Defence BTC`
- `WarriorPlus Affiliate Guidebook`
- `v1.0 Professional Field Manual`
- `Built for affiliates who want a cleaner message, stronger buyer trust, and better recurring economics.`

推奨:

- 表紙には本文を入れすぎない
- サブコピーは 1 行から 2 行に抑える
- 表紙の次ページから本文開始にする

---

## 8. Front Matter の扱い

Front Matter は以下の役割を持つ。

- この本は何か
- 誰向けか
- どう読むか
- 目次
- 重要な運用前提

推奨:

- Front Matter 全体は本文前にまとめる
- 目次を使うなら Front Matter 内で完結させる
- `Part I` に入る前で必ず改ページする

---

## 9. フォントと文字組み

6言語を含むため、フォント互換性を優先する。

推奨フォント:

- 本文: `Noto Sans` 系
- 代替: `Arial`, `Calibri`
- コードブロック: `Cascadia Mono`, `Consolas`, `Courier New`

推奨サイズ:

- 本文: `10.5pt` から `11.5pt`
- Heading 1: `16pt` から `20pt`
- Heading 2: `13pt` から `15pt`
- コードブロック: `9pt` から `10pt`

推奨行間:

- `1.15` から `1.3`

推奨余白:

- A4: `18mm` から `22mm`
- Letter: `0.75in` から `0.9in`

---

## 10. 多言語ブロックの注意

`Chapter 11 - Six-Language Fast Pack` では特に以下を確認する。

- AR ブロックが右から左の表示で崩れていないか
- KO / JA の文字が豆腐化していないか
- ブランド語 `Trap Defence BTC / Minimal / Regular / KIBA / Trap Score` が意図どおり英語のまま残っているか

推奨:

- AR の段落は必要に応じて右揃えにする
- `Noto Sans` 系を使えば多言語混在でも崩れにくい

---

## 11. コードブロックと表の扱い

`Chapter 09` と `Chapter 11` ではコードブロックが多い。

推奨:

- 三連バッククォートは最終ドキュメントでは削除する
- コードブロック本文だけを残し、薄いグレー背景か枠線で囲う
- 等幅フォントを使う

表については:

- 1ページ幅に収まるか確認する
- 行が途中で分断されるならフォントを少し下げる
- Appendix のリンク表は特に横幅を確認する

---

## 12. 配布版ごとのリンク処理

置換の基準は以下のマスターを参照する。

- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PLACEHOLDER_REPLACEMENT_MASTER.md`

現在の `PASTE_READY` では、free-layer 系はすでに live 値へ置換済みである。

generic 版として出す場合は、paid-layer の入力欄だけが残る。

代表例:

- `[INSERT YOUR WARRIORPLUS AFFILIATE LINK]`
- `[INSERT YOUR EN WARRIORPLUS AFFILIATE LINK]`
- `[INSERT YOUR ES WARRIORPLUS AFFILIATE LINK]`
- `[INSERT YOUR PT WARRIORPLUS AFFILIATE LINK]`
- `[INSERT YOUR AR WARRIORPLUS AFFILIATE LINK]`
- `[INSERT YOUR KO WARRIORPLUS AFFILIATE LINK]`
- `[INSERT YOUR JA WARRIORPLUS AFFILIATE LINK]`

推奨:

- generic 版なら `[INSERT YOUR` で一括検索して、残りが意図どおりか確認する
- personalized 版なら `[INSERT YOUR` が 0 件になるまで置換する
- source placeholder を扱う場合は `{{` でも確認する

---

## 13. 最終チェックリスト

PDF 化の直前に以下を確認する。

1. `PASTE_READY` を貼り込み元として使っているか
2. generic 版なら `[INSERT YOUR ...]` 表記が意図どおり残っているか、personalized 版なら actual link に置換済みか
3. 表紙を単独ページにしたか
4. `Part` と `Chapter` の改ページを入れたか
5. 目次を更新したか
6. AR / KO / JA の表示崩れがないか
7. コードブロックの三連バッククォートを消したか
8. 表がページ幅に収まっているか
9. URL がクリック可能か
10. PDF 出力後に目視確認したか

---

## 14. 一言まとめ

最終PDFの完成度は、本文を書いたあとの「改ページ」「見出しスタイル」「多言語表示確認」で大きく変わる。編集は `WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_COMPLETE_MANUSCRIPT.md`、コピペ実行は `WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PASTE_READY.md` に分け、このガイドを見ながら整えるのが最短で安全である。
