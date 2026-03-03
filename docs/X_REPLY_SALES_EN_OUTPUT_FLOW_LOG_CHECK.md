# X Reply Sales：en 15件のアウトプットフロー ログ確認チェックリスト

en で取得した15件のリストに対して送信（send）が正常に動いているかを、**ログの並び**で確認するためのメモ。

---

## 1. 送信が走るタイミング

- Cron: **:05, :20, :35, :50**（15分ごと）  
  `GET/POST /api/x-reply-sales-run?mode=send`（CRON_SECRET 必須）
- リスト取得（:00, :15, :30, :45）の約5分後に send が実行される想定。

---

## 2. 正常フローで出るログの順序（チェックリスト）

送信が 1 件でも処理された場合、おおよそ次の順でログが出る。

| # | ログメッセージ（一部） | 確認したいこと |
|---|------------------------|----------------|
| 1 | `[X Reply Sales][run] start { mode: 'send', dryRun: false }` | send モードで開始している |
| 2 | `[X Reply Sales][send] queue loaded` | `queueLengthsStart` に **en: 15**（または 14, 13…）が出ている＝en キューが読めている |
| 3 | `[X Reply Sales][send] attempting reply` または `skip reply → DM` | 1件目を処理。reply_settings が everyone なら「attempting reply」 |
| 4 | （フォロー有効時）`[X Reply Sales][send] follow before send` | フォローしてから送信している |
| 5a | リプライ成功時：エラー系ログなしで次へ | リプライ送信成功 |
| 5b | リプライ不可時：`[X Reply Sales][send] reply rejected → DM sent` | DM フォールバック成功 |
| 5c | リプライ不可かつ DM 失敗時：`[X Reply Sales][send] reply rejected, DM failed → NG` | 異常系（要確認） |
| 6 | `[X Reply Sales][send] done` | `sentThisRun` ≥ 1、`queueLengthsEnd.en` が **queueLengthsStart.en より 1 少ない**＝1件消費されている |

※ 2件目以降も試行する場合、#3〜5 が繰り返し出る（10秒間隔＋試行キャップまで）。

---

## 3. 送信がスキップされる場合のログ

どれかが出たら **そのランでは送信していない**（en 15件はそのまま残る）。

| ログ | 意味 |
|------|------|
| `[X Reply Sales][send] slot locked, skip` | 同じ15分枠で別実行が先にロック取得済み → スキップ |
| `[X Reply Sales][send] attempt cap, skip` | この15分枠で既に試行キャップ（例: 15回）に達している → スキップ |
| `[X Reply Sales][send] queue loaded` の直後で `[X Reply Sales][send] done` かつ `sentThisRun: 0` | キューは読めたが、全件 handled でスキップされたか、キューが空だった |

---

## 4. 確認のコツ

- **queueLengthsStart** で en が 15 前後あることを確認 → リスト取得（インプット）が send に渡っている。
- **queueLengthsEnd** で en が 1 減っていることを確認 → 1件送信されてキューから消費されている。
- **sentThisRun** が 1 以上 → リプライ送信が成功している。
- DM に回った場合は「reply rejected → DM sent」が出るので、リプライはしていないがアウトプット（DM）はできている。

---

## 5. 異常と判断するパターン

- `queue loaded` で **en: 0** のまま → リストが send に渡っていない（別キー・別環境・上書きの可能性）。
- `queue loaded` のあと **attempting reply / skip reply → DM** が一度も出ないで `done` → 全件 handled 扱いでスキップされているか、キュー取り出し不具合。
- `reply rejected, DM failed → NG` が続く → DM 送信側（権限・設定）要確認。
- 毎回 `slot locked` → 同一枠で二重に Cron が叩かれている可能性。

---

このチェックリストで、en で取得した15件に対するアウトプットフローがログ上で正常かどうかを確認できる。
