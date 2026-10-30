"""Match census tracts to Chicago's 77 community areas.

For each tract inside Chicago, measure how much of it falls in each
community area. Assign it to the area holding its largest piece.
Flag tracts split across community-area lines.
"""
from pathlib import Path

import geopandas as gpd

RAW = Path("data/raw")
OUT = Path("data/processed")
CRS = "EPSG:3435"    # Illinois East State Plane, units in feet
SPLIT_FLAG = 0.95    # flag tracts with less than 95% in one area

areas = gpd.read_file(RAW / "community_areas.geojson").to_crs(CRS)
areas = areas[["area_numbe", "community", "geometry"]].rename(
    columns={"area_numbe": "ca_num", "community": "ca_name"})
areas["ca_num"] = areas["ca_num"].astype(int)


def crosswalk(tracts, geoid_col, lat_col, lon_col):
    tracts = tracts.rename(columns={geoid_col: "GEOID"})

    # 1. Keep tracts inside Chicago. Use the Census internal point,
    #    which sits on land, so lakefront tracts are not dropped.
    points = gpd.GeoDataFrame(
        tracts[["GEOID"]],
        geometry=gpd.points_from_xy(tracts[lon_col].astype(float),
                                    tracts[lat_col].astype(float)),
        crs="EPSG:4269").to_crs(CRS)
    in_city = gpd.sjoin(points, areas, predicate="within")["GEOID"]
    tracts = tracts[tracts["GEOID"].isin(in_city)][["GEOID", "geometry"]].to_crs(CRS)

    # 2. Cut each tract along community-area lines and measure the pieces.
    pieces = gpd.overlay(tracts, areas, how="intersection")
    pieces["piece_area"] = pieces.area
    pieces["share"] = pieces["piece_area"] / pieces.groupby("GEOID")["piece_area"].transform("sum")

    # 3. Assign each tract to the area holding its largest piece.
    best = pieces.sort_values("share", ascending=False).drop_duplicates("GEOID").copy()
    best["split"] = best["share"] < SPLIT_FLAG
    return best[["GEOID", "ca_num", "ca_name", "share", "split"]].sort_values("GEOID")


t10 = gpd.read_file(RAW / "tl_2010_17031_tract10.zip")
t20 = gpd.read_file(RAW / "tl_2020_17_tract.zip")
t20 = t20[t20["COUNTYFP"] == "031"]

runs = [
    (2010, t10, "GEOID10", "INTPTLAT10", "INTPTLON10"),
    (2020, t20, "GEOID", "INTPTLAT", "INTPTLON"),
]

for year, tracts, geoid, lat, lon in runs:
    cw = crosswalk(tracts, geoid, lat, lon)
    out = OUT / f"crosswalk_tract{year}_to_ca.csv"
    cw.to_csv(out, index=False)
    print(f"{year}: {len(cw)} tracts in {cw['ca_num'].nunique()} areas, "
          f"{cw['split'].sum()} split -> {out}")