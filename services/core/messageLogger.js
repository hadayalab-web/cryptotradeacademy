// services/core/messageLogger.js
// Message Logger Service - リアルタイム検証用のメッセージ送信ログ

const fs = require('fs');
const path = require('path');

const MESSAGES_LOG_FILE = path.join(__dirname, '../../data/messages_log.jsonl');

// データディレクトリの存在確認
if (!fs.existsSync(path.dirname(MESSAGES_LOG_FILE))) {
  fs.mkdirSync(path.dirname(MESSAGES_LOG_FILE), { recursive: true });
}

/**
 * Message Logger Service
 * A/Bテストとリアルタイム検証のためのメッセージ送信ログを記録
 */
class MessageLogger {
  /**
   * メッセージ送信ログを記録
   * @param {Object} logData - ログデータ
   */
  logMessage({
    message_id,
    snapshot_id,
    lang,
    variant,
    message_type, // 'REGULAR', 'EMERGENCY', 'WATCH', 'STANDBY_BREAK'
    sent_at,
    telegram_message_id, // Telegram APIから返されるメッセージID
    cta_links, // CTAリンクの配列（計測用）
  }) {
    const logEntry = {
      message_id,
      snapshot_id,
      lang,
      variant, // 'A' or 'B'
      message_type,
      sent_at: sent_at || new Date().toISOString(),
      telegram_message_id,
      cta_links: cta_links || [],
      // 将来的に追加可能: clicked_at, started_at, subscribed_at, blocked_at
    };

    try {
      // JSONL形式で追記
      fs.appendFileSync(
        MESSAGES_LOG_FILE,
        JSON.stringify(logEntry) + '\n',
        'utf8'
      );
      console.log(`[MessageLogger] Logged: ${message_id} (${lang}, variant: ${variant})`);
    } catch (error) {
      console.error('[MessageLogger] Error logging message:', error);
      // エラー時も処理を続行（ログのみ）
    }
  }

  /**
   * メッセージログを読み込み（計測API用）
   * @param {Object} filters - フィルタ条件
   * @returns {Array} ログエントリの配列
   */
  readLogs({ snapshot_id, lang, variant, message_type, time_window = '24h' }) {
    try {
      if (!fs.existsSync(MESSAGES_LOG_FILE)) {
        return [];
      }

      const logs = fs
        .readFileSync(MESSAGES_LOG_FILE, 'utf8')
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line))
        .filter((entry) => {
          // フィルタ適用
          if (snapshot_id && entry.snapshot_id !== snapshot_id) return false;
          if (lang && entry.lang !== lang) return false;
          if (variant && entry.variant !== variant) return false;
          if (message_type && entry.message_type !== message_type) return false;

          // 時間ウィンドウフィルタ
          if (time_window) {
            const entryTime = new Date(entry.sent_at).getTime();
            const now = Date.now();
            const windowMs = this._parseTimeWindow(time_window);
            if (now - entryTime > windowMs) return false;
          }

          return true;
        });

      return logs;
    } catch (error) {
      console.error('[MessageLogger] Error reading logs:', error);
      return [];
    }
  }

  /**
   * 時間ウィンドウをミリ秒に変換
   * @param {string} timeWindow - '24h', '7d', '30d'など
   * @returns {number} ミリ秒
   */
  _parseTimeWindow(timeWindow) {
    const match = timeWindow.match(/^(\d+)([hd])$/);
    if (!match) return 24 * 60 * 60 * 1000; // デフォルト24時間

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * イベントログを記録（クリック、登録、ブロックなど）
   * @param {Object} eventData - イベントデータ
   */
  logEvent({
    message_id,
    event_type, // 'click', 'start', 'subscribe', 'block', 'mute'
    event_at,
    metadata, // 追加メタデータ（UTMパラメータなど）
  }) {
    const eventEntry = {
      message_id,
      event_type,
      event_at: event_at || new Date().toISOString(),
      metadata: metadata || {},
    };

    const EVENTS_LOG_FILE = path.join(__dirname, '../../data/events_log.jsonl');

    // データディレクトリの存在確認
    if (!fs.existsSync(path.dirname(EVENTS_LOG_FILE))) {
      fs.mkdirSync(path.dirname(EVENTS_LOG_FILE), { recursive: true });
    }

    try {
      fs.appendFileSync(
        EVENTS_LOG_FILE,
        JSON.stringify(eventEntry) + '\n',
        'utf8'
      );
      console.log(`[MessageLogger] Event logged: ${event_type} for ${message_id}`);
    } catch (error) {
      console.error('[MessageLogger] Error logging event:', error);
    }
  }

  /**
   * イベントログを読み込み（計測API用）
   * @param {Object} filters - フィルタ条件
   * @returns {Array} イベントログエントリの配列
   */
  readEvents({ message_id, event_type, time_window = '24h' }) {
    const EVENTS_LOG_FILE = path.join(__dirname, '../../data/events_log.jsonl');

    try {
      if (!fs.existsSync(EVENTS_LOG_FILE)) {
        return [];
      }

      const events = fs
        .readFileSync(EVENTS_LOG_FILE, 'utf8')
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line))
        .filter((entry) => {
          // フィルタ適用
          if (message_id && entry.message_id !== message_id) return false;
          if (event_type && entry.event_type !== event_type) return false;

          // 時間ウィンドウフィルタ
          if (time_window) {
            const entryTime = new Date(entry.event_at).getTime();
            const now = Date.now();
            const windowMs = this._parseTimeWindow(time_window);
            if (now - entryTime > windowMs) return false;
          }

          return true;
        });

      return events;
    } catch (error) {
      console.error('[MessageLogger] Error reading events:', error);
      return [];
    }
  }
}

// シングルトンインスタンス
const messageLogger = new MessageLogger();

module.exports = messageLogger;
