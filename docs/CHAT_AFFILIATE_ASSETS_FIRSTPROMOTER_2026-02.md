# チャット要約：アフィリエイト Assets / FirstPromoter 実装（2026-02）

---

## 1. DEFEND50 の扱い

- **DEFEND50 はアフィリ経由でしか付与されない特別なコード**
- 一般公開・他チャネルでの配布はしない
- AFFILIATE_FAQ（6言語）に Q&A 追加：「DEFEND50 は他チャネルでも使える？」→ No
- AFFILIATE_STRATEGY にも注記を追記

---

## 2. Whop LP リンクとアフィリ導線

- **アフィリリンク経由** → 成約紐付け＋DEFEND50 の運用と整合
- **Whop 直リンク**（trapdefence/btc-regular-*）をアフィリ用コンテンツに載せると紐付けが崩れる
- FirstPromoter Assets は `{{promotion.referral_link}}` のみ使用。Whop 直リンクは載せていない（設計OK）

---

## 3. ショート動画スクリプト＋SRT（6言語）

- **docs/AFFILIATE_SHORT_VIDEO_SCRIPTS_6LANG.md** 作成
- 6言語スクリプト（EN/ES/PT/AR/KO/JA）＋Minimal TG リンク挿入済み
- 6言語フル SRT（コピペ即使用可能）
- FIRSTPROMOTER_ASSETS_COPY_PASTE.md に SHORT_VIDEO_SCRIPT_SRT_*（6言語）＋SHORT_VIDEO_GUIDE を Asset として追加

---

## 4. START_HERE の表示方法

- FirstPromoter の **CUSTOM** セクションで実装
- ダッシュボード設定：TOP MENU ITEMS VISIBILITY → **CUSTOM** に Title と Description を設定
- アフィリエイターはログイン後に **勝手に表示** される（Home 上に CUSTOM ブロックとして表示）

---

## 5. START_HERE 実装手順

1. FirstPromoter → 対象キャンペーン → **Dashboard** → **CUSTOM** を開く
2. **Title**: START HERE / EMPIEZA AQUÍ 等
3. **Description**: START_HERE 本文をコピペ（`{{promotion.referral_link}}`・`{{company.promoters_login}}` はそのまま）
4. **Save**

---

## 6. 他5言語の START_HERE 実装

- **docs/FIRSTPROMOTER_START_HERE_5LANG_COPYPASTE.md** 作成
- ES / PT / AR / KO / JA の CUSTOM Description 用コピペブロックを用意
- 各キャンペーンごとに同手順で CUSTOM に貼り付け

---

## 7. 関連ファイル

| ファイル | 用途 |
|----------|------|
| `docs/FIRSTPROMOTER_ASSETS_COPY_PASTE.md` | 全 Assets のマスター。コピペ元 |
| `docs/FIRSTPROMOTER_START_HERE_5LANG_COPYPASTE.md` | 他5言語 START HERE の CUSTOM 用コピペ |
| `docs/AFFILIATE_SHORT_VIDEO_SCRIPTS_6LANG.md` | ショート動画スクリプト＋SRT＋ガイド |

---

## 8. 導線フロー（再掲）

DM → サインアップ LP → ウェルカム → START_HERE（CUSTOM）→ Assets（TERMS, FAQ, スワイプ, 証言, 成功事例, 購入案内, X コピー, ショート動画）→ 反応が来たら ref link + DEFEND50
