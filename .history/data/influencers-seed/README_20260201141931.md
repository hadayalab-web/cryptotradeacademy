# インフルエンサーシード（一からリストを作り直す用）

- 各言語ごとに `influencers-{lang}.json` を用意する。
- 形式: `[ { "username": "スクリーン名（@なし）", "tweetId": "ツイートID（18〜19桁）" }, ... ]`
- 実行: `node scripts/rebuild-influencer-list-from-seed.js --lang en` または `--all`
- 詳細: `docs/INFLUENCER_LIST_REBUILD_FROM_SCRATCH_2026-01-31.md`

**注意**: ここにある tweetId は X 上に実在するものを入れること。スクリプトが X API で検証し、実在するものだけ KV に保存する。

---

## 一言語ずつリストを完成させる（推奨）

Grok + Gemini 併用で候補取得 → X API で品質チェック → このシードに追記。

1. **1言語ずつ実行**（目標数に達するまで複数回可）:
   ```bash
   node scripts/build-influencer-list-per-lang.js --lang en
   node scripts/build-influencer-list-per-lang.js --lang en --batch 30   # 1回あたり増やしたい場合
   ```
2. **KV へ反映**:
   ```bash
   node scripts/rebuild-influencer-list-from-seed.js --lang en
   ```

**言語コード**: `en`, `es`, `pt-br`, `ar`, `ja`, `ko`

**初回ストック目標（参考）**: en 200, pt-br 120, ko 100, es 80, ja 80, ar 40（合計 620）。`docs/INITIAL_STOCK_PLAN_QUOTE_REPOST_2026-02-01.md`
