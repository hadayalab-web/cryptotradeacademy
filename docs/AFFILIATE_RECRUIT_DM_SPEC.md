# アフィリエイトリクルート DM 仕様書（募集要項・プロ版）

## 1. 方針

- **コピーではなく募集要項**で送る。痛み→救済は使わず、条件・商材・参加条件・CTA をプロ用語で統一。
- **6言語で行構造・情報密度・UI幅・トーンを完全統一**（EN 北米以外 / ES 南米 / PT 南米 / AR / KO / JA）。X DM 縦リズムに最適化。
- プレースホルダー: `{inviteUrl}`, `{whopAffiliateUrl}`, `{handle}`。呼び出し元の渡し方変更なし。

## 2. 記載内容

| 項目 | 内容 |
|------|------|
| オープナー | 特別招待の選出（1行） |
| プログラム名 | Trap Defence BTC — Affiliate Program / 募集要項 等 |
| Commission | 50% recurring |
| Assets | Complete promotional copy package (DM scripts, post text, descriptions) |
| Product | BTC market briefing via Telegram (sold on Whop) |
| Participation | No specialized skills required; use your existing distribution channels |
| Registration | {inviteUrl} |

## 3. テンプレート仕様

- **ファイル**: `config/affiliateRecruitDmTemplates.js`
- **オブジェクト**: `DM_TEMPLATES`（キー: en, es, pt, ar, ko, ja）
- **置換**: `fillRecruitDmTemplate(lang, { inviteUrl, whopAffiliateUrl, handle })` で `{inviteUrl}` 等を置換。
- **実装**: 本仕様書の「6言語・X DM最適化・プロ版」をそのまま `DM_TEMPLATES` に反映済み。

## 4. 文案（6言語・プロ版）— 実装済み

現在の `DM_TEMPLATES` は以下の構造で統一されている。

- 1行目: 特別招待の選出文
- 空行
- 見出し: Trap Defence BTC — [プログラム名]
- • Commission: 50% recurring
- • Assets/Materials/提供物: プロモ用コピー一式（DM・投稿文・説明文）
- • Product/商材: BTC market briefing via Telegram (sold on Whop)
- • Participation/参加条件: 特別なスキル不要・既存チャネルで運用可能
- • Registration/登録: {inviteUrl}

（全文は `config/affiliateRecruitDmTemplates.js` を参照。）

## 5. コード側

- `fillRecruitDmTemplate` の引数・戻り値・プレースホルダー名は変更なし。
- `api/affiliate-recruit-run.js` の呼び出しはそのまま。

## 6. 運用メモ

- 報酬率・アセット内容・参加条件を変える場合は、本仕様書と `DM_TEMPLATES` を同期して更新する。
