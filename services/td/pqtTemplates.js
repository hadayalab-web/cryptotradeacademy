/**
 * PQT 本文テンプレート
 * - 6言語 × 8バリアント
 * - 口語トーン / 防衛・教育軸
 * - 損失回避 + ツァイガルニク + 問題解決（固定行動指針）
 */

const CTA_BY_LANG = {
  en: {
    vidalytics_regular: ["Check the structure first", "See the full map", "Review the full breakdown"],
    vidalytics_leadmagnet: ["Get the free check first", "Check this first", "Start with the free map"],
    whop_regular: ["Use this as your decision guide", "See the full briefing", "Open the detailed page"],
    whop_minimal: ["Check the quick version first", "See the concise summary", "Review this first"],
    fallback: ["Check this first"]
  },
  ja: {
    vidalytics_regular: ["構造を確認", "全体像を見ておく", "詳細を確認"],
    vidalytics_leadmagnet: ["無料で確認", "先にチェック", "まず無料版で確認"],
    whop_regular: ["判断材料はこちら", "内容を見る", "詳細ページで確認"],
    whop_minimal: ["要点版を先に確認", "短くまとめた内容を見る", "先に確認"],
    fallback: ["先にチェック"]
  },
  es: {
    vidalytics_regular: ["Revisar la estructura", "Ver el panorama completo", "Ver el desglose detallado"],
    vidalytics_leadmagnet: ["Revisarlo gratis primero", "Verificar primero", "Empezar con la versión gratuita"],
    whop_regular: ["Usar esto como guía de decisión", "Ver el contenido completo", "Abrir la página detallada"],
    whop_minimal: ["Ver la versión corta primero", "Ver el resumen breve", "Revisar primero"],
    fallback: ["Verificar primero"]
  },
  pt: {
    vidalytics_regular: ["Revisar a estrutura", "Ver a visão completa", "Ver a análise detalhada"],
    vidalytics_leadmagnet: ["Conferir grátis primeiro", "Conferir antes", "Começar pela versão gratuita"],
    whop_regular: ["Usar isto como guia de decisão", "Ver o conteúdo completo", "Abrir a página detalhada"],
    whop_minimal: ["Ver a versão curta primeiro", "Ver o resumo curto", "Conferir antes"],
    fallback: ["Conferir antes"]
  },
  ar: {
    vidalytics_regular: ["راجع البنية", "اطلع على الصورة الكاملة", "راجع التفاصيل الكاملة"],
    vidalytics_leadmagnet: ["تحقق مجانا اولا", "تحقق اولا", "ابدأ بالنسخة المجانية"],
    whop_regular: ["استخدم هذا كدليل قرار", "شاهد المحتوى الكامل", "افتح الصفحة التفصيلية"],
    whop_minimal: ["راجع النسخة المختصرة اولا", "شاهد الملخص القصير", "تحقق اولا"],
    fallback: ["تحقق اولا"]
  },
  ko: {
    vidalytics_regular: ["구조 확인", "전체 흐름 보기", "상세 분석 확인"],
    vidalytics_leadmagnet: ["무료로 먼저 확인", "먼저 체크", "무료 버전부터 보기"],
    whop_regular: ["판단 자료 확인", "전체 내용 보기", "상세 페이지 열기"],
    whop_minimal: ["요약본 먼저 확인", "짧은 요약 보기", "먼저 확인"],
    fallback: ["먼저 체크"]
  }
};

const ACTION_GUIDANCE = {
  en: "Pause → Verify → Act only when conditions align",
  ja: "止まる → 確認 → 条件一致で行動",
  es: "Pausa → Verifica → Actúa solo cuando las condiciones coincidan",
  pt: "Pare → Confira → Aja só quando as condições coincidirem",
  ar: "توقف → تحقق → تحرك فقط عند تطابق الشروط",
  ko: "멈춤 → 확인 → 조건 일치 시 행동"
};

/** 有料導線リプライ用：50%オフ・クーポンコードの案内（DEFEND50 の意味が伝わるように） */
const PROMO_LINE_BY_LANG = {
  en: " 50% off with code DEFEND50",
  ja: " 50%オフ: コード DEFEND50",
  es: " 50% dto con código DEFEND50",
  pt: " 50% off com código DEFEND50",
  ar: " خصم 50% برمز DEFEND50",
  ko: " 50% 할인 코드 DEFEND50"
};

function normalizeLangKey(lang) {
  const key = String(lang || "en").toLowerCase();
  if (key === "pt-br") return "pt";
  return key;
}

function getPromoLine(lang) {
  const langKey = normalizeLangKey(lang);
  return PROMO_LINE_BY_LANG[langKey] || PROMO_LINE_BY_LANG.en;
}

function resolveCta(lang, funnelType, index = 0) {
  const langKey = normalizeLangKey(lang);
  const source = CTA_BY_LANG[langKey] || CTA_BY_LANG.en;
  const pool = source[funnelType] || source.fallback || CTA_BY_LANG.en.fallback;
  return pool[Math.abs(index) % pool.length];
}

function actionLine(lang) {
  const langKey = normalizeLangKey(lang);
  return ACTION_GUIDANCE[langKey] || ACTION_GUIDANCE.en;
}

const PQT_TEMPLATES = {
  en: [
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("en", funnelType, 0);
      return `This ${coin} move feels fast, and that usually pushes decisions forward.
When speed rises like this, the flow can flip quietly before most people notice.

If you chase now without structure, losses can stack before you understand why.

${proofSnippet}

There is one turning point most people still miss.
${actionLine("en")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("en", funnelType, 1);
      return `When numbers jump, that rush in your body is normal.
In this phase, momentum often hides where ${coin} is likely to slow down.

One rushed entry here can erase several calm sessions.

${proofSnippet}

Are you checking the slowdown zone before acting?
${actionLine("en")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("en", funnelType, 2);
      return `${coin} can look clean on the surface, but this is where traps often stay invisible.
The stronger the impulse feels, the more carefully timing should be verified.

Skipping that check usually leaves avoidable drawdown.

${proofSnippet}

There is one small confirmation point left.
${actionLine("en")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("en", funnelType, 0);
      return `No hype needed here.
The real edge is knowing where this ${coin} move can lose support.

Without that map, decisions drift and losses feel random.

${proofSnippet}

One missing piece can stabilize the whole decision process.
${actionLine("en")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("en", funnelType, 1);
      return `You do not need more noise right now.
You need a clear sequence to avoid getting pulled into the wrong side of ${coin}.

Most avoidable losses happen before structure is checked.

${proofSnippet}

There is one level worth confirming before commitment.
${actionLine("en")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("en", funnelType, 2);
      return `Strong candles can feel convincing, but confidence is not the same as structure.
What protects you here is process, not speed.

If process is skipped, drawdown arrives faster than expected.

${proofSnippet}

Do one quiet check first, then decide.
${actionLine("en")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType, mirrorWords }) => {
      const cta = resolveCta("en", funnelType, 0);
      const mirrorLine = mirrorWords && String(mirrorWords).trim()
        ? `If you are watching ${mirrorWords}, this is where reactions often become too fast.`
        : `If this setup looks familiar, this is where reactions often become too fast.`;
      return `${mirrorLine}
That urgency can hide the exact point where ${coin} starts losing balance.

Moving before verification often leaves losses that feel avoidable in hindsight.

${proofSnippet}

One checkpoint still matters before risk is added.
${actionLine("en")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType, mirrorWords }) => {
      const cta = resolveCta("en", funnelType, 1);
      const mirrorLine = mirrorWords && String(mirrorWords).trim()
        ? `This ${coin} move can look obvious, especially if ${mirrorWords} matches your current bias.`
        : `This ${coin} move can look obvious when your bias is already leaning one way.`;
      return `${mirrorLine}
That is exactly when silent reversals hurt the most.

A short structure check now can prevent an expensive correction later.

${proofSnippet}

There is one unresolved point before this is safe to press.
${actionLine("en")}
${cta} -> ${link}`;
    }
  ],
  ja: [
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ja", funnelType, 0);
      return `最近の${coin}、勢いが強くて判断が前のめりになりやすいです。
こういう局面ほど、流れは静かに切り替わります。

構造を見ないまま乗ると、理由が曖昧な損失が残りやすいです。

${proofSnippet}

まだ確認していない変わり目が一つあります。
${actionLine("ja")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ja", funnelType, 1);
      return `数字が跳ねると、体が先に反応してしまうのは自然です。
ただ、その反応が強い時ほど${coin}の流れは変化点に近いです。

急いで入ると、数回分の積み上げが一度で削られることがあります。

${proofSnippet}

この変化点、まだ先に押さえていませんよね？
${actionLine("ja")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ja", funnelType, 2);
      return `${coin}の上げがきれいに見える時ほど、見えない罠が残りやすいです。
見た目の強さと、継続する強さは別です。

確認を飛ばすと、あとで説明しにくい損失になります。

${proofSnippet}

先に一つだけ確認すれば、判断のぶれはかなり減らせます。
${actionLine("ja")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ja", funnelType, 0);
      return `いま必要なのは煽りではなく、順番です。
${coin}は「どこで失速しやすいか」を先に見るだけで守りが変わります。

順番を外した時の損失は、いつも想像より重いです。

${proofSnippet}

まだ埋まっていない判断材料が一つあります。
${actionLine("ja")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ja", funnelType, 1);
      return `情報を増やすより、いまは地図を先に持つ方が安全です。
${coin}は勢いより、流れの変わり目で差が出ます。

地図なしで進むと、取り返し行動が連鎖しやすくなります。

${proofSnippet}

この一箇所を見てからなら、落ち着いて選べます。
${actionLine("ja")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ja", funnelType, 2);
      return `強いローソクは安心感を作りますが、安心感と安全性は同じではありません。
${coin}の局面は、手順を守るだけで被弾率が下がります。

手順を飛ばすと、想定外の逆行で削られやすいです。

${proofSnippet}

まず一回だけ構造を見て、そこから決めましょう。
${actionLine("ja")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType, mirrorWords }) => {
      const cta = resolveCta("ja", funnelType, 0);
      const mirrorLine = mirrorWords && String(mirrorWords).trim()
        ? `この動き、${mirrorWords}を追っている人ほど反応が速くなりやすい場面です。`
        : "この動き、反応が先に走りやすい場面です。";
      return `${mirrorLine}
反応が速いほど、${coin}の切り替わりを見落としやすくなります。

見落とした一回が、あとで大きな損失に変わることがあります。

${proofSnippet}

残りは変化点の確認だけです。
${actionLine("ja")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType, mirrorWords }) => {
      const cta = resolveCta("ja", funnelType, 1);
      const mirrorLine = mirrorWords && String(mirrorWords).trim()
        ? `${mirrorWords}に同調している時ほど、${coin}のリズムは主観で見えやすくなります。`
        : "同調が強い時ほど、価格のリズムは主観で見えやすくなります。";
      return `${mirrorLine}
そのまま進むと、後で「なぜ入ったか説明できない」損失が残りやすいです。

${proofSnippet}

ここは一つだけ未確認のポイントがあります。
${actionLine("ja")}
${cta} -> ${link}`;
    }
  ],
  es: [
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("es", funnelType, 0);
      return `Este movimiento de ${coin} se siente rápido y eso empuja decisiones.
En fases así, el flujo cambia en silencio antes de que se note en pantalla.

Entrar sin estructura suele dejar pérdidas que luego cuestan explicar.

${proofSnippet}

Todavía falta confirmar un punto de giro.
${actionLine("es")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("es", funnelType, 1);
      return `Cuando los numeros saltan, es normal sentir impulso.
Cuanto más fuerte se siente, más cerca suele estar la zona donde ${coin} pierde ritmo.

Una entrada acelerada aqui puede borrar varios aciertos tranquilos.

${proofSnippet}

Ya revisaste la zona donde puede frenarse?
${actionLine("es")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("es", funnelType, 2);
      return `${coin} puede verse fuerte por fuera, pero no siempre sostiene por dentro.
La sensación de control sube justo cuando más conviene validar.

Si se omite esa validación, el retroceso suele ser evitable.

${proofSnippet}

Falta un chequeo corto antes de comprometer riesgo.
${actionLine("es")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("es", funnelType, 0);
      return `Aquí no hace falta más ruido.
Lo que protege es entender dónde ${coin} puede perder soporte.

Sin ese mapa, las decisiones se dispersan y la pérdida pesa más.

${proofSnippet}

Queda una pieza para estabilizar la decisión.
${actionLine("es")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("es", funnelType, 1);
      return `No necesitas reaccionar más rápido, necesitas reaccionar mejor.
En ${coin}, la diferencia suele estar en el punto de cambio, no en la velocidad.

La mayoría de pérdidas evitables aparece antes del chequeo estructural.

${proofSnippet}

Revisa un nivel más y decide con calma.
${actionLine("es")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("es", funnelType, 2);
      return `Las velas fuertes generan confianza, pero confianza no es estructura.
Lo que te cuida aqui es el proceso.

Si se salta el proceso, el drawdown llega más rápido de lo esperado.

${proofSnippet}

Primero valida un punto clave y luego ejecuta.
${actionLine("es")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType, mirrorWords }) => {
      const cta = resolveCta("es", funnelType, 0);
      const mirrorLine = mirrorWords && String(mirrorWords).trim()
        ? `Si sigues ${mirrorWords}, este es el punto donde la reacción suele acelerarse.`
        : "Si este escenario te suena familiar, aquí la reacción suele acelerarse.";
      return `${mirrorLine}
Esa urgencia puede ocultar justo donde ${coin} empieza a perder equilibrio.

Entrar antes de verificar deja pérdidas que luego parecen obvias.

${proofSnippet}

Aún queda un chequeo antes de subir riesgo.
${actionLine("es")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType, mirrorWords }) => {
      const cta = resolveCta("es", funnelType, 1);
      const mirrorLine = mirrorWords && String(mirrorWords).trim()
        ? `Este movimiento de ${coin} parece claro cuando ${mirrorWords} coincide con tu sesgo.`
        : `Este movimiento de ${coin} parece claro cuando el sesgo ya esta inclinado.`;
      return `${mirrorLine}
Justo ahí es donde más duele un giro silencioso.

Un chequeo corto ahora puede evitar una corrección cara después.

${proofSnippet}

Falta un punto sin resolver antes de presionar.
${actionLine("es")}
${cta} -> ${link}`;
    }
  ],
  pt: [
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("pt", funnelType, 0);
      return `Esse movimento de ${coin} parece rápido e isso puxa decisões.
Nessas fases, o fluxo pode virar em silêncio antes de ficar claro.

Entrar sem estrutura costuma deixar perdas difíceis de explicar depois.

${proofSnippet}

Ainda falta confirmar um ponto de virada.
${actionLine("pt")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("pt", funnelType, 1);
      return `Quando os números disparam, esse impulso no corpo é normal.
Quanto mais forte ele fica, mais perto costuma estar a área onde ${coin} perde ritmo.

Uma entrada apressada aqui pode apagar várias sessões boas.

${proofSnippet}

Você já checou a zona de desaceleração?
${actionLine("pt")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("pt", funnelType, 2);
      return `${coin} pode parecer forte por fora, mas nem sempre sustenta por dentro.
A sensação de controle sobe justo quando mais vale validar.

Sem validação, o recuo costuma ser evitável.

${proofSnippet}

Falta uma confirmação curta antes de assumir risco.
${actionLine("pt")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("pt", funnelType, 0);
      return `Aqui você não precisa de mais barulho.
O que protege é saber onde ${coin} pode perder suporte.

Sem esse mapa, a decisão se espalha e a perda pesa mais.

${proofSnippet}

Ainda existe uma peça para estabilizar a decisão.
${actionLine("pt")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("pt", funnelType, 1);
      return `Você não precisa agir mais rápido, precisa agir melhor.
Em ${coin}, a diferença aparece no ponto de mudança, não na velocidade.

A maior parte das perdas evitáveis nasce antes da checagem estrutural.

${proofSnippet}

Revise mais um nivel e decida com calma.
${actionLine("pt")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("pt", funnelType, 2);
      return `Velas fortes passam confiança, mas confiança não é estrutura.
O que protege aqui é processo, não impulso.

Quando o processo falha, o drawdown chega mais rápido do que parece.

${proofSnippet}

Primeiro valide um ponto-chave e depois execute.
${actionLine("pt")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType, mirrorWords }) => {
      const cta = resolveCta("pt", funnelType, 0);
      const mirrorLine = mirrorWords && String(mirrorWords).trim()
        ? `Se você acompanha ${mirrorWords}, este é o ponto onde a reação acelera demais.`
        : "Se esse cenário te parece familiar, este é o ponto onde a reação acelera demais.";
      return `${mirrorLine}
Essa urgência pode esconder exatamente onde ${coin} perde equilíbrio.

Entrar antes de conferir costuma deixar perdas que depois parecem óbvias.

${proofSnippet}

Ainda falta uma checagem antes de aumentar o risco.
${actionLine("pt")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType, mirrorWords }) => {
      const cta = resolveCta("pt", funnelType, 1);
      const mirrorLine = mirrorWords && String(mirrorWords).trim()
        ? `Esse movimento de ${coin} parece claro quando ${mirrorWords} combina com seu viés.`
        : `Esse movimento de ${coin} parece claro quando seu viés já está inclinado.`;
      return `${mirrorLine}
É exatamente aí que uma virada silenciosa machuca mais.

Uma revisão curta agora pode evitar uma correção cara depois.

${proofSnippet}

Ainda existe um ponto sem fechar antes de pressionar.
${actionLine("pt")}
${cta} -> ${link}`;
    }
  ],
  ar: [
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ar", funnelType, 0);
      return `حركة ${coin} تبدو سريعة وهذا يدفع القرار للأمام.
في مثل هذه اللحظات يتغير الاتجاه بهدوء قبل أن يظهر بوضوح.

الدخول بلا بنية يترك خسائر يصعب تفسيرها لاحقا.

${proofSnippet}

ما زالت هناك نقطة انعطاف لم يتم تأكيدها.
${actionLine("ar")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ar", funnelType, 1);
      return `عندما تقفز الأرقام فاندفاع الجسد طبيعي.
وكلما زاد هذا الاندفاع اقتربت منطقة تباطؤ ${coin}.

دخول واحد متسرع هنا قد يمحو عدة قرارات صحيحة.

${proofSnippet}

هل راجعت منطقة التباطؤ قبل التنفيذ؟
${actionLine("ar")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ar", funnelType, 2);
      return `${coin} قد يبدو قويا في الظاهر لكنه لا يحافظ دائما على القوة في الداخل.
الإحساس بالسيطرة يرتفع عادة عندما يصبح التحقق أهم.

تجاوز هذا التحقق يفتح باب خسارة يمكن تجنبها.

${proofSnippet}

تبقى خطوة تأكيد قصيرة قبل زيادة المخاطرة.
${actionLine("ar")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ar", funnelType, 0);
      return `لا تحتاج ضجيجا إضافيا الآن.
ما يحميك هو معرفة أين يمكن أن يفقد ${coin} الدعم.

بدون هذه الخريطة يصبح القرار مشتتا وتصبح الخسارة أثقل.

${proofSnippet}

هناك قطعة واحدة تكمل وضوح القرار.
${actionLine("ar")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ar", funnelType, 1);
      return `لا تحتاج أن تتحرك أسرع، تحتاج أن تتحرك أدق.
في ${coin} الفارق يظهر عند نقطة التحول لا عند السرعة.

معظم الخسائر الممكن تجنبها تبدأ قبل فحص البنية.

${proofSnippet}

راجع مستوى واحدا إضافيا ثم قرر بهدوء.
${actionLine("ar")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ar", funnelType, 2);
      return `الشموع القوية تصنع ثقة، لكن الثقة ليست بنية.
ما يحميك هنا هو الانضباط في الخطوات لا الاندفاع.

عند تجاوز الخطوات يصل التراجع أسرع مما تتوقع.

${proofSnippet}

أكد نقطة واحدة أولا ثم نفذ.
${actionLine("ar")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType, mirrorWords }) => {
      const cta = resolveCta("ar", funnelType, 0);
      const mirrorLine = mirrorWords && String(mirrorWords).trim()
        ? `إذا كنت تتابع ${mirrorWords} فهذه المرحلة تسرع رد الفعل عادة.`
        : "إذا بدا لك هذا السيناريو مألوفا فهذه المرحلة تسرع رد الفعل عادة.";
      return `${mirrorLine}
هذا الاستعجال قد يخفي النقطة التي يفقد فيها ${coin} توازنه.

الدخول قبل التحقق يترك خسائر تبدو واضحة بعد فوات الوقت.

${proofSnippet}

تبقى خطوة تحقق قبل رفع المخاطرة.
${actionLine("ar")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType, mirrorWords }) => {
      const cta = resolveCta("ar", funnelType, 1);
      const mirrorLine = mirrorWords && String(mirrorWords).trim()
        ? `حركة ${coin} تبدو واضحة عندما ينسجم ${mirrorWords} مع تحيزك الحالي.`
        : `حركة ${coin} تبدو واضحة عندما يميل التحيز في اتجاه واحد.`;
      return `${mirrorLine}
وهنا بالضبط تكون الانعكاسات الهادئة أكثر إيلاما.

مراجعة قصيرة الآن قد تمنع تصحيحا مكلفا لاحقا.

${proofSnippet}

ما زالت هناك نقطة غير مكتملة قبل الضغط على القرار.
${actionLine("ar")}
${cta} -> ${link}`;
    }
  ],
  ko: [
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ko", funnelType, 0);
      return `지금 ${coin} 움직임은 빠르게 보여서 판단을 밀어붙이기 쉽습니다.
이런 구간에서는 흐름이 조용히 바뀐 뒤에야 화면에 드러나는 경우가 많습니다.

구조 확인 없이 들어가면 나중에 설명하기 어려운 손실로 남기 쉽습니다.

${proofSnippet}

아직 확인하지 않은 변곡점이 하나 남아 있습니다.
${actionLine("ko")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ko", funnelType, 1);
      return `숫자가 튈 때 몸이 먼저 반응하는 건 자연스럽습니다.
그 반응이 강할수록 ${coin} 흐름이 속도를 잃는 구간이 가까운 경우가 많습니다.

여기서 서두른 한 번이 며칠치 성과를 지울 수 있습니다.

${proofSnippet}

실행 전에 감속 구간을 확인했나요?
${actionLine("ko")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ko", funnelType, 2);
      return `${coin}가 겉으로 강해 보여도 내부 구조까지 강한 것은 아닙니다.
통제감이 높아질수록 오히려 검증이 더 중요해집니다.

검증을 건너뛰면 피할 수 있던 되돌림을 맞기 쉽습니다.

${proofSnippet}

리스크를 늘리기 전, 짧은 확인 한 번이 필요합니다.
${actionLine("ko")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ko", funnelType, 0);
      return `지금 필요한 건 더 큰 자극이 아니라 순서입니다.
${coin}은 어디서 지지가 약해지는지 먼저 보면 방어가 달라집니다.

지도 없이 진입하면 손실은 생각보다 무겁게 남습니다.

${proofSnippet}

판단을 안정시키는 마지막 조각이 하나 남아 있습니다.
${actionLine("ko")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ko", funnelType, 1);
      return `더 빨리 반응할 필요는 없습니다.
${coin}에서는 속도보다 전환 지점을 먼저 보는 쪽이 훨씬 안전합니다.

피할 수 있는 손실은 대부분 구조 확인 전에 발생합니다.

${proofSnippet}

한 레벨만 더 확인하고 차분하게 결정하세요.
${actionLine("ko")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType }) => {
      const cta = resolveCta("ko", funnelType, 2);
      return `강한 캔들은 확신을 주지만, 확신이 곧 구조는 아닙니다.
여기서 지켜주는 건 감정이 아니라 절차입니다.

절차를 건너뛰면 드로우다운은 예상보다 빨리 옵니다.

${proofSnippet}

핵심 한 포인트를 먼저 검증하고 실행하세요.
${actionLine("ko")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType, mirrorWords }) => {
      const cta = resolveCta("ko", funnelType, 0);
      const mirrorLine = mirrorWords && String(mirrorWords).trim()
        ? `${mirrorWords}를 따라보는 분일수록 이 구간에서 반응이 빨라지기 쉽습니다.`
        : "이 시나리오가 익숙하게 보일수록 이 구간에서 반응이 빨라지기 쉽습니다.";
      return `${mirrorLine}
그 조급함이 ${coin} 균형이 무너지는 지점을 가릴 수 있습니다.

확인 전에 진입하면 나중에 피할 수 있던 손실로 보이기 쉽습니다.

${proofSnippet}

리스크를 키우기 전에 확인 한 단계가 남아 있습니다.
${actionLine("ko")}
${cta} -> ${link}`;
    },
    ({ coin, proofSnippet, link, funnelType, mirrorWords }) => {
      const cta = resolveCta("ko", funnelType, 1);
      const mirrorLine = mirrorWords && String(mirrorWords).trim()
        ? `${mirrorWords}가 현재 시각과 맞을 때 ${coin} 움직임이 더 명확해 보일 수 있습니다.`
        : `${coin} 움직임은 시각이 한쪽으로 기울수록 더 명확해 보일 수 있습니다.`;
      return `${mirrorLine}
바로 그때 조용한 반전이 가장 크게 아픕니다.

지금 짧게 점검하면 이후의 비싼 수정 비용을 줄일 수 있습니다.

${proofSnippet}

마지막 미확인 포인트 하나를 먼저 닫아두세요.
${actionLine("ko")}
${cta} -> ${link}`;
    }
  ]
};

/**
 * 仕手Bot攻略用テンプレ（6言語×4パターン）
 * - 冒頭「同意フック」（煽り・急騰に同意）→ 軸をずらして「ここだけ確認」
 * - 短いのでリプライ280字以内＋リンク確実
 * - mirrorWords があれば冒頭に織り込む
 */
const BOT_AGREEMENT_HOOKS = {
  en: [
    (ctx) => (ctx.mirrorWords ? `Yeah, ${ctx.mirrorWords} gets attention. ` : "Yeah, this kind of move gets attention. ") + "Before you jump — one structure check so you don't get caught wrong.",
    () => "This move is hot. Before FOMO hits — check where it can flip so you're not on the wrong side.",
    () => "Pump vibes are real. One quick check on structure and you're less likely to chase the top.",
    () => "Numbers don't lie — they're moving. Before you add size, one level to verify keeps drawdowns smaller."
  ],
  ja: [
    (ctx) => (ctx.mirrorWords ? `確かに${ctx.mirrorWords}、動いてますね。` : "確かに動いてますね。") + "その前にここだけ見ておくと損しにくいです。",
    () => "勢い出てますね。乗る前に「どこでひっくり返るか」だけ押さえておくと安心です。",
    () => "煽りじゃなく、順番です。構造を一回だけ見てから動くと取り返しが違います。",
    () => "動きは出てる。そのまま飛び乗るより、変わり目を一つ確認してからの方が安全です。"
  ],
  es: [
    (ctx) => (ctx.mirrorWords ? `Sí, ${ctx.mirrorWords} atrae. ` : "Sí, este tipo de movimiento atrae. ") + "Antes de entrar — una revisión de estructura para no pillar el lado equivocado.",
    () => "El movimiento está fuerte. Antes de que el FOMO pegue — revisa dónde puede girar.",
    () => "La bomba se siente. Una revisión rápida de estructura y es menos probable que persigas el techo.",
    () => "Los números se mueven. Antes de sumar tamaño, un nivel que verificar reduce drawdowns."
  ],
  pt: [
    (ctx) => (ctx.mirrorWords ? `Sim, ${ctx.mirrorWords} chama. ` : "Sim, esse tipo de movimento chama. ") + "Antes de entrar — uma checagem de estrutura para não ser pego do lado errado.",
    () => "O movimento está quente. Antes do FOMO — confira onde pode virar.",
    () => "A bomba é real. Uma checagem rápida de estrutura e você corre menos atrás do topo.",
    () => "Os números se movem. Antes de aumentar tamanho, um nível para confirmar reduz drawdowns."
  ],
  ar: [
    (ctx) => (ctx.mirrorWords ? `أجل، ${ctx.mirrorWords} يلفت الانتباه. ` : "أجل، هذا النوع من الحركة يلفت. ") + "قبل القفز — تحقق من البنية مرة واحدة حتى لا تُمسك بالجهة الخاطئة.",
    () => "الحركة قوية. قبل أن يضرب FOMO — راجع أين يمكن أن تنعكس.",
    () => "الإحساس بالضخ حقيقي. مراجعة سريعة للبنية وتقل احتمالية مطاردتك للقمة.",
    () => "الأرقام تتحرك. قبل زيادة الحجم، مستوى واحد للتحقق يقلل التراجعات."
  ],
  ko: [
    (ctx) => (ctx.mirrorWords ? `맞아요, ${ctx.mirrorWords} 반응 많죠. ` : "맞아요, 이런 움직임 반응 많죠. ") + "그 전에 여기만 확인해 두면 손해 덜 봅니다.",
    () => "움직임 나오고 있어요. 타기 전에 ‘어디서 뒤집히는지’만 보고 가면 안전합니다.",
    () => "선동이 아니라 순서예요. 구조 한 번만 보고 움직이면 결과가 달라집니다.",
    () => "움직임은 나옵니다. 그대로 뛰어타기보다 변곡점 하나 확인하고 가는 게 안전해요."
  ]
};

function buildBotTemplate(lang, templateIndex, ctx) {
  const hooks = BOT_AGREEMENT_HOOKS[lang] || BOT_AGREEMENT_HOOKS.en;
  const fn = hooks[templateIndex % hooks.length];
  const hookLine = typeof fn === "function" ? fn(ctx) : String(fn);
  const cta = resolveCta(lang, ctx.funnelType || "vidalytics_regular", templateIndex);
  const link = ctx.link || "";
  return hookLine + "\n" + actionLine(lang) + "\n" + cta + " -> " + link;
}

const PQT_TEMPLATES_BOT = {};
for (const lang of Object.keys(PQT_TEMPLATES)) {
  const hooks = BOT_AGREEMENT_HOOKS[lang] || BOT_AGREEMENT_HOOKS.en;
  PQT_TEMPLATES_BOT[lang] = [];
  for (let i = 0; i < hooks.length; i++) {
    const idx = i;
    PQT_TEMPLATES_BOT[lang].push((ctx) => buildBotTemplate(lang, idx, ctx));
  }
}

module.exports = { PQT_TEMPLATES, PQT_TEMPLATES_BOT, buildBotTemplate, getPromoLine };
