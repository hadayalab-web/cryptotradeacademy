# X API Grok への質問文（#1 403・スパムロック対策）

X API の Grok に貼って使う用。必要に応じてコピーして編集してください。

---

## 日本語版

```
X API で DM 送信（POST /2/dm_conversations/with/:participant_id/messages）を使っています。
1 ランあたり最大 10 通を送りたいのですが、候補のうち「DM を受け付けていない」ユーザーに送ると 403 が返ります。その場合、次の候補に進んで送信を試みる実装にしています。

先日、403 が連続で 20 回以上続いたあとに、送信側アカウントが「Your account is temporarily locked」となり、それ以降の送信がすべて 403 になりました。15/15min のレート制限には達していません。

質問です：
1. 送信試行（成功・403 どちらも）の「間」に数秒の待機を入れて、バーストを避けることは、スパム検知・アカウントロック回避として公式に推奨されていますか？ 推奨される場合、目安の待機時間はありますか？
2. 連続で 403 が N 回返ったときに「いったん送信を止める」「数十秒ポーズしてから再開する」といった運用は、X のドキュメントやベストプラクティスにありますか？ ある場合、N の目安はありますか？
3. 1 ランあたりの「DM 送信試行回数」に上限を設けることが推奨されていますか？（例：15/15min 以内でも、試行 20 回で打ち切るなど）

公式ドキュメントやベストプラクティスのリンクがあれば教えてください。
```

---

## 英語版（公式サポート・英語 Grok 用）

```
We use X API to send DMs (POST /2/dm_conversations/with/:participant_id/messages). We want to send up to 10 successful DMs per run. When we try to send to users who don’t accept DMs, we get 403 and move to the next candidate.

Recently, after more than 20 consecutive 403 responses, our sending account got "Your account is temporarily locked" and all subsequent send attempts returned 403. We were under the 15/15min rate limit.

Questions:
1. Is it officially recommended to add a delay (e.g. a few seconds) between each send attempt (success or 403) to avoid bursts and reduce spam/lock risk? If yes, is there a recommended delay?
2. Is there any official or best-practice guidance to stop sending after N consecutive 403s, or to pause for tens of seconds before retrying? If yes, is there a suggested N?
3. Is it recommended to cap the number of DM send attempts per run (e.g. stop after 20 attempts even if under 15/15min)?

Please share any links to official docs or best practices.
```

---

## 使い方

- Grok の入力欄にそのまま貼って送信。
- 回答で「公式ドキュメントのリンク」や「N の目安」が出てきたら、`AFFILIATE_RECRUIT_SETTINGS_AGENDA.md` の #1 対策メモに追記するとよい。

---

## Grok 回答（記録）

> No information in the documentation addresses delays between DM attempts, handling consecutive 403s, or attempt caps to avoid spam locks or "Your account is temporarily locked". DM endpoint is 15/15min (user). See rate limits: [/x-api/fundamentals/rate-limits]. For errors: [/x-api/fundamentals/response-codes-and-errors]. Automation rules prohibit spam: [/developer-terms/policy].

**要約**: 公式ドキュメントには「送信間の待機」「連続 403 の扱い」「試行回数上限」の記載は**ない**。言及されているのは 15/15min と spam 禁止ポリシー（Automation rules）のみ。  
→ **#1 の対策（待機・連続403打ち止め・試行上限）は、すべて運用上の安全策として実装するしかない。**
