# アフィリエイト候補抽出最適化計画 (2026-03-01)

## 1. 目的
DMテンプレートやLPを変更せず、**「誰に送るか（Who）」の精度**を高めることで、DM送信コスト対効果（CPA/ROI）を向上させる。
特に「ノイズ（公的機関・ニュース・ボット）」を排除し、「ホットターゲット（競合利用者・活動的な個人）」への配分を増やす。

## 2. 採用戦略: バランス案 (Efficiency Model)
- **守り:** ノイズの徹底排除（Official/News/Bot）。
- **攻め:** 有望層へのスコア加点と優先送信。
- **供給:** 緩和クエリは維持しつつ、スコアでフィルタリングする。

## 3. 実装仕様

### 3.1 検索クエリ改善 (`services/td/affiliateRecruitSearch.js`)
APIレベルで明らかなノイズを除外する。

| 言語 | 追加除外キーワード (Negatives) |
| :--- | :--- |
| **Common** | `bot`, `official`, `news`, `support`, `alert` |
| **EN** | `giveaway`, `airdrop`, `casino` |
| **JA** | `公式`, `速報`, `広報`, `プレゼント` |
| **他** | 各言語の「公式」「ニュース」「無料」に相当する語 |

### 3.2 候補フィルタ改善 (`services/td/affiliateRecruitScoring.js`)
Bioだけでなく、**名前 (Name)・ユーザーID (ScreenName)** も検査対象に含める。

- **除外対象:**
    - 公的機関 (gov, police, ministry)
    - ニュース・メディア (news, media, update)
    - 自動化アカウント (bot, tracker, alert)
    - サポート窓口 (support, staff)

### 3.3 動的スコアリング導入 (`services/td/affiliateRecruitScoring.js`)
固定値（50点）を廃止し、属性ベースの加点ロジックへ変更。

**計算式:**
$$ Score = (Base + \sum Bonus) \times RiskFactor $$

| 要素 | 点数 | 条件 |
| :--- | :--- | :--- |
| **Base** | 50 | 基礎点 |
| **Competitor** | +20 | 競合 (Gumroad, ClickBank, Whop, Linktree等) の利用 |
| **Active** | +15 | 既にアフィリエイト活動中 (link in bio, referral) |
| **Bio Match** | +10 | Bioに "affiliate", "crypto", "side hustle" 等が含まれる |
| **Hustle/Action**| +5 | 努力・行動ログ (building, learning, today i did) |
| **Risk** | x0.6~0.8 | 怪しいキーワード (pump, 100x, get rich) |

- **優先度:** スコアが高い順にキューへ投入・送信される。
- **足切り:** 現状は設けない（供給維持のため）。ただしスコア0は除外。

## 4. 検証計画

### KPI
1.  **ノイズ率 (Noise Rate)**: 送信ログを目視確認し、bot/公式が含まれる割合（目標: 0%）
2.  **DM送信成功率**: `op_not_permitted` (DM閉鎖) の減少（目標: 改善）
3.  **転換率 (Conversion)**:
    - Click / Sent (CTR)
    - Signup / Click (CVR)

### ロールバック・緩和基準
- **候補枯渇 (No Candidates):** `api/affiliate-recruit-run` で `no_eligible_candidate` が頻発する場合。
- **対応:** `GLOBAL_EXCLUDE_KEYWORDS` の一部（news, official等）を一時的にコメントアウトする。

## 5. 作業手順
1. `services/td/affiliateRecruitScoring.js` の改修
2. `services/td/affiliateRecruitSearch.js` の改修
3. DryRun (`dryRun=1`) でスコア分布と除外動作を確認
4. 本番デプロイ
