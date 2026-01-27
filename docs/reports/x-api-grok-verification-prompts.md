# X API Webhook実装 - Grok確認用プロンプト

## プロンプト1: replay_job_statusイベントの署名検証について

```
X APIのAccount Activity API Webhookについて質問があります。

`replay_job_status`イベント（Account Activity Replay APIのジョブ完了通知）を受信した際に、
`x-twitter-request-timestamp`ヘッダーが存在しない場合があります。

この場合、以下の実装は正しいでしょうか？

1. `replay_job_status`イベントを検出した場合、署名検証（`x-twitter-webhooks-signature`と`x-twitter-request-timestamp`の検証）をスキップする
2. 200 OKを返して、X APIに正常に受信したことを通知する

公式ドキュメントでは、`replay_job_status`イベントについて署名検証が必須かどうかが明確に記載されていないため、確認したいです。

参考URL: https://docs.x.com/x-api/enterprise-gnip-2.0/fundamentals/account-activity#account-activity-replay-api
```

## プロンプト2: Webhook署名検証の実装方法について

```
X APIのWebhook署名検証の実装について質問があります。

現在、以下の実装で署名検証を行っています：

1. `x-twitter-webhooks-signature`ヘッダーから署名を取得
2. `x-twitter-request-timestamp`ヘッダーからタイムスタンプを取得
3. 署名文字列を `timestamp + "." + raw_body` の形式で構築
4. HMAC SHA-256で署名を生成（Consumer Secretをキーとして使用）
5. `crypto.timingSafeEqual`で署名を比較

質問：
1. 署名文字列の形式（`timestamp + "." + raw_body`）は正しいでしょうか？
2. `raw_body`は、JSONパース前の生のHTTPリクエストボディ（バイト列）を使用する必要がありますか？
3. Vercelのようなサーバーレス環境では、`req.body`が既にJSONパースされている場合があります。この場合、`JSON.stringify(req.body)`を使用しても署名検証は機能しますか？それとも、raw bodyを取得する必要がありますか？
4. タイムスタンプのリプレイ攻撃対策として、±5分の許容ウィンドウを設定していますが、これは適切でしょうか？

参考URL: https://developer.x.com/en/docs/twitter-api/enterprise/account-activity-api/guides/securing-webhooks
```

## プロンプト3: Vercel環境でのRaw Body取得方法

```
X APIのWebhook署名検証をVercel（Serverless Functions）で実装しています。

Vercelでは、`req.body`が既にJSONパースされているため、raw bodyを取得する必要があります。

質問：
1. Vercel環境でraw bodyを取得する推奨方法はありますか？
2. `vercel.json`で`bodyParser: false`を設定し、`req.on('data')`でストリームから読み取る方法は正しいでしょうか？
3. この方法で実装した場合、署名検証は正常に機能しますか？
4. 他に推奨される実装方法はありますか？

現在の実装では、`JSON.stringify(req.body)`を使用していますが、キー順序や空白、エスケープの違いで署名が一致しない可能性があるため、raw body取得の実装を検討しています。
```

## プロンプト4: Webhook署名検証のベストプラクティス

```
X APIのWebhook署名検証の実装について、ベストプラクティスを確認したいです。

現在の実装：
- HMAC SHA-256を使用
- `crypto.timingSafeEqual`でタイミング攻撃対策
- タイムスタンプのリプレイ攻撃対策（±5分の許容ウィンドウ）
- 本番環境では署名検証を必須とし、開発環境では警告のみ

質問：
1. 署名検証の実装で、他に考慮すべきセキュリティ対策はありますか？
2. エラーハンドリングやログ出力について、推奨される方法はありますか？
3. 署名検証に失敗した場合の処理（リトライ、通知など）について、推奨される方法はありますか？
4. パフォーマンスやスケーラビリティに関する注意点はありますか？

参考URL: https://developer.x.com/en/docs/twitter-api/enterprise/account-activity-api/guides/securing-webhooks
```

## プロンプト5: 包括的な確認（全体的な実装の検証）

```
X APIのAccount Activity API Webhook実装について、包括的な確認をお願いします。

現在の実装の概要：
1. CRC (Challenge-Response Check) の実装
   - GETリクエストで`crc_token`を受信
   - HMAC SHA-256で署名を生成
   - `{"response_token": "sha256=<base64-encoded-hash>"}`の形式で返却

2. Webhook署名検証（POSTリクエスト）
   - `x-twitter-webhooks-signature`と`x-twitter-request-timestamp`を検証
   - `timestamp + "." + raw_body`の形式で署名文字列を構築
   - HMAC SHA-256で署名を生成
   - `crypto.timingSafeEqual`で署名を比較

3. `replay_job_status`イベントの特別処理
   - 署名検証をスキップ
   - 200 OKを返却

質問：
1. 上記の実装は公式仕様に準拠していますか？
2. セキュリティ上の問題や脆弱性はありますか？
3. 改善すべき点や推奨される実装方法はありますか？
4. 公式ドキュメントで不明確な点があれば、明確にしていただけますか？

参考URL:
- https://developer.x.com/en/docs/twitter-api/enterprise/account-activity-api/guides/securing-webhooks
- https://docs.x.com/x-api/enterprise-gnip-2.0/fundamentals/account-activity#account-activity-replay-api
```

## 使用方法

1. 各プロンプトを個別にGrokに投げて、段階的に確認する
2. または、プロンプト5を最初に投げて、包括的な確認を行う
3. 必要に応じて、プロンプト1-4で詳細を確認する

## 注意事項

- プロンプトは日本語で作成されていますが、Grokが英語で回答する可能性があります
- 回答を元に実装を修正する場合は、必ず公式ドキュメントも確認してください
- セキュリティ関連の実装は、複数のソースで確認することを推奨します

## Grokの回答に基づく実装改善

### 回答の要点

1. **`replay_job_status`の署名検証**: 詳細なドキュメントは見つからなかったが、実装は適切と判断
2. **Raw bodyの使用**: **重要** - `JSON.stringify`はフォーマットの違いで失敗する可能性があるため、raw bodyを使用する必要がある
3. **タイムスタンプウィンドウ**: ±5分の許容ウィンドウは標準的

### 実装の改善点

- `getRawBody()`関数を追加し、ストリームからraw bodyを取得する処理を実装
- Grokの回答に基づき、`JSON.stringify`の使用を最小限に抑えるよう改善
- フォールバック処理を追加（ストリームが利用できない場合の対応）

### 今後の改善点

- Vercel環境での完全なraw body取得には、`vercel.json`または関数設定での`bodyParser: false`設定が必要
- 現在の実装では、VercelのデフォルトのbodyParserが有効な場合、ストリームは既に消費されている可能性がある
