/**
 * X DM 送信（アフィリエイトリクルート用）
 * FirstPromoter 招待 URL 入りメッセージを候補に送る。
 * 戦略: docs/AFFILIATE_STRATEGY_X_DM_FIRSTPROMOTER_WHOP.md
 */
const { xApiRequest, getUserByUsername, isRateLimitError } = require("./client");

/**
 * 指定ハンドルに 1:1 DM を 1 通送信する
 * @param {string} handle - X の @username（先頭 @ なし）
 * @param {string} text - 送信するメッセージ本文（10000 文字以内）
 * @param {{ participantId?: string }} [options] - participantId を渡すと GET /users/by/username をスキップ（検索結果の author_id をそのまま使用）
 * @returns {Promise<{ dmEventId?: string; conversationId?: string; error?: string }>}
 */
async function sendRecruitDm(handle, text, options = {}) {
  const normalizedHandle = String(handle || "").replace(/^@/, "").trim();
  if (!normalizedHandle) {
    return { error: "handle is required" };
  }
  if (!text || text.length > 10000) {
    return { error: "text must be 1–10000 chars" };
  }

  let participantId = options.participantId;
  if (!participantId) {
    try {
      const user = await getUserByUsername(normalizedHandle);
      participantId = user?.id;
    } catch (e) {
      console.warn("[DM] getUserByUsername failed:", normalizedHandle, e?.message);
      return { error: e?.message || "Failed to resolve user" };
    }
  }

  if (!participantId) {
    return { error: "User not found" };
  }

  try {
    const response = await xApiRequest(`/dm_conversations/with/${participantId}/messages`, {
      method: "POST",
      body: { text }
    });
    const dmEventId = response?.data?.dm_event_id ?? response?.dm_event_id;
    const conversationId = response?.data?.dm_conversation_id ?? response?.dm_conversation_id;
    if (response && (dmEventId || conversationId)) {
      return { dmEventId, conversationId };
    }
    return { error: "Unexpected response shape" };
  } catch (e) {
    console.warn("[DM] send failed:", normalizedHandle, e?.message);
    return { error: e?.message || "Send failed" };
  }
}

module.exports = {
  sendRecruitDm
};
