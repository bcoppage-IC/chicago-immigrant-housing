"""Pull ACS 5-year tract data for Cook County, IL, for two periods.

Saves one CSV per period to data/raw.
"""
import os
from pathlib import Path

import pandas as pd
import requests

YEARS = [2015, 2024]   # end year of each 5-year period
STATE = "17"           # Illinois
COUNTY = "031"         # Cook County
OUT_DIR = Path("data/raw")

VARIABLES = [
    "B05002_001E", "B05002_013E",                 # total population, foreign born
    "B25001_001E",                                # housing units
    "B25064_001E",                                # median gross rent
    "B25070_001E", "B25070_007E", "B25070_008E",  # renters, rent burden
    "B25070_009E", "B25070_010E", "B25070_011E",
]

# Add the margin of error (M) for each estimate (E)
COLUMNS = VARIABLES + [v[:-1] + "M" for v in VARIABLES]


def pull(year):
    url = f"https://api.census.gov/data/{year}/acs/acs5"
    params = {
        "get": "NAME," + ",".join(COLUMNS),
        "for": "tract:*",
        "in": f"state:{STATE} county:{COUNTY}",
    }
    key = os.environ.get("CENSUS_API_KEY")
    if key:
        params["key"] = key
    response = requests.get(url, params=params, timeout=60)
    response.raise_for_status()
    rows = response.json()
    df = pd.DataFrame(rows[1:], columns=rows[0])
    df["GEOID"] = df["state"] + df["county"] + df["tract"]
    return df


for year in YEARS:
    df = pull(year)
    out = OUT_DIR / f"acs5_{year}_cook_tracts.csv"
    df.to_csv(out, index=False)
    print(f"{year}: {len(df)} tracts saved to {out}")