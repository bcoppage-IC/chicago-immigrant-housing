"""Pull ACS table B25063 (gross rent by range) for Cook County tracts.

Saves one data file and one label file per period to data/raw.
"""
import json
import os
from pathlib import Path

import pandas as pd
import requests

YEARS = [2015, 2024]   # end year of each 5-year period
STATE = "17"           # Illinois
COUNTY = "031"         # Cook County
TABLE = "B25063"
OUT_DIR = Path("data/raw")
KEY = os.environ.get("CENSUS_API_KEY")


def pull(year):
    url = f"https://api.census.gov/data/{year}/acs/acs5"
    params = {
        "get": f"NAME,group({TABLE})",
        "for": "tract:*",
        "in": f"state:{STATE} county:{COUNTY}",
    }
    if KEY:
        params["key"] = KEY
    r = requests.get(url, params=params, timeout=120)
    r.raise_for_status()
    rows = r.json()
    df = pd.DataFrame(rows[1:], columns=rows[0])
    df = df.loc[:, ~df.columns.duplicated()]
    # Keep estimates (E) and margins of error (M) only
    keep = ["NAME", "state", "county", "tract"] + [
        c for c in df.columns if c.startswith(TABLE) and c[-1] in "EM"]
    df = df[keep]
    df["GEOID"] = df["state"] + df["county"] + df["tract"]
    return df


def labels(year):
    url = f"https://api.census.gov/data/{year}/acs/acs5/groups/{TABLE}.json"
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    v = r.json()["variables"]
    return {k: v[k]["label"] for k in sorted(v) if k.endswith("E")}


for year in YEARS:
    df = pull(year)
    out = OUT_DIR / f"acs5_{year}_cook_tracts_{TABLE}.csv"
    df.to_csv(out, index=False)
    lab = labels(year)
    (OUT_DIR / f"{TABLE}_labels_{year}.json").write_text(json.dumps(lab, indent=2))
    print(f"{year}: {len(df)} tracts, {len(lab)} rent variables -> {out}")