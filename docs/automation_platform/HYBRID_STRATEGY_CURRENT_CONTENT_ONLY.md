# 「隠された敵」× 「島への招待」ハイブリッド戦略 - 最新コンテンツのみ（2026-01-08以降）

**作成日**: 2026-01-09  
**プロダクト名**: **Trap Defence BTC**  
**基準日**: 2026-01-08（昨日以降に更新されたファイルのみを記載）  
**目的**: 最新の情報のみを整理し、古い情報を除外

---

## ⚠️ 重要：ストーリーの適用先

### ✅ 正しい適用先

- **Two Young Menストーリー** → **ユーザー向けLPのみ** (`app/[market]/page.tsx`)
- **「隠された敵」×「島への招待」ハイブリッド** → **アフィリエイター向けLPのみ** (`app/affiliate/[market]/page.tsx`)

### ❌ 誤った理解（二度と参照しない）

- ❌ Two Young Menストーリーをアフィリエイター向けLPに使用
- ❌ 「隠された敵」×「島への招待」をユーザー向けLPに使用
- ❌ プロダクト名を「TrapShield」と記載（正しくは「Trap Defence BTC」）

---

## ⚠️ 重要

**このドキュメントには、2026-01-08以降に更新されたファイルのみが含まれます。**  
**それ以前に更新されたファイルは「古い情報」として扱われ、このドキュメントには含まれていません。**

---

## ✅ 最新コンテンツ（2026-01-08以降に更新）

### 📄 LPページファイル

#### 1. Orientation LP - アフィリエイター向けLP ⭐ **最新**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/app/affiliate/[market]/page.tsx`  
**更新日時**: 2026/01/09 23:39:30  
**ステータス**: ✅ 最新  
**ストーリー**: 「隠された敵」×「島への招待」ハイブリッド専用  
**プロダクト名**: Trap Defence BTC

**内容**:
- Hero Section（「隠された敵」型VSL統合）
- アフィリエイター対比画像セクション（絶望するアフィリエイター vs 成功するアフィリエイター）
- Hidden Enemy Section
- Island Invitation Section（地獄の島 vs 天国の島）
- Reward Structure Section
- Registration Form Section
- Success Stories Section
- FAQ Section
- CTA Section

**特徴**:
- 6市場対応（EN, AR, KO, JA, ES, PT-BR）
- Notion Database連携（`getLPCopy`）
- HeyGen VSL統合

**注意**: Two Young Menストーリーは含まれません（ユーザー向けLP専用）

---

#### 2. Orientation LP - ユーザー向けLP ⭐ **最新**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/app/[market]/page.tsx`  
**更新日時**: 2026/01/09 23:39:30  
**ステータス**: ✅ 最新  
**ストーリー**: Two Young Menストーリー専用  
**プロダクト名**: Trap Defence BTC

**内容**:
- Two Young Menストーリー統合
- Trader A vs Trader Bの対比
- CVRデータを使用したコピー

**注意**: 「隠された敵」×「島への招待」ハイブリッドは含まれません（アフィリエイター向けLP専用）

---

#### 3. CryptoTrade Academy LP (EN) - ユーザー向けLP ⭐ **最新**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en/app/[market]/page.tsx`  
**更新日時**: 2026/01/09 23:39:30  
**ステータス**: ✅ 最新

**内容**:
- EN市場専用
- Two Young Menストーリー統合

---

#### 4. CryptoTrade Academy LP (JA) - アフィリエイター向けLP ⭐ **最新**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-ja/app/affiliate/[market]/page.tsx`  
**更新日時**: 2026/01/09 23:39:30  
**ステータス**: ✅ 最新

**内容**:
- JA市場固定版
- 日本語コピー最適化
- 詳細なNanoBanana画像生成プロンプト（TODOコメント内）

**特徴**:
- より詳細な画像生成プロンプト
- JA市場専用のコピー最適化

---

### 📊 CVRデータ

#### 1. Orientation LP - CVR Data ⭐ **最新**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/lib/cvr-data.ts`  
**更新日時**: 2026/01/09 23:39:30  
**ステータス**: ✅ 最新

**内容**:
- 6市場（JA, EN, AR, ES, KO, PT-BR）のLPコピーとVSLスクリプト
- Two Young Menストーリーの`opening`セクションを含む
- CVR最大化戦略データ

**Two Young Menストーリー例（EN）**:
```typescript
script: {
  opening: 'Two traders, Trader A and Trader B. Yesterday, Trader A lost months of accumulated profits in an instant. Meanwhile, Trader B earned $5K while drinking coffee. Which one are you?',
  // ...
}
```

**Two Young Menストーリー例（JA）**:
```typescript
script: {
  opening: '二人のトレーダー、トレーダーAとトレーダーB。昨日、トレーダーAは数ヶ月分の利益を一瞬で失いました。一方、トレーダーBはコーヒーを飲みながら$5Kを稼ぎました。あなたはどちらですか？',
  // ...
}
```

---

#### 2. CryptoTrade Academy LP (EN) - CVR Data
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/cryptotradeacademy-lp-en/lib/cvr-data.ts`  
**更新日時**: 確認中  
**ステータス**: ⚠️ 要確認

---

### 🔧 Whop統合ファイル

#### 1. Whop Constants ⭐ **最新**
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/lib/whop/constants.ts`  
**更新日時**: 2026/01/09 23:39:30  
**ステータス**: ✅ 最新

**内容**:
- WhopプランID管理
- 市場別プランID定義

---

#### 2. Whop Product Export
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/lib/whop/product-export.ts`  
**更新日時**: 2026/01/09 23:39:30  
**ステータス**: ✅ 最新

**内容**:
- プロダクトエクスポート機能

---

#### 3. Whop Main
**パス**: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/lib/whop.ts`  
**更新日時**: 2026/01/09 23:39:30  
**ステータス**: ✅ 最新

**内容**:
- Whop API統合

---

## 📖 最新ドキュメント

### 1. ハイブリッド戦略ドキュメント ⭐ **最新**
**パス**: `docs/TWO_YOUNG_MEN_HIDDEN_ENEMY_ISLAND_HYBRID_STRATEGY.md`  
**更新日時**: 2026/01/09 23:XX:XX  
**ステータス**: ✅ 最新

**内容**:
- ハイブリッド戦略の詳細説明
- 各パターンの役割
- 実装詳細
- CVR最大化のポイント

---

### 2. LP更新情報 ⭐ **最新**
**パス**: `docs/LP_RECENT_UPDATES_2026-01-09.md`  
**更新日時**: 2026/01/09 23:XX:XX  
**ステータス**: ✅ 最新

**内容**:
- 過去2時間以内に更新されたLPファイルの一覧
- 更新内容の詳細

---

### 3. Frontier Template統合情報 ⭐ **最新**
**パス**: `docs/LP_FRONTIER_TEMPLATE_UPGRADE_INFO.md`  
**更新日時**: 2026/01/09 23:XX:XX  
**ステータス**: ✅ 最新

**内容**:
- Frontier Templateの情報
- 既存LPとの比較
- アップグレード方針

---

### 4. 関連コンテンツ完全リスト ⭐ **最新**
**パス**: `docs/HYBRID_STRATEGY_RELATED_CONTENT_COMPLETE.md`  
**更新日時**: 2026/01/09 23:XX:XX  
**ステータス**: ✅ 最新

**内容**:
- すべての関連コンテンツの網羅的なリスト

---

## ❌ 古い情報（2026-01-08以前に更新）

以下のファイルは、2026-01-08以前に更新されたため、「古い情報」として扱われます：

### スクリプト・ツール
- ❌ `scripts/cvr-maximizer-mcp-server.js` - 2026/01/02 9:11:35
- ❌ `scripts/marketing-strategy-optimizer-mcp-server.js` - 2026/01/02 9:11:35
- ❌ `scripts/swipe-file-generator-mcp-server.js` - 2026/01/02 9:11:35
- ❌ `scripts/telegram-affiliate-dm-mcp-server.js` - 2025/12/30 11:00:19

### アフィリエイト招待メール
- ❌ `orientation-lp/lib/resend/affiliate-invitation.ts` - 2026/01/08 22:39:50（基準日の前日）
- ❌ 各市場版の`affiliate-invitation.ts` - 2026/01/08以前（推定）

### データファイル
- ❌ `data/cvr-maximizer/results/cvr-strategy-*.json` - 2026/01/02以前
- ❌ `data/marketing-strategy/results/marketing-strategy-*.json` - 2026/01/02以前
- ❌ `data/product-optimization/results/product-optimization-*.json` - 2026/01/02以前

### VSLスクリプト関連
- ❌ `hadayalab-website-dev/cryptotradeacademy-lp-dev/scripts/improve-phase4-output-quality.js` - 2026/01/02以前（推定）
- ❌ `orientation-lp/scripts/save-vsl-script.ts` - 2026/01/02以前（推定）

### Notion Database統合
- ❌ `orientation-lp/app/actions/notion-content.ts` - 2026/01/02以前（推定）

### その他のコンポーネント
- ❌ `components/lp/HeyGenVSL.tsx` - 2026/01/02以前（推定）
- ❌ `components/RegistrationForm.tsx` - 2026/01/02以前（推定）
- ❌ `components/lp/Footer.tsx` - 2026/01/02以前（推定）

---

## 📊 最新コンテンツの統計

### 最新ファイル数
- **LPページファイル**: 4ファイル
- **CVRデータ**: 1ファイル（確認済み）
- **Whop統合ファイル**: 3ファイル
- **ドキュメント**: 4ファイル

**合計**: 12ファイル（確認済み）

---

## 🎯 最新コンテンツの特徴

### 1. Two Young Menストーリー（ユーザー向けLP専用）
- ✅ CVRデータに含まれる（最新）
- ✅ ユーザー向けLPに実装済み（最新）
- ❌ アフィリエイター向けLPには使用されていません

### 2. 「隠された敵」×「島への招待」ハイブリッド（アフィリエイター向けLP専用）
- ✅ アフィリエイター向けLPのHero Sectionに実装（最新）
- ✅ Hidden Enemy Sectionに実装（最新）
- ✅ Island Invitation Sectionに実装（最新）
- ✅ 地獄の島 vs 天国の島の対比（最新）
- ❌ ユーザー向けLPには使用されていません

### 3. プロダクト名
- ✅ **Trap Defence BTC**（正しい名称）
- ❌ TrapShield（誤った名称、二度と参照しない）

---

## 📝 注意事項

1. **古い情報の参照**
   - 2026-01-08以前に更新されたファイルは、現在の実装とは異なる可能性があります
   - 最新の実装を確認する場合は、上記の「最新コンテンツ」を参照してください

2. **更新日時の確認**
   - ファイルの更新日時は、`Get-Item`コマンドで確認できます
   - 基準日: 2026-01-08（昨日）

3. **継続的な更新**
   - このドキュメントは、最新の情報のみを反映しています
   - 新しい更新があった場合は、このドキュメントを更新してください

---

## 🔍 検証方法

### PowerShellコマンドで更新日時を確認

```powershell
# 基準日を設定
$cutoffDate = (Get-Date).AddDays(-1).Date

# ファイルの更新日時を確認
Get-Item "ファイルパス" | Select-Object FullName, LastWriteTime, @{Name="IsRecent";Expression={$_.LastWriteTime.Date -ge $cutoffDate}}
```

### 最新ファイルのみを抽出

```powershell
$cutoffDate = (Get-Date).AddDays(-1).Date
Get-ChildItem -Path "パス" -Recurse -File | Where-Object { $_.LastWriteTime.Date -ge $cutoffDate } | Select-Object FullName, LastWriteTime
```

---

## 📌 まとめ

**2026-01-08以降に更新された最新コンテンツ**:

1. ✅ **LPページファイル**: 4ファイル（すべて最新）
2. ✅ **CVRデータ**: 1ファイル（確認済み、最新）
3. ✅ **Whop統合ファイル**: 3ファイル（すべて最新）
4. ✅ **ドキュメント**: 4ファイル（すべて最新）

**合計**: 12ファイル以上が最新の情報として確認されています。

**古い情報**は、このドキュメントには含まれていません。最新の実装を確認する場合は、上記の「最新コンテンツ」セクションを参照してください。

---

**このドキュメントは、2026-01-08以降に更新されたファイルのみを記載しています。**
