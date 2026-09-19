"""Final evaluation on test splits. Do not call during training."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from dataset import load_jsonl  # noqa: E402
from error_analysis import collect_errors, write_errors  # noqa: E402
from metrics import evaluate_split, safety_report, token_confusion  # noqa: E402

REPORTS = ROOT / "reports"
MODELS = ROOT / "models"
SRC_MODELS = ROOT.parent / "src" / "models"

LEGACY_V1 = {
    "protocol": "v1-same-template-test-peek",
    "hard_sea_field_match": 95.6,
    "hard_rules_field_match": 53.6,
    "hard_sea_micro_f1": 95.6,
    "hard_hybrid_micro_f1": 89.1,
    "easy_sea_field_match": 83.0,
    "note": "Frozen. Same template family as train. Test scored every epoch. Not a new run.",
}


def load_weights(path: Path) -> dict[str, float]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload["weights"] if "weights" in payload else payload


def run(weights_path: Path, data_dir: Path | None = None) -> dict:
    data_dir = data_dir or ROOT / "data"
    weights = load_weights(weights_path)
    splits = {
        "test_id_easy": load_jsonl(data_dir / "test_id_easy.jsonl"),
        "test_id_hard": load_jsonl(data_dir / "test_id_hard.jsonl"),
        "test_ood_easy": load_jsonl(data_dir / "test_ood_easy.jsonl"),
        "test_ood_hard": load_jsonl(data_dir / "test_ood_hard.jsonl"),
    }
    scored = {name: evaluate_split(rows, weights) for name, rows in splits.items()}
    ood_hard = splits["test_ood_hard"]
    report = {
        "protocol": "v2-val-select-ood",
        "task": "maritime schedule information extraction (synthetic, not operational data)",
        "model": "linear-chain averaged perceptron (BIO slots)",
        "weights": str(weights_path),
        "test_used_during_training": False,
        "legacy_v1": LEGACY_V1,
        "splits": {k: len(v) for k, v in splits.items()},
        "test_id_easy": scored["test_id_easy"],
        "test_id_hard": scored["test_id_hard"],
        "test_ood_easy": scored["test_ood_easy"],
        "test_ood_hard": scored["test_ood_hard"],
        "safety_ood_hard_sea": safety_report(ood_hard, weights, "sea"),
        "safety_ood_hard_rules": safety_report(ood_hard, weights, "rules"),
        "token_confusion_ood_hard": token_confusion(ood_hard, weights),
        "note": (
            "test_id = unseen instances, seen templates. "
            "test_ood = unseen templates. "
            "Field match uses gold slots only. micro F1 includes FP. "
            "Safety rates are synthetic flags, not production critical-failure."
        ),
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "test.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    errors = collect_errors(ood_hard, weights, "sea", limit=40)
    write_errors(REPORTS / "errors_ood_hard.jsonl", errors)

    # App-facing snapshot: keep v1 keys as aliases of test_id for the UI,
    # and expose OOD separately so 95.6 is not silently replaced.
    app = {
        "protocol": report["protocol"],
        "task": report["task"],
        "model": report["model"],
        "train_n": json.loads((data_dir / "splits.json").read_text(encoding="utf-8")).get("train"),
        "legacy_v1": LEGACY_V1,
        "easy": scored["test_id_easy"],
        "hard": scored["test_id_hard"],
        "test_ood_easy": scored["test_ood_easy"],
        "test_ood_hard": scored["test_ood_hard"],
        "safety_ood_hard_sea": report["safety_ood_hard_sea"],
        "note": report["note"],
    }
    SRC_MODELS.mkdir(parents=True, exist_ok=True)
    log_path = MODELS / "train_log.json"
    if log_path.exists():
        logs = json.loads(log_path.read_text(encoding="utf-8"))
        app["epochs"] = [
            {
                "epoch": e["epoch"],
                "train_token_acc": e.get("train_token_acc"),
                "train_seq_updates": e.get("train_seq_updates"),
                "val_micro_f1": e.get("val_micro_f1"),
                "val_field_pct": e.get("val_field_pct"),
            }
            for e in logs
        ]
        if logs:
            best = max(logs, key=lambda e: (e.get("best_val_micro_f1") or 0, -e["epoch"]))
            app["best_epoch"] = best.get("best_epoch")
            app["best_val_micro_f1"] = best.get("best_val_micro_f1")
    (SRC_MODELS / "sea-metrics.json").write_text(json.dumps(app, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", default=str(MODELS / "best.json"))
    args = parser.parse_args()
    report = run(Path(args.weights))
    summary = {
        "test_id_hard_sea_f1": report["test_id_hard"]["sea"]["micro"]["f1"],
        "test_id_hard_rules_f1": report["test_id_hard"]["rules"]["micro"]["f1"],
        "test_ood_hard_sea_f1": report["test_ood_hard"]["sea"]["micro"]["f1"],
        "test_ood_hard_rules_f1": report["test_ood_hard"]["rules"]["micro"]["f1"],
        "legacy_v1_hard_sea_field_match": LEGACY_V1["hard_sea_field_match"],
    }
    print(json.dumps(summary, indent=2))
    print("wrote", REPORTS / "test.json")


if __name__ == "__main__":
    main()
