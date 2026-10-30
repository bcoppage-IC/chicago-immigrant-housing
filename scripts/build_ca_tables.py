"""Build community-area tables for each period.

Sums tract counts to Chicago's 77 community areas and rebuilds
median gross rent from rent-range counts (ACS table B25063).
"""
from pathlib import Path

import numpy as np
import pandas as pd

RAW = Path("data/raw")
OUT = Path("data/processed")
PERIODS = [(2015, 2010), (2024, 2020)]   # (ACS end year, tract vintage)

# Rent ranges B25063_003E to B25063_026E: lower bound of each range
LOWS = [0, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650,
        700, 750, 800, 900, 1000, 1250, 1500, 2000, 2500, 3000, 3500]
HIGHS = LOWS[1:] + [None]                # top range has no upper bound
BINS = [f"B25063_{i:03d}E" for i in range(3, 27)]
BURDEN = ["B25070_007E", "B25070_008E", "B25070_009E", "B25070_010E"]  # 30%+
COUNTS = ["B05002_001E", "B05002_013E", "B25001_001E",
          "B25070_001E", "B25070_011E"] + BURDEN + BINS


def median_from_bins(counts):
    """Linear interpolation inside the range holding the middle renter.
    Returns (median, top_coded)."""
    counts = np.nan_to_num(np.asarray(counts, dtype=float))
    total = counts.sum()
    if total <= 0:
        return np.nan, False
    half = total / 2
    cum = 0.0
    for low, high, n in zip(LOWS, HIGHS, counts):
        if n > 0 and cum + n >= half:
            if high is None:
                return float(low), True
            return low + (half - cum) / n * (high - low), False
        cum += n
    return np.nan, False


def medians(frame):
    m = frame[BINS].apply(lambda r: median_from_bins(r.values),
                          axis=1, result_type="expand")
    return m[0], m[1].astype(bool)


def build(year, vintage):
    base = pd.read_csv(RAW / f"acs5_{year}_cook_tracts.csv", dtype={"GEOID": str})
    rent = pd.read_csv(RAW / f"acs5_{year}_cook_tracts_B25063.csv", dtype={"GEOID": str})
    cw = pd.read_csv(OUT / f"crosswalk_tract{vintage}_to_ca.csv", dtype={"GEOID": str})
    df = cw.merge(base, on="GEOID").merge(rent[["GEOID"] + BINS], on="GEOID")
    df[COUNTS] = df[COUNTS].apply(pd.to_numeric, errors="coerce")
    df[COUNTS] = df[COUNTS].where(df[COUNTS] >= 0)   # drop Census missing codes

    # Method check: rebuilt tract medians vs Census published tract medians
    rebuilt, top = medians(df)
    published = pd.to_numeric(df["B25064_001E"], errors="coerce")
    ok = (published > 0) & ~top & rebuilt.notna()
    gap = (rebuilt[ok] - published[ok]).abs()
    print(f"{year} method check ({ok.sum()} tracts): typical gap ${gap.median():.0f}, "
          f"90% within ${gap.quantile(0.9):.0f}")

    # Add tracts up to community areas
    g = df.groupby(["ca_num", "ca_name"])[COUNTS].sum(min_count=1).reset_index()
    out = pd.DataFrame({
        "ca_num": g["ca_num"],
        "ca_name": g["ca_name"],
        "pop": g["B05002_001E"],
        "foreign_born": g["B05002_013E"],
        "housing_units": g["B25001_001E"],
        "renters": g["B25070_001E"] - g["B25070_011E"],  # rent burden computed
        "cost_burdened": g[BURDEN].sum(axis=1),
    })
    out["fb_share"] = out["foreign_born"] / out["pop"]
    out["burden_share"] = out["cost_burdened"] / out["renters"]
    med, top_ca = medians(g)
    out["median_rent"] = med.round(0)
    out["rent_top_coded"] = top_ca
    tracts = df.groupby("ca_num").size().rename("tracts").reset_index()
    out = out.merge(tracts, on="ca_num")

    path = OUT / f"ca_{year}.csv"
    out.to_csv(path, index=False)
    print(f"{year}: {len(out)} areas, {out['median_rent'].isna().sum()} blank medians, "
          f"{out['rent_top_coded'].sum()} top-coded, median rent "
          f"${out['median_rent'].min():.0f} to ${out['median_rent'].max():.0f} -> {path}")


for year, vintage in PERIODS:
    build(year, vintage)