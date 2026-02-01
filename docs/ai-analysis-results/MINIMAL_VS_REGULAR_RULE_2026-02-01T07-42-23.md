# いつ・誰に・Minimal vs Regular を出すか — Grok / Gemini 回答

生成日時: 2026-02-01T07:42:23.728Z

---

## 共通プロンプト（要約）

- 300インフルエンサー × 2パターン（Minimal オプトイン / Regular 直導線）をぐるぐる回す。
- 「いつ・誰に・Minimal と Regular のどちらを出すか」を決める**実装可能な1本のルール**を提案してほしい。

---

## Grok（grok-4-1-fast-reasoning）

**提案ルール**: 各インフルエンサーごとに最終投稿時刻とタイプ（Minimal/Regular）をDB記録し、最終投稿から24時間経過したら前回タイプと逆のものを投稿（初回はMinimal）。毎日UTC 12:00に全300人をバッチチェックし、条件合致順に最大50人投稿。

**理由・補足**:
- **ぐるぐる回転&連続回避**: 交互ルールで各人がMinimal→Regular→Minimal...を無限ループ、同じメッセージ連続なし。300人×2パターンでリーチ/ファネル両立。
- **実装疑似コード** (Python風):
  ```
  for influencer in influencers:
      if now - last_post_time[influencer] >= 24h:
          if last_type[influencer] is None or last_type[influencer] == 'Minimal':
              post_type = 'Regular'
          else:
              post_type = 'Minimal'
          quote_repost(influencer, post_type)
          update_db(influencer, now, post_type)
  ```
- 時間帯固定でアルゴ推奨（午後ピーク狙い）、属性/言語無視でシンプル。超過時は翌日繰越でエンゲージ安定。

---

## Gemini（gemini-3-pro-preview）


