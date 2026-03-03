# X Reply Sales 送信ラン 徹底分析（2026-03-03 02:05, es 12件）

## 1. 実行サマリ

| 項目 | 値 |
|------|-----|
| 開始 | 2026-03-03 02:05:23.240 |
| slotKey | 2026-03-03:0 |
| キュー読込 | en: 0, ar: 0, **es: 12**, pt: 0, ja: 0, ko: 0（合計 12） |
| 試行数 | attemptsThisRun: **12** |
| リプライ成功 | sentThisRun: **0** |
| エラー件数 | errorsThisRun: **5**（DM 失敗） |
| 打ち切り理由 | **queue_exhausted**（キュー枯渇） |
| 終了時キュー | 全言語 0（12件すべて処理済み） |

---

## 2. GET /users/me の使用回数（キャッシュ確認）

- **1回のみ**（02:05:24.966、キュー読込直後）。
- フォロー・いいねのたびに getMe は呼ばれておらず、**cachedSourceId のキャッシュが効いている**。
- 前回のような「1件あたり 2回 GET /users/me」は発生していない。

---

## 3. 1件あたりのフロー（実際の並び）

1. **attempting reply**（reply_settings_at_list: 'everyone'）
2. **POST /users/:id/following**（フォロー）※ 未フォロー時のみ
3. **follow before send** ログ
4. **POST /users/:id/likes**（いいね）
5. **POST /tweets**（リプライ）→ 全件 **403**
6. **POST /dm_conversations/with/:id/messages**（DM）
7. 結果: **reply rejected → DM sent** または **reply rejected, DM failed → NG**

→ フォロー → いいね → リプライ試行 → DM の順で一貫。リプライは全件 403。

---

## 4. 件数内訳（12件）

| 結果 | 件数 | 備考 |
|------|------|------|
| **リプライ成功** | **0** | 全件 403（mentioned or otherwise engaged 制限） |
| **DM 送信成功** | **7** | reply rejected → DM sent |
| **DM 失敗（NG）** | **5** | recipient not open to DMs 等で 403 → NG 記録 |

### DM 成功 7件（handle）

- FundednextSpain  
- racnac222  
- CoinWLATAM  
- BitAcademyWeb  
- aurolo_  
- ElEconomista_  
- DiarioBitcoin  

### DM 失敗 5件（handle）

- johnsonea1  
- jmrozada  
- lalgosignals  
- Entregasacme  
- BCryptodinero  

---

## 5. API 呼び出し数（概算）

| 種別 | 回数 |
|------|------|
| GET /users/me | **1**（ラン全体で 1 回） |
| POST /following | 12（1件あたり 1 回） |
| POST /likes | 12 |
| POST /tweets | 12（すべて 403） |
| POST /dm_conversations/.../messages | 12 |

→ **合計 49 呼び出し**（getMe キャッシュなしだと 1 + 12×2 + 12×3 = 61 相当だったところを削減）。

---

## 6. 所見

- **getMe キャッシュ**: 1ラン 1回で済んでおり、設計どおり。
- **重複実行**: 12件は 12 ユーザー（handle がすべて異なる）。同一 author の二重処理は見当たらない。
- **リプライ**: 全件 403。現状は「リプライ試行はするが、DM で届ける」運用で一貫。
- **DM 成否**: 12件中 7件成功・5件失敗。失敗は「DM を受け取らない設定」による 403 と解釈可能。
- **キュー**: 開始 12 → 終了 0。全件処理して queue_exhausted で終了しており、ログと整合。

---

## 7. 結論

- 送信フロー（フォロー → いいね → リプライ → DM）は意図どおり。
- GET /users/me は 1 回に抑制され、API コスパは良好。
- 同一ユーザー重複実行はなく、es 12件を 1 ユーザー 1 回ずつ処理している。
