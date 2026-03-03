# アフィリエイトリクルート 検索クエリ一覧

**クエリの唯一の定義は `AFFILIATE_RECRUIT_BOOKMARK_SPEC.md` §2（意図・式・2.3/2.4 一覧）。**  
コードは仕様書に合わせる。本ドキュメントは補足・参照用。

---

## 1. クエリの組み立て方

- **モード**: `AFFILIATE_RECRUIT_SINGLE_QUERY !== "0"` のとき **1 言語 1 本**（primary + 必要時だけ fallback）。Read 最小化。
- **Primary**: 2 グループ（証拠語 ＋ プラットフォーム語）を `REQUIRED_GROUP_OPERATOR`（既定 `AND`）で結合 ＋ サフィックス。
- **サフィックス**: `lang:{lang}` / `-is:retweet` / `-is:reply` / 言語別除外語（`-colab` 等）。
- **Fallback**: primary が 0〜2 件のときのみ 1 回だけ使用。OR 広め・除外語なし。
- **文字数**: 1 クエリ ≦ 480 文字（`BUZZWEAVE_QUERY_MAX_CHARS`）。X API 上限 512 に収まるよう調整。

---

## 2. 言語別キーワード（定義元: `services/td/affiliateRecruitSearch.js`）

### EN（英語）

| グループ | キーワード |
|----------|------------|
| 証拠語 (group1) | referral link, affiliate link, promo code, discount code, use my code, link in bio, sign up using, my referral |
| プラットフォーム (group2) | clickbank, shareasale, awin, rakuten advertising, cj affiliate, impact radius, amazon associates |
| 除外語 | colab, collab, hiring, job, agency, giveaway, airdrop, official, news, support, looking for, open to, sponsor |

### JA（日本語）

| グループ | キーワード |
|----------|------------|
| 証拠語 | 招待コード, 紹介コード, プロモコード, 紹介リンク, アフィリエイト, プロフリンク, プロフィールのリンク, クーポンコード, 登録はこちら |
| プラットフォーム | a8.net, afb, バリューコマース, アクセストレード, 楽天アフィリエイト, amazonアソシエイト, インフォトップ, infotop, tips, brain |
| 除外語 | 案件募集, お仕事募集, プレゼント企画, プレゼント, ギブアウェイ, エアドロップ, 公式, ニュース, サポート, コラボ, PR依頼 |

### KO（韓国語）

| グループ | キーワード |
|----------|------------|
| 証拠語 | 추천인 코드, 초대 코드, 가입 링크, 할인 코드, 프로모션 코드, 프로필 링크, 가입시, 제휴 링크 |
| プラットフォーム | 쿠팡 파트너스, 텐핑, 애드픽, 링크프라이스, 아마존 어소시에이트 |
| 除外語 | 협찬 문의, 구인, 채용, 공식, 뉴스, 이벤트, 에어드랍, 리트윗, 팔로우, 콜라보, 협찬 |

### ES（スペイン語）

| グループ | キーワード |
|----------|------------|
| 証拠語 | código de referido, mi código, código de descuento, enlace en mi bio, link en bio, enlace de afiliado, regístrate con, código promocional |
| プラットフォーム | hotmart, clickbank, awin, amazon afiliados, tradetracker, admitad |
| 除外語 | colab, busco trabajo, agencia, sorteio, giveaway, airdrop, oficial, noticias, soporte, patrocinador, trabajo |

### PT（ポルトガル語）

| グループ | キーワード |
|----------|------------|
| 証拠語 | código de indicação, use meu código, cupom de desconto, link na bio, link de afiliado, cadastre-se com, código promocional, meu cupom |
| プラットフォーム | hotmart, monetizze, eduzz, braip, amazon associados, awin |
| 除外語 | colab, vaga, emprego, agência, agencia, sorteio, giveaway, airdrop, oficial, notícias, noticias, suporte, patrocínio, patrocinio |

### AR（アラビア語）

| グループ | キーワード |
|----------|------------|
| 証拠語 | كود خصم, رمز ترويجي, رابط الإحالة, استخدم كودي, الرابط في البايو, سجل من خلال, كود الدعوة |
| プラットフォーム | عرب كليكس, arabclicks, أمازون أفلييت, كليك بانك, clickbank, admitad |
| 除外語 | توظيف, وظيفة, وكالة, سحب, giveaway, airdrop, رسمي, أخبار, دعم, تعاون, رعاية |

---

## 3. 実際のクエリ文字列を確認する

現在のビルド結果（primary / fallback）は次のコマンドで一覧できる。

```bash
node scripts/affiliate-recruit-queries.js
```

環境変数で挙動を変えられる例:

- `AFFILIATE_RECRUIT_SINGLE_QUERY=0` … バケット分割モード（1 言語複数クエリ）
- `AFFILIATE_RECRUIT_REQUIRED_GROUP_OPERATOR=OR` … 2 グループを OR で結合（広め。既定は AND）
- `AFFILIATE_RECRUIT_LOW_HIT_FALLBACK_THRESHOLD=2` … この件数以下で fallback を使用（0 で無効）

---

## 4. 参照

- 検索・送信フロー: `AFFILIATE_RECRUIT_EN_LINE_SPEC.md` / `AFFILIATE_RECRUIT_REGIONS_LINE_SPEC.md`
- キーワード・除外語の定義: `services/td/affiliateRecruitSearch.js`（`SEARCH_REQUIRED_GROUPS_BY_LANG`, `SEARCH_NEGATIVE_TERMS_BY_LANG`）
