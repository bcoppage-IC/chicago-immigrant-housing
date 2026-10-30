# Who Arrived, and Where Did They Live? Mapping Immigrant Settlement and Housing Pressure in Chicago

**Status:** In progress. Started October 2026. Target completion: November 15, 2026.

## Research Question

How did the change in foreign-born population across Chicago's 77 community areas relate to housing stock and rental market outcomes between 2015 and 2024?

## Progress

- [x] Boundary files and tract files downloaded
- [x] ACS tract data pulled for 2011-2015 and 2020-2024
- [x] Tract-to-community-area crosswalks built and validated
- [x] Community-area tables built for both periods, with rebuilt median rent
- [ ] Inflation adjustment (2015 rents to 2024 dollars)
- [ ] Combined 77-row table with change columns
- [ ] Maps and charts
- [ ] Write-up

## Data Sources

Every reported number comes from one source, the ACS 5-year estimates, calculated the same way for both periods.

| Measure | Source | Table or file |
|---|---|---|
| Foreign-born share | U.S. Census Bureau, ACS 5-year estimates | B05002 |
| Median gross rent | U.S. Census Bureau, ACS 5-year estimates | B25063 (rent ranges) |
| Rent cost burden | U.S. Census Bureau, ACS 5-year estimates | B25070 |
| Housing units | U.S. Census Bureau, ACS 5-year estimates | B25001 |
| Median rent method check | U.S. Census Bureau, ACS 5-year estimates | B25064 |
| Community area boundaries | City of Chicago Data Portal | Boundaries - Community Areas (GeoJSON) |
| Tract boundaries | U.S. Census Bureau, TIGER/Line | 2010 Cook County tracts, 2020 Illinois tracts |
| 2010 to 2020 tract link | U.S. Census Bureau | Tract relationship file |
| Cross-check only | CMAP Community Data Snapshots | Not used as a data source |

Possible later additions, kept separate from the core table: DePaul Institute for Housing Studies displacement data, and Zillow rents through 2026 as a "since 2024" section.

## Methods

1. **Two periods.** ACS 2011-2015 and 2020-2024. The periods do not overlap. 2020-2024 is the newest tract-level release.
2. **Tracts to community areas.** Each period uses its own tract map (2010 tracts for 2011-2015, 2020 tracts for 2020-2024). Each tract is assigned whole to the community area holding the largest share of its land area. Tracts with less than 95% in one area are flagged: 4 of 796 (2010) and 5 of 792 (2020). A tract counts as Chicago if its Census internal point falls inside a community area.
3. **Validation.** Population of the matched 2010 tracts sums to 2,716,981, within about 0.02% of Chicago's 2011-2015 total.
4. **Counts.** Population, foreign-born, housing units, renters, and cost-burdened renters are summed by community area.
5. **Cost burden.** Renters paying 30% or more of income on rent, divided by renters for whom burden is computed.
6. **Median rent.** Medians cannot be added. Each community area's median is rebuilt from rent-range counts (B25063) by linear interpolation within the range holding the middle renter. The rent ranges are identical in both periods. Applied to single tracts, the method reproduces Census-published tract medians to within $1 in nearly all cases.

## How to Reproduce

1. Install Python 3 and the packages: `pip install -r requirements.txt`
2. Get a free Census API key at https://api.census.gov/data/key_signup.html and set it as the environment variable `CENSUS_API_KEY`.
3. Run the scripts in order:
   - `python scripts/pull_acs.py`
   - `python scripts/pull_rent_ranges.py`
   - `python scripts/build_crosswalk.py`
   - `python scripts/build_ca_tables.py`

Boundary and tract files are already in `data/raw`.

## Limitations

- **Correlation, not causation.** This project describes relationships at the community-area level. It does not show that immigration caused any housing outcome.
- **Area-level data only.** Patterns across community areas may not apply to individual households.
- **Survey error.** ACS figures are estimates with margins of error. Smaller community areas have wider margins. Interpolated medians do not have exact margins.
- **Foreign-born is not the same as recent arrivals.** The measure includes people who arrived decades ago.
- **Pooled years.** Each 5-year estimate covers five years of surveys. 2020-2024 centers on about 2022 and only partly reflects the 2022 to 2024 migrant arrivals.
- **Whole-tract assignment.** Tracts that cross community-area lines are assigned to one area, not split.
- **Pandemic effects.** ACS data collection was disrupted in 2020, which affects part of the later period.

## Repository Structure

```text
data/
  raw/          Original downloads, unedited
  processed/    Crosswalks and community-area tables
scripts/        Download and processing code
outputs/        Maps and charts (coming)
```

Raw and processed data are kept separate so every result can be reproduced from the original downloads.