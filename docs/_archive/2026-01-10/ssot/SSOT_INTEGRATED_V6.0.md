# 🎯 CryptoTrade Academy - Integrated SSOT v6.0

**Version**: 6.0 INTEGRATED - アフィリエイト戦略対応版  
**Date**: 2026-01-27  
**Status**: ✅ アフィリエイト展開準備完了  
**Purpose**: プロジェクト完全統一SSOT（戦略・技術・価格・実装）

---

## 📌 エグゼクティブサマリー

### プロダクト概要

- **正式名称**: CryptoSignalAI
- **ブランド名**: CryptoTrade Academy
- **ドメイン**: cryptotradeacademy.io
- **Repository**: `github.com/hadayalab-web/cryptosignal-ai`
- **プラットフォーム**: Vercel（6独立デプロイメント）
- **販売戦略**: アフィリエイト展開のみ（広告展開なし）

### カテゴリ創造（木下ロジック②）

**旧カテゴリ**: Crypto Signal Service
- 競合: 10,000+
- CPA: $150（実測）
- LTV: $69 × 3ヶ月 = $207

**新カテゴリ**: Trap Defense Academy
- 競合: 3（独自調査）
- CPA: $50-80（70ドル削減）
- 差別化: 完全独占（"70%の時間、何もするな"）
- LTV: $69 × 12ヶ月 = $828（4倍）

---

## 💰 価格設定（最終決定版）

### EN市場: Precision Sniper Academy

**3プラン構成（アフィリエイト展開最適化）**

| プラン | 期間 | 月額換算 | 総額 | 割引率 | アフィリエイター報酬率 | アフィリエイター報酬 |
|--------|------|----------|------|--------|---------------------|---------------------|
| **1か月** | 30日 | $69/月 | **$69** | 0% | 50% | **$34.5** |
| **3か月** | 90日 | $55/月 | **$165** | -20% | 45% | **$74.25** ⭐ |
| **1年間** | 365日 | $49/月 | **$588** | -29% | 40% | **$235.2** |

**決定理由**:
- ベース価格: $69/月（SSOT仕様準拠）
- 3か月プランをメインに設定（-20%割引）
- アフィリエイター報酬率はプランごとに最適化（1か月: 50%、3か月: 45%、1年間: 40%）
- トライアル: 1日無料（全プラン共通）

### AR市場: MaaliGuard (حارس الأموال)

- **月額**: $89/月
- **年額**: $890/年
- **トライアル**: 1日無料
- **Islamic Finance準拠**: 100%

### KO市場: KimchiSniper (김치 저격수)

- **月額**: ₩79,000/月
- **年額**: ₩790,000/年
- **トライアル**: 1日無料
- **Kimchi Premium監視**: 3分ごと

### JA市場: Kaizen Trader (改善AI)

- **月額**: ¥10,350/月
- **年額**: ¥103,500/年
- **トライアル**: 1日無料

### ES市場: VozComún

- **月額**: $49/月（LATAM購買力対応）
- **年額**: $490/年
- **トライアル**: 1日無料

### PT-BR市場: VozComum

- **月額**: $49/月（LATAM購買力対応）
- **年額**: $490/年
- **トライアル**: 1日無料

---

## 🚨 価格設定の不一致と解決方針

### 問題点

- **EN市場**: SSOT仕様は$69/月だが、現行Whopプランは$89/月（不一致）

### 解決方針

1. **SSOT仕様に準拠**: $69/月を標準価格として設定
2. **3プラン構成**: 1か月（$69）、3か月（$165）、1年間（$588）
3. **Whop設定の更新**: 以下の手順でWhopプランを更新
   - 月額プラン: $69/月
   - 3か月プラン: $165（新規作成）
   - 年額プラン: $588/年（現行$799から変更）

---

## 🔧 技術仕様

### API構成

- **CryptoQuant**: 定額プラン = $0追加コスト
- **Grok-4-0709**: $105/月（実測 - 36回/日 × 30日）
- **Telegram Bot**: $0（完全無料）
- **Upbit API**: $0（公開API）
- **Exchange Rate API**: $0（exchangerate-api.com）

### 配信構造（Phase 2 - イベント駆動）

**監視**: 15分ごと（`vercel.json: */15 * * * *`）

**配信トリガー**:
1. **EMERGENCY**（即座配信）
   - `trapScore > 60`（Whale Trap検知）
   - `liquidations > $500M`（異常清算）
   - `kimchiPremium > 8%`（極端なプレミアム）

2. **WATCH**（30分以内配信）
   - `score変動 > 30pt`（急激な市場変化）
   - `MPI < -20`（Miner売り圧強）

3. **STANDBY_BREAK**（即座配信）
   - 24時間以上BUG_STANDBY後の条件成立

4. **REGULAR**（24時間強制配信）
   - 安心感のための定期配信

**想定頻度 & コスト**:
- 静穏期: 1-2回/日/言語 → $35/月（-67%）
- 通常期: 3-5回/日/言語 → $87/月（-17%）
- 高ボラ期: 6-8回/日/言語 → $262/月（+150%）
- 年間平均: $55/月（-48%）
- 年間削減: $600

---

## 🎯 市場別戦略（簡略版）

### EN市場: Precision Sniper Academy

**Hero Message**: "You were exit liquidity."

**アルゴリズム設定**:
```javascript
{
  persona: 'PRECISION_SNIPER',
  brandName: 'CryptoTrade Academy',
  tagline: 'Market Referee - Spot traps before you fall',
  algorithm: {
    HARD_SIGNAL_THRESH: 28,
    SOFT_REGIME_THRESH: 20,
    MIN_CONF_FOR_TRADE: 0.6,
    BUG_STANDBY_BIAS: 15,
  },
  pricing: {
    trial: { days: 1, price: 0 },
    monthly: 69,
    annual: 690,
    currency: 'USD',
  },
}
```

### AR市場: MaaliGuard (حارس الأموال)

**Hero Message**: "70%の時間、私たちは言う:待て"

**アルゴリズム設定**:
```javascript
{
  persona: 'SHIELD_WALL',
  brandName: 'MaaliGuard',
  algorithm: {
    HARD_SIGNAL_THRESH: 18,
    SOFT_REGIME_THRESH: 12,
    MIN_CONF_FOR_TRADE: 0.4,
    BUG_STANDBY_BIAS: 70, // キャッチコピー逆算
  },
  islamicCompliant: true,
  pricing: {
    trial: { days: 1, price: 0 },
    monthly: 89,
    annual: 890,
    currency: 'USD',
  },
}
```

### KO市場: KimchiSniper (김치 저격수)

**Hero Message**: "3分ごとのKimchi Premium警告"

**アルゴリズム設定**:
```javascript
{
  persona: 'KIMCHI_SNIPER',
  brandName: 'KimchiSniper',
  algorithm: {
    HARD_SIGNAL_THRESH: 25,
    SOFT_REGIME_THRESH: 18,
    MIN_CONF_FOR_TRADE: 0.55,
    BUG_STANDBY_BIAS: 20,
    KIMCHI_PREMIUM_THRESH: 0.05, // 5%
  },
  pricing: {
    trial: { days: 1, price: 0 },
    monthly: 79000,
    annual: 790000,
    currency: 'KRW',
  },
}
```

---

## 📝 実装完了項目（2026-01-27）

### ✅ 完了項目

1. **KO市場の価格情報取得実装**
   - Upbit API: BTC/KRW価格取得
   - Binance API: BTC/USDT価格取得
   - Exchange Rate API: USD/KRW為替レート取得

2. **exchangeOutflowの実装**
   - CryptoQuant APIからExchange Outflowデータを取得
   - `services/cryptoquant/endpoints/btc.js`に追加
   - `services/cryptoquant/deepMetrics.js`に統合

3. **BUG_STANDBY命名の明確化**
   - コメント追加: "BUG_STANDBY = '70%の時間、何もするな'戦略（Trap Defense Academyの差別化ポイント）"
   - 命名の意図を明確化: "BUG"はバグではなく意図的な戦略

4. **環境変数の明確化**
   - `.env.example`ファイルを作成
   - 全環境変数の説明とデフォルト値を記載

### 🔄 進行中項目

1. **SSOTファイルの統合と整理**（本ファイル作成中）
2. **価格設定の統一**（Whop設定更新が必要）

### 📋 未完了項目

1. **テストコードの追加**
   - 主要機能のテスト実装
   - API統合テスト
   - 価格取得サービスのテスト

---

## 🔄 次のステップ

### 優先度: 高

1. **Whop設定の更新**
   - EN市場の月額プランを$89 → $69に変更
   - 3か月プラン（$165）を新規作成
   - 年額プランを$799 → $588に変更

2. **アフィリエイター報酬率の設定**
   - 1か月プラン: 50%
   - 3か月プラン: 45%
   - 1年間プラン: 40%

### 優先度: 中

1. **テストコードの追加**
   - 主要機能のユニットテスト
   - 統合テスト
   - E2Eテスト

2. **ドキュメントの更新**
   - README.mdの更新
   - APIドキュメントの整備

### 優先度: 低

1. **パフォーマンス最適化**
   - API呼び出しの最適化
   - キャッシュ戦略の実装

---

## 📚 参照ドキュメント

- `CryptoTrade Academy - Complete SSOT v5.0.md`（詳細版）
- `CryptoTrade Academy - Strategic SSOT v4.0 ULTIMATE.md`（戦略版）
- `CryptoTrade Academy - Technical Supplement v2.0.md`（技術版）

---

**最終更新**: 2026-01-27  
**次回レビュー**: アフィリエイト展開開始前
