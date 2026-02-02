# 引用リポスト: 無料＋有料導線の統合（1投稿に両方）

**作成日**: 2026-02-01  
**更新日**: 2026-02-02（統合導線に変更・ローテーション廃止）  
**根拠**: Grok & Gemini 分析、ペルソナ決め打ち（`docs/STRATEGY_TUNING_PERSONA_2026-02.md`）。

**方針**: 自アカウント向け（free_report / minimal_version / regular_direct）は全廃止。**X投稿は引用リポストのみ。1投稿内で無料版（Minimal）と有料版（Regular）の両導線を出す**（ローテーション廃止）。

---

## 実行イメージ

**300のインフルエンサーアカウント**（KV ストック）に対して、**統合テンプレート**（無料CTA＋有料CTAを1投稿に含む）で引用リポストが実行される。

| 軸             | 内容                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------- |
| **誰**         | インフルエンサー（ストック上限 300／言語別。実際の数は KV のストック数に依存）                  |
| **導線**       | **1投稿に両方**: 無料版（Minimal チェックアウトURL）＋ 有料版（月$99トライアル or PRO 50% OFF） |
| **バリアント** | **A〜E**（フック・言い回しの違い）。投稿ごとにランダム選択。ドローダウン時は D を 50% に加重。  |

→ ペルソナ決め打ち: バリアント E は `config/personaStrategy.js` の CORE_PHRASES.state を参照。

---

## ルール（統合後）

- **導線**: 毎回 **統合テンプレート**（`config/quoteRepostTemplatesIntegrated.js`）を使用。Minimal のみ / Regular のみの交互ローテーションは行わない。
- **パターン**: バリアント **A / B / C / D / E** をランダムで1つ選択。ドローダウン時は `config/drawdownStrategy.js` の重みで D を 50% に。
- **いつ**: 既存の Cron スケジュールのまま。`QUOTE_REPOST_USE_MINIMAL_REGULAR_TEMPLATES=true` のときのみ統合テンプレートを使用。

---

## 有効化

`.env` に以下を設定する。

```bash
QUOTE_REPOST_USE_MINIMAL_REGULAR_TEMPLATES=true
```

未設定または `false` の場合は従来どおり（Grok 生成 or フォールバックテンプレート）で引用リポストする。

---

## 実装箇所

| 役割                           | ファイル                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| 統合テンプレート（無料＋有料） | `config/quoteRepostTemplatesIntegrated.js`                                           |
| ペルソナ決め打ち（Eで参照）    | `config/personaStrategy.js`                                                          |
| ドローダウン時バリアント重み   | `config/drawdownStrategy.js`                                                         |
| 引用リポスト本体               | `api/x-quote-repost.js`（`useMinimalRegularTemplates` 時は統合テンプレートのみ使用） |

※ 導線タイプの KV 記録（`quoteFunnelRotation.js`）は統合運用では使用しない。

---

## ペルソナ・戦略との対応

- **personaStrategy.js**: 戦略テーマ・CORE_PHRASES・セグメント優先・価格の語り方を共通定義。統合テンプレートのバリアント E が CORE_PHRASES.state を参照。
- **Whop CTA**: 有料導線は 50% で月$99トライアル（`getRegularTrialCta`）、50% で PRO 50% OFF。無料導線は言語別 Minimal チェックアウト URL。
