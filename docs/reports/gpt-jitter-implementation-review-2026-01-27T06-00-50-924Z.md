# ジッター（ランダム遅延）実装のコードレビュー（GPT-5.2-2025-12-11）
**作成日時**: 2026-01-27T06:00:50.941Z
**レビューAI**: GPT-5.2-2025-12-11
**目的**: ジッター実装漏れの修正コードレビュー
**レビュー対象**:
- utils/scheduler.js
- api/x-quote-repost.js（変更箇所）

---

### 1. エグゼクティブサマリー（200-300字）
`utils/scheduler.js`のジッター/言語間ウェイトは、Vercel Functionsの`maxDuration=60s`制約を意識して短縮＋`deadlineMs`導入しており方向性は妥当です。一方で、`deadlineMs`が「呼び出し元から確実に渡され、各待機に適用される」保証が提示情報から確認できず、実運用ではタイムアウトや待機計算の破綻が起き得ます。また`applyJitter`/`applyLanguageWait`は入力不正（`maxMs<=minMs`等）でNaN待機になり得るバグがあり、エラーハンドリングも未整備です。`api/x-quote-repost.js`側の“未検出”箇所は実装漏れの可能性が高くP0です。

---

### 2. P0問題のリスト（あれば）

- **問題**: `api/x-quote-repost.js`でジッター/言語間ウェイトの適用箇所が「未検出」＝実装が入っていない/反映されていない可能性  
  **影響**: 設計仕様（固定待機→ジッター化、`deadlineMs`考慮）と不整合。機械的タイミングのまま、または待機が長すぎて`maxDuration`超過→途中投稿/二重投稿誘発。  
  **修正案**: 「どこで待つか」を明示して必ず呼ぶ（同一言語内・言語間・投稿後など）。例：
  ```js
  // api/x-quote-repost.js（例）
  const MAX_DURATION_MS = 60_000;
  const deadlineMs = Date.now() + MAX_DURATION_MS - 1500; // 1.5s保険

  // 1) 実行開始直後に1回だけジッター（推奨：総量管理しやすい）
  await applyJitter({ label: `quote-repost:start:${lang}`, deadlineMs });

  // 2) 同一言語内で複数投稿するなら、各投稿の間に短い待機
  await applyLanguageWait({ label: `quote-repost:between-posts:${lang}`, deadlineMs });

  // 3) 複数言語ループの言語切替時
  await applyLanguageWait({ label: `quote-repost:between-langs:${lang}`, deadlineMs });
  ```
  ※「未検出」になっている行付近（1297/1793/1822）に、上記のいずれかが確実に入っている状態にしてください。

- **問題**: `applyJitter`/`applyLanguageWait`が `maxMs <= minMs` のとき `Math.random() * (maxMs - minMs)` が負/0になり、`jitterMs`/`waitMs`がNaNや負数になり得る  
  **影響**: `setTimeout(NaN)`は即時実行相当になったり、ログが壊れたり、意図しない挙動（待機ゼロ固定化）でスパム対策効果が消える。`deadlineMs`調整後に起きやすい（`remaining - margin`が`minMs`未満）。  
  **修正案**: 範囲を正規化し、スキップ条件を厳密化。
  ```js
  function clampRange(minMs, maxMs) {
    const min = Math.max(0, Number(minMs) || 0);
    const max = Math.max(0, Number(maxMs) || 0);
    if (max <= min) return { min, max: min }; // 固定 or 0
    return { min, max };
  }

  async function applyJitter({ minMs=3000, maxMs=10000, label='', deadlineMs=null } = {}) {
    if (deadlineMs) {
      const remaining = deadlineMs - Date.now();
      // 「min + margin」すら無理ならスキップ
      const margin = 5000;
      if (remaining <= minMs + margin) {
        console.log(`[Jitter] ${label} skipping (remaining=${remaining}ms)`);
        return;
      }
      maxMs = Math.min(maxMs, remaining - margin);
    }
    const { min, max } = clampRange(minMs, maxMs);
    const jitterMs = (max === min) ? min : Math.floor(min + Math.random() * (max - min));
    if (jitterMs <= 0) return;
    console.log(`[Jitter] ${label} sleeping ${Math.round(jitterMs/1000)}s`);
    await sleep(jitterMs);
  }
  ```

- **問題**: `deadlineMs`の意味が「関数の終了期限」なのに、呼び出し側で統一的に生成・伝播される設計が見えない（シグネチャ追加だけでは不十分）  
  **影響**: ある箇所では`deadlineMs`未指定で長く待ってタイムアウト、別箇所では指定されてスキップ…と挙動が不安定。結果として部分投稿・KV不整合・再実行で重複。  
  **修正案**: 各APIエントリポイントで必ずdeadlineを作り、下位関数へ渡す規約を固定化。
  ```js
  // api handler冒頭で統一
  const MAX_DURATION_MS = 60_000;
  const deadlineMs = Date.now() + MAX_DURATION_MS - 1500;

  // 下位へ必ず渡す
  await postQuoteRepostsForLang(lang, reportData, dailyPostCount, runId, deadlineMs);
  ```

- **問題**: `applyJitter`/`applyLanguageWait`に例外が起きた場合の扱いが未定義（現状は例外が上に伝播して投稿処理全体が落ちる）  
  **影響**: 待機ユーティリティの不具合で投稿自体が止まる（本末転倒）。  
  **修正案**: 待機は“ベストエフォート”にして握りつぶす（ログは残す）。
  ```js
  async function safeWait(fn, label) {
    try { await fn(); } catch (e) { console.warn(`[Wait] ${label} failed:`, e?.message || e); }
  }

  // 呼び出し側
  await safeWait(() => applyJitter({ label:'...', deadlineMs }), 'applyJitter');
  ```

---

### 3. P1問題のリスト（あれば）

- **問題**: ジッター3–10秒は「1–15分」構想に比べスパム回避効果が限定的  
  **影響**: Cronが2時間ごと等で既に分散されているなら一定の効果はあるが、「投稿時刻の機械性」を十分に崩せない可能性。  
  **修正案**: `maxDuration`内でできる範囲として、**“1回だけ”** 10–25秒程度に寄せる、または「Cron側で分散（スケジュール自体をずらす）」に移す。  
  ```js
  // 例：開始時ジッターを少し増やし、言語間は最小に
  await applyJitter({ minMs: 8000, maxMs: 25000, label:'start', deadlineMs });
  ```

- **問題**: 言語間ウェイト0–3秒は、6言語連投の“バースト感”をあまり緩和しない  
  **影響**: タイムライン上で短時間に多言語が固まる。とはいえ60秒制約下では妥協点。  
  **修正案**: 60秒関数で6言語を回す前提をやめ、**1実行=1言語**に分割（最も確実）。難しければ「言語数を減らす」「投稿が発生した言語だけ待機を入れる」など総量制御。

- **問題**: `deadlineMs`のマージンが固定（ジッター5秒、言語待機2秒）で、実処理（X API呼び出し/リトライ）時間を見ていない  
  **影響**: APIが遅いと待機はスキップされても結局タイムアウト、または逆に余裕があるのに過剰にスキップ。  
  **修正案**: 「残りn秒未満なら新規投稿を開始しない」など、待機だけでなく**処理開始ゲート**を追加。
  ```js
  function ensureTime(needMs, deadlineMs, label) {
    if (!deadlineMs) return true;
    const remaining = deadlineMs - Date.now();
    if (remaining < needMs) {
      console.log(`[TimeGate] ${label} stop (remaining=${remaining}ms)`);
      return false;
    }
    return true;
  }
  ```

---

### 4. P2改善提案（あれば）

- **改善点**: ログに`remainingMs`/`minMs`/`maxMs`（調整後）を出してデバッグ容易性を上げる  
- **改善点**: 乱数を注入可能にしてテスト容易性を上げる（`rng=Math.random`を引数化）  
- **改善点**: 待機の“総量上限”を導入（例：この実行で待機に使ってよいのは最大15秒）  
- **改善点**: `label`に`runId`を必須付与し、並行実行時の追跡性を上げる  
- **改善点**: 他API（vsl/free-report等）も「開始時ジッター1回＋必要最小限の言語間待機」という統一ポリシーに揃える

---

### 5. 総合評価
- **実装品質**: 72 / 100  
- **推奨アクション（優先度順）**:
  1. `api/x-quote-repost.js`の“未検出”箇所を解消し、実際に`applyJitter/applyLanguageWait(deadlineMs)`が呼ばれていることをコード上で保証  
  2. `applyJitter/applyLanguageWait`の範囲正規化（`maxMs<=minMs`対策）＋例外時はベストエフォートで継続  
  3. エントリポイントで`deadlineMs`を必ず生成し、下位関数へ伝播する規約を固定（60秒前提の統一）  
  4. 「待機」だけでなく「残り時間が少ないなら投稿開始しない」ゲートを追加して部分投稿を減らす  
  5. 可能なら設計変更：1実行=1言語（またはQueue化）で、ジッターを分単位に戻せる土台を作る

---

## API使用量

- **入力トークン**: 5969
- **出力トークン**: 2599
- **合計トークン**: 8568
