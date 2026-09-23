# Whop設定完成計画

## 問題の特定

### 1. Whop設定が不十分

**確認された問題**:
- KO/JA/ES/PT-BR市場のプランIDがプレースホルダー（`plan_XX_XXXXX`）
- プロダクト説明、特徴、価格設定が未完成の可能性
- Whop販売ページ（プロダクトページ）の設定が不十分

**現状** (`lib/whop/constants.ts`):
```typescript
KO: {
  MONTHLY: 'plan_KO_MONTHLY_XXXXX',  // ⏳ 後で設定予定
  QUARTERLY: 'plan_KO_QUARTERLY_XXXXX',
  YEARLY: 'plan_KO_YEARLY_XXXXX',
},
```

### 2. Whopの販売ページが未完成

**確認された問題**:
- プロダクト説明がSSOTの内容と一致していない可能性
- 特徴（5つの特徴）が反映されていない
- ベネフィット（10個の感情的ベネフィット）が反映されていない
- 価格設定がSSOTと一致していない可能性

---

## 実装計画

### Phase 1: Whopプロダクト情報の確認

**目的**: 現在のWhopプロダクト設定を確認

**手順**:
1. Whop MCPを使用して各市場のプロダクト情報を取得
2. プラン情報を取得
3. 現在の設定を確認

**使用ツール**:
- `mcp_whop_whop_get_product` - プロダクト情報取得
- `mcp_whop_whop_get_plans` - プラン情報取得

---

### Phase 2: SSOTベースのWhop設定データ作成

**目的**: SSOTの内容をWhop設定用データに変換

**必要な情報** (SSOT参照):

#### プロダクト説明（各市場）

**EN市場**:
- **Name**: "CryptoTrade Academy" / "BTC TrapShield Academy"
- **Headline**: "Stop being exit liquidity: Get NO-TRADE alerts + a Trap Risk Score before the breakout traps you"
- **Description**: SSOTの3つのUSP、5つの特徴、10個のベネフィットを含む

**価格設定** (SSOT参照):
- **月額エントリー**: $69/月（renewal、30日サブスク）
- **Pro 3ヶ月**: $165（one_time、20%OFF、月額換算$55）
- **Elite 年間**: $588（one_time、29%OFF、月額換算$49）

**特徴（5つ）**:
1. 高解像度トラップ防御エンジン（Trap Defense Engine）
2. 70%待機戦略（TRAP_STANDBY）による防御的アプローチ
3. 精度/確度の追求（「勝率」ではなく「精度/確度」）
4. Gemini AI視覚的ストーリーテリング
5. Dr. Grok心理的サポート

**ベネフィット（10個）**:
1. 不安からの解放
2. 自信の回復
3. 規律の維持
4. 損失回避
5. 明確な判断基準
6. 感情的な取引判断の削減
7. 情報過多による混乱の解消
8. 孤独な判断からの解放
9. 継続的な学習機会
10. コミュニティサポート

---

### Phase 3: Whopプロダクト・プラン更新スクリプト作成

**目的**: SSOTベースの設定でWhopプロダクト・プランを更新

**実装内容**:
1. Whop MCPを使用してプロダクト更新
2. プラン更新（説明、価格、特徴）
3. 各市場（6言語）に対応

**スクリプト**: `scripts/whop-complete-setup-from-ssot.js`

---

### Phase 4: プランIDの確認と更新

**目的**: 実際のプランIDを取得して`constants.ts`を更新

**手順**:
1. Whop MCPで各市場のプランを取得
2. 実際のプランIDを確認
3. `lib/whop/constants.ts`を更新

---

## 実装優先順位

### 🔴 最優先（MVPローンチ前に必須）

1. **EN市場のWhop設定確認・更新**
   - プロダクト説明の完成
   - プラン説明の更新
   - 特徴・ベネフィットの反映

2. **AR市場のWhop設定確認・更新**
   - 同様に設定を完成

### 🟡 次優先（ローンチ後1週間以内）

3. **KO/JA/ES/PT-BR市場のWhop設定**
   - プランIDの確認・更新
   - プロダクト説明の完成

---

## 参考ドキュメント

- SSOT: `cryptosignal-ai/docs/SSOT_TRAP_DEFENSE_BTC.md`
- Whop MCP: `scripts/whop-mcp-server.js`
- 現在の設定: `hadayalab-website-dev/cryptotradeacademy-lp-dev/orientation-lp/lib/whop/constants.ts`
