"""Load experiment config and build train/val/test splits.

test_id  = unseen instances, seen template family
test_ood = unseen instances AND unseen template ids
Test rows are never returned in train or val.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from generate import (
    EASY_OOD_IDS,
    EASY_SEEN_IDS,
    HARD_OOD_IDS,
    HARD_SEEN_IDS,
    sample_row,
    write_jsonl,
)

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"


def load_config(path: Path | None = None) -> dict:
    cfg_path = path or ROOT / "config.yaml"
    out: dict = {}
    for raw in cfg_path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line or ":" not in line:
            continue
        key, val = line.split(":", 1)
        key, val = key.strip(), val.strip().strip('"').strip("'")
        if val.lower() in {"true", "false"}:
            out[key] = val.lower() == "true"
            continue
        try:
            out[key] = int(val) if "." not in val else float(val)
        except ValueError:
            out[key] = val
    return out


def _fill(rng: random.Random, n: int, kind: str, ids: tuple[int, ...], split: str, family: str) -> list[dict]:
    rows = []
    while len(rows) < n:
        rows.append(sample_row(rng, kind, ids, split, family))
    return rows


def build_v2(cfg: dict | None = None) -> dict[str, list[dict]]:
    cfg = cfg or load_config()
    rng = random.Random(int(cfg.get("data_seed", 42)))
    n_train = int(cfg.get("n_train", 1600))
    easy_frac = float(cfg.get("train_easy_frac", 0.4))
    n_train_easy = int(round(n_train * easy_frac))
    n_train_hard = n_train - n_train_easy
    n_val = int(cfg.get("n_val", 200))
    n_val_easy = n_val // 2
    n_val_hard = n_val - n_val_easy

    train = _fill(rng, n_train_easy, "easy", EASY_SEEN_IDS, "train", "seen")
    train += _fill(rng, n_train_hard, "hard", HARD_SEEN_IDS, "train", "seen")
    rng.shuffle(train)

    val = _fill(rng, n_val_easy, "easy", EASY_SEEN_IDS, "val", "seen")
    val += _fill(rng, n_val_hard, "hard", HARD_SEEN_IDS, "val", "seen")

    test_id_easy = _fill(rng, int(cfg.get("n_test_id_easy", 150)), "easy", EASY_SEEN_IDS, "test_id", "seen")
    test_id_hard = _fill(rng, int(cfg.get("n_test_id_hard", 250)), "hard", HARD_SEEN_IDS, "test_id", "seen")
    test_ood_easy = _fill(rng, int(cfg.get("n_test_ood_easy", 80)), "easy", EASY_OOD_IDS, "test_ood", "ood")
    test_ood_hard = _fill(rng, int(cfg.get("n_test_ood_hard", 200)), "hard", HARD_OOD_IDS, "test_ood", "ood")

    return {
        "train": train,
        "val": val,
        "test_id_easy": test_id_easy,
        "test_id_hard": test_id_hard,
        "test_ood_easy": test_ood_easy,
        "test_ood_hard": test_ood_hard,
    }


def write_splits(data: dict[str, list[dict]]) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    for name, rows in data.items():
        write_jsonl(DATA / f"{name}.jsonl", rows)
    meta = {k: len(v) for k, v in data.items()}
    (DATA / "splits.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


if __name__ == "__main__":
    splits = build_v2()
    write_splits(splits)
    print({k: len(v) for k, v in splits.items()})
