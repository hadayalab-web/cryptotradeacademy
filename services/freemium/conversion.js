// services/freemium/conversion.js
// フリーミアム転換戦略の実装

const { sendResendEmail } = require('../email/resendClient');

/**
 * 転換トリガーをチェック
 */
function checkConversionTriggers(userData, currentMarketData) {
  const triggers = [];

  // トリガー1: Trap Scoreが特定の閾値を超えた際
  if (currentMarketData.trapScore >= 7) {
    triggers.push({
      type: 'high_trap_score',
      severity: 'high',
      message: `Trap Scoreが${currentMarketData.trapScore}/10に達しました。完全レポートで詳細な分析を確認してください。`,
      cta: '完全レポートを見る',
      ctaUrl: 'https://cryptotradeacademy.io/upgrade?trigger=trap_score',
    });
  }

  // トリガー2: 重要な市場イベント検出時
  if (Math.abs(currentMarketData.change24h) >= 5) {
    triggers.push({
      type: 'significant_price_movement',
      severity: 'high',
      message: `BTC価格が24時間で${currentMarketData.change24h > 0 ? '+' : ''}${currentMarketData.change24h.toFixed(2)}%変動しました。詳細分析で市場の動向を把握してください。`,
      cta: '詳細分析を見る',
      ctaUrl: 'https://cryptotradeacademy.io/upgrade?trigger=price_movement',
    });
  }

  // トリガー3: Exchange Netflowの異常値検出時
  if (Math.abs(currentMarketData.exchangeNetflow) >= 100) {
    triggers.push({
      type: 'unusual_netflow',
      severity: 'medium',
      message: `Exchange Netflowが${currentMarketData.exchangeNetflow.toFixed(0)} BTCと異常値を示しています。完全レポートで詳細を確認してください。`,
      cta: '完全レポートを見る',
      ctaUrl: 'https://cryptotradeacademy.io/upgrade?trigger=netflow',
    });
  }

  // トリガー4: ユーザーが無料版を一定期間使用した後
  const daysSinceSignup = Math.floor((Date.now() - new Date(userData.signupDate).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceSignup >= 7 && !userData.hasSeenUpgradePrompt) {
    triggers.push({
      type: 'trial_period_reminder',
      severity: 'medium',
      message: '無料版を7日間ご利用いただきありがとうございます。有料版では、日次詳細分析、リアルタイムアラート、過去データアーカイブが利用できます。',
      cta: '有料版を試す（14日間無料）',
      ctaUrl: 'https://cryptotradeacademy.io/upgrade?trigger=trial_reminder',
    });
  }

  // トリガー5: ユーザーが特定の機能を試用しようとした際
  if (userData.attemptedFeature === 'custom_analysis' && !userData.isPaid) {
    triggers.push({
      type: 'feature_restriction',
      severity: 'high',
      message: 'カスタム分析機能は有料版限定です。Premium Tierでは、あなた専用の詳細分析を提供します。',
      cta: 'Premium Tierを試す',
      ctaUrl: 'https://cryptotradeacademy.io/upgrade?trigger=feature_restriction',
    });
  }

  return triggers;
}

/**
 * ナッジ通知を送信
 */
async function sendNudgeNotification(userEmail, trigger, userData) {
  const emailSubject = trigger.severity === 'high' 
    ? `🚨 重要: ${trigger.message.substring(0, 50)}...`
    : `💡 Trap Defence: ${trigger.message.substring(0, 50)}...`;

  const emailHTML = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${emailSubject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .benefits { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .benefit-item { padding: 10px 0; border-bottom: 1px solid #eee; }
        .benefit-item:last-child { border-bottom: none; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛡️ Trap Defence BTC</h1>
          <p>市場の罠からあなたを守る</p>
        </div>
        <div class="content">
          <h2>${trigger.message}</h2>
          
          <div class="benefits">
            <h3>有料版の特典:</h3>
            <div class="benefit-item">✅ 日次詳細分析レポート</div>
            <div class="benefit-item">✅ リアルタイムアラート通知</div>
            <div class="benefit-item">✅ 過去1年間のデータアーカイブ</div>
            <div class="benefit-item">✅ カスタム分析リクエスト</div>
            <div class="benefit-item">✅ 優先サポート（24時間以内返信）</div>
          </div>

          <div style="text-align: center;">
            <a href="${trigger.ctaUrl}" class="cta-button">${trigger.cta}</a>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            <strong>14日間の無料トライアル</strong>をご利用いただけます。クレジットカードは不要です。
          </p>
        </div>
        <div class="footer">
          <p>このメールは、Trap Defence BTCの無料版ユーザーに送信されています。</p>
          <p>配信停止: <a href="https://cryptotradeacademy.io/unsubscribe?email=${encodeURIComponent(userEmail)}">こちら</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendResendEmail({
    to: userEmail,
    subject: emailSubject,
    html: emailHTML,
    tags: ['freemium-conversion', `trigger-${trigger.type}`],
  });
}

/**
 * ユーザーの転換確率を計算
 */
function calculateConversionProbability(userData, marketData) {
  let score = 0;

  // 使用頻度
  if (userData.loginCount >= 10) score += 20;
  else if (userData.loginCount >= 5) score += 10;

  // エンゲージメント
  if (userData.articleViews >= 20) score += 20;
  else if (userData.articleViews >= 10) score += 10;

  // 市場の重要度
  if (marketData.trapScore >= 7) score += 30;
  else if (marketData.trapScore >= 5) score += 15;

  // 価格変動の大きさ
  if (Math.abs(marketData.change24h) >= 5) score += 20;
  else if (Math.abs(marketData.change24h) >= 3) score += 10;

  // 登録からの経過日数
  const daysSinceSignup = Math.floor((Date.now() - new Date(userData.signupDate).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceSignup >= 14) score += 10;
  else if (daysSinceSignup >= 7) score += 5;

  return Math.min(score, 100); // 最大100%
}

/**
 * 転換戦略を実行
 */
async function executeConversionStrategy(userEmail, userData, currentMarketData) {
  // 転換確率を計算
  const conversionProbability = calculateConversionProbability(userData, currentMarketData);

  // 転換確率が50%以上の場合のみナッジを送信（スパム防止）
  if (conversionProbability < 50) {
    return { sent: false, reason: 'low_probability', probability: conversionProbability };
  }

  // トリガーをチェック
  const triggers = checkConversionTriggers(userData, currentMarketData);

  if (triggers.length === 0) {
    return { sent: false, reason: 'no_triggers', probability: conversionProbability };
  }

  // 最も重要度の高いトリガーを選択
  const highPriorityTriggers = triggers.filter(t => t.severity === 'high');
  const selectedTrigger = highPriorityTriggers.length > 0 
    ? highPriorityTriggers[0] 
    : triggers[0];

  // ナッジ通知を送信
  await sendNudgeNotification(userEmail, selectedTrigger, userData);

  // 送信履歴を記録
  return {
    sent: true,
    trigger: selectedTrigger.type,
    probability: conversionProbability,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  checkConversionTriggers,
  sendNudgeNotification,
  calculateConversionProbability,
  executeConversionStrategy,
};
