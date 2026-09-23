# Whopプロダクトページ - タスク3 VSL統合ガイド

**作成日**: 2026-01-12  
**対象**: Whop ENプロダクトページ  
**VSL**: タスク3（Video Sales Letterスクリプト）

---

## 🎯 タスク3 VSLをWhopページ用に利用する理由

### タスク3の特徴

1. **詳細なVSL構造**:
   - Opening → Problem → Solution → Proof → CTA
   - 約1分28秒（88秒）で、より包括的な説明

2. **3つの柱の詳細説明**:
   - Trap Defense Engine（高解像度トラップ検知エンジン）
   - Gemini Visual Storytelling（複雑なデータを視覚ストーリーへ）
   - Dr. Grok（心理的サポート）

3. **価格提示**:
   - $69の価格が明確に提示されている
   - Whopページの価格情報と一致

4. **プロフェッショナルなVideo Sales Letter構造**:
   - 問題提起が明確
   - 解決策の提示が具体的
   - 証拠（メンバーの生存率）が提示されている
   - CTAが明確

---

## 📊 タスク3 VSLの詳細

### HeyGen情報

- **Video ID**: `aa35321fab7c49888749230c5a2c2ecb`
- **埋め込みURL**: `https://app.heygen.com/embedded-player/aa35321fab7c49888749230c5a2c2ecb`
- **動画時間**: 約1分28秒（88秒）
- **ストーリータイプ**: Video Sales Letter

### 埋め込みコード

```html
<iframe width="560" height="315" src="https://app.heygen.com/embedded-player/aa35321fab7c49888749230c5a2c2ecb" title="HeyGen ビデオプレーヤー" frameborder="0" allow="encrypted-media; fullscreen;" allowfullscreen></iframe>
```

---

## 📝 Whop Dashboardでの実装手順

### ステップ1: Whopプロダクトページにアクセス

1. Whop Dashboardにログイン
2. プロダクトページを開く: `https://whop.com/aio-media-llc/trap-defense-btc-en/`
3. 「Edit Product」をクリック

### ステップ2: VSLセクションの追加または更新

1. **VSLセクションを探す**:
   - 「Media」または「Video」セクションを開く
   - 既存のVSLがある場合は、編集または置き換え

2. **タスク3のVSLを埋め込み**:
   - 「Embed Video」または「Custom HTML」オプションを選択
   - 以下の埋め込みコードを貼り付け:

```html
<iframe width="560" height="315" src="https://app.heygen.com/embedded-player/aa35321fab7c49888749230c5a2c2ecb" title="HeyGen ビデオプレーヤー" frameborder="0" allow="encrypted-media; fullscreen;" allowfullscreen></iframe>
```

3. **レスポンシブ対応**（推奨）:
   - Whopが自動的にレスポンシブ対応していない場合、以下のCSSを追加:

```css
.vsl-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9アスペクト比 */
  height: 0;
  overflow: hidden;
  max-width: 100%;
}

.vsl-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

### ステップ3: VSLセクションのタイトルと説明

**推奨タイトル**:
```
Why Most Traders Lose Money: The Hidden Trap Defense Protocol
```

**推奨説明**:
```
Watch this 90-second video to discover how Trap Defence BTC protects your capital from market traps using CryptoQuant data, AI-powered analysis, and psychological support.
```

### ステップ4: VSLの配置

**推奨配置**:
- **ファーストビュー（Hero Section）**: VSLをページの冒頭に配置
- **VSLの下**: 権威性を示す画像（CryptoQuant、AIハイブリッド、Telegramスマホ）を配置
- **VSLの横（PC版）**: 権威性画像を並列配置

---

## 🎨 レイアウト戦略

### PC版レイアウト

```
┌─────────────────────────────────────────┐
│  [VSL動画 - タスク3]                    │
│  (約1分28秒、Video Sales Letter構造)    │
│                                         │
│  [権威性画像1] [権威性画像2] [権威性画像3] │
│  (CryptoQuant) (AI Hybrid) (Telegram)   │
└─────────────────────────────────────────┘
```

### モバイル版レイアウト

```
┌─────────────────┐
│  [VSL動画]      │
│  (タスク3)      │
├─────────────────┤
│  [権威性画像1]  │
│  (CryptoQuant)  │
├─────────────────┤
│  [権威性画像2]  │
│  (AI Hybrid)    │
├─────────────────┤
│  [権威性画像3]  │
│  (Telegram)     │
└─────────────────┘
```

---

## 📋 タスク3 VSLの内容構造

### 1. Opening (0:00-0:45)
- 注意を引くフック
- Two traders, Trader A and Trader Bの対比

### 2. Problem (0:45-1:30)
- Bitcoin取引の難しさ
- 感情的な判断の危険性
- 市場の罠（トラップ）

### 3. Solution (1:30-2:45)
- Trap Defence BTCの紹介
- 3つの柱の説明:
  - Trap Defense Engine
  - Gemini Visual Storytelling
  - Dr. Grok

### 4. Proof (2:45-3:30)
- メンバーの成功事例
- 生存率の向上
- 心理的サポートの効果

### 5. CTA (3:30-4:00)
- 明確な行動喚起
- 価格提示（$69）
- 次のステップ

---

## ✅ 実装チェックリスト

- [ ] Whop Dashboardでプロダクトページを開く
- [ ] VSLセクションを追加または更新
- [ ] タスク3のVSL埋め込みコードを貼り付け
- [ ] レスポンシブ対応を確認
- [ ] VSLセクションのタイトルと説明を追加
- [ ] 権威性画像をVSLの下または横に配置
- [ ] PC版とモバイル版の表示を確認
- [ ] VSLが正しく再生されることを確認
- [ ] プレビューで全体のレイアウトを確認
- [ ] 本番環境で公開

---

## 💡 タスク3を選択した理由

### タスク1との比較

| 項目 | タスク1 | タスク3 |
|------|---------|---------|
| **動画時間** | 約1分10秒 | 約1分28秒 |
| **構造** | Two Young Menストーリー | Video Sales Letter構造 |
| **説明の詳細度** | 感情的な訴求 | より詳細な説明 |
| **価格提示** | なし | あり（$69） |
| **3つの柱の説明** | 簡潔 | 詳細 |

### Whopページに適している理由

1. **より詳細な説明**: Whopページは購入前の最終確認地点。より詳細な情報が必要
2. **価格提示**: タスク3は価格（$69）を明確に提示しており、Whopページの価格情報と一致
3. **プロフェッショナルな構造**: Video Sales Letter構造は、購入決定を促すのに適している
4. **3つの柱の詳細説明**: Trap Defense Engine、Gemini Visual Storytelling、Dr. Grokを詳細に説明

---

## 📝 メタデータの更新

タスク3のVSLをWhopページ用に使用する場合、メタデータを更新することを推奨します:

```json
{
  "id": "task3-vsl-script",
  "usageLocation": "Whopプロダクトページ（メイン使用）",
  "usagePolicy": "Whopページ用メイン使用",
  "primaryUsage": true,
  "whopProductPage": {
    "enabled": true,
    "productUrl": "https://whop.com/aio-media-llc/trap-defense-btc-en/",
    "placement": "Hero Section / First View"
  }
}
```

---

## 🚀 次のステップ

1. **Whop Dashboardでの実装**: 上記の手順に従ってVSLを埋め込み
2. **レイアウトの最適化**: 権威性画像とVSLの配置を最適化
3. **A/Bテスト**: タスク1とタスク3でA/Bテストを実施し、CVRを比較
4. **メタデータの更新**: `data/vsl-heygen/vsl-heygen-metadata.json`を更新

---

**最終更新**: 2026-01-12  
**状態**: ✅ タスク3 VSLをWhopページ用に利用する方針決定
