// services/telegram/bot.js
// Node.js 18+ 標準 fetch を使用した Telegram Bot クライアント

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.warn("⚠️ TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set in .env.local");
}

/**
 * Send a message to the configured Telegram chat.
 * @param {string} text
 */
async function sendMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("❌ Telegram credentials are missing. Skipping sendMessage.");
    return;
  }

  const url = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`);
  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: "Markdown"
  };

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
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
 */
async function sendPhoto(photoUrl, caption = '') {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("❌ Telegram credentials are missing. Skipping sendPhoto.");
    return;
  }

  const url = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`);

  try {
    let response;

    // Data URLの場合はmultipart/form-dataで送信
    if (photoUrl.startsWith('data:')) {
      // Data URLをパース: data:image/png;base64,<base64data>
      const matches = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid Data URL format');
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // multipart/form-dataの境界線を生成
      const boundary = `----FormDataBoundary${Date.now()}`;
      const formDataParts = [];

      // chat_id
      formDataParts.push(
        `--${boundary}\r\n`,
        `Content-Disposition: form-data; name="chat_id"\r\n\r\n`,
        `${TELEGRAM_CHAT_ID}\r\n`
      );

      // photo (ファイル)
      const filename = mimeType.includes('png') ? 'image.png' : 
                      mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'image.jpg' : 
                      'image.png';
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

      // 終了境界線
      formDataParts.push(`--${boundary}--\r\n`);

      // FormDataを構築
      const formDataBuffer = Buffer.concat(formDataParts.map(part => 
        Buffer.isBuffer(part) ? part : Buffer.from(part, 'utf-8')
      ));

      response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": formDataBuffer.length.toString(),
        },
        body: formDataBuffer
      });
    } else {
      // HTTP URLの場合は通常のJSONで送信
      const body = {
        chat_id: TELEGRAM_CHAT_ID,
        photo: photoUrl,
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
    console.log("📸 Telegram photo sent:", JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error("❌ Telegram sendPhoto failed:", error.message);
    throw error;
  }
}

/**
 * Send a video to the configured Telegram chat.
 * Supports HTTP URLs and Base64 Data URLs.
 * @param {string} videoUrl - HTTP URL or data:video/...;base64,... format
 * @param {string} caption - Video caption (max 1024 characters)
 */
async function sendVideo(videoUrl, caption = '') {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("❌ Telegram credentials are missing. Skipping sendVideo.");
    return;
  }

  const url = new URL(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`);

  try {
    let response;

    // Data URLの場合はmultipart/form-dataで送信
    if (videoUrl.startsWith('data:')) {
      // Data URLをパース: data:video/mp4;base64,<base64data>
      const matches = videoUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid Data URL format');
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

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
      const filename = mimeType.includes('mp4') ? 'video.mp4' : 
                      mimeType.includes('webm') ? 'video.webm' : 
                      'video.mp4';
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
      const formDataBuffer = Buffer.concat(formDataParts.map(part => 
        Buffer.isBuffer(part) ? part : Buffer.from(part, 'utf-8')
      ));

      response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": formDataBuffer.length.toString(),
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

module.exports = { sendMessage, sendPhoto, sendVideo };
