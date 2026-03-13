# WarriorPlus Affiliate Guidebook v1.0 - PDF Last 5 Minutes

## 1. 目的

このドキュメントは、PDF を書き出す直前の 5 分だけ見るための超短縮チェックである。

詳細版は `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_PRE_FLIGHT_CHECKLIST.md` を使う。

---

## 2. 前提

貼り込み元は `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PASTE_READY.md` を前提にする。

今回の完成形は generic 共有版である。

---

## 3. 5分チェック

1. 目次を最終更新したか
2. `Part` / `Chapter` / `Appendix` が新ページ開始になっているか
3. ドキュメント内検索で `{{` が `0` 件か
4. ドキュメント内検索で `[INSERT YOUR` が generic 版として意図どおり残っているか
5. ドキュメント内検索で 三連バッククォート ````` が `0` 件か
6. AR / KO / JA の表示崩れがないか
7. 表がページ幅からはみ出していないか
8. live URL がクリックできるか
9. PDF 書き出し後に全体をざっと通しで目視したか

---

## 4. generic 版の期待値

generic 共有版として見るなら以下が正常。

- `{{` は `0` 件
- `[INSERT YOUR` は残っていてよい
- raw の WarriorPlus buy URL を公開導線として入れない

---

## 5. STOP 条件

以下のどれかがあれば、そのまま書き出さない。

- `{{` が 1 件でも残っている
- 三連バッククォートが残っている
- AR / KO / JA が文字化けしている
- 表が崩れている
- 目次が古い

---

## 6. GO 条件

以下が揃っていれば、PDF 書き出しに進んでよい。

- 本文は `PASTE_READY` 由来
- generic placeholder の残り方は意図どおり
- レイアウト崩れがない
- リンクが機能する

---

## 7. 一言まとめ

最後の 5 分では、内容をもう一度読むよりも、検索確認、改ページ、コードブロック、多言語表示、リンクの5点に集中するのが最短で安全である。
