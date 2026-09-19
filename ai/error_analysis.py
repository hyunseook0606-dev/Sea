"""Write missed fields for error analysis. Synthetic rows only."""

from __future__ import annotations

import json
from pathlib import Path

from crf import SLOT_KEYS, gold_match
from metrics import predict


def collect_errors(rows: list[dict], weights: dict[str, float], extractor: str, limit: int = 40) -> list[dict]:
    out = []
    for row in rows:
        if len(out) >= limit:
            break
        pred = predict(extractor, row["body"], weights)
        misses = []
        for key in SLOT_KEYS:
            expect = (row["gold"].get(key) or "").strip()
            got = (pred.get(key) or "").strip()
            if expect and not gold_match(got, expect):
                misses.append({"key": key, "expect": expect, "got": got or None})
            elif got and not expect:
                misses.append({"key": key, "expect": None, "got": got, "type": "fp"})
        if not misses:
            continue
        out.append(
            {
                "split": row.get("split"),
                "kind": row.get("kind"),
                "template_id": row.get("template_id"),
                "family": row.get("family"),
                "body": row["body"][:400],
                "misses": misses,
            }
        )
    return out


def write_errors(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
