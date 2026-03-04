/**
 * 10カ国×3レイヤー＝30パターン：短文スカウト文面（200通爆撃用）
 * 末尾に [Affiliate Link] と [実績スクショ画像] をセットで送る想定。
 * GET /api/telegram-scout-message?template30=1&lang=ja&category=Admin で取得。
 */
const SCOUT_30_BY_MARKET = {
  jp: {
    Admin: "「$1.4M実績のAI分析を貴方のグループに。日本公式パートナーとして1日4回のクジラ分析を自動提供しませんか？収益50%シェア可能です。」",
    KOL: "「貴方の発信に『AIクジラ分析』を添えませんか？フォロワーの満足度を高めつつ、継続報酬50%を構築できます。実績画像添付します。」",
    ActiveMember: "「まだ手動で分析してる？$1.4M稼いだAIが、1日4回クジラの動きを日本語で教えるよ。50%報酬のアフィ募集。詳細はこちら。」"
  },
  ko: {
    Admin: "$1.4M 수익 증명. 귀하의 커뮤니티에 'AI 고래 분석'을 도입하세요. 한국어 지원, 수익 50% 쉐어. 독점 파트너를 찾습니다.",
    KOL: "귀하의 채널 가치를 높여줄 AI 분석 툴입니다. 매일 4회 한국어 고래 리포트 제공. 50% 리커링 수익을 확인하세요.",
    ActiveMember: "아직도 혼자 매매하시나요? $1.4M 검증된 AI가 매일 4번 타점을 알려드립니다. 파트너 등록 시 50% 커미션 지급!"
  },
  vn: {
    Admin: "Hợp tác Admin: Hệ thống AI phân tích cá voi ($1.4M Profit). Cung cấp 4 bản tin tiếng Việt/ngày. Chia sẻ 50% lợi nhuận.",
    KOL: "Nâng tầm thương hiệu của bạn với dữ liệu AI Whale Intent. Nhận ngay 50% hoa hồng trọn đời. Xem bằng chứng thu nhập đính kèm.",
    ActiveMember: "Công cụ AI kiếm $1.4M đã có tiếng Việt! Nhận tin hiệu cá voi 4 lần/ngày. Đăng ký làm đại lý hưởng 50% hoa hồng ngay."
  },
  in: {
    Admin: "Scale your group with our $1.4M proven AI Whale Tracker. 4x daily updates. 50% revenue share for top Indian admins.",
    KOL: "Boost your engagement with AI-powered Whale Analysis. High-converting $1.4M proof inside. Join us for 50% recurring commission.",
    ActiveMember: "Stop guessing. Follow the Whales with our AI ($1.4M verified). Join our affiliate program and earn 50% USDT per sale!"
  },
  ar: {
    Admin: "شراكة حصرية: نظام ذكاء اصطناعي لتحليل الحيتان (أرباح 1.4M$). 4 تقارير يومية بالعربية. عمولة 50% للأدمن.",
    KOL: "عزز محتواك ببيانات 'Whale Intent'. أداة احترافية بالعربية مع عمولة 50%. شاهد إثبات الدفع المرفق.",
    ActiveMember: "اربح مع أقوى بوت ذكاء اصطناعي (أرباح 1.4M$). تقارير يومية بالعربية وعمولة 50% لكل بيع. انضم الآن."
  },
  ng: {
    Admin: "Highest converting AI tool for your community. $1.4M payout proof. 50% recurring deals for Nigeria's top admins.",
    KOL: "Partner with the best. $1.4M verified AI data for your followers. 4 updates daily. 50% commission. Let's work!",
    ActiveMember: "Make USDT daily with our $1.4M AI Whale system. 50% affiliate commission. Easy money, proven results. Join here!"
  },
  br: {
    Admin: "Parceria VIP: IA de análise de Baleias ($1.4M comprovados). 4 relatórios em português/dia. 50% de comissão recorrente.",
    KOL: "Melhore seus sinais com dados de IA. $1.4M de faturamento. Ofereça valor e ganhe 50% de comissão vitalícia.",
    ActiveMember: "Ganhe em dólar (USDT) com nossa IA de Baleias. $1.4M pagos aos afiliados. 50% de comissão. Cadastre-se agora!"
  },
  latam: {
    Admin: "Automatiza tu grupo con IA (Récord $1.4M). 4 reportes diarios en español. Buscamos socios exclusivos: 50% comisión.",
    KOL: "Aumenta tus conversiones con datos de Ballenas. IA probada con $1.4M de éxito. 50% de ganancia recurrente para ti.",
    ActiveMember: "¡Gana USDT con la IA que factura $1.4M! Análisis de ballenas 4 veces al día en español. 50% de comisión para afiliados."
  },
  es: {
    Admin: "Propuesta profesional: Análisis de IA para inversores ($1.4M proof). Servicio premium en español. 50% Revenue Share.",
    KOL: "Diferencia tu marca con métricas 'Whale Intent'. Herramienta de alta gama y 50% de comisión vitalícia. Mira el adjunto.",
    ActiveMember: "La mejor IA de trading ya habla español. $1.4M pagados. Únete como afiliado y llévate el 50% de cada venta."
  },
  sea: {
    Admin: "Boost your member retention with $1.4M proven AI signals. 4 daily local updates. 50% profit sharing for partners.",
    KOL: "High-tier Whale data for your community. $1.4M income proof included. Earn 50% recurring passive income with us.",
    ActiveMember: "Earn 50% commission selling the best AI Whale tool. $1.4M already paid out. Daily signals. Sign up here!"
  }
};

/** 言語コード → デフォルト市場（template30 用） */
const LANG_TO_MARKET = {
  ja: "jp",
  ko: "ko",
  vi: "vn",
  en: "in",
  ar: "ar",
  pt: "br",
  es: "latam",
  hi: "in",
  id: "sea",
  th: "sea"
};

/**
 * 30パターンから1件取得。lang + category 必須。market で上書き可（en→in/ng/sea など）。
 * @param {string} lang - 言語コード (ja, ko, vi, en, ar, pt, es, hi, id, th)
 * @param {string} category - Admin | KOL | ActiveMember
 * @param {string} [market] - jp, ko, vn, in, ar, ng, br, latam, es, sea（省略時は lang から推論）
 */
function getScout30Message(lang, category, market) {
  const m = (market && SCOUT_30_BY_MARKET[market]) ? market : (LANG_TO_MARKET[lang] || "in");
  const templates = SCOUT_30_BY_MARKET[m];
  if (!templates) return null;
  const key = category === "ActiveMember" ? "ActiveMember" : category === "KOL" ? "KOL" : "Admin";
  return templates[key] || null;
}

module.exports = {
  SCOUT_30_BY_MARKET,
  LANG_TO_MARKET,
  getScout30Message
};
