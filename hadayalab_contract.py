from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Any, Mapping
import hashlib, json, re

CONTRACT_ID = "hadayalab.output/v1"

# BAN-04: 出力に現れてはならない語彙（キー・文字列値の双方を検査）
BANNED_VOCAB = re.compile(
    r"psycholog|intent|motiv|emotion|feel|greed|fear|panic|desperat|"
    r"frustrat|mindset|personality|心理|感情|意図|焦り|欲",
    re.IGNORECASE,
)

@dataclass(frozen=True)
class Envelope:
    rule_id: str                      # 例: "BOT.CLUSTER.TEMPORAL.v1"
    observed: Mapping[str, Any]       # 入力から直接読める事実のみ
    derived: Mapping[str, Any]        # observedからの決定論的計算結果のみ
    contract: str = CONTRACT_ID
    input_digest: str = ""            # 再現性検証用 (sha256 of observed)

    def to_dict(self) -> dict:
        return asdict(self)

def make_envelope(rule_id: str, observed: Mapping, derived: Mapping) -> Envelope:
    """Query: 純粋。digestで同一入力→同一出力を検証可能にする"""
    digest = hashlib.sha256(
        json.dumps(observed, sort_keys=True, ensure_ascii=False, default=str).encode()
    ).hexdigest()[:16]
    return Envelope(rule_id=rule_id, observed=dict(observed),
                    derived=dict(derived), input_digest=digest)

class ContractViolation(ValueError):
    pass

def _walk(obj: Any, path: str = ""):
    if isinstance(obj, Mapping):
        for k, v in obj.items():
            yield f"{path}.{k}", k
            yield from _walk(v, f"{path}.{k}")
    elif isinstance(obj, (list, tuple)):
        for i, v in enumerate(obj):
            yield from _walk(v, f"{path}[{i}]")
    elif isinstance(obj, str):
        yield path, obj

def validate(env: Envelope) -> list[str]:
    """Query: 違反理由のリストを返す（空なら合格）。例外は投げない"""
    errs: list[str] = []
    if env.contract != CONTRACT_ID:
        errs.append(f"contract mismatch: {env.contract}")
    if not re.fullmatch(r"[A-Z][A-Z0-9_]*(\.[A-Z0-9_]+)+\.v\d+", env.rule_id):
        errs.append(f"rule_id format: {env.rule_id}")
    for section in ("observed", "derived"):
        for p, token in _walk(getattr(env, section), section):
            if BANNED_VOCAB.search(str(token)):
                errs.append(f"BAN-04 vocab at {p}: {token!r}")
    return errs

def assert_valid(env: Envelope) -> Envelope:
    errs = validate(env)
    if errs:
        raise ContractViolation("; ".join(errs))
    return env
