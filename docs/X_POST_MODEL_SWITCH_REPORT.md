# X投稿モデル切り替えレポート

実施日: 2026-02-11

---

## 1. 修正したファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `services/ai/gpt5mini.js` | MODEL デフォルトを `gpt-5-mini` → `gpt-4o-mini` に変更 |

---

## 2. MODEL の最終値

| 項目 | 値 |
|------|-----|
| デフォルト | `gpt-4o-mini` |
| バックアップ切り替え | `GPT_MODEL_X_POST=gpt-5-mini` で環境変数指定時に切り替え可能 |

---

## 3. gpt-4o-mini で生成したサンプル（ja/en minimal/regular 各1本）

| カテゴリ | body |
|----------|------|
| **ja minimal** | 心臓がバクバクし、手汗がにじむ。クジラが近づいてくる！ 無料のシールド（Minimal）を手に入れよう！ https://example.com/vsl #BTC 🛡 |
| **ja regular** | 心臓が締め付けられる、恐怖の冷たい汗が流れる。クジラの餌にされる運命。軽装備では死ぬ、今すぐフル防御（Regular）を手に入れろ！ https://example.com/vsl #BTC 🛡 |
| **en minimal** | Heart racing, palms sweaty as the trap snaps shut. The algo lurks, ready to suck your gains. Grab your free Minimal shield now! https://example.com/vsl #BTC ⚡ |
| **en regular** | Heart racing, sweat dripping as you watch the whale breach, ready to swallow you whole. Light armor will lead to your doom. Get Full Defence (Regular) now! https://example.com/vsl #BTC 🛡 |
