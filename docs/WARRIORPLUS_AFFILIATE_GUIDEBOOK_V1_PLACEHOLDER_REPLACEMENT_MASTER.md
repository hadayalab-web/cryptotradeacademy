# WarriorPlus Affiliate Guidebook v1.0 - Placeholder Replacement Master

## 1. 目的

このドキュメントは、Guidebook 内のプレースホルダを live 情報へ置換するためのマスターである。

主な対象ファイル:

- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_COMPLETE_MANUSCRIPT.md`
- `docs/WARRIORPLUS_AFFILIATE_GUIDEBOOK_V1_FRONT_MATTER.md`

このマスターは、以下の2種類の置換を区別するために作る。

1. 今すぐ固定値で置換してよいもの
2. 各アフィリエイターごとに個別置換が必要なもの

現在の運用メモ:

- `Complete Manuscript` は generic 配布版として正規化済み
- free-layer link、`support_email`、`brand_x_handle` は live value ベースで整理済み
- paid-layer は `[INSERT YOUR ... WARRIORPLUS AFFILIATE LINK]` 形式で残してある
- このマスターは personalized 版を作るとき、または source placeholder 記法の原稿を扱うときの owner-side reference として使う

---

## 2. 置換モード

### Mode A - Generic Affiliate Handbook

複数のアフィリエイターへ同じ冊子を配る場合のモード。

この場合:

- `Minimal` 系リンク
- `support_email`
- `brand_x_handle`

は固定値で置換してよい。

一方で:

- `{{warriorplus_affiliate_link}}`
- `{{warriorplus_affiliate_link_en}}`
- `{{warriorplus_affiliate_link_es}}`
- `{{warriorplus_affiliate_link_pt}}`
- `{{warriorplus_affiliate_link_ar}}`
- `{{warriorplus_affiliate_link_ko}}`
- `{{warriorplus_affiliate_link_ja}}`

は、各 affiliate 固有値なので固定しない。

### Mode B - Personalized Affiliate Edition

特定の1人の affiliate 用に個別 PDF を作る場合のモード。

この場合は:

- 固定置換できる値を先に入れる
- その affiliate 自身の WarriorPlus affiliate link を言語別に埋める

---

## 3. 固定値で置換してよいプレースホルダ

以下は project docs 上で current value が確認できるため、固定値として扱ってよい。

| Placeholder | 置換値 | 用途 | 備考 |
| ------------- | ------------- | ------------- | ------------- |
| `{{support_email}}` | `support@cryptotradeacademy.io` | サポート連絡先 | Resend 送信元・案内先として複数資料に記載あり |
| `{{brand_x_handle}}` | `@trapdefence` | X のブランドハンドル | URL 形式が必要なら `https://x.com/trapdefence` を使用 |
| `{{minimal_link_en}}` | `https://t.me/cryptotradeacademytrialenglish` | EN の free entry link | 公開向け Minimal 導線 |
| `{{minimal_link_es}}` | `https://t.me/cryptotradeacademytrialspanish` | ES の free entry link | 公開向け Minimal 導線 |
| `{{minimal_link_pt}}` | `https://t.me/cryptotradeacademytrialportugues` | PT の free entry link | 冊子では `pt` を使用 |
| `{{minimal_link_ar}}` | `https://t.me/cryptotradeacademytriaarabic` | AR の free entry link | `triaarabic` という表記が current documented value |
| `{{minimal_link_ko}}` | `https://t.me/cryptotradeacademytrialkorean` | KO の free entry link | 公開向け Minimal 導線 |
| `{{minimal_link_ja}}` | `https://t.me/cryptotradeacademytrialjapanese` | JA の free entry link | 公開向け Minimal 導線 |

---

## 4. 個別置換が必要なプレースホルダ

以下は affiliate 固有である。

固定の raw buy URL を入れると affiliate attribution を壊す可能性があるため、generic 配布用 PDF にはそのまま残すか、`YOUR_WP_LINK_HERE` 形式へ変換して使う。

| Placeholder | 言語 | WP Item Number | internal reference raw URL | ルール |
| ------------- | ------------- | ------------- | ------------- | ------------- |
| `{{warriorplus_affiliate_link_en}}` | EN | `wso_vqp3r4` | `https://warriorplus.com/o2/buy/spc506/njtfnb/vqp3r4` | 各 affiliate の EN 個別リンクで置換 |
| `{{warriorplus_affiliate_link_es}}` | ES | `wso_lxd2wq` | `https://warriorplus.com/o2/buy/spc506/njtfnb/lxd2wq` | 各 affiliate の ES 個別リンクで置換 |
| `{{warriorplus_affiliate_link_pt}}` | PT | `wso_dqz789` | `https://warriorplus.com/o2/buy/spc506/njtfnb/dqz789` | 各 affiliate の PT 個別リンクで置換 |
| `{{warriorplus_affiliate_link_ar}}` | AR | `wso_zn9g7p` | `https://warriorplus.com/o2/buy/spc506/njtfnb/zn9g7p` | 各 affiliate の AR 個別リンクで置換 |
| `{{warriorplus_affiliate_link_ko}}` | KO | `wso_vm68d9` | `https://warriorplus.com/o2/buy/spc506/njtfnb/vm68d9` | 各 affiliate の KO 個別リンクで置換 |
| `{{warriorplus_affiliate_link_ja}}` | JA | `wso_zv25jy` | `https://warriorplus.com/o2/buy/spc506/njtfnb/zv25jy` | 各 affiliate の JA 個別リンクで置換 |
| `{{warriorplus_affiliate_link}}` | active lane | lane-dependent | lane-dependent | 周辺文脈の言語に合わせて lane-specific link と同じ値にする |

重要:

- 上表の raw URL は owner-side reference 用である
- そのまま public affiliate PDF に貼らない
- 配布用冊子では必ず affiliate 自身の tracking が入った URL にする

---

## 5. `{{warriorplus_affiliate_link}}` の扱い

この generic placeholder は単独では意味が固定されない。

置換ルールは以下。

### English-first asset の場合

`{{warriorplus_affiliate_link}}` を `{{warriorplus_affiliate_link_en}}` と同じ値にする。

### 多言語 asset の場合

そのブロックの言語に合わせて対応する lane-specific link に置換する。

例:

- ES ブロック内なら `{{warriorplus_affiliate_link_es}}`
- JA ブロック内なら `{{warriorplus_affiliate_link_ja}}`

### Generic handbook として残す場合

冊子を affiliate 共通で配るなら、以下のような owner-side placeholder に一段置き換えてもよい。

```text
{{warriorplus_affiliate_link}} -> [INSERT YOUR WARRIORPLUS AFFILIATE LINK]
```

---

## 6. Minimal links の扱い

Guidebook v1.0 では、手動配布用の標準リンクとして公開向け Minimal Telegram links を採用する。

理由:

- source-specific bot deep link より扱いが単純
- PDF へ貼り込みやすい
- 6言語で current documented value が確認できる

ただし、将来的に channel attribution を強めたい場合は、以下のような source-specific deep link へ差し替える余地がある。

```text
https://t.me/TrapDefenceBot?start=minimal_en
https://t.me/TrapDefenceBot?start=minimal_es
https://t.me/TrapDefenceBot?start=minimal_pt
https://t.me/TrapDefenceBot?start=minimal_ar
https://t.me/TrapDefenceBot?start=minimal_ko
https://t.me/TrapDefenceBot?start=minimal_ja
```

v1.0 の default は、あくまで public Telegram entry links である。

---

## 7. 置換してはいけないリンク

以下は public-facing affiliate handbook に入れない。

- WarriorPlus approval 用の review invite links
- Regular tier の one-time Telegram invite links
- affiliate attribution の入っていない raw WarriorPlus URL
- 古い coupon / trial 前提の legacy links

特に `WARRIORPLUS_APPROVAL_REPLY.md` 内の Regular invite links は review 用であり、配布冊子へ転用しない。

---

## 8. 推奨置換順

一番事故が少ない順番は以下。

1. `{{support_email}}` を置換
2. `{{brand_x_handle}}` を置換
3. `{{minimal_link_*}}` をすべて置換
4. 配布モードを決める
5. personalized 版なら `{{warriorplus_affiliate_link_*}}` を置換
6. `{{warriorplus_affiliate_link}}` を最後に置換
7. `{{` で全検索して未置換がないか確認

---

## 9. Generic 配布版の推奨処理

同じ PDF を複数 affiliate に配るなら、以下のようにするのが安全。

- `Minimal` 系は live link へ置換
- `support_email` と `brand_x_handle` も live value へ置換
- `{{warriorplus_affiliate_link_*}}` は残すか、`[INSERT YOUR WARRIORPLUS LINK]` に変換する
- `{{warriorplus_affiliate_link}}` も同様に個別入力用の明示 placeholder へ変換する

現在の `Complete Manuscript` は、実質この generic 配布モードに揃えてある。

これなら affiliate attribution を壊さずに済む。

---

## 10. Personalized 配布版の推奨処理

特定 affiliate に個別 PDF を渡すなら、以下のようにする。

1. その affiliate の言語別 WarriorPlus affiliate link を回収する
2. generic manuscript 上の `[INSERT YOUR ... WARRIORPLUS AFFILIATE LINK]` を対応する実リンクへ置換する
3. source placeholder 記法の原稿を使う場合は lane-specific placeholder も同じ値へ揃える
4. 最後に `[INSERT YOUR` と `{{` の両方で取り残しを確認する

このモードでは、最終 PDF に placeholder を残さない。

---

## 11. Owner-side Quick Reference

作業時に一緒に参照すると便利な current reference:

| Lang | Whop LP | WP Item Number |
| ------------- | ------------- | ------------- |
| EN | `https://whop.com/trapdefence/btc-en-warriorplus/` | `wso_vqp3r4` |
| ES | `https://whop.com/trapdefence/btc-es-warriorplus/` | `wso_lxd2wq` |
| PT | `https://whop.com/trapdefence/btc-pt-warriorplus/` | `wso_dqz789` |
| AR | `https://whop.com/trapdefence/btc-ar-warriorplus/` | `wso_zn9g7p` |
| KO | `https://whop.com/trapdefence/btc-ko-warriorplus/` | `wso_vm68d9` |
| JA | `https://whop.com/trapdefence/btc-ja-warriorplus/` | `wso_zv25jy` |

---

## 12. 最終チェック

置換後に以下を確認する。

1. generic 版なら `[INSERT YOUR` が意図どおり残っているか、personalized 版なら `[INSERT YOUR` と `{{` の両方が 0 件か
2. raw WarriorPlus URL を誤って public 版へ入れていないか
3. AR の Minimal link を勝手に綴り修正していないか
4. `pt` と `pt-br` の表記を混同していないか
5. `@trapdefence` を URL にしたい箇所と handle のまま残す箇所を取り違えていないか

---

## 13. 一言まとめ

Guidebook の置換作業では、`Minimal` 系は固定で埋め、`WarriorPlus affiliate link` 系は affiliate ごとに個別化する。このルールを守れば、導線と attribution の両方を安全に保てる。
