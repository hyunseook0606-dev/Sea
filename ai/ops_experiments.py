"""
SEA operational-review experiments (not a risk model).

Source of truth for the contest prototype is TypeScript:
  sea-platform/src/clocks.ts
  sea-platform/src/experiments.ts

This file is a Colab/Jupyter twin of the rule-sensitivity grid:
  input change → company rule → review trigger.

It does NOT train a predictor and does NOT emit probabilities.

Run:
  python ai/ops_experiments.py
  python ai/ops_experiments.py --no-plot

Notebook:
  ai/ops_experiments.ipynb
"""

from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

ETA_REVIEW_HOURS = 6
MIN_CONNECTION_HOURS = 24
BASE_ETA = datetime(2026, 9, 12, 6, 0)
BASE_ETB = datetime(2026, 9, 12, 8, 0)
BASE_ETD = datetime(2026, 9, 12, 18, 0)

ETA_HOURS = [0, 2, 4, 6, 8, 12, 18, 24]
SLACK_HOURS = [48, 30, 24, 20, 12, 10, 0, -6]

HERE = Path(__file__).resolve().parent
REPORTS = HERE / "reports"

PLOT_SHORT = {
    "일반 모니터링": "monitor",
    "ETA 창 확인": "ETA",
    "연결항차 확인": "connect",
    "연결 여유 부족": "tight",
    "내륙 게이트 확인": "inland",
    "접안 ETB 재확인": "ETB",
    "연결 + ETA 확인": "conn+ETA",
    "연결 + 내륙 확인": "conn+inland",
    "ETA + 내륙 확인": "ETA+inland",
}

SHORT = {
    "일반 모니터링": "모니터",
    "ETA 창 확인": "ETA",
    "연결항차 확인": "연결",
    "연결 여유 부족": "부족",
    "내륙 게이트 확인": "내륙",
    "접안 ETB 재확인": "ETB",
    "연결 + ETA 확인": "연결+ETA",
    "연결 + 내륙 확인": "연결+내륙",
    "ETA + 내륙 확인": "ETA+내륙",
}

PALETTE = {
    "일반 모니터링": "#d1d5db",
    "ETA 창 확인": "#93c5fd",
    "연결항차 확인": "#fcd34d",
    "연결 여유 부족": "#fca5a5",
    "내륙 게이트 확인": "#c4b5fd",
    "접안 ETB 재확인": "#67e8f9",
    "연결 + ETA 확인": "#fdba74",
    "연결 + 내륙 확인": "#f9a8d4",
    "ETA + 내륙 확인": "#a5b4fc",
}


def hours_between(a: datetime, b: datetime) -> float:
    return round(((b - a).total_seconds() / 3600) * 10) / 10


def review_tags(eta_delta: float, slack: float, *, berth_changed: bool = False, etb_updated: bool = True) -> list[str]:
    tags: list[str] = []
    eta_changed = eta_delta != 0
    if slack < 0:
        tags.append("connection_tight")
    elif slack < MIN_CONNECTION_HOURS:
        tags.append("connection_review")
    if eta_changed and abs(eta_delta) >= ETA_REVIEW_HOURS:
        tags.append("eta_review")
    incoming_eta = BASE_ETA + timedelta(hours=eta_delta)
    new_eta_vs_old_etb = hours_between(BASE_ETB, incoming_eta)
    if (not etb_updated) and new_eta_vs_old_etb > 0:
        tags.append("etb_stale")
    if berth_changed:
        tags.append("inland_review")
    if not tags:
        tags.append("monitor")
    return tags


def label_of(tags: list[str]) -> str:
    if "connection_tight" in tags:
        return "연결 여유 부족"
    if "connection_review" in tags and "eta_review" in tags:
        return "연결 + ETA 확인"
    if "connection_review" in tags and "inland_review" in tags:
        return "연결 + 내륙 확인"
    if "connection_review" in tags:
        return "연결항차 확인"
    if "etb_stale" in tags:
        return "접안 ETB 재확인"
    if "eta_review" in tags and "inland_review" in tags:
        return "ETA + 내륙 확인"
    if "eta_review" in tags:
        return "ETA 창 확인"
    if "inland_review" in tags:
        return "내륙 게이트 확인"
    return "일반 모니터링"


def grid_cells() -> list[dict]:
    rows = []
    for eta in ETA_HOURS:
        for slack in SLACK_HOURS:
            tags = review_tags(eta, slack)
            rows.append(
                {
                    "eta_delta": eta,
                    "slack_hours": slack,
                    "berth_changed": False,
                    "etb_updated": True,
                    "tags": tags,
                    "label": label_of(tags),
                    "r6_cutoff_from_eta": False,
                }
            )
    return rows


def extras() -> list[dict]:
    berth = review_tags(6, 30, berth_changed=True, etb_updated=True)
    stale = review_tags(6, 30, berth_changed=False, etb_updated=False)
    return [
        {
            "case": "ETA +6h, slack 30h, T2→T3",
            "eta_delta": 6,
            "slack_hours": 30,
            "berth_changed": True,
            "etb_updated": True,
            "label": label_of(berth),
            "tags": berth,
            "r6_cutoff_from_eta": False,
        },
        {
            "case": "ETA +6h, slack 30h, ETB 미갱신",
            "eta_delta": 6,
            "slack_hours": 30,
            "berth_changed": False,
            "etb_updated": False,
            "label": label_of(stale),
            "tags": stale,
            "r6_cutoff_from_eta": False,
        },
    ]


def matrix(cells: list[dict]) -> list[list[str]]:
    lookup = {(c["eta_delta"], c["slack_hours"]): c["label"] for c in cells}
    return [[lookup[(eta, slack)] for slack in SLACK_HOURS] for eta in ETA_HOURS]


def ascii_heatmap(mat: list[list[str]]) -> str:
    header = "ETAΔ\\slack " + " ".join(f"{s:>8}" for s in SLACK_HOURS)
    lines = [header, "-" * len(header)]
    for eta, row in zip(ETA_HOURS, mat):
        cells = " ".join(f"{SHORT.get(lab, lab):>8}" for lab in row)
        lines.append(f"+{eta:>3}h     {cells}")
    lines.append("")
    lines.append("Labels are review triggers. Not P(missed connection). R6 Cut-off-from-ETA never fires.")
    return "\n".join(lines)


def write_csv(path: Path, cells: list[dict], extra_rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = ["eta_delta", "slack_hours", "berth_changed", "etb_updated", "label", "r6_cutoff_from_eta", "case"]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for c in cells:
            w.writerow({**c, "case": "grid"})
        for c in extra_rows:
            w.writerow(c)


def plot_heatmap(mat: list[list[str]], path: Path) -> Optional[Path]:
    try:
        import matplotlib.pyplot as plt
        from matplotlib.colors import ListedColormap
        from matplotlib.patches import Patch
    except ImportError:
        print("matplotlib not installed - skip PNG. pip install matplotlib")
        return None

    labels = []
    for row in mat:
        for lab in row:
            if lab not in labels:
                labels.append(lab)
    cmap = ListedColormap([PALETTE.get(lab, "#e5e7eb") for lab in labels])
    index = {lab: i for i, lab in enumerate(labels)}
    data = [[index[lab] for lab in row] for row in mat]

    fig, ax = plt.subplots(figsize=(11, 5.8))
    ax.imshow(data, cmap=cmap, vmin=-0.5, vmax=len(labels) - 0.5, aspect="auto")
    ax.set_xticks(range(len(SLACK_HOURS)), [f"{h}h" for h in SLACK_HOURS])
    ax.set_yticks(range(len(ETA_HOURS)), [f"+{h}h" for h in ETA_HOURS])
    ax.set_xlabel("Connecting slack (connecting ETD − own ETD)")
    ax.set_ylabel("ETA change vs confirmed")
    ax.set_title("SEA Operational Review sensitivity (rule triggers, not risk %)")
    for i, row in enumerate(mat):
        for j, lab in enumerate(row):
            ax.text(j, i, PLOT_SHORT.get(lab, lab), ha="center", va="center", fontsize=8, color="#111827")
    ax.legend(
        handles=[
            Patch(facecolor=PALETTE.get(lab, "#e5e7eb"), edgecolor="#111827", label=PLOT_SHORT.get(lab, lab))
            for lab in labels
        ],
        bbox_to_anchor=(1.02, 1),
        loc="upper left",
        frameon=False,
        fontsize=8,
    )
    fig.tight_layout()
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=140, bbox_inches="tight")
    plt.close(fig)
    return path


def run(write_plot: bool = True) -> dict:
    cells = grid_cells()
    extra_rows = extras()
    mat = matrix(cells)
    payload = {
        "note": "Python twin of clocks.ts review triggers. TypeScript engine is source of truth.",
        "policy": {"etaReviewHours": ETA_REVIEW_HOURS, "minConnectionHours": MIN_CONNECTION_HOURS},
        "etaHours": ETA_HOURS,
        "slackHours": SLACK_HOURS,
        "r6NeverFires": all(not c["r6_cutoff_from_eta"] for c in cells + extra_rows),
        "matrix": mat,
        "extras": extra_rows,
        "example": [
            {"eta": 2, "slack": 30, "label": label_of(review_tags(2, 30))},
            {"eta": 4, "slack": 30, "label": label_of(review_tags(4, 30))},
            {"eta": 8, "slack": 30, "label": label_of(review_tags(8, 30))},
            {"eta": 4, "slack": 20, "label": label_of(review_tags(4, 20))},
            {"eta": 4, "slack": 10, "label": label_of(review_tags(4, 10))},
            {"eta": 8, "slack": 10, "label": label_of(review_tags(8, 10))},
        ],
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "ops_sensitivity.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(REPORTS / "ops_sensitivity.csv", cells, extra_rows)
    png = None
    if write_plot:
        png = plot_heatmap(mat, REPORTS / "ops_sensitivity_heatmap.png")
        payload["png"] = str(png) if png else None
    print(ascii_heatmap(mat))
    print("extras:")
    for row in extra_rows:
        print(f"  {row['case']}: {row['label']}")
    print("wrote", REPORTS / "ops_sensitivity.json")
    if png:
        print("wrote", png)
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="SEA rule-sensitivity experiment (not a risk model)")
    parser.add_argument("--no-plot", action="store_true")
    args = parser.parse_args()
    run(write_plot=not args.no_plot)


if __name__ == "__main__":
    main()
