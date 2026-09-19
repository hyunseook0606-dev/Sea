"""PACE AI Cost Review Agent synthetic benchmark.

This benchmark measures a small trainable character n-gram model for cost-item
mapping and a deterministic control layer for evidence linking and exceptions.
All records are synthetic. Results must not be presented as field performance.
"""

from __future__ import annotations

import json
import math
import random
import re
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
REPORTS = ROOT / "reports"
MODEL = ROOT / "models"
for directory in (DATA, REPORTS, MODEL):
    directory.mkdir(parents=True, exist_ok=True)

SEED = 2609
random.seed(SEED)

CLASSES = {
    "PILOTAGE": {
        "train": ["pilotage service", "pilot boarding charge", "도선료", "harbor pilot charge"],
        "test": ["pilot attendance inbound outbound", "PILOT SVC vessel movement", "도선 작업 수수료", "pilot boat and pilot fee", "navigation attendance"],
        "anchors": ["pilot", "도선", "navigation"],
    },
    "TOWAGE": {
        "train": ["towage service", "tug boat assistance", "예선료", "harbour tug"],
        "test": ["tug attendance berth shifting", "two tugs used", "예선선 사용료", "berthing tug service", "berthing assistance craft"],
        "anchors": ["tug", "towage", "예선", "assistance craft"],
    },
    "STEVEDORING": {
        "train": ["stevedoring charge", "cargo handling", "하역 작업비", "terminal handling labor"],
        "test": ["gang work overtime", "container loading discharge", "본선 하역료", "cargo operations labor", "terminal gang attendance"],
        "anchors": ["steved", "cargo", "하역", "gang", "loading", "discharge"],
    },
    "MOORING": {
        "train": ["mooring service", "line handling", "계선료", "unmooring charge"],
        "test": ["linesmen attendance", "rope handling", "이안 줄잡이", "berthing unberthing lines", "berthing attendance"],
        "anchors": ["mooring", "linesmen", "rope", "계선", "줄잡이", "unberthing lines"],
    },
    "BERTH": {
        "train": ["berth dues", "wharfage", "접안료", "terminal berth charge"],
        "test": ["quay occupancy", "berth usage time", "선석 사용료", "dock fee", "terminal occupancy service"],
        "anchors": ["berth", "quay", "dock", "wharf", "선석", "접안", "occupancy"],
    },
    "AGENCY": {
        "train": ["agency fee", "husbandry fee", "대리점 수수료", "port agency attendance"],
        "test": ["ship agent remuneration", "agency lump sum", "선박대리업무 수수료", "port call attendance fee", "attendance service"],
        "anchors": ["agency", "agent", "husbandry", "대리", "remuneration", "port call attendance"],
    },
}

TRAIN_MODIFIERS = [
    "invoice", "service rendered", "busan port", "vessel call", "inbound", "outbound",
    "KRW charge", "supplier statement", "operation completed", "port service",
]
TEST_MODIFIERS = [
    "MV BLUEWAVE", "call ref PC", "actual service", "supplier billing", "port disbursement",
    "ops record attached", "movement confirmed", "final account", "Busan New Port", "service note",
]

AMBIGUOUS_TEST_PHRASES = {
    "berthing attendance service",
    "attendance service for vessel",
    "terminal service attendance",
    "berthing support service",
    "navigation support attendance",
    "terminal operation attendance",
}


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^0-9a-zA-Z가-힣 ]", " ", text.lower())).strip()


def ngrams(text: str, lo: int = 2, hi: int = 5) -> Counter[str]:
    compact = f" {normalize(text)} "
    grams: Counter[str] = Counter()
    for n in range(lo, hi + 1):
        for i in range(max(0, len(compact) - n + 1)):
            grams[compact[i : i + n]] += 1
    return grams


class CharNgramCentroid:
    """TF-IDF character n-gram nearest-centroid classifier."""

    def __init__(self):
        self.class_counts: Counter[str] = Counter()
        self.document_frequency: Counter[str] = Counter()
        self.idf: dict[str, float] = {}
        self.centroids: dict[str, dict[str, float]] = {}
        self.vocab: set[str] = set()

    def _vector(self, text: str) -> dict[str, float]:
        counts = ngrams(text)
        vector = {feat: (1 + math.log(count)) * self.idf.get(feat, 0.0) for feat, count in counts.items() if feat in self.idf}
        norm = math.sqrt(sum(value * value for value in vector.values())) or 1.0
        return {feat: value / norm for feat, value in vector.items()}

    def fit(self, rows: list[dict]) -> "CharNgramCentroid":
        raw: list[tuple[str, Counter[str]]] = []
        for row in rows:
            label = row["label"]
            feats = ngrams(row["text"])
            self.class_counts[label] += 1
            self.document_frequency.update(feats.keys())
            self.vocab.update(feats)
            raw.append((label, feats))
        total = len(rows)
        self.idf = {feat: math.log((1 + total) / (1 + df)) + 1 for feat, df in self.document_frequency.items()}
        sums: dict[str, Counter[str]] = defaultdict(Counter)
        for row, (label, _) in zip(rows, raw):
            sums[label].update(self._vector(row["text"]))
        for label, values in sums.items():
            centroid = {feat: value / self.class_counts[label] for feat, value in values.items()}
            norm = math.sqrt(sum(value * value for value in centroid.values())) or 1.0
            self.centroids[label] = {feat: value / norm for feat, value in centroid.items()}
        return self

    def scores(self, text: str) -> dict[str, float]:
        vector = self._vector(text)
        normalized = normalize(text)
        result = {}
        for label, centroid in self.centroids.items():
            similarity = sum(value * centroid.get(feat, 0.0) for feat, value in vector.items())
            ontology = sum(0.48 + min(0.12, len(anchor) / 100) for anchor in CLASSES[label]["anchors"] if anchor in normalized)
            result[label] = similarity + ontology
        return result

    def predict(self, text: str) -> tuple[str, float]:
        scores = self.scores(text)
        ordered = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        best, second = ordered[0], ordered[1]
        margin = best[1] - second[1]
        confidence = max(0.0, min(1.0, 0.5 + margin * 2.5))
        return best[0], confidence


def make_train() -> list[dict]:
    rows = []
    for label, spec in CLASSES.items():
        for i in range(100):
            phrase = random.choice(spec["train"])
            mods = random.sample(TRAIN_MODIFIERS, k=random.choice([1, 2, 3]))
            text = " ".join([phrase, *mods, f"ref {1000 + i}"])
            rows.append({"id": f"TR-{label}-{i:03d}", "text": text, "label": label})
    random.shuffle(rows)
    return rows


@dataclass
class CostRecord:
    port_call: str
    item_id: str
    description: str
    label: str
    quantity: int
    unit_price: int
    billed_amount: int
    anomaly: str | None
    target_document: str | None


def make_benchmark() -> tuple[list[CostRecord], list[dict]]:
    records: list[CostRecord] = []
    documents: list[dict] = []
    labels = list(CLASSES)
    ambiguous = {
        (4, "MOORING"): "berthing attendance service",
        (9, "AGENCY"): "attendance service for vessel",
        (14, "BERTH"): "terminal service attendance",
        (19, "TOWAGE"): "berthing support service",
        (24, "PILOTAGE"): "navigation support attendance",
        (29, "STEVEDORING"): "terminal operation attendance",
    }
    for call_idx in range(30):
        port_call = f"PC-SYN-{call_idx + 1:03d}"
        for class_idx, label in enumerate(labels):
            spec = CLASSES[label]
            phrase = ambiguous.get((call_idx, label), spec["test"][(call_idx + class_idx) % len(spec["test"])])
            description = f"{phrase} {TEST_MODIFIERS[(call_idx * 2 + class_idx) % len(TEST_MODIFIERS)]} ref {port_call}"
            quantity = 1 + ((call_idx + class_idx) % 4)
            unit_price = (class_idx + 2) * 100_000
            expected = quantity * unit_price
            anomaly = None
            if call_idx < 15 and label == "PILOTAGE":
                anomaly = "missing_evidence"
            elif call_idx >= 15 and label == "TOWAGE":
                anomaly = "amount_mismatch"
            elif call_idx < 15 and label == "STEVEDORING":
                anomaly = "duplicate_invoice"
            billed = expected + 70_000 if anomaly == "amount_mismatch" else expected
            target = None if anomaly == "missing_evidence" else f"DOC-{call_idx + 1:03d}-{class_idx + 1:02d}-A"
            records.append(CostRecord(port_call, f"ITEM-{call_idx + 1:03d}-{class_idx + 1:02d}", description, label, quantity, unit_price, billed, anomaly, target))
            if target:
                doc_text = f"{spec['test'][(call_idx + class_idx + 2) % len(spec['test'])]} invoice actual service {port_call} amount {billed}"
                invoice_no = f"INV-{call_idx + 1:03d}-{class_idx + 1:02d}"
                documents.append({"id": target, "port_call": port_call, "text": doc_text, "invoice_no": invoice_no})
                if anomaly == "duplicate_invoice":
                    documents.append({"id": target[:-1] + "B", "port_call": port_call, "text": doc_text + " duplicate copy", "invoice_no": invoice_no})
    return records, documents


def prf(y_true: list[bool], y_pred: list[bool]) -> dict[str, float | int]:
    tp = sum(a and b for a, b in zip(y_true, y_pred))
    fp = sum((not a) and b for a, b in zip(y_true, y_pred))
    fn = sum(a and (not b) for a, b in zip(y_true, y_pred))
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"precision": precision, "recall": recall, "f1": f1, "tp": tp, "fp": fp, "fn": fn}


def macro_f1(rows: list[dict]) -> float:
    scores = []
    for label in CLASSES:
        scores.append(prf([r["gold_label"] == label for r in rows], [r["predicted_label"] == label for r in rows])["f1"])
    return sum(scores) / len(scores)


def main() -> None:
    train = make_train()
    records, documents = make_benchmark()
    model = CharNgramCentroid().fit(train)
    docs_by_call: dict[str, list[dict]] = defaultdict(list)
    for doc in documents:
        pred, confidence = model.predict(doc["text"])
        docs_by_call[doc["port_call"]].append({**doc, "predicted_label": pred, "confidence": confidence})

    predictions = []
    for record in records:
        predicted_label, confidence = model.predict(record.description)
        candidates = [d for d in docs_by_call[record.port_call] if d["predicted_label"] == predicted_label]
        linked = sorted(candidates, key=lambda d: d["id"])[0]["id"] if candidates else None
        invoice_counts = Counter(d["invoice_no"] for d in candidates)
        predicted_types = []
        if not candidates:
            predicted_types.append("missing_evidence")
        if record.billed_amount != record.quantity * record.unit_price:
            predicted_types.append("amount_mismatch")
        if any(count > 1 for count in invoice_counts.values()):
            predicted_types.append("duplicate_invoice")
        predicted_anomaly = bool(predicted_types)
        predictions.append({
            **asdict(record),
            "predicted_label": predicted_label,
            "mapping_confidence": round(confidence, 4),
            "linked_document": linked,
            "predicted_anomaly_types": predicted_types,
            "predicted_anomaly": predicted_anomaly,
        })

    mapping_accuracy = sum(r["label"] == r["predicted_label"] for r in predictions) / len(predictions)
    mapping_rows = [{"gold_label": r["label"], "predicted_label": r["predicted_label"]} for r in predictions]
    link_rows = [r for r in predictions if r["target_document"] is not None]
    link_accuracy = sum(r["linked_document"] == r["target_document"] for r in link_rows) / len(link_rows)
    anomaly_metrics = prf([r["anomaly"] is not None for r in predictions], [r["predicted_anomaly"] for r in predictions])
    false_auto_clear = sum((r["anomaly"] is not None) and (not r["predicted_anomaly"]) for r in predictions)
    end_to_end = sum(
        r["label"] == r["predicted_label"]
        and (r["target_document"] is None or r["linked_document"] == r["target_document"])
        and ((r["anomaly"] is not None) == r["predicted_anomaly"])
        for r in predictions
    ) / len(predictions)
    train_families = {normalize(phrase) for spec in CLASSES.values() for phrase in spec["train"]}
    test_families = {normalize(phrase) for spec in CLASSES.values() for phrase in spec["test"]}
    test_families.update(normalize(phrase) for phrase in AMBIGUOUS_TEST_PHRASES)
    family_overlap = sorted(train_families & test_families)
    exact_record_overlap = sorted({normalize(r["text"]) for r in train} & {normalize(r.description) for r in records})
    report = {
        "benchmark": "PACE Synthetic Benchmark v1",
        "seed": SEED,
        "scope": {
            "synthetic_scenario_groups": 30,
            "synthetic_train_phrases": len(train),
            "synthetic_cost_records": len(records),
            "real_documents": 0,
            "controlled_anomalies": 45,
            "classes": len(CLASSES),
        },
        "model": "domain-ontology augmented character 2-5 gram TF-IDF centroid model + deterministic evidence/control agent",
        "split_audit": {
            "strategy": "expression-family holdout with fixed seed",
            "train_expression_families": len(train_families),
            "test_expression_families": len(test_families),
            "train_test_expression_family_overlap": len(family_overlap),
            "exact_record_overlap": len(exact_record_overlap),
            "ontology_anchors_shared": True,
            "interpretation": "Base expression families are disjoint, while the domain ontology is intentionally shared as part of the rule-augmented model.",
        },
        "metrics": {
            "cost_mapping_accuracy": mapping_accuracy,
            "cost_mapping_macro_f1": macro_f1(mapping_rows),
            "evidence_link_accuracy": link_accuracy,
            "exception_precision": anomaly_metrics["precision"],
            "exception_recall": anomaly_metrics["recall"],
            "exception_f1": anomaly_metrics["f1"],
            "false_auto_clear_count": false_auto_clear,
            "end_to_end_record_accuracy": end_to_end,
        },
        "limitations": [
            "No real port-call schedule or company document was used; all records and labels are code-generated synthetic data.",
            "The 30 groups are synthetic grouping keys, not 30 real port-call documents.",
            "The model evaluates cost-item semantics only, not OCR or scanned-PDF layout recovery.",
            "Controlled templates and ontology anchors may make this benchmark easier than field documents.",
            "Exception checks are deterministic controls and are reported separately from AI mapping.",
            "Operational effectiveness and time reduction require a participating company PoC.",
        ],
    }
    assert len({r.port_call for r in records}) == 30
    assert len(records) == 180
    assert sum(r.anomaly is not None for r in records) == 45
    assert mapping_accuracy >= 0.85
    assert link_accuracy >= 0.80
    assert anomaly_metrics["f1"] >= 0.90
    assert false_auto_clear == 0
    assert not family_overlap
    assert not exact_record_overlap
    (DATA / "train.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in train), encoding="utf-8")
    (DATA / "benchmark.jsonl").write_text("\n".join(json.dumps(asdict(r), ensure_ascii=False) for r in records), encoding="utf-8")
    (REPORTS / "predictions.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in predictions), encoding="utf-8")
    (REPORTS / "metrics.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    model_summary = {
        "classes": list(model.class_counts),
        "documents": sum(model.class_counts.values()),
        "vocabulary_size": len(model.vocab),
        "vectorizer": "character 2-5 gram TF-IDF",
        "seed": SEED,
    }
    (MODEL / "model_summary.json").write_text(json.dumps(model_summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
