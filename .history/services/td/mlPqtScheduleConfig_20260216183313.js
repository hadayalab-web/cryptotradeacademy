/**
 * ML-PQT Engine スケジュール設定
 * 日次合計 DAILY_PQT_TARGET は OS が 200〜400 で決定。時間・言語は本 JSON の比率で配分。
 *
 * TIME_DISTRIBUTION: 全球ターゲット（EN/ES/PT/AR/KO/JA）向け。X のエンゲージメントピークは
 * 「現地 8–9 時前後の朝」が強いため、UTC で 06–10（欧州朝）、12–16（米国朝）、00（アジア朝）を
 * やや重めに配分。Cron は 0,3,6,9,12,15,18,21 UTC で 8 run/日・3h 等間隔。
 */
const GLOBAL_LIMITS = {
  max_pqt_per_day: 500,
  recommended_range_per_day: { min: 200, max: 400 }
};

const TIME_DISTRIBUTION = [
  { utc_window: "00:00-04:00", relative_intensity: 0.20 },  // アジア朝 (JST 9–13時)
  { utc_window: "04:00-08:00", relative_intensity: 0.18 },  // 欧州早朝〜朝
  { utc_window: "08:00-12:00", relative_intensity: 0.12 },  // 欧州朝〜昼
  { utc_window: "12:00-16:00", relative_intensity: 0.22 },  // 米国朝・欧州昼（ピーク重視）
  { utc_window: "16:00-20:00", relative_intensity: 0.18 },  // 米国昼・中南米・中東夕方
  { utc_window: "20:00-00:00", relative_intensity: 0.10 }   // 米国夕方・アジア深夜
];

const LANGUAGE_ALLOCATION = [
  { language: "en", share_ratio: 0.40 },
  { language: "es", share_ratio: 0.20 },
  { language: "pt", share_ratio: 0.15 },
  { language: "ar", share_ratio: 0.10 },
  { language: "ko", share_ratio: 0.08 },
  { language: "ja", share_ratio: 0.07 }
];

/** Grok JSON そのまま。日次ターゲット・ウィンドウ・言語・Fisherman優先・CTR・ガードの refinement ルール */
const ML_PQT_REFINEMENT_CONFIG = {
  daily_target_refinement: {
    inputs: [
      "trapScore aggregate across languages.",
      "Total fisherman posts detected.",
      "Market volatility index.",
      "Prior-day CTR average.",
      "API credit remaining."
    ],
    refinement_rules: [
      "High trapScore (>0.7) shifts toward 350–400.",
      "Elevated fisherman density pulls target above 300.",
      "Volatility spikes expand range to 250–400.",
      "Low CTR (<3%) contracts to 200–300.",
      "Low API credits clamps below 300."
    ]
  },
  window_intensity_adjustments: {
    drivers: [
      "Real-time fisherman velocity per window.",
      "Session login spikes.",
      "Per-window CTR from prior cycles.",
      "Cross-window spillover momentum."
    ],
    adjustment_model: [
      "Apply 0.9–1.1 multiplier to base intensity based on fisherman density, then renormalize sum to 1.0.",
      "Boost high-CTR windows by up to 1.2 if velocity exceeds median.",
      "Reduce low-momentum windows by 0.8–0.95 proportionally.",
      "Maintain total distribution integrity across 6 windows."
    ]
  },
  language_allocation_adjustments: {
    drivers: [
      "Per-language CTR trends.",
      "Fisherman concentration per language.",
      "Volatility per regional market.",
      "Template performance per language."
    ],
    adjustment_model: [
      "Nudge high-CTR languages +0.03 to +0.05 from base ratio.",
      "Shift from low-fisherman languages -0.02 to -0.05.",
      "Elevate volatile languages up to +0.04 during surges.",
      "Rebalance total to 1.0 after all nudges."
    ]
  },
  fisherman_priority_logic: {
    priority_factors: [
      "Engagement velocity percentile.",
      "Historical PQT CTR from this account.",
      "Audience overlap with engine accounts.",
      "Post recency and projected lifespan.",
      "Volatility sensitivity (e.g., memecoin vs stable)."
    ],
    priority_tiers: [
      "Tier 1 (>90th percentile velocity + high CTR): Full PQT allocation intensity.",
      "Tier 2 (70-90th + moderate overlap): 70% of Tier 1 intensity.",
      "Tier 3 (top 5-10% but low factors): 40% intensity, cap at 2 PQTs."
    ]
  },
  ctr_feedback_integration: {
    signals: [
      "Per-template CTR per language.",
      "Per-window CTR averages.",
      "Per-language aggregate CTR.",
      "Fisherman-specific CTR history."
    ],
    update_rules: [
      "Prioritize top-3 templates per language in next cycle.",
      "Reduce usage of bottom-quartile templates by 50%.",
      "Amplify allocation to high-CTR languages proportionally.",
      "Decay low-CTR fishermen from priority over 3 cycles."
    ]
  },
  safety_and_saturation_guards: {
    patterns_to_avoid: [
      "Over 30% PQTs in single window.",
      "Single language exceeding 50% daily total.",
      "More than 3 PQTs on one fisherman post.",
      "Template repetition >40% in a window."
    ],
    guardrail_rules: [
      "Cap per-window at 25% of daily target.",
      "Redistribute excess from saturated languages proportionally.",
      "Limit per-fisherman to 1-3 PQTs based on tier.",
      "Enforce template diversity: max 25% identical per language/window."
    ]
  }
};

/** 実測メトリクスに基づく補正（PERFORMANCE_REFINEMENT_CONFIG） */
const PERFORMANCE_REFINEMENT_CONFIG = {
  conceptual_summary: "Integration of performance metrics into ML-PQT scheduling refines targets, allocations, and tiers through normalized signals reflecting X engagement dynamics.",
  required_metrics: [
    "Per-PQT CTR",
    "Impressions per PQT",
    "Engagements per PQT",
    "Per-language CTR average",
    "Per-window CTR average",
    "Per-tier success rate (CTR > threshold)",
    "Fisherman-specific CTR history",
    "Daily saturation index (PQTs per unique fisherman)"
  ],
  metric_normalization: {
    rules: [
      "Min-max scaling: (value - min) / (max - min) across rolling 7-day window.",
      "Z-score: (value - mean) / std_dev for relative positioning.",
      "CTR percentile: Rank within language/window cohort.",
      "Success binary: 1 if CTR > median, 0 otherwise.",
      "Aggregate blending: 50% CTR + 30% impressions + 20% engagements."
    ]
  },
  daily_target_adjustment: {
    drivers: ["Aggregate CTR", "Impressions momentum", "Tier 1 success rate", "Saturation index"],
    adjustment_model: [
      "High aggregate CTR (>0.7 normalized) shifts to 350-400.",
      "Rising impressions (+20% day-over-day) expands to 300-400.",
      "Tier 1 rate >80% pulls toward upper range.",
      "High saturation (>5 PQTs/fisherman avg) contracts to 200-300."
    ]
  },
  language_allocation_adjustment: {
    drivers: ["Per-language CTR", "Per-language impressions", "Fisherman density per language"],
    adjustment_model: [
      "Top CTR language gains +0.04, lowest loses -0.04.",
      "High impressions language +0.03 nudge.",
      "Dense fisherman language +0.02, sparse -0.02.",
      "Renormalize all ratios to sum 1.0 post-adjustment."
    ]
  },
  fisherman_tier_adjustment: {
    signals: ["Recent CTR (last 5 PQTs)", "Impressions average", "Engagement velocity", "Historical tier performance"],
    tier_update_rules: [
      "CTR >0.8 normalized + high velocity → promote to Tier 1.",
      "CTR 0.5-0.8 + avg impressions → maintain Tier 2.",
      "CTR <0.5 or declining → demote to Tier 3.",
      "Tier 3 with 3+ poor cycles → blacklist for 48hr."
    ]
  },
  window_intensity_adjustment: {
    drivers: ["Per-window CTR", "Per-window impressions", "Fisherman velocity per window"],
    adjustment_model: [
      "High CTR window (*1.15 multiplier).",
      "High velocity window (*1.1).",
      "Low performers (0.85-0.95).",
      "Renormalize 6-window intensities to sum 1.0."
    ]
  },
  safety_and_saturation: {
    patterns_to_detect: [
      "CTR drop >20% day-over-day.",
      "Impressions stagnation per tier.",
      "Per-language PQTs >50/day.",
      "Template CTR variance > median."
    ],
    guardrail_updates: [
      "CTR drop triggers 20% target reduction next day.",
      "Stagnation pauses low-tier for 24hr.",
      "Over-cap languages redistribute 10% to underperformers.",
      "High variance rotates templates to top-3 only."
    ]
  },
  unknowns: [
    "Exact lag effects of metric feedback on algo ranking.",
    "Cross-metric interaction weights in normalization.",
    "Saturation thresholds in real-time abuse detection.",
    "Tier demotion recovery timelines."
  ]
};

/** 仕手師検出 → 寄生引用タイミング → swarm 検出 → 転換スコア（Grok JSON そのまま） */
const SHITESHI_PARASITIC_MODEL = {
  conceptual_summary: "Structural model scoring the dynamics of detecting market movers, parasitic quoting during spikes, swarming lantern traders, and funneling into product ecosystems via engagement.",
  core_objective: "Quantify viability of swarm capture from operator spikes for ecosystem growth through parasitic mechanics.",
  required_detection_signals: [
    "Sudden engagement velocity (>100% in 10min).",
    "Follower surge post-activity.",
    "Volatility-linked hashtags or keywords.",
    "Cross-platform echoes (Telegram/Discord mentions).",
    "Account history of pump patterns."
  ],
  shiteshi_scoring_model: {
    factors: [
      "Velocity score (likes/RTs ramp).",
      "Volatility impact (price correlation).",
      "Follower quality (retention, impulsivity).",
      "Network centrality (influencer mentions).",
      "Spike frequency (repeat operator behavior)."
    ],
    weighting_rules: [
      "Velocity 30%, volatility 25%, followers 20%, network 15%, frequency 10%.",
      "Normalize each to 0-1, weighted sum for 0-1 shiteshi score.",
      "Threshold >0.7 for high-impact classification.",
      "Decay over 24hr post-spike."
    ]
  },
  parasitic_entry_timing: {
    drivers: [
      "Engagement ramp percentile.",
      "Price movement confirmation.",
      "Swarm inflow rate.",
      "Operator follow-up post velocity."
    ],
    timing_model: [
      "Early: <20% ramp (high risk/reward).",
      "Mid: 20-60% ramp (balanced velocity capture).",
      "Late: >60% ramp (low risk, swarm peak)."
    ]
  },
  lantern_trader_swarm_model: {
    signals: [
      "Rapid follower echoes.",
      "Quote/RT chains from low-follower accounts.",
      "FOMO keyword spikes in replies.",
      "Session concurrency surge."
    ],
    conversion_opportunities: [
      "Peak swarm density (max velocity).",
      "Post-spike doubt phase.",
      "Repeated exposures across operators.",
      "Link CTR during emotional highs."
    ]
  },
  conversion_scoring: {
    drivers: [
      "PQT CTR.",
      "Engagement depth (replies/shares).",
      "Repeated visits (retarget signals).",
      "Demographic fit (crypto retail proxies)."
    ],
    scoring_model: [
      "CTR 40%, depth 30%, repeats 20%, fit 10%.",
      "0-1 normalization, sigmoid cap for likelihood.",
      ">0.6 indicates high-conversion swarm segment."
    ]
  },
  ecosystem_feedback_loops: {
    loops: [
      "Converted users amplify detection via internal signals.",
      "Swarm data refines shiteshi scoring.",
      "High conversion funds expanded parasitic capacity.",
      "Ecosystem retention data tunes timing models."
    ]
  },
  advanced_strategies: [
    "Cross-operator chaining for sustained swarms.",
    "Multi-product funnel splits based on engagement profiles.",
    "Predictive swarm modeling from historical spikes.",
    "Operator blacklisting post-rug for quality control."
  ],
  unknowns: [
    "Internal algo damping of swarm propagations.",
    "Cross-platform swarm leakage rates.",
    "Long-term retention from spike conversions.",
    "Shiteshi adaptation to parasitic patterns."
  ]
};

module.exports = {
  GLOBAL_LIMITS,
  TIME_DISTRIBUTION,
  LANGUAGE_ALLOCATION,
  ML_PQT_REFINEMENT_CONFIG,
  PERFORMANCE_REFINEMENT_CONFIG,
  SHITESHI_PARASITIC_MODEL
};
