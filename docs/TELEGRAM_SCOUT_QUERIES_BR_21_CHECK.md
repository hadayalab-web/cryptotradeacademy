# 21クエリリスト 誤りチェック結果

スプレッドシート（ターゲット/意図・PTクエリ・英語クエリ）の検証です。

---

## ✅ 問題なしと判断した点

| 項目 | 内容 |
|------|------|
| **site: の書き方** | `site:t.me "br"` / `site:telemetr.io "br"` / `site:tgstat.com "br"` で統一されており問題なし。 |
| **キーワードの引用** | 語句が "..." で囲まれており、検索として妥当。 |
| **意図との対応** | 基本→crypto、シグナル→sinais、メンター→mentoria など、ターゲットとクエリの対応は適切。 |
| **統計サイト** | telemetr で "membros"、tgstat で "estatísticas" は PT-BR として自然。 |
| **"sala vip"** | 「VIP部屋」の PT として正しい。 |
| **"dono" / "admin" / "contato"** | 管理者・連絡先狙いとして適切。 |

---

## ⚠ 要確認（綴り・アクセント）

PT-BR ではアクセント付きが正表記です。スプレッドシートで次のようになっているか確認してください。

| 語 | 正 | 避けたい例 |
|----|-----|------------|
| conteúdo | **conteúdo** (ú) | conteudo |
| comissão | **comissão** (ã) | comissao |
| dólar | **dólar** (ó) | dolar |
| grátis | **grátis** (á) | gratis |
| análise | **análise** (á) | analise |
| estatísticas | **estatísticas** (á, í) | estatisticas |
| exclusivo | **exclusivo** | そのままで可 |

※ Google はアクセントなしでもヒットすることはありますが、現地表記に合わせるなら上記推奨。

---

## 🔍 英語列（D列）の確認

- **"owner" "official"** … 問題なし。
- **"signals" "VIP room"** … 問題なし。
- **"statistics"** (tgstat) … 問題なし。
- **"members"** (telemetr) … 問題なし。
- 全体として `site:t.me "br"` のまま英語キーワードで統一されており、意図も一致していれば誤りはなさそう。

---

## 📋 番号・意図との対応ざっくりチェック

| No. | 意図（想定） | PT で押さえたい語 | 備考 |
|-----|--------------|-------------------|------|
| 1 | 基本 Crypto | crypto, admin | OK |
| 2 | シグナル/VIP | sinais, vip / sala vip | OK |
| 3 | 不労所得/マーケ | renda passiva, marketing | OK |
| 4 | メンター/仮想通貨 | mentoria, crypto | OK |
| 5 | Solana | solana, comunidade | OK |
| 6 | 決済/P2P | pix, p2p | OK |
| 7 | Binance | binance, grupo | OK |
| 8 | 専門家/連絡先 | especialista, contato | OK |
| 9 | telemetr | cripto, membros | OK |
| 10 | tgstat | bitcoin, estatísticas | OK |
| 11 | Whop | whop.com | OK |
| 12 | FirstPromoter | firstpromoter | OK |
| 13 | Kiwify | kiwify, crypto | OK |
| 14 | コンテンツ販売 | venda, conteúdo, acesso | conteúdo の ú 要確認 |
| 15 | 独占メンター | mentoria, exclusivo, contato | OK |
| 16 | アフィリ募集 | afiliados, comissão, dólar, vagas | アクセント要確認 |
| 17 | 副収入/パートナー | renda extra, parceria | OK |
| 18 | 無料分析/オーナー | criptomoedas, análise, grátis, dono | アクセント要確認 |
| 19 | 投資/シグナル/利益 | investimentos, sinais, cripto, lucro | OK |
| 20 | Whop提携 | parceiro, whop, contato | OK |
| 21 | ドル報酬アフィリ | link de afiliado, receba em dólar | dólar の ó 要確認 |

---

## 結論

- **致命的な誤り**は見当たりません。
- **確認推奨**は、C列のアクセント付き綴り（conteúdo, comissão, dólar, grátis, análise, estatísticas）がスプレッドシート上で正しく入っているか一点だけです。
- 意図・PT・英語の対応も取れており、このまま運用して問題ない内容です。
