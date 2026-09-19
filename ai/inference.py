"""CLI inference for the exported SEA extractor. No training, no test leakage."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from crf import extract_model  # noqa: E402
from metrics import merge_hybrid  # noqa: E402
from rules import extract_rules  # noqa: E402

DEFAULT_WEIGHTS = ROOT / "models" / "best.json"
APP_WEIGHTS = ROOT.parent / "src" / "models" / "sea-extractor.json"


def load_weights(path: Path) -> dict[str, float]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload["weights"] if "weights" in payload else payload


def infer(text: str, mode: str, weights: dict[str, float]) -> dict[str, str]:
    if mode == "rules":
        return extract_rules(text)
    sea = extract_model(text, weights)
    if mode == "sea":
        return sea
    return merge_hybrid(sea, extract_rules(text))


def main() -> None:
    parser = argparse.ArgumentParser(description="SEA schedule slot extraction")
    parser.add_argument("--text", help="raw document")
    parser.add_argument("--file", help="utf-8 text file")
    parser.add_argument("--mode", default="hybrid", choices=["rules", "sea", "hybrid"])
    parser.add_argument("--weights", default="")
    args = parser.parse_args()
    body = args.text or (Path(args.file).read_text(encoding="utf-8") if args.file else sys.stdin.read())
    wpath = Path(args.weights) if args.weights else (DEFAULT_WEIGHTS if DEFAULT_WEIGHTS.exists() else APP_WEIGHTS)
    weights = load_weights(wpath) if args.mode != "rules" else {}
    print(json.dumps({"mode": args.mode, "fields": infer(body, args.mode, weights)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
