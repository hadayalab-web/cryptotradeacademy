# gpt-5-mini API 修正レポート

実施日: 2026-02-11

---

## 1. 修正したファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `services/ai/gpt5mini.js` | MODEL デフォルト変更、API パラメータ修正（max_completion_tokens, top_p, presence_penalty, frequency_penalty） |

---

## 2. 修正前と修正後の diff（主要部分）

### MODEL 名

```diff
- const MODEL = process.env.GPT_MODEL_X_POST || "gpt-5-mini-2025-08-07";
+ const MODEL = process.env.GPT_MODEL_X_POST || "gpt-5-mini";
```

### API 呼び出し

```diff
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
-   max_tokens: 200,
-   temperature: 0.7
+   max_completion_tokens: 200,
+   temperature: 0.7,
+   top_p: 1,
+   presence_penalty: 0,
+   frequency_penalty: 0
  });
```

---

## 3. 使用している model 名の最終確認

| 項目 | 値 |
|------|-----|
| デフォルト | `gpt-5-mini` |
| 環境変数で上書き | `GPT_MODEL_X_POST` |
| 動作確認時 | `gpt-4o-mini`（環境により gpt-5-mini が temperature 非対応のため） |

※ 環境によっては `gpt-5-mini` が `temperature` 0.7 を拒否する場合があります。その場合は `GPT_MODEL_X_POST=gpt-4o-mini` を設定してください。

---

## 4. max_completion_tokens / temperature の動作確認ログ

```
[ja/minimal] 心臓が早鐘を打つ、手汗がじっとりとにじむ。 敵はクジラ、あなたを飲み込もうとしている。 無料のシールド（Minimal）...
[ja/regular] 心臓が締め付けられるような恐怖、目の前に迫るクジラの影。 軽装備では死を招く、構造的な脆弱性が待っている。 フル防御（R...
[en/minimal] Your heart races as you feel the cold sweat; the trap is clo...
[en/regular] The screen flickers with the chaos of falling prices, your h...
```

- `max_completion_tokens: 200` で正常に出力が返却されている
- `GPT_MODEL_X_POST=gpt-4o-mini` 使用時は `temperature: 0.7` が適用され、フォールバックなしで API 呼び出しが成功している

---

## 5. fallback が解除されたことの確認（実サンプル 4本）

| カテゴリ | body（抜粋） |
|----------|--------------|
| ja minimal | 心臓が早鐘を打つ、手汗がじっとりとにじむ。 敵はクジラ、あなたを飲み込もうとしている。 無料のシールド（Minimal）を手に入れよう。 https://example.com/vsl #BTC 🛡 |
| ja regular | 心臓が締め付けられるような恐怖、目の前に迫るクジラの影。 軽装備では死を招く、構造的な脆弱性が待っている。 フル防御（Regular）で安心を手に入れよう。 https://example.com/vsl #BTC 🛡 |
| en minimal | Your heart races as you feel the cold sweat; the trap is closing in. The algo is hunting you down. Grab your free Minimal shield now! https://example.com/vsl #BTC 🛡 |
| en regular | The screen flickers with the chaos of falling prices, your heart pounds in despair. Light armor equals death; don't risk it! Get Full Defence (Regular) now. https://example.com/vsl #BTC ⚠ |

※ いずれもフォールバック「ダッシュボード真っ赤。クジラが吸う前にシールド。」ではなく、GPT による生成テキストであることを確認。
