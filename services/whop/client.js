// services/whop/client.js
// Whop APIクライアント（プロモコード監視用）

const WHOP_API_KEY = process.env.WHOP_API_KEY;
const WHOP_API_BASE_URL = process.env.WHOP_API_BASE_URL || 'https://api.whop.com/api/v2';

/**
 * クエリ文字列を生成（配列は key[] 形式で展開）
 * @param {Object} params - クエリパラメータ
 * @returns {string} クエリ文字列
 */
function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    if (Array.isArray(value)) {
      const arrayKey = key.endsWith('[]') ? key : `${key}[]`;
      value.forEach(item => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(arrayKey, String(item));
        }
      });
      return;
    }
    searchParams.append(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Whop APIリクエストを実行
 * @param {string} endpoint - APIエンドポイント
 * @param {Object} options - リクエストオプション
 * @returns {Promise<Object>} APIレスポンス
 */
async function whopApiRequest(endpoint, options = {}) {
  if (!WHOP_API_KEY) {
    throw new Error('WHOP_API_KEY is not set');
  }

  const url = `${WHOP_API_BASE_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${WHOP_API_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const responseText = await response.text();
    let responseBody = null;
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch (parseError) {
        responseBody = { raw: responseText };
      }
    }

    if (!response.ok) {
      const errorMessage = responseText || JSON.stringify(responseBody || {});
      throw new Error(`Whop API Error: ${response.status} - ${errorMessage}`);
    }

    if (options.returnRaw) {
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
      };
    }

    return responseBody || {};
  } catch (error) {
    console.error('[Whop API] Request failed:', error.message);
    throw error;
  }
}

/**
 * プロモコードの情報を取得
 * @param {string} promoCodeId - プロモコードID
 * @returns {Promise<Object>} プロモコード情報 {id, code, stock, uses, unlimited_stock, expires_at, ...}
 */
async function getPromoCode(promoCodeId) {
  try {
    const response = await whopApiRequest(`/promo_codes/${promoCodeId}`);
    return response.data || response;
  } catch (error) {
    console.error(`[Whop API] Failed to get promo code ${promoCodeId}:`, error.message);
    throw error;
  }
}

/**
 * プロモコードのリストを取得
 * @param {Object} params - クエリパラメータ {company_id, plan_ids, ...}
 * @returns {Promise<Array<Object>>} プロモコードのリスト
 */
async function listPromoCodes(params = {}) {
  try {
    const endpoint = `/promo_codes${buildQueryString(params)}`;
    const response = await whopApiRequest(endpoint);
    return response.data || [];
  } catch (error) {
    console.error('[Whop API] Failed to list promo codes:', error.message);
    throw error;
  }
}

/**
 * プロモコードを作成
 * @param {Object} payload - 作成データ {code, promo_type, amount_off, base_currency, ...}
 * @returns {Promise<Object>} 作成されたプロモコード情報
 */
async function createPromoCode(payload) {
  try {
    const response = await whopApiRequest('/promo_codes', {
      method: 'POST',
      body: payload,
    });
    return response.data || response;
  } catch (error) {
    console.error('[Whop API] Failed to create promo code:', error.message);
    throw error;
  }
}

/**
 * プロモコードを更新
 * @param {string} promoCodeId - プロモコードID
 * @param {Object} payload - 更新データ {status, stock, unlimited_stock, ...}
 * @returns {Promise<Object>} 更新されたプロモコード情報
 */
async function updatePromoCode(promoCodeId, payload) {
  try {
    const response = await whopApiRequest(`/promo_codes/${promoCodeId}`, {
      method: 'POST',
      body: payload,
    });
    return response.data || response;
  } catch (error) {
    console.error(`[Whop API] Failed to update promo code ${promoCodeId}:`, error.message);
    throw error;
  }
}

/**
 * プロモコードを削除（アーカイブ）
 * @param {string} promoCodeId - プロモコードID
 * @returns {Promise<Object>} 削除結果
 */
async function deletePromoCode(promoCodeId) {
  try {
    const response = await whopApiRequest(`/promo_codes/${promoCodeId}`, {
      method: 'DELETE',
    });
    return response.data || response || { deleted: true };
  } catch (error) {
    console.error(`[Whop API] Failed to delete promo code ${promoCodeId}:`, error.message);
    throw error;
  }
}

/**
 * プロモコードの残り枠数を計算
 * @param {Object} promoCode - プロモコード情報
 * @returns {number|null} 残り枠数（無制限の場合はnull）
 */
function calculateRemainingStock(promoCode) {
  if (!promoCode) {
    return null;
  }

  // 無制限の場合はnullを返す
  if (promoCode.unlimited_stock === true) {
    return null;
  }

  const stock = promoCode.stock || 0;
  const uses = promoCode.uses || 0;
  const remaining = Math.max(0, stock - uses);

  return remaining;
}

/**
 * プロモコードの残り枠数を取得
 * @param {string} promoCodeId - プロモコードID
 * @returns {Promise<number|null>} 残り枠数（無制限の場合はnull）
 */
async function getRemainingStock(promoCodeId) {
  try {
    const promoCode = await getPromoCode(promoCodeId);
    return calculateRemainingStock(promoCode);
  } catch (error) {
    console.error(`[Whop API] Failed to get remaining stock for ${promoCodeId}:`, error.message);
    return null;
  }
}

/**
 * プロダクト情報を取得
 * @param {string} productId - プロダクトID
 * @param {Array<string>} expand - 展開する関連オブジェクト（例: ['experiences', 'plans']）
 * @returns {Promise<Object>} プロダクト情報
 */
async function getProduct(productId, expand = []) {
  try {
    const endpoint = `/products/${productId}${buildQueryString({ expand })}`;
    const response = await whopApiRequest(endpoint);
    return response.data || response;
  } catch (error) {
    console.error(`[Whop API] Failed to get product ${productId}:`, error.message);
    throw error;
  }
}

/**
 * プロダクト情報を更新
 * @param {string} productId - プロダクトID
 * @param {Object} updateData - 更新データ {description, headline, product_highlights, ...}
 * @returns {Promise<Object>} 更新後のプロダクト情報
 */
async function updateProduct(productId, updateData) {
  try {
    const endpoint = `/products/${productId}`;
    const response = await whopApiRequest(endpoint, {
      method: 'POST',
      body: updateData,
    });
    return response.data || response;
  } catch (error) {
    console.error(`[Whop API] Failed to update product ${productId}:`, error.message);
    throw error;
  }
}

/**
 * プロダクトリストを取得
 * @param {Object} params - クエリパラメータ {company_id, visibility, ...}
 * @returns {Promise<Array<Object>>} プロダクトのリスト
 */
async function listProducts(params = {}) {
  try {
    const endpoint = `/products${buildQueryString(params)}`;
    const response = await whopApiRequest(endpoint);
    return response.data || [];
  } catch (error) {
    console.error('[Whop API] Failed to list products:', error.message);
    throw error;
  }
}

/**
 * プラン情報を取得
 * @param {string} planId - プランID
 * @returns {Promise<Object>} プラン情報
 */
async function getPlan(planId) {
  try {
    const response = await whopApiRequest(`/plans/${planId}`);
    return response.data || response;
  } catch (error) {
    console.error(`[Whop API] Failed to get plan ${planId}:`, error.message);
    throw error;
  }
}

/**
 * プラン情報を更新
 * @param {string} planId - プランID
 * @param {Object} updateData - 更新データ {renewal_price, initial_price, ...}
 * @returns {Promise<Object>} 更新後のプラン情報
 */
async function updatePlan(planId, updateData) {
  try {
    const response = await whopApiRequest(`/plans/${planId}`, {
      method: 'POST',
      body: updateData,
    });
    return response.data || response;
  } catch (error) {
    console.error(`[Whop API] Failed to update plan ${planId}:`, error.message);
    throw error;
  }
}

/**
 * プランリストを取得
 * @param {Object} params - クエリパラメータ {company_id, product_id, visibility, ...}
 * @returns {Promise<Array<Object>>} プランのリスト
 */
async function listPlans(params = {}) {
  try {
    const endpoint = `/plans${buildQueryString(params)}`;
    const response = await whopApiRequest(endpoint);
    return response.data || [];
  } catch (error) {
    console.error('[Whop API] Failed to list plans:', error.message);
    throw error;
  }
}

/**
 * エクスペリエンス情報を取得
 * @param {string} experienceId - エクスペリエンスID
 * @returns {Promise<Object>} エクスペリエンス情報
 */
async function getExperience(experienceId) {
  try {
    const response = await whopApiRequest(`/experiences/${experienceId}`);
    return response.data || response;
  } catch (error) {
    console.error(`[Whop API] Failed to get experience ${experienceId}:`, error.message);
    throw error;
  }
}

/**
 * エクスペリエンス情報を更新
 * @param {string} experienceId - エクスペリエンスID
 * @param {Object} updateData - 更新データ {name, description, ...}
 * @returns {Promise<Object>} 更新後のエクスペリエンス情報
 */
async function updateExperience(experienceId, updateData) {
  try {
    const response = await whopApiRequest(`/experiences/${experienceId}`, {
      method: 'POST',
      body: updateData,
    });
    return response.data || response;
  } catch (error) {
    console.error(`[Whop API] Failed to update experience ${experienceId}:`, error.message);
    throw error;
  }
}

/**
 * エクスペリエンスリストを取得
 * @param {Object} params - クエリパラメータ {company_id, product_id, ...}
 * @returns {Promise<Array<Object>>} エクスペリエンスのリスト
 */
async function listExperiences(params = {}) {
  try {
    const endpoint = `/experiences${buildQueryString(params)}`;
    const response = await whopApiRequest(endpoint);
    return response.data || [];
  } catch (error) {
    console.error('[Whop API] Failed to list experiences:', error.message);
    throw error;
  }
}

/**
 * メンバーシップ情報を取得
 * @param {string} membershipId - メンバーシップID
 * @returns {Promise<Object>} メンバーシップ情報
 */
async function getMembership(membershipId) {
  try {
    const response = await whopApiRequest(`/memberships/${membershipId}`);
    return response.data || response;
  } catch (error) {
    console.error(`[Whop API] Failed to get membership ${membershipId}:`, error.message);
    throw error;
  }
}

/**
 * メンバーシップリストを取得
 * @param {Object} params - クエリパラメータ {status, product_id, plan_id, user_id, expand, ...}
 * @returns {Promise<Array<Object>>} メンバーシップのリスト
 */
async function listMemberships(params = {}) {
  try {
    const endpoint = `/memberships${buildQueryString(params)}`;
    const response = await whopApiRequest(endpoint);
    return response.data || [];
  } catch (error) {
    console.error('[Whop API] Failed to list memberships:', error.message);
    throw error;
  }
}

/**
 * メンバーシップ情報を更新
 * @param {string} membershipId - メンバーシップID
 * @param {Object} payload - 更新データ {metadata, ...}
 * @returns {Promise<Object>} 更新後のメンバーシップ情報
 */
async function updateMembership(membershipId, payload) {
  try {
    const response = await whopApiRequest(`/memberships/${membershipId}`, {
      method: 'POST',
      body: payload,
    });
    return response.data || response;
  } catch (error) {
    console.error(`[Whop API] Failed to update membership ${membershipId}:`, error.message);
    throw error;
  }
}

/**
 * メンバーシップをキャンセル
 * @param {string} membershipId - メンバーシップID
 * @param {Object} payload - {cancellation_mode: 'immediate' | 'at_period_end'}
 * @returns {Promise<Object>} キャンセル結果
 */
async function cancelMembership(membershipId, payload) {
  try {
    const response = await whopApiRequest(`/memberships/${membershipId}/cancel`, {
      method: 'POST',
      body: payload,
    });
    return response.data || response;
  } catch (error) {
    console.error(`[Whop API] Failed to cancel membership ${membershipId}:`, error.message);
    throw error;
  }
}

/**
 * メンバーシップを即時終了
 * @param {string} membershipId - メンバーシップID
 * @returns {Promise<Object>} 終了結果
 */
async function terminateMembership(membershipId) {
  try {
    const response = await whopApiRequest(`/memberships/${membershipId}/terminate`, {
      method: 'POST',
    });
    return response.data || response;
  } catch (error) {
    console.error(`[Whop API] Failed to terminate membership ${membershipId}:`, error.message);
    throw error;
  }
}

/**
 * チェックアウトセッションを作成（FirstPromoter ref 紐づけ用）
 * Whop サポート推奨: ref はセッション作成時に metadata で渡す。Webhook で metadata が届く。
 * @param {Object} params
 * @param {string} params.plan_id - プランID（例: plan_xxx）
 * @param {string} params.ref - FirstPromoter の紹介ID（アフィリエイター識別子）
 * @param {string} [params.redirect_url] - 購入完了後のリダイレクト先
 * @returns {Promise<{ purchase_url: string, id: string }>} purchase_url にリダイレクトする
 */
async function createCheckoutSession(params) {
  const { plan_id, ref, redirect_url } = params;
  if (!plan_id || !ref) {
    throw new Error('createCheckoutSession requires plan_id and ref');
  }
  try {
    const body = {
      plan_id,
      metadata: { ref: String(ref), ref_id: String(ref) },
    };
    if (redirect_url) body.redirect_url = redirect_url;
    const response = await whopApiRequest('/checkout_sessions', {
      method: 'POST',
      body,
    });
    const data = response.data || response;
    const purchase_url = data.purchase_url || data.checkout_url;
    if (!purchase_url) {
      throw new Error('Whop API did not return purchase_url');
    }
    return { purchase_url, id: data.id };
  } catch (error) {
    console.error('[Whop API] createCheckoutSession failed:', error.message);
    throw error;
  }
}

module.exports = {
  whopApiRequest,
  getPromoCode,
  listPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  calculateRemainingStock,
  getRemainingStock,
  getProduct,
  updateProduct,
  listProducts,
  getPlan,
  updatePlan,
  listPlans,
  getExperience,
  updateExperience,
  listExperiences,
  getMembership,
  listMemberships,
  updateMembership,
  cancelMembership,
  terminateMembership,
  createCheckoutSession,
};
