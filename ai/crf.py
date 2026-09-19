"""Linear-chain structured perceptron for maritime schedule slot filling."""

from __future__ import annotations

import json
import math
import random
import re
from collections import defaultdict
from pathlib import Path

TOKEN_RE = re.compile(r"[A-Za-z0-9]+|[가-힣]+|[^\s]", re.UNICODE)
VOY_RE = re.compile(r"^\d{4}[EWNS]$", re.I)
TIME_RE = re.compile(r"^(\d{1,2}:\d{2}|\d{4})$")
BERTH_RE = re.compile(r"^T\d$", re.I)
IMO_RE = re.compile(r"^\d{7}$")

SLOT_KEYS = ("vessel", "voyage", "imo", "port", "terminal", "berth", "eta", "etb", "etd", "cutoff")
LABELS = ["O"] + [f"{bi}-{k}" for k in SLOT_KEYS for bi in ("B", "I")]

GAZ_PORTS = {"BUSAN", "INCHEON", "GWANGYANG", "PUSAN", "부산", "인천", "광양", "KRPUS", "KRINC", "KRKAN"}
GAZ_TERM = {"PNC", "PNIT", "HJNC", "BPT", "HPNT", "BNCT", "PNCT"}
GAZ_VESSEL = {
    "HANARO",
    "BLUE",
    "OCEAN",
    "EASTERN",
    "WIND",
    "NURI",
    "HAEDONG",
    "SEAHAN",
    "BUSAN",
    "STAR",
    "ORION",
    "PACIFIC",
    "GREEN",
    "WAVE",
    "INCHEON",
    "SEA",
    "PIONEER",
    "MV",
}


def tokenize(text: str) -> list[tuple[str, int, int]]:
    return [(m.group(0), m.start(), m.end()) for m in TOKEN_RE.finditer(text)]


def shape(tok: str) -> str:
    out = []
    for ch in tok[:12]:
        if ch.isupper():
            out.append("A")
        elif ch.islower():
            out.append("a")
        elif ch.isdigit():
            out.append("9")
        else:
            out.append(".")
    return "".join(out)


def features(tokens: list[str], i: int) -> list[str]:
    w = tokens[i]
    wl = w.lower()
    feats = [
        "bias",
        f"w={wl}",
        f"sh={shape(w)}",
        f"pre={wl[:3]}",
        f"suf={wl[-3:]}",
        f"dig={int(w.isdigit())}",
        f"voy={int(bool(VOY_RE.match(w)))}",
        f"term={int(w.upper() in GAZ_TERM)}",
        f"ves={int(w.upper() in GAZ_VESSEL)}",
        f"port={int(w.upper() in GAZ_PORTS)}",
        f"berth={int(bool(BERTH_RE.match(w)))}",
        f"imo={int(bool(IMO_RE.match(w)))}",
        f"time={int(bool(TIME_RE.match(w)))}",
        f"hy={int('-' in w)}",
    ]
    if i > 0:
        pw = tokens[i - 1].lower()
        feats.append(f"pw={pw}")
        feats.append(f"psh={shape(tokens[i - 1])}")
        feats.append(f"big={pw}|{wl}")
    else:
        feats.append("bos")
    if i + 1 < len(tokens):
        nw = tokens[i + 1].lower()
        feats.append(f"nw={nw}")
        feats.append(f"nsh={shape(tokens[i + 1])}")
    else:
        feats.append("eos")
    return feats


def align_labels(text: str, gold: dict[str, str]) -> list[str]:
    toks = tokenize(text)
    labels = ["O"] * len(toks)
    items = sorted(((k, v) for k, v in gold.items() if v and k in SLOT_KEYS), key=lambda kv: -len(kv[1]))
    used = [False] * len(toks)
    lower = text.lower()
    for key, value in items:
        needle = value.strip()
        if not needle:
            continue
        idx = lower.find(needle.lower())
        if idx < 0:
            short = needle.replace("MV ", "").strip()
            idx = lower.find(short.lower())
            needle = short if idx >= 0 else needle
        if idx < 0:
            # time fragments
            clock = re.search(r"\d{1,2}:\d{2}", needle)
            if clock:
                idx = lower.find(clock.group(0).lower())
                needle = clock.group(0) if idx >= 0 else needle
        if idx < 0:
            compact = re.search(r"\d{4}", needle.replace(":", ""))
            if compact and key in {"eta", "etb", "etd", "cutoff"}:
                continue
        if idx < 0:
            continue
        end = idx + len(needle)
        first = True
        for i, (_tok, a, b) in enumerate(toks):
            if used[i]:
                continue
            if b <= idx or a >= end:
                continue
            labels[i] = f"{'B' if first else 'I'}-{key}"
            used[i] = True
            first = False
    return labels


class Perceptron:
    def __init__(self) -> None:
        self.w: dict[str, float] = defaultdict(float)
        self.acc: dict[str, float] = defaultdict(float)
        self.t = 1

    def score_emit(self, feats: list[str], lab: str) -> float:
        s = 0.0
        w = self.w
        for f in feats:
            s += w.get(f"{lab}\t{f}", 0.0)
        return s

    def trans(self, prev: str, lab: str) -> float:
        return self.w.get(f"TR\t{prev}|{lab}", 0.0)

    def viterbi(self, feat_seq: list[list[str]]) -> list[str]:
        if not feat_seq:
            return []
        labels = LABELS
        n = len(feat_seq)
        dp = [dict.fromkeys(labels, -1e18) for _ in range(n)]
        bp = [dict.fromkeys(labels, "O") for _ in range(n)]
        for lab in labels:
            dp[0][lab] = self.score_emit(feat_seq[0], lab) + self.trans("*", lab)
        for i in range(1, n):
            feats = feat_seq[i]
            for lab in labels:
                emit = self.score_emit(feats, lab)
                best, bl = -1e18, "O"
                for prev in labels:
                    val = dp[i - 1][prev] + self.trans(prev, lab) + emit
                    if val > best:
                        best, bl = val, prev
                dp[i][lab] = best
                bp[i][lab] = bl
        last = max(labels, key=lambda lab: dp[-1][lab])
        path = [last]
        for i in range(n - 1, 0, -1):
            last = bp[i][last]
            path.append(last)
        path.reverse()
        return path

    def update(self, feats: list[list[str]], gold: list[str], pred: list[str]) -> None:
        if gold == pred:
            self.t += 1
            return
        self._add(feats, gold, 1.0)
        self._add(feats, pred, -1.0)
        self.t += 1

    def _add(self, feats: list[list[str]], labs: list[str], sign: float) -> None:
        prev = "*"
        t = self.t
        for fts, lab in zip(feats, labs):
            key = f"TR\t{prev}|{lab}"
            self.w[key] += sign
            self.acc[key] += sign * t
            for f in fts:
                k = f"{lab}\t{f}"
                self.w[k] += sign
                self.acc[k] += sign * t
            prev = lab

    def averaged(self) -> dict[str, float]:
        t = max(self.t, 1)
        out = {}
        for k, v in self.w.items():
            avg = v - self.acc.get(k, 0.0) / t
            if abs(avg) >= 0.02:
                out[k] = round(avg, 4)
        return out

    def token_score(self, data: list[tuple]) -> tuple[int, int]:
        hit = total = 0
        for _tokens, gold, feats in data:
            pred = self.viterbi(feats)
            for a, b in zip(pred, gold):
                total += 1
                if a == b:
                    hit += 1
        return hit, total


def decode_fields(text: str, tokens: list[tuple[str, int, int]], labels: list[str]) -> dict[str, str]:
    fields: dict[str, str] = {}
    i = 0
    while i < len(labels):
        lab = labels[i]
        if lab.startswith("B-"):
            key = lab[2:]
            start = tokens[i][1]
            end = tokens[i][2]
            j = i + 1
            while j < len(labels) and labels[j] == f"I-{key}":
                end = tokens[j][2]
                j += 1
            fields[key] = text[start:end].strip()
            i = j
            continue
        i += 1
    if fields.get("port"):
        p = fields["port"].upper()
        if p in {"부산", "PUSAN", "KRPUS"}:
            fields["port"] = "BUSAN"
        elif p in {"인천", "KRINC"}:
            fields["port"] = "INCHEON"
        elif p in {"광양", "KRKAN"}:
            fields["port"] = "GWANGYANG"
        else:
            fields["port"] = p
    if fields.get("terminal"):
        fields["terminal"] = fields["terminal"].upper()
    if fields.get("berth"):
        fields["berth"] = fields["berth"].upper()
    if fields.get("voyage"):
        fields["voyage"] = fields["voyage"].upper()
    return fields


def gold_match(got: str, expect: str) -> bool:
    a = re.sub(r"\s+", " ", got.upper()).replace(" LT", "").replace("MV ", "").strip()
    b = re.sub(r"\s+", " ", expect.upper()).replace(" LT", "").replace("MV ", "").strip()
    if not a or not b:
        return False
    if a == b or a in b or b in a:
        return True
    ca, cb = _clock(a), _clock(b)
    return ca is not None and ca == cb


def _clock(s: str) -> tuple[int, int] | None:
    m = re.search(r"(\d{1,2}):(\d{2})", s)
    if m:
        return int(m.group(1)) % 24, int(m.group(2))
    m = re.search(r"\b(\d{2})(\d{2})\b", s)
    if m:
        h, mi = int(m.group(1)), int(m.group(2))
        if h <= 23 and mi <= 59:
            return h, mi
    return None


def score(pred: dict[str, str], gold: dict[str, str]) -> tuple[int, int]:
    hit = total = 0
    for k, expect in gold.items():
        if not expect:
            continue
        total += 1
        if gold_match(pred.get(k, ""), expect):
            hit += 1
    return hit, total


def extract_model(text: str, weights: dict[str, float]) -> dict[str, str]:
    _toks, _labs, fields = decode_with_model(text, weights)
    return fields


def decode_with_model(text: str, weights: dict[str, float]) -> tuple[list[tuple[str, int, int]], list[str], dict[str, str]]:
    model = Perceptron()
    model.w = defaultdict(float, weights)
    toks = tokenize(text)
    if not toks:
        return [], [], {}
    tokens = [t[0] for t in toks]
    feats = [features(tokens, i) for i in range(len(tokens))]
    labs = model.viterbi(feats)
    return toks, labs, decode_fields(text, toks, labs)


def train(
    rows: list[dict],
    epochs: int = 6,
    seed: int = 7,
    on_epoch=None,
) -> tuple[dict[str, float], list[dict]]:
    rng = random.Random(seed)
    model = Perceptron()
    data = []
    for row in rows:
        toks = tokenize(row["body"])
        if not toks:
            continue
        tokens = [t[0] for t in toks]
        gold = align_labels(row["body"], row.get("surfaces") or row["gold"])
        if len(gold) != len(tokens):
            continue
        data.append((tokens, gold, [features(tokens, i) for i in range(len(tokens))]))
    logs: list[dict] = []
    for ep in range(1, epochs + 1):
        rng.shuffle(data)
        updates = 0
        for tokens, gold, feats in data:
            pred = model.viterbi(feats)
            if pred != gold:
                updates += 1
            model.update(feats, gold, pred)
        avg = model.averaged()
        snap = Perceptron()
        snap.w = defaultdict(float, avg)
        tok_hit, tok_total = snap.token_score(data)
        rec = {
            "epoch": ep,
            "train_seq_n": len(data),
            "train_seq_updates": updates,
            "train_token_hit": tok_hit,
            "train_token_total": tok_total,
            "train_token_acc": round(100.0 * tok_hit / tok_total, 1) if tok_total else 0.0,
        }
        if on_epoch:
            rec.update(on_epoch(ep, avg) or {})
        logs.append(rec)
        print("epoch", json.dumps(rec, ensure_ascii=False))
    return model.averaged(), logs
