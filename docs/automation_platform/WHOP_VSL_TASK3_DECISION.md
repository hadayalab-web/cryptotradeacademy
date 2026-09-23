# Whopプロダクトページ - タスク3 VSL採用決定

**決定日**: 2026-01-12  
**決定者**: CEO  
**状態**: ✅ **決定完了**

---

## 🎯 決定事項

**タスク3のVSLをWhopプロダクトページ用にメイン使用することを決定**

---

## 📊 タスク3を選択した理由

### 1. より詳細な説明が必要

**Whopページの特性**:
- 購入前の最終確認地点
- ユーザーは詳細な情報を求めている
- プロダクトの価値を完全に理解する必要がある

**タスク3の優位性**:
- 約1分28秒（88秒）で、より包括的な説明
- Video Sales Letter構造（Opening → Problem → Solution → Proof → CTA）
- 3つの柱を詳細に説明:
  - Trap Defense Engine（高解像度トラップ検知エンジン）
  - Gemini Visual Storytelling（複雑なデータを視覚ストーリーへ）
  - Dr. Grok（心理的サポート）

### 2. 価格提示が明確

**タスク3の特徴**:
- $69の価格が明確に提示されている
- Whopページの価格情報と完全に一致
- 購入決定を促すのに適している

**タスク1との比較**:
- タスク1: 価格提示なし
- タスク3: 価格提示あり（$69）

### 3. プロフェッショナルなVideo Sales Letter構造

**タスク3の構造**:
1. **Opening** (0:00-0:45): 注意を引くフック
2. **Problem** (0:45-1:30): 問題提起
3. **Solution** (1:30-2:45): 解決策の提示
4. **Proof** (2:45-3:30): 証拠の提示
5. **CTA** (3:30-4:00): 行動喚起

**Whopページに適している理由**:
- 購入決定を促す構造
- 問題提起から解決策まで論理的に展開
- 証拠（メンバーの成功事例）が提示されている

---

## 📋 VSL使用マッピング（更新版）

| VSL ID | 使用場所 | ストーリータイプ | 動画時間 | 使用方針 |
|--------|---------|-----------------|---------|---------|
| **タスク1** | ユーザー向けLP | Two Young Men | 約1分10秒 | **メイン使用** ✅ |
| **タスク2** | アフィリエイター向けLP | Hidden Enemy × Island Invitation | 約1分2秒 | **メイン使用** ✅ |
| **タスク3** | **Whopプロダクトページ** | Video Sales Letter | 約1分28秒 | **Whopページ用メイン使用** ✅ |

---

## 🔧 実装方法

### Whop Dashboardでの実装

1. **Whopプロダクトページを開く**:
   - URL: `https://whop.com/aio-media-llc/trap-defense-btc-en/`
   - 「Edit Product」をクリック

2. **VSLセクションに埋め込み**:
   - 「Media」または「Video」セクションを開く
   - 「Embed Video」または「Custom HTML」を選択
   - 以下の埋め込みコードを貼り付け:

```html
<iframe width="560" height="315" src="https://app.heygen.com/embedded-player/aa35321fab7c49888749230c5a2c2ecb" title="HeyGen ビデオプレーヤー" frameborder="0" allow="encrypted-media; fullscreen;" allowfullscreen></iframe>
```

3. **推奨タイトルと説明**:
   - **タイトル**: "Why Most Traders Lose Money: The Hidden Trap Defense Protocol"
   - **説明**: "Watch this 90-second video to discover how Trap Defence BTC protects your capital from market traps using CryptoQuant data, AI-powered analysis, and psychological support."

---

## 🎨 レイアウト戦略

### ファーストビュー（Hero Section）

```
┌─────────────────────────────────────────┐
│  [VSL動画 - タスク3]                    │
│  (約1分28秒、Video Sales Letter構造)    │
│                                         │
│  推奨タイトル:                          │
│  "Why Most Traders Lose Money:         │
│   The Hidden Trap Defense Protocol"    │
│                                         │
│  [権威性画像1] [権威性画像2] [権威性画像3] │
│  (CryptoQuant) (AI Hybrid) (Telegram)   │
└─────────────────────────────────────────┘
```

---

## ✅ 実装チェックリスト

- [ ] Whop Dashboardでプロダクトページを開く
- [ ] VSLセクションを追加または更新
- [ ] タスク3のVSL埋め込みコードを貼り付け
- [ ] 推奨タイトルと説明を追加
- [ ] 権威性画像をVSLの下または横に配置
- [ ] PC版とモバイル版の表示を確認
- [ ] VSLが正しく再生されることを確認
- [ ] プレビューで全体のレイアウトを確認
- [ ] 本番環境で公開

---

## 💡 タスク1との使い分け

### タスク1（ユーザー向けLP用）

- **使用場所**: ユーザー向けLP (`app/[market]/page.tsx`)
- **特徴**: Two Young Menストーリー、短い（約1分10秒）、感情的な訴求
- **目的**: 感情的なインパクトで引き込む

### タスク3（Whopプロダクトページ用）

- **使用場所**: Whopプロダクトページ
- **特徴**: Video Sales Letter構造、詳細（約1分28秒）、価格提示あり
- **目的**: 詳細な説明で購入決定を促す

---

## 📝 メタデータ更新

`data/vsl-heygen/vsl-heygen-metadata.json`を更新済み:
- `usageLocation`: "Whopプロダクトページ（Hero Section / First View）"
- `usagePolicy`: "Whopページ用メイン使用"
- `primaryUsage`: `true`
- `whopProductPage`: Whopページ用の詳細情報を追加

---

**最終更新**: 2026-01-12  
**決定者**: CEO  
**状態**: ✅ タスク3 VSLをWhopページ用に採用決定
