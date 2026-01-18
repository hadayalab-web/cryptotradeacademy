const { createCanvas, registerFont } = require('canvas');
const path = require('path');

// フォントの登録（システムフォントを使用するか、必要に応じてプロジェクトに追加）
// ここではデフォルトのsans-serifを使用するため、明示的な登録はスキップ可能ですが、
// 将来的にカスタムフォントを使う場合はここでregisterFontを使用します。

/**
 * Trap Scoreに基づいてソーシャルメディア用カード画像を生成する
 * サイズ: 1200x675 (Twitter推奨サイズ)
 * 
 * @param {Object} data - データオブジェクト
 * @param {number} data.trapScore - Trap Score (0-100)
 * @param {string} data.riskLevel - 'HIGH', 'MODERATE', 'LOW'
 * @param {string} data.trapType - トラップの種類（例: 'WHALE_TRAP', 'None'）
 * @param {string} data.date - 日付文字列
 * @returns {Buffer} PNG画像のバッファ
 */
async function generateTrapScoreCard(data) {
  const width = 1200;
  const height = 675;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const { trapScore, riskLevel, trapType, date } = data;

  // カラーパレット定義
  const colors = {
    high: { bg: '#1a0505', accent: '#ff3333', text: '#ffffff' }, // 赤基調
    moderate: { bg: '#1a1a05', accent: '#ffcc00', text: '#ffffff' }, // 黄色基調
    low: { bg: '#051a05', accent: '#33ff33', text: '#ffffff' }, // 緑基調
    neutral: { bg: '#0a0a0a', accent: '#33ccff', text: '#ffffff' } // 青基調
  };

  // リスクレベル判定
  let theme = colors.neutral;
  if (riskLevel.includes('HIGH')) theme = colors.high;
  else if (riskLevel.includes('MODERATE')) theme = colors.moderate;
  else if (riskLevel.includes('LOW')) theme = colors.low;

  // 1. 背景描画
  // グラデーション作成
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#000000');
  gradient.addColorStop(1, theme.bg);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // アクセントライン（上部）
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, 0, width, 10);

  // 2. テキスト描画設定
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.text;

  // 3. タイトル
  ctx.font = 'bold 40px Arial';
  ctx.fillText('TRAP DEFENSE INTELLIGENCE', width / 2, 80);

  // 4. メインスコア (円形ゲージ風の装飾)
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 180;

  // 外枠リング
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 20;
  ctx.stroke();

  // スコアリング（進捗）
  // 0度を12時の位置にするため -Math.PI/2 から開始
  // スコア(0-100)を角度に変換
  const endAngle = (trapScore / 100) * 2 * Math.PI - Math.PI / 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, endAngle);
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.stroke();

  // スコア数値
  ctx.font = 'bold 160px Arial';
  ctx.fillText(Math.round(trapScore).toString(), centerX, centerY + 10);

  // スコアラベル
  ctx.font = '30px Arial';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText('TRAP SCORE', centerX, centerY - 100);

  // 5. リスクレベル表示 (下部)
  ctx.font = 'bold 60px Arial';
  ctx.fillStyle = theme.accent;
  ctx.fillText(riskLevel + ' RISK', centerX, centerY + 120);

  // 6. トラップタイプ検出バッジ (もし検出されていれば)
  if (trapType && trapType !== 'None' && trapType !== 'Unknown') {
    const badgeY = centerY + 220;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    
    // テキスト幅計測
    ctx.font = 'bold 30px Arial';
    const textMetrics = ctx.measureText(`DETECTED: ${trapType}`);
    const badgeWidth = textMetrics.width + 60;
    const badgeHeight = 60;
    
    // バッジ背景
    ctx.roundRect(centerX - badgeWidth / 2, badgeY - badgeHeight / 2, badgeWidth, badgeHeight, 30);
    ctx.fill();
    
    // バッジテキスト
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`DETECTED: ${trapType}`, centerX, badgeY);
  }

  // 7. フッター (日付とURL)
  ctx.font = '24px Arial';
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'left';
  ctx.fillText(date, 50, height - 40);
  
  ctx.textAlign = 'right';
  ctx.fillText('cryptotradeacademy.io', width - 50, height - 40);

  // バッファとして返す
  return canvas.toBuffer('image/png');
}

module.exports = {
  generateTrapScoreCard
};
