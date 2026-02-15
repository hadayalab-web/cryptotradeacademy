/**
 * BuzzDefence Engine v4 — CTR 特化版
 * North Star: X → Vidalytics CTR 最大化
 *
 * 役割:
 * - StructuredPost（Python 由来）を受け取り、CTR 最適化を適用して X 投稿を構築
 * - cliffhanger / 選択肢型 CTA / 恐怖→安心の導線
 * - 自リプライ / Poll / メディア設定
 *
 * 前提: 構造のソース・オブ・トゥルースは Python (build_structured_post)
 */

const { pickVidalyticsLink } = require("../../config/buzzweaveLinks");
const {
  insertQuotedTweets,
  insertBuzzweavePostLog,
  insertXPost,
  insertChainRaidPostKpi
} = require("../../utils/supabase");

// ---- CTR: cliffhanger 接尾辞（未完の物語） ----
const CLIFFHANGER_SUFFIX_BY_LANG = {
  en: "—",
  ja: "──",
  ko: "—",
  es: "—",
  pt: "—",
  ar: "—"
};

// ---- CTR: 選択肢型 CTA（psychology_tag 別） ----
const CHOICE_CTA_BY_TAG = {
  FOMO: {
    en: "① Ride the wave ② Step back. Your choice →",
    ja: "①乗る ②降りる。選んで →",
    ko: "①타고가기 ②빠지기. 선택해 →",
    es: "① Montarse ② Bajarse. Elige →",
    pt: "① Entrar ② Sair. Escolha →",
    ar: "① الركوب ② النزول. اختر →"
  },
  FUD: {
    en: "① Sell now ② Wait for structure. Your call →",
    ja: "①売る ②構造を待つ。あなた次第 →",
    ko: "①지금 매도 ②구조 대기. 결정해 →",
    es: "① Vender ya ② Esperar estructura. Tú decides →",
    pt: "① Vender ② Esperar estrutura. Você decide →",
    ar: "① البيع الآن ② انتظار الهيكل. قررك →"
  },
  HOPE: {
    en: "① Still stuck ② Want the 3-min escape guide →",
    ja: "①まだハマってる ②3分で避け方知りたい →",
    ko: "①아직 걸림 ②3분 탈출 가이드 원해 →",
    es: "① Todavía atrapado ② Guía de escape 3 min →",
    pt: "① Ainda preso ② Guia de fuga 3 min →",
    ar: "① ما زلت عالقاً ② دليل الهروب 3 دقائق →"
  },
  // BotNet: 固定テンプレ＋構造データ差し替えのみ（GPT に遊ばせず CTR 安定）。CSO: 警戒/無視
  BOTNET: {
    en: "① Stay alert ② Ignore. Your call →",
    ja: "①警戒する ②無視する。選んで →",
    ko: "①경계 ②무시. 선택해 →",
    es: "① Alerta ② Ignorar. Elige →",
    pt: "① Alerta ② Ignorar. Escolha →",
    ar: "① تنبّه ② تجاهل. اختر →"
  },
  // RAID: burst_factor 高 / raid_detected 時。攻撃的選択肢
  RAID: {
    en: "① Get out ② Ride the wave. Your move →",
    ja: "①逃げる ②乗る。あなた次第 →",
    ko: "①빠지기 ②타기. 결정해 →",
    es: "① Salir ② Montarse. Tú decides →",
    pt: "① Sair ② Entrar. Você decide →",
    ar: "① الخروج ② الركوب. قررك →"
  },
  // CHAIN_RAID: KIBA + CQ 統合（v4.1）。チェーンポンプ
  CHAIN_RAID: {
    en: "① Escape now ② Ride chain pump. Your move →",
    ja: "①今すぐ逃げる ②チェーンポンプに乗る。あなた次第 →",
    ko: "①지금 탈출 ②체인 펌프 타기. 결정해 →",
    es: "① Salir ahora ② Montarse en el pump. Tú decides →",
    pt: "① Sair agora ② Entrar no pump. Você decide →",
    ar: "① اهرب الآن ② اركب موجة البامب. قررك →"
  },
  // v4.5: psych_type 別 CTA（narrative 最適化）
  FOMO_RIDE: {
    en: "① Ride or miss ② Step back. Your choice →",
    ja: "①乗るか逃すか ②一歩引く。選んで →",
    ko: "①타거나 놓치거나 ②물러서기. 선택해 →",
    es: "① Montarse o perder ② Retroceder. Elige →",
    pt: "① Entrar ou perder ② Recuar. Escolha →",
    ar: "① اركب أو تفوت ② تراجع. اختر →"
  },
  FUD_ESCAPE: {
    en: "① Escape now ② Wait for structure. Your call →",
    ja: "①今すぐ逃げる ②構造を待つ。あなた次第 →",
    ko: "①지금 탈출 ②구조 대기. 결정해 →",
    es: "① Escapar ya ② Esperar estructura. Tú decides →",
    pt: "① Sair agora ② Esperar estrutura. Você decide →",
    ar: "① اهرب الآن ② انتظر الهيكل. قررك →"
  },
  NEUTRAL: {
    en: "① Ignore ② Learn structure. Your move →",
    ja: "①無視 ②構造を学ぶ。あなたの選択 →",
    ko: "①무시 ②구조 배우기. 당신 차례 →",
    es: "① Ignorar ② Aprender estructura. Tú eliges →",
    pt: "① Ignorar ② Aprender estrutura. Você decide →",
    ar: "① تجاهل ② تعلم الهيكل. قررك →"
  }
};

// ---- 恐怖→安心: 解決提示（Vidalytics 紐づけ） ----
const RELIEF_PHRASE_BY_LANG = {
  en: "Escape route (3 min):",
  ja: "避け方はここで3分でまとめた:",
  ko: "탈출법 3분 요약:",
  es: "Ruta de escape (3 min):",
  pt: "Rota de fuga (3 min):",
  ar: "طريق الهروب (3 دقائق):"
};

/**
 * StructuredPost から mainPost 本文を構築（CTR 最適化適用）
 * - cliffhanger: hook に「──」等を付与
 * - 恐怖→安心: structure_note + data_sources + 解決（Vidalytics）
 * - 選択肢型 CTA
 */
function buildMainPost(structuredPost, vidalyticsLink, options = {}) {
  const { enableCliffhanger = true, enableChoiceCta = true } = options;
  const lang = (structuredPost.lang || "en").replace("pt-br", "pt");
  const hook = structuredPost.hook || "";
  const bullets = structuredPost.bullets || [];
  const structureNote = structuredPost.structure_note || "";
  const dataSources = structuredPost.data_sources || [];
  const ctaCore = structuredPost.cta_core || structuredPost.cta || "";
  const hashtags = Array.isArray(structuredPost.hashtags)
    ? structuredPost.hashtags.join(" ")
    : (structuredPost.hashtags || "#BTC #Crypto #TrapDefence");
  const psychologyTag = structuredPost.psychology_tag || "NEUTRAL";

  let finalHook = hook;
  if (enableCliffhanger && hook && !hook.match(/[—─…]$/)) {
    const suffix = CLIFFHANGER_SUFFIX_BY_LANG[lang] || "—";
    finalHook = hook.trim() + " " + suffix;
  }

  const bulletText = Array.isArray(bullets) ? bullets.join("\n") : bullets;
  const dataText = Array.isArray(dataSources) ? dataSources.join(" ") : dataSources;

  const relief = RELIEF_PHRASE_BY_LANG[lang] || RELIEF_PHRASE_BY_LANG.en;
  const solutionLine = vidalyticsLink ? `${relief} ${vidalyticsLink}` : "";

  // 必須: cta_core × psychology_tag × 選択肢テンプレで組み立て（GPT に CTA を丸投げしない）
  // v4.5: psych_type があれば narrative 最適化 CTA を優先
  let ctaLine = ctaCore;
  if (enableChoiceCta) {
    const psychType = structuredPost.psych_type || structuredPost.narrative_tag;
    const psychMap = { FOMO: "FOMO_RIDE", FUD: "FUD_ESCAPE", HYPE: "FOMO_RIDE" };
    const resolvedPsych = psychMap[psychType] || psychologyTag;
    const choiceMap = CHOICE_CTA_BY_TAG[resolvedPsych] || CHOICE_CTA_BY_TAG[psychologyTag] || CHOICE_CTA_BY_TAG.NEUTRAL;
    ctaLine = choiceMap[lang] || choiceMap.en || ctaCore;
  }

  const parts = [
    finalHook,
    bulletText,
    structureNote,
    dataText,
    solutionLine,
    ctaLine,
    hashtags
  ].filter(Boolean);

  return parts.join("\n\n");
}

/**
 * 自リプライ用の補足文（+5〜10分用）
 */
function buildSelfReply1(structuredPost, vidalyticsLink, options = {}) {
  const lang = (structuredPost.lang || "en").replace("pt-br", "pt");
  const structureNote = structuredPost.structure_note || "";
  const mode = structuredPost.mode || "trap";
  if (mode === "botnet") {
    const bullets = structuredPost.bullets || [];
    const bulletText = Array.isArray(bullets) ? bullets.slice(0, 2).join("\n") : "";
    return lang === "ja"
      ? `構造の一部を開示: ${bulletText}\n詳しくは → ${vidalyticsLink}`
      : `Structure snippet: ${bulletText}\nFull breakdown → ${vidalyticsLink}`;
  }
  return lang === "ja"
    ? `補足: ${structureNote}\n続きは → ${vidalyticsLink}`
    : `More: ${structureNote}\nFull picture → ${vidalyticsLink}`;
}

/**
 * 自リプライ用のリマインド（+60〜90分用）
 */
function buildSelfReply2(structuredPost, vidalyticsLink, options = {}) {
  const lang = (structuredPost.lang || "en").replace("pt-br", "pt");
  const cta = structuredPost.cta_core || structuredPost.cta || "";
  return lang === "ja"
    ? `まだ見てない人へ。避け方3分でまとめた → ${vidalyticsLink}\n${cta}`
    : `For those who missed it. 3-min escape guide → ${vidalyticsLink}\n${cta}`;
}

/**
 * Poll 設定（psychology_tag に応じて選択肢を生成）
 */
function buildPollConfig(structuredPost) {
  const psychologyTag = structuredPost.psychology_tag || "NEUTRAL";
  const lang = (structuredPost.lang || "en").replace("pt-br", "pt");
  const options = {
    FOMO: { en: ["Ride it", "Watch", "Already out"], ja: ["乗る", "様子見", "もう降りた"] },
    FUD: { en: ["Sell", "Hold", "Add"], ja: ["売る", "ガチホ", "追加買い"] },
    HOPE: { en: ["Need guide", "Got it", "Skip"], ja: ["ガイド欲しい", "もう知ってる", "スキップ"] },
    BOTNET: { en: ["Learn pattern", "Ignore", "Report"], ja: ["パターン学ぶ", "無視", "報告"] },
    RAID: { en: ["Get out", "Ride", "Watch"], ja: ["逃げる", "乗る", "様子見"] },
    CHAIN_RAID: { en: ["Yes", "No"], ja: ["はい", "いいえ"], question: "Chain pump incoming?" },
    NEUTRAL: { en: ["Learn", "Ignore", "Maybe"], ja: ["学ぶ", "無視", "様子見"] }
  };
  const opts = options[psychologyTag] || options.NEUTRAL;
  const pollOptions = Array.isArray(opts[lang])
    ? opts[lang]
    : Array.isArray(opts.en)
      ? opts.en
      : opts.options || ["Yes", "No"];
  const result = { options: pollOptions, duration_minutes: 1440 };
  if (opts.question) result.question = opts.question;
  return result;
}

/**
 * visual_payload から mediaConfig を構築。
 * chainData.graph_url があれば GIF として優先（v4.1）。
 * type: "video" | "gif" | "image", url: string のとき動画優先（maxDurationSec: 60）。
 * 後方互換: 従来の payload オブジェクトの場合は attachVisual: true のみ。
 */
function buildMediaConfig(visualPayload, chainData) {
  if (chainData?.graph_url) {
    return { type: "gif", url: chainData.graph_url, attachVisual: true };
  }
  if (!visualPayload) return null;
  const type = visualPayload.type;
  const url = visualPayload.url;
  if (type === "video" && url) {
    return { type: "video", url, maxDurationSec: 60, attachVisual: true };
  }
  if (type === "gif" && url) {
    return { type: "gif", url, attachVisual: true };
  }
  if (type === "image" && url) {
    return { type: "image", url, attachVisual: true };
  }
  return { attachVisual: true, payload: visualPayload };
}

/**
 * buildXPost: StructuredPost → { mainPost, selfReplyPosts, pollConfig, mediaConfig }
 */
function buildXPost(structuredPost, vidalyticsLink, options = {}) {
  const link = vidalyticsLink || pickVidalyticsLink(structuredPost.lang, "regular");
  const {
    enableCliffhanger = true,
    enableChoiceCta = true,
    enableSelfReplies = true,
    enablePoll = false
  } = options;

  const mainPost = buildMainPost(structuredPost, link, {
    enableCliffhanger,
    enableChoiceCta
  });

  const selfReplyPosts = enableSelfReplies
    ? [
        { text: buildSelfReply1(structuredPost, link), delayMinutes: 7 },
        { text: buildSelfReply2(structuredPost, link), delayMinutes: 75 }
      ]
    : [];

  const pollConfig = enablePoll ? buildPollConfig(structuredPost) : null;

  // X Algo Booster: chainData.graph_url 優先 → video → gif → image（v4.1）
  const mediaConfig = buildMediaConfig(
    structuredPost.visual_payload,
    structuredPost.chain_data
  );

  return {
    mainPost,
    vidalyticsLink: link,
    selfReplyPosts,
    pollConfig,
    mediaConfig
  };
}

/**
 * postToX: 既存 postQuoteTweet をラップ（v4 用）
 * 自リプライ・Poll は将来の X API 拡張で実装。現時点は mainPost のみ投稿。
 */
async function postToX(mainPost, quotedTweetId, postQuoteTweet, options = {}) {
  if (!mainPost || !quotedTweetId) {
    throw new Error("mainPost and quotedTweetId are required");
  }
  const postFn = postQuoteTweet || require("../x/client").postQuoteTweet;
  const result = await postFn(mainPost, quotedTweetId);
  return result;
}

/**
 * runBuzzDefenceV4Cycle: 1サイクル = StructuredPost → buildXPost → postToX → KPIログ
 * BotNetAlert 等、Python 由来の StructuredPost を本番 X 投稿に流す。
 *
 * 責務: StructuredPost 受け取り → buildXPost → postToX → insertQuotedTweets + insertBuzzweavePostLog + insertXPost
 *
 * @param {Object} structuredPost - Python build_structured_post の出力
 * @param {string} quotedTweetId - 引用するツイート ID（BotNet 検出元の投稿など）
 * @param {Object} options - dryRun, postQuoteTweet, enableCliffhanger, enableChoiceCta 等
 */
async function runBuzzDefenceV4Cycle(structuredPost, quotedTweetId, options = {}) {
  const { dryRun = true, postQuoteTweet } = options;
  const vidalyticsLink = pickVidalyticsLink(structuredPost.lang, "regular");

  if (!vidalyticsLink || !vidalyticsLink.includes("vidalytics")) {
    return { ok: false, message: "Invalid Vidalytics URL", posted: 0 };
  }

  const built = buildXPost(structuredPost, vidalyticsLink, options);

  if (!built.mainPost.includes(vidalyticsLink)) {
    return { ok: false, message: "Body missing Vidalytics link", posted: 0 };
  }

  if (dryRun) {
    return {
      ok: true,
      posted: 0,
      dryRun: true,
      mainPost: built.mainPost,
      selfReplyPosts: built.selfReplyPosts
    };
  }

  const postFn = postQuoteTweet || require("../x/client").postQuoteTweet;
  const result = await postFn(built.mainPost, quotedTweetId);
  const tweetId = result?.id || null;

  // KPI ログ（1サイクルに含む: insertQuotedTweets → insertBuzzweavePostLog → insertXPost）
  const lang = structuredPost.lang || "en";
  const mode = structuredPost.mode || "trap";
  const psychologyTag = structuredPost.psychology_tag || "NEUTRAL";

  await insertQuotedTweets([{ tweet_id: String(quotedTweetId), lang }]);

  await insertBuzzweavePostLog({
    slotLang: lang,
    clusterLabel: mode === "botnet" ? "botnet" : structuredPost.classification || mode,
    clusterScore: 0,
    candidateTweetId: String(quotedTweetId),
    engagementScore: 0,
    postedAt: new Date().toISOString(),
    ourTweetId: tweetId,
    slotMode: `v4_${mode}`,
    buzzSummary: `v4 ${mode} / ${psychologyTag}`,
    clusterPsych: structuredPost.structure_note || null,
    trapDefenceInsight: built.selfReplyPosts?.[0]?.text?.slice(0, 100) || null,
    dangerLabel: psychologyTag.toLowerCase(),
    usedMode: `v4_${mode}`
  });

  const xpostResult = await insertXPost({
    lang,
    mode: `v4_${mode}`,
    body: built.mainPost,
    video_url: vidalyticsLink
  });

  if (psychologyTag === "CHAIN_RAID" && tweetId) {
    const fs = structuredPost.fusion_score ?? 0;
    const fusionScoreBin = fs >= 0.8 ? "0.8+" : fs >= 0.6 ? "0.6-0.8" : "<0.6";
    const vp = structuredPost.visual_payload || {};
    const burstFactor =
      vp.initial_boost_factor ?? vp.burst_factor_v42 ?? structuredPost.chain_data?.burst_factor ?? null;
    await insertChainRaidPostKpi({
      postId: tweetId,
      quotedTweetId: String(quotedTweetId),
      lang,
      burstFactor: burstFactor ?? null,
      fusionScore: structuredPost.fusion_score ?? null,
      cqSnapshotTs: structuredPost.cq_timestamp ?? null,
      mediaType: built.mediaConfig?.type || "none",
      fusionScoreBin,
      postTiming: new Date().getUTCHours(),
      clusterId: structuredPost.cluster_id ?? vp.botnet_cluster_id ?? null,
      botnetClusterId: vp.botnet_cluster_id ?? null,
      botnetDensity: vp.botnet_density ?? null,
      botnetCoherence: vp.botnet_coherence_score ?? null,
      narrativeTag: structuredPost.narrative_tag ?? null,
      assetClass: structuredPost.asset_class ?? "BTC"
    });
  }

  return {
    ok: true,
    posted: tweetId ? 1 : 0,
    tweetId,
    mainPost: built.mainPost,
    kpiLogged: !!xpostResult?.ok
  };
}

module.exports = {
  buildMainPost,
  buildSelfReply1,
  buildSelfReply2,
  buildPollConfig,
  buildMediaConfig,
  buildXPost,
  postToX,
  runBuzzDefenceV4Cycle,
  CHOICE_CTA_BY_TAG,
  RELIEF_PHRASE_BY_LANG
};
