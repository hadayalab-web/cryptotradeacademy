// services/lead-discovery/keywordMonitor.js
// Cryptoキーワード監視システム（6言語対応、200種キーワード）

const SUPPORTED_LANGS = ['en', 'es', 'pt-br', 'ar', 'ja', 'ko'];

/**
 * Cryptoキーワードリスト（6言語対応）
 * BTC損失、ハック被害、FOMO関連のキーワードを網羅
 */
const CRYPTO_KEYWORDS = {
  en: [
    // BTC損失関連
    'BTC loss', 'bitcoin loss', 'lost bitcoin', 'BTC stolen', 'bitcoin stolen',
    'BTC hack', 'bitcoin hack', 'wallet hack', 'wallet lost', 'wallet stolen',
    'lost my BTC', 'lost my bitcoin', 'BTC gone', 'bitcoin gone',
    'BTC scam', 'bitcoin scam', 'BTC fraud', 'bitcoin fraud',
    // ハック被害関連
    'hacked wallet', 'wallet hacked', 'exchange hack', 'exchange hacked',
    'got hacked', 'was hacked', 'hack attack', 'security breach',
    'private key stolen', 'seed phrase lost', 'recovery phrase lost',
    // FOMO/恐怖関連
    'fear of losing', 'afraid to lose', 'scared to trade', 'trading fear',
    'stop loss', 'avoid loss', 'prevent loss', 'protect my BTC',
    'trap defence', 'trap defense', 'avoid trap', 'market trap',
    // トレーダー関連
    'BTC trader', 'bitcoin trader', 'crypto trader', 'trading BTC',
    'lost money trading', 'trading loss', 'bad trade', 'wrong trade',
    'trapped in trade', 'stuck in trade', 'can\'t exit', 'forced to hold',
  ],
  es: [
    // BTC損失関連
    'pérdida de BTC', 'pérdida de bitcoin', 'BTC perdido', 'bitcoin perdido',
    'BTC robado', 'bitcoin robado', 'BTC hackeado', 'bitcoin hackeado',
    'billetera hackeada', 'billetera perdida', 'billetera robada',
    'perdí mi BTC', 'perdí mi bitcoin', 'BTC desapareció',
    // ハック被害関連
    'hackeado', 'fue hackeado', 'ataque de hack', 'brecha de seguridad',
    'clave privada robada', 'frase semilla perdida', 'frase de recuperación perdida',
    // FOMO/恐怖関連
    'miedo a perder', 'tengo miedo', 'asustado de operar', 'miedo al trading',
    'stop loss', 'evitar pérdidas', 'prevenir pérdidas', 'proteger mi BTC',
    'defensa de trampas', 'evitar trampas', 'trampa del mercado',
    // トレーダー関連
    'trader de BTC', 'trader de bitcoin', 'trader de cripto', 'operando BTC',
    'perdí dinero operando', 'pérdida en trading', 'mala operación', 'operación incorrecta',
    'atrapado en operación', 'no puedo salir', 'obligado a mantener',
  ],
  'pt-br': [
    // BTC損失関連
    'perda de BTC', 'perda de bitcoin', 'BTC perdido', 'bitcoin perdido',
    'BTC roubado', 'bitcoin roubado', 'BTC hackeado', 'bitcoin hackeado',
    'carteira hackeada', 'carteira perdida', 'carteira roubada',
    'perdi meu BTC', 'perdi meu bitcoin', 'BTC desapareceu',
    // ハック被害関連
    'hackeado', 'foi hackeado', 'ataque de hack', 'brecha de segurança',
    'chave privada roubada', 'frase seed perdida', 'frase de recuperação perdida',
    // FOMO/恐怖関連
    'medo de perder', 'tenho medo', 'com medo de negociar', 'medo de trading',
    'stop loss', 'evitar perdas', 'prevenir perdas', 'proteger meu BTC',
    'defesa de armadilhas', 'evitar armadilhas', 'armadilha do mercado',
    // トレーダー関連
    'trader de BTC', 'trader de bitcoin', 'trader de cripto', 'negociando BTC',
    'perdi dinheiro negociando', 'perda em trading', 'má negociação', 'negociação errada',
    'preso em negociação', 'não consigo sair', 'obrigado a manter',
  ],
  ar: [
    // BTC損失関連
    'خسارة BTC', 'خسارة البيتكوين', 'BTC مفقود', 'بيتكوين مفقود',
    'BTC مسروق', 'بيتكوين مسروق', 'BTC مخترق', 'بيتكوين مخترق',
    'محفظة مخترقة', 'محفظة مفقودة', 'محفظة مسروقة',
    'فقدت BTC', 'فقدت البيتكوين', 'BTC اختفى',
    // ハック被害関連
    'تم الاختراق', 'تعرض للاختراق', 'هجوم اختراق', 'خرق أمني',
    'المفتاح الخاص مسروق', 'عبارة الاسترداد مفقودة',
    // FOMO/恐怖関連
    'الخوف من الخسارة', 'أخاف', 'خائف من التداول', 'خوف من التداول',
    'وقف الخسارة', 'تجنب الخسائر', 'منع الخسائر', 'حماية BTC',
    'الدفاع عن الفخاخ', 'تجنب الفخاخ', 'فخ السوق',
    // トレーダー関連
    'متداول BTC', 'متداول بيتكوين', 'متداول كريبتو', 'تداول BTC',
    'خسرت المال في التداول', 'خسارة في التداول', 'صفقة سيئة', 'صفقة خاطئة',
    'محاصر في الصفقة', 'لا أستطيع الخروج', 'مضطر للاحتفاظ',
  ],
  ja: [
    // BTC損失関連
    'BTC損失', 'ビットコイン損失', 'BTC紛失', 'ビットコイン紛失',
    'BTC盗難', 'ビットコイン盗難', 'BTCハック', 'ビットコインハック',
    'ウォレットハック', 'ウォレット紛失', 'ウォレット盗難',
    'BTCを失った', 'ビットコインを失った', 'BTCが消えた',
    // ハック被害関連
    'ハックされた', 'ハッキングされた', 'ハッキング攻撃', 'セキュリティ侵害',
    '秘密鍵盗難', 'シードフレーズ紛失', 'リカバリーフレーズ紛失',
    // FOMO/恐怖関連
    '損失への恐怖', '怖い', '取引が怖い', '取引への恐怖',
    '損切り', '損失回避', '損失防止', 'BTC保護',
    'トラップ防御', 'トラップ回避', '市場のトラップ',
    // トレーダー関連
    'BTCトレーダー', 'ビットコイントレーダー', '暗号通貨トレーダー', 'BTC取引',
    '取引で損した', '取引損失', '悪い取引', '間違った取引',
    '取引に閉じ込められた', '出られない', '保持を余儀なくされた',
  ],
  ko: [
    // BTC損失関連
    'BTC 손실', '비트코인 손실', 'BTC 분실', '비트코인 분실',
    'BTC 도난', '비트코인 도난', 'BTC 해킹', '비트코인 해킹',
    '지갑 해킹', '지갑 분실', '지갑 도난',
    'BTC를 잃었다', '비트코인을 잃었다', 'BTC가 사라졌다',
    // ハック被害関連
    '해킹당함', '해킹되었음', '해킹 공격', '보안 침해',
    '개인키 도난', '시드 구문 분실', '복구 구문 분실',
    // FOMO/恐怖関連
    '손실에 대한 공포', '두렵다', '거래가 두렵다', '거래에 대한 공포',
    '손절', '손실 회피', '손실 방지', 'BTC 보호',
    '트랩 방어', '트랩 회피', '시장의 트랩',
    // トレーダー関連
    'BTC 트레이더', '비트코인 트레이더', '암호화폐 트레이더', 'BTC 거래',
    '거래로 손해', '거래 손실', '나쁜 거래', '잘못된 거래',
    '거래에 갇힘', '나갈 수 없음', '보유를 강요받음',
  ],
};

/**
 * ドンピシャリード判定用キーワード（損失・恐怖関連）
 */
const HIGH_PRIORITY_KEYWORDS = {
  en: ['lost', 'stolen', 'hack', 'scam', 'fraud', 'fear', 'afraid', 'scared', 'trap'],
  es: ['perdido', 'robado', 'hack', 'estafa', 'fraude', 'miedo', 'asustado', 'trampa'],
  'pt-br': ['perdido', 'roubado', 'hack', 'golpe', 'fraude', 'medo', 'assustado', 'armadilha'],
  ar: ['مفقود', 'مسروق', 'اختراق', 'احتيال', 'خوف', 'خائف', 'فخ'],
  ja: ['失った', '盗難', 'ハック', '詐欺', '恐怖', '怖い', 'トラップ'],
  ko: ['잃었다', '도난', '해킹', '사기', '공포', '두렵다', '트랩'],
};

/**
 * 言語を正規化
 */
function normalizeLang(lang) {
  if (!lang) return 'en';
  const normalized = String(lang).trim().toLowerCase().split('.')[0].replace('_', '-');
  if (normalized === 'jp') return 'ja';
  if (normalized === 'kr') return 'ko';
  if (normalized === 'pt' || normalized === 'ptbr') return 'pt-br';
  if (SUPPORTED_LANGS.includes(normalized)) return normalized;
  return 'en';
}

/**
 * テキストからキーワードを検出
 * @param {string} text - 検索対象テキスト
 * @param {string} lang - 言語コード
 * @returns {Object} 検出結果 {matched: boolean, keywords: string[], priority: 'high'|'medium'|'low'}
 */
function detectKeywords(text, lang = 'en') {
  if (!text) return { matched: false, keywords: [], priority: 'low' };
  
  const normalizedLang = normalizeLang(lang);
  const keywords = CRYPTO_KEYWORDS[normalizedLang] || CRYPTO_KEYWORDS.en;
  const highPriorityKeywords = HIGH_PRIORITY_KEYWORDS[normalizedLang] || HIGH_PRIORITY_KEYWORDS.en;
  
  const textLower = text.toLowerCase();
  const matchedKeywords = [];
  let hasHighPriority = false;
  
  // キーワードマッチング
  for (const keyword of keywords) {
    if (textLower.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      if (highPriorityKeywords.some(hp => keyword.toLowerCase().includes(hp))) {
        hasHighPriority = true;
      }
    }
  }
  
  // 優先度判定
  let priority = 'low';
  if (hasHighPriority || matchedKeywords.length >= 3) {
    priority = 'high';
  } else if (matchedKeywords.length >= 1) {
    priority = 'medium';
  }
  
  return {
    matched: matchedKeywords.length > 0,
    keywords: matchedKeywords,
    priority,
    lang: normalizedLang,
  };
}

/**
 * リード品質スコアを計算（0-1.0）
 * @param {Object} detectionResult - detectKeywordsの結果
 * @param {Object} userData - ユーザーデータ（エンゲージメント率など）
 * @returns {number} スコア（0-1.0）
 */
function calculateLeadScore(detectionResult, userData = {}) {
  if (!detectionResult.matched) return 0;
  
  let score = 0;
  
  // キーワードマッチングスコア
  if (detectionResult.priority === 'high') {
    score += 0.5;
  } else if (detectionResult.priority === 'medium') {
    score += 0.3;
  } else {
    score += 0.1;
  }
  
  // マッチしたキーワード数
  score += Math.min(detectionResult.keywords.length * 0.1, 0.3);
  
  // ユーザーエンゲージメント（あれば）
  if (userData.engagementRate) {
    score += Math.min(userData.engagementRate * 0.2, 0.2);
  }
  
  return Math.min(score, 1.0);
}

/**
 * ドンピシャリード判定（スコア0.8以上）
 * @param {Object} detectionResult - detectKeywordsの結果
 * @param {Object} userData - ユーザーデータ
 * @returns {boolean}
 */
function isPerfectMatch(detectionResult, userData = {}) {
  const score = calculateLeadScore(detectionResult, userData);
  return score >= 0.8;
}

module.exports = {
  CRYPTO_KEYWORDS,
  HIGH_PRIORITY_KEYWORDS,
  detectKeywords,
  calculateLeadScore,
  isPerfectMatch,
  normalizeLang,
  SUPPORTED_LANGS,
};
