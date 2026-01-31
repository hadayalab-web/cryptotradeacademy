// config/lexicon.js
// 次のフェーズ戦略: 独自言語（3-5語）の定義。コミュニティの帰属意識・排他性を高めつつ、バイラルを阻害しない範囲で使用。

/**
 * Trap Defence 独自用語（カルト・レキシコン）
 * Grok×Gemini 統合: 難解になりすぎず、検索流入を独占する 3-5 語に限定
 */
const TRAP_DEFENCE_LEXICON = {
  'Algo-Spike': {
    en: 'Sudden move amplified by X/market algo; often a trap for retail.',
    ja: 'アルゴリズムに増幅された急動。リテールの罠になりやすい。',
    es: 'Movimiento súbito amplificado por el algoritmo; a menudo trampa para retail.',
    'pt-br': 'Movimento súbito amplificado pelo algoritmo; muitas vezes armadilha para retail.',
    ar: 'تحرك مفاجئ يضخمه الخوارزم؛ غالباً فخ للمتداولين الصغار.',
    ko: '알고리즘이 증폭한 급등락; 리테일 함정이 되는 경우가 많음.',
  },
  'Dopamine-Trap': {
    en: 'Setup that triggers FOMO/revenge trade; high emotional, low edge.',
    ja: 'FOMO・復讐トレードを誘発するセットアップ。感情高、エッジ低。',
    es: 'Configuración que dispara FOMO/revenge trade; alta emoción, bajo edge.',
    'pt-br': 'Setup que dispara FOMO/revenge trade; alta emoção, baixo edge.',
    ar: 'إعداد يثير FOMO أو revenge trade؛ عاطفة عالية، حافة منخفضة.',
    ko: 'FOMO·복수 트레이드를 유발하는 세팅; 감정 높음, 엣지 낮음.',
  },
  'Saved Loss': {
    en: 'Loss avoided by following Trap Defence standby/avoid signal.',
    ja: 'Trap Defenceの見送り・回避シグナルに従って回避した損失。',
    es: 'Pérdida evitada al seguir la señal standby/avoid de Trap Defence.',
    'pt-br': 'Perda evitada ao seguir sinal standby/avoid do Trap Defence.',
    ar: 'خسارة تجنبتها باتباع إشارة standby/avoid من Trap Defence.',
    ko: 'Trap Defence 대기·회피 시그널을 따름으로써 회피한 손실.',
  },
};

/**
 * 言語用の短いラベル（投稿・CTA用、3-5語に収める）
 */
function getLexiconShortLabels(lang) {
  const normalized = (lang || 'en').toLowerCase();
  return {
    AlgoSpike: normalized === 'ja' ? 'Algo-Spike' : 'Algo-Spike',
    DopamineTrap: normalized === 'ja' ? 'Dopamine-Trap' : 'Dopamine-Trap',
    SavedLoss: normalized === 'ja' ? 'Saved Loss（回避損失）' : 'Saved Loss',
  };
}

module.exports = {
  TRAP_DEFENCE_LEXICON,
  getLexiconShortLabels,
};
