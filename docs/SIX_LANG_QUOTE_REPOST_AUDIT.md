# 6言語 引用リポスト対応状況チェック

日付: 2026-02-03  
対象: en, ja, es, pt-br, ar, ko

## サマリ

| カテゴリ                                     | ファイル                               | en  | ja  | es  | pt-br | ar  | ko  | 備考                                                     |
| -------------------------------------------- | -------------------------------------- | :-: | :-: | :-: | :---: | :-: | :-: | -------------------------------------------------------- |
| CORE_PHRASES.state                           | personaStrategy.js                     | ✅  | ✅  | ✅  |  ✅   | ✅  | ✅  | 本日AR問題修正で追加                                     |
| CORE_PHRASES.price等                         | personaStrategy.js                     | ✅  | ✅  | ❌  |  ❌   | ❌  | ❌  | price, trial, psych, minimalToRegularはen/jaのみ         |
| getPersonaPromptContext                      | personaStrategy.js                     | ⚠️  | ⚠️  | ⚠️  |  ⚠️   | ⚠️  | ⚠️  | state/trialを常にENで注入（要修正）                      |
| quoteRepostHeadlines                         | quoteRepostHeadlines.js                | ✅  | ✅  | ✅  |  ✅   | ✅  | ✅  |                                                          |
| quoteRepostVariantGCopy                      | quoteRepostVariantGCopy.js             | ✅  | ✅  | ✅  |  ✅   | ✅  | ✅  | MINIMAL/REGULAR_TEASER, LINK_EXPLANATION, CTA, OBJECTION |
| quoteRepostTemplatesIntegrated               | quoteRepostTemplatesIntegrated.js      | ✅  | ✅  | ✅  |  ✅   | ✅  | ✅  | variant A〜F                                             |
| quoteRepostTemplatesMinimalOptin             | quoteRepostTemplatesMinimalOptin.js    | ✅  | ✅  | ✅  |  ✅   | ✅  | ✅  | variant A〜E                                             |
| LINK_BLOCK_GROK_STYLE                        | salesLetterContest.js                  | ✅  | ✅  | ✅  |  ✅   | ✅  | ✅  | Grok本文＋リンクブロック用                               |
| dryRunTexts                                  | x-quote-repost.js                      | ✅  | ✅  | ✅  |  ✅   | ✅  | ✅  |                                                          |
| getTrapScorePostText                         | x-quote-repost.js                      | ✅  | ✅  | ✅  |  ✅   | ✅  | ✅  | TrapScore投稿（whale/fallback分岐）                      |
| getRegularFunnelCta / getRegularWhopLinkOnly | whop-links.js, quoteRepostVariantGCopy | ✅  | ✅  | ✅  |  ✅   | ✅  | ✅  |                                                          |
| Whop URLs                                    | whop-links.js                          | ✅  | ✅  | ✅  |  ✅   | ✅  | ✅  | Minimal/Regular チェックアウト                           |
| LANG_NAMES                                   | salesLetterContest, quoteRepostCopy    | ✅  | ✅  | ✅  |  ✅   | ✅  | ✅  | Grok/Geminiプロンプト用                                  |
| LANG_TO_MARKET                               | personaStrategy.js                     | ✅  | ✅  | ✅  |  ✅   | ✅  | ✅  | marketProfiles連携                                       |

## フォールバックロジック（x-quote-repost.js）

- **修正済み**: `CORE_PHRASES.state[lang] || CORE_PHRASES.state.en` で言語別フォールバック
- Grok失敗時・キャッシュ未ヒット時に正しい言語のstateが使用される

## 要対応: getPersonaPromptContext

`config/personaStrategy.js` の `getPersonaPromptContext(lang)` は、Grokプロンプトに渡すペルソナ文脈を組み立てるが、**state と trial を常に英語で注入**している:

```javascript
`Core hooks: state="${CORE_PHRASES.state.en}"; price="${pricePhrase}"; trial="${CORE_PHRASES.trial.en}". `;
```

→ `lang` が ar 等でも `CORE_PHRASES.state.en` を参照しているため、Grokが「英語のフックを使え」と指示され、AR投稿でも英語本文が生成される可能性がある。

**推奨**: `CORE_PHRASES.state[lang]` と `CORE_PHRASES.trial[lang]` を使用するよう変更（未定義時は en にフォールバック）。ただし `CORE_PHRASES.trial` は現在 en/ja のみのため、ar/es/pt-br/ko を追加するか、フォールバックのみとするか検討が必要。

## 参考: 現在の引用リポストフロー

1. **Dry-run**: `dryRunTexts[lang]` → 全6言語対応 ✅
2. **Grok成功（キャッシュ or 新規生成）**: Grok本文 + `getLinkBlockGrokStyle(lang)` → 全6言語対応 ✅
3. **Grok失敗時フォールバック**: `CORE_PHRASES.state[lang]` + `getLinkBlockGrokStyle(lang)` → 本日修正で全6言語対応 ✅
4. **SALES_LETTER_LANGS外**（現状該当なし）: 同フォールバック → ✅

## 結論

- **引用リポストの出力側**は全6言語で網羅済み
- **Grokプロンプトのペルソナ注入**で、`getPersonaPromptContext` が state/trial を英語固定で渡していることが、AR等で英語本文が出る一因と考えられる
- 上記を修正すると、Grok生成時もターゲット言語に合わせたフックがプロンプトに渡り、より一貫した多言語出力が期待できる
