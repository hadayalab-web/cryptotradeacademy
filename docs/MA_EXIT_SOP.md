# CryptoTrade Academy: M&A Exit Standard Operating Procedure (SOP)

## 1. 目的とゴール
本SOPは、CryptoTradeAcademyの完成済み資産（コードベース、KIBA Engine、BuzzWeave Engine、6言語LP等）の全容と「隠されたポテンシャル」を抽出し、M&A（Acquire.com等）におけるバリュエーションを最大化・エグジットを完遂させるための標準作業手順を定義する。

- 📑 **Acquire.com 審査提出用マスター資料**: [ACQUIRE_COM_PITCH_DOSSIER.md](ACQUIRE_COM_PITCH_DOSSIER.md)
- 📦 **即日切り売り用モジュール**: `exports/upwork_gigs/` (3大Gigパッケージ)

## 2. Tri-Engine 実行フェーズ

### [Phase 1] アセットの統合と整理 (3.1 Pro)
- **担当**: 総司令官 (3.1 Pro)
- **アクション**: 代表から共有される全アセット（未公開のポテンシャルを含む）をインジェストし、SSoTとして統合・構造化する。

### [Phase 2] 価値算定と多角リサーチ (3.8 Flash)
- **担当**: 猟犬 (3.8 Flash)
- **アクション**: 以下の6項目について並行リサーチ・照会を実行し、ファクトベースのレポートを生成する。
  1. 競合調査
  2. 市場調査
  3. 商品調査
  4. M&A需要調査
  5. M&A査定価格調査
  6. マーケティングリサーチ

### [Phase 3] エグジット価格の再定義とチューンアップ (3.1 Pro / Sonnet 5)
- **担当**: 総司令官 (3.1 Pro) ＆ 大工 (Sonnet 5)
- **アクション**: 
  - 抽出したリサーチ結果とアセットを基に、目標エグジット価格（Target Valuation）を再定義する。
  - バリュエーションを最大化するためのコード改修やインフラ整備（チューンアップ）要件を確定する。
  - 確定したチューンアップ要件を大工（Sonnet 5）へ渡し、物理的な実装を行わせる。

## 3. 制約事項 (Invariants)
- 使い捨てスクリプト（TOOL_BAN）の作成は禁止。必要なツールはすべてSonnet 5により正規インフラとして実装すること。
- 人格・ロールプレイ（De-Personification）の禁止。すべてのプロセスはパイプライン処理として決定論的に進めること。
