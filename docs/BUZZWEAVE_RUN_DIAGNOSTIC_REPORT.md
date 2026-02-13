# /api/buzzweave-run 実装状況 総合診断レポート

**作成日**: 2026-02-13  
**目的**: BWE が本当に動いているか、ログが空なのが正常か異常かを判断する

---

## 1. 本来ログに出すべき情報と実装状況

| 段階 | 本来出すべきログ | 実装状況 | 場所 |
|------|------------------|----------|------|
| **実行開始** | ハンドラ起動・パラメータ | ❌ **未実装** | buzzweave-run.js に入口ログなし |
| **キュー取得** | スロット取得件数・langFilter | ⚠️ 部分実装 | エンジン内 `logError("slot", slot)` のみ |
| **GPT生成** | 生成完了・トークン数等 | ❌ 未実装 | generateParasiticCopy にログなし |
| **言語判定** | 使用言語・round-robin | ⚠️ 暗黙 | langFilter は cycle start に含まれる |
| **X投稿** | 投稿成功・tweetId | ❌ 未実装 | postQuoteTweet 成功時にログなし（DB 登録のみ） |
| **エラー/例外** | 例外メッセージ・スタック | ✅ 実装 | catch で `console.error("[buzzweave-run] error:", e.message)` |

### 重要な制約: LOG_MAX_PER_RUN = 5

`buzzWeaveEngine.js` の `logOnce` は **1 回の run あたり最大 5 行まで** 出力する仕様になっている。

```55:64:services/td/buzzWeaveEngine.js
const LOG_LEVEL = process.env.BUZZWEAVE_LOG_LEVEL || "info";
const LOG_MAX_PER_RUN = 5;
let runLogCount = 0;

function logOnce(...args) {
  runLogCount += 1;
  if (runLogCount <= LOG_MAX_PER_RUN) {
    console.error("[BuzzWeave]", ...args);
  }
}
```

`logInfo`, `logWarn`, `logError` はすべて `logOnce` 経由で `console.error` に出力する。

---

## 2. 内部処理フローとログ出力タイミング

```
[buzzweave-run.js]
├─ 認証チェック ──────────────── ログなし
├─ Emergency stop チェック ───── ログなし（早期 return）
├─ x_api_blocked チェック ────── ログなし（早期 return）
├─ ロック取得 ───────────────── ログなし（取得失敗時も早期 return）
└─ runBuzzWeaveCycle() 呼び出し
    │
    [buzzWeaveEngine.js]
    ├─ logError("cycle start") ─── ① 1行目（必ず出る）
    ├─ cleanupOldSlots()
    ├─ getTdPostSlotsInNextHour()
    ├─ logError("slot", slot) ──── ② 2行目
    ├─ [スロット0件] → return "No slots in next hour" ─ 以降ログなし
    │
    ├─ collectBuzzCandidates()
    │   ├─ fetchCandidatesFromSearch() ─ 402 時 logError
    │   ├─ logInfo("clusterScore...") ─ ③
    │   ├─ logInfo("candidate summary...") ─ ④
    │   └─ logWarn("deadline exceeded") 等
    ├─ pickBestBuzzCandidate()
    │   └─ logInfo("candidate selection") ─ ⑤（5行目で打ち切り）
    ├─ logError("best candidate") ─ 6行目以降は出ない
    ├─ generateParasiticCopy() ─ ログなし
    ├─ [dryRun=false] postQuoteTweet()
    │   ├─ logError("ready to post") ─ 既に5行超えてると出ない
    │   └─ 成功時ログなし
    └─ return { ok, posted, results }
```

### 各段階でログが出る条件

| 段階 | ログが出る条件 |
|------|----------------|
| 実行開始 | なし（buzzweave-run.js に未実装） |
| キュー取得 | `runBuzzWeaveCycle` に入った場合のみ。`logError("cycle start")`, `logError("slot", slot)` |
| GPT生成 | なし（generateParasiticCopy にログ未実装） |
| 言語判定 | `cycle start` の `langFilter` に含まれる |
| X投稿 | `logError("ready to post")` があるが、5行制限で捨てられる可能性大 |
| エラー | catch 時のみ `console.error("[buzzweave-run] error:", ...)` |

---

## 3. Messages が空欄になる原因候補

### 3.1 早期 return でログがゼロになるケース（最有力）

`buzzweave-run.js` は以下の場合、**`runBuzzWeaveCycle` を呼ぶ前に return** する。このとき **一切 console 出力がない**。

| 条件 | 返却 | ログ |
|------|------|------|
| 認証失敗 | 401 | なし |
| `BUZZWEAVE_EMERGENCY_STOP=true` | 200 | なし |
| `x_api_blocked` フラグ | 200 | なし |
| ロック取得失敗（他 run 実行中） | 200 | なし |

→ **Locked や x_api_blocked が頻発していれば、毎回 200 を返すが Messages は空**。

### 3.2 ログが stderr に出力されている

- エンジン内ログはすべて `console.error` を使用。
- Vercel の「Messages」や一部のログビューアでは、**stdout（console.log）のみ表示**し、stderr を別タブや非表示にしている場合がある。
- その場合、`[BuzzWeave]` のログは「Messages」に出ず空に見える。

### 3.3 LOG_MAX_PER_RUN による打ち切り

- 1 run あたり最大 5 行まで。
- 「cycle start」「slot」「clusterScore」「candidate summary」「candidate selection」などで 5 行に達すると、その後の「best candidate」「ready to post」は出ない。
- 投稿成功時の専用ログはもともとない。

### 3.4 ログが return より後にある

- 該当なし。ログはすべて return 前。
- ただし早期 return 時は、該当する処理に到達しないためログ自体が実行されない。

### 3.5 実行フローが早期 return している

- **スロット 0 件**時: `runBuzzWeaveCycle` 内で `logError("cycle start")`, `logError("slot", null)` の 2 行は出る。
- **候補 0 件**時: collectBuzzCandidates まで進むため、3〜4 行程度は出る想定。
- **ロック・緊急停止・402 ブロック**時: エンジンに入る前に return するため、ログは 0 行。

### 3.6 スロットが存在しない（空ループに近い状態）

- `buzzweave-slots` は `0 15 * * *`（日1回 15:00 UTC）のみ実行。
- スロット未生成 or 対象時刻にスロットがないと、毎回「No slots in next hour」で即 return。
- この場合でも「cycle start」「slot」の 2 行は出るはず。**完全に空**なら、(3.1) の早期 return の可能性が高い。

### 3.7 Cold Start / Flush 遅延

- 実行時間が短く、ログがフラッシュされる前にプロセスが終了すると、ログが記録されない場合がある（レア）。

---

## 4. 正常稼働 vs 実質何もしていないかの判定方法

### 現状で判定できること

1. **レスポンス JSON**  
   - `message: "Locked (another run in progress)"` → 他 run が実行中  
   - `message: "No slots in next hour"` → スロットなし（エンジンまで到達）  
   - `message: "No buzz candidates"` → 検索結果なし  
   - `posted: 1` かつ `results` に `success: true` → 投稿成功  

2. **ステータスコード**  
   - 200 且つ `posted: 0` の場合、上記のいずれかの「正常だが投稿なし」状態。

### 追加で必要なログ（提案）

エンジンが本当に動いているかを可視化するため、次を追加することを推奨する。

| 優先度 | ログ内容 | 想定場所 |
|--------|----------|----------|
| 高 | 実行開始（パラメータ・時刻） | buzzweave-run.js ハンドラ先頭 |
| 高 | 早期 return 理由（Locked / x_api_blocked / Emergency stop） | buzzweave-run.js 各 return 直前 |
| 高 | スロット件数・使用 lang | runBuzzWeaveCycle 内、getTdPostSlotsInNextHour 直後 |
| 中 | GPT 生成完了（body 長など） | generateParasiticCopy 戻り直前 |
| 中 | X 投稿結果（tweetId / 失敗理由） | postQuoteTweet 直後 |
| 低 | LOG_MAX_PER_RUN の緩和 or 無効化 | 環境変数で制御可能にする |

---

## 5. 追加すべきログのコード例

### 5.1 buzzweave-run.js（API 層）

```javascript
// ハンドラ先頭（認証通過後、早期 return の直前）
module.exports = async function handler(req, res) {
  const runId = `bwr-${Date.now()}`;
  console.log("[buzzweave-run] start", { runId, method: req.method, dry_run: req.query?.dry_run });

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  // ... 認証 ...

  if (process.env.BUZZWEAVE_EMERGENCY_STOP === "true" || ...) {
    console.log("[buzzweave-run] early return: emergency_stop");
    await upsertBuzzweaveStatusEmergencyStop("env_flag");
    return res.status(200).json({ ok: true, message: "Emergency stop active", posted: 0 });
  }

  const status = await getBuzzweaveStatus();
  if (status.x_api_blocked) {
    console.log("[buzzweave-run] early return: x_api_blocked");
    return res.status(200).json({ ok: true, message: "X API blocked flag active", posted: 0 });
  }

  const acquired = await acquireBuzzweaveLock();
  if (!acquired) {
    console.log("[buzzweave-run] early return: locked");
    return res.status(200).json({ ok: true, message: "Locked (another run in progress)", posted: 0 });
  }

  try {
    const result = await runBuzzWeaveCycle({ dryRun, langFilter });
    console.log("[buzzweave-run] done", { runId, posted: result.posted, message: result.message });
    return res.status(200).json(result);
  } catch (e) {
    console.error("[buzzweave-run] error:", e.message);
    // ...
  }
};
```

### 5.2 buzzWeaveEngine.js（スロット取得直後）

```javascript
// runBuzzWeaveCycle 内、getTdPostSlotsInNextHour の直後
const slots = await getTdPostSlotsInNextHour(langFilter);
const slot = slots[0];
console.log("[BuzzWeave] slots fetched", { count: slots.length, slotLang: slot?.lang, langFilter });
logError("slot", slot || null);
```

### 5.3 buzzWeaveEngine.js（X 投稿直前・直後）

```javascript
// postQuoteTweet の直前
console.log("[BuzzWeave] posting", { candidatePostId: candidate.post.id, slotLang: slot.lang });
const postResult = await postQuoteTweet(body, candidate.post.id);
console.log("[BuzzWeave] post result", { success: !!postResult?.id, tweetId: postResult?.id || null });
```

### 5.4 stdout への統一（Vercel Messages 表示のため）

Vercel の「Messages」が stdout のみ表示する前提なら、`console.log` に寄せる方が確実。

```javascript
// logOnce を console.log に変更
if (runLogCount <= LOG_MAX_PER_RUN) {
  console.log("[BuzzWeave]", ...args);
}
```

または、環境変数でログ先を切り替える:

```javascript
const LOG_TO_STDOUT = process.env.BUZZWEAVE_LOG_STDOUT === "true";
const logOut = LOG_TO_STDOUT ? console.log : console.error;
// ...
logOut("[BuzzWeave]", ...args);
```

---

## 6. まとめ

| 項目 | 結論 |
|------|------|
| **ログ不足** | buzzweave-run.js に入口ログがなく、早期 return 時は 0 行になる |
| **LOG_MAX_PER_RUN** | 5 行制限で重要なログが捨てられる可能性あり |
| **console.error** | エンジンはすべて stderr。Vercel Messages が stdout のみなら非表示 |
| **BWE 稼働判定** | 現状はレスポンス JSON の `message` / `posted` で判断するしかない |
| **推奨対応** | 上記 5.1〜5.4 のログ追加と、`console.log` への寄せを実施 |

**次のアクション案**

1. 5.1 の buzzweave-run.js 入口・早期 return ログを追加する（最小限で効果大）  
2. 5.2 のスロット取得ログを追加する  
3. `BUZZWEAVE_LOG_STDOUT=true` や `LOG_MAX_PER_RUN` の引き上げを検討する  
4. 1〜2 日運用し、Vercel のログに `[buzzweave-run]` / `[BuzzWeave]` が出現するか確認する  
