# GrokによるX投稿スケジュール確認結果
**作成日時**: 2026-01-24T01:23:55.599Z  
**質問AI**: Grok CTO（grok-4-1-fast-reasoning）  
**目的**: X投稿スケジュールの正確な実装方法の確認

---

### 1. 投稿頻度の確認結果
- **引用リポスト**: 1日12回（6言語 × 2投稿）
- **無料版レポート**: 1日6回（6言語 × 1投稿）
- **合計**: 1日18回のX投稿

### 2. 正確なスケジュール表
| UTC時刻 | 処理する言語 | 投稿タイプ | 説明 |
|---|---|---|---|
| 12:00 | JA | 無料版レポート | Tokyo primaryピーク（1回） |
| 13:00 | KO | 無料版レポート | Seoul primaryピーク（1回） |
| 14:00 | EN, PT-BR | 無料版レポート | US/EU/Brazil primaryピーク（EN1回 + PT-BR1回） |
| 15:00 | ES | 無料版レポート | LATAM primaryピーク（1回） |
| 18:00 | AR | 無料版レポート | MENA primaryピーク（1回） |
| 20:00 | EN, PT-BR | 引用リポスト | US/EU/Brazil secondaryピーク（EN2回 + PT-BR2回） |
| 21:00 | ES | 引用リポスト | LATAM secondaryピーク（2回） |
| 00:00 | AR, JA | 引用リポスト | MENA/Tokyo secondaryピーク（AR2回 + JA2回） |
| 01:00 | KO | 引用リポスト | Seoul secondaryピーク（2回） |

### 3. Cron設定の推奨
```json
{
  "x-post-free-report": "0 12,13,14,15,18 * * *",
  "x-quote-repost": "0 0,1,20,21 * * *"
}
```

### 4. 実装方法の詳細
- **各Cron実行時にどの言語を処理するか**: UTC現在時刻（`new Date().getUTCHours()`）を取得し、ピークマップ（オブジェクト）で照合。例:
  ```javascript
  const peakMap = {
    12: { langs: ['JA'], type: 'free', count: 1 },
    13: { langs: ['KO'], type: 'free', count: 1 },
    14: { langs: ['EN', 'PT-BR'], type: 'free', count: 1 },
    15: { langs: ['ES'], type: 'free', count: 1 },
    18: { langs: ['AR'], type: 'free', count: 1 },
    20: { langs: ['EN', 'PT-BR'], type: 'quote', count: 2 },
    21: { langs: ['ES'], type: 'quote', count: 2 },
    0: { langs: ['AR', 'JA'], type: 'quote', count: 2 },
    1: { langs: ['KO'], type: 'quote', count: 2 }
  };
  const hour = new Date().getUTCHours();
  const config = peakMap[hour];
  if (config) {
    for (const lang of config.langs) {
      for (let i = 0; i < config.count; i++) {
        // 言語別コンテンツ生成 + 投稿実行
        if (config.type === 'free') await postFreeReport(lang);
        else await postQuoteRepost(lang);  // インフルエンサー別2投稿（例: influencer1/2）
      }
    }
  }
  ```
- **言語別ピーク時間のチェック方法**: 上記peakMapでハードコード。Vercel Cronは分0秒実行なので正確。00:00は`getUTCHours() === 0`で捕捉。
- **1日6言語すべてを処理する方法**: primary（無料）で全6言語カバー（14:00でEN/PT-BR同時）、secondary（引用）で全6言語カバー（複数言語/高countで分散）。Redis/Keyvなど外部ストア不要（時刻ベースで自然に1日1サイクル）。

### 5. 重要な注意事項
- **X APIのレート制限**: 投稿レート（v2: 200/3時間/app, ユーザー無制限級）。1日18回は余裕（分散で15min超えず）。Tweet作成後即postせず、1-2分sleep推奨。
- **スパム判定の回避**: 同一言語内投稿を5-10分間隔（ループ内sleep）、内容多様化（テンプレート+動的変数）、引用は別インフルエンサー選択。アルゴ重み: 時間分散>内容一貫。
- **エンゲージメント最大化のためのタイミング**: ピーク±30分厳守（アルゴFor You配信優先）。A/Bテストで微調整（例: JA 12:00→11:30）。インプレッション追跡で検証（X Analytics API）。

---

**確認完了**: 2026-01-24T01:23:55.599Z
