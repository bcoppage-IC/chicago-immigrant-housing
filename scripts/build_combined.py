"""Join the two community-area tables into one 77-row table with change columns.

2011-2015 median rent is converted to 2024 dollars with the R-CPI-U-RS
factor from data/processed/inflation_factor.json.
Shares change in percentage points. Counts change in number and percent.
"""
import json
from pathlib import Path

import pandas as pd

P = Path("data/processed")
OUT = P / "ca_combined.csv"
CARE = {"WOODLAWN", "SOUTH SHORE", "FULLER PARK"}   # see README, Methods 9
COUNTS = ["pop", "foreign_born", "recent_fb_arrivals", "housing_units",
          "renters", "cost_burdened"]
SHARES = ["fb_share", "recent_arrival_share", "burden_share"]

factor = json.loads((P / "inflation_factor.json").read_text())["factor"]
a = pd.read_csv(P / "ca_2015.csv")
b = pd.read_csv(P / "ca_2024.csv")
keep = ["ca_num"] + COUNTS + SHARES + ["median_rent", "rent_top_coded", "tracts"]
df = (a[["ca_num", "ca_name"] + keep[1:]]
      .merge(b[keep], on="ca_num", suffixes=("_2015", "_2024"), validate="1:1"))
assert len(df) == 77, f"expected 77 rows, got {len(df)}"

# Rent: 2015 dollars to 2024 dollars
df["median_rent_2015_real"] = (df["median_rent_2015"] * factor).round(0)

for c in COUNTS:
    df[f"{c}_chg"] = df[f"{c}_2024"] - df[f"{c}_2015"]
    df[f"{c}_pct_chg"] = (df[f"{c}_chg"] / df[f"{c}_2015"] * 100).round(2)
for c in SHARES:
    df[f"{c}_chg_pts"] = ((df[f"{c}_2024"] - df[f"{c}_2015"]) * 100).round(2)

df["rent_real_chg"] = df["median_rent_2024"] - df["median_rent_2015_real"]
df["rent_real_pct_chg"] = (df["rent_real_chg"] / df["median_rent_2015_real"] * 100).round(2)
df["use_with_care"] = df["ca_name"].isin(CARE)
SMALL_RENTERS = 1000   # fewer renter households than this in either period
df["small_sample"] = (df[["renters_2015", "renters_2024"]].min(axis=1) < SMALL_RENTERS)

df = df.sort_values("ca_num")
df.to_csv(OUT, index=False)

print(f"{len(df)} rows, {df.shape[1]} columns, factor {factor} -> {OUT}")
print(f"Blank cells in change columns: "
      f"{int(df.filter(like='_chg').isna().sum().sum())}")
print(f"Foreign-born share change: {df.fb_share_chg_pts.min():.1f} to "
      f"{df.fb_share_chg_pts.max():.1f} points")
print(f"Real rent change: {df.rent_real_pct_chg.min():.1f}% to "
      f"{df.rent_real_pct_chg.max():.1f}%, median {df.rent_real_pct_chg.median():.1f}%")
print(f"Use with care: {', '.join(sorted(df.loc[df.use_with_care, 'ca_name']))}")
print(f"Small sample (<{SMALL_RENTERS} renters): {df.small_sample.sum()} areas: "
      f"{', '.join(sorted(df.loc[df.small_sample, 'ca_name']))}")