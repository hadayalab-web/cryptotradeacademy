# CryptoTrade Academy

CryptoTrade Academy - トレード教育プラットフォーム（Vercelデプロイ）

## 🎯 概要

CryptoTrade Academyは、BTCトレーダー向けの教育プラットフォームです。
- **プラットフォーム**: Vercel（6市場独立デプロイメント）
- **配信**: Telegram（イベント駆動配信）
- **戦略**: Complete SSOT v5.1に基づく

## 🔗 関連リポジトリ

このプロジェクトは以下のリポジトリと連携しています：

### 1. hadayalab-knowledge-base
**役割**: 戦略ドキュメント・理論文献の管理

**参照ドキュメント**:
- `CryptoTrade Academy - Complete SSOT v5.1.md`（本リポジトリのdocsフォルダにも配置）
- `CryptoTrade Academy - Sales Strategy Doping v2.0 FINAL.md`
- `CryptoTrade Academy - Creative Execution Master Guide v1.0.md`
- `CryptoTrade Academy - Zero-Budget Affiliate DRM Strategy v1.1 + APDS v1.0.md`

**パス**: `C:\Users\chiba\hadayalab-knowledge-base\literature\strategy\`

**参照方法**: 戦略判断・理論実装の詳細が必要な場合は、knowledge-baseのドキュメントを参照してください。

---

### 2. hadayalab-automation-platform
**役割**: n8nワークフロー自動化（Trial Onboarding、Affiliate管理など）

**関連ワークフロー**:
- Trial Onboarding Automation
- Emergency Briefing Trigger
- Affiliate Auto-Management
- Affiliate DRM Cold Outreach

**パス**: `C:\Users\chiba\hadayalab-automation-platform\`

**参照方法**: n8nワークフローの実装・変更はautomation-platformリポジトリで管理されます。

---

## 📚 主要ドキュメント

### 戦略ドキュメント（SSOT）
- **[CryptoTrade Academy - Complete SSOT v5.1](./docs/CryptoTrade Academy - Complete SSOT v5.0.md)** - 唯一の真実（Single Source of Truth）
  - 木下ロジック完全統合
  - 市場別戦略（3C分析 + USPエビデンス）
  - 実装チェックリスト & LLMプロンプト
  - 収益モデル & KPI

### 参照ドキュメント
- `CryptoTrade Academy - Sales Strategy Doping v2.0 FINAL.md` - Nudge/Influence/MECLABS理論実装詳細
- `CryptoTrade Academy - Creative Execution Master Guide v1.0.md` - Whop/Make/HeyGen/Adobe実装手順
- `CryptoTrade Academy - Zero-Budget Affiliate DRM Strategy v1.1 + APDS v1.0.md` - Affiliate戦略詳細

**注意**: 上記参照ドキュメントは詳細実装の参考として使用。戦略の真実（SSOT）はComplete SSOT v5.1が唯一のソース。

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
├── docs/                # 戦略ドキュメント
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

---

## 📖 ドキュメント構造

### 本リポジトリ（cryptosignal-ai）
- **戦略SSOT**: `docs/CryptoTrade Academy - Complete SSOT v5.0.md`
- **コード実装**: API、ロジック、サービス層

### hadayalab-knowledge-base
- **戦略ドキュメント**: `literature/strategy/`
- **理論文献**: `literature/marketing/`, `literature/strategy/`

### hadayalab-automation-platform
- **n8nワークフロー設計**: `n8n-workflows-design.md`
- **ワークフロー実装**: `workflows/`, `workflow-*.json`

---

## 🔄 プロジェクト間の連携

```
hadayalab-knowledge-base (戦略・理論)
    ↓
cryptosignal-ai (コアシステム実装)
    ↓
hadayalab-automation-platform (n8nワークフロー自動化)
```

**フロー**:
1. **knowledge-base**: 戦略ドキュメント（Complete SSOT v5.1）を参照
2. **cryptosignal-ai**: Complete SSOT v5.1に基づいてコアシステムを実装
3. **automation-platform**: Complete SSOT v5.1に基づいてn8nワークフローを実装

---

## 📋 開発フロー

1. **戦略確認**: `hadayalab-knowledge-base` または `docs/CryptoTrade Academy - Complete SSOT v5.0.md` を参照
2. **コード実装**: 本リポジトリ（cryptosignal-ai）で実装
3. **ワークフロー実装**: `hadayalab-automation-platform` でn8nワークフローを実装
4. **検証**: Vercelデプロイ & n8n Cloud実行

---

## 🔗 リンク

- **Vercel**: [デプロイメントダッシュボード](https://vercel.com)
- **Telegram**: [配信チャンネル](https://t.me)
- **GitHub**: [hadayalab-web/cryptosignal-ai](https://github.com/hadayalab-web/cryptosignal-ai)

---

## ⚠️ 注意事項

- **SSOT**: Complete SSOT v5.1が唯一の真実（Single Source of Truth）
- **参照ドキュメント**: 詳細実装の参考として使用（矛盾がある場合はComplete SSOT v5.1を優先）
- **プロジェクト間連携**: 各リポジトリの役割を理解して使用してください

