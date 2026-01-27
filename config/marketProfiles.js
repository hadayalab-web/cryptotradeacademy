// config/marketProfiles.js
// CryptoTradeAcademy - ChangeEdge BTC 市場別プロファイル設定
// Strategic SSOT v4.0 ULTIMATE Section 1に基づく

/**
 * 市場プロファイルを取得
 * @param {string} market - 市場コード (EN/AR/KO/JA/ES/PT-BR)
 * @returns {Object} 市場プロファイル
 */
function getMarketProfile(market) {
  const profiles = {
    EN: {
      persona: 'PRECISION_SNIPER',
      brandName: 'CryptoTradeAcademy',
      tagline: 'Change the trend. Change your game. Get the edge.',

      algorithm: {
        HARD_SIGNAL_THRESH: 24, // 28 → 24 に緩和（シグナル数増加）
        SOFT_REGIME_THRESH: 18, // 20 → 18 に緩和（レジーム検出を早める）
        MIN_CONF_FOR_TRADE: 0.45, // 0.6 → 0.45 に緩和（より多くのシグナルを許可）
        BUG_STANDBY_BIAS: 10, // 15 → 10 に削減（シグナル抑制を緩和）
      },

      eventTriggers: {
        EMERGENCY: {
          trapScore: 60,
          liquidations: 500000000
        },
        WATCH: {
          scoreChange: 30,
          mpiThresh: -20
        },
        STANDBY_BREAK: {
          hoursSinceLastActive: 24
        },
        REGULAR: {
          maxHoursWithoutUpdate: 24
        },
      },

      pricing: {
        monthly: 99, // Whop API最新価格: $99/月（30日）
        quarterly: 237, // Whop API最新価格: $237/月（90日）
        annual: 845, // Whop API最新価格: $845/月（365日）
        currency: 'USD',
      },
    },

    AR: {
      persona: 'SHIELD_WALL',
      brandName: 'MaaliGuard',
      tagline: 'حارس الأموال - 70% من الوقت نحميك',

      algorithm: {
        HARD_SIGNAL_THRESH: 18, // 維持（既に緩い設定）
        SOFT_REGIME_THRESH: 12, // 維持
        MIN_CONF_FOR_TRADE: 0.4, // 維持
        BUG_STANDBY_BIAS: 65, // 70 → 65 に微調整（シグナル抑制を少し緩和）
      },

      eventTriggers: {
        EMERGENCY: {
          trapScore: 80 // 超保守的
        },
        WATCH: {
          scoreChange: 40
        },
        STANDBY_BREAK: {
          hoursSinceLastActive: 48 // 2日
        },
        REGULAR: {
          maxHoursWithoutUpdate: 24
        },
      },

      islamicCompliant: true,

      pricing: {
        monthly: 79, // Whop API最新価格: $79/月（30日）
        quarterly: 190, // Whop API最新価格: $190/月（90日）
        annual: 673, // Whop API最新価格: $673/月（365日）
        currency: 'USD',
      },
    },

    KO: {
      persona: 'KIMCHI_SNIPER',
      brandName: 'KimchiSniper',
      tagline: '김치 프리미엄 저격수',

      algorithm: {
        HARD_SIGNAL_THRESH: 22, // 25 → 22 に緩和（シグナル数増加）
        SOFT_REGIME_THRESH: 16, // 18 → 16 に緩和
        MIN_CONF_FOR_TRADE: 0.50, // 0.55 → 0.50 に緩和
        BUG_STANDBY_BIAS: 15, // 20 → 15 に削減（シグナル抑制を緩和）
        KIMCHI_PREMIUM_THRESH: 0.05, // 5%
      },

      eventTriggers: {
        EMERGENCY: {
          kimchiPremium: 0.08 // 8%以上
        },
        WATCH: {
          kimchiPremium: 0.05 // 5%以上
        },
        STANDBY_BREAK: {
          hoursSinceLastActive: 12
        },
        REGULAR: {
          maxHoursWithoutUpdate: 6 // 6時間
        },
      },

      pricing: {
        monthly: 95, // Whop API最新価格: $95/月（30日）
        quarterly: 228, // Whop API最新価格: $228/月（90日）
        annual: 809, // Whop API最新価格: $809/月（365日）
        currency: 'USD',
      },
    },

    JA: {
      persona: 'KAIZEN_OPTIMIZER',
      brandName: 'Kaizen Trader',
      tagline: '改善AI - 毎日1%改善する職人',

      algorithm: {
        HARD_SIGNAL_THRESH: 23, // 26 → 23 に緩和（シグナル数増加）
        SOFT_REGIME_THRESH: 17, // 19 → 17 に緩和
        MIN_CONF_FOR_TRADE: 0.52, // 0.58 → 0.52 に緩和
        BUG_STANDBY_BIAS: 18, // 22 → 18 に削減（シグナル抑制を緩和）
        RISK_REWARD_MIN: 2.0,
      },

      eventTriggers: {
        EMERGENCY: {
          trapScore: 65,
          riskReward: 0.5
        },
        WATCH: {
          scoreChange: 25,
          riskReward: 1.5
        },
        STANDBY_BREAK: {
          hoursSinceLastActive: 24
        },
        REGULAR: {
          maxHoursWithoutUpdate: 24
        },
      },

      pricing: {
        monthly: 95, // Whop API最新価格: $95/月（30日）
        quarterly: 228, // Whop API最新価格: $228/月（90日）
        annual: 809, // Whop API最新価格: $809/月（365日）
        currency: 'USD',
      },
    },

    ES: {
      persona: 'VOZ_COMUN',
      brandName: 'VozComún',
      tagline: '5,000 traders te protegen ahora',

      algorithm: {
        HARD_SIGNAL_THRESH: 24, // 27 → 24 に緩和（シグナル数増加）
        SOFT_REGIME_THRESH: 17, // 19 → 17 に緩和
        MIN_CONF_FOR_TRADE: 0.50, // 0.57 → 0.50 に緩和
        BUG_STANDBY_BIAS: 15, // 18 → 15 に削減（シグナル抑制を緩和）
      },

      eventTriggers: {
        EMERGENCY: {
          trapScore: 62
        },
        WATCH: {
          scoreChange: 28
        },
        STANDBY_BREAK: {
          hoursSinceLastActive: 24
        },
        REGULAR: {
          maxHoursWithoutUpdate: 24
        },
      },

      pricing: {
        monthly: 89, // Whop API最新価格: $89/月（30日）
        quarterly: 214, // Whop API最新価格: $214/月（90日）
        annual: 758, // Whop API最新価格: $758/月（365日）
        currency: 'USD',
      },
    },

    'PT-BR': {
      persona: 'VOZ_COMUM',
      brandName: 'VozComum',
      tagline: '5,000 traders te protegen agora',

      algorithm: {
        HARD_SIGNAL_THRESH: 24, // 27 → 24 に緩和（シグナル数増加）
        SOFT_REGIME_THRESH: 17, // 19 → 17 に緩和
        MIN_CONF_FOR_TRADE: 0.50, // 0.57 → 0.50 に緩和
        BUG_STANDBY_BIAS: 15, // 18 → 15 に削減（シグナル抑制を緩和）
      },

      eventTriggers: {
        EMERGENCY: {
          trapScore: 62
        },
        WATCH: {
          scoreChange: 28
        },
        STANDBY_BREAK: {
          hoursSinceLastActive: 24
        },
        REGULAR: {
          maxHoursWithoutUpdate: 24
        },
      },

      pricing: {
        monthly: 87, // Whop API最新価格: $87/月（30日）
        quarterly: 209, // Whop API最新価格: $209/月（90日）
        annual: 741, // Whop API最新価格: $741/月（365日）
        currency: 'USD',
      },
    },
  };

  // 市場コードの正規化（PT-BRとPT_BRの両方に対応）
  const normalizedMarket = market === 'PT_BR' ? 'PT-BR' : market;

  return profiles[normalizedMarket] || profiles.EN; // デフォルトはEN
}

module.exports = {
  getMarketProfile,
};



