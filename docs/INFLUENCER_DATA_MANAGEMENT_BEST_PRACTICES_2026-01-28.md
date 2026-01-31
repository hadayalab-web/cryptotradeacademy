# インフルエンサーリストデータ管理の最適解
**作成日時**: 2026-01-28  
**目的**: Grokが抽出したインフルエンサーリストを最適に取得・管理し、1日数百投稿のCronJobsを構築

---

## 📊 現状の課題

1. **KV運用の失敗**: 接続エラー、保存失敗、データ消失
2. **データ管理の不確実性**: どこにデータがあるか不明確
3. **更新プロセスの複雑さ**: Grokから取得→検証→保存の各ステップで失敗リスク

---

## 🎯 最適解: 3層データ管理システム

### レイヤー1: データ取得（Grok API → ローカルファイル）

**方法**: Grok APIから直接取得して、即座にローカルファイルに保存

**実装**:
```javascript
// scripts/fetch-influencers-from-grok.js
const { discoverInfluencersForQuoteRepost } = require('../services/grok/client');

async function fetchAndSave(lang, targetCount) {
  // 1. Grokから取得
  const influencers = await discoverInfluencersForQuoteRepost(lang, {
    maxResults: targetCount
  });
  
  // 2. 即座にローカルファイルに保存（KV失敗してもデータを失わない）
  const timestamp = new Date().toISOString();
  const filePath = `data/influencers/raw/grok-${lang}-${timestamp}.json`;
  fs.writeFileSync(filePath, JSON.stringify(influencers, null, 2));
  
  return influencers;
}
```

**利点**:
- ✅ KV失敗してもデータを失わない
- ✅ タイムスタンプ付きで履歴管理可能
- ✅ デバッグが容易

### レイヤー2: データ検証・正規化（ローカルファイル → 検証済みファイル）

**方法**: 生データを検証して、検証済みデータを別ファイルに保存

**実装**:
```javascript
// scripts/validate-and-normalize-influencers.js
function validateAndNormalize(rawInfluencers, lang) {
  return rawInfluencers
    .filter(inf => {
      // tweetId検証: 18-19桁の数値
      if (!inf.tweetId || !/^\d{18,19}$/.test(String(inf.tweetId).trim())) {
        return false;
      }
      // username検証
      if (!inf.username || !inf.username.trim()) {
        return false;
      }
      // tweetText検証
      if (!inf.tweetText || !inf.tweetText.trim()) {
        return false;
      }
      return true;
    })
    .map(inf => ({
      username: String(inf.username).trim().replace(/^@/, ''),
      tweetId: String(inf.tweetId).trim(),
      tweetText: inf.tweetText.substring(0, 280),
      lang: lang.toLowerCase(),
      engagementRate: inf.engagementRate || 0,
      followerCount: inf.followerCount || 0,
      tier: determineTier(inf.followerCount),
      discoveredAt: new Date().toISOString(),
      isActive: true
    }));
}

// 検証済みデータを保存
const validated = validateAndNormalize(rawInfluencers, lang);
const validatedPath = `data/influencers/validated/influencers-${lang}.json`;
fs.writeFileSync(validatedPath, JSON.stringify(validated, null, 2));
```

**利点**:
- ✅ データ品質を保証
- ✅ 無効なデータを除外
- ✅ 正規化された形式で保存

### レイヤー3: データ統合・Git管理（検証済みファイル → Git管理ファイル）

**方法**: 検証済みデータを統合して、Git管理のファイルに保存

**実装**:
```javascript
// scripts/consolidate-influencers.js
function consolidateAllLanguages() {
  const allInfluencers = [];
  const byLang = {};
  
  for (const lang of LANGUAGES) {
    const validatedPath = `data/influencers/validated/influencers-${lang}.json`;
    if (fs.existsSync(validatedPath)) {
      const influencers = JSON.parse(fs.readFileSync(validatedPath, 'utf-8'));
      allInfluencers.push(...influencers);
      byLang[lang] = influencers.length;
    }
  }
  
  // Git管理の統合ファイルに保存
  const consolidated = {
    updatedAt: new Date().toISOString(),
    total: allInfluencers.length,
    byLang: byLang,
    influencers: allInfluencers
  };
  
  fs.writeFileSync('data/influencers/influencers.json', JSON.stringify(consolidated, null, 2));
  fs.writeFileSync('data/influencers/influencers.csv', convertToCSV(consolidated.influencers));
}
```

**利点**:
- ✅ Gitでバージョン管理可能
- ✅ Vercelで自動デプロイ
- ✅ データの変更履歴を追跡可能

---

## 🚀 推奨ワークフロー

### 週次更新プロセス

1. **Grokから取得**（毎週月曜日）
   ```bash
   node scripts/fetch-influencers-from-grok.js
   ```
   - 生データを `data/influencers/raw/` に保存

2. **データ検証・正規化**（取得後すぐ）
   ```bash
   node scripts/validate-and-normalize-influencers.js
   ```
   - 検証済みデータを `data/influencers/validated/` に保存

3. **データ統合**（検証後）
   ```bash
   node scripts/consolidate-influencers.js
   ```
   - 統合データを `data/influencers/influencers.json` に保存

4. **Gitコミット・プッシュ**（統合後）
   ```bash
   git add data/influencers/
   git commit -m "Update influencers data - Week $(date +%U)"
   git push
   ```

5. **Vercel自動デプロイ**（プッシュ後）
   - Gitにプッシュすると自動デプロイ
   - デプロイ後、CronJobsが新しいデータを使用

---

## 📁 ディレクトリ構造

```
data/influencers/
├── raw/                          # 生データ（Grokから取得したまま）
│   ├── grok-en-2026-01-28T12-34-56.json
│   ├── grok-es-2026-01-28T12-34-56.json
│   └── ...
├── validated/                    # 検証済みデータ（言語別）
│   ├── influencers-en.json
│   ├── influencers-es.json
│   └── ...
└── influencers.json              # 統合データ（Git管理、CronJobsで使用）
└── influencers.csv               # CSV形式（エクスポート用）
```

---

## 🔄 CronJobsでのデータ活用

### Vercel環境での読み込み

```javascript
// services/x/influencerStockFromFile.js
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'data', 'influencers', 'influencers.json');

function loadInfluencersData() {
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('[InfluencerStock] 読み込みエラー:', error.message);
    return null;
  }
}

function getInfluencersFromStock(lang, options = {}) {
  const data = loadInfluencersData();
  if (!data || !data.influencers) {
    return [];
  }
  
  return data.influencers.filter(inf => 
    inf.lang === lang.toLowerCase() &&
    (options.activeOnly !== false ? inf.isActive !== false : true) &&
    (options.excludeShadowbanned !== false ? !inf.shadowbanFlagged : true)
  );
}
```

**利点**:
- ✅ Vercelのファイルシステムから直接読み込み
- ✅ KV接続不要
- ✅ 高速（ファイルI/O）
- ✅ 確実（ファイルが存在すれば読み込める）

---

## 📊 データ更新頻度の推奨

### 週次更新（推奨）

**理由**:
- Grok APIコストを最適化
- データ品質を維持（週次で検証・更新）
- インフルエンサーのアクティビティを追跡

**スケジュール**:
- 毎週月曜日 00:00 UTCに実行
- 自動化: GitHub ActionsまたはVercel CronJob

### 月次更新（代替案）

**理由**:
- コスト削減
- より安定したデータセット

**スケジュール**:
- 毎月1日 00:00 UTCに実行

---

## 🎯 最適解のまとめ

### データ取得・管理の最適解

1. **取得**: Grok API → ローカルファイル（即座に保存）
2. **検証**: 生データ → 検証済みデータ（品質保証）
3. **統合**: 検証済みデータ → Git管理ファイル（バージョン管理）
4. **活用**: Git管理ファイル → Vercelファイルシステム → CronJobs

### 利点

✅ **確実性**: 各ステップでデータを保存、失うリスクが最小
✅ **追跡可能性**: Gitで変更履歴を追跡
✅ **デバッグ容易性**: 各ステップのデータを確認可能
✅ **スケーラビリティ**: 1日数百投稿に対応
✅ **コスト効率**: KV不要、GitHub/Vercelの無料プランで対応可能

### 実装優先度

1. **P0（即座）**: データ取得・検証・統合スクリプト
2. **P1（1週間以内）**: 週次更新の自動化（GitHub Actions）
3. **P2（1ヶ月以内）**: データ品質監視・アラート

---

## 📝 次のステップ

1. ✅ データ取得スクリプトの実装
2. ✅ データ検証・正規化スクリプトの実装
3. ✅ データ統合スクリプトの実装
4. ✅ Gitコミット・プッシュの自動化
5. ✅ CronJobsでのデータ活用確認
