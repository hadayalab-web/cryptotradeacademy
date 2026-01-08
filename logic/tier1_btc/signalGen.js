// logic/tier1_btc/signalGen.js

/**
 * Generate final trade targets (TP/SL) from core decision.
 * Note: BUY/SELL signal generation is removed - this function now only handles 'NONE' signals.
 *
 * Input example:
 *   generateSignal({
 *     priceUsd: 92113,
 *     score: 72,
 *     direction: 'NONE', // BUY/SELLは完全削除、'NONE'のみ
 *   })
 */

function generateSignal(input = {}) {
  const { priceUsd, score, direction } = input;

  const price = Number(priceUsd);
  const signal = direction || 'NONE';

  // BUY/SELLシグナル生成は完全削除 - 常にNONEを返す
  // 価格が不正 or ポジションを取らない場合は TP/SL なしで返す
  if (!Number.isFinite(price) || price <= 0 || signal !== 'NONE') {
    return {
      signal: 'NONE', // BUY/SELLは完全削除
      entry: Number.isFinite(price) ? Math.round(price) : null,
      tp: null,
      sl: null,
      rr: null,
    };
  }

  // --- ベースのリスクリワード設定 ----------------------------------
  // 例: RR ≒ 3.5% / 2.0% ≒ 1.75
  const BASE_TP_PCT = 0.035; // +3.5%
  const BASE_SL_PCT = 0.02;  // -2.0%

  // スコアに応じて TP を少しだけ可変にする（高スコアほど伸ばす）
  let conviction = 1;
  if (typeof score === 'number') {
    if (score >= 80) {
      conviction = 1.3;   // 強いシグナル: TP 少し広め
    } else if (score >= 65) {
      conviction = 1.1;   // そこそこ強い
    } else if (score <= 35) {
      conviction = 0.8;   // 自信が低いときは TP を控えめに
    }
  }

  const tpPct = BASE_TP_PCT * conviction;
  const slPct = BASE_SL_PCT; // SL は常に一定（リスク管理をシンプルに）

  const entry = price;

  let tpPrice = entry;
  let slPrice = entry;

  // BUY/SELLシグナル生成は完全削除 - TP/SLは計算しない
  // signalが'NONE'の場合はTP/SLなし

  const rr = tpPct / slPct;

  return {
    signal,
    entry: Math.round(entry),
    tp: Math.round(tpPrice),
    sl: Math.round(slPrice),
    rr: Number(rr.toFixed(2)),
  };
}

module.exports = { generateSignal };
