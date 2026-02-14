"""
BuzzWeave Engine — Trap Defence posting logic (final spec / v2).
Only react to intentional, structurally relevant "Trap-like" buzz.
Post quote-retweets that: expose traps, explain real structural moves, or warn about structural risk.

Design: Grok final spec — 15min reaction, 6-language timing windows, empathy + bullets + CTA,
thread structure (Hook / Data / CTA), 2-4 posts/day, data source citation, visual attachment.

Input sources: market_influencer_registry, bait_offender_registry, influencer_onchain_alert_engine.
Constraints: Never amplify vague buzz; only post when KIBA has crosschecked and classification is one of three patterns.
"""

import json
import os
from datetime import datetime, timezone, timedelta
from typing import Any, List, Optional, Union

_ROOT = os.path.dirname(os.path.abspath(__file__))
_LOG_PATH = os.path.join(_ROOT, "buzzweave_trap_data", "buzzweave_trap_post_log.json")

SUPPORTED_LANGUAGES = {"en", "es", "pt", "ar", "ko", "ja"}
TRAP_CLASSIFICATIONS = {"BAIT_NO_FLOW", "HYPE_WITH_FLOW", "FEAR_WITH_FLOW"}

# ---- Timing: BuzzWeave "sortie" windows (UTC) ----
# React 5-30 min after bait; only fire when current UTC is in the language window.
REACTION_WINDOW_MIN_MINUTES = 5
REACTION_WINDOW_MAX_MINUTES = 30
# (start_hour_utc, start_min), (end_hour_utc, end_min) — end exclusive for simplicity
TIMING_WINDOWS_UTC = {
    "en": [(14, 0), (18, 0)],
    "es": [(20, 0), (23, 0)],
    "pt": [(20, 0), (23, 0)],
    "ar": [(16, 0), (20, 0)],
    "ko": [(1, 0), (5, 0)],
    "ja": [(1, 0), (5, 0)],
}
# World max wave (EU/US overlap): 13:00-16:00 UTC — any language can fire in this window too
GLOBAL_OVERLAP_UTC = [(13, 0), (16, 0)]

# Daily cap: align with buzzweave_kpi guardrails (shadowban risk if >5/day)
try:
    from buzzweave_kpi import (
        GUARDRAIL_MAX_POSTS_PER_DAY as _KPI_MAX,
        GUARDRAIL_EMERGENCY_MAX_POSTS_PER_DAY as _KPI_EMERGENCY_MAX,
        RECOMMENDED_MIN_POSTS_PER_DAY as _KPI_MIN,
        SELF_RESTRAINT_MAX_POSTS_PER_DAY as _KPI_RESTRAINT_MAX,
        get_neutral_boosters_for_lang,
        get_self_restraint_protocol,
    )
except ImportError:
    _KPI_MAX = 4
    _KPI_EMERGENCY_MAX = 5
    _KPI_MIN = 2
    _KPI_RESTRAINT_MAX = 1
    get_neutral_boosters_for_lang = lambda lang: []
    get_self_restraint_protocol = lambda: {}
MAX_POSTS_PER_DAY = min(4, _KPI_MAX)
MIN_POSTS_PER_DAY = max(2, _KPI_MIN)
DATA_SOURCES_LABEL = "Data: Dune / Glassnode / Coinglass (structure only, no prediction)."

# Optional: use buzzweave_templates as single source for 6-language templates
try:
    from buzzweave_templates import render as template_render, normalize_lang as _tpl_normalize_lang, HASHTAGS_BY_LANG as _TPL_HASHTAGS, CTA_BY_LANG as _TPL_CTA, DATA_SOURCES_LABEL as _TPL_DATA_SOURCES
except ImportError:
    template_render = None
    _tpl_normalize_lang = None
    _TPL_HASHTAGS = None
    _TPL_CTA = None
    _TPL_DATA_SOURCES = None

# Language hashtags for cross-language amplification (fallback if no template module)
HASHTAGS_BY_LANG = {
    "en": "#Bitcoin #Crypto",
    "es": "#BitcoinES #Crypto",
    "pt": "#BitcoinPT #Crypto",
    "ar": "#BitcoinAR #Crypto",
    "ko": "#BitcoinKO #Crypto",
    "ja": "#BitcoinJA #Crypto",
}

# CTA by language (RT to save / What do you think)
CTA_BY_LANG = {
    "en": "RT to save someone. What do you think?",
    "es": "RT para salvar a alguien. ¿Qué opinas?",
    "pt": "RT para salvar alguém. O que acha?",
    "ar": "إعادة تغريد لإنقاذ شخص. ما رأيك؟",
    "ko": "RT로 누군가를 구할 수 있어요. 어떻게 생각하세요?",
    "ja": "RTで誰かを救える。どう思う？",
}
if _TPL_HASHTAGS:
    HASHTAGS_BY_LANG = _TPL_HASHTAGS
if _TPL_CTA:
    CTA_BY_LANG = _TPL_CTA
if _TPL_DATA_SOURCES:
    DATA_SOURCES_LABEL = _TPL_DATA_SOURCES

# ---------------------------------------------------------------------------
# 6-language templates by classification (structure-focused; no direct accusation)
# Placeholders: {flow}, {flow_direction}, {liquidity}, {sentiment}, {structure_note}
# ---------------------------------------------------------------------------

QUOTE_TEMPLATES = {
    "BAIT_NO_FLOW": {
        "en": "Trap visibility: heat vs structure. High buzz but no real flow — {flow}. Liquidity: {liquidity}. {structure_note}",
        "es": "Trampa visible: ruido vs estructura. Mucho buzz pero sin flujo real — {flow}. Liquidez: {liquidity}. {structure_note}",
        "pt": "Trampa visível: barulho vs estrutura. Muito buzz sem fluxo real — {flow}. Liquidez: {liquidity}. {structure_note}",
        "ar": "الفقاعة واضحة: ضجيج بلا تدفق حقيقي — {flow}. السيولة: {liquidity}. {structure_note}",
        "ko": "함정 가시화: 열기와 구조의 괴리. 실질 유입 없음 — {flow}. 유동성: {liquidity}. {structure_note}",
        "ja": "罠の可視化: 熱量と構造の乖離。実需フローなし — {flow}. 流動性: {liquidity}. {structure_note}",
    },
    "HYPE_WITH_FLOW": {
        "en": "Structural move, not just hype. Flow confirms: {flow} ({flow_direction}). Liquidity: {liquidity}. {structure_note}",
        "es": "Movimiento estructural, no solo hype. El flujo lo confirma: {flow} ({flow_direction}). Liquidez: {liquidity}. {structure_note}",
        "pt": "Movimento estrutural, não só hype. Fluxo confirma: {flow} ({flow_direction}). Liquidez: {liquidity}. {structure_note}",
        "ar": "تحرك هيكلي وليس ضجيجاً فقط. التدفق يؤكد: {flow} ({flow_direction}). السيولة: {liquidity}. {structure_note}",
        "ko": "구조적 움직임, 단순 바람 아님. 플로우 확인: {flow} ({flow_direction}). 유동성: {liquidity}. {structure_note}",
        "ja": "構造的な動き。フローで確認: {flow} ({flow_direction}). 流動性: {liquidity}. {structure_note}",
    },
    "FEAR_WITH_FLOW": {
        "en": "When fear rises and flow confirms it, it's not emotion — it's a structural risk event. What matters is where liquidity breaks, not the price.",
        "es": "Cuando el miedo sube y el flujo lo confirma, no es emoción — es riesgo estructural. Lo que importa es dónde se rompe la liquidez, no el precio.",
        "pt": "Quando o medo aumenta e o fluxo confirma, não é emoção — é risco estrutural. O que importa é onde a liquidez quebra, não o preço.",
        "ar": "عندما يرتفع الخوف ويؤكده التدفق، فالأمر ليس عاطفة — بل حدث مخاطر هيكلية. نقاط انهيار السيولة أهم من السعر.",
        "ko": "공포가 커지고 플로우까지 같은 방향이면, 그건 감정이 아니라 구조적 리스크입니다. 중요한 건 가격이 아니라 유동성의 끊김입니다.",
        "ja": "恐怖投稿が増えて、フローも同じ方向なら、それは感情ではなく **構造的リスクイベント**。重要なのは価格ではなく「どこで流動性が切れるか」。",
    },
}

# ---- v2: Empathy + bullets + CTA (final spec) ----
# Hook (empathy) by classification and language. Placeholders: {flow}, {liquidity}, {sentiment}, {structure_note}
EMPATHY_HOOK_V2 = {
    "BAIT_NO_FLOW": {
        "en": "FOMO feels real, but structure says otherwise.",
        "es": "El FOMO se siente real, pero la estructura dice otra cosa.",
        "pt": "O FOMO parece real, mas a estrutura diz o contrário.",
        "ar": "الطمع يبدو حقيقياً، لكن الهيكل يقول غير ذلك.",
        "ko": "FOMO는 진짜 같지만, 구조는 다르게 말해요.",
        "ja": "こういう時ほど、構造を見た方がいい。",
    },
    "HYPE_WITH_FLOW": {
        "en": "Hype feels real — and this time flow confirms it.",
        "es": "El hype se siente real — y esta vez el flujo lo confirma.",
        "pt": "O hype parece real — e desta vez o fluxo confirma.",
        "ar": "الضجيج يبدو حقيقياً — وهذه المرة التدفق يؤكده.",
        "ko": "바람이 진짜인 것 같고, 이번엔 플로우가 확인해요.",
        "ja": "盛り上がりは本物に見える — 今回はフローが裏付けしてる。",
    },
    "FEAR_WITH_FLOW": {
        "en": "Fear feels real — and flow confirms it. That's structural risk, not just emotion.",
        "es": "El miedo se siente real — y el flujo lo confirma. Es riesgo estructural, no solo emoción.",
        "pt": "O medo parece real — e o fluxo confirma. É risco estrutural, não só emoção.",
        "ar": "الخوف يبدو حقيقياً — والتدفق يؤكده. حدث مخاطر هيكلية، ليس عاطفة فقط.",
        "ko": "공포가 진짜 같고, 플로우가 같은 방향이면 — 감정이 아니라 구조적 리스크.",
        "ja": "恐怖は本物に感じる。フローが同じ方向なら — 感情ではなく構造的リスク。",
    },
}


def _ensure_log_dir() -> None:
    os.makedirs(os.path.dirname(_LOG_PATH), exist_ok=True)


def _normalize_lang(lang: str) -> str:
    s = (lang or "").strip().lower()
    if s in ("pt-br", "pt_br"):
        return "pt"
    return s if s in SUPPORTED_LANGUAGES else "en"


def _in_timing_window(timing_pattern: str) -> bool:
    if not timing_pattern or (timing_pattern or "").strip() in ("*", ""):
        return True
    from influencer_onchain_alert_engine import _utc_now_in_timing_window
    return _utc_now_in_timing_window(timing_pattern)


def is_in_language_fire_window(lang: str) -> bool:
    """True if current UTC is inside this language's BuzzWeave sortie window or global overlap."""
    lang = _normalize_lang(lang)
    now = datetime.now(timezone.utc)
    h, m = now.hour, now.minute
    now_minutes = h * 60 + m
    for (sh, sm), (eh, em) in [TIMING_WINDOWS_UTC.get(lang, [(0, 0), (0, 0)]), GLOBAL_OVERLAP_UTC]:
        start_m = sh * 60 + sm
        end_m = eh * 60 + em
        if start_m <= now_minutes < end_m:
            return True
    return False


def is_within_reaction_window(bait_posted_at_utc: Optional[datetime] = None, max_minutes: int = REACTION_WINDOW_MAX_MINUTES) -> bool:
    """True if we are within 5..max_minutes after the bait post (for algo momentum). No timestamp = assume recent (True)."""
    if bait_posted_at_utc is None:
        return True
    delta = datetime.now(timezone.utc) - bait_posted_at_utc.replace(tzinfo=timezone.utc) if bait_posted_at_utc.tzinfo is None else bait_posted_at_utc
    minutes = delta.total_seconds() / 60.0
    return REACTION_WINDOW_MIN_MINUTES <= minutes <= max_minutes


# ---------------------------------------------------------------------------
# 1. detect_trap_candidates
# ---------------------------------------------------------------------------


def _mock_recent_posts_for_influencer(account: str, language: str, timing_pattern: str) -> Optional[dict]:
    """Mock: one synthetic 'recent post' per influencer. Replace with real X API / queue."""
    return {
        "post_id": f"mock_{account.lstrip('@')}_{language}",
        "account": account if account.startswith("@") else f"@{account}",
        "language": _normalize_lang(language),
        "text": f"[Recent post from {account}]",
        "source": "influencer",
        "timing_pattern": timing_pattern or "*",
        "correlation_type": "",
    }


def _mock_recent_posts_for_offender(entry: dict) -> Optional[dict]:
    """Mock: one synthetic 'recent post' per bait offender. Replace with real X API."""
    account = (entry.get("account") or "").strip()
    if not account:
        return None
    return {
        "post_id": f"mock_offender_{account.lstrip('@')}",
        "account": account if account.startswith("@") else f"@{account}",
        "language": "en",
        "text": (entry.get("behavior_pattern") or "")[:200],
        "source": "bait_offender",
        "timing_pattern": "*",
        "correlation_type": (entry.get("category") or "").strip(),
    }


def _sort_candidates_by_behavior_profiles(candidates: list[dict]) -> list[dict]:
    """プロファイルの trap_density と peak_trap_hours で優先度付けし、Trap を張りがちなアカウントを前に。"""
    try:
        from influencer_behavior_profiler import load_profiles
        profiles_list = load_profiles()
    except ImportError:
        return candidates
    profile_by_account = {}
    for p in profiles_list:
        acc = (p.get("account") or "").strip().lower().lstrip("@")
        if acc:
            profile_by_account[acc] = p
    now_utc_hour = datetime.now(timezone.utc).hour
    def priority(c: dict) -> tuple:
        acc = (c.get("account") or "").strip().lower().lstrip("@")
        p = profile_by_account.get(acc)
        if not p:
            return (0.0, 0)
        density = float(p.get("trap_density") or 0)
        peak = list(p.get("peak_trap_hours_utc") or [])
        in_peak = 1 if now_utc_hour in peak else 0
        return (-density, -in_peak)
    return sorted(candidates, key=priority)


def detect_trap_candidates(require_fire_window: bool = True, use_behavior_priority: bool = True) -> list[dict]:
    """
    Scan influencers + bait offenders with 'recent posts'; filter by language (EN,ES,PT,AR,KO,JA),
    timing_pattern, and (if require_fire_window) current UTC in language's BuzzWeave sortie window.
    If use_behavior_priority=True, sort by influencer_behavior_profiler (trap_density, peak_trap_hours).
    Output: list of trap_candidate_posts.
    """
    candidates: list[dict] = []
    try:
        from market_influencer_registry import list_influencers
        influencers = list_influencers(enrich_for_alerts=True)
        for inf in influencers:
            lang = _normalize_lang(inf.get("language") or "en")
            if lang not in SUPPORTED_LANGUAGES:
                continue
            if require_fire_window and not is_in_language_fire_window(lang):
                continue
            timing = (inf.get("timing_pattern") or "*").strip() or "*"
            if not _in_timing_window(timing):
                continue
            post = _mock_recent_posts_for_influencer(
                inf.get("account") or "",
                inf.get("language") or "en",
                timing,
            )
            if post:
                post["correlation_type"] = (inf.get("correlation_type") or "").strip()
                candidates.append(post)
    except ImportError:
        pass
    try:
        import bait_offender_registry as bait
        for entry in bait.list_offenders():
            post = _mock_recent_posts_for_offender(entry)
            if not post:
                continue
            lang = _normalize_lang(post.get("language", "en"))
            if lang not in SUPPORTED_LANGUAGES:
                continue
            if require_fire_window and not is_in_language_fire_window(lang):
                continue
            candidates.append(post)
    except ImportError:
        pass
    if use_behavior_priority and candidates:
        candidates = _sort_candidates_by_behavior_profiles(candidates)
    return candidates


# ---------------------------------------------------------------------------
# 2. classify_trap (using KIBA / influencer_onchain_alert_engine)
# ---------------------------------------------------------------------------


def _get_kiba_data_for_account(account: str) -> Optional[dict]:
    """Load KIBA crosscheck result for this account from influencer_onchain_alert_engine."""
    try:
        from influencer_onchain_alert_engine import load_alerts, export_for_kiba
        data = export_for_kiba()
        key = (account or "").strip().lower().lstrip("@")
        for a in data.get("active_alerts", []) + data.get("critical_signals", []):
            if (a.get("account") or "").strip().lower().lstrip("@") == key:
                return {
                    "onchain_confirmation": (a.get("onchain_confirmation") or "").strip(),
                    "flow_signal": (a.get("flow_signal") or "").strip(),
                    "liquidity_signal": (a.get("liquidity_signal") or "").strip(),
                    "sentiment_signal": (a.get("sentiment_signal") or "").strip(),
                }
        alerts_data = load_alerts()
        for a in alerts_data.get("alerts", []):
            if (a.get("account") or "").strip().lower().lstrip("@") == key:
                return {
                    "onchain_confirmation": (a.get("onchain_confirmation") or "").strip(),
                    "flow_signal": (a.get("flow_signal") or "").strip(),
                    "liquidity_signal": (a.get("liquidity_signal") or "").strip(),
                    "sentiment_signal": (a.get("sentiment_signal") or "").strip(),
                }
    except ImportError:
        pass
    return None


def classify_trap(post: dict, kiba_data: Optional[dict] = None) -> tuple[str, dict]:
    """
    Use KIBA / onchain: onchain_confirmation, flow_signal, liquidity_signal, sentiment_signal.
    Returns (classification, kiba_snapshot).
    classification in: BAIT_NO_FLOW, HYPE_WITH_FLOW, FEAR_WITH_FLOW.
    """
    if kiba_data is None:
        kiba_data = _get_kiba_data_for_account(post.get("account") or "")
    if not kiba_data:
        kiba_data = {
            "onchain_confirmation": "FALSE",
            "flow_signal": "none",
            "liquidity_signal": "neutral",
            "sentiment_signal": "neutral",
        }
    onchain = (kiba_data.get("onchain_confirmation") or "").upper() == "TRUE"
    flow = (kiba_data.get("flow_signal") or "").lower()
    liquidity = (kiba_data.get("liquidity_signal") or "").lower()
    sentiment = (kiba_data.get("sentiment_signal") or "").upper()
    strong_flow = flow == "strong"
    if not onchain or not strong_flow:
        return "BAIT_NO_FLOW", kiba_data
    if sentiment == "FOMO":
        return "HYPE_WITH_FLOW", kiba_data
    if sentiment == "FUD":
        return "FEAR_WITH_FLOW", kiba_data
    return "BAIT_NO_FLOW", kiba_data


# ---------------------------------------------------------------------------
# 3. generate_structural_quote
# ---------------------------------------------------------------------------


def _structure_note(kiba_data: dict) -> str:
    """Whether this looks like exit liquidity or real accumulation."""
    flow = (kiba_data.get("flow_signal") or "").lower()
    liq = (kiba_data.get("liquidity_signal") or "").lower()
    sent = (kiba_data.get("sentiment_signal") or "").upper()
    if sent == "FUD" and flow == "strong":
        return "Structural risk: flow confirms fear; watch liquidity breaks."
    if sent == "FOMO" and liq == "clustered":
        return "Clustered liquidity + FOMO flow — assess if accumulation or distribution."
    if flow == "none" or flow == "weak":
        return "No real flow behind the buzz — trap visibility."
    return "Structure over noise."


def _build_bullets(lang: str, kiba_data: dict) -> list[str]:
    """Bullet lines for structure (Liq / Netflow / Sentiment). Power words sparingly."""
    flow = (kiba_data.get("flow_signal") or "none").strip()
    liq = (kiba_data.get("liquidity_signal") or "neutral").strip()
    sent = (kiba_data.get("sentiment_signal") or "neutral").strip()
    bullets_en = [
        f"• Flow: {flow}",
        f"• Liquidity: {liq}",
        f"• Sentiment: {sent}",
    ]
    if liq == "clustered":
        bullets_en.append("• Hidden liquidity clusters in play.")
    if sent.upper() in ("FOMO", "FUD"):
        bullets_en.append("• Sentiment extreme — structure over noise.")
    # Keep bullets in English for data consistency; in v2 single tweet we append in lang
    return bullets_en


def generate_structural_quote_v2(post: dict, classification: str, kiba_data: dict, use_thread_format: bool = False) -> Union[str, List[str]]:
    """
    v2: Empathy hook + bullets (Liq / Netflow / Sentiment) + structure_note + data source + CTA + hashtag.
    If use_thread_format=True, returns list of 3-5 tweets (Hook, Data, CTA); else single tweet string.
    Uses buzzweave_templates.render() when available.
    """
    if template_render:
        lang = _tpl_normalize_lang(post.get("language") or "en") if _tpl_normalize_lang else _normalize_lang(post.get("language") or "en")
        return template_render(lang, classification, kiba_data, format="thread" if use_thread_format else "single", version="v2")
    lang = _normalize_lang(post.get("language") or "en")
    hook_map = EMPATHY_HOOK_V2.get(classification, EMPATHY_HOOK_V2["BAIT_NO_FLOW"])
    hook = hook_map.get(lang) or hook_map.get("en") or ""
    bullets = _build_bullets(lang, kiba_data)
    structure_note = _structure_note(kiba_data)
    cta = CTA_BY_LANG.get(lang) or CTA_BY_LANG["en"]
    hashtag = HASHTAGS_BY_LANG.get(lang) or HASHTAGS_BY_LANG["en"]
    data_src = DATA_SOURCES_LABEL
    if use_thread_format:
        tweet1 = hook
        tweet2 = "\n".join(bullets) + "\n\n" + structure_note
        tweet3 = data_src + "\n\n" + cta + " " + hashtag
        return [tweet1, tweet2, tweet3]
    single = hook + "\n\n" + "\n".join(bullets) + "\n\n" + structure_note + "\n\n" + data_src + "\n\n" + cta + " " + hashtag
    return single


def generate_structural_quote_thread(post: dict, classification: str, kiba_data: dict) -> List[str]:
    """3-5 tweet thread: 1=Hook, 2-4=Data (KIBA bullets), 5=CTA. For education × amplification × rescue."""
    return generate_structural_quote_v2(post, classification, kiba_data, use_thread_format=True)


def generate_structural_quote_v3(post: dict, classification: str, kiba_data: dict, use_thread_format: bool = False) -> Union[str, List[str]]:
    """
    v3: アルゴ最適化。質問フック + ブックマーク誘導 + #TrapDefence。
    Reply誘発・メディア前提(attach_visual=True 推奨)・保存用コピーを組み込み。
    use_thread_format=True 時は 5-part thread: Hook+question → Bullets → Structure note → Data source → Bookmark+CTA+hashtags.
    """
    if template_render:
        lang = _tpl_normalize_lang(post.get("language") or "en") if _tpl_normalize_lang else _normalize_lang(post.get("language") or "en")
        return template_render(lang, classification, kiba_data, format="thread" if use_thread_format else "single", version="v3")
    return generate_structural_quote_v2(post, classification, kiba_data, use_thread_format=use_thread_format)


def generate_structural_quote(post: dict, classification: str, kiba_data: dict) -> str:
    """
    For BAIT_NO_FLOW: trap visibility / heat vs structure.
    For HYPE_WITH_FLOW: structural move explanation.
    For FEAR_WITH_FLOW: structural risk warning.
    Uses buzzweave_templates.render(version='v1') when available.
    """
    if classification not in TRAP_CLASSIFICATIONS:
        classification = "BAIT_NO_FLOW"
    if template_render:
        lang = _tpl_normalize_lang(post.get("language") or "en") if _tpl_normalize_lang else _normalize_lang(post.get("language") or "en")
        out = template_render(lang, classification, kiba_data, format="single", version="v1")
        return out if isinstance(out, str) else "\n".join(out)
    lang = _normalize_lang(post.get("language") or "en")
    templates = QUOTE_TEMPLATES.get(classification, QUOTE_TEMPLATES["BAIT_NO_FLOW"])
    template = templates.get(lang) or templates.get("en") or ""
    if "{flow}" in template or "{structure_note}" in template:
        flow = (kiba_data.get("flow_signal") or "none").strip() or "none"
        flow_direction = "inflow" if (kiba_data.get("sentiment_signal") or "").upper() == "FOMO" else "outflow"
        liquidity = (kiba_data.get("liquidity_signal") or "neutral").strip() or "neutral"
        structure_note = _structure_note(kiba_data)
        return template.format(
            flow=flow,
            flow_direction=flow_direction,
            liquidity=liquidity,
            sentiment=(kiba_data.get("sentiment_signal") or "neutral").strip(),
            structure_note=structure_note,
        )
    return template


# ---------------------------------------------------------------------------
# 4. publish_quote (log; actual X post can be bridged to JS later)
# ---------------------------------------------------------------------------


def publish_quote(
    post: dict,
    generated_text: Union[str, List[str]],
    classification: str,
    kiba_snapshot: dict,
    attach_visual: bool = True,
    hashtag: Optional[str] = None,
    neutral_boosters: Optional[List[str]] = None,
) -> None:
    """
    Post as quote-retweet (mock: log only). Log: original_post_id, classification, kiba_snapshot, timestamp.
    attach_visual: remind to attach chart/heatmap/liq levels. hashtag: language hashtag.
    neutral_boosters: 2-3 handles to tag for +20-40% amplification (from buzzweave_kpi).
    """
    _ensure_log_dir()
    lang = _normalize_lang(post.get("language") or "en")
    if neutral_boosters is None:
        try:
            neutral_boosters = get_neutral_boosters_for_lang(lang)
        except NameError:
            neutral_boosters = []
    entry = {
        "original_post_id": post.get("post_id", ""),
        "account": post.get("account", ""),
        "classification": classification,
        "generated_quote": generated_text,
        "kiba_snapshot": kiba_snapshot,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "attach_visual": attach_visual,
        "hashtag": hashtag or HASHTAGS_BY_LANG.get(lang) or HASHTAGS_BY_LANG["en"],
        "neutral_boosters": list(neutral_boosters)[:3],
    }
    try:
        with open(_LOG_PATH, "r", encoding="utf-8") as f:
            log = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        log = {"entries": []}
    if "entries" not in log or not isinstance(log["entries"], list):
        log["entries"] = []
    log["entries"].append(entry)
    with open(_LOG_PATH, "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=2)


def _count_posts_today() -> int:
    """Number of entries in log with timestamp today (UTC)."""
    try:
        with open(_LOG_PATH, "r", encoding="utf-8") as f:
            log = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return 0
    entries = log.get("entries") or []
    today = datetime.now(timezone.utc).date().isoformat()
    return sum(1 for e in entries if (e.get("timestamp") or "")[:10] == today)


# ---------------------------------------------------------------------------
# 5. run_buzzweave_trap_cycle
# ---------------------------------------------------------------------------


def run_buzzweave_trap_cycle(
    dry_run: bool = True,
    max_candidates: Optional[int] = None,
    use_v2: bool = True,
    use_v3: bool = False,
    require_fire_window: bool = True,
    use_thread_format: bool = False,
    self_restraint_active: bool = False,
) -> dict:
    """
    Detect trap candidates -> classify with KIBA -> generate structural quote -> publish (or log only if dry_run).
    Only posts when KIBA has crosschecked and classification is one of BAIT_NO_FLOW, HYPE_WITH_FLOW, FEAR_WITH_FLOW.
    v2: empathy + bullets + CTA. v3: question hook + bookmark + #TrapDefence (algo-optimized). attach_visual=True 推奨。
    self_restraint_active=True 時は 1 日 1 本まで（ER 低迷時の自己抑制）。緊急時も 5 本上限。
    """
    candidates = detect_trap_candidates(require_fire_window=require_fire_window)
    if max_candidates is not None and max_candidates > 0:
        candidates = candidates[:max_candidates]
    posts_today = 0 if dry_run else _count_posts_today()
    effective_cap = _KPI_RESTRAINT_MAX if self_restraint_active else MAX_POSTS_PER_DAY
    effective_cap = min(effective_cap, _KPI_EMERGENCY_MAX)
    remaining_cap = max(0, effective_cap - posts_today)
    results = {"candidates": len(candidates), "posted": 0, "skipped": 0, "posts_today": posts_today, "effective_cap": effective_cap, "logs": []}
    for post in candidates:
        if not dry_run and remaining_cap <= 0:
            results["skipped"] += 1
            continue
        classification, kiba_data = classify_trap(post)
        if classification not in TRAP_CLASSIFICATIONS:
            results["skipped"] += 1
            continue
        if use_v3:
            quote = generate_structural_quote_v3(post, classification, kiba_data, use_thread_format=use_thread_format)
        elif use_v2:
            quote = generate_structural_quote_v2(post, classification, kiba_data, use_thread_format=use_thread_format)
        else:
            quote = generate_structural_quote(post, classification, kiba_data)
        preview = quote
        if isinstance(quote, list):
            preview = quote[0][:80] + "..." if len(quote[0]) > 80 else quote[0]
        else:
            preview = quote[:80] + "..." if len(quote) > 80 else quote
        if dry_run:
            results["logs"].append({
                "post_id": post.get("post_id"),
                "account": post.get("account"),
                "classification": classification,
                "quote_preview": preview,
                "use_v2": use_v2,
                "use_v3": use_v3,
                "attach_visual": True,
            })
            results["skipped"] += 1
            continue
        lang = _normalize_lang(post.get("language") or "en")
        hashtag = HASHTAGS_BY_LANG.get(lang) or HASHTAGS_BY_LANG["en"]
        if use_v3:
            try:
                from buzzweave_templates import GLOBAL_HASHTAG
                hashtag = (hashtag + " " + GLOBAL_HASHTAG).strip()
            except ImportError:
                pass
        publish_quote(
            post, quote, classification, kiba_data,
            attach_visual=True,
            hashtag=hashtag,
        )
        results["posted"] += 1
        remaining_cap -= 1
    return results


# ---------------------------------------------------------------------------
# KIBA → BuzzWeave 自動連携フロー（裏取り → 投稿まで完全自動化）
# ---------------------------------------------------------------------------


def run_kiba_to_buzzweave_pipeline(
    run_alert_pipeline: bool = True,
    dry_run: bool = True,
    max_candidates: Optional[int] = None,
    use_v2: bool = True,
    use_v3: bool = False,
    require_fire_window: bool = True,
    use_thread_format: bool = False,
    self_restraint_active: bool = False,
) -> dict:
    """
    Run KIBA crosscheck then BuzzWeave trap cycle in one flow.
    1. (Optional) Run influencer_onchain_alert_pipeline() → alerts + export_for_kiba.
    2. Run run_buzzweave_trap_cycle() with given options (v2/v3, self_restraint).
    Returns { "kiba_export": {...}, "buzzweave_result": {...} }.
    """
    kiba_export: Optional[dict] = None
    if run_alert_pipeline:
        try:
            from influencer_onchain_alert_engine import run_influencer_alert_pipeline
            kiba_export = run_influencer_alert_pipeline(use_enriched_influencers=False)
        except ImportError:
            pass
    buzzweave_result = run_buzzweave_trap_cycle(
        dry_run=dry_run,
        max_candidates=max_candidates,
        use_v2=use_v2,
        use_v3=use_v3,
        require_fire_window=require_fire_window,
        use_thread_format=use_thread_format,
        self_restraint_active=self_restraint_active,
    )
    return {"kiba_export": kiba_export, "buzzweave_result": buzzweave_result}


# ---------------------------------------------------------------------------
# Spec summary (Grok final)
# ---------------------------------------------------------------------------
# • Fire: 5–30 min after bait; only in language UTC window (EN 14–18, ES/PT 20–23, AR 16–20, KO/JA 01–05, global 13–16).
# • Template v2: empathy hook + bullets + CTA. v3: question hook + bookmark + #TrapDefence (algo-optimized).
# • Thread: v2 = 3 tweets (Hook | Data | CTA). v3 = 5 tweets (Hook+question | Bullets | Structure | Data | Bookmark+CTA).
# • Cap: 2–4/day; self_restraint=1/day; emergency max 5/day. attach_visual=True 推奨.
# • Risk: data source cited; no prediction; structure only; positive ratio 3:1 (education : warning).

# ---------------------------------------------------------------------------
# Example
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    # require_fire_window=False to test when UTC is outside language windows
    result = run_buzzweave_trap_cycle(
        dry_run=True,
        max_candidates=3,
        use_v2=True,
        require_fire_window=False,
        use_thread_format=False,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
