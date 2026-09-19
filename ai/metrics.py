"""Field-level and token-level metrics for synthetic maritime IE."""

from __future__ import annotations

from collections import Counter

from crf import LABELS, SLOT_KEYS, decode_with_model, extract_model, gold_match
from rules import extract_rules


def merge_hybrid(sea: dict[str, str], rules: dict[str, str]) -> dict[str, str]:
    out = dict(rules)
    out.update({k: v for k, v in sea.items() if v})
    return out


def pack_prf(tp: int, fp: int, fn: int) -> dict:
    prec = tp / (tp + fp) if (tp + fp) else 0.0
    rec = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) else 0.0
    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "precision": round(100.0 * prec, 1),
        "recall": round(100.0 * rec, 1),
        "f1": round(100.0 * f1, 1),
    }


def add_prf(buckets: dict[str, dict[str, int]], pred: dict[str, str], gold: dict[str, str]) -> None:
    for key in SLOT_KEYS:
        expect = (gold.get(key) or "").strip()
        got = (pred.get(key) or "").strip()
        if expect and gold_match(got, expect):
            buckets[key]["tp"] += 1
        elif expect:
            buckets[key]["fn"] += 1
            if got:
                buckets[key]["fp"] += 1
        elif got:
            buckets[key]["fp"] += 1


def field_match(pred: dict[str, str], gold: dict[str, str]) -> tuple[int, int]:
    hit = total = 0
    for key, expect in gold.items():
        if not expect:
            continue
        total += 1
        if gold_match(pred.get(key, ""), expect):
            hit += 1
    return hit, total


def summarize_prf(buckets: dict[str, dict[str, int]]) -> dict:
    by_field = {k: pack_prf(v["tp"], v["fp"], v["fn"]) for k, v in buckets.items()}
    micro = pack_prf(
        sum(v["tp"] for v in buckets.values()),
        sum(v["fp"] for v in buckets.values()),
        sum(v["fn"] for v in buckets.values()),
    )
    active = [
        by_field[k]["f1"]
        for k in SLOT_KEYS
        if buckets[k]["tp"] + buckets[k]["fp"] + buckets[k]["fn"] > 0
    ]
    macro = round(sum(active) / len(active), 1) if active else 0.0
    return {"micro": micro, "macro_f1": macro, "macro_fields": len(active), "by_field": by_field}


def empty_buckets() -> dict[str, dict[str, int]]:
    return {k: {"tp": 0, "fp": 0, "fn": 0} for k in SLOT_KEYS}


def predict(name: str, body: str, weights: dict[str, float] | None) -> dict[str, str]:
    if name == "rules":
        return extract_rules(body)
    if weights is None:
        raise ValueError("SEA/hybrid need weights")
    sea = extract_model(body, weights)
    if name == "sea":
        return sea
    return merge_hybrid(sea, extract_rules(body))


def evaluate_split(rows: list[dict], weights: dict[str, float] | None, extractors: tuple[str, ...] = ("rules", "sea", "hybrid")) -> dict:
    out: dict = {"n": len(rows)}
    for name in extractors:
        if name != "rules" and weights is None:
            continue
        match_hit = match_total = 0
        buckets = empty_buckets()
        for row in rows:
            pred = predict(name, row["body"], weights)
            h, t = field_match(pred, row["gold"])
            match_hit += h
            match_total += t
            add_prf(buckets, pred, row["gold"])
        summary = summarize_prf(buckets)
        out[name] = {
            "hit": match_hit,
            "total": match_total,
            "pct": round(100.0 * match_hit / match_total, 1) if match_total else 0.0,
            **summary,
        }
    return out


def sea_micro_f1(rows: list[dict], weights: dict[str, float]) -> float:
    scored = evaluate_split(rows, weights, extractors=("sea",))
    return float(scored["sea"]["micro"]["f1"])


def token_confusion(rows: list[dict], weights: dict[str, float], limit: int = 20) -> dict:
    from crf import align_labels, tokenize

    counts: Counter[tuple[str, str]] = Counter()
    total = 0
    for row in rows:
        toks, pred, _fields = decode_with_model(row["body"], weights)
        gold = align_labels(row["body"], row.get("surfaces") or row["gold"])
        if len(gold) != len(pred):
            continue
        for g, p in zip(gold, pred):
            total += 1
            if g != p:
                counts[(g, p)] += 1
    pairs = [
        {"gold": g, "pred": p, "n": n}
        for (g, p), n in counts.most_common(limit)
    ]
    return {"tokens": total, "off_diagonal_top": pairs, "labelset": LABELS}


def safety_report(rows: list[dict], weights: dict[str, float], extractor: str = "sea") -> dict:
    """Synthetic safety flags. Not operational failure rates."""
    cutoff_fp = cutoff_neg = 0
    berth_wrong = berth_n = 0
    voyage_wrong = voyage_n = 0
    for row in rows:
        gold = row["gold"]
        pred = predict(extractor, row["body"], weights)
        if not (gold.get("cutoff") or "").strip():
            cutoff_neg += 1
            if (pred.get("cutoff") or "").strip():
                cutoff_fp += 1
        if (gold.get("berth") or "").strip():
            berth_n += 1
            if not gold_match(pred.get("berth", ""), gold["berth"]):
                berth_wrong += 1
        if (gold.get("voyage") or "").strip():
            voyage_n += 1
            if not gold_match(pred.get("voyage", ""), gold["voyage"]):
                voyage_wrong += 1
    def rate(num: int, den: int) -> dict:
        return {"n": num, "d": den, "pct": round(100.0 * num / den, 1) if den else 0.0}

    return {
        "extractor": extractor,
        "hallucinated_cutoff": rate(cutoff_fp, cutoff_neg),
        "wrong_berth": rate(berth_wrong, berth_n),
        "wrong_voyage": rate(voyage_wrong, voyage_n),
        "note": "Synthetic benchmark only. Not a production critical-failure rate.",
    }
