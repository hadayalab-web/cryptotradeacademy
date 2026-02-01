# 引用リポスト: Minimal / Regular 導線ローテーション

**作成日**: 2026-02-01  
**根拠**: Grok（grok-4-1-fast-reasoning）と Gemini（gemini-3-pro-preview）の分析を統合した実装。

**方針**: 自アカウント向け（free_report / minimal_version / regular_direct）は全廃止。**X投稿は引用リポストのみ、2種類（Minimal オプトイン・Regular 直導線）で展開**する。

---

## 実行イメージ

**300のインフルエンサーアカウント**（KV ストック）に対して、**2種類 × 複数パターン**のX投稿（引用リポスト）が実行される。

| 軸               | 内容                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **誰**           | インフルエンサー（ストック上限 300／言語別。実際の数は KV のストック数に依存）                                           |
| **2種類**        | **Minimal オプトイン**（無料版導線）／**Regular 直導線**（有料版導線）                                                   |
| **複数パターン** | 各種類ごとに **バリアント A・B・C**（テンプレートの言い回し・フックの違い）。投稿ごとに A/B/C のいずれかをランダム選択。 |

→ 300インフルエンサー × 2種類 × 3パターン（A/B/C）を「ぐるぐる回す」戦略で実装済み。

---

## ルール（採用案）

- **誰**: インフルエンサーごとに「前回使った導線タイプ」を KV で記録する。
- **どちら**: 前回が **Minimal オプトイン** なら次は **Regular 直導線**、それ以外（初回含む）は **Minimal オプトイン**。
- **パターン**: 選ばれた種類（Minimal or Regular）に対して、バリアント **A / B / C** をランダムで1つ選択。
- **いつ**: 既存の Cron スケジュール（言語別・毎時など）のまま。投稿のたびに上記ルールでタイプ＋パターンを決める。

---

## 有効化

`.env` に以下を設定する。

```bash
QUOTE_REPOST_USE_MINIMAL_REGULAR_TEMPLATES=true
```

未設定または `false` の場合は従来どおり（Grok 生成 or フォールバックテンプレート）で引用リポストする。

---

## 実装箇所

| 役割                    | ファイル                                                                 |
| ----------------------- | ------------------------------------------------------------------------ |
| 導線タイプの取得・記録  | `services/x/quoteFunnelRotation.js`                                      |
| テンプレート（Minimal） | `config/quoteRepostTemplatesMinimalOptin.js`                             |
| テンプレート（Regular） | `config/quoteRepostTemplatesRegularOptin.js`                             |
| 引用リポスト本体        | `api/x-quote-repost.js`（`useMinimalRegularTemplates` 時のみ上記を使用） |

KV キー: `x:quote_funnel:${lang}:${influencerUsername}` = `minimal_optin` | `regular_optin`

---

## Grok / Gemini の提案との対応

- **Grok**: 前回タイプの逆を出す交互ルール → そのまま採用（初回は Minimal）。
- **Gemini**: エンゲージメント率で高ER/低ERを分け、奇数回・偶数回で Minimal/Regular を反転 → 将来の拡張候補（現状はシンプルに「前回の逆」のみ実装）。
