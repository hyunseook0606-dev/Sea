"""Train SEA extractor. Validation only for model selection. Test is evaluate.py."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from crf import train  # noqa: E402
from dataset import build_v2, load_config, write_splits  # noqa: E402
from evaluate import run as run_test  # noqa: E402
from metrics import evaluate_split  # noqa: E402

CHECKPOINTS = ROOT / "checkpoints"
MODELS = ROOT / "models"
SRC_MODELS = ROOT.parent / "src" / "models"
LABELS = [
    "O",
    "B-vessel",
    "I-vessel",
    "B-voyage",
    "I-voyage",
    "B-imo",
    "I-imo",
    "B-port",
    "I-port",
    "B-terminal",
    "I-terminal",
    "B-berth",
    "I-berth",
    "B-eta",
    "I-eta",
    "B-etb",
    "I-etb",
    "B-etd",
    "I-etd",
    "B-cutoff",
    "I-cutoff",
]


def save_payload(path: Path, weights: dict[str, float], extra: dict | None = None) -> None:
    payload = {"version": 2, "protocol": "v2-val-select-ood", "labels": LABELS, "weights": weights}
    if extra:
        payload.update(extra)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    cfg = load_config()
    data = build_v2(cfg)
    write_splits(data)
    print("dataset", {k: len(v) for k, v in data.items()})

    best_f1 = -1.0
    best_epoch = 0
    best_weights: dict[str, float] = {}
    CHECKPOINTS.mkdir(parents=True, exist_ok=True)

    def on_epoch(ep: int, weights: dict[str, float]) -> dict:
        nonlocal best_f1, best_epoch, best_weights
        val = evaluate_split(data["val"], weights, extractors=("sea",))
        f1 = float(val["sea"]["micro"]["f1"])
        field_pct = val["sea"]["pct"]
        save_payload(CHECKPOINTS / f"epoch_{ep}.json", weights, {"epoch": ep, "val_micro_f1": f1})
        if f1 > best_f1 or (f1 == best_f1 and ep < best_epoch):
            best_f1 = f1
            best_epoch = ep
            best_weights = weights
            save_payload(MODELS / "best.json", weights, {"epoch": ep, "val_micro_f1": f1, "selected_on": "val"})
        return {
            "val_micro_f1": f1,
            "val_field_pct": field_pct,
            "val_n": val["n"],
            "best_epoch": best_epoch,
            "best_val_micro_f1": best_f1,
        }

    _last, logs = train(data["train"], epochs=int(cfg.get("epochs", 6)), seed=int(cfg.get("seed", 7)), on_epoch=on_epoch)
    if not best_weights:
        best_weights = _last
        best_epoch = int(cfg.get("epochs", 6))
        save_payload(MODELS / "best.json", best_weights, {"epoch": best_epoch, "selected_on": "last"})

    save_payload(
        SRC_MODELS / "sea-extractor.json",
        best_weights,
        {"epoch": best_epoch, "val_micro_f1": best_f1, "selected_on": "val"},
    )
    (MODELS / "train_log.json").write_text(json.dumps(logs, ensure_ascii=False, indent=2), encoding="utf-8")
    print("best_epoch", best_epoch, "best_val_micro_f1", best_f1)
    print("running test once via evaluate.py")
    run_test(MODELS / "best.json")
    # attach epoch log to app metrics
    metrics_path = SRC_MODELS / "sea-metrics.json"
    app = json.loads(metrics_path.read_text(encoding="utf-8"))
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
    app["best_epoch"] = best_epoch
    app["best_val_micro_f1"] = best_f1
    app["train_n"] = len(data["train"])
    metrics_path.write_text(json.dumps(app, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", MODELS / "best.json")


if __name__ == "__main__":
    main()
