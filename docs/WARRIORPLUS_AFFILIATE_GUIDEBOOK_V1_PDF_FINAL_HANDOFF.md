# WarriorPlus Affiliate Guidebook v1.0 - PDF Final Handoff

## 1. これは何か

このドキュメントは、`Trap Defence BTC WarriorPlus Affiliate Guidebook` を PDF 化する直前に見るための最終ハンドオフである。

詳細な運用ルールは別ファイルにあるが、ここでは「何を使うか」「どの順で進めるか」「何を確認するか」だけを短く整理する。

---

## 2. いま完成しているもの

PDF 化の母艦は以下。

- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_COMPLETE_MANUSCRIPT.md`
- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PASTE_READY.md`

補助資料は以下。

- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_LAYOUT_GUIDE.md`
- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PLACEHOLDER_REPLACEMENT_MASTER.md`
- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_PRE_FLIGHT_CHECKLIST.md`
- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_LAST_5_MINUTES.md`

現在の状態:

- guidebook 本文は統合済み
- generic 配布版として正規化済み
- `Minimal` の free link は 6 言語とも live 値に置換済み
- paid-layer は `[INSERT YOUR ... WARRIORPLUS AFFILIATE LINK]` 形式で残してある
- `PASTE_READY` はドキュメントへそのまま貼れるように先頭コメントを除去済み
- `PASTE_READY` はコードフェンス、Markdown table、Markdown heading marker を除去した文書貼り込み用の体裁へ再整形済み

---

## 3. どのファイルを使えばいいか

ドキュメントツールへ直接貼る本文は `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PASTE_READY.md` を使えばよい。

編集母艦として残すのは `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_COMPLETE_MANUSCRIPT.md` である。

以下は本文ではない。

- `PDF_LAYOUT_GUIDE` は組版ガイド
- `PLACEHOLDER_REPLACEMENT_MASTER` は置換ルールの参照表

つまり:

- 編集・管理は `Complete Manuscript`
- コピペ実行は `PASTE_READY`

---

## 4. generic 共有版としての扱い

今回の完成物は、複数 affiliate に共通配布できる generic handbook である。

したがって:

- free-layer link はそのまま使ってよい
- `[INSERT YOUR ... WARRIORPLUS AFFILIATE LINK]` は残してよい
- raw の WarriorPlus buy URL は入れない
- review 用 Telegram invite link は入れない

このまま PDF 化すれば、affiliate ごとに paid link だけ差し替えて使える共通冊子になる。

---

## 5. 最短ワークフロー

1. `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PASTE_READY.md` を開く
2. ドキュメントツールへ全文を貼り込む
3. 表紙を 1 ページに整える
4. `Part`、`Chapter`、`Appendix` の前で改ページする
5. 見出しスタイルを適用する
6. 目次を更新する
7. コードブロックの三連バッククォートを消す
8. 多言語表示を確認する
9. PDF として書き出す

---

## 6. 組版で迷ったら

迷ったら以下を採用すればよい。

- フォント: `Noto Sans`
- 本文サイズ: `10.5pt` から `11.5pt`
- Heading 1: `16pt` から `20pt`
- 行間: `1.15` から `1.3`
- 表紙は単独ページ
- `Part` は区切りページ扱い
- `Chapter` と `Appendix` は新ページ開始

より詳しい判断基準は `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_LAYOUT_GUIDE.md` を参照する。

---

## 7. 共有前の最終確認

generic 版として出す場合は以下だけ確認すればよい。

より厳密に点検する場合は `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_PRE_FLIGHT_CHECKLIST.md` を使う。
本当に最後の 5 分だけなら `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_PDF_LAST_5_MINUTES.md` を見る。

1. `PASTE_READY` を使っているか
2. `[INSERT YOUR` で検索して、paid-layer の入力欄だけが残っているか
3. AR / KO / JA の表示崩れがないか
4. 表がページ幅に収まっているか
5. URL がクリック可能か
6. PDF 出力後に目視確認したか

---

## 8. 一言まとめ

PDF 化の実務では、`PASTE_READY` を本文として貼り、`PDF Layout Guide` を見ながら改ページと見出しを整えればよい。`Complete Manuscript` は編集母艦として残しつつ、実際のコピペ作業は `PASTE_READY` に一本化して進めればよい。
