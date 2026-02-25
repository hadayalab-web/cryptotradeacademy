# アフィリエイトリクルート 実装報告書（Copilot共有用）

**対象**: X DM によるアフィリエイトリクルート（スクリーニング〜送信）  
**日付**: 2026-02-25  
**結論**: スクリーニング〜リクルートのロジック実装は成功。1件の無駄API修正を実施済み。

---

## 1. 概要

- **フロー**: X 検索 → スコアリング／優先度算出 → 除外ルール適用 → 優先度順で DM 送信（FirstPromoter 招待URL付き）
- **API**: EN 用 `GET /api/affiliate-recruit-en`（Cron 3時間ごと 8回）、地域用 `GET /api/affiliate-recruit-regions`（12/17/21 UTC）
- **戦略**: `docs/AFFILIATE_STRATEGY_X_DM_FIRSTPROMOTER_WHOP.md` に準拠

---

## 2. 本番ログで確認した事象（2026-02-25 稼働）

- **403 多発**: 多くの候補で `You do not have permission to DM one or more participants.` または `This operation is not permitted.`
- **送信成功**: 同一ラン内で **5件** が 200 成功（`affiliate_recruit:sent:*` および POST レート制限 KV で確認）
  - 例: _oxjason, CryptoTreeMap, Safethefrogy, 2BustyPkmn, alexboge
- **解釈**: 403 は X の受信設定（例: フォロワー以外から DM を受け取らない）によるもので、実装バグではない。成功した 5 件は「DM コピーが受信された」とみなしてよい。

---

## 3. 発見した問題と修正内容

### 3.1 問題

- 候補には検索結果から **author_id（ユーザーID）** が既に含まれている。
- それにもかかわらず、DM 送信のたびに **GET /users/by/username/:handle** で participantId を取得していた。
- 結果:
  - 1 候補あたり **GET 1 回 + POST 1 回** の 2 リクエストになり、レート制限と遅延が増加。
  - 403 になる候補に対しても GET が無駄に実行されていた。

### 3.2 修正

| ファイル | 変更内容 |
|----------|----------|
| `services/x/dmClient.js` | `sendRecruitDm(handle, text, options = {})` の第3引数を追加。`options.participantId` が渡されている場合は **GET /users/by/username をスキップ**し、その ID で DM の POST のみ実行。 |
| `api/affiliate-recruit-run.js` | スロットブロック・EN バッチの両方で `sendRecruitDm(c.username, text, { participantId: c.author_id })` に変更。検索で得ている `c.author_id` をそのまま渡す。 |

### 3.3 効果

- 候補ごとに **POST 1 回のみ**（GET なし）で DM 送信。
- レート制限消費と遅延の削減。403 の候補に対しても GET は行わない。

※ `?targetHandle=xxx` で指定して送る経路は従来どおり `sendRecruitDm(targetHandle, text)` のまま（participantId なし）。その場合のみ GET が発生する。

---

## 4. 結論

- **スクリーニング**: 検索・スコア／優先度・除外ルール（priority &lt; 0.4、NG リンク等）は意図どおり動作。致命的な不具合なし。
- **送信ロジック**: API の呼び方・participantId の扱いは正しく、成功した 5 件では DM が届いている。403 は X 側の制限。
- **修正**: 不要な GET をやめ、レート制限とレスポンス時間を改善済み。

**スクリーニング〜リクルートの実装は成功と判断し、本報告書の修正分はコミット・プッシュ・自動デプロイ済み想定で問題なし。**

---

## 5. 送信ログ（国×言語×スコア帯の観測用）

送信成功時に KV に保存する値（キーは従来どおり `affiliate_recruit:sent:{handle}`）を拡張した。

- **形式**: JSON 文字列（payload ありの場合）
  - `ts` … 送信時刻（Unix ms）
  - `handle` … 送信先 @username（小文字）
  - `lang` … 検索時の言語（en / ja / ko / es / pt / ar）。**地域の代理指標**として利用可能（X API v2 の User に location はない）
  - `score` … スコアリング結果
  - `priority` … 優先度（送信順）
  - `author_id` … X のユーザーID
- **用途**: 返信率・登録率・行動開始率を **言語（≒地域）× スコア帯** で集計する際の元データ。FirstPromoter / Whop の登録と突き合わせる場合は `author_id` や handle をキーにする。

---

## 6. 次のフェーズ（完全血流ダッシュボード）

送信数の観測に続き、**登録率・成約率の突き合わせ**と**言語×スコア帯別の可視化**で OS を自己最適化する段階に入る。データソース・指標・突き合わせ方法・画面イメージは ** [AFFILIATE_RECRUIT_FULL_BLOODFLOW_DASHBOARD_DESIGN.md](./AFFILIATE_RECRUIT_FULL_BLOODFLOW_DASHBOARD_DESIGN.md)** に設計メモとしてまとめた。実装順は ② 設計 → ③ 突き合わせ用 API → ① 報告書追記（本節はその要約）。

---

## 7. v2.2 完了（自己最適化フェーズの落としどころ）

**Trap Defence アフィリエイトOS v2.2** を以て、**自己最適化フェーズを完了**とする。

- **v1.0**: スクリーニング〜DM〜LP〜武器
- **v1.5**: 血流ログ・funnel API
- **v2.0**: ref 対応（DM→登録の因果取得）
- **v2.1**: ヒートマップ（言語×スコア帯の視界最大化）
- **v2.2**: **C/R 自動調整** — ヒートマップの登録率に基づき国係数 C（言語別）・スコア帯係数 B を KV に保存し、スクリーニング時の priority 算出で参照。POST `/api/affiliate-recruit-cr-update` で C/B を更新（Cron または手動）。

これ以上の機能追加は行わず、v2.2 を**完了フェーズ**として固定する。

**次フェーズ（v3.0）予告**: 自動 DM 集中投下・国別最適時間帯分析などは応用フェーズとして別途設計する。

---

## 8. 関連ドキュメント・コード

- 完全血流ダッシュボード設計: `docs/AFFILIATE_RECRUIT_FULL_BLOODFLOW_DASHBOARD_DESIGN.md`
- 戦略: `docs/AFFILIATE_STRATEGY_X_DM_FIRSTPROMOTER_WHOP.md`
- スコア／優先度: `docs/AFFILIATE_RECRUIT_*.md`（泥臭さ・国別・BRICS 等）
- 実装: `api/affiliate-recruit-run.js`, `api/affiliate-recruit-en.js`, `api/affiliate-recruit-funnel.js`, `api/affiliate-recruit-heatmap.js`, `api/affiliate-recruit-cr-update.js`, `services/td/affiliateRecruitScoring.js`, `services/td/affiliateRecruitCrConfig.js`, `services/td/affiliateRecruitSearch.js`, `services/x/dmClient.js`, `config/affiliateRecruitDmTemplates.js`
