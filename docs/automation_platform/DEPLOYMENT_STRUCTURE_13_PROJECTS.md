# デプロイ構造 - 13プロジェクト（Trap Defence BTC専用）

**作成日**: 2026-01-09  
**更新日**: 2026-01-09  
**目的**: 13個のプロジェクトのデプロイ構造を明確化  
**重要**: 現在の13プロジェクトは**Trap Defence BTC専用**。将来的に他のプロダクト（ETH、Alt Bundle等）が追加される予定

---

## 🎯 現在のプロダクト

**プロダクト名**: **Trap Defence BTC**  
**ブランド名**: **CryptoTradeAcademy**  
**基本ドメイン**: **cryptotradeacademy.io**

---

## 📋 デプロイ対象（13プロジェクト - Trap Defence BTC専用）

### 1. ユーザー向けLP（6プロジェクト）

| プロジェクト名 | サブドメイン | ディレクトリ |
|---------------|------------|------------|
| `cryptotradeacademy-lp-user-en` | `en.cryptotradeacademy.io` | `cryptotradeacademy-lp-en/` |
| `cryptotradeacademy-lp-user-es` | `es.cryptotradeacademy.io` | `cryptotradeacademy-lp-es/` |
| `cryptotradeacademy-lp-user-pt-br` | `pt-br.cryptotradeacademy.io` | `cryptotradeacademy-lp-pt-br/` |
| `cryptotradeacademy-lp-user-ar` | `ar.cryptotradeacademy.io` | `cryptotradeacademy-lp-ar/` |
| `cryptotradeacademy-lp-user-ko` | `ko.cryptotradeacademy.io` | `cryptotradeacademy-lp-ko/` |
| `cryptotradeacademy-lp-user-ja` | `ja.cryptotradeacademy.io` | `cryptotradeacademy-lp-ja/` |

### 2. アフィリエイター向けLP（6プロジェクト）

| プロジェクト名 | サブドメイン | ディレクトリ |
|---------------|------------|------------|
| `cryptotradeacademy-lp-affiliate-en` | `affiliate-en.cryptotradeacademy.io` | `cryptotradeacademy-lp-en/app/affiliate/` |
| `cryptotradeacademy-lp-affiliate-es` | `affiliate-es.cryptotradeacademy.io` | `cryptotradeacademy-lp-es/app/affiliate/` |
| `cryptotradeacademy-lp-affiliate-pt-br` | `affiliate-pt-br.cryptotradeacademy.io` | `cryptotradeacademy-lp-pt-br/app/affiliate/` |
| `cryptotradeacademy-lp-affiliate-ar` | `affiliate-ar.cryptotradeacademy.io` | `cryptotradeacademy-lp-ar/app/affiliate/` |
| `cryptotradeacademy-lp-affiliate-ko` | `affiliate-ko.cryptotradeacademy.io` | `cryptotradeacademy-lp-ko/app/affiliate/` |
| `cryptotradeacademy-lp-affiliate-ja` | `affiliate-ja.cryptotradeacademy.io` | `cryptotradeacademy-lp-ja/app/affiliate/` |

### 3. アフィリエイター募集の自動化ワークフロー（1プロジェクト）

| プロジェクト名 | サブドメイン | ディレクトリ |
|---------------|------------|------------|
| `cryptotradeacademy-workflow-affiliate` | `workflow-api.cryptotradeacademy.io` | `cryptotradeacademy-lp-ja/app/api/workflows/` |

**合計: 13プロジェクト**

---

## 🔍 現在の構造の問題点

### 問題1: ワークフローAPIの配置

**現在**: `cryptotradeacademy-lp-ja/app/api/workflows/` に実装されている

**問題**: 
- ワークフローAPIは日本語LPプロジェクトに依存している
- 独立したプロジェクトとしてデプロイできない

### 問題2: ユーザー向けLPとアフィリエイター向けLPの分離

**現在**: 
- `orientation-lp`プロジェクトに統合されている（`[market]`ルーティング）
- 各市場プロジェクト（`cryptotradeacademy-lp-ja`等）も存在

**問題**:
- どちらが実際にデプロイされるのか不明確
- サブドメインが割り当てられるなら、それぞれ別プロジェクトが必要

---

## ✅ 正しい構造

### オプションA: 市場別プロジェクト（推奨）

各市場プロジェクト（`cryptotradeacademy-lp-ja`等）を：
1. **ユーザー向けLP専用プロジェクト**としてデプロイ
2. **アフィリエイター向けLP専用プロジェクト**としてデプロイ（別プロジェクトとして分離）

### オプションB: ワークフローAPIの独立化

ワークフローAPIを`cryptotradeacademy-lp-ja`から独立させ、専用プロジェクトとして作成

---

## 🚀 次のステップ

1. **ワークフローAPIの独立化**
   - `cryptotradeacademy-lp-ja/app/api/workflows/` を独立プロジェクトに移動
   - または、新しいプロジェクトとして作成

2. **アフィリエイター向けLPの分離**
   - 各市場プロジェクトから`app/affiliate/`を独立プロジェクトとして分離
   - または、既存の市場プロジェクトをアフィリエイター向けLP専用に変更

3. **デプロイ構造の明確化**
   - 13プロジェクトそれぞれのVercelプロジェクト設定
   - 環境変数の設定

---

**確認が必要**: 現在の`cryptotradeacademy-lp-ja`などの市場別プロジェクトは、ユーザー向けLPとアフィリエイター向けLPのどちらを想定していますか？

---

## 🚀 将来のプロダクト拡張計画

### 現在の構造（Trap Defence BTC専用）

現在の13プロジェクトはすべて**Trap Defence BTC**を売るためのものです。

### 将来追加予定のプロダクト

1. **Trap Defence ETH**
   - ETH専用のトラップ防御プロダクト
   - 13プロジェクト × 1 = **13プロジェクト追加予定**

2. **Trap Defence Alt Bundle**
   - アルトコイン版（BTC版の焼き増し）
   - 年間プランの特典として提供予定
   - 13プロジェクト × 1 = **13プロジェクト追加予定**

3. **その他のプロダクト**
   - 将来的に追加される可能性のあるプロダクト
   - 各プロダクトごとに13プロジェクトが必要

### スケーラビリティ

**現在**: 13プロジェクト（Trap Defence BTC専用）  
**将来**: プロダクト数 × 13プロジェクト

**例**:
- Trap Defence BTC: 13プロジェクト
- Trap Defence ETH: 13プロジェクト
- Trap Defence Alt Bundle: 13プロジェクト
- **合計**: 39プロジェクト（3プロダクトの場合）

### アーキテクチャの拡張性

現在の構造は、プロダクトごとに独立した13プロジェクトを追加できる設計になっています：

```
cryptotradeacademy.io
├─ Trap Defence BTC（現在）
│  ├─ ユーザー向けLP（6プロジェクト）
│  ├─ アフィリエイター向けLP（6プロジェクト）
│  └─ 自動化ワークフロー（1プロジェクト）
│
├─ Trap Defence ETH（将来）
│  ├─ ユーザー向けLP（6プロジェクト）
│  ├─ アフィリエイター向けLP（6プロジェクト）
│  └─ 自動化ワークフロー（1プロジェクト）
│
└─ Trap Defence Alt Bundle（将来）
   ├─ ユーザー向けLP（6プロジェクト）
   ├─ アフィリエイター向けLP（6プロジェクト）
   └─ 自動化ワークフロー（1プロジェクト）
```

**重要**: 各プロダクトは独立した13プロジェクトとしてデプロイされ、同じ`cryptotradeacademy.io`ドメイン配下で運用されます。
