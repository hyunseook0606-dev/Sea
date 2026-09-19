"""Synthetic maritime schedule IE dataset. Not operational vessel data."""

from __future__ import annotations

import json
import random
import re
from pathlib import Path

FIELDS = ("vessel", "voyage", "imo", "port", "terminal", "berth", "eta", "etb", "etd", "cutoff")

VESSELS = [
    ("MV HANARO", "9876543"),
    ("BLUE OCEAN", "9451208"),
    ("EASTERN WIND", "9612040"),
    ("MV NURI", "9328813"),
    ("MV HAEDONG", "9781104"),
    ("MV SEAHAN", "9510333"),
    ("MV BUSAN STAR", "9402215"),
    ("MV ORION", "9123001"),
    ("PACIFIC STAR", "9331102"),
    ("GREEN WAVE", "9442218"),
    ("MV INCHEON", "9550199"),
    ("SEA PIONEER", "9618882"),
]

PORTS = [
    ("BUSAN", "KRPUS", "부산"),
    ("INCHEON", "KRINC", "인천"),
    ("GWANGYANG", "KRKAN", "광양"),
]

TERMINALS = ["PNC", "PNIT", "HJNC", "HPNT", "BNCT"]
BERTHS = [f"T{i}" for i in range(1, 8)]
VOY_SFX = list("EWNS")


def pad(n: int) -> str:
    return f"{n:02d}"


def stamp(y: int, mo: int, d: int, h: int, m: int) -> str:
    return f"{y}-{pad(mo)}-{pad(d)} {pad(h)}:{pad(m)} LT"


def cutoff_stamp(y: int, mo: int, d: int, h: int, m: int) -> str:
    return f"{y}-{pad(mo)}-{pad(d)} {pad(h)}:{pad(m)}"


def months():
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def rand_schedule(rng: random.Random):
    vessel, imo = rng.choice(VESSELS)
    y, mo, d = 2026, rng.randint(8, 10), rng.randint(1, 27)
    h = rng.choice([6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 18])
    m = rng.choice([0, 0, 0, 30])
    etb_h = min(23, h + rng.choice([1, 2]))
    etd_h = min(23, etb_h + rng.choice([6, 8, 10]))
    cut_d = max(1, d - 1)
    cut_h = rng.choice([12, 16, 17, 18])
    port, unlocode, port_ko = rng.choice(PORTS)
    return {
        "vessel": vessel,
        "voyage": f"{rng.randint(2501, 2612)}{rng.choice(VOY_SFX)}",
        "imo": imo,
        "port": port,
        "port_ko": port_ko,
        "unlocode": unlocode,
        "terminal": rng.choice(TERMINALS),
        "berth": rng.choice(BERTHS),
        "prev_berth": rng.choice(BERTHS),
        "y": y,
        "mo": mo,
        "d": d,
        "h": h,
        "mi": m,
        "etb_h": etb_h,
        "etd_h": etd_h,
        "cut_d": cut_d,
        "cut_h": cut_h,
        "eta": stamp(y, mo, d, h, m),
        "etb": stamp(y, mo, d, etb_h, m),
        "etd": stamp(y, mo, d, etd_h, m),
        "cutoff": cutoff_stamp(y, mo, cut_d, cut_h, 0),
        "mon": months()[mo - 1],
        "hhmm": f"{pad(h)}{pad(m)}",
        "clock": f"{pad(h)}:{pad(m)}",
        "receivedAt": f"{y}-{pad(mo)}-{pad(d)} 08:40:00",
    }


def gold_of(s: dict, keys: tuple[str, ...]) -> dict[str, str]:
    return {k: s[k] for k in keys if s.get(k)}


def easy_templates(s: dict) -> list[tuple[str, tuple[str, ...]]]:
    return [
        (
            f"MV {s['vessel'].replace('MV ', '')} / Voy {s['voyage']} / {s['terminal']}\n"
            f"ETA {s['d']} {s['mon']} {s['hhmm']}LT\nBerth {s['berth']}\n"
            f"CY cutoff remains {s['cut_d']} {s['mon']} {s['cut_h']:02d}00",
            ("vessel", "voyage", "terminal", "berth", "eta", "cutoff"),
        ),
        (
            f"Vessel: {s['vessel']}\nVoyage: {s['voyage']}\nTerminal: {s['terminal']}\n"
            f"Berth {s['berth']}\nETA {s['d']} {s['mon']} {s['hhmm']}LT\nETD {s['d']} {s['mon']} {s['etd_h']:02d}{pad(s['mi'])}LT",
            ("vessel", "voyage", "terminal", "berth", "eta", "etd"),
        ),
        (
            f"선박: {s['vessel']}\n항차: {s['voyage']}\n터미널: {s['terminal']}\n부두 {s['prev_berth']} → {s['berth']}\n"
            f"ETA {s['d']} {s['mon']} {s['hhmm']}LT",
            ("vessel", "voyage", "terminal", "berth", "eta"),
        ),
        (
            "vessel,voyage,terminal,berth,eta,etd\n"
            f"{s['vessel']},{s['voyage']},{s['terminal']},{s['berth']},{s['y']}-{pad(s['mo'])}-{pad(s['d'])} {s['clock']},"
            f"{s['y']}-{pad(s['mo'])}-{pad(s['d'])} {pad(s['etd_h'])}:{pad(s['mi'])}",
            ("vessel", "voyage", "terminal", "berth", "eta", "etd"),
        ),
        (
            f"From: desk@example.com\nSubject: {s['voyage']} {s['vessel']} — ETA revision\n\n"
            f"{s['vessel']} / Voy {s['voyage']} / {s['terminal']}\n"
            f"ETA {s['d']} {s['mon']} 0600LT → revised ETA {s['hhmm']}LT.\n"
            f"Berth change T2 → {s['berth']}.\nCY cutoff remains {s['cut_d']} {s['mon']} {s['cut_h']:02d}00.",
            ("vessel", "voyage", "terminal", "berth", "eta", "cutoff"),
        ),
        (
            f"{s['vessel']} / Voy {s['voyage']} / {s['terminal']}\nETA {s['clock']}\nETB {pad(s['etb_h'])}:{pad(s['mi'])}\nETD {pad(s['etd_h'])}:{pad(s['mi'])}",
            ("vessel", "voyage", "terminal", "eta", "etb", "etd"),
        ),
    ]


def hard_templates(s: dict) -> list[tuple[str, tuple[str, ...]]]:
    short = s["vessel"].replace("MV ", "")
    decoy_voy = "2499E" if s["voyage"] != "2499E" else "2398W"
    decoy_berth = "T2" if s["berth"] != "T2" else "T1"
    decoy_term = "BPT" if s["terminal"] != "BPT" else "HPNT"
    return [
        (
            f"CANCEL {decoy_berth}. Working berth is {s['berth']} only. "
            f"{short} {s['voyage']} arrives {s['port']} {s['clock']} at {s['terminal']}.",
            ("vessel", "voyage", "port", "terminal", "berth", "eta"),
        ),
        (
            f"Ignore voyage {decoy_voy}. Live copy {s['voyage']}. {short} {s['terminal']} {s['berth']} window {s['clock']}.",
            ("vessel", "voyage", "terminal", "berth", "eta"),
        ),
        (
            f"{s['port_ko']} 기항. 이전 부두 {decoy_berth} 아님. 확정 선석 {s['berth']}. "
            f"선박 {short}, 항차 {s['voyage']}, 입항 {s['h']}시 {s['mi']}분, 터미널 {s['terminal']}.",
            ("vessel", "voyage", "terminal", "berth", "eta"),
        ),
        (
            f"Do not use {decoy_term}. Call {s['terminal']} {s['berth']}. Feeder {short} voy.{s['voyage']} expected {s['clock']} hrs.",
            ("vessel", "voyage", "terminal", "berth", "eta"),
        ),
        (
            f"부두가 {decoy_berth}에서 {s['berth']}로 바뀝니다. 대상 항차 {s['voyage']}. 선명 {short}. "
            f"도착 예정 {s['y']}-{pad(s['mo'])}-{pad(s['d'])} {s['clock']}. {s['terminal']}.",
            ("vessel", "voyage", "terminal", "berth", "eta"),
        ),
        (
            f"Agents advise {short}/{s['voyage']}: new alongside {pad(s['etb_h'])}:{pad(s['mi'])}, "
            f"not the old 08:00 slot. Sailing {pad(s['etd_h'])}:{pad(s['mi'])}. {s['terminal']} {s['berth']}.",
            ("vessel", "voyage", "terminal", "berth", "etb", "etd"),
        ),
        (
            f"Port ops: {short} on {s['voyage']} will arrive {s['port']} around {s['clock']} local. "
            f"Shift quay to {s['berth']} at {s['terminal']}. Old quay {decoy_berth} void.",
            ("vessel", "voyage", "port", "terminal", "berth", "eta"),
        ),
        (
            f"pls update — ship {short} code {s['voyage']} (not {decoy_voy}) berthing {s['berth']} "
            f"window {s['hhmm']} at {s['terminal']}.",
            ("vessel", "voyage", "terminal", "berth", "eta"),
        ),
        (
            f"IMO {s['imo']} {short} voyage {s['voyage']} — {s['unlocode']} {s['terminal']} {s['berth']} ETA {s['clock']}. "
            f"Discard {decoy_berth}.",
            ("vessel", "voyage", "imo", "terminal", "berth", "eta"),
        ),
        (
            f"내륙 참고: {short} {s['voyage']} 게이트는 {s['berth']} (기존 {decoy_berth} 폐기). 입항 {s['h']}시, 터미널 {s['terminal']}.",
            ("vessel", "voyage", "terminal", "berth", "eta"),
        ),
    ]


def surfaces_of(body: str, s: dict, keys: tuple[str, ...]) -> dict[str, str]:
    short = s["vessel"].replace("MV ", "")
    cands: dict[str, list[str]] = {
        "vessel": [s["vessel"], short],
        "voyage": [s["voyage"]],
        "imo": [s["imo"]],
        "port": [s["port"], s["port_ko"], s["unlocode"]],
        "terminal": [s["terminal"]],
        "berth": [s["berth"]],
        "eta": [s["clock"], s["hhmm"], f"{s['h']}시"],
        "etb": [f"{pad(s['etb_h'])}:{pad(s['mi'])}"],
        "etd": [f"{pad(s['etd_h'])}:{pad(s['mi'])}"],
        "cutoff": [s["cutoff"], f"{s['cut_d']} {s['mon']} {s['cut_h']:02d}00", f"{pad(s['cut_h'])}:00"],
    }
    low = body.lower()
    out: dict[str, str] = {}
    for key in keys:
        for cand in cands.get(key, []):
            if cand and cand.lower() in low:
                out[key] = cand
                break
    return out


def example(body: str, s: dict, keys: tuple[str, ...], split: str, kind: str, template_id: str = "", family: str = "") -> dict:
    return {
        "body": body,
        "receivedAt": s["receivedAt"],
        "gold": gold_of(s, keys),
        "surfaces": surfaces_of(body, s, keys),
        "split": split,
        "kind": kind,
        "template_id": template_id,
        "family": family,
    }


# Seen-family templates may appear in train/val/test_id.
# OOD families are never sampled for train or val.
EASY_SEEN_IDS = (0, 1, 2, 3)
EASY_OOD_IDS = (4, 5)
HARD_SEEN_IDS = (0, 1, 2, 3, 4, 5, 6)
HARD_OOD_IDS = (7, 8, 9)


def render_template(s: dict, kind: str, idx: int) -> tuple[str, tuple[str, ...]]:
    pool = easy_templates(s) if kind == "easy" else hard_templates(s)
    return pool[idx]


def sample_row(rng: random.Random, kind: str, ids: tuple[int, ...], split: str, family: str) -> dict:
    s = rand_schedule(rng)
    idx = rng.choice(ids)
    body, keys = render_template(s, kind, idx)
    return example(body, s, keys, split, kind, template_id=f"{kind}:{idx}", family=family)


def build(n_train: int = 1800, n_easy: int = 200, n_hard: int = 400, seed: int = 42) -> dict[str, list]:
    rng = random.Random(seed)
    train, easy, hard = [], [], []
    while len(train) < n_train:
        s = rand_schedule(rng)
        if rng.random() < 0.4:
            body, keys = rng.choice(easy_templates(s))
            kind = "easy"
        else:
            body, keys = rng.choice(hard_templates(s))
            kind = "hard"
        train.append(example(body, s, keys, "train", kind))
    while len(easy) < n_easy:
        s = rand_schedule(rng)
        body, keys = rng.choice(easy_templates(s))
        easy.append(example(body, s, keys, "test_easy", "easy"))
    while len(hard) < n_hard:
        s = rand_schedule(rng)
        body, keys = rng.choice(hard_templates(s))
        hard.append(example(body, s, keys, "test_hard", "hard"))
    return {"train": train, "test_easy": easy, "test_hard": hard}


def write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> None:
    root = Path(__file__).resolve().parent
    data = build()
    for name, rows in data.items():
        write_jsonl(root / "data" / f"{name}.jsonl", rows)
    print({k: len(v) for k, v in data.items()})


if __name__ == "__main__":
    main()
