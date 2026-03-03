# アフィリエイトブックマーク対象 仕様（唯一の定義）

**このドキュメントが正。コードはここに合わせる。これ以上の齟齬は許さない。**

---

## 1. 対象の定義（3条件をすべて満たす者のみ）

| # | 条件 | 意味 | 実装 |
|---|------|------|------|
| 1 | **現在活動中のアフィリエイト** | 「自分の紹介リンク・コード」を「プラットフォーム名」とともに出している投稿を**直近**にした人。解説・相談・募集は含めない。 | 検索: 証拠語 AND プラットフォーム語（§2）。窓 EN 90分 / 他 24h。ネガティブで除外。 |
| 2 | **案件募集中は除外** | 案件募集・コラボ・求人・「おすすめ教えて」は対象外。 | 検索: §2 のネガティブ語で除外。 |
| 3 | **100人以上フォロワー** | 100 未満は対象外。 | ブックマークAPI: `AFFILIATE_RECRUIT_MIN_FOLLOWERS`（既定 100）でフィルタ。 |

上記以外は集めない。

---

## 2. 検索クエリの再定義（厳守）

### 2.1 意図

ヒットさせるのは**「今、自分の紹介リンク・コードを出している投稿」**に限定する。

- **証拠語（group1）**: 「自分の」紹介・コード・リンクを示す表現（use my code, link in bio, mi código, 招待コード, 紹介リンク 等）。
- **プラットフォーム語（group2）**: アフィリエイト・ASP の固有名（clickbank, hotmart, a8.net, 楽天アフィリエイト 等）。
- **必須**: 1ツイート内に **group1 のいずれか AND group2 のいずれか** が両方含まれること。片方だけはノイズのためヒットさせない。
- **除外**: 求人・コラボ募集・解説・相談・giveaway/airdrop・公式/ニュース系はネガティブで必ず除外する。

### 2.2 クエリ式（唯一の形）

```
( group1 OR ... ) AND ( group2 OR ... ) [AND ( group3 OR ... )] lang:{lang} -is:retweet -is:reply -neg1 -neg2 ...
```

- **結合**: group1 と group2 は **AND のみ**。group3（crypto/trading ニッチ）は有効時のみ追加し、同様に AND。
- **group3**: CryptoTrade Academy に合うニッチ絞り。`AFFILIATE_RECRUIT_CRYPTO_NICHE=0` で無効（2軸のみ）。
- **サフィックス**: `lang:{lang}` / `-is:retweet` / `-is:reply` / 全ネガティブ語（共通＋言語別）。
- **文字数**: 1 クエリ ≦ 512 文字（X API 上限）。収まらない場合は group 末尾から語を削る（group3 → group2 → group1 の順）。

### 2.3 証拠語（group1）・プラットフォーム語（group2）一覧

コードの `SEARCH_REQUIRED_GROUPS_BY_LANG` は**この表と完全一致**であること。

#### en
| group1（証拠語） | group2（プラットフォーム） |
|------------------|---------------------------|
| referral link, affiliate link, promo code, discount code, use my code, link in bio, sign up using, my referral | clickbank, shareasale, awin, rakuten advertising, cj affiliate, impact radius, amazon associates |

#### ja
| group1 | group2 |
|--------|--------|
| 招待コード, 紹介コード, プロモコード, 紹介リンク, アフィリエイト, プロフリンク, プロフィールのリンク, クーポンコード, 登録はこちら | a8.net, afb, バリューコマース, アクセストレード, 楽天アフィリエイト, amazonアソシエイト, インフォトップ, infotop, tips, brain |

#### ko
| group1 | group2 |
|--------|--------|
| 추천인 코드, 초대 코드, 가입 링크, 할인 코드, 프로모션 코드, 프로필 링크, 가입시, 제휴 링크 | 쿠팡 파트너스, 텐핑, 애드픽, 링크프라이스, 아마존 어소시에이트 |

#### es
| group1 | group2 |
|--------|--------|
| código de referido, mi código, código de descuento, enlace en mi bio, link en bio, enlace de afiliado, regístrate con, código promocional | hotmart, clickbank, awin, amazon afiliados, tradetracker, admitad |

#### pt
| group1 | group2 |
|--------|--------|
| código de indicação, use meu código, cupom de desconto, link na bio, link de afiliado, cadastre-se com, código promocional, meu cupom | hotmart, monetizze, eduzz, braip, amazon associados, awin |

#### ar
| group1 | group2 |
|--------|--------|
| كود خصم, رمز ترويجي, رابط الإحالة, استخدم كودي, الرابط في البايو, سجل من خلال, كود الدعوة | عرب كليكس, arabclicks, أمازون أفلييت, كليك بانك, clickbank, admitad |

#### 2.3.1 group3（crypto/trading ニッチ・任意）

CryptoTrade Academy 案件に合うアフィに限定するとき用。コードの `CRYPTO_TRADING_TERMS_BY_LANG` と一致させる。`AFFILIATE_RECRUIT_CRYPTO_NICHE=0` で無効。

| lang | group3 |
|------|--------|
| en | crypto, trading, bitcoin, btc, trader |
| ja | 仮想通貨, ビットコイン, トレード, 暗号資産, マーケット |
| ko | 암호화폐, 비트코인, 트레이딩, 코인, 거래 |
| es | crypto, trading, bitcoin, cripto, trader |
| pt | crypto, trading, bitcoin, cripto, trader |
| ar | بيتكوين, كريبتو, تداول, عملات, سوق |

### 2.4 ネガティブ語（除外する語句）

ヒットさせない。コードの `SEARCH_NEGATIVE_COMMON_TERMS` と `SEARCH_NEGATIVE_TERMS_BY_LANG` は**この一覧と完全一致**であること。

#### 全言語共通（解説・相談・依頼系）
- what is, how do i, recommend me

#### en
- colab, collab, hiring, job, agency, looking for, open to, which one, giveaway, airdrop, official, news, support, sponsor

#### ja
- 案件募集, 募集中, お仕事募集, おすすめ教えて, どれがいい, 何がおすすめ, プレゼント企画, プレゼント, ギブアウェイ, エアドロップ, 公式, ニュース, サポート, コラボ, PR依頼

#### ko
- 협찬 문의, 구인, 채용, 공식, 뉴스, 이벤트, 에어드랍, 리트윗, 팔로우, 콜라보, 협찬, 추천해줘, 뭐가 좋아, 어떤 게 좋아

#### es
- colab, busco trabajo, busco, agencia, qué es, cuál recomiendan, sorteio, giveaway, airdrop, oficial, noticias, soporte, patrocinador, trabajo

#### pt
- colab, vaga, emprego, agência, agencia, qual recomenda, o que é, sorteio, giveaway, airdrop, oficial, notícias, noticias, suporte, patrocínio, patrocinio

#### ar
- توظيف, وظيفة, وكالة, سحب, giveaway, airdrop, رسمي, أخبار, دعم, تعاون, رعاية, ما هو, أي واحد, انصحني

### 2.5 フォールバック

第1クエリ（上記 AND）でヒットが閾値以下のときのみ、1 回に限り緩和クエリ（OR 広め・ネガティブなし）を試す。**既定は閾値 0 ＝フォールバックは使わない**（緩和クエリは OR＋ネガティブなしのためガラクタ混入リスクあり）。`AFFILIATE_RECRUIT_LOW_HIT_FALLBACK_THRESHOLD` で変更可。

### 2.6 検索ロジックの根拠・禁止事項

- **文字数超過時**: group を末尾から削り、それでも収まらなければネガティブを削る。**最終手段**でも「group1 の先頭1語 AND group2 の先頭1語 ＋ サフィックス（ネガティブ含む）」の形を守る。固定文言（"affiliate program" "commission" のみ）に差し替えることは禁止（ガラクタ混入のため）。
- **AND 固定**: group1 と group2 の結合は **AND のみ**。コード上も env で OR に切り替えられない（`REQUIRED_GROUP_OPERATOR` は "AND" 固定）。
- **バケットモード**（`AFFILIATE_RECRUIT_SINGLE_QUERY=0`）: 1言語複数クエリ・OR のみの従来モード。§2 に非準拠でガラクタ混入リスクあり。ブックマーク用途では使わない（既定は 1 言語 1 本の AND クエリ）。
- **窓**: 呼び出し側（ブックマークAPI）が `windowMinutes` を渡す。EN 90分 / 他 24h（`affiliateRecruitConfig.js`）。検索モジュールのデフォルト 30 分は、`options.windowMinutes` が渡されない場合のみ。

---

## 3. ブックマークまでのパイプライン

1. 検索（nextToken で maxRounds ページ、窓 EN 90分 / 他 24h）
2. 同一 `author_id` は先頭1件のみ採用
3. リツイート除外（`referenced_tweets` で `retweeted` を除外）
4. フォロワー数 ≥ `AFFILIATE_RECRUIT_MIN_FOLLOWERS` でフィルタ
5. 残りから先頭 `BOOKMARK_CAP_PER_RUN` 件をブックマーク

---

## 4. 監査・ログ

- 検索: 実行クエリを `[affiliate-recruit-search] query` でログ。
- ブックマーク: 対象ツイート冒頭を `[affiliate-recruit-bookmark] bookmark` の `textPreview` でログ。

---

## 5. 参照コード

- 検索: `services/td/affiliateRecruitSearch.js` — §2 の group1/group2/ネガティブと**完全一致**させること。
- ブックマーク: `api/affiliate-recruit-bookmark.js`
- 設定: `config/affiliateRecruitConfig.js`
