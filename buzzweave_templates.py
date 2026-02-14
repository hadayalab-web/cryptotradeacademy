"""
BuzzWeave Template Engine — 6-language structural quote templates.
Auto language selection + variable injection. Used by BuzzWeave Engine for Trap Defence quotes.

Design: 戦略 → 戦術 → 運用 → 拡散 → 救済. One entry point: render(lang, classification, kiba_data, format=...).
"""

from typing import Any, Dict, List, Optional, Union

SUPPORTED_LANGUAGES = {"en", "es", "pt", "ar", "ko", "ja"}
TRAP_CLASSIFICATIONS = {"BAIT_NO_FLOW", "HYPE_WITH_FLOW", "FEAR_WITH_FLOW"}

DATA_SOURCES_LABEL = "Data: Dune / Glassnode / Coinglass (structure only, no prediction)."

HASHTAGS_BY_LANG: Dict[str, str] = {
    "en": "#Bitcoin #Crypto",
    "es": "#BitcoinES #Crypto",
    "pt": "#BitcoinPT #Crypto",
    "ar": "#BitcoinAR #Crypto",
    "ko": "#BitcoinKO #Crypto",
    "ja": "#BitcoinJA #Crypto",
}

CTA_BY_LANG: Dict[str, str] = {
    "en": "RT to save someone. What do you think?",
    "es": "RT para salvar a alguien. ¿Qué opinas?",
    "pt": "RT para salvar alguém. O que acha?",
    "ar": "إعادة تغريد لإنقاذ شخص. ما رأيك؟",
    "ko": "RT로 누군가를 구할 수 있어요. 어떻게 생각하세요?",
    "ja": "RTで誰かを救える。どう思う？",
}

# v1: one-shot templates with placeholders {flow}, {flow_direction}, {liquidity}, {structure_note}
QUOTE_TEMPLATES: Dict[str, Dict[str, str]] = {
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

# v2: Empathy hook by classification × language
EMPATHY_HOOK_V2: Dict[str, Dict[str, str]] = {
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


def normalize_lang(lang: str) -> str:
    s = (lang or "").strip().lower()
    if s in ("pt-br", "pt_br"):
        return "pt"
    return s if s in SUPPORTED_LANGUAGES else "en"


def structure_note(kiba_data: Dict[str, Any]) -> str:
    """Exit liquidity vs real accumulation — structure only, no prediction."""
    flow = (kiba_data.get("flow_signal") or "").lower()
    liq = (kiba_data.get("liquidity_signal") or "").lower()
    sent = (kiba_data.get("sentiment_signal") or "").upper()
    if sent == "FUD" and flow == "strong":
        return "Structural risk: flow confirms fear; watch liquidity breaks."
    if sent == "FOMO" and liq == "clustered":
        return "Clustered liquidity + FOMO flow — assess if accumulation or distribution."
    if flow in ("none", "weak"):
        return "No real flow behind the buzz — trap visibility."
    return "Structure over noise."


def build_bullets(kiba_data: Dict[str, Any]) -> List[str]:
    """Bullet lines: Flow / Liquidity / Sentiment. Power words sparingly."""
    flow = (kiba_data.get("flow_signal") or "none").strip()
    liq = (kiba_data.get("liquidity_signal") or "neutral").strip()
    sent = (kiba_data.get("sentiment_signal") or "neutral").strip()
    lines = [f"• Flow: {flow}", f"• Liquidity: {liq}", f"• Sentiment: {sent}"]
    if liq == "clustered":
        lines.append("• Hidden liquidity clusters in play.")
    if sent.upper() in ("FOMO", "FUD"):
        lines.append("• Sentiment extreme — structure over noise.")
    return lines


def render(
    lang: str,
    classification: str,
    kiba_data: Dict[str, Any],
    format: str = "single",
    version: str = "v2",
) -> Union[str, List[str]]:
    """
    Single entry point: language + classification + KIBA data → quote text or thread.

    - lang: en, es, pt, ar, ko, ja (auto-normalized).
    - classification: BAIT_NO_FLOW | HYPE_WITH_FLOW | FEAR_WITH_FLOW.
    - kiba_data: onchain_confirmation, flow_signal, liquidity_signal, sentiment_signal.
    - format: "single" → one string; "thread" → list of 3 tweets (Hook, Data, CTA).
    - version: "v1" = placeholder templates; "v2" = empathy + bullets + CTA + data source.
    """
    lang = normalize_lang(lang)
    if classification not in TRAP_CLASSIFICATIONS:
        classification = "BAIT_NO_FLOW"
    kiba = kiba_data or {}
    flow = (kiba.get("flow_signal") or "none").strip()
    flow_direction = "inflow" if (kiba.get("sentiment_signal") or "").upper() == "FOMO" else "outflow"
    liquidity = (kiba.get("liquidity_signal") or "neutral").strip()
    structure_note_str = structure_note(kiba)
    cta = CTA_BY_LANG.get(lang) or CTA_BY_LANG["en"]
    hashtag = HASHTAGS_BY_LANG.get(lang) or HASHTAGS_BY_LANG["en"]

    if version == "v1":
        templates = QUOTE_TEMPLATES.get(classification, QUOTE_TEMPLATES["BAIT_NO_FLOW"])
        template = templates.get(lang) or templates.get("en") or ""
        if "{flow}" in template or "{structure_note}" in template:
            return template.format(
                flow=flow,
                flow_direction=flow_direction,
                liquidity=liquidity,
                sentiment=(kiba.get("sentiment_signal") or "neutral").strip(),
                structure_note=structure_note_str,
            )
        return template

    # v2
    hook_map = EMPATHY_HOOK_V2.get(classification, EMPATHY_HOOK_V2["BAIT_NO_FLOW"])
    hook = hook_map.get(lang) or hook_map.get("en") or ""
    bullets = build_bullets(kiba)
    data_src = DATA_SOURCES_LABEL
    if format == "thread":
        return [
            hook,
            "\n".join(bullets) + "\n\n" + structure_note_str,
            data_src + "\n\n" + cta + " " + hashtag,
        ]
    return hook + "\n\n" + "\n".join(bullets) + "\n\n" + structure_note_str + "\n\n" + data_src + "\n\n" + cta + " " + hashtag
