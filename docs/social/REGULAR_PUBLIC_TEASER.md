# Regular Briefing — public teaser (X / LP / JV)

## X 自動投稿（`/api/x-post-regular-teaser`）

Minimal と同型で、**6言語 × 1日4回（UTC 0,6,12,18 の :23）** に Regular の **途中まで（データ根拠セクション手前）** を **親ツイート**に投稿し、**1リプライ**で **LP + Minimal（Telegram）** へ誘導します。親ツイート側は **ツァイガルニク用フッター**付き。  
`x-post-minimal`（:08）の直後にバッファを置いたスケジュールです。

**「チラ見せは Regular のみ」に寄せる**: メインの覗きはこのエンドポイントのみにして、別途 `x-post-minimal` を止めたい場合は `X_POST_MINIMAL_ENABLED=0`（既存の Minimal X 投稿をオフ）。

| 環境変数 | 説明 |
|----------|------|
| `X_POST_REGULAR_TEASER_ENABLED` | `0` で無効化 |
| `REGULAR_TEASER_USE_LIVE_SNAPSHOT` | `0` のとき常にデモスナップショット（`PUBLIC SAMPLE`） |
| `REGULAR_TEASER_UPGRADE_URL` | 任意。設定時は**親ツイート**の CTA に URL を直貼り（リプとは別。未設定なら「bio」系文言） |
| `REGULAR_TEASER_LP_URL` | **リプライの LP** の共通フォールバック |
| `LP_URL_EN` / `LP_URL_ES` / `LP_URL_PT_BR` / `LP_URL_AR` / `LP_URL_JA` / `LP_URL_KO` | 言語別 LP（上書き）。未設定時は `REGULAR_TEASER_LP_URL` |
| Minimal TG | `config/minimalTelegramInviteLinks.js`（リプに自動で同言語リンク） |

手動テスト: `GET /api/x-post-regular-teaser` + `Authorization: Bearer CRON_SECRET`（本番KV・X資格情報が必要）。

## Carrd「サンプルを見る」リンク文言（各言語）

| Lang | 例（テキストリンク） |
|------|----------------------|
| EN | See a sample Regular briefing → |
| ES | Ver una muestra del Regular briefing → |
| PT-BR | Ver uma amostra do Regular briefing → |
| AR | شاهد عيّنة من Regular briefing → |
| KO | Regular 브리핑 샘플 보기 → |
| JA | Regularブリーフィングのサンプルを見る → |

## 目的

- **本番どおりの各言語 Regular フォーマッター**で本文を生成し、**公開しても価値が毀損しにくい範囲**で切り出す。
- 実データではなく **イラスト用デモスナップショット**固定（再現性のあるスクショ用）。

## 使い方

```bash
npm run teaser:regular-public
```

言語: `en`（既定）, `es`, `pt-br`, `ar`, `ko`, `ja`

```bash
node scripts/print-regular-public-teaser.js --lang ja
node scripts/print-regular-public-teaser.js --lang es --thread
```

スレッド用に分割行も出す:

```bash
node scripts/print-regular-public-teaser.js --thread
```

カット位置（デフォルトは Data-Backed / 各言語の「データ根拠」節 の手前）:

```bash
node scripts/print-regular-public-teaser.js --stop psych
# data_backed | psych | trap （省略時 data_backed）
```

コードから（全言語）:

```javascript
const {
  formatRegularBriefingPublicTeaser,
  splitForXThread,
  SUPPORTED_LANGS,
} = require('../../services/social/regularPublicTeaserCore.js');

const text = formatRegularBriefingPublicTeaser('ja', { stopAt: 'data_backed' });
const posts = splitForXThread(text, 270);
```

後方互換（EN のみ省略形）:

```javascript
const { formatRegularBriefingPublicTeaser } = require('../../services/social/regularPublicTeaser.en.js');
const text = formatRegularBriefingPublicTeaser({ stopAt: 'data_backed' });
```

## 公開時の注意

- 投稿・LP・JVには **バナー文（PUBLIC SAMPLE / not live data）**を残す（誤解防止）。
- **単ツイートに収まらない**ことが多い → 画像化、スレッド、または「1/3」連投。
- コンプライアンス: 文末 **Not financial advice** を維持。

## メンテナンス

各言語の `regular.<lang>.js` で `📊 …`（データ根拠節）、`💊 …`（心理節）、`💎 …`（価値節）の文言が変わった場合は  
`services/social/regularPublicTeaserLocales.js` の `markers` を同期する。スクリプト実行時にマーカー不一致はコンソール警告。
