// api/analytics.js
// リアルタイム検証用の計測API

const messageLogger = require('../services/core/messageLogger');

/**
 * リアルタイム検証用の計測API
 * KPI（CTR、Start Rate、Subscribe Rate、Retention、Negative feedback）を返却
 */
module.exports = async function handler(req, res) {
  // CORS対応（必要に応じて）
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { snapshot_id, lang, variant, message_type, time_window = '24h' } = req.query;

    // メッセージ送信ログを読み込み
    const messages = messageLogger.readLogs({
      snapshot_id,
      lang,
      variant,
      message_type,
      time_window,
    });

    // イベントログを読み込み（クリック、登録、ブロックなど）
    // まずメッセージIDを取得してから、イベントログを読み込む
    // 注: messagesは既に上で取得済み
    const messageIds = messages.map((msg) => msg.message_id);

    // メッセージIDに紐づくイベントを読み込み
    const allEvents = [];
    for (const msgId of messageIds) {
      const msgEvents = messageLogger.readEvents({
        message_id: msgId,
        time_window,
      });
      allEvents.push(...msgEvents);
    }
    const events = allEvents;

    // イベントタイプ別に集計
    const eventsByType = {};
    events.forEach((event) => {
      if (!eventsByType[event.event_type]) {
        eventsByType[event.event_type] = [];
      }
      eventsByType[event.event_type].push(event);
    });

    // メッセージIDごとにイベントをマッピング
    const messageEvents = {};
    events.forEach((event) => {
      if (!messageEvents[event.message_id]) {
        messageEvents[event.message_id] = [];
      }
      messageEvents[event.message_id].push(event);
    });

    // KPI計算
    const sentCount = messages.length;
    const clickCount = eventsByType.click?.length || 0;
    const startCount = eventsByType.start?.length || 0;
    const subscribeCount = eventsByType.subscribe?.length || 0;
    const blockCount = eventsByType.block?.length || 0;
    const muteCount = eventsByType.mute?.length || 0;

    // CTR (Click-Through Rate)
    const ctr = sentCount > 0 ? clickCount / sentCount : 0;

    // Start Rate
    const startRate = sentCount > 0 ? startCount / sentCount : 0;

    // Subscribe Rate
    const subscribeRate = sentCount > 0 ? subscribeCount / sentCount : 0;

    // Negative feedback rate (block + mute)
    const negativeFeedbackRate = sentCount > 0 ? (blockCount + muteCount) / sentCount : 0;

    // Retention (D1) - 送信後24時間以内に再度アクションしたユーザー数
    // 簡易実装: 同一メッセージIDに対して複数のイベントがある場合
    const activeUsers = new Set();
    events.forEach((event) => {
      if (['click', 'start', 'subscribe'].includes(event.event_type)) {
        activeUsers.add(event.message_id);
      }
    });
    const retentionD1 = sentCount > 0 ? activeUsers.size / sentCount : 0;

    // レスポンス
    return res.status(200).json({
      snapshot_id,
      lang,
      variant,
      message_type,
      time_window,
      metrics: {
        sent: sentCount,
        clicked: clickCount,
        ctr: Math.round(ctr * 10000) / 100, // パーセンテージ（小数点2桁）
        started: startCount,
        start_rate: Math.round(startRate * 10000) / 100,
        subscribed: subscribeCount,
        subscribe_rate: Math.round(subscribeRate * 10000) / 100,
        blocked: blockCount,
        muted: muteCount,
        negative_feedback_rate: Math.round(negativeFeedbackRate * 10000) / 100,
        retention_d1: Math.round(retentionD1 * 10000) / 100,
      },
      // デバッグ用（本番では削除可能）
      _debug: {
        messages_count: messages.length,
        events_count: events.length,
        events_by_type: Object.keys(eventsByType).reduce((acc, type) => {
          acc[type] = eventsByType[type].length;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
