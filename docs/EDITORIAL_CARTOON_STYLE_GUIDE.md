# エディトリアル・カートゥーン（風刺画）スタイルガイド
**作成日**: 2026-01-18  
**目的**: Trap Defence BTCの画像トンマナ統一

---

## 📐 スタイル基準

### 参考媒体

#### 世界的な象徴的存在
1. **ル・モンド (Le Monde) 【フランス】**
   - 世界的に見れば、その伝統と芸術性において最も象徴的な存在の一つ
   - 長年、**プランテュ (Plantu)** という伝説的な風刺画家が一面に風刺画を描いてきた
   - フランスは風刺画の文化が非常に根強く、芸術的・批評的価値が高く評価されている
   - 伝統的な風刺画スタイルの最高峰

2. **The Economist** - 知的で洗練された風刺画
3. **The New Yorker** - ウィットに富んだイラストレーション
4. **ガーディアン (The Guardian)** - スティーブ・ベル（Steve Bell）スタイルの辛辣な批評

#### 日本の風刺画の歴史的ルーツ
5. **ジャパン・パンチ (The Japan Punch) 【1862-1887】**
   - 幕末・明治期にチャールズ・ワーグマンが創刊
   - 日本における近代的な風刺画の先駆け
   - 日本の新聞風刺画の歴史的・文化的文脈の源流
   - 東西文化の融合による独特の風刺画スタイル

---

## 🎨 スタイル定義

### 基本スタイル
```
Style: High-quality editorial political cartoon style, inspired by Le Monde's Plantu tradition and The Japan Punch's historical legacy.
Technique: Intricate cross-hatching texture, hand-drawn aesthetic, ink and watercolor feel.
Mood: Satirical, witty, intellectual, dramatic lighting.
Composition: Cinematic perspective, clear visual metaphor.
Colors: Muted, sophisticated palette with one or two symbolic accent colors (e.g., Green for greed/money, Red for danger).
No text overlays, purely visual storytelling. Professional magazine cover quality with historical depth and cultural resonance.
```

### 歴史的・文化的文脈
- **ル・モンドの伝統**: プランテュ（Plantu）が確立した、芸術的価値と批評的視点を兼ね備えた風刺画スタイル
- **ジャパン・パンチの遺産**: 東西文化の融合による独特の表現手法、日本の風刺画文化の源流
- **現代への継承**: 伝統的な技法を現代の暗号通貨市場という文脈に適用し、新しい意味を創出

### 技術的詳細
- **テクスチャ**: クロスハッチング（交差する線のテクスチャ）
- **質感**: 手描き風、インクと水彩の質感
- **ムード**: 風刺的、ウィットに富む、知的、劇的な照明
- **構図**: 映画的視点、明確な視覚的メタファー
- **色彩**: 落ち着いたパレット、1-2色の象徴的なアクセントカラー
- **テキスト**: オーバーレイなし、純粋に視覚的なストーリーテリング

### 具体的な視覚的要素（実装時の解釈）
- **分割要素**: 日本の屏風（byobu）やヨーロッパのエディトリアルカートゥーンのパネル分割を融合
- **物語構造**: 日本の絵巻物（emaki）とヨーロッパのエディトリアルカートゥーンのパネル構造を組み合わせ
- **色彩の象徴性**: 
  - **赤（Red accents）**: 危険、損失、トラップ
  - **緑（Green accents）**: 保護、成功、安全
- **感情表現**: ジャパン・パンチの伝統に基づく、明確で誇張された感情表現
- **光と影**: プランテュの特徴的な劇的な影とクロスハッチング技法

---

## 📋 使用例

### VSL1: "SAME CAPITAL, DIFFERENT OUTCOME"
**コンセプト**: 2人のトレーダーの対比

**プロンプト構造**:
```
A satirical editorial cartoon depicting two cryptocurrency traders who started with the same capital but ended with dramatically different outcomes.

Left side: [失敗のシーン詳細]
Right side: [成功のシーン詳細]

The two scenes are visually separated but connected, showing the stark contrast between failure and success.
```

### VSL2: "STOP LOSING. START WINNING"
**コンセプト**: トラップから保護への変遷

**プロンプト構造**:
```
A satirical editorial cartoon depicting a cryptocurrency trader's transformation from being trapped by market manipulation to being protected by "Trap Defence".

Left side (Losing): [トラップに捕まった状態]
Right side (Winning): [保護された状態]

The composition shows the journey from being prey to becoming a defender.
```

---

## 🎯 メタファー・シンボル

### 推奨メタファー
- **クジラ (Whale)**: 市場操作者、大口投資家
- **トラップ (Trap)**: 市場の罠、損失のリスク
- **シールド (Shield)**: 保護、防御ツール
- **チャート**: 価格変動、市場の動き
- **お金/コイン**: 資本、利益・損失

### 避けるべき要素
- 過度にリアルな写真風
- 派手なネオンカラー（サイバーパンク風）
- テキストオーバーレイ
- 低品質なクリップアート風

---

## 📝 プロンプト作成ガイドライン

### 1. 構造
```
[主題の説明] + [詳細なシーン描写] + [構図の説明] + [スタイル定義]
```

### 2. 詳細度
- **具体的なシーン**: 人物の表情、環境、小道具
- **感情表現**: ストレス、自信、恐怖、安心
- **視覚的対比**: 明暗、成功/失敗、保護/危険

### 3. 言語
- 英語で記述（Gemini APIが最も理解しやすい）
- 専門用語は避け、視覚的に表現可能な言葉を使用

---

## 🔧 実装

### コード内での使用
```javascript
// services/gemini/imageGenerator.js
const EDITORIAL_CARTOON_STYLE = `[上記のスタイル定義]`;

// プロンプト作成
const prompt = `${subjectDescription} ${EDITORIAL_CARTOON_STYLE}`;
```

### スクリプト
- `scripts/generate-vsl-thumbnails.js` - VSL1/VSL2サムネイル生成（エディトリアルカートゥーン）
- `scripts/generate-4koma-cartoon.js` - 4コマ漫画生成（エディトリアルカートゥーン）
- `scripts/generate-holographic-data-viz.js` - ホログラフィックデータビジュアライゼーション生成
- `scripts/generate-3d-character.js` - 3Dキャラクター画像生成
- `scripts/generate-cartoon-assets.js` - 汎用カートゥーン生成

---

## ✅ チェックリスト

新しい画像を生成する前に確認：

- [ ] スタイル定義が含まれているか
- [ ] テキストオーバーレイがないか
- [ ] 視覚的メタファーが明確か
- [ ] 色彩が落ち着いたパレットか
- [ ] 構図が映画的視点か
- [ ] 風刺的で知的なムードか

---

## 📚 参考資料

### 主要参考媒体
- **ル・モンド（Le Monde）** - プランテュ（Plantu）作品（伝統と芸術性の象徴）
- **ジャパン・パンチ (The Japan Punch)** - チャールズ・ワーグマン作品（日本の風刺画の歴史的ルーツ）
- The Economist カバーイラストレーション
- The New Yorker カバーアート
- ガーディアン（The Guardian）のスティーブ・ベル（Steve Bell）作品

### 歴史的意義
- **ル・モンド**: 世界的に見れば、その伝統と芸術性において最も象徴的な存在の一つ
- **ジャパン・パンチ**: 幕末・明治期に創刊され、日本における近代的な風刺画の先駆けとなった

---

---

## 🌐 ホログラフィック・データビジュアライゼーションスタイル

### スタイル概要
CryptoQuantのような、未来感のあるホログラフィックインターフェースでオンチェーンデータを可視化するスタイル。

### 基本スタイル
```
Style: Futuristic holographic data visualization interface, similar to CryptoQuant's on-chain data maps.
Display: Transparent, curved holographic screen with blue-green tint and soft glow effect.
Environment: Modern, sophisticated office setting with dark wood paneling, dim ambient lighting, city skyline visible through large windows at night.
Atmosphere: High-tech, professional, data-driven, slightly futuristic, emphasizing transparency and digital information visualization.
```

### 技術的詳細
- **ディスプレイ**: 半透明のカーブしたガラス風スクリーン、ブルーグリーンのティント、ソフトグロー効果
- **データマップ**: 世界地図上にネットワークフローを可視化
  - オレンジ/ゴールド: 北米、ヨーロッパ、一部アジア
  - ブルー/ティール: 東アジア、東南アジア、ロシア
  - グローする線で接続点を表現
- **データパネル**: メトリクス表示
  - TOTAL BTC BALANCE（オレンジプログレスバー）
  - TRANSACTION VOLUME（オレンジプログレスバー）
  - NETWORK ACTIVITY（ブルー/ティールプログレスバー）
- **環境**: モダンなオフィス、夜景の都市スカイライン、暗めの木目調インテリア
- **色彩**: 深いブルー、グレー、黒を基調に、ホログラフィックディスプレイの鮮やかなオレンジ/ゴールドとブルー/ティールを対比

### 使用例

#### CryptoQuant On-Chain Data Map
**コンセプト**: Bitcoin Network Flowsの可視化

**プロンプト構造**:
```
A futuristic holographic interface showing a "CryptoQuant On-Chain Data Map" for "Bitcoin Network Flows."

The central element is a semi-transparent, curved glass-like holographic screen with a blue-green tint, emitting a soft glow. The screen displays:

- Top left: Logo "+Q CryptoQuant" and label "INSTITUTIONAL WALLETS" (indicated by an orange dot)
- Centered at top: Title "CRYPTOQUANT ON-CHAIN DATA MAP" and "BITCOIN NETWORK FLOWS"
- Top right: Legend showing "MINERS" (orange dot), "EXCHANGES" (blue-green dot), "HODLers" (light blue dot)
- Main visual: A world map with landmasses subtly outlined. North America, Europe, parts of Asia, and Australia show clusters of glowing orange points and connecting lines (orange-yellow spectrum). East Asia, Southeast Asia, and parts of Russia show clusters of blue-green points and connecting lines
- Bottom: Three horizontal progress/data bars labeled "TOTAL BTC BALANCE" (yellow bar), "TRANSACTION VOLUME" (yellow bar), and "NETWORK ACTIVITY" (blue-green bar)

The holographic screen rests on a dark, polished wooden desk. A sleek black keyboard with glowing blue-green keys and a black wireless mouse are placed in front of the screen.

In the background: A luxurious modern office. Large windows behind the screen reveal a blurred cityscape with twinkling lights, suggesting a high-rise building at night. The room is dimly lit with soft lighting from lamps. Dark wood paneling creates a sophisticated atmosphere.

Overall aesthetic: High-tech, professional, data-driven, slightly futuristic, emphasizing transparency and digital information visualization.
```

### スクリプト
- `scripts/generate-holographic-data-viz.js` - ホログラフィックデータビジュアライゼーション生成

---

---

## 🎭 3Dキャラクタースタイル

### スタイル概要
フレンドリーで親しみやすい3Dアニメーション風のキャラクター。ARグラスやホログラフィックディスプレイを備えた、プロフェッショナルで洗練されたトレーダー/アナリストキャラクター。

### 基本スタイル
```
Style: High-quality 3D computer-generated imagery (CGI) in Nintendo character art style, similar to Dr. Mario or modern Mario characters. Bright, clean, and highly polished 3D animation typical of modern Nintendo character designs.

Character: Nintendo-like 3D animation style with cartoonish proportions (larger head relative to body, prominent facial features). Friendly, approachable, and inviting aesthetic.

Aesthetic: Clean, vibrant colors without excessive grunge or realism. Clearly defined shapes contributing to a graphic, illustrative feel. No hyper-realism - prioritizes clear character recognition and welcoming, iconic look.
```

### 技術的詳細
- **レンダリング**: 任天堂風の3D CGI/アニメーション（Dr. Mario風）
- **プロポーション**: カートゥーン風のプロポーション（頭が体に対して大きめ、特徴的な顔）
- **キャラクター**: フレンドリーで親しみやすい、明確に定義された形状
- **質感**: 滑らかな表面、ソフトなライティング、磨かれた外観
- **色彩**: ソリッドでクリーン、鮮やかな色使い（赤、白、茶色、青を基調）
- **背景**: 純白または黒の背景でキャラクターを際立たせる、控えめなドロップシャドウ
- **ムード**: ポジティブ、親しみやすく、アイコニックな雰囲気

### キャラクターの特徴
- **外見**: 40-50代の男性、明るい肌色、茶色の髪、大きな明るい青い目、太い黒い眉毛、特徴的な丸い鼻、太い茶色の口ひげ
- **服装**: 
  - 清潔な白い医師のラボコート（ボタン付き）
  - 赤いシャツ、赤いネクタイ
  - 大きな丸い茶色の靴（黄色いソール付き、任天堂風）
  - 白い手袋
- **アクセサリー**:
  - 額に茶色のストラップで固定された円形の金属製の医師用ヘッドミラー
  - 首に聴診器（ダークレッドまたはシルバー）
  - オプション: 透明なARグラス/バイザー（暗号通貨データ表示）
    - 左レンズ: "Fear & Greed Index"ゲージ
    - 右レンズ: "X sentiment"のライングラフ
  - オプション: Bitcoinロゴのピン
- **表情**: 思考的で好奇心旺盛な表情、眉毛を少しひそめて、白い手袋をした手であごを支えるポーズ

### 背景・環境
- **背景**: 純白または黒の背景（キャラクターを際立たせる）
- **シャドウ**: 控えめなドロップシャドウで深度を表現
- **構図**: ミディアムクローズアップまたは全身ショット、キャラクターを中心に配置
- **オプション**: モダンなオフィス環境や暗号通貨チャートが表示された画面（背景として）

### 使用例

#### Dr. Grok Character
**コンセプト**: ARグラスをかけた暗号通貨アナリスト「Dr. Grok」

**プロンプト構造**:
```
Dr. Grok - A friendly, clean, and highly polished 3D animated character in Nintendo character art style (similar to Dr. Mario), a male figure resembling a cryptocurrency analyst and trader advisor.

Character:
- Fair-skinned man with brown hair, large bright blue eyes, thick dark eyebrows, prominent rounded nose, thick dark brown mustache
- Thoughtful, curious expression, one white-gloved hand positioned under chin in pondering gesture
- Wears clean white doctor's lab coat with buttons, featuring "DR. GROK" or "TRAP DEFENSE" logo embroidery
- Red collared shirt, red tie
- Brown strap holding reflective circular doctor's head mirror on forehead
- Stethoscope (dark red with silver accents) around neck
- Transparent AR glasses/visor displaying cryptocurrency data:
  - Left lens: "Fear & Greed Index" gauge with needle indicator
  - Right lens: "X sentiment" line graph with data points
- Bitcoin logo pin on lapel
- Large, rounded brown shoes with light yellow soles (Nintendo-style)

Background:
- Solid white or black background, isolating the character
- Subtle drop shadow beneath indicating depth
- Optional: Modern office with cryptocurrency charts visible

Style: High-quality 3D CGI in Nintendo character art style, bright, clean, and highly polished. Cartoonish proportions, friendly and inviting aesthetic, iconic and recognizable character design.
```

### スクリプト
- `scripts/generate-3d-character.js` - 3Dキャラクター画像生成

---

**最終更新**: 2026-01-18  
**承認**: CEO
