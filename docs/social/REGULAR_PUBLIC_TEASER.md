# Regular Briefing — public teaser (X / LP / JV)

## 目的

- **本番と同じ EN Regular フォーマッター**で本文を生成し、**公開しても価値が毀損しにくい範囲**で切り出す。
- 実データではなく **イラスト用デモスナップショット**固定（再現性のあるスクショ用）。

## 使い方

```bash
npm run teaser:regular-public
```

スレッド用に分割行も出す:

```bash
node scripts/print-regular-public-teaser.js --thread
```

カット位置（デフォルトは Data-Backed Evidence の手前）:

```bash
node scripts/print-regular-public-teaser.js --stop psych
# data_backed | psych | trap （省略時 data_backed）
```

コードから:

```javascript
const {
  formatRegularBriefingPublicTeaser,
  splitForXThread,
} = require('../../services/social/regularPublicTeaser.en.js');

const text = formatRegularBriefingPublicTeaser({ stopAt: 'data_backed' });
const posts = splitForXThread(text, 270);
```

## 公開時の注意

- 投稿・LP・JVには **バナー文（PUBLIC SAMPLE / not live data）**を残す（誤解防止）。
- **単ツイートに収まらない**ことが多い → 画像化、スレッド、または「1/3」連投。
- コンプライアンス: 文末 **Not financial advice** を維持。

## メンテナンス

`regular.en.js` のセクション見出しが変わり、`📊 Data-Backed Evidence` が消えた場合は  
`services/social/regularPublicTeaser.en.js` の `sliceTeaserFromFullRegular` のマーカーを更新する。
