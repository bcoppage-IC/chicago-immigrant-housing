"""Cross-check the community-area tables against CMAP.

CMAP Community Data Snapshots, downloaded by hand from datahub.cmap.illinois.gov:
- 2026 release (ACS 2020-2024), CCA layer -> data/raw/cmap_cds_2026_cca.csv
- 2017 release (ACS 2011-2015), CCA_2017 layer -> data/raw/cmap_cds_2017_cca.csv
The 2017 release has no foreign-born or median rent columns, so only
population and housing units are checked for 2011-2015.
CMAP is a check only, not a data source.
"""
import re
from pathlib import Path

import pandas as pd

CHECKS = [(2024, "cmap_cds_2026_cca.csv"), (2015, "cmap_cds_2017_cca.csv")]
PAIRS = {"pop": "TOT_POP", "foreign_born": "FOR_BORN",
         "housing_units": "HU_TOT", "median_rent": "MED_RENT"}


def key(name):
    """Match names that differ only in case, spaces, punctuation, or a leading 'The'."""
    k = re.sub(r"[^A-Z]", "", str(name).upper())
    return k[3:] if k.startswith("THE") else k


def check(year, cmap_file):
    print(f"=== {year} vs CMAP ({cmap_file}) ===")
    ours = pd.read_csv(Path("data/processed") / f"ca_{year}.csv")
    cmap = pd.read_csv(Path("data/raw") / cmap_file)
    pairs = {o: c for o, c in PAIRS.items() if c in cmap.columns}
    skipped = [o for o in PAIRS if o not in pairs]
    if skipped:
        print(f"Not in CMAP file, skipped: {', '.join(skipped)}")
    ours["key"] = ours["ca_name"].map(key)
    cmap = cmap[["GEOG"] + list(pairs.values())].copy()
    cmap["key"] = cmap["GEOG"].map(key)

    m = ours.merge(cmap, on="key", how="outer", indicator=True)
    unmatched = m[m["_merge"] != "both"]
    print(f"Matched {(m['_merge'] == 'both').sum()} of 77 areas")
    if len(unmatched):
        print("Unmatched names:")
        print(unmatched[["ca_name", "GEOG"]].to_string(index=False))
    m = m[m["_merge"] == "both"].copy()

    for o, c in pairs.items():
        m[f"{o}_pct_diff"] = (m[o] - m[c]) / m[c] * 100
        d = m[f"{o}_pct_diff"].abs()
        line = (f"{o}: typical gap {d.median():.2f}%, "
                f"90% within {d.quantile(0.9):.2f}%, largest {d.max():.2f}%")
        if o != "median_rent":
            city = (m[o].sum() - m[c].sum()) / m[c].sum() * 100
            line += f", city total gap {city:.2f}%"
        print(line)

    cols = [f"{o}_pct_diff" for o in pairs]
    big = m[(m[cols].abs() > 5).any(axis=1)]
    print(f"Areas with any gap over 5%: {len(big)}")
    if len(big):
        print(big[["ca_name"] + cols].round(1).to_string(index=False))

    out = Path("data/processed") / f"cmap_check_{year}.csv"
    m.drop(columns=["key", "_merge"]).to_csv(out, index=False)
    print(f"Saved -> {out}\n")


for year, f in CHECKS:
    check(year, f)