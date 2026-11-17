# Chicago Immigrant Settlement & Housing Pressure (2015-2024)

**Live Dashboard:** [https://bcoppage-ic.github.io/chicago-immigrant-housing/](https://bcoppage-ic.github.io/chicago-immigrant-housing/) | **Status:** Completed (Nov 2026)

## Research Question

How did the change in foreign-born population across Chicago's 77 community areas relate to housing stock and rental market outcomes between 2015 and 2024?

## Project Summary

- **Data Pipeline (`run_all.py`):** Automated data ingestion, census-tract-to-community-area crosswalk mapping, and metric calculation in Python for foreign-born population shifts and median gross rent changes.
- **Interactive Consulting Brief (`index.html`, `js/models.js`, `js/view.js`):** Built an object-oriented spatial dashboard featuring an interactive neighborhood map, comparison charts, and a neighborhood spotlight on West Englewood.
- **Deployment:** Published live via GitHub Pages on the `main` branch.

## Repository Structure

- `index.html`: Main entry point for the interactive dashboard.
- `js/models.js`: Data models and aggregation logic.
- `js/view.js`: Map rendering, chart controls, and interface state management.
- `run_all.py`: End-to-end Python data processing pipeline.

## Methodology and Scoring

This section is the source of truth for how the dashboard computes and labels everything. Code must match it.

### Data

- U.S. Census ACS 5-year estimates, Cook County census tracts, two periods: 2011-2015 ("2015") and 2020-2024 ("2024").
- Tables: B05002 (population, foreign-born), B25001 (housing units), B25063 (gross rent ranges), B25070 (gross rent as a percent of income), B07007 (moved from abroad in the past year).
- Tracts are assigned to Chicago's 77 community areas by land area. Each tract goes to the area holding its largest piece. 2010 and 2020 tract shapes use separate crosswalks.
- Median rent per community area is rebuilt from rent-range counts (B25063), not averaged from tract medians.
- 2015 rents are converted to 2024 dollars with the BLS R-CPI-U-RS annual average (factor 1.32791), the index the Census Bureau recommends for ACS dollar values.
- CMAP Community Data Snapshots are used as a check only, not as a data source.

### Measures

| Measure | Definition |
| --- | --- |
| Foreign-born share change | 2024 foreign-born share minus 2015 share, in percentage points |
| Real rent change | Percent change in median gross rent, 2015 (in 2024 dollars) to 2024 |
| Renter cost burden | Share of renter households paying 30% or more of income on gross rent, 2020-2024. Denominator excludes households where burden is not computed |
| Recent arrivals | Foreign-born residents who moved from abroad in the past year (B07007_028E), as a share of residents age 1+ |

### Flags

An area is flagged if it has fewer than 1,000 renter households in either period, or its median rent is top-coded. Six areas are flagged: Edison Park, Forest Glen, Fuller Park, Burnside, Hegewisch, Mount Greenwood. Flagged areas stay on the map. They are left out of rankings when "Exclude flagged areas" is checked (the default).

### Score

1. Each of the three measures is scaled 0 to 1 across the areas currently shown (min-max).
2. Direction:
   - Foreign-born share change: more growth scores higher.
   - Real rent change: lower growth scores higher.
   - Renter cost burden: depends on the selected View (below).
3. Score = weighted average of the three scaled values x 100, rounded to one decimal. Weights do not need to sum to 100. The code divides by their total.
4. Scores are relative. A score of 0 means lowest among the areas shown, not bad in absolute terms.

### Views

The View switch sets the three weights and the direction of the cost-burden measure. The user can still move the sliders after picking a View. Moving a slider does not change the View or the burden direction.

| View | Growth weight | Rent weight | Burden weight | Burden direction | Assumption |
| --- | --- | --- | --- | --- | --- |
| Rental investor (default) | 50 | 30 | 20 | Lower burden scores higher | Lower rent growth and lower cost burden leave room for rents to rise |
| Community lender | 50 | 30 | 20 | Higher burden scores higher | Renters paying a high share of income on rent are likely first-time buyers and need affordable credit |

Each View is a point of view, not a finding. The data shows correlation, not cause.

### Spotlight

The spotlight card shows one area's facts. No area is hard-coded. A rule picks it:

1. By default, the spotlight shows the #1 ranked area for the current View, sliders, and filters.
2. Clicking an area on the map, the bubble chart, or the top 10 table selects it. The spotlight then shows that area and keeps showing it.
3. Changing any control (View, any slider, the flag toggle, or the segment filter) clears the selection. The spotlight returns to the #1 ranked area.
4. The card says where the area came from, on a line above the name:

| How it got there | Line shown |
| --- | --- |
| Default, View weights unchanged | #1 ranked in Rental investor view (or Community lender view) |
| Default, a slider was moved | #1 ranked in Rental investor view, your slider weights |
| Default, a segment filter is on | Add ", Direct-Arrival Hubs only" (the segment's name) to the end |
| Clicked on the map | Selected on the map |
| Clicked on the bubble chart | Selected on the bubble chart |
| Clicked in the top 10 table | Selected in the top 10 table |

5. The card shows the area's score and rank, for example "Score 71.4, rank #5 of 71". If the selected area is not in the current rankings (for example a flagged area clicked on the map), it shows "Not ranked with current filters".
6. If no areas match the filters, the card says "No areas match these filters."
7. Each metric box names what it shows, the time period, and the source. "2015" means ACS 2011-2015. "2024" means ACS 2020-2024.

| Box | Label | Value | Detail line |
| --- | --- | --- | --- |
| 1 | Immigrant residents, change 2015 to 2024 | Net change in foreign-born residents | Count 2015 to count 2024. About N a year moved here from abroad (2020-24 average). Source: Census ACS, B05002, B07007. |
| 2 | Median rent, 2024 | Median gross rent per month | Percent change since 2015, after inflation. Source: Census ACS, B25063. Inflation: BLS R-CPI-U-RS. |
| 3 | Renters paying 30%+ of income on rent, 2024 | Share of renter households | Point change since 2015. Source: Census ACS, B25070. |

### Limits

- ACS margins of error are pulled but not modeled.
- ACS 5-year figures are period estimates, not single-year snapshots.
- Foreign-born is not the same as Latino. People born in Puerto Rico count as native-born.
- Rankings are a screen for where to look first, not investment or lending advice.

## How to Run

1. Install packages: `pip install -r requirements.txt`
2. Get a free Census API key: https://api.census.gov/data/key_signup.html
3. Copy `.env.example` to `.env` and set `CENSUS_API_KEY=your-key`. The `.env` file is ignored by git.
4. Run `python run_all.py`
