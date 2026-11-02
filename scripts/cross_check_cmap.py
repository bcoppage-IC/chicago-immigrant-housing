"""Cross-check the 2020-2024 community-area table against CMAP.

CMAP Community Data Snapshots, June 2026 release (ACS 2020-2024),
CCA layer, downloaded by hand from datahub.cmap.illinois.gov.
CMAP is a check only, not a data source.
"""
import re
from pathlib import Path

import pandas as pd

OURS = Path("data/processed/ca_2024.csv")
CMAP = Path("data/raw/cmap_cds_2026_cca.csv")
OUT = Path("data/processed/cmap_check_2024.csv")
PAIRS = {"pop": "TOT_POP", "foreign_born": "FOR_BORN",
         "housing_units": "HU_TOT", "median_rent": "MED_RENT"}


def key(name):
    """Match names that differ only in case, spaces, or punctuation."""
    k = re.sub(r"[^A-Z]", "", str(name).upper())
    return k[3:] if k.startswith("THE") else k


ours = pd.read_csv(OURS)
cmap = pd.read_csv(CMAP)
ours["key"] = ours["ca_name"].map(key)
cmap["key"] = cmap["GEOG"].map(key)

m = ours.merge(cmap[["key", "GEOG"] + list(PAIRS.values())],
               on="key", how="outer", indicator=True)
unmatched = m[m["_merge"] != "both"]
print(f"Matched {(m['_merge'] == 'both').sum()} of 77 areas")
if len(unmatched):
    print("Unmatched names:")
    print(unmatched[["ca_name", "GEOG"]].to_string(index=False))
m = m[m["_merge"] == "both"].copy()

for ours_col, cmap_col in PAIRS.items():
    m[f"{ours_col}_pct_diff"] = (m[ours_col] - m[cmap_col]) / m[cmap_col] * 100
    d = m[f"{ours_col}_pct_diff"].abs()
    line = (f"{ours_col}: typical gap {d.median():.2f}%, "
            f"90% within {d.quantile(0.9):.2f}%, largest {d.max():.2f}%")
    if ours_col != "median_rent":
        city = (m[ours_col].sum() - m[cmap_col].sum()) / m[cmap_col].sum() * 100
        line += f", city total gap {city:.2f}%"
    print(line)

big = m[(m[[f"{c}_pct_diff" for c in PAIRS]].abs() > 5).any(axis=1)]
print(f"\nAreas with any gap over 5%: {len(big)}")
if len(big):
    print(big[["ca_name"] + [f"{c}_pct_diff" for c in PAIRS]]
          .round(1).to_string(index=False))

m.drop(columns=["key", "_merge"]).to_csv(OUT, index=False)
print(f"\nSaved -> {OUT}")