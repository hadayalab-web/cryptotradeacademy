// services/telegram/benefitBlock.js
// Benefit / Action / Why を必ず冒頭に出して、ユーザーベネフィットを1秒で伝える

function safeNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickTrapScore(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  // 参照元の揺れに耐える
  const fromCqDeep = safeNum(snapshot?.cqDeep?.trapScore);
  if (fromCqDeep != null) return fromCqDeep;
  const fromTrap = safeNum(snapshot?.trapDetection?.trapScore);
  if (fromTrap != null) return fromTrap;
  const fromMarket = safeNum(snapshot?.market_score?.trapScore);
  if (fromMarket != null) return fromMarket;
  return null;
}

function normalizeLang(lang) {
  const l = String(lang || "en").toLowerCase().replace(/_/g, "-");
  if (l === "pt") return "pt-br";
  return ["en", "ja", "es", "ko", "pt-br", "ar"].includes(l) ? l : "en";
}

const I18N = {
  en: {
    benefit: "Benefit",
    action: "Action",
    why: "Why",
    benefitRegular: "Avoid traps and protect capital with a clear market structure view.",
    benefitMinimal: "Get a fast pulse to avoid obvious traps before you trade.",
    benefitKiba: "Get early warning when short-term reversal risk rises.",
    actionGeneric: "Follow the message’s guidance. If unclear, default to waiting.",
    whyTrap: (score) => `Trap Score: ${score}/100`
  },
  ja: {
    benefit: "ベネフィット",
    action: "アクション",
    why: "理由",
    benefitRegular: "構造の見える化でトラップ回避・資金防衛の精度を上げます。",
    benefitMinimal: "短時間のパルスで、明確なトラップを踏む前に回避できます。",
    benefitKiba: "短期の転換リスクが高まった瞬間に先回りできます。",
    actionGeneric: "本文の指示に従ってください。不明なら「待つ」が基本です。",
    whyTrap: (score) => `Trap Score: ${score}/100`
  },
  es: {
    benefit: "Beneficio",
    action: "Acción",
    why: "Por qué",
    benefitRegular: "Evita trampas y protege capital con una lectura estructural clara.",
    benefitMinimal: "Pulso rápido para evitar trampas obvias antes de operar.",
    benefitKiba: "Aviso temprano cuando sube el riesgo de reversión a corto plazo.",
    actionGeneric: "Sigue la guía del mensaje. Si no está claro, espera.",
    whyTrap: (score) => `Trap Score: ${score}/100`
  },
  "pt-br": {
    benefit: "Benefício",
    action: "Ação",
    why: "Por quê",
    benefitRegular: "Evite armadilhas e proteja o capital com uma leitura estrutural clara.",
    benefitMinimal: "Pulso rápido para evitar armadilhas óbvias antes de operar.",
    benefitKiba: "Alerta antecipado quando o risco de reversão de curto prazo aumenta.",
    actionGeneric: "Siga a orientação do texto. Se não estiver claro, espere.",
    whyTrap: (score) => `Trap Score: ${score}/100`
  },
  ko: {
    benefit: "베네핏",
    action: "액션",
    why: "근거",
    benefitRegular: "구조를 명확히 보여줘 트랩을 피하고 자본을 보호합니다.",
    benefitMinimal: "빠른 펄스로 명확한 트랩을 피하고 들어가세요.",
    benefitKiba: "단기 전환 리스크가 커질 때 조기 경보를 받습니다.",
    actionGeneric: "본문 가이드를 따르세요. 애매하면 대기하세요.",
    whyTrap: (score) => `Trap Score: ${score}/100`
  },
  ar: {
    benefit: "الفائدة",
    action: "الإجراء",
    why: "السبب",
    benefitRegular: "تجنّب الفخاخ واحمِ رأس المال عبر قراءة هيكلية واضحة.",
    benefitMinimal: "نبضة سريعة لتفادي الفخاخ الواضحة قبل الدخول.",
    benefitKiba: "إنذار مبكر عند ارتفاع مخاطر الانعكاس قصير الأمد.",
    actionGeneric: "اتبع إرشادات الرسالة. إذا لم يتضح، انتظر.",
    whyTrap: (score) => `Trap Score: ${score}/100`
  }
};

function buildBenefitBlock({ kind, lang, snapshot, actionText, whyText } = {}) {
  const l = normalizeLang(lang);
  const t = I18N[l] || I18N.en;
  const k = String(kind || "regular").toLowerCase();
  const benefit =
    k === "minimal"
      ? t.benefitMinimal
      : k === "kiba"
        ? t.benefitKiba
        : t.benefitRegular;

  const action = actionText || t.actionGeneric;

  const trapScore = pickTrapScore(snapshot);
  const why = whyText || (trapScore != null ? t.whyTrap(Math.round(trapScore)) : null);

  const lines = [
    `*${t.benefit}:* ${benefit}`,
    `*${t.action}:* ${action}`,
    why ? `*${t.why}:* ${why}` : null,
    "───"
  ].filter(Boolean);
  return lines.join("\n");
}

function injectBenefitBlock(messageText, blockText) {
  const msg = String(messageText || "").trim();
  const block = String(blockText || "").trim();
  if (!block) return msg;
  if (!msg) return block;
  return `${block}\n${msg}`;
}

module.exports = {
  buildBenefitBlock,
  injectBenefitBlock
};

