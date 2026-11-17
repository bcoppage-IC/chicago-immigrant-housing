export class CommunityArea {
  constructor(row) {
    this.caNum = Number(row.ca_num);
    this.name = row.ca_name ? row.ca_name.trim() : 'Unknown';
    this.pop2024 = Number(row.pop_2024) || 0;
    this.fbShare2015 = Number(row.fb_share_2015) || 0;
    this.fbShare2024 = Number(row.fb_share_2024) || 0;
    this.fbShareChangePts = Number(row.fb_share_chg_pts) || 0;
    this.fbCount2015 = Number(row.foreign_born_2015) || 0;
    this.fbCount2024 = Number(row.foreign_born_2024) || 0;
    this.fbCountChange = Number(row.foreign_born_chg) || 0;
    this.arrivals2024 = Number(row.recent_fb_arrivals_2024) || 0;
    this.arrivalShare2024 = Number(row.recent_arrival_share_2024) || 0;
    this.medianRent2024 = Number(row.median_rent_2024) || 0;
    this.rentRealPctChange = Number(row.rent_real_pct_chg) || 0;
    this.burdenShare2024 = Number(row.burden_share_2024) || 0;
    this.burdenChangePts = Number(row.burden_share_chg_pts) || 0;
    this.useWithCare = String(row.use_with_care).toLowerCase() === 'true';
    this.smallSample = String(row.small_sample).toLowerCase() === 'true';
    this.rentTopCoded = String(row.rent_top_coded_2015).toLowerCase() === 'true' || String(row.rent_top_coded_2024).toLowerCase() === 'true';
  }

  isFlagged() {
    return this.useWithCare || this.smallSample || this.rentTopCoded;
  }

  getSegment() {
    if (this.fbShareChangePts <= -2.0 && this.rentRealPctChange >= 15.0) return 'Displacement Gateway';
    if (this.fbCountChange >= 1500 && this.arrivalShare2024 >= 0.01) return 'Direct-Arrival Hub';
    if (this.fbCountChange >= 1000 && this.rentRealPctChange < 12.0) return 'Domestic-Migration Corridor';
    return 'Stable / Other';
  }

  calculateInvestmentScore(weights, bounds) {
    const totalWeight = weights.growthWeight + weights.rentHeadroomWeight + weights.affordabilityWeight;
    if (totalWeight === 0) return 0;
    const growthNorm = this._norm(this.fbShareChangePts, bounds.minFbShareChg, bounds.maxFbShareChg);
    const rentNorm = 1 - this._norm(this.rentRealPctChange, bounds.minRentChg, bounds.maxRentChg);
    const rawBurdenNorm = this._norm(this.burdenShare2024, bounds.minBurden, bounds.maxBurden);
    const burdenNorm = weights.burdenDirection === "higher" ? rawBurdenNorm : 1 - rawBurdenNorm;
    const raw = (growthNorm * weights.growthWeight + rentNorm * weights.rentHeadroomWeight + burdenNorm * weights.affordabilityWeight) / totalWeight;
    return Math.round(raw * 1000) / 10;
  }

  _norm(val, min, max) {
    if (max === min) return 0.5;
    const clamped = Math.max(min, Math.min(max, val));
    return (clamped - min) / (max - min);
  }
}

export class PortfolioRepository {
  constructor() {
    this.areas = [];
    this.geoJson = null;
  }

  async load(csvPath, geoJsonPath) {
    const [csvText, geoResponse] = await Promise.all([
      fetch(csvPath).then(r => { if (!r.ok) throw new Error('CSV load failed'); return r.text(); }),
      fetch(geoJsonPath).then(r => { if (!r.ok) throw new Error('GeoJSON load failed'); return r.json(); })
    ]);
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    this.areas = parsed.data.map(row => new CommunityArea(row));
    this.geoJson = geoResponse;
    return this;
  }

  getFilteredAreas({ excludeFlagged = true, segment = 'ALL' } = {}) {
    return this.areas.filter(a => {
      if (excludeFlagged && a.isFlagged()) return false;
      if (segment !== 'ALL' && a.getSegment() !== segment) return false;
      return true;
    });
  }

  getNormalizationBounds(areas) {
    const t = areas.length > 0 ? areas : this.areas;
    return {
      minFbShareChg: Math.min(...t.map(a => a.fbShareChangePts)),
      maxFbShareChg: Math.max(...t.map(a => a.fbShareChangePts)),
      minRentChg: Math.min(...t.map(a => a.rentRealPctChange)),
      maxRentChg: Math.max(...t.map(a => a.rentRealPctChange)),
      minBurden: Math.min(...t.map(a => a.burdenShare2024)),
      maxBurden: Math.max(...t.map(a => a.burdenShare2024))
    };
  }

  getRankedAreas(weights, filterOptions = {}) {
    const filtered = this.getFilteredAreas(filterOptions);
    const bounds = this.getNormalizationBounds(filtered);
    return filtered.map(area => ({ area, score: area.calculateInvestmentScore(weights, bounds) })).sort((a, b) => b.score - a.score);
  }

  getTopGrowthRentComparison(filterOptions = {}) {
    const filtered = this.getFilteredAreas(filterOptions);
    const cityMedianRentChange = this.getCityMedianRentChange();
    const top10Growth = [...filtered]
      .sort((a, b) => b.fbShareChangePts - a.fbShareChangePts)
      .slice(0, 10);
    const top10MedianRentChange = this._median(top10Growth.map(a => a.rentRealPctChange));

    return {
      top10MedianRentChange,
      cityMedianRentChange,
      difference: top10MedianRentChange - cityMedianRentChange
    };
  }

  // Median real rent % change across all community areas (never filtered).
  getCityMedianRentChange() {
    return this._median(this.areas.map(a => a.rentRealPctChange));
  }

  // Given a list of community area names, returns the summed net change in
  // foreign-born residents plus each area's real rent % change.
  getHubSummary(areaNames) {
    const wanted = areaNames.map(n => n.trim().toUpperCase());
    const areas = wanted.map(name => {
      const area = this.areas.find(a => a.name.toUpperCase() === name);
      if (!area) throw new Error(`Community area not found: ${name}`);
      return area;
    });
    return {
      totalFbCountChange: areas.reduce((sum, a) => sum + a.fbCountChange, 0),
      rentChanges: areas.map(a => ({ name: a.name, rentRealPctChange: a.rentRealPctChange }))
    };
  }

  _median(values) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}