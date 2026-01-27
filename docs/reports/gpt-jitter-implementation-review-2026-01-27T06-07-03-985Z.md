# ジッター（ランダム遅延）実装のコードレビュー（GPT-5.2-2025-12-11）
**作成日時**: 2026-01-27T06:07:03.987Z
**レビューAI**: GPT-5.2-2025-12-11
**目的**: ジッター実装漏れの修正コードレビュー
**レビュー対象**:
- utils/scheduler.js
- api/x-quote-repost.js（変更箇所）

---

### 1. エグゼクティブサマリー（200-300字）
`utils/scheduler.js`のジッター/言語間ウェイトは、`maxDuration=60s`制約を意識して「残り時間に応じてスキップ/上限調整」する方針で概ね妥当です。一方で、最大の懸念は**呼び出し側（特に`api/x-quote-repost.js`）に実装が入っているか不明（“未検出”）**で、設計仕様（deadline伝播）と整合していない可能性が高い点です。また`deadlineMs`が「時刻」なのか「残りms」なのか命名が混在し、誤用すると待機が無制限化します。ログ量も本番で過多になり得ます。

---

### 2. P0問題のリスト（あれば）

- **問題**: `api/x-quote-repost.js`側でジッター/ウェイト適用箇所が「未検出」＝実装漏れ/差分未反映の疑い  
  **影響**: 設計仕様（固定待機→ジッター化、deadline考慮）が満たされず、投稿タイミングが機械的なまま／または別の固定sleepが残って`maxDuration`超過の温床になります。  
  **修正案（例）**: 「関数開始時にdeadlineAtMsを確定→各待機に必ず渡す」を強制。
  ```js
  // api/x-quote-repost.js（例）
  const MAX_DURATION_MS = 60_000;
  const deadlineAtMs = Date.now() + MAX_DURATION_MS;

  // 1回だけジッター（推奨：言語ループの外）
  await applyJitter({ label: `quote-repost:pre`, minMs: 3000, maxMs: 10000, deadlineAtMs });

  for (const lang of langs) {
    // ...投稿処理...
    await applyLanguageWait({ label: `quote-repost:between-langs:${lang}`, minMs: 0, maxMs: 3000, deadlineAtMs });
  }
  ```
  ※「未検出」なので、まずは**実際の該当行にapplyJitter/applyLanguageWaitが入っているか**をCIで検査するのが確実です。

- **問題**: `deadlineMs`の意味が曖昧（`deadlineAtMs`と`deadlineMs`を併存）で、呼び出し側が「残りms」を渡すと誤動作  
  **影響**: `deadline = deadlineAtMs ?? deadlineMs` なので、呼び出し側が `deadlineMs=60000`（残り60秒のつもり）を渡すと、`deadline - Date.now()`が負になり、常にスキップ or 上限0化など意図しない挙動になります（環境によっては“待機しない”＝ジッター無効化）。  
  **修正案**: 互換のため残すのは可ですが、**型/意味を検出して補正**するか、P0として呼び出し側を全て`deadlineAtMs`に統一。
  ```js
  // utils/scheduler.js（防御的補正案）
  const raw = deadlineAtMs ?? deadlineMs;
  const deadline =
    (typeof raw === 'number' && raw < 10_000_000_000) // だいたい「残りms」っぽい値
      ? Date.now() + raw
      : raw;
  ```

- **問題**: `applyJitter`のログが本番で常時`console.log`になり得る（debug以外でも出る）  
  **影響**: Cron高頻度運用でログが増え、観測コスト/ノイズ増大。Vercel等でログI/Oが遅いと実行時間にも影響します。  
  **修正案**: 通常レベルは抑制し、`LOG_LEVEL=debug`時のみ出す、またはサンプリング。
  ```js
  const logLevel = process.env.LOG_LEVEL || 'info';
  if (logLevel === 'debug') console.log(...);
  ```

---

### 3. P1問題のリスト（あれば）

- **問題**: `maxDuration=60s`前提の「安全マージン」が固定（Jitter=5s, LangWait=2s）で、呼び出し側の処理時間を見ていない  
  **影響**: API呼び出しやLLM生成等が重い回では、待機をスキップしてもなおタイムアウトする／逆に余裕がある回でも待機が小さくなりすぎるなど、安定性が揺れます。  
  **修正案**: 呼び出し側で「フェーズごとの予算」を決め、待機に割り当てる（例：総待機は最大10秒まで）。
  ```js
  // 呼び出し側で待機予算を管理（例）
  const waitBudgetMs = 10_000;
  // 予算を超えたら以降のwaitはスキップ、など
  ```

- **問題**: 3–10秒ジッター/0–3秒言語間ウェイトは、Gemini推奨（分単位）に比べ“スパム回避効果”は限定的  
  **影響**: 「機械的タイミングの排除」という目的に対し、Cronが2時間ごとなら十分な分散は得られる一方、同一分内に複数言語を連投する場合は依然として機械的に見える可能性があります。  
  **修正案**: 分単位ジッターはサーバレス単発実行では無理なので、**設計で分散**（1言語=1実行、Queue/Workflow、またはCronを言語別にずらす）に寄せるのが仕様整合的です。

- **問題**: `clampRange`が`max<=min`を「固定」にするのは良いが、呼び出し側の設定ミスが静かに隠れる  
  **影響**: 設定誤り（min/max逆）に気づかず、常に同じ待機（または0）になり、意図したジッターが効かない。  
  **修正案**: debug時に警告ログを出す。
  ```js
  if (max <= min && (process.env.LOG_LEVEL === 'debug')) {
    console.warn(`[Jitter] invalid range min=${minMs} max=${maxMs}, clamped`);
  }
  ```

---

### 4. P2改善提案（あれば）

- **改善点**: `applyJitter`/`applyLanguageWait`をテストしやすくする（乱数・sleep注入）  
  - `Math.random`と`sleep`をDI可能にすると、ユニットテストで待機ゼロにできます。
- **改善点**: `deadlineAtMs`へ完全統一し、`deadlineMs`は段階的に削除（deprecate→削除）  
- **改善点**: 待機は「言語ループの外で1回ジッター」＋「言語間は最小」に統一し、全APIで一貫したポリシーにする  
- **改善点**: 実行時間のメトリクス（開始時刻、各フェーズ所要、残り時間）をdebugで出し、タイムアウト原因を特定可能にする

---

### 5. 総合評価
- **実装品質**: 78 / 100  
- **推奨アクション（優先度順）**:
  1. **`api/x-quote-repost.js`に本当にapplyJitter/applyLanguageWaitが入っているかを確認**し、未反映なら差分を確実に適用（“未検出”を解消）
  2. **deadlineの意味を`deadlineAtMs`に統一**（呼び出し側も含めて）し、誤用を防ぐガードを追加
  3. `maxDuration=60s`前提で、**待機の総量上限（待機予算）**を呼び出し側で管理（タイムアウトの再発防止）
  4. 本番ログを抑制（debugのみ詳細、通常はサマリ/サンプリング）
  5. 分単位ジッターが必要なら、**サーバレス単発sleepではなくスケジューリング設計（言語別Cron/Queue）**へ移行検討

---

## API使用量

- **入力トークン**: 7073
- **出力トークン**: 2052
- **合計トークン**: 9125
