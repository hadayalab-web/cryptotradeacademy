# 実装計画 - MCPサーバー最大限活用版
**最終更新**: 2026-01-17 14:07:03  
**作成日時**: 2026-01-17 14:07:03  

**作成日**: 2026-01-17
**ベース**: `SSOT_TRAP_DEFENSE_BTC.md`（木下ロジック廃止・MCPサーバー活用版）

---

## 🎯 実装方針

### 核心原則
- **木下ロジック完全廃止**: 商品力×リーチ力×レスポンス力の概念を削除
- **MCPサーバー最大限活用**: すべてのマーケティング活動をMCPで自動化
- **SSOT中心**: `SSOT_TRAP_DEFENSE_BTC.md`を唯一の真実の源として参照

---

## 📋 Phase 1: LP+Website構築（Week 1-2）

### Day 1-2: プロジェクトセットアップ
- [ ] Next.js 14+プロジェクト作成（6言語版）
- [ ] shadcn/ui + Tailwind CSS設定
- [ ] MCP統合（Grok/GPT/Gemini/Resend/Whop）

### Day 3-5: LP実装
- [ ] HeroSection（Gemini NanoBanana Pro画像）
- [ ] FeaturesSection（3つのUSP）
- [ ] PricingSection（Whop Embed Checkout）
- [ ] HeyGenVSL統合（Veo 3.1動画）

### Day 6-10: 多言語展開
- [ ] 6言語LP実装（EN/AR/KO/ES/PT-BR/JA）
- [ ] i18n設定
- [ ] 言語別価格表示

---

## 🤝 Phase 2: アフィリエイト戦略実装（Week 2-3）

### MCPサーバー連携
- [ ] whop-affiliate-monitor MCP: 候補検索・CVR計算
- [ ] telegram-affiliate-dm MCP: DM送信自動化
- [ ] phase7-affiliate MCP: 統合実行

### 自動化フロー
- [ ] 日次バッチ検索（Vercel Cron）
- [ ] CVRランキング更新
- [ ] 優先順位別DM送信
- [ ] 進捗トラッキング（Notion Database）

---

## 🔄 Phase 3: GitHub+Vercel運用（Week 1-2）

### GitHub Actions設定
- [ ] `.github/workflows/deploy.yml`（本番デプロイ）
- [ ] `.github/workflows/deploy-preview.yml`（プレビュー）
- [ ] `.github/workflows/test.yml`（テスト）

### Vercel設定
- [ ] 環境変数設定（6言語×各API）
- [ ] Cron Jobs設定（アフィリエイター検索、メールフォローアップ）

---

## ✅ 優先タスク（即座実行）

1. **SSOT更新確認**: 木下ロジック削除、MCP活用統合完了
2. **LP実装開始**: Next.jsプロジェクト作成
3. **MCP統合**: Grok/GPT/Gemini/Resend/Whop MCP接続確認

---

**Status**: 📋 実装計画確定  
**次回**: Phase 1実装開始
