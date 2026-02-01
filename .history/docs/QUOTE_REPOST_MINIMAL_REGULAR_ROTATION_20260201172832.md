# 引用リポスト: Minimal / Regular 導線ローテーション

**作成日**: 2026-02-01  
**根拠**: Grok（grok-4-1-fast-reasoning）と Gemini（gemini-3-pro-preview）の分析を統合した実装。

**方針**: 自アカウント向け（free_report / minimal_version / regular_direct）は全廃止。**X投稿は引用リポストのみ、2種類（Minimal オプトイン・Regular 直導線）で展開**する。

---

## ルール（採用案）

- **誰**: インフルエンサーごとに「前回使った導線タイプ」を KV で記録する。
- **どちら**: 前回が **Minimal オプトイン** なら次は **Regular 直導線**、それ以外（初回含む）は **Minimal オプトイン**。
- **いつ**: 既存の Cron スケジュール（言語別・毎時など）のまま。投稿のたびに上記ルールでタイプを決める。

これにより、300インフルエンサー × 2パターンを「ぐるぐる回す」戦略が実装可能。

---

## 有効化

`.env` に以下を設定する。

```bash
QUOTE_REPOST_USE_MINIMAL_REGULAR_TEMPLATES=true
```

未設定または `false` の場合は従来どおり（Grok 生成 or フォールバックテンプレート）で引用リポストする。

---

## 実装箇所

| 役割 | ファイル |
|------|----------|
| 導線タイプの取得・記録 | `services/x/quoteFunnelRotation.js` |
| テンプレート（Minimal） | `config/quoteRepostTemplatesMinimalOptin.js` |
| テンプレート（Regular） | `config/quoteRepostTemplatesRegularOptin.js` |
| 引用リポスト本体 | `api/x-quote-repost.js`（`useMinimalRegularTemplates` 時のみ上記を使用） |

KV キー: `x:quote_funnel:${lang}:${influencerUsername}` = `minimal_optin` | `regular_optin`

---

## Grok / Gemini の提案との対応

- **Grok**: 前回タイプの逆を出す交互ルール → そのまま採用（初回は Minimal）。
- **Gemini**: エンゲージメント率で高ER/低ERを分け、奇数回・偶数回で Minimal/Regular を反転 → 将来の拡張候補（現状はシンプルに「前回の逆」のみ実装）。
