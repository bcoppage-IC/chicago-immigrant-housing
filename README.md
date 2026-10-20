# Who Arrived, and Where Did They Live? Mapping Immigrant Settlement and Housing Pressure in Chicago

**Status:** Proposed / in progress. Planned start: October 21, 2026. Target completion: November 15, 2026.

## Research Question

How did the foreign-born population change across Chicago's 77 community areas relate to housing stock and rental market outcomes between 2015 and 2024?

## Data Sources

| Measure | Source | Table or file |
|---|---|---|
| Foreign-born share | U.S. Census Bureau, ACS 5-year estimates | B05002 |
| Median gross rent | U.S. Census Bureau, ACS 5-year estimates | B25064 |
| Rent cost burden | U.S. Census Bureau, ACS 5-year estimates | B25070 |
| Housing units | U.S. Census Bureau, ACS 5-year estimates | B25001 |
| Community-area rollups (cross-check) | CMAP Community Data Snapshots | Annual CSV |
| Displacement pressure | DePaul Institute for Housing Studies | Displacement pressure data |
| Community area boundaries | City of Chicago Data Portal | Boundary file (GeoJSON) |
| Tract boundaries | U.S. Census Bureau, TIGER/Line | Cook County tracts, 2010 and 2020 |
| 2010 to 2020 tract link | U.S. Census Bureau | Tract relationship file |

## Planned Approach

1. **Measure change in foreign-born share.** Compare the 2011-2015 and 2020-2024 ACS 5-year periods for each community area. These periods do not overlap, which keeps the comparison valid.
2. **Build housing indicators.** For each community area, calculate change in median gross rent, share of renters who are cost-burdened (paying 30% or more of income on rent), and change in total housing units.
3. **Join the data.** Combine population and housing measures into one table keyed by community area. Where source data is at the census tract level, aggregate tracts to community areas.
4. **Visualize the relationship.** Create maps of each measure and scatter plots comparing foreign-born change to each housing outcome.
5. **Write up the context.** Summarize patterns in a short write-up and connect them to IHS displacement pressure data.

## Limitations

- **Correlation, not causation.** This project describes relationships at the community-area level. It does not show that immigration caused any housing outcome.
- **Area-level data only.** Patterns across community areas may not apply to individual households.
- **Survey error.** ACS figures are estimates with margins of error. Smaller community areas have wider margins.
- **Foreign-born is not the same as recent arrivals.** The measure includes people who arrived decades ago.
- **Boundary changes.** Census tract boundaries changed in 2020. Tract-to-community-area aggregation must account for this.
- **Pandemic effects.** ACS data collection was disrupted in 2020, which affects part of the later period.

## Planned Repository Structure

```text
data/
  raw/          Original downloads, unedited
  processed/    Cleaned community-area tables
scripts/        Download and cleaning code
outputs/
  maps/
  charts/
writeup/        Final write-up
```

Raw and processed data are kept separate so every result can be reproduced from the original downloads.

## Repository Plan

This repository will be built out over the coming weeks. Data files, cleaning scripts, visualizations, and the write-up will be added as each stage is completed.