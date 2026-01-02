// config/marketProfiles.js
// TrapShield - 市場別プロファイル設定
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
      brandName: 'TrapShield',
      tagline: 'Spot traps before you fall',

      algorithm: {
        HARD_SIGNAL_THRESH: 28,
        SOFT_REGIME_THRESH: 20,
        MIN_CONF_FOR_TRADE: 0.6,
        BUG_STANDBY_BIAS: 15,
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
        trial: { days: 1, price: 0 },
        monthly: 69,
        annual: 690,
        currency: 'USD',
      },
    },

    AR: {
      persona: 'SHIELD_WALL',
      brandName: 'MaaliGuard',
      tagline: 'حارس الأموال - 70% من الوقت نحميك',

      algorithm: {
        HARD_SIGNAL_THRESH: 18,
        SOFT_REGIME_THRESH: 12,
        MIN_CONF_FOR_TRADE: 0.4,
        BUG_STANDBY_BIAS: 70, // キャッチコピー逆算: 70%
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
        trial: { days: 1, price: 0 },
        monthly: 89,
        annual: 890,
        currency: 'USD',
      },
    },

    KO: {
      persona: 'KIMCHI_SNIPER',
      brandName: 'KimchiSniper',
      tagline: '김치 프리미엄 저격수',

      algorithm: {
        HARD_SIGNAL_THRESH: 25,
        SOFT_REGIME_THRESH: 18,
        MIN_CONF_FOR_TRADE: 0.55,
        BUG_STANDBY_BIAS: 20,
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
        trial: { days: 1, price: 0 },
        monthly: 79000,
        annual: 790000,
        currency: 'KRW',
      },
    },

    JA: {
      persona: 'KAIZEN_OPTIMIZER',
      brandName: 'Kaizen Trader',
      tagline: '改善AI - 毎日1%改善する職人',

      algorithm: {
        HARD_SIGNAL_THRESH: 26,
        SOFT_REGIME_THRESH: 19,
        MIN_CONF_FOR_TRADE: 0.58,
        BUG_STANDBY_BIAS: 22,
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
        trial: { days: 1, price: 0 },
        monthly: 10350,
        annual: 103500,
        currency: 'JPY',
      },
    },

    ES: {
      persona: 'VOZ_COMUN',
      brandName: 'VozComún',
      tagline: '5,000 traders te protegen ahora',

      algorithm: {
        HARD_SIGNAL_THRESH: 27,
        SOFT_REGIME_THRESH: 19,
        MIN_CONF_FOR_TRADE: 0.57,
        BUG_STANDBY_BIAS: 18,
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
        trial: { days: 1, price: 0 },
        monthly: 49,
        annual: 490,
        currency: 'USD',
      },
    },

    'PT-BR': {
      persona: 'VOZ_COMUM',
      brandName: 'VozComum',
      tagline: '5,000 traders te protegen agora',

      algorithm: {
        HARD_SIGNAL_THRESH: 27,
        SOFT_REGIME_THRESH: 19,
        MIN_CONF_FOR_TRADE: 0.57,
        BUG_STANDBY_BIAS: 18,
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
        trial: { days: 1, price: 0 },
        monthly: 49,
        annual: 490,
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







