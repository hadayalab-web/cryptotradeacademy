// 無料ミニ마ム版Telegram配信用のテキ스트フォーマット関数
// services/telegram/messages/user/ko/minimal.ko.js
// Trap Score表示のみ（詳細分析なし）

/**
 * Trap Score의 설명을 가져오기
 */
function getTrapScoreDescription(trapScore) {
  if (trapScore == null || trapScore === undefined) {
    return 'Trap Score를 계산 중입니다. 잠시 후 다시 확인해 주세요.';
  }
  
  const score = Number(trapScore);
  if (isNaN(score)) {
    return 'Trap Score를 계산 중입니다. 잠시 후 다시 확인해 주세요.';
  }

  if (score >= 70) {
    return '⚠️ 높은 리스크: 시장 트랩 가능성이 높은 신호가 감지되었습니다. 극도의 주의가 필요합니다.';
  } else if (score >= 50) {
    return '⚡ 중간 리스크: 일부 트랩 지표가 감지되었습니다. 경계를 늦추지 마세요.';
  } else if (score >= 30) {
    return '✅ 낮은 리스크: 트랩 지표가 최소한입니다. 시장 상황이 상대적으로 안전해 보입니다.';
  } else {
    return '✅ 매우 낮은 리스크: 트랩 지표가 거의 감지되지 않았습니다. 시장 상황이 안전해 보입니다.';
  }
}

/**
 * 無料ミニマム版のTelegramメッセージを生成
 * Trap Score表示のみ（詳細分析なし）
 * 
 * @param {Object} options - 메시지 생성 옵션
 * @param {Date} options.now - 현재 시간
 * @param {number|null} options.trapScore - Trap Score (0-100)
 * @param {number|null} options.priceUsd - BTC 가격（USD）
 * @param {number|null} options.change24h - 24시간 변동률（%）
 * @param {string} options.lang - 언어 코드（기본값: 'ko'）
 * @returns {string} Telegram 메시지 문자열
 */
function formatMinimalBriefing({
  now = new Date(),
  trapScore = null,
  priceUsd = null,
  change24h = null,
  lang = 'ko',
} = {}) {
  const ts = now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  
  const scoreDisplay = trapScore != null ? Math.round(Number(trapScore)) : 'N/A';
  const scoreDescription = getTrapScoreDescription(trapScore);
  
  const priceLine = priceUsd != null && change24h != null
    ? `💰 BTC 가격: $${priceUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} (${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}% / 24h)`
    : '💰 BTC 가격: 가져오는 중...';

  return `🌤️ Trap Defence BTC - 무료 미니멈 리포트
📅 ${ts}

🎯 오늘의 Trap Score
${scoreDisplay}/100

${scoreDescription}

${priceLine}

🔒 이유를 알고 싶으신가요?

이 Trap Score 뒤에 있는 상세 분석에는 다음이 포함됩니다:
• 왜 AVOID_LONG 또는 AVOID_SHORT인가?
• 상세한 온체인 데이터 분석
• 멘탈 트레이닝 가이드
• Dr. Grok의 심리적 지원

🚀 전체 액세스로 업그레이드
월 $69부터 • 언제든지 취소 가능

이것은 무료 미니멈 리포트입니다. 상세 분석과 트랩 알림을 위해서는 Trap Defence BTC로 업그레이드하세요.

교육 목적으로만 제공됩니다. 금융 조언이 아닙니다.`.trim();
}

module.exports = { formatMinimalBriefing };
