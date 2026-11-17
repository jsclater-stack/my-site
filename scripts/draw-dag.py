"""Draw the investment-game DAG with the stake fraction as a decision."""

from pathlib import Path

import daft

pgm = daft.PGM(observed_style="inner")

pgm.add_node("f", r"$f$", 3.0, 3.4, aspect=2.6, shape="rectangle")

pgm.add_node("C1", r"$C_1$", 1.6, 2.15)
pgm.add_node("C2", r"$C_2$", 3.0, 2.15)
pgm.add_node("CT", r"$C_T$", 4.4, 2.15)

pgm.add_node("W0", r"$W_0$", 0.3, 0.75, observed=True)
pgm.add_node("W1", r"$W_1$", 1.6, 0.75)
pgm.add_node("W2", r"$W_2$", 3.0, 0.75)
pgm.add_node("WT", r"$W_T$", 4.4, 0.75)

pgm.add_edge("W0", "W1")
pgm.add_edge("W1", "W2")
pgm.add_edge("W2", "WT")
pgm.add_edge("C1", "W1")
pgm.add_edge("C2", "W2")
pgm.add_edge("CT", "WT")
pgm.add_edge("f", "W1")
pgm.add_edge("f", "W2")
pgm.add_edge("f", "WT")

out = Path(__file__).resolve().parents[1] / "public" / "images" / "dag.png"
out.parent.mkdir(parents=True, exist_ok=True)
pgm.render()
pgm.savefig(str(out), dpi=180)
print(f"wrote {out}")
