"""Rule baseline mirroring src/extract.ts enough for a fair held-out comparison."""

from __future__ import annotations

import re

TERMINALS = re.compile(r"\b(PNC|PNIT|HJNC|BPT|HPNT|BNCT|PNCT)\b", re.I)
PORTS = [
    (re.compile(r"부산신항|부산|PUSAN|BUSAN|KRPUS", re.I), "BUSAN"),
    (re.compile(r"인천|INCHEON|KRINC", re.I), "INCHEON"),
    (re.compile(r"광양|GWANGYANG|KRKAN", re.I), "GWANGYANG"),
]


def pick(body: str, pattern: str, flags=re.I) -> str:
    m = re.search(pattern, body, flags)
    return (m.group(1).strip() if m else "") or ""


def labeled(body: str, label: str) -> str:
    return pick(body, rf"{label}\s*[:：]\s*([^\n]+)")


def parse_csv(body: str) -> dict[str, str]:
    lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
    if len(lines) < 2 or "," not in lines[0]:
        return {}
    headers = [h.strip().lower() for h in lines[0].split(",")]
    values = [v.strip() for v in lines[1].split(",")]
    alias = {
        "vessel": "vessel",
        "선박": "vessel",
        "voyage": "voyage",
        "항차": "voyage",
        "imo": "imo",
        "port": "port",
        "terminal": "terminal",
        "터미널": "terminal",
        "berth": "berth",
        "부두": "berth",
        "eta": "eta",
        "etb": "etb",
        "etd": "etd",
        "cutoff": "cutoff",
        "cut-off": "cutoff",
    }
    out: dict[str, str] = {}
    for i, h in enumerate(headers):
        key = alias.get(h)
        if key and i < len(values) and values[i]:
            out[key] = values[i]
    return out


def extract_rules(body: str) -> dict[str, str]:
    csv = parse_csv(body)
    eta = (
        csv.get("eta")
        or pick(body, r"revised\s+ETA\s+(\d{1,2}\s+[A-Za-z]{3}(?:\s+20\d{2}(?!\s*LT))?\s+\d{4}\s*LT|\d{4}\s*LT|\d{1,2}:\d{2})")
        or pick(body, r"ETA[^\n]*?(?:→|->|=>)\s*(?:revised\s+ETA\s+)?([0-9]{4}\s*LT|[0-9]{1,2}:[0-9]{2}|20\d{2}-\d{2}-\d{2}\s+\d{1,2}:\d{2})")
        or labeled(body, "ETA")
        or pick(body, r"\bETA\s+(\d{1,2}\s+[A-Za-z]{3}(?:\s+20\d{2}(?!\s*LT))?\s+\d{4}\s*LT|\d{4}\s*LT|\d{1,2}:\d{2}|20\d{2}-\d{2}-\d{2}\s+\d{1,2}:\d{2})")
        or pick(body, r"입항\s*예정[:\s]+([^\n]+)")
    )
    vessel = (
        csv.get("vessel")
        or labeled(body, "선박")
        or pick(body, r"\b(MV\s+[A-Z][A-Z0-9\- ]{1,24}?)(?:\s*/|\s+Voy|\s*$)", re.I | re.M)
        or pick(body, r"\bVessel\s*[:：]\s*([^\n]+)")
    )
    voyage = (
        csv.get("voyage")
        or labeled(body, "항차")
        or pick(body, r"\bVoy(?:age)?\s*[:#]?\s*([0-9]{4}[A-Z])")
        or pick(body, r"\b([0-9]{4}[EWNS])\b")
    )
    imo = csv.get("imo") or pick(body, r"\bIMO\s*[:#]?\s*(\d{7})\b")
    term_m = TERMINALS.search(body)
    terminal = (csv.get("terminal") or labeled(body, "터미널") or (term_m.group(1) if term_m else "")).upper()
    port = csv.get("port", "")
    for cre, name in PORTS:
        if cre.search(body) or (port and cre.search(port)):
            port = name
            break
    if not port and terminal:
        port = "BUSAN"
    berth = (
        csv.get("berth")
        or pick(body, r"Berth(?:\s+change)?\s+T\d\s*(?:→|->|=>)\s*(T\d)")
        or pick(body, r"부두[^\n]*?(?:→|->)\s*(T\d)")
        or labeled(body, "부두")
        or pick(body, r"\bBerth\s+(T\d)")
        or pick(body, r"\b(T[1-9])\b")
    ).upper()
    etb = csv.get("etb") or labeled(body, "ETB") or pick(body, r"\bETB\s+([0-9]{1,2}:[0-9]{2}|[0-9]{4}\s*LT)")
    etd = csv.get("etd") or labeled(body, "ETD") or pick(
        body, r"\bETD\s+(\d{1,2}\s+[A-Za-z]{3}(?:\s+20\d{2}(?!\s*LT))?\s+\d{4}\s*LT|\d{1,2}:\d{2}|\d{4}\s*LT|20\d{2}-\d{2}-\d{2}\s+\d{1,2}:\d{2})"
    )
    cutoff = (
        csv.get("cutoff")
        or pick(body, r"CY cutoff remains\s+([0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4})")
        or pick(body, r"(?:CY\s*)?(?:Cut-?off|cutoff)\s*(?:remains|:|：)?\s*([0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4}(?:\s+[0-9]{4})?|20\d{2}-\d{2}-\d{2}\s+\d{1,2}:\d{2}[^\n]*)")
        or pick(body, r"반입\s*마감[:\s]+([^\n]+)")
    )
    out = {
        "vessel": re.sub(r"\s+", " ", vessel).strip(),
        "voyage": voyage.strip(),
        "imo": imo.strip(),
        "port": port.strip(),
        "terminal": terminal.strip(),
        "berth": berth.strip(),
        "eta": eta.strip(),
        "etb": etb.strip(),
        "etd": etd.strip(),
        "cutoff": cutoff.strip(),
    }
    return {k: v for k, v in out.items() if v}
