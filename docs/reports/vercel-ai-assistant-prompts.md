# Vercel AIアシスタント確認用プロンプト

## プロンプト1: Vercel Serverless FunctionsでのRaw Body取得

```
Vercel Serverless FunctionsでWebhook署名検証を実装しています。

X APIのWebhook署名検証には、JSONパース前のraw body（生のHTTPリクエストボディ）が必要です。
しかし、Vercel Serverless Functionsでは、デフォルトで`req.body`が既にJSONパースされているようです。

質問：
1. Vercel Serverless Functionsでraw bodyを取得する推奨方法はありますか？
2. `vercel.json`で`bodyParser: false`を設定することは可能ですか？どのように設定しますか？
3. 関数内で`req.on('data')`でストリームから読み取る方法は正しいでしょうか？
4. この方法で実装した場合、署名検証は正常に機能しますか？

現在の実装では、`req.body`が既にパースされているため、ストリームから読み取ることができません。
```

## プロンプト2: Vercel Serverless FunctionsのbodyParser設定

```
Vercel Serverless Functionsで、Webhook署名検証のためにraw bodyを取得する必要があります。

現在の実装：
- ファイル: `api/x-webhook.js`
- エクスポート形式: `module.exports = handler`
- Vercel Serverless Functions形式（Next.js API Routesではない）

質問：
1. Vercel Serverless Functions（`api/*.js`形式）で`bodyParser: false`を設定する方法はありますか？
2. `vercel.json`で関数ごとに`bodyParser`設定を無効化できますか？
3. 関数内で`req`ストリームから直接読み取る方法は推奨されますか？
4. 他に推奨される実装方法はありますか？

参考: https://vercel.com/docs/functions/runtimes/node-js
```

## プロンプト3: Webhook署名検証のベストプラクティス（Vercel環境）

```
Vercel Serverless Functionsで、X APIのWebhook署名検証を実装しています。

署名検証には、HMAC SHA-256を使用し、以下の形式で署名文字列を構築します：
- 署名文字列: `timestamp + "." + raw_body`
- キー: Consumer Secret

質問：
1. Vercel環境でWebhook署名検証を実装する際のベストプラクティスはありますか？
2. Raw bodyを取得するための推奨される方法はありますか？
3. パフォーマンスやセキュリティに関する注意点はありますか？
4. エラーハンドリングやログ出力について、推奨される方法はありますか？

現在の実装では、`req.body`が既にパースされているため、`JSON.stringify(req.body)`を使用していますが、
キー順序や空白、エスケープの違いで署名が一致しない可能性があります。
```

## プロンプト4: Vercel Serverless Functionsのリクエスト処理

```
Vercel Serverless Functionsで、POSTリクエストのraw bodyを取得する方法について質問があります。

現在の実装：
```javascript
async function handler(req, res) {
  if (req.method === 'POST') {
    // req.bodyは既にパースされている
    const rawBody = await getRawBody(req); // ストリームから読み取ろうとしている
    // ...
  }
}
```

質問：
1. Vercel Serverless Functionsでは、`req`オブジェクトはストリームとして利用可能ですか？
2. `req.on('data')`でストリームから読み取ることは可能ですか？
3. `req.body`が既にパースされている場合、ストリームは既に消費されていますか？
4. Raw bodyを取得するための推奨される方法はありますか？

参考: https://vercel.com/docs/functions/runtimes/node-js
```

## プロンプト5: 包括的な確認（Vercel環境でのWebhook実装）

```
Vercel Serverless Functionsで、X APIのWebhook署名検証を実装しています。

現在の実装の概要：
1. ファイル: `api/x-webhook.js`
2. エクスポート形式: `module.exports = handler`
3. 署名検証: HMAC SHA-256を使用
4. 署名文字列: `timestamp + "." + raw_body`
5. 問題: `req.body`が既にパースされているため、raw bodyを取得できない

質問：
1. Vercel Serverless Functionsでraw bodyを取得する推奨方法はありますか？
2. `vercel.json`で`bodyParser: false`を設定することは可能ですか？
3. 関数内で`req`ストリームから直接読み取る方法は推奨されますか？
4. 他に推奨される実装方法はありますか？
5. パフォーマンスやセキュリティに関する注意点はありますか？

参考:
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/functions
```

## 使用方法

1. Vercelのドキュメントページ（https://vercel.com/docs）にアクセス
2. 「Ask AI」ボタンをクリック
3. 上記のプロンプトを投げて、段階的に確認する
4. または、プロンプト5を最初に投げて、包括的な確認を行う

## 注意事項

- VercelのAIアシスタントは英語で回答する可能性があります
- 回答を元に実装を修正する場合は、必ず公式ドキュメントも確認してください
- セキュリティ関連の実装は、複数のソースで確認することを推奨します

## 期待される回答

1. **Raw body取得方法**: Vercel Serverless Functionsでraw bodyを取得する具体的な方法
2. **bodyParser設定**: `vercel.json`または関数設定での`bodyParser: false`設定方法
3. **ストリーム処理**: `req`ストリームから直接読み取る方法の可否
4. **ベストプラクティス**: Vercel環境でのWebhook署名検証の推奨実装方法

## 実装への反映

VercelのAIアシスタントからの回答を元に、以下の点を確認・改善します：

1. Raw body取得の実装方法の改善
2. `vercel.json`または関数設定の更新
3. エラーハンドリングの改善
4. パフォーマンスとセキュリティの最適化

## Vercel AIアシスタントの回答に基づく実装改善

### 回答の要点

1. **`raw-body`パッケージの使用**: Vercel AIアシスタントは`raw-body`パッケージの使用を推奨
2. **`bodyParser: false`設定**: 関数ファイル内の`config`エクスポートで設定
3. **タイミング攻撃対策**: `crypto.timingSafeEqual()`を使用

### 実装の改善点

- ✅ `raw-body`パッケージを`package.json`に追加
- ✅ `getRawBodyFromRequest()`関数を`raw-body`パッケージを使用するように変更
- ✅ `config`エクスポートを追加（Vercel Serverless Functionsでの動作確認が必要）
- ✅ エラーハンドリングとフォールバック処理を改善

### 注意事項

- Vercel Serverless Functions（`api/*.js`形式）では、`config`の設定方法がNext.js API Routesとは異なる可能性があります
- `raw-body`パッケージは、ストリームが利用可能な場合に自動的に処理します
- 実装をテストして、署名検証が正常に動作するか確認する必要があります
