# TrapShield

**📦 プロダクト** - TrapShield

BTCトレーダー向けのTrap検知プラットフォーム（Vercelデプロイ）

## 🎯 位置づけ

**cryptosignal-ai = プロダクト**

- **役割**: コアシステム実装・実行（Vercelデプロイ、Telegram配信）
- **責任範囲**: API統合、ロジック実装、データ処理、配信システム
- **関連プロジェクト**:
  - **戦略本部**: `hadayalab-automation-platform` - 戦略立案・ワークフロー設計
  - **ナレッジベース**: `hadayalab-knowledge-base` - 理論文献・戦略文献の管理

## 🎯 概要

TrapShieldは、BTCトレーダー向けのTrap検知プラットフォームです。
- **プラットフォーム**: Vercel（6市場独立デプロイメント）
- **配信**: Telegram（イベント駆動配信）
- **技術**: Node.js, CryptoQuant API, Grok AI, Telegram Bot API

## 🔗 3プロジェクト連携構造

### プロジェクト位置づけ

```
🏛️ 戦略本部: hadayalab-automation-platform
    ├── 📦 プロダクト: cryptosignal-ai（このプロジェクト）
    └── 📚 ナレッジベース: hadayalab-knowledge-base
```

### 1. 🏛️ 戦略本部: hadayalab-automation-platform
**位置づけ**: 戦略本部（戦略立案・ワークフロー設計）

**役割**: n8nワークフロー自動化（Trial Onboarding、Affiliate管理など）

**パス**: `C:\Users\chiba\hadayalab-automation-platform\`

**戦略ドキュメント**: `docs/cryptosignal-ai/strategy/` に移動済み

**参照方法**: 戦略立案・ワークフロー設計は戦略本部を参照してください。

---

### 2. 📚 ナレッジベース: hadayalab-knowledge-base
**位置づけ**: ナレッジベース（理論文献・戦略文献の管理）

**役割**: 戦略ドキュメント・理論文献の管理

**パス**: `C:\Users\chiba\hadayalab-knowledge-base\literature\strategy\`

**参照方法**: 理論文献・戦略文献はナレッジベースを参照してください。

---

## 🔄 プロジェクト間の連携フロー

```
📚 ナレッジベース (hadayalab-knowledge-base)
    ↓ 戦略・理論の提供
🏛️ 戦略本部 (hadayalab-automation-platform)
    ↓ 戦略に基づくワークフロー設計
📦 プロダクト (cryptosignal-ai) ← このプロジェクト
    ↓ コアシステム実装・実行
```

---

## 📁 ディレクトリ構成

```
cryptosignal-ai/
├── api/
│   ├── config/          # 市場別設定
│   └── cron.js          # Vercel Cron Job エントリーポイント
├── services/
│   ├── cryptoquant/     # CryptoQuant API クライアント
│   ├── grok/            # Grok AI API クライアント
│   └── telegram/        # Telegram Bot API & メッセージテンプレート
├── logic/
│   ├── core/            # 市場判定コアロジック
│   ├── eventTriggers.js # イベント駆動トリガー判定
│   └── tier1_btc/       # BTC分析ロジック
├── utils/               # ユーティリティ関数
├── data/                # データファイル
├── scripts/             # 開発・デバッグ用スクリプト
├── docs/                # 開発・デバッグ用ドキュメント
└── vercel.json          # Vercel設定（6デプロイメント）
```

---

## 🚀 クイックスタート

### 環境変数設定
Vercel Dashboardで以下の環境変数を設定：
- `CRYPTOQUANT_API_KEY`
- `XAI_API_KEY` (Grok)
- `TELEGRAM_BOT_TOKEN`
- `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` (Phase 1: イベント駆動)
- `ENABLE_EVENT_DRIVEN=true`

### デプロイ
Vercelに自動デプロイされます（GitHub連携）

### ローカル開発
```bash
# 依存関係のインストール
npm install

# ローカルテスト
npm run test:local

# バックテスト
npm run backtest:real
npm run summary:real
```

---

## 📖 開発・デバッグドキュメント

### 本リポジトリ（cryptosignal-ai）
- **開発ガイド**: `docs/CRYPTOQUANT_API_VERIFICATION_GUIDE.md`
- **APIリファレンス**: `docs/cryptoquant-reference.md`
- **バックテスト**: `docs/BACKTEST_IMPROVEMENT_PLAN.md`
- **GitHub Copilot**: `docs/GITHUB_COPILOT_REVIEW_GUIDE.md`

### 戦略ドキュメント（hadayalab-automation-platform）
戦略ドキュメントは `hadayalab-automation-platform/docs/cryptosignal-ai/strategy/` に移動済み：
- `CryptoTrade Academy - Complete SSOT v5.0.md`
- `CryptoTrade Academy - Sales Strategy Doping v2.0 FINAL.md`
- `CryptoTrade Academy - Creative Execution Master Guide v1.0.md`
- `CryptoTrade Academy - Zero-Budget Affiliate DRM Strategy v1.1 + APDS v1.0.md`

---

## 🔄 プロジェクト間の連携

```
hadayalab-knowledge-base (戦略・理論)
    ↓
cryptosignal-ai (コアシステム実装)
    ↓
hadayalab-automation-platform (n8nワークフロー自動化)
```

---

## 📋 開発フロー

1. **コード実装**: 本リポジトリ（cryptosignal-ai）で実装
2. **ローカルテスト**: `npm run test:local`
3. **バックテスト**: `npm run backtest:real`
4. **デプロイ**: Vercelに自動デプロイ
5. **ワークフロー連携**: `hadayalab-automation-platform` でn8nワークフローを実装

---

## 🔗 リンク

- **Vercel**: [デプロイメントダッシュボード](https://vercel.com)
- **Telegram**: [配信チャンネル](https://t.me)
- **GitHub**: [hadayalab-web/cryptosignal-ai](https://github.com/hadayalab-web/cryptosignal-ai)

---

## ⚠️ 注意事項

- **デプロイ**: このリポジトリはデプロイに必要なコードのみを含みます
- **戦略ドキュメント**: `hadayalab-automation-platform/docs/cryptosignal-ai/strategy/` を参照
- **開発ドキュメント**: `docs/` フォルダ内の開発・デバッグ用ドキュメントを参照
