/**
 * X API 価格設定（従量課金制）
 * 出典: https://console.x.com/#pricing (2026-01-28)
 * 
 * 注意: 価格は変更される可能性があります。最新情報はX Developer Consoleで確認してください。
 */

module.exports = {
  // 読み取り操作（Read Operations）
  read: {
    // ポスト（ツイート）読み取り
    post: 0.005, // $0.005 per post
    
    // ユーザー情報取得
    user: 0.002, // $0.002 per user
    
    // ツイート検索
    search: 0.002, // $0.002 per search
    
    // フォロワー数取得
    followers: 0.01, // $0.01 per follower count request
    
    // プロファイル情報
    profile: 0.002, // $0.002 per profile
    
    // DMイベント読み取り
    dmEvent: 0.015, // $0.015 per DM event (推定、スクリーンショットから)
  },

  // 作成操作（Write Operations）
  write: {
    // ポスト作成
    post: 0.005, // $0.005 per post
    
    // メッセージ送信（DM）
    message: 0.01, // $0.01 per message
    
    // 画像アップロード
    imageUpload: 0.005, // $0.005 per image
    
    // 動画アップロード
    videoUpload: 0.01, // $0.01 per video
  },

  // コスト計算ヘルパー関数
  calculate: {
    /**
     * ポスト作成コストを計算
     * @param {number} count - ポスト数
     * @returns {number} 総コスト（USD）
     */
    postCost: (count) => count * 0.005,

    /**
     * ユーザー情報取得コストを計算
     * @param {number} count - ユーザー数
     * @returns {number} 総コスト（USD）
     */
    userReadCost: (count) => count * 0.002,

    /**
     * ツイート検索コストを計算
     * @param {number} count - 検索回数
     * @returns {number} 総コスト（USD）
     */
    searchCost: (count) => count * 0.002,

    /**
     * フォロワー数取得コストを計算
     * @param {number} count - リクエスト数
     * @returns {number} 総コスト（USD）
     */
    followersCost: (count) => count * 0.01,

    /**
     * プロファイル情報取得コストを計算
     * @param {number} count - プロファイル数
     * @returns {number} 総コスト（USD）
     */
    profileCost: (count) => count * 0.002,

    /**
     * DM送信コストを計算
     * @param {number} count - メッセージ数
     * @returns {number} 総コスト（USD）
     */
    messageCost: (count) => count * 0.01,

    /**
     * 画像アップロードコストを計算
     * @param {number} count - 画像数
     * @returns {number} 総コスト（USD）
     */
    imageUploadCost: (count) => count * 0.005,

    /**
     * 動画アップロードコストを計算
     * @param {number} count - 動画数
     * @returns {number} 総コスト（USD）
     */
    videoUploadCost: (count) => count * 0.01,

    /**
     * 月間コストを計算（使用量オブジェクトから）
     * @param {Object} usage - 使用量オブジェクト
     * @param {number} usage.posts - ポスト作成数
     * @param {number} usage.userReads - ユーザー読み取り数
     * @param {number} usage.searches - 検索回数
     * @param {number} usage.followers - フォロワー数取得回数
     * @param {number} usage.profiles - プロファイル取得数
     * @param {number} usage.messages - DM送信数
     * @param {number} usage.images - 画像アップロード数
     * @param {number} usage.videos - 動画アップロード数
     * @returns {Object} コスト内訳と合計
     */
    monthlyCost: (usage = {}) => {
      const costs = {
        posts: (usage.posts || 0) * 0.005,
        userReads: (usage.userReads || 0) * 0.002,
        searches: (usage.searches || 0) * 0.002,
        followers: (usage.followers || 0) * 0.01,
        profiles: (usage.profiles || 0) * 0.002,
        messages: (usage.messages || 0) * 0.01,
        images: (usage.images || 0) * 0.005,
        videos: (usage.videos || 0) * 0.01,
      };

      const total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);

      return {
        ...costs,
        total,
        breakdown: Object.entries(costs)
          .filter(([_, cost]) => cost > 0)
          .map(([key, cost]) => ({ operation: key, cost })),
      };
    },
  },

  // 使用量予測（プロジェクト固有）
  projections: {
    // 初期フェーズ（現状）
    initial: {
      posts: 60, // 月60回（1日2回 × 30日）
      userReads: 10000,
      searches: 0,
      followers: 0,
      profiles: 0,
      messages: 0,
      images: 0,
      videos: 0,
    },
    // 成長フェーズ
    growth: {
      posts: 200,
      userReads: 50000,
      searches: 1000,
      followers: 0,
      profiles: 0,
      messages: 0,
      images: 0,
      videos: 0,
    },
    // 成熟フェーズ
    mature: {
      posts: 500,
      userReads: 100000,
      searches: 5000,
      followers: 0,
      profiles: 0,
      messages: 0,
      images: 0,
      videos: 0,
    },
  },
};
