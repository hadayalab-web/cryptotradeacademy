# X API アフィリエイター検索設計ドキュメント

## 1. 目的と運用制約

### 目的
- X上で、実際に紹介活動（アフィリエイト・リファラル）を行っている実働アフィリエイターを高精度で抽出する。
- 「open to collab」や「案件探し中」などの単なる案件待ち層は除外する。

### 運用制約
- **コスト重視**: 1言語あたり基本1ページの取得を前提とする。
- **文字数制限**: クエリ長は480文字以内。
- **クエリ構文**: X検索構文を活用（例: `lang:xx -is:retweet -is:reply`）。
- **判定基準**: 「既存アフィ活動の証拠語」や「ASP/プラットフォーム名」の有無を重視。

---

## 2. 言語別キーワード定義

各言語における「紹介活動の証拠語（Proof Terms）」、「ASP・基盤・競合プラットフォーム語（Platform Terms）」、「除外語（Negative Terms）」の定義です。

### 英語 (en)
- **証拠語**: referral link, use my code, promo code, discount code, link in bio, affiliate link, sign up using, my referral
- **プラットフォーム語**: clickbank, shareasale, awin, rakuten advertising, cj affiliate, impact radius, amazon associates
- **除外語**: colab, collab, hiring, job, agency, giveaway, airdrop, official, news, support, looking for, open to, sponsor

### 日本語 (ja)
- **証拠語**: 招待コード, 紹介コード, プロモコード, 紹介リンク, アフィリエイト, プロフリンク, プロフィールのリンク, クーポンコード, 登録はこちら
- **プラットフォーム語**: a8.net, afb, バリューコマース, アクセストレード, 楽天アフィリエイト, amazonアソシエイト, インフォトップ, infotop, tips, brain
- **除外語**: 案件募集, お仕事募集, プレゼント企画, ギブアウェイ, エアドロップ, 公式, ニュース, サポート, コラボ, PR依頼

### 韓国語 (ko)
- **証拠語**: 추천인 코드, 초대 코드, 가입 링크, 할인 코드, 프로모션 코드, 프로필 링크, 가입시, 제휴 링크
- **プラットフォーム語**: 쿠팡 파트너스, 텐핑, 애드픽, 링크프라이스, 아마존 어소시에이트
- **除外語**: 협찬 문의, 구인, 채용, 공식, 뉴스, 이벤트, 에어드랍, 리트윗, 팔로우, 콜라보, 협찬

### スペイン語 (es)
- **証拠語**: código de referido, mi código, código de descuento, enlace en mi bio, link en bio, enlace de afiliado, regístrate con, código promocional
- **プラットフォーム語**: hotmart, clickbank, awin, amazon afiliados, tradetracker, admitad
- **除外語**: colab, busco trabajo, agencia, sorteio, giveaway, airdrop, oficial, noticias, soporte, patrocinador, trabajo

### ポルトガル語 (pt)
- **証拠語**: código de indicação, use meu código, cupom de desconto, link na bio, link de afiliado, cadastre-se com, código promocional, meu cupom
- **プラットフォーム語**: hotmart, monetizze, eduzz, braip, amazon associados, awin
- **除外語**: colab, vaga, emprego, agência, sorteio, giveaway, airdrop, oficial, notícias, suporte, patrocínio

### アラビア語 (ar)
- **証拠語**: كود خصم, رمز ترويجي, رابط الإحالة, استخدم كودي, الرابط في البايو, سجل من خلال, كود الدعوة
- **プラットフォーム語**: عرب كليكس, arabclicks, أمازون أفلييت, كليك بانك, clickbank, admitad
- **除外語**: توظيف, وظيفة, وكالة, سحب, giveaway, airdrop, رسمي, أخبار, دعم, تعاون, رعاية

---

## 3. 検索クエリ設計 (480文字以内)

精度と取得件数のバランスに応じて3種類のクエリを設計しています。

### 英語 (en)
- **[Strict / 高精度優先]** (精度: 5, ノイズリスク: 1)
  ```text
  lang:en -is:retweet -is:reply ("referral link" OR "affiliate link" OR "promo code") ("clickbank" OR "shareasale" OR "awin" OR "amazon associates" OR "impact radius") -collab -hiring -job -giveaway -airdrop -official -news -support -"open to" -"looking for"
  ```
- **[Balanced / バランス型]** (精度: 4, ノイズリスク: 2)
  ```text
  lang:en -is:retweet -is:reply ("referral link" OR "affiliate link" OR "use my code" OR "promo code" OR "discount code" OR "link in bio") -collab -hiring -job -agency -giveaway -airdrop -official -news -support -"looking for"
  ```
- **[Wide / 件数優先]** (精度: 2, ノイズリスク: 4)
  ```text
  lang:en -is:retweet -is:reply ("referral" OR "affiliate" OR "promo code" OR "discount" OR "link in bio") (link OR code) -collab -hiring -job -agency -giveaway -airdrop -official -news -support
  ```
- **主な誤検知パターン**: Uberなどの単発紹介コードのシェア、公式ブランドの割引ツイート、スパムボット。

### 日本語 (ja)
- **[Strict / 高精度優先]** (精度: 5, ノイズリスク: 1)
  ```text
  lang:ja -is:retweet -is:reply ("招待コード" OR "紹介コード" OR "プロモコード" OR "アフィリエイト") ("a8.net" OR "afb" OR "バリューコマース" OR "楽天アフィリエイト" OR "インフォトップ" OR "amazonアソシエイト") -案件募集 -お仕事募集 -プレゼント企画 -ギブアウェイ -エアドロップ -公式 -ニュース -サポート
  ```
- **[Balanced / バランス型]** (精度: 4, ノイズリスク: 3)
  ```text
  lang:ja -is:retweet -is:reply ("招待コード" OR "紹介コード" OR "プロモコード" OR "紹介リンク" OR "クーポンコード" OR "登録はこちら") -案件募集 -お仕事募集 -プレゼント -ギブアウェイ -エアドロップ -公式 -ニュース -サポート -コラボ
  ```
- **[Wide / 件数優先]** (精度: 3, ノイズリスク: 4)
  ```text
  lang:ja -is:retweet -is:reply ("招待" OR "紹介" OR "プロモ" OR "クーポン" OR "アフィ") ("コード" OR "リンク" OR "登録" OR "プロフ") -案件募集 -お仕事募集 -プレゼント -ギブアウェイ -エアドロップ -公式 -ニュース -サポート -コラボ
  ```
- **主な誤検知パターン**: ソシャゲ招待コードの単発シェア、企業案件のPR投稿、ポイ活の自動投稿bot。

### 韓国語 (ko)
- **[Strict / 高精度優先]** (精度: 5, ノイズリスク: 1)
  ```text
  lang:ko -is:retweet -is:reply ("추천인 코드" OR "초대 코드" OR "할인 코드" OR "제휴 링크") ("쿠팡 파트너스" OR "텐핑" OR "애드픽" OR "링크프라이스") -협찬 -구인 -채용 -공식 -뉴스 -이벤트 -에어드랍 -콜라보
  ```
- **[Balanced / バランス型]** (精度: 4, ノイズリスク: 2)
  ```text
  lang:ko -is:retweet -is:reply ("추천인 코드" OR "초대 코드" OR "가입 링크" OR "할인 코드" OR "프로모션 코드" OR "프로필 링크") -협찬 -구인 -채용 -공식 -뉴스 -이벤트 -에어드랍 -콜라보
  ```
- **[Wide / 件数優先]** (精度: 2, ノイズリスク: 4)
  ```text
  lang:ko -is:retweet -is:reply ("추천인" OR "초대" OR "할인" OR "프로모션" OR "가입") ("코드" OR "링크" OR "프로필") -협찬 -구인 -채용 -공식 -뉴스 -이벤트 -에어드랍 -콜라보
  ```
- **主な誤検知パターン**: アプリのポイント還元コード共有、公式アカウントのプロモーション、仮想通貨取引所のスパムボット。

### スペイン語 (es)
- **[Strict / 高精度優先]** (精度: 4, ノイズリスク: 1)
  ```text
  lang:es -is:retweet -is:reply ("código de referido" OR "enlace de afiliado" OR "código promocional") ("hotmart" OR "clickbank" OR "awin" OR "admitad" OR "amazon afiliados") -colab -trabajo -agencia -sorteo -giveaway -airdrop -oficial -noticias -soporte
  ```
- **[Balanced / バランス型]** (精度: 3, ノイズリスク: 3)
  ```text
  lang:es -is:retweet -is:reply ("código de referido" OR "mi código" OR "código de descuento" OR "enlace en mi bio" OR "enlace de afiliado") -colab -trabajo -agencia -sorteo -giveaway -airdrop -oficial -noticias -soporte -patrocinador
  ```
- **[Wide / 件数優先]** (精度: 2, ノイズリスク: 5)
  ```text
  lang:es -is:retweet -is:reply ("referido" OR "afiliado" OR "descuento" OR "promocional" OR "bio") ("código" OR "enlace" OR "link") -colab -trabajo -agencia -sorteo -giveaway -airdrop -oficial -noticias -soporte
  ```
- **主な誤検知パターン**: ユーザー間のUberコード共有、ブランド発信の割引コード、自動化されたクーポンbot。

### ポルトガル語 (pt)
- **[Strict / 高精度優先]** (精度: 5, ノイズリスク: 1)
  ```text
  lang:pt -is:retweet -is:reply ("código de indicação" OR "link de afiliado" OR "cupom de desconto") ("hotmart" OR "monetizze" OR "eduzz" OR "braip" OR "awin") -colab -vaga -emprego -agência -sorteio -giveaway -airdrop -oficial -notícias
  ```
- **[Balanced / バランス型]** (精度: 4, ノイズリスク: 3)
  ```text
  lang:pt -is:retweet -is:reply ("código de indicação" OR "use meu código" OR "cupom de desconto" OR "link na bio" OR "link de afiliado") -colab -vaga -emprego -agência -sorteio -giveaway -airdrop -oficial -notícias -suporte
  ```
- **[Wide / 件数優先]** (精度: 2, ノイズリスク: 5)
  ```text
  lang:pt -is:retweet -is:reply ("indicação" OR "afiliado" OR "desconto" OR "promocional" OR "bio") ("código" OR "link" OR "cupom") -colab -vaga -emprego -agência -sorteio -giveaway -airdrop -oficial -notícias -suporte
  ```
- **主な誤検知パターン**: iFoodなどの単発クーポンシェア、公式ショップの宣伝、ギャンブル(Bet系)のスパムアフィリエイト。

### アラビア語 (ar)
- **[Strict / 高精度優先]** (精度: 4, ノイズリスク: 2)
  ```text
  lang:ar -is:retweet -is:reply ("كود خصم" OR "رابط الإحالة" OR "كود الدعوة") ("عرب كليكس" OR "arabclicks" OR "admitad" OR "clickbank") -توظيف -وظيفة -وكالة -سحب -giveaway -airdrop -رسمي -أخبار -دعم
  ```
- **[Balanced / バランス型]** (精度: 3, ノイズリスク: 3)
  ```text
  lang:ar -is:retweet -is:reply ("كود خصم" OR "رمز ترويجي" OR "رابط الإحالة" OR "استخدم كودي" OR "الرابط في البايو") -توظيف -وظيفة -وكالة -سحب -giveaway -airdrop -رسمي -أخبار -دعم -تعاون
  ```
- **[Wide / 件数優先]** (精度: 2, ノイズリスク: 4)
  ```text
  lang:ar -is:retweet -is:reply ("خصم" OR "ترويجي" OR "إحالة" OR "بايو") ("كود" OR "رمز" OR "رابط") -توظيف -وظيفة -وكالة -سحب -giveaway -airdrop -رسمي -أخبار -دعم -تعاون
  ```
- **主な誤検知パターン**: Noonなどの単発クーポン共有、公式ストアの自動割引投稿、中身のないスパム的なクーポンbot。

---

## 4. 実験プラン

低コスト（1ページ取得）を前提とした初回の検証手順と評価指標です。

### 実行ステップ
1. 各言語の **Balanced** クエリを使用して、APIで1ページ分（例: 100件）のツイートを取得する。
2. 取得したツイートの投稿者プロフィールと直近のツイートを確認し、「実働アフィリエイター」か「ノイズ（一般人、公式、Bot）」かを手動またはLLMで判定する。
3. 1ページあたりの有効アフィリエイター率（`affiliateEligible / page`）を算出する。
4. 有効率が目標（例: 40%以上）に満たない場合は、誤検知パターンの単語を特定してクエリの除外語に追加するか、**Strict** クエリに切り替える。
5. 有効率は高いが取得件数が少なすぎる場合は、**Wide** クエリに切り替えてノイズの増加量を測定する。

### 判定・評価指標 (Metrics)
- `affiliateEligible_per_page`: 1ページあたりの有効アフィリエイターの割合
- `noise_ratio_by_category`: ノイズのカテゴリ別割合（単発一般人、公式、Botなど）
- `cost_per_acquired_affiliate`: 1有効アフィリエイターあたりのAPI取得コスト

### 終了・切り替え条件 (Stop Conditions)
- `affiliateEligible_per_page` が安定して 50% を超えるクエリが完成した時点。
- 言語ごとのクエリ長がAPI制限（480文字）に到達し、これ以上除外語を追加できない時点。
- 1ページ取得時の検証コスト予算の上限に到達した時点。
