# Regular Briefing の 3AI 役割

GPT-5.2 / Grok-4-1-fast-reasoning / Gemini-3-pro-preview が、Regular のどの部分で使われているかの整理（実装の目安）。

| セクション・要素 | 主に担当 | 役割イメージ |
|------------------|----------|-----------------------------|
| **Market State Radar**（Trap Score, CQ Risk, X Sentiment, Macro, Liquidity, Volatility） | パイプライン全体 | CQ データ＋Grok 出力（センチメント風）＋GPT の構造化。X Sentiment は Grok の解釈（live feed なし）。 |
| **Behind-the-Scenes Structure**（Score 6 / Signal: NONE、短文サマリ） | GPT | 数値・シグナルの要約と「Risk > reward. Sit tight.」などの断定文。 |
| **Current BTC Structure / Scenario Map / Data-Backed Evidence** | GPT + Gemini | 構造説明・シナリオ・根拠の並び。Gemini がストーリー・構成を担当する想定。 |
| **Psychological Insight (Dr. Grok)**（X Sentiment 1 行、Psychological State、Mental Note） | Grok | センチメント風 1 行、「Confusion Block」等の心理フレーム、短文の Mental Note。 |
| **Trap Defence Value**（3 つの価値提案） | テンプレ / Gemini | 固定文言または Gemini による価値訴求。 |
| **Snapshot**（価格・Netflow・MPI・Sentiment・Trap Score） | テンプレ | 数値の埋め込み。Key Metrics と重複しうるため、改善で一元化を検討。 |

※ 実際のコードでは 1 つの `formatRegularBriefing` 内で CQ・Grok 出力・GPT 結果をマージしているため、上記は「どのモデルがどのトーン・役割を担うか」の目安。
