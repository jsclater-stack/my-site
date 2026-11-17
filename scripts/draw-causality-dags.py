"""Draw the four elemental structures for the Causality Audit page.

Writes public/images/causality/{fork,pipe,collider,direct}.png
Run:  python scripts/draw-causality-dags.py
"""

from pathlib import Path

import daft

OUT = Path(__file__).resolve().parents[1] / "public" / "images" / "causality"
OUT.mkdir(parents=True, exist_ok=True)

# Where each node sits: X left, Y right, Z in the middle.
POS = {
    "fork": {"X": (0.6, 0.6), "Z": (1.6, 1.6), "Y": (2.6, 0.6)},
    "pipe": {"X": (0.6, 1.0), "Z": (1.6, 1.0), "Y": (2.6, 1.0)},
    "collider": {"X": (0.6, 1.6), "Z": (1.6, 0.6), "Y": (2.6, 1.6)},
    "direct": {"X": (0.6, 0.6), "Z": (1.6, 1.6), "Y": (2.6, 0.6)},
}

EDGES = {
    "fork": [("Z", "X"), ("Z", "Y"), ("X", "Y", "dashed")],  # X -> Y maybe
    "pipe": [("X", "Z"), ("Z", "Y")],
    "collider": [("X", "Z"), ("Y", "Z")],
    "direct": [("X", "Y")],
}


def draw(name: str) -> None:
    pgm = daft.PGM(shape=[3.2, 2.2], origin=[0, 0], observed_style="inner")
    for node, (x, y) in POS[name].items():
        pgm.add_node(node, rf"${node}$", x, y, scale=1.3)
    for edge in EDGES[name]:
        params = {"linestyle": "--"} if len(edge) == 3 else {}
        pgm.add_edge(edge[0], edge[1], plot_params=params)
    pgm.render()
    out = OUT / f"{name}.png"
    pgm.savefig(str(out), dpi=180)
    print(f"wrote {out}")


for structure in POS:
    draw(structure)
