"""
Trap Defence OS — 構造的根拠データ（Grok 由来）。
「なぜ釣り師が強く、なぜ提灯が吸い寄せられるか」を感情論ではなく構造として説明する指標・分類。
KIBA / BuzzWeave / KPI の文脈付け、マルチアセット拡張、心理モデル数理化の参照用。
"""

from typing import Any, Dict, List, Optional

# ---- 釣り師アカウントの影響力指標（構造的に強い理由） ----
INFLUENCE_METRICS: Dict[str, str] = {
    "impressions_per_post": "1,000 - 50,000 for average manipulative accounts; 100,000 - 5M+ for influencers with 50k+ followers",
    "engagement_rate": "2-8% (likes/RTs/replies/bookmarks); spikes to 15-30% during hype cycles",
    "bot_amplification_effect": "10-50x multiplier via fake likes/RTs/replies, pushing posts into ForYou feeds and creating artificial virality",
    "raid_or_cycle_effect": "50-200x boost during coordinated raids (e.g., 1k accounts RTing simultaneously) or meme cycles, leading to algorithmic snowballing",
}

# ---- なぜ提灯（retail）は釣り師に吸い寄せられるか ----
WHY_RETAIL_IS_DRAWN_IN: Dict[str, List[str]] = {
    "psychological": [
        "FOMO (fear of missing out on 'next 100x')",
        "Greed and hope (quick riches narratives)",
        "Fear (FUD on holdings, urgency to sell/buy)",
        "Tribalism and social proof (ape/degen culture)",
    ],
    "algorithmic": [
        "ForYou feed prioritizes high-engagement controversial content",
        "Engagement loops (replies/likes trigger notifications and recommendations)",
        "Personalization biases toward past interactions with hype posts",
    ],
    "market_structure": [
        "High volatility/microcaps for lottery-like wins",
        "Leverage (options, perps, 100x) amplifies small moves",
        "24/7 trading in crypto/FX vs. session-limited others",
        "Low entry barriers (retail apps like Robinhood, Binance)",
    ],
    "community_dynamics": [
        "Meme culture and echo chambers (e.g., WallStreetBets, crypto Twitter)",
        "Influencer worship and copy-trading herds",
        "Victimhood narratives (vs. institutions/shorts)",
    ],
}

# ---- 資産クラス別：釣り師の"釣り方"の違い（マルチアセット拡張の参照） ----
ASSET_CLASS_DIFFERENCES: Dict[str, str] = {
    "Crypto": "Highest influence (viral memes, 24/7 cycles, bot-heavy); retail drawn by moonshots, but 90%+ lose due to rugs/pumps",
    "Equities": "Seasonal spikes (earnings, squeezes); algo reinforces via WSB-style raids, medium persistence",
    "Commodities": "Lower virality (macro slow-burn FUD); drawn by inflation hedges, less retail frenzy",
    "FX and macro": "News-driven bursts (NFP, rate decisions); leverage pulls gamblers, persistent via carry trades",
    "ETFs": "Leveraged products hype (TQQQ calls); bridges equities/crypto, growing via retail ETF boom",
    "Regional markets": "Localized loyalty (e.g., India NSE pumps); cultural narratives amplify, under-regulated for persistence",
}

# ---- BotNet Detection: burst_factor 計算用（INFLUENCE_METRICS 準拠） ----
# baseline_engagement_per_second: 3秒窓での有機的期待値を算出するための秒あたり率
# 資産クラス別: Crypto=高速(ノイズ多), Equities=中速, Commodities=低速
BOTNET_BASELINE_ENGAGEMENT_PER_SECOND = 1.0 / 3.0  # fallback: 3秒で1件期待
BOTNET_BASELINE_BY_ASSET: Dict[str, float] = {
    "crypto": 0.5,       # 高速: 3秒で 1.5 期待
    "equities": 1.0 / 3, # 中速: 3秒で 1 期待
    "commodities": 1.0 / 6,  # 低速: 3秒で 0.5 期待
    "fx": 1.0 / 3,
    "etf": 1.0 / 3,
}

# ---- 自己強化メカニズム（なぜこの構造は持続するか） ----
SELF_REINFORCING_MECHANISMS: List[str] = [
    "Algorithmic favoritism: High engagement from bots/humans feeds top of feed, attracting more",
    "Profit recycling: Successful pumps fund bot farms and paid shills",
    "Network effects: Clusters grow via mutual RTs, creating 'credible' influencer graphs",
    "Psychological addiction: Dopamine from viral wins/losses keeps users hooked",
    "Low barriers: Free to create accounts, cheap bot services ($0.01/post)",
    "Regulatory lag: X's lax moderation + global jurisdictions enable evasion",
    "Evolving tactics: AI-generated content and deepfakes sustain novelty",
]


def get_baseline_engagement_per_second(asset_class: Optional[str] = None) -> float:
    """burst_factor 計算用。asset_class が指定されれば該当値を、なければ fallback を返す。"""
    if asset_class:
        key = (asset_class or "").strip().lower()
        if key in BOTNET_BASELINE_BY_ASSET:
            return BOTNET_BASELINE_BY_ASSET[key]
    return BOTNET_BASELINE_ENGAGEMENT_PER_SECOND


def get_structural_snapshot() -> Dict[str, Any]:
    """KPI・ダッシュボード・レポート用に構造データを一括で返す。"""
    return {
        "influence_metrics": INFLUENCE_METRICS,
        "why_retail_is_drawn_in": WHY_RETAIL_IS_DRAWN_IN,
        "asset_class_differences": ASSET_CLASS_DIFFERENCES,
        "self_reinforcing_mechanisms": SELF_REINFORCING_MECHANISMS,
        "botnet_baseline_per_second": BOTNET_BASELINE_ENGAGEMENT_PER_SECOND,
        "botnet_baseline_by_asset": BOTNET_BASELINE_BY_ASSET,
    }
