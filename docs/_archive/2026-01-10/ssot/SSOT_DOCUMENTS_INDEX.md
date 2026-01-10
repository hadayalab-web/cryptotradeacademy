# 重要なSSOTドキュメント一覧

## 実施日時
2026-01-07

## 主要SSOTドキュメント

### 1. 🎯 CryptoTrade Academy - Strategic SSOT v4.0 ULTIMATE
**ファイル**: `docs/CryptoTrade Academy - Strategic SSOT v4.0 ULTIMATE.md`  
**バージョン**: 4.1 ULTIMATE  
**ステータス**: ✅ Phase1-Product実装完了・統合完了・テスト完了  
**目的**: 再現性・即効性最大化の戦略SSOT + 実装LLMプロンプト

**内容**:
- 木下ロジック①②完全統合（年商100億の公式、カテゴリ創造）
- 6市場×3C分析
- 実装手順（LLMプロンプト）
- KPI定義
- **明記**: 「このドキュメントが唯一の真実(Single Source of Truth)です」

**重要セクション**:
- Section 0: 木下ロジック完全統合
- Section 1: 6市場×3C分析
- Section 2: LLMプロンプト（実装手順）
- Section 3: KPI定義・測定

---

### 2. 🎯 CryptoTrade Academy - Complete SSOT v5.0
**ファイル**: `docs/CryptoTrade Academy - Complete SSOT v5.0.md`  
**バージョン**: 5.1 COMPLETE  
**ステータス**: ✅ Phase1-Product実装完了・統合完了・テスト完了  
**目的**: Strategic & Technical統合版

**内容**:
- Strategic SSOT v4.0 + Technical Supplement v2.0 の統合版
- 戦略と技術仕様を1つのドキュメントに統合
- **明記**: 「このドキュメントが唯一の真実(Single Source of Truth)です」

**構成**:
- Strategic SSOT v4.0の全セクション
- Technical Supplement v2.0の技術仕様
- 旧SSOT削除推奨項目
- 実装手順の完全統合

---

### 3. 🛠️ CryptoTrade Academy - Technical Supplement v2.0
**ファイル**: `docs/CryptoTrade Academy - Technical Supplement v2.0.md`  
**バージョン**: 2.0  
**ステータス**: ✅ コード実装完了  
**目的**: Strategic SSOT v4.0実装に必要な技術仕様完全版

**内容**:
- Repository構造
- 既存コードベース説明
- Vercel環境変数完全定義
- API実装詳細
- 既存実装との統合方法

**位置づけ**:
```yaml
Primary SSOT: Strategic SSOT v4.0 ULTIMATE
Technical Supplement v2.0(本ドキュメント):
  - Repository構造
  - 既存コードベース説明
  - Vercel環境変数完全定義
  - API実装詳細
  - 既存実装との統合方法
```

---

### 4. 🎯 CryptoTrade Academy - Integrated SSOT v6.0
**ファイル**: `docs/SSOT_INTEGRATED_V6.0.md`  
**バージョン**: 6.0 INTEGRATED  
**ステータス**: ✅ アフィリエイト展開準備完了  
**目的**: プロジェクト完全統一SSOT（戦略・技術・価格・実装）

**内容**:
- プロダクト概要（CryptoSignalAI / CryptoTrade Academy）
- カテゴリ創造（Trap Defense Academy）
- 価格設定（6市場別）
- アフィリエイト戦略
- 価格設定の不一致と解決方針

**特徴**:
- アフィリエイト展開最適化
- 6市場別価格設定の最終決定版
- Whopプラン更新ガイド

---

### 5. 🎯 SSOT ChangeEdge BTC
**ファイル**: `docs/SSOT_CHANGEEDGE_BTC.md`  
**バージョン**: 1.0 FINAL  
**ステータス**: ✅ マーケティング戦略確定版  
**目的**: ChangeEdge BTC の完全統一SSOT（戦略・技術・価格・実装・メッセージング）

**内容**:
- プロダクト名: **ChangeEdge BTC**
- ブランド名: **CryptoTradeAcademy**
- タグライン: "Change the trend. Change your game. Get the edge."
- 核心価値提案（USP）
- マーケティング戦略

**特徴**:
- 「2つのチェンジ」を提供
  1. トレンド転換のチェンジ
  2. 弱小トレーダーから脱却のチェンジ

---

## SSOTドキュメントの階層構造

```
Strategic SSOT v4.0 ULTIMATE (戦略の正)
    ↓
Complete SSOT v5.0 (戦略 + 技術統合版)
    ↓
Technical Supplement v2.0 (技術補完)
    ↓
Integrated SSOT v6.0 (アフィリエイト戦略対応版)
    ↓
SSOT ChangeEdge BTC (プロダクト別SSOT)
```

## 参照関係

### 主要SSOT
1. **Strategic SSOT v4.0 ULTIMATE** - 戦略の基盤（WHAT/WHY）
2. **Complete SSOT v5.0** - 戦略 + 技術の完全統合版
3. **Technical Supplement v2.0** - 技術実装の詳細

### 派生SSOT
4. **Integrated SSOT v6.0** - アフィリエイト展開最適化版
5. **SSOT ChangeEdge BTC** - プロダクト別マーケティング戦略

## 使用推奨順序

1. **新規実装時**: `Complete SSOT v5.0.md` を参照
2. **戦略理解時**: `Strategic SSOT v4.0 ULTIMATE.md` を参照
3. **技術実装時**: `Technical Supplement v2.0.md` を参照
4. **価格・アフィリエイト設定時**: `SSOT_INTEGRATED_V6.0.md` を参照
5. **マーケティング戦略時**: `SSOT_CHANGEEDGE_BTC.md` を参照

## 注意事項

- **Strategic SSOT v4.0 ULTIMATE** と **Complete SSOT v5.0** は「唯一の真実」と明記
- 旧SSOT（v1.1, v1.5.0, v0.2）は削除推奨（Complete SSOT v5.0 Section 11参照）
- 価格設定の不一致がある場合は `SSOT_INTEGRATED_V6.0.md` を参照
