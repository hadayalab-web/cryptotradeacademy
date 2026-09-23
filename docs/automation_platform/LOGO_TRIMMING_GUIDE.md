# ロゴ画像トリミングガイド

**作成日**: 2026-01-12  
**目的**: 添付画像からロゴ部分を正確にトリミング

---

## 📋 概要

添付画像からシールドエンブレム（ロゴ）部分のみを抽出し、背景透過版と白背景版の2パターンを生成します。

**ロゴの特徴**:
- スタイリッシュな黒いアウトラインのシールド（盾）の形
- 金色の曲線的な「C」文字
- 3本の金色のローソク足チャート（中央が最も高い）
- 「C」とローソク足が一体化

**除外する要素**:
- テキスト（"CRYPTOTRADEACADEMY"、"AIO Media LLC"）
- 世界地図の背景
- その他のUI要素

---

## 🔧 セットアップ

### 1. 画像処理ライブラリのインストール

```bash
npm install sharp
```

### 2. スクリプトの実行

```bash
npx tsx scripts/trim-logo-from-image.ts <入力画像のパス>
```

**例**:
```bash
npx tsx scripts/trim-logo-from-image.ts data/whop-profile-assets/images/profile-banner-cryptotradeacademy-1188x396.png
```

---

## 📝 座標の調整

スクリプト内の以下の変数を調整して、正確なロゴ位置を指定してください:

```typescript
// ロゴの位置とサイズを推定
const logoWidth = Math.floor(imageWidth * 0.15); // 画像幅の15%をロゴ幅と仮定
const logoHeight = logoWidth; // 正方形
const logoX = Math.floor((imageWidth - logoWidth) / 2); // 中央
const logoY = Math.floor(imageHeight * 0.3); // 上から30%の位置
```

**調整方法**:
1. 生成された画像を確認
2. ロゴが正確にトリミングされていない場合、座標を調整
3. スクリプトを再実行

---

## 📋 出力ファイル

- `data/whop-profile-assets/images/profile-logo-cryptotradeacademy-trimmed-transparent.png` - ロゴ画像（背景透過版）
- `data/whop-profile-assets/images/profile-logo-cryptotradeacademy-trimmed-white-bg.png` - ロゴ画像（白背景版）

---

## 💡 注意事項

1. **座標の正確性**: 
   - 初期値は推定値です
   - 実際の画像を確認して座標を調整してください

2. **背景透過**: 
   - PNG形式で保存されますが、背景が透過されていない場合があります
   - その場合は、画像編集ソフト（Photoshop、GIMP等）で背景を削除してください

3. **画像の品質**: 
   - トリミング後の画像は元の画像の解像度を保持します
   - 必要に応じてリサイズしてください

---

## ✅ 実装チェックリスト

- [ ] sharpライブラリをインストール
- [ ] 入力画像のパスを確認
- [ ] スクリプトを実行
- [ ] 生成された画像を確認
- [ ] 必要に応じて座標を調整
- [ ] 背景透過版で背景が透過されているか確認
- [ ] 必要に応じて画像編集ソフトで背景を削除

---

**最終更新**: 2026-01-12  
**状態**: ✅ トリミングスクリプト作成完了
