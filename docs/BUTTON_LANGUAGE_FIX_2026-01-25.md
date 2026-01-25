# ボタン言語混在問題の修正レポート（2026-01-25）

## 問題

スペイン語の有料版（Regular Briefing）メッセージの最下部に、英語のボタン「🔥 I'm Safe (Trap Avoided)」が表示されていました。これは言語混在の問題です。

## 原因

`api/cron.js`の160-164行目で、すべての言語に対して同じ英語のボタンテキストが使用されていました：

```javascript
const SOCIAL_PROOF_BUTTON = {
  inline_keyboard: [[
    { text: '🔥 I\'m Safe (Trap Avoided)', callback_data: 'action_saved' },
  ]],
};
```

このボタンは、有料版と無料版の両方のメッセージに追加されており、言語に関係なく英語のテキストが表示されていました。

## 修正内容

1. **`api/cron.js` (160-164行目)**: `SOCIAL_PROOF_BUTTON`定数を削除し、言語別のボタンテキストを返す`getSocialProofButton`関数を追加

2. **`api/cron.js` (1419行目, 1423行目)**: 有料版メッセージ送信時に、言語別のボタンを使用するように修正

3. **`api/cron.js` (1592行目)**: 無料版メッセージ送信時に、言語別のボタンを使用するように修正

## 修正後のボタンテキスト

| 言語 | ボタンテキスト |
|------|--------------|
| EN (英語) | 🔥 I'm Safe (Trap Avoided) |
| ES (スペイン語) | 🔥 Estoy Seguro (Trampa Evitada) |
| PT-BR (ポルトガル語) | 🔥 Estou Seguro (Armadilha Evitada) |
| AR (アラビア語) | 🔥 أنا آمن (تم تجنب الفخ) |
| JA (日本語) | 🔥 安全です（トラップ回避済み） |
| KO (韓国語) | 🔥 안전합니다 (함정 회피됨) |

## 変更箇所

```javascript
// 修正前
const SOCIAL_PROOF_BUTTON = {
  inline_keyboard: [[
    { text: '🔥 I\'m Safe (Trap Avoided)', callback_data: 'action_saved' },
  ]],
};

// 修正後
function getSocialProofButton(lang = 'en') {
  const buttonTexts = {
    'en': '🔥 I\'m Safe (Trap Avoided)',
    'es': '🔥 Estoy Seguro (Trampa Evitada)',
    'pt-br': '🔥 Estou Seguro (Armadilha Evitada)',
    'ar': '🔥 أنا آمن (تم تجنب الفخ)',
    'ja': '🔥 安全です（トラップ回避済み）',
    'ko': '🔥 안전합니다 (함정 회피됨)',
  };
  
  const buttonText = buttonTexts[lang] || buttonTexts['en'];
  
  return {
    inline_keyboard: [[
      { text: buttonText, callback_data: 'action_saved' },
    ]],
  };
}

// 使用箇所の修正
const socialProofButton = getSocialProofButton(targetLang);
regularSendResult = await sendMessageToChannel(regularText, series, marketCode, { reply_markup: socialProofButton });
```

## 期待される動作

- ✅ スペイン語のメッセージには、スペイン語のボタン「🔥 Estoy Seguro (Trampa Evitada)」が表示される
- ✅ 各言語のメッセージには、対応する言語のボタンテキストが表示される
- ✅ コールバックアクション（`action_saved`）は変更されず、すべての言語で同じ動作をする

## 次のステップ

1. **デプロイ**: 修正をVercelにデプロイ
2. **検証**: 各言語のメッセージで、正しい言語のボタンが表示されることを確認
3. **監視**: ボタンがクリックされた際のコールバック処理が正常に動作することを確認
