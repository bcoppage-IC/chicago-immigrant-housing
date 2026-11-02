"""
Map of change in foreign-born share by community area,
2011-2015 to 2020-2024. Areas flagged use_with_care or small_sample get a hatch pattern.
"""
from pathlib import Path

import geopandas as gpd
import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.colors import TwoSlopeNorm
from matplotlib.patches import Patch

AREAS = Path("data/raw/community_areas.geojson")
TABLE = Path("data/processed/ca_combined.csv")
OUT = Path("outputs/map_fb_share_change.png")

areas = gpd.read_file(AREAS).to_crs(3435)
num_col = next(c for c in ["area_numbe", "area_num_1", "area_number"] if c in areas.columns)
areas["ca_num"] = pd.to_numeric(areas[num_col]).astype(int)
df = pd.read_csv(TABLE)
g = areas[["ca_num", "geometry"]].merge(df, on="ca_num", validate="1:1")
assert len(g) == 77, f"expected 77 areas, got {len(g)}"

v = g["fb_share_chg_pts"]
lim = max(abs(v.min()), abs(v.max()))
fig, ax = plt.subplots(figsize=(8, 10))
g.plot(column="fb_share_chg_pts", cmap="RdBu_r",
       norm=TwoSlopeNorm(vmin=-lim, vcenter=0, vmax=lim),
       edgecolor="0.6", linewidth=0.5, ax=ax, legend=True,
       legend_kwds={"label": "Change in foreign-born share (percentage points)",
                    "shrink": 0.6})
flag = g[g["use_with_care"] | g["small_sample"]]
flag.plot(facecolor="none", edgecolor="black", hatch="///", linewidth=0.5, ax=ax)

ax.set_title("Change in foreign-born share, 2011-2015 to 2020-2024\n"
             "Chicago community areas", fontsize=13)
ax.set_axis_off()
ax.legend(handles=[Patch(facecolor="none", edgecolor="black", hatch="///",
                         label="Use with care or small sample")],
          loc="lower left", frameon=False)
ax.text(0, 0, "Source: U.S. Census Bureau, ACS 5-year estimates, table B05002. "
         "Red = share rose, blue = share fell.", fontsize=8, transform=ax.transAxes, va="top")

OUT.parent.mkdir(exist_ok=True)
fig.savefig(OUT, dpi=200, bbox_inches="tight")
print(f"Saved -> {OUT}")
print("Largest rises:", ", ".join(g.nlargest(3, "fb_share_chg_pts")
      .apply(lambda r: f"{r.ca_name} (+{r.fb_share_chg_pts:.1f})", axis=1)))
print("Largest drops:", ", ".join(g.nsmallest(3, "fb_share_chg_pts")
      .apply(lambda r: f"{r.ca_name} ({r.fb_share_chg_pts:.1f})", axis=1)))