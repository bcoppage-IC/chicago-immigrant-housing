# Findings log

Last updated: November 2, 2026

## 1. Foreign-born share change vs. rent change

- Correlation between foreign-born share change and real rent change: r = -0.37 across 69 unflagged community areas (rough p about 0.002).
- Without Avondale: r = -0.28 across 68 areas (rough p about 0.02). Avondale strengthens the pattern but does not create it.
- Areas where the foreign-born share fell tended to see bigger rent increases.
- This shows a link, not a cause.
- City medians: foreign-born share change +0.82 points; real rent change +6.31%.
- Visuals: `outputs/map_fb_share_change.png`, `outputs/scatter_fb_vs_rent.png`.

## 2. Data check: West Englewood

- Foreign-born share rose from 2.6% to 13.6% (846 to 3,840 people) while total population fell from 32,156 to 28,144.
- 2020-2024 population, foreign-born, and housing units match CMAP Community Data Snapshots exactly. Median rent is within 0.03% of CMAP.
- 2011-2015 population and housing units match CMAP exactly. The 2017 CMAP file has no foreign-born column, so that one figure is not checked.
- Press reports large Latino growth in West Englewood (see sources). Conclusion: the change is real, not a data error.

## 3. Areas named in the press for displacement

| Area | FB share 2015 | FB share 2024 | Share change (pts) | FB count change | Real rent change |
| --- | --- | --- | --- | --- | --- |
| Avondale | 36.7% | 23.4% | -13.29 | -6,259 | +31.8% |
| Logan Square | 18.6% | 14.3% | -4.27 | -3,495 | +26.2% |
| Lower West Side | 38.0% | 35.4% | -2.56 | -1,223 | +23.5% |
| Hermosa | 33.8% | 34.7% | +0.91 | -779 | +8.6% |
| Humboldt Park | 16.1% | 22.1% | +6.01 | +3,561 | +9.6% |

- Avondale, Logan Square, and Lower West Side lost about 11,000 foreign-born residents combined. Their rents rose 4 to 5 times faster than the city median.
- Hermosa: near the city median on both measures. Displacement pressure may not have reached it by 2024.
- Humboldt Park: gained foreign-born residents. Much of its displacement story in the press involves Puerto Rican residents, who count as native-born in the ACS.

## 4. Recent arrivals (moved from abroad in past year, ACS B07007)

Yearly averages over each 5-year window.

| Area | Arrivals 2015 | Arrivals 2024 | Share 2015 | Share 2024 | FB count change |
| --- | --- | --- | --- | --- | --- |
| Humboldt Park | 30 | 680 | 0.06% | 1.24% | +3,561 |
| O'Hare | 75 | 313 | 0.57% | 2.22% | +2,001 |
| West Englewood | 11 | 173 | 0.03% | 0.62% | +2,994 |
| Clearing | 28 | 17 | 0.11% | 0.07% | +1,550 |
| Avondale | 200 | 22 | 0.51% | 0.06% | -6,259 |
| Lower West Side | 112 | 365 | 0.33% | 1.10% | -1,223 |
| Hermosa | 248 | 368 | 0.99% | 1.65% | -779 |
| Logan Square | 228 | 320 | 0.31% | 0.45% | -3,495 |

City median recent-arrival share: 0.28% (2015), 0.36% (2024).

- Gains driven by new arrivals: Humboldt Park, O'Hare.
- Gains driven by immigrants moving in from elsewhere in the U.S.: West Englewood, Clearing.
- Avondale lost immigrants two ways: residents left, and new arrivals nearly stopped.
- Lower West Side and Hermosa: new arrivals rose, but more foreign-born residents left than arrived.

## 5. Caveats

- Press articles mostly count Latino residents. Latino and foreign-born are different measures. People born in Puerto Rico count as native-born.
- Small counts (for example 11, 17, 22 recent arrivals) have large survey margins of error. Margins of error are not yet in the combined table.
- Data ends in 2024. The 2020-2024 window only partly captures arrivals that began in 2022.

## 6. Open questions

- Clearing: no press coverage found yet.
- Add margins of error for recent arrivals and foreign-born counts.
- Check whether other Northwest Side areas (Belmont Cragin, Portage Park) show the same pattern as Avondale.

## 7. Press sources

- WBEZ, "Belmont Triangle plans could shape Avondale's future." Avondale lost more than 6,000 Latino residents between 2010 and 2020, second only to Logan Square. https://www.wbez.org/stories/belmont-triangle-plans-could-shape-avondales-future/098920d0-71f7-4bc1-8c35-a1991656ce3d
- WBEZ (2019), "Group fights gentrification on Chicago's Northwest Side." Names Logan Square, Pilsen, and Avondale as the top areas for Latino population decline. https://www.wbez.org/chicago/2019/03/06/group-fights-gentrification-on-chicagos-northwest-side
- Block Club Chicago (2022), Avondale leaders on Belmont Triangle redevelopment. Notes Polish residents and businesses have also left Avondale. https://blockclubchicago.org/2022/06/27/avondale-leaders-blast-city-for-rushing-redevelopment-of-belmont-triangle-slow-the-process-our-areas-culture-depends-on-it/
- WTTW (2024), proposed ordinance to preserve affordable housing on the Northwest Side. Cites rising rents and conversion or demolition of multifamily buildings in Logan Square, Avondale, and Humboldt Park. https://news.wttw.com/2024/07/11/proposed-ordinance-aims-preserve-affordable-housing-stem-displacement-chicago-s-northwest
- Chicago Sun-Times La Voz (2021), Latino population growth in 2020 census. West Englewood gained 5,058 Latino residents, a 653% increase. https://chicago.suntimes.com/la-voz/2021/12/30/22856490/la-poblacion-latina-de-chicago-se-expande-en-2020-espanol-la-voz
- Chicago Sun-Times (2019), Hispanics moving into Greater Englewood. Reports low home prices in West Englewood. https://chicago.suntimes.com/news/small-but-growing-number-of-hispanics-are-calling-greater-englewood-home-south-side-population-loss-chicago/
- WBEZ (2025), profile of the O'Hare community area. Reports a large influx of immigrants from Ukraine, Poland, and other Eastern European countries. https://www.wbez.org/chicago-neighborhoods/2025/07/15/ohare-community-area-schorsch-forest-view-neighborhood-chicago-ord
- NPR / WBEZ (2019), "Chicago neighborhoods continue to shift in size and race." Experts say rising rents pushed Latino residents to the city's western edges and suburbs. https://www.npr.org/local/309/2019/06/12/731822220/chicago-neighborhoods-continue-to-shift-in-size-and-race
- WBEZ, "Chicago's immigrant population down by 30,000 over the past decade." MPC report finds the decline is steepest among Mexican-born residents. https://go.wbez.org/stories/chicagos-immigrant-population-down-by-30000-over-the-past-decade/1cb8eaa9-a492-40ea-895d-16e227765f56