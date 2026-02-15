"""
BuzzDefence Engine v4.1 — KIBA + CQ Chain Integration.
CQ（CryptoQuant）から BTC オンチェーンデータを取得し、KIBA と統合して chain_trap_score を算出。
psychology_tag を CHAIN_RAID に昇格させる。

オンチェーンデータソース: CryptoQuant のみ（Coinglass は使用しない）。
"""

import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# CQ API: 環境変数 CQ_API_KEY / CRYPTOQUANT_API_KEY で認証。未設定時はモック返却。
CQ_API_BASE = os.environ.get("CQ_API_BASE", "https://api.cryptoquant.com/v1")
CQ_API_KEY = os.environ.get("CQ_API_KEY") or os.environ.get("CRYPTOQUANT_API_KEY")
FUSION_THRESHOLD_CHAIN_RAID = 0.8
BURST_FACTOR_CHAIN_RAID_MIN = 30


def compute_dynamic_oi_threshold(data: Dict[str, Any]) -> float:
    """
    直近24hの open_interest 履歴から 2SD 閾値を算出。
    履歴が足りない場合は現在値の 1.2x をフォールバック。
    CQ API のレスポンス形式は要確認。
    """
    series = data.get("open_interest_history_24h") or data.get("oi_history_24h") or []
    if not isinstance(series, list):
        series = []
    current_oi = float(data.get("open_interest") or data.get("openInterest") or data.get("oi") or 0)

    if len(series) < 10:
        return current_oi * 1.2 if current_oi else 0.0

    vals = [float(x) for x in series if x is not None]
    if len(vals) < 10:
        return current_oi * 1.2 if current_oi else 0.0

    avg = sum(vals) / len(vals)
    var = sum((x - avg) ** 2 for x in vals) / len(vals)
    sd = (var ** 0.5) if var >= 0 else 0
    return avg + 2 * sd


def fetch_cq_btc() -> Dict[str, Any]:
    """
    CQ（CryptoQuant）API から BTC オンチェーンデータを取得。
    失敗時は安全なデフォルトを返す（oi_spike=False, whale_inflow=False, long_short_ratio=1.0）。
    """
    try:
        import requests
    except ImportError:
        logger.warning("[CQ] requests not installed, returning defaults")
        return _default_cq_metrics()

    api_key = CQ_API_KEY or ""
    timeout = int(os.environ.get("CQ_FETCH_TIMEOUT", "5"))

    if not api_key:
        logger.debug("[CQ] CQ_API_KEY/CRYPTOQUANT_API_KEY not set, returning defaults")
        return _default_cq_metrics()

    headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}

    oi_spike = False
    whale_inflow = False
    long_short_ratio = 1.0

    try:
        # CQ: exchange-whale-ratio（クジラ圧力）
        url_wr = f"{CQ_API_BASE}/btc/flow-indicator/exchange-whale-ratio"
        resp_wr = requests.get(
            url_wr,
            params={"exchange": "all_exchange", "window": "day", "limit": 1},
            headers=headers,
            timeout=timeout,
        )
        if resp_wr.ok and resp_wr.text:
            data_wr = resp_wr.json() or {}
            point = (data_wr.get("result") or {}).get("data") or []
            pt = point[0] if isinstance(point, list) and point else {}
            whale_ratio = float(
                pt.get("exchange_whale_ratio") or pt.get("value") or pt.get("whale_ratio") or 0
            )
            whale_inflow = whale_ratio > 0.85
    except Exception as e:
        logger.warning("[CQ] whale-ratio fetch failed: %s", e)

    try:
        # CQ: exchange inflow（流入スパイク）
        url_in = f"{CQ_API_BASE}/btc/exchange-flows/inflow"
        resp_in = requests.get(
            url_in,
            params={"exchange": "all_exchange", "window": "day", "limit": 24},
            headers=headers,
            timeout=timeout,
        )
        if resp_in.ok and resp_in.text:
            data_in = resp_in.json() or {}
            series = (data_in.get("result") or {}).get("data") or []
            if isinstance(series, list) and len(series) >= 10:
                vals = [float((s or {}).get("value") or (s or {}).get("inflow") or 0) for s in series]
                avg = sum(vals) / len(vals)
                current = vals[-1] if vals else 0
                oi_spike = current > (avg + 2 * (sum((x - avg) ** 2 for x in vals) / len(vals)) ** 0.5)
    except Exception as e:
        logger.warning("[CQ] inflow fetch failed: %s", e)

    return {
        "oi_spike": oi_spike,
        "whale_inflow": whale_inflow,
        "long_short_ratio": long_short_ratio,
        "open_interest": 0.0,
        "large_tx": 0,
    }


def _default_cq_metrics() -> Dict[str, Any]:
    return {
        "oi_spike": False,
        "whale_inflow": False,
        "long_short_ratio": 1.0,
        "open_interest": 0.0,
        "large_tx": 0,
    }


def kiba_chain_fusion(
    kiba_payload: Dict[str, Any],
    cq_metrics: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    KIBA（bot/raid）と CQ（chain）を統合し、psychology_tag と fusion_score を返す。
    trap_score > 0.8 なら psychology_tag = CHAIN_RAID に昇格。
    """
    if cq_metrics is None:
        cq_metrics = _default_cq_metrics()

    burst = float(
        kiba_payload.get("burst_factor_v42")
        or kiba_payload.get("initial_boost_factor")
        or kiba_payload.get("burst_factor")
        or 0
    )
    bot_score = min(1.0, burst / 100.0)

    oi = cq_metrics.get("oi_spike", False)
    whale = cq_metrics.get("whale_inflow", False)
    lsr = float(cq_metrics.get("long_short_ratio") or 1.0)

    chain_score = (
        (0.5 if oi else 0) +
        (0.3 if whale else 0) +
        (0.2 if lsr > 2.0 else 0)
    )
    trap_score = round(bot_score * 0.6 + chain_score * 0.4, 2)

    psychology_tag = kiba_payload.get("psychology_tag", "BOTNET")
    if burst >= BURST_FACTOR_CHAIN_RAID_MIN and oi and (whale or trap_score > 0.5):
        psychology_tag = "CHAIN_RAID"

    return {
        "psychology_tag": psychology_tag,
        "fusion_score": trap_score,
        "chain_data": {
            "oi_spike": oi,
            "whale_inflow": whale,
            "long_short_ratio": lsr,
        },
    }


def run_chain_fusion(kiba_result: Dict[str, Any], fetch_cq: bool = True) -> Dict[str, Any]:
    """
    1本のパイプライン: KIBA 結果 + CQ 取得 → fusion 結果を返す。
    """
    cq = fetch_cq_btc() if fetch_cq else _default_cq_metrics()
    fusion = kiba_chain_fusion(kiba_result, cq)
    return {
        **fusion,
        "cq_metrics": cq,
    }
