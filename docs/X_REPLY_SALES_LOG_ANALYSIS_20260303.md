# X Reply Sales 送信ログ 徹底分析（2026-03-03 01:35–01:37）

## 1. 実行概要

| 項目 | 値 |
|------|-----|
| 開始 | 2026-03-03 01:35:15.641 |
| モード | send |
| slotKey | 2026-03-03:30 |
| キュー読込 | en: 15, 他言語: 0, 合計 15 件 |

→ **en で取得した 15 件すべてが送信フローに乗っている（インプット→アウトプット接続は正常）。**

---

## 2. 1件あたりの処理フロー（実際の並び）

1. **attempting reply**（reply_settings_at_list: 'everyone'）
2. **GET /users/me**（レート制限用）
3. **POST /users/:id/following**（フォロー before send、有効時）
4. **follow before send** ログ（followCountToday: 17 → 22, cap: 100）
5. **POST /tweets**（リプライ投稿）
6. → **リプライ 403**（全件）
7. **GET /users/me** → **POST /users/:id/likes**（いいね before DM）
8. **POST /dm_conversations/with/:id/messages**（DM 送信）
9. → **リプライ成功** or **DM 成功** or **reply rejected, DM failed → NG**

→ フォロー → リプライ試行 → 失敗時はいいね → DM という設計どおりの順序で動いている。

---

## 3. リプライ 403 の内容（全 15 件で同一）

```
Reply to this conversation is not allowed because you have not been 
mentioned or otherwise engaged by the author of the post you are replying to.
```

- **意味**: 投稿者に「メンションされた」または「何らかエンゲージされた」アカウントだけがリプライ可能、という X 側の制限に引っかかっている。
- **reply_settings**: リスト取得時はすべて `everyone`。設定の矛盾ではなく、**X の「コールドリプライ」制限**（API／Bot 対策）と解釈できる。
- ログ内ヒント: `app has Read and Write, access token was regenerated after enabling it`  
  → 権限とトークン再発行は確認推奨だが、本文の "have not been mentioned or otherwise engaged" は **エンゲージメント要件** を示しており、権限だけでは解消しない可能性が高い。

**結論**: リプライは **0 件成功**。原因はアプリの不具合というより **X プラットフォームのリプライ許可ポリシー**。

---

## 4. DM 結果の内訳

| 結果 | 件数 | 備考 |
|------|------|------|
| **DM 送信成功** | **1** | handle: **CryptoA40672341**, tweetId: 2028643286697574697（attempt 5） |
| **DM 403（NG）** | **14** | "recipient not open to DMs" / "You do not have permission to DM one or more participants." |

- 成功 1 件: `[X Reply Sales][send] reply rejected → DM sent` が 01:36:07 に 1 回のみ。
- 失敗 14 件: いずれも `reply rejected, DM failed → NG`。相手が DM を受け取らない設定（未フォローからの DM 拒否等）と整合。

---

## 5. 登場ユーザーと JohnsonPhi35712 の重複

- **ユニーク handle**: MrGr33nCandle, JohnsonPhi35712, MichaelSay6uvk, CryptoA40672341, CyberMrWick, 6F_Trading など。
- **JohnsonPhi35712** は複数 tweetId で登場（2028643968485937163, 2028643845076820165, 2028642754952069539, 2028642643555537235, 2028642304207061237, 2028642531672473955, 2028642406447391165）。
  - 同一ユーザーの複数ツイートがリストに含まれており、リスト取得クエリが同じユーザーを複数ヒットさせている。
  - いずれもリプライ 403 → DM 403 で NG。

→ リスト側で「同一 author の重複」を減らすか、送信側で「同一 handle あたり 1 回まで」などの制限を入れると、無駄な試行と DM 拒否の繰り返しを減らせる。

---

## 6. フォロー

- `follow before send` が複数回出ており、followCountToday が 17 → 18 → 19 → 20 → 21 → 22 と増加。
- cap: 100 までなので、このランではフォロー数制限には達していない。
- フォロー自体は成功（following: true）。その後のリプライ/DM 成否には、このログ範囲では影響なし（リプライは全 403、DM は相手設定に依存）。

---

## 7. アウトプットフローとしての評価

| 観点 | 判定 | 補足 |
|------|------|------|
| キュー読込 | ✅ 正常 | en: 15 がそのまま送信ループに渡っている |
| 試行順・フォロー→リプライ→いいね→DM | ✅ 正常 | 設計どおりの順序で実行されている |
| リプライ | ❌ 0 成功 | X の「mentioned or otherwise engaged」制限による 403 |
| DM | ⚠️ 1 成功 / 14 失敗 | 1 件は送信成功。14 件は相手の DM 設定で 403 |
|  NG 記録・handled 記録 | ✅ 正常 | ng / handled の KV 書き込みとログが対応している |

→ **アウトプットフロー（キュー消費・試行順・フォロー・いいね・DM 試行・NG/handled 記録）は正常に動作している。**  
→ **結果が悪い主因は、X のリプライ制限と、多くの相手の DM 受信設定。**

---

## 8. 推奨アクション

1. **X Developer Portal**
   - 該当アプリで **Read and Write** が有効か確認。
   - 有効にしたあと **Access Token を再発行** し、環境変数を更新（ヒント通り）。

2. **リプライ 403 の前提変更**
   - 「検索でヒットしたツイートにそのままリプライ」は、現ポリシーではほぼ通らないと割り切る。
   - 運用としては **リプライは試行するが、失敗が主で DM にフォールバック** が現実的。今回のフローはその前提に合っている。

3. **DM 成功率を上げる**
   - フォロー済みユーザー向けに「フォロー後に少し遅延してから DM」などは既存の follow before send で一部カバー済み。
   - 受け手側の DM 設定は変更できないため、**DM を開いているユーザーが検索に多く含まれるような工夫**（コンテンツ・キーワード・時間帯など）は検討余地あり。

4. **同一ユーザー連打の抑制**
   - リスト取得または送信キューで、**同一 author_id / handle あたり 1 ツイートまで** にすると、同じ相手に何度も 403 を貰う試行を減らせる。

5. **ログの継続確認**
   - 今後も `[X Reply Sales][send] done` の `sentThisRun` / `queueLengthsEnd` と、`reply rejected → DM sent` の件数を合わせて見ると、リプライ 0・DM 1 の傾向が続くか、トークン再発行後にリプライが通るかが分かる。

---

## 9. 結論（一言）

- **アウトプットフローは設計どおり動いており、en の 15 件はすべて 1 件ずつ処理され、1 件が DM 成功・14 件が NG として記録されている。**
- **リプライが 0 なのは X の「mentioned or otherwise engaged」制限、DM が 1 件のみなのは相手の DM 受信設定が主因であり、コードの誤りではなくプラットフォーム・相手設定に起因する結果である。**

---

## 10. リスト取得ラン（list）ログ分析 — 2026-03-03 02:15 pt

**このログの分析を忘れるな。**

### 10.1 実行概要

| 項目 | 値 |
|------|-----|
| 開始 | 2026-03-03 02:15:26.663 |
| モード | **list** |
| dryRun | false |
| 対象言語 | **pt**（scope: rotate, targets: ['pt']） |
| **windowMinutes** | **240** ← 当時はリージョン用窓（pt は REGION_LANGS）。**のちに全言語 360 分に統一済み。** |
| maxRounds | 450 |

### 10.2 round-robin 結果

| 項目 | 値 |
|------|-----|
| rounds | 6 |
| rawRows | **20**（strict: 0, balanced: 6, broad: 14） |
| **author_id 重複排除** | **before: 20 → after: 9**（同一ユーザー 11 件を排除） |
| reply_settings 除外 | 0（内訳: everyone: 9） |
| freshDiscovered / freshEnqueued | 9 |
| nextQueueLength | 9 |

→ **raw 20 件のうち 11 件が同一 author の重複。author_id で 1 ユーザー 1 件にした結果 9 件になった。** 重複排除が正しく効いている。

### 10.3 リスト内容

- **postTypeCounts**: fomo_mental: 3, prediction_confusion: 6  
- **highPriorityCount**: 3  
- **hotList**: false  

### 10.4 教訓・確認ポイント（忘れるな）

1. **検索窓**  
   - このログ時点では `windowMinutes: 240`（リージョン用）。  
   - **現在は全言語で X_REPLY_SEARCH_WINDOW_MINUTES に統一（デフォルト 360 分）。** 今後は `windowMinutes: 360` になる。

2. **重複排除**  
   - `raw rows deduped by author_id (one per user)` で 20→9 になっている。  
   - リスト取得〜キュー〜送信〜前回キュー復元の各所で author_id 重複排除が入っていることを忘れずに確認する。

3. **round-robin**  
   - pt のみ 6 ラウンドで strict 0 / balanced 6 / broad 14。  
   - ヒットが少ない言語では balanced/broad に寄る。maxRounds 450 に対して 6 で打ち切られている（キャップや十分な候補で early exit）。

4. **スコープ**  
   - `scope: 'rotate'`, `targets: [ 'pt' ]` → このランは pt 1 言語だけリスト取得。他言語は別ランで取得。

このリスト取得ログと送信ログ（セクション 1–9）を合わせて、**リスト→キュー→送信** の一連の流れを評価する。
