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