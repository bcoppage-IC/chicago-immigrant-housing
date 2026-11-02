"""
Scatter plot: change in foreign-born share vs. real rent change,
2011-2015 to 2020-2024, by community area.
Hollow points: use_with_care, small_sample, or top-coded rent in either period.
Trend line and r use solid (unflagged) points only.
"""
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

TABLE = Path("data/processed/ca_combined.csv")
OUT = Path("outputs/scatter_fb_vs_rent.png")
X, Y = "fb_share_chg_pts", "rent_real_pct_chg"

df = pd.read_csv(TABLE)
assert len(df) == 77, f"expected 77 areas, got {len(df)}"
df = df.dropna(subset=[X, Y])

flagged = (df["use_with_care"].astype(bool) | df["small_sample"].astype(bool)
           | df["rent_top_coded_2015"].astype(bool) | df["rent_top_coded_2024"].astype(bool))
solid, hollow = df[~flagged], df[flagged]

fig, ax = plt.subplots(figsize=(9, 7))
ax.axhline(0, color="0.8", linewidth=0.8)
ax.axvline(0, color="0.8", linewidth=0.8)
ax.scatter(solid[X], solid[Y], s=40, color="#2b6cb0", label="Community area")
ax.scatter(hollow[X], hollow[Y], s=40, facecolors="none", edgecolors="#2b6cb0",
           label="Use with care, small sample, or top-coded rent")

slope, intercept = np.polyfit(solid[X], solid[Y], 1)
r = np.corrcoef(solid[X], solid[Y])[0, 1]
xs = np.linspace(df[X].min(), df[X].max(), 100)
ax.plot(xs, slope * xs + intercept, color="0.3", linewidth=1, linestyle="--",
        label=f"Trend line (solid points only), r = {r:.2f}")

top = df.loc[df[X].abs().sort_values(ascending=False).index[:6]]
for _, row in top.iterrows():
        ax.annotate(row["ca_name"].title().replace("Ohare", "O'Hare"), (row[X], row[Y]),
                xytext=(4, -10) if row["ca_name"] == "IRVING PARK" else (4, 4),
                textcoords="offset points", fontsize=8)
ax.set_xlabel("Change in foreign-born share (percentage points)")
ax.set_ylabel("Change in median rent, 2024 dollars (percent)")
ax.set_title("Foreign-born share change vs. rent change, 2011-2015 to 2020-2024\n"
             "Chicago community areas", fontsize=13)
ax.legend(loc="best", frameon=False, fontsize=9)
fig.text(0.01, -0.02, "Source: U.S. Census Bureau, ACS 5-year estimates, tables B05002 and B25063. "
         "2015 rents converted to 2024 dollars with R-CPI-U-RS. Shows a link, not a cause.",
         fontsize=8)

OUT.parent.mkdir(exist_ok=True)
fig.savefig(OUT, dpi=200, bbox_inches="tight")
print(f"Saved -> {OUT}")
print(f"Points: {len(solid)} solid, {len(hollow)} hollow")
print(f"r = {r:.2f}, slope = {slope:.2f} rent pct per 1 pt share change")
print(f"Rent change range: {df[Y].min():.3f} to {df[Y].max():.3f}")