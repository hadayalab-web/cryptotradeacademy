# Trap Defence OS – Supabase移設・辞書・テンプレ・コピー生成 レビュー用レポート

実施日: 2026-02-11

---

## 1. 概要

Trap Defence OS の外向け拡散エンジンについて、以下を実装した。

- **A. インフルエンサー300件**：KV → Supabase `td_influencers` 移設
- **B. 公式アカウント88件**：config → Supabase `td_official_accounts` 移設
- **C. 感情辞書**：`td_emotion_dictionary` テーブル + シード
- **D. コピーメタ情報**：`td_copy_meta`（人格統計）
- **E. コピーアーカイブ**：`td_copy_archive`
- KV → Supabase 移設ロジック
- gpt-4o プロンプト生成ロジック（辞書・テンプレ骨格・公式 org_type 文脈）
- Cron 運用フロー（x-post API でのオプション連携）

---

## 2. 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `docs/supabase-tweet-metrics-schema.sql` | `td_influencers`, `td_official_accounts`, `td_emotion_dictionary`, `td_copy_meta`, `td_copy_archive` テーブル定義（既存） |
| `utils/supabase.js` | `insertTdInfluencers`, `getTdInfluencers`, `insertTdOfficialAccounts`, `getTdOfficialAccounts`, `insertTdEmotionPhrases`, `getTdEmotionDictionary`, `insertTdCopyMeta`, `insertTdCopyArchive`, `inferCopyMeta` を追加 |
| `services/ai/gpt5mini.js` | `orgType`, `dictionaryPhrases` オプション追加、`ORG_CONTEXT_BY_TYPE` による公式向け文脈付与 |
| `api/x-post.js` | `?use_td=1` で Supabase td_* 連携（辞書・公式文脈・アーカイブ保存） |
| `scripts/td-migrate-influencers-to-supabase.js` | **新規**：KV インフルエンサー → td_influencers 移設 |
| `scripts/td-migrate-official-accounts-to-supabase.js` | **新規**：officialCryptoXAccounts.js → td_official_accounts 移設 |
| `scripts/td-seed-emotion-dictionary.js` | **新規**：td_emotion_dictionary 初期シード |

---

## 3. Supabase テーブル定義

### 3-1. td_influencers（インフルエンサー300件）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| handle | TEXT | @なしのユーザー名 |
| platform | TEXT | 'x' |
| lang | TEXT | ja/en/es/pt/ko/ar |
| category | TEXT | crypto 等 |
| followers | INT | 任意 |
| notes | TEXT | 任意 |
| created_at | TIMESTAMPTZ | |

### 3-2. td_official_accounts（公式88件）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| handle | TEXT | @なし |
| platform | TEXT | 'x' |
| org_type | TEXT | media \| ai \| finance \| corporate \| government |
| lang | TEXT | |
| region | TEXT | JP/US/EU 等 |
| priority | INT | 1〜5 |
| created_at | TIMESTAMPTZ | |

### 3-3. td_emotion_dictionary（感情辞書）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| category | TEXT | fear/anxiety/sadness/whale/algo 等 |
| phrase | TEXT | フレーズ |
| lang | TEXT | |
| created_at | TIMESTAMPTZ | |

### 3-4. td_copy_meta（コピー生成メタ情報）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| lang | TEXT | |
| mode | TEXT | minimal/regular |
| emotion_profile | JSONB | fear/anxiety 等の強度 |
| enemy_profile | JSONB | whale/algo 等 |
| length | INT | 文字数 |
| intensity | INT | |
| created_at | TIMESTAMPTZ | |

### 3-5. td_copy_archive（コピーアーカイブ）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | PK |
| text | TEXT | 本文 |
| lang | TEXT | |
| mode | TEXT | |
| created_at | TIMESTAMPTZ | |

---

## 4. 移設ロジック

### 4-1. インフルエンサー（KV → Supabase）

- **キー**: `x:influencer_stock:{lang}`（en, es, pt-br, ar, ja, ko）
- **マッピング**: `username` → handle、`lang` → lang、`category` = crypto
- **実行**: `node scripts/td-migrate-influencers-to-supabase.js`
- **前提**: `.env` に `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### 4-2. 公式アカウント（config → Supabase）

- **ソース**: `config/officialCryptoXAccounts.js`（EXCHANGES, PROJECTS_AND_FOUNDATIONS, COMPANIES_AND_MEDIA）
- **org_type マッピング**:
  - EXCHANGES → finance
  - PROJECTS_AND_FOUNDATIONS → corporate
  - COMPANIES_AND_MEDIA → media / ai / finance / corporate（ハンドル別）
- **実行**: `node scripts/td-migrate-official-accounts-to-supabase.js`

### 4-3. 感情辞書シード

- **実行**: `node scripts/td-seed-emotion-dictionary.js`
- 既存データがある場合はスキップ

---

## 5. gpt-4o プロンプト連携

### 5-1. 辞書の扱い

- 辞書フレーズは **参考素材** としてプロンプトに渡す
- 「必ず使う必要はない。自然な文章を生成せよ」と明示

### 5-2. テンプレ骨格（固定）

1. 感情（五感・内面）
2. 敵（クジラ or アルゴ）
3. 防御（Minimal or Regular）
4. URL
5. #BTC + 絵文字1つ

### 5-3. 公式アカウント向け文脈（org_type 別）

| org_type | 文脈 |
|----------|------|
| media | AIの新潮流、市場構造の変化 |
| ai | モデル最適化、自動化、多言語AI |
| finance | 市場の罠、クジラ、アルゴ |
| corporate | 安全性、効率化、自動化 |
| government | 構造、規制、コンプライアンス |

---

## 6. 運用フロー（Cron）

1. Cron が `GET /api/x-post?lang=ja&mode=minimal&use_td=1&post=true` を叩く
2. `use_td=1` のとき:
   - 50% で公式アカウントをランダム抽出 → `orgType` をプロンプトに付与
   - 感情辞書から lang に合うフレーズを最大10件取得
   - `generateXPost` に `orgType`, `dictionaryPhrases` を渡す
3. 生成後、`td_copy_archive` と `td_copy_meta` に保存
4. 投稿後、`x_posts` に従来どおりログ保存

---

## 7. 動作確認方法

### 7-1. Supabase スキーマ適用

```bash
# Supabase SQL Editor で docs/supabase-tweet-metrics-schema.sql を実行
```

### 7-2. 移設スクリプト実行

```bash
# インフルエンサー（KV が設定済みの場合）
node scripts/td-migrate-influencers-to-supabase.js

# 公式アカウント
node scripts/td-migrate-official-accounts-to-supabase.js

# 感情辞書シード
node scripts/td-seed-emotion-dictionary.js
```

### 7-3. x-post API の確認

```bash
# 通常（TD 連携なし）
curl "http://localhost:3000/api/x-post?lang=ja&mode=minimal&dry_run=true"

# TD 連携あり（Supabase が設定済みの場合）
curl "http://localhost:3000/api/x-post?lang=ja&mode=minimal&use_td=1&dry_run=true"
```

---

## 8. 依存関係・環境変数

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー |
| `KV_REST_API_URL` | KV（インフルエンサー移設時） |
| `KV_REST_API_TOKEN` | KV（インフルエンサー移設時） |
| `OPENAI_API_KEY` | gpt-4o 生成 |

---

## 9. 今後の拡張候補

- `td_influencers` の `handle` に UNIQUE 制約を追加し、`upsert` で重複を防止
- Cron フローで `getTdInfluencers` からターゲットをランダム抽出してタグ付け
- 88ストックのメタ情報から「人格の方向性」を算出してプロンプトに反映
