// services/telegram/bot.js
// Node.js 18+ 標準 fetch を使用した Telegram Bot クライアント
//
// 注意: Trap Defense BTCのインテリジェンス・レポート配信には
// グループ（Group）ではなくチャンネル（Channel）を使用することを推奨します。
// 理由: 一方向配信、スパムなし、管理が簡単、プロフェッショナルな印象
// 詳細: docs/TELEGRAM_CHANNEL_VS_GROUP.md を参照

// 1つのBot Tokenで全資産を管理（簡素化）
// MINIMALのみ、互換性として TELEGRAM_BOT_TOKEN_MINIMAL を許可
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // BTC用チャンネルID（デフォルト）
// チャンネルIDは通常 -100 で始まります（例: -1001234567890）

// 後方互換性のため、無料ミニマム版用の環境変数もサポート
// ただし、sendMessageToAssetを使用することを推奨
const TELEGRAM_BOT_TOKEN_MINIMAL = process.env.TELEGRAM_BOT_TOKEN_MINIMAL;
const TELEGRAM_CHAT_ID_MINIMAL = process.env.TELEGRAM_CHAT_ID_MINIMAL; // 無料版チャンネルID

/** Telegram sendMessage の上限（文字数）。超えた場合は切り詰める */
const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

function truncateMessage(text, maxLen = TELEGRAM_MAX_MESSAGE_LENGTH) {
  if (!text || typeof text !== "string") return text || "";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

/**
 * MINIMALチャンネルのChat IDを言語に応じて解決
 * 互換性: JP/KR/PTBR の別名も許可
 * Grok CSO+CFO推奨: 全言語フォールバック（言語別ID → EN → デフォルト）
 */
function resolveMinimalChatId(langCode) {
  if (!langCode) {
    // ENチャンネルを優先、なければデフォルト
    return process.env.TELEGRAM_CHAT_ID_MINIMAL_EN || TELEGRAM_CHAT_ID_MINIMAL;
  }

  const normalized = String(langCode).toUpperCase().replace("-", "_");
  const variants = [normalized];
  if (normalized === "PT_BR") variants.push("PTBR");
  if (normalized === "JA") variants.push("JP");
  if (normalized === "KO") variants.push("KR");

  // 1. 言語別チャンネルIDを優先
  for (const variant of variants) {
    const envVarName = `TELEGRAM_CHAT_ID_MINIMAL_${variant}`;
    const chatId = process.env[envVarName];
    if (chatId) return chatId;
  }

  // 2. ENチャンネルにフォールバック（Grok CSO+CFO推奨）
  const enChatId = process.env.TELEGRAM_CHAT_ID_MINIMAL_EN;
  if (enChatId) {
    console.warn(`⚠️ ${langCode}言語用チャンネルIDが未設定、ENチャンネルにフォールバック`);
    return enChatId;
  }

  // 3. デフォルトチャンネルにフォールバック
  return TELEGRAM_CHAT_ID_MINIMAL;
}

// 警告: 無印 TELEGRAM_CHAT_ID は旧仕様。Regular 配信は TELEGRAM_CHAT_ID_BTC_JA 等を使う
function hasAnyRegularChannelId() {
  const codes = ["EN", "JA", "ES", "KO", "PT_BR", "AR"];
  return codes.some((c) => process.env[`TELEGRAM_CHAT_ID_BTC_${c}`]);
}
if (!TELEGRAM_BOT_TOKEN) {
  console.warn("⚠️ TELEGRAM_BOT_TOKEN is not set — Telegram送信はスキップされます");
} else if (!TELEGRAM_CHAT_ID && !hasAnyRegularChannelId()) {
  console.warn("⚠️ TELEGRAM_CHAT_ID および TELEGRAM_CHAT_ID_BTC_* が未設定 — チャンネル送信できません");
}

/**
 * Send a message to the configured Telegram chat.
 * @param {string} text
 * @param {Object} options - Optional parameters (parse_mode, reply_markup, etc.)
 */
async function sendMessage(text, options = {}) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("⚠️ Telegram credentials are missing. Skipping sendMessage.");
    return;
  }

  const url = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`);
  const safeText = truncateMessage(text);
  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text: safeText,
    parse_mode: options.parse_mode || "Markdown",
    ...options
  };

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      const isParseOrLengthError =
        response.status === 400 &&
        (errText.includes("parse") ||
          errText.includes("entities") ||
          errText.includes("too long") ||
          errText.includes("Bad Request"));
      if (isParseOrLengthError && body.parse_mode) {
        const fallbackBody = { ...body, text: safeText, parse_mode: undefined };
        const retryRes = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fallbackBody)
        });
        if (retryRes.ok) {
          const data = await retryRes.json();
          console.log("📨 Telegram sent (fallback without parse_mode):", data.ok);
          return data;
        }
      }
      throw new Error(`Telegram API Error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    console.log("📨 Telegram sent:", JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error("❌ Telegram sendMessage failed:", error.message);
    throw error;
  }
}

/**
 * Send a photo to the configured Telegram chat.
 * Supports HTTP URLs and Base64 Data URLs.
 * @param {string} photoUrl - HTTP URL or data:image/...;base64,... format
 * @param {string} caption - Photo caption (max 1024 characters)
 * @param {string|number} chatId - Optional chat ID override
 * @param {string} botToken - Optional bot token override
 * @param {Object} options - Optional parameters (reply_markup, parse_mode, etc.)
 */
async function sendPhoto(photoUrl, caption = "", chatId = null, botToken = null, options = {}) {
  const token = botToken || TELEGRAM_BOT_TOKEN;
  const targetChatId = chatId || TELEGRAM_CHAT_ID;

  if (!token || !targetChatId) {
    console.warn("⚠️ Telegram credentials are missing. Skipping sendPhoto.");
    return;
  }

  const url = new URL(`https://api.telegram.org/bot${token}/sendPhoto`);

  try {
    let response;

    // Data URLの場合はmultipart/form-dataで送信
    if (photoUrl.startsWith("data:")) {
      // Data URLをパース: data:image/png;base64,<base64data>
      const matches = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error("Invalid Data URL format");
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      // multipart/form-dataの境界線を生成
      const boundary = `----FormDataBoundary${Date.now()}`;
      const formDataParts = [];

      // chat_id
      formDataParts.push(
        `--${boundary}\r\n`,
        `Content-Disposition: form-data; name="chat_id"\r\n\r\n`,
        `${targetChatId}\r\n`
      );

      // photo (ファイル)
      const filename = mimeType.includes("png")
        ? "image.png"
        : mimeType.includes("jpeg") || mimeType.includes("jpg")
          ? "image.jpg"
          : "image.png";
      formDataParts.push(
        `--${boundary}\r\n`,
        `Content-Disposition: form-data; name="photo"; filename="${filename}"\r\n`,
        `Content-Type: ${mimeType}\r\n\r\n`
      );
      formDataParts.push(buffer);
      formDataParts.push(`\r\n`);

      // caption (オプション)
      if (caption) {
        formDataParts.push(
          `--${boundary}\r\n`,
          `Content-Disposition: form-data; name="caption"\r\n\r\n`,
          `${caption.substring(0, 1024)}\r\n`
        );
      }

      // parse_mode（undefinedの場合は送信しない）
      if (options.parse_mode !== undefined) {
        formDataParts.push(
          `--${boundary}\r\n`,
          `Content-Disposition: form-data; name="parse_mode"\r\n\r\n`,
          `${options.parse_mode}\r\n`
        );
      }

      // reply_markup (オプション)
      if (options.reply_markup) {
        formDataParts.push(
          `--${boundary}\r\n`,
          `Content-Disposition: form-data; name="reply_markup"\r\n\r\n`,
          `${JSON.stringify(options.reply_markup)}\r\n`
        );
      }

      // 終了境界線
      formDataParts.push(`--${boundary}--\r\n`);

      // FormDataを構築
      const formDataBuffer = Buffer.concat(
        formDataParts.map((part) => (Buffer.isBuffer(part) ? part : Buffer.from(part, "utf-8")))
      );

      response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": formDataBuffer.length.toString()
        },
        body: formDataBuffer
      });
    } else {
      // HTTP URLの場合は通常のJSONで送信
      const body = {
        chat_id: targetChatId,
        photo: photoUrl,
        caption: caption ? caption.substring(0, 1024) : undefined,
        parse_mode: options.parse_mode || "Markdown",
        ...options
      };

      response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errText);
      } catch {
        errorDetails = errText;
      }

      const errorMsg = `Telegram API Error: ${response.status} ${response.statusText}`;
      console.error(`❌ ${errorMsg}`);
      console.error(`   Chat ID: ${targetChatId}`);
      console.error(`   Error details:`, errorDetails);
      console.error(`   Caption length: ${caption?.length || 0} chars`);
      console.error(`   Photo URL type: ${photoUrl.startsWith("data:") ? "data-url" : "http-url"}`);

      throw new Error(`${errorMsg} - ${JSON.stringify(errorDetails)}`);
    }

    const data = await response.json();
    if (data.ok) {
      console.log("📸 Telegram photo sent:", JSON.stringify(data, null, 2));
    } else {
      console.error(`❌ Telegram API returned error:`, data);
      throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
    }
    return data;
  } catch (error) {
    console.error("❌ Telegram sendPhoto failed:", {
      errorType: error.constructor.name,
      errorMessage: error.message,
      chatId: targetChatId,
      captionLength: caption?.length || 0,
      photoUrlType: photoUrl?.startsWith("data:") ? "data-url" : "http-url",
      errorStack: error.stack
    });
    throw error;
  }
}

/**
 * Send a video to the configured Telegram chat.
 * Supports HTTP URLs and Base64 Data URLs.
 * @param {string} videoUrl - HTTP URL or data:video/...;base64,... format
 * @param {string} caption - Video caption (max 1024 characters)
 */
async function sendVideo(videoUrl, caption = "") {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("⚠️ Telegram credentials are missing. Skipping sendVideo.");
    return;
  }

  const url = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`);

  try {
    let response;

    // Data URLの場合はmultipart/form-dataで送信
    if (videoUrl.startsWith("data:")) {
      // Data URLをパース: data:video/mp4;base64,<base64data>
      const matches = videoUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error("Invalid Data URL format");
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      // multipart/form-dataの境界線を生成
      const boundary = `----FormDataBoundary${Date.now()}`;
      const formDataParts = [];

      // chat_id
      formDataParts.push(
        `--${boundary}\r\n`,
        `Content-Disposition: form-data; name="chat_id"\r\n\r\n`,
        `${TELEGRAM_CHAT_ID}\r\n`
      );

      // video (ファイル)
      const filename = mimeType.includes("mp4")
        ? "video.mp4"
        : mimeType.includes("webm")
          ? "video.webm"
          : "video.mp4";
      formDataParts.push(
        `--${boundary}\r\n`,
        `Content-Disposition: form-data; name="video"; filename="${filename}"\r\n`,
        `Content-Type: ${mimeType}\r\n\r\n`
      );
      formDataParts.push(buffer);
      formDataParts.push(`\r\n`);

      // caption (オプション)
      if (caption) {
        formDataParts.push(
          `--${boundary}\r\n`,
          `Content-Disposition: form-data; name="caption"\r\n\r\n`,
          `${caption.substring(0, 1024)}\r\n`
        );
      }

      // 終了境界線
      formDataParts.push(`--${boundary}--\r\n`);

      // FormDataを構築
      const formDataBuffer = Buffer.concat(
        formDataParts.map((part) => (Buffer.isBuffer(part) ? part : Buffer.from(part, "utf-8")))
      );

      response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": formDataBuffer.length.toString()
        },
        body: formDataBuffer
      });
    } else {
      // HTTP URLの場合は通常のJSONで送信
      const body = {
        chat_id: TELEGRAM_CHAT_ID,
        video: videoUrl,
        caption: caption ? caption.substring(0, 1024) : undefined,
        parse_mode: "Markdown"
      };

      response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Telegram API Error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    console.log("🎬 Telegram video sent:", JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error("❌ Telegram sendVideo failed:", error.message);
    throw error;
  }
}

/**
 * Send a message to a specific Telegram chat by asset type.
 * Uses a single Bot Token for all assets, but different Chat IDs per asset.
 * @param {string} text - Message text
 * @param {string} asset - Asset type ('BTC', 'ETH', 'SOL', 'MINIMAL', etc.)
 * @param {string} langCode - Language code ('EN', 'JA', 'KO', 'ES', 'PT_BR', 'AR') for MINIMAL asset
 * @param {Object} options - Optional parameters (parse_mode, reply_markup, etc.)
 */
async function sendMessageToAsset(text, asset = "BTC", langCode = null, options = {}) {
  // 1つのBot Tokenを使用（全資産共通）
  // MINIMALのみ、互換性として TELEGRAM_BOT_TOKEN_MINIMAL を許可
  const botToken = TELEGRAM_BOT_TOKEN || (asset === "MINIMAL" ? TELEGRAM_BOT_TOKEN_MINIMAL : null);

  let chatId;

  if (asset === "MINIMAL" && langCode) {
    // 言語別チャンネルIDを解決（別名も許可）
    chatId = resolveMinimalChatId(langCode);

    // 言語別チャンネルIDが設定されていない場合、デフォルトのMINIMALチャンネルIDにフォールバック
    if (!chatId) {
      const langCodeUpper = langCode.toUpperCase().replace("-", "_");
      console.warn(
        `⚠️ Language-specific channel ID not found for MINIMAL/${langCodeUpper}, and default MINIMAL channel is missing`
      );
    }
  } else {
    // 資産タイプごとのChat IDを環境変数から取得
    const chatIdMap = {
      BTC: TELEGRAM_CHAT_ID,
      ETH: process.env.TELEGRAM_CHAT_ID_ETH,
      SOL: process.env.TELEGRAM_CHAT_ID_SOL,
      MINIMAL: process.env.TELEGRAM_CHAT_ID_MINIMAL
    };

    chatId = chatIdMap[asset] || TELEGRAM_CHAT_ID; // フォールバック: BTC用Chat ID
  }

  if (!botToken || !chatId) {
    const assetLabel = langCode ? `${asset}/${langCode}` : asset;
    console.warn(
      `⚠️ Telegram credentials missing for ${assetLabel}. Bot Token: ${!!botToken}, Chat ID: ${!!chatId}`
    );
    return;
  }

  const url = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`);
  const safeText = truncateMessage(text);
  const body = {
    chat_id: chatId,
    text: safeText,
    parse_mode: options.parse_mode || "Markdown",
    ...options
  };

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      const isParseOrLengthError =
        response.status === 400 &&
        (errText.includes("parse") ||
          errText.includes("entities") ||
          errText.includes("too long") ||
          errText.includes("Bad Request"));
      if (isParseOrLengthError && body.parse_mode) {
        const fallbackBody = { ...body, text: safeText, parse_mode: undefined };
        const retryRes = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fallbackBody)
        });
        if (retryRes.ok) {
          const data = await retryRes.json();
          const assetLabel = langCode ? `${asset}/${langCode}` : asset;
          console.log(`📨 Telegram sent to ${assetLabel} (fallback without parse_mode):`, data.ok);
          return data;
        }
      }
      throw new Error(`Telegram API Error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    const assetLabel = langCode ? `${asset}/${langCode}` : asset;
    console.log(`📨 Telegram sent to ${assetLabel}:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    const assetLabel = langCode ? `${asset}/${langCode}` : asset;
    console.error(`❌ Telegram sendMessageToAsset failed for ${assetLabel}:`, error.message);
    throw error;
  }
}

/**
 * Send a photo to a specific Telegram chat by asset type.
 * @param {string} photoUrl - HTTP URL or data:image/...
 * @param {string} caption - Message text
 * @param {string} asset - Asset type ('BTC', 'ETH', 'SOL', 'MINIMAL', etc.)
 * @param {string} langCode - Language code
 * @param {Object} options - Optional parameters (parse_mode, reply_markup, etc.)
 */
async function sendPhotoToAsset(photoUrl, caption, asset = "BTC", langCode = null, options = {}) {
  const botToken = TELEGRAM_BOT_TOKEN || (asset === "MINIMAL" ? TELEGRAM_BOT_TOKEN_MINIMAL : null);
  let chatId;

  if (asset === "MINIMAL" && langCode) {
    chatId = resolveMinimalChatId(langCode);
  } else {
    const chatIdMap = {
      BTC: TELEGRAM_CHAT_ID,
      ETH: process.env.TELEGRAM_CHAT_ID_ETH,
      SOL: process.env.TELEGRAM_CHAT_ID_SOL,
      MINIMAL: process.env.TELEGRAM_CHAT_ID_MINIMAL
    };
    chatId = chatIdMap[asset] || TELEGRAM_CHAT_ID;
  }

  if (!botToken || !chatId) {
    console.warn(`⚠️ Credentials missing for sendPhotoToAsset (${asset}/${langCode})`);
    return;
  }

  return await sendPhoto(photoUrl, caption, chatId, botToken, options);
}

/**
 * Send a message to the minimal version Telegram chat (free users).
 * @deprecated Use sendMessageToAsset(text, 'MINIMAL') instead
 * @param {string} text
 */
async function sendMessageMinimal(text) {
  // 後方互換性のため、sendMessageToAssetを呼び出す
  return sendMessageToAsset(text, "MINIMAL");
}

/**
 * Send a message directly to a specific Telegram user (by chat ID).
 * Used for bot commands and direct user communication.
 * @param {string} chatId - Telegram chat ID (user ID)
 * @param {string} text - Message text
 * @param {Object} options - Optional parameters (parse_mode, etc.)
 */
async function sendMessageToUser(chatId, text, options = {}) {
  const botToken = TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN_MINIMAL; // DMはどちらでも送れるように

  if (!botToken || !chatId) {
    const errorMsg = `Telegram credentials missing. Bot Token: ${!!botToken}, Chat ID: ${!!chatId}`;
    console.warn(`⚠️ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  const url = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`);
  const body = {
    chat_id: chatId,
    text,
    parse_mode: options.parse_mode || "Markdown",
    ...options
  };

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errText);
      } catch {
        errorDetails = errText;
      }

      const errorMsg = `Telegram API Error: ${response.status} ${response.statusText}`;
      console.error(`❌ ${errorMsg}`);
      console.error(`   Chat ID: ${chatId}`);
      console.error(`   Error details:`, errorDetails);
      console.error(`   Message length: ${text.length} chars`);
      console.error(`   Parse mode: ${body.parse_mode}`);

      throw new Error(`${errorMsg} - ${JSON.stringify(errorDetails)}`);
    }

    const data = await response.json();
    if (data.ok) {
      console.log(`📨 Telegram sent to user ${chatId}:`, JSON.stringify(data, null, 2));
    } else {
      console.error(`❌ Telegram API returned error:`, data);
      throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
    }
    return data;
  } catch (error) {
    console.error(`❌ Telegram sendMessageToUser failed for ${chatId}:`, {
      errorType: error.constructor.name,
      errorMessage: error.message,
      chatId,
      messageLength: text.length,
      parseMode: body.parse_mode,
      errorStack: error.stack
    });
    throw error;
  }
}

/**
 * Send a photo directly to a specific Telegram user (by chat ID).
 * @param {string} chatId - Telegram chat ID (user ID)
 * @param {string} photoUrl - Photo URL or Data URL
 * @param {string} caption - Caption
 * @param {Object} options - Optional parameters
 */
async function sendPhotoToUser(chatId, photoUrl, caption, options = {}) {
  const botToken = TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN_MINIMAL;
  if (!botToken || !chatId) {
    const errorMsg = `Credentials missing for sendPhotoToUser. Bot Token: ${!!botToken}, Chat ID: ${!!chatId}`;
    console.warn(`⚠️ ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    // Reuse existing sendPhoto but override chatId/token logic inside it or call it with explicit params
    // sendPhoto has signature: (photoUrl, caption = '', chatId = null, botToken = null, options = {})
    const result = await sendPhoto(photoUrl, caption, chatId, botToken, options);
    console.log(`📸 Telegram photo sent to user ${chatId}`);
    return result;
  } catch (error) {
    console.error(`❌ Telegram sendPhotoToUser failed for ${chatId}:`, {
      errorType: error.constructor.name,
      errorMessage: error.message,
      chatId,
      captionLength: caption?.length || 0,
      photoUrlType: photoUrl?.startsWith("data:") ? "data-url" : "http-url",
      errorStack: error.stack
    });
    throw error;
  }
}

/**
 * Send a message to a specific Telegram channel by series and market code.
 * Uses a single Bot Token, but different Chat IDs per series/market combination.
 * @param {string} text - Message text
 * @param {string} series - Series type ('BTC', 'OTHER', etc.)
 * @param {string} marketCode - Market code ('EN', 'AR', 'KO', 'JA', 'ES', 'PT-BR')
 * @param {Object} options - Optional parameters (parse_mode, reply_markup, etc.)
 * @returns {Promise<Object>} Telegram API response
 */
async function sendMessageToChannel(text, series = "BTC", marketCode = "EN", options = {}) {
  const botToken = TELEGRAM_BOT_TOKEN;

  // 環境変数名を生成（例: TELEGRAM_CHAT_ID_BTC_EN）
  // PT-BRは環境変数名でPT_BRに変換
  const marketCodeEnv = marketCode.replace("-", "_");
  const envVarName = `TELEGRAM_CHAT_ID_${series}_${marketCodeEnv}`;
  const chatId = process.env[envVarName];

  if (!botToken || !chatId) {
    console.warn(
      `⚠️ Telegram credentials missing for ${series}/${marketCode}. Bot Token: ${!!botToken}, Chat ID: ${!!chatId} (env: ${envVarName})`
    );
    return;
  }

  const url = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`);
  const safeText = truncateMessage(text);
  const body = {
    chat_id: chatId,
    text: safeText,
    parse_mode: options.parse_mode || "Markdown",
    ...options
  };

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      const isParseOrLengthError =
        response.status === 400 &&
        (errText.includes("parse") ||
          errText.includes("entities") ||
          errText.includes("too long") ||
          errText.includes("Bad Request"));
      if (isParseOrLengthError && body.parse_mode) {
        const fallbackBody = { ...body, text: safeText, parse_mode: undefined };
        const retryRes = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fallbackBody)
        });
        if (retryRes.ok) {
          const data = await retryRes.json();
          console.log(`📨 Telegram sent to ${series}/${marketCode} (fallback without parse_mode):`, data.ok);
          return data;
        }
      }
      throw new Error(`Telegram API Error: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    console.log(`📨 Telegram sent to ${series}/${marketCode}:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error(
      `❌ Telegram sendMessageToChannel failed for ${series}/${marketCode}:`,
      error.message
    );
    throw error;
  }
}

module.exports = {
  sendMessage,
  sendPhoto,
  sendVideo,
  sendMessageMinimal,
  sendMessageToUser,
  sendPhotoToUser, // Added
  sendMessageToAsset,
  sendPhotoToAsset, // Added
  sendMessageToChannel
};
