"""Compute the inflation factor to convert 2015 dollars to 2024 dollars.

Uses the BLS R-CPI-U-RS, All items, annual averages (the index the Census
Bureau recommends for comparing ACS dollar values).
Source file: data/raw/r-cpi-u-rs-allitems.xlsx, downloaded by hand from
https://www.bls.gov/cpi/research-series/r-cpi-u-rs-home.htm
(BLS blocks scripted downloads.)
"""
import json
from pathlib import Path

import pandas as pd

SRC = Path("data/raw/r-cpi-u-rs-allitems.xlsx")
OUT = Path("data/processed/inflation_factor.json")
FROM_YEAR, TO_YEAR = 2015, 2024

df = pd.read_excel(SRC, header=5)              # row 5 holds YEAR ... AVG
df = df[pd.to_numeric(df["YEAR"], errors="coerce").notna()]
df["YEAR"] = df["YEAR"].astype(int)
avg = df.set_index("YEAR")["AVG"].astype(float)

factor = avg[TO_YEAR] / avg[FROM_YEAR]
result = {
    "index": "R-CPI-U-RS, All items, annual average",
    "from_year": FROM_YEAR,
    "to_year": TO_YEAR,
    "from_value": round(avg[FROM_YEAR], 6),
    "to_value": round(avg[TO_YEAR], 6),
    "factor": round(factor, 6),
}
OUT.write_text(json.dumps(result, indent=2))
print(f"{FROM_YEAR} avg {avg[FROM_YEAR]:.3f}, {TO_YEAR} avg {avg[TO_YEAR]:.3f}, "
      f"factor {factor:.6f} -> {OUT}")