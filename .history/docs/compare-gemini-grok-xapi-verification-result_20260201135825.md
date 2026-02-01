# Gemini vs Grok: X API 検証比較（10件ずつ）

**実行日時**: 2026-02-01T04:57:54.597Z

## 結果サマリ

| ソース | 取得数 | user 存在 | ツイート1件以上（採用可能） |
|--------|--------|------------|-----------------------------|
| Gemini (gemini-3-pro-preview) | 10 | 10/10 | 10/10 |
| Grok (grok-4-1-fast-reasoning) | 10 | 9/10 | 9/10 |
| **併用（ユニーク）** | 17 | 16/17 | 16/17 |

- 重複: 3 件（Gemini と Grok の両方に登場）

## 結論

- **併用が最適**: 単独より「ツイート1件以上」の採用数が多く、リスト構築のカバレッジが最大（今回: 17 ユニーク中 16 件採用）。
- **単独で選ぶなら Gemini を優先**: X API 検証通過率 10/10。Grok は 9/10（例: `Michael_Saylor` は X 上で Not Found → 正しくは `saylor` 等、username のずれあり）。

## 補足

- Grok の 1 件失敗: `Michael_Saylor`。Gemini は `saylor` を返しており、こちらは X API で存在確認済み。
- 重複 3 件: APompliano, VitalikButerin, 100trillionUSD が両リストに登場。併用時はユニーク化で 17 件になり、そのうち 16 件が採用可能。

## 生データ

- `docs/compare-gemini-grok-xapi-verification-result.json`
