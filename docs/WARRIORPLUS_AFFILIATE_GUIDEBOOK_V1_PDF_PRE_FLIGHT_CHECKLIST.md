# WarriorPlus Affiliate Guidebook v1.0 - PDF Pre-Flight Checklist

## 1. 目的

このドキュメントは、すでにドキュメントツールへ貼り込んだ `WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1` を PDF 出力する前に、最終点検するためのチェックシートである。

本文の貼り込み元は `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PASTE_READY.md` を前提にしている。

さらに短い最終確認だけでよい場合は `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_LAST_5_MINUTES.md` を使う。

---

## 2. ソース原稿の現時点スキャン結果

`docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PASTE_READY.md` を基準に確認した結果は以下。

- `{{...}}` placeholder は `0` 件
- `[INSERT YOUR` は `42` 件
- 三連バッククォート ````` は `0` 件
- Markdown table row は `0` 件
- Markdown heading marker は `0` 件
- 多言語ブロックは Unicode を保持した状態で再生成済み

意味:

- `{{...}}` が 0 件なのは正常
- `[INSERT YOUR` の `42` 件は generic 共有版として意図された残り
- 三連バッククォートが 0 件なのは、`PASTE_READY` が文書貼り込み用に正規化済みであることを意味する
- Markdown table row が 0 件なのは、表を文書で崩れにくいリスト形式へ展開済みであることを意味する

---

## 3. まず確認すること

1. 貼り込み元が `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PASTE_READY.md` だったか
2. `Complete Manuscript` ではなく `PASTE_READY` を使っているか
3. generic 共有版として仕上げる方針のままでよいか

この3点が揃っていれば、以下のチェックをそのまま使える。

---

## 4. 検索ベースの機械チェック

ドキュメントツール内で検索して確認する。

### A. `{{`

期待値:

- `0` 件

もし 1 件でも残っていたら、未処理 placeholder が混じっている。

### B. `[INSERT YOUR`

generic 共有版の期待値:

- `42` 件前後

これは paid-layer の入力欄として意図的に残している。

もし personalized 版にするなら:

- `0` 件

まで置換する。

### C. `````

期待値:

- ドキュメント内では `0` 件

現在の `PASTE_READY` は、すでに三連バッククォートを除去した状態である。

---

## 5. レイアウトチェック

以下の順で改ページが入っているか確認する。

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

最低限でも、`Part`、`Chapter`、`Appendix` は新ページ開始にする。

---

## 6. コードブロックの確認

特に確認する章は以下。

- `Chapter 01`
- `Chapter 09`
- `Chapter 11`
- `Appendix B`

見るポイント:

- 三連バッククォートが残っていないか
- 中の文章だけが残っているか
- 必要に応じて等幅フォントか、薄い背景か、枠線で読みやすく整理されているか

---

## 7. 表の確認

現在の `PASTE_READY` では、Markdown table は文書で崩れにくいリスト形式へ展開済みである。

そのうえで、以下を確認する。

1. リスト化された link / lane 情報が読みにくく分断されていないか
2. Appendix の link section がページまたぎで不自然に崩れていないか
3. 長い URL が見切れていないか

---

## 8. 多言語チェック

特に `Chapter 11` を重点確認する。

1. AR が右から左で崩れていないか
2. KO / JA が文字化けしていないか
3. `Trap Defence BTC`、`Minimal`、`Regular`、`KIBA` が意図どおり英語のまま保たれているか

---

## 9. リンクチェック

generic 共有版として見るなら、以下が正常。

1. `Minimal` の live link はそのままクリックできる
2. `[INSERT YOUR ... WARRIORPLUS AFFILIATE LINK]` は placeholder として残っている
3. raw の WarriorPlus buy URL は本文中の公開導線として使われていない

---

## 10. PDF 書き出し直前の最終確認

1. 目次を最終更新したか
2. 表紙の次が Front Matter になっているか
3. `Part` / `Chapter` / `Appendix` の改ページが入っているか
4. 三連バッククォートが 0 件か
5. `{{` が 0 件か
6. generic 版なら `[INSERT YOUR` が意図どおり残っているか
7. AR / KO / JA の表示崩れがないか
8. PDF 書き出し後に URL をクリック確認したか
9. PDF 全体を数ページ飛ばしではなく通しでざっと目視したか

---

## 11. 一言まとめ

今回の原稿は、本文内容そのものは完成している。PDF 化の成否は、未処理文字列の検索確認、コードブロック整理、改ページ、多言語表示確認の4点で決まる。このチェックシートを上から順に潰せば、かなり安全に最終 PDF まで持っていける。
