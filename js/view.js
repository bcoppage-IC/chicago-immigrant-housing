// Community area names (as they appear in ca_combined.csv) for the banner hub cards.
const HISTORIC_HUBS = ["AVONDALE", "LOGAN SQUARE", "LOWER WEST SIDE"];
const NEW_DESTINATIONS = ["HUMBOLDT PARK", "WEST ENGLEWOOD", "OHARE", "CLEARING"];

const VIEW_PRESETS = {
  investor: {
    label: "Rental investor",
    growthWeight: 50,
    rentHeadroomWeight: 30,
    affordabilityWeight: 20,
    burdenDirection: "lower",
    burdenText: "Share of renters paying 30%+ of income on rent (ACS 2020–24, table B25070). Lower share scores higher.",
    assumptionText: "Scores are relative to the areas shown and assume lower rent growth and lower cost burden leave more room for rent increases.",
    tableTitle: "Top 10 Neighborhoods: Rental Investor View",
  },
  lender: {
    label: "Community lender",
    growthWeight: 50,
    rentHeadroomWeight: 30,
    affordabilityWeight: 20,
    burdenDirection: "higher",
    burdenText: "Share of renters paying 30%+ of income on rent (ACS 2020–24, table B25070). Higher share scores higher.",
    assumptionText: "Scores are relative to the areas shown and assume renters with high cost burden are likely first-time buyers who need affordable credit.",
    tableTitle: "Top 10 Neighborhoods: Community Lender View",
  },
};

export class DashboardView {
  constructor(repository) {
    this.repo = repository;
    this.map = null;
    this.geoJsonLayer = null;
    this.scatterChart = null;
    this.selectedCaNum = null;

    this.state = {
      view: "investor",
      burdenDirection: "lower",
      growthWeight: 50,
      rentHeadroomWeight: 30,
      affordabilityWeight: 20,
      excludeFlagged: true,
      segment: "ALL",
    };
  }

  init() {
    this._bindControls();
    this._initMap();
    this._initScatterChart();
    this.render();
  }

  _bindControls() {
    const viewSelect = document.getElementById("view-preset");
    const growthSlider = document.getElementById("weight-growth");
    const rentSlider = document.getElementById("weight-rent");
    const burdenSlider = document.getElementById("weight-burden");
    const flaggedToggle = document.getElementById("toggle-flagged");
    const segmentSelect = document.getElementById("filter-segment");

    const updateWeightLabels = () => {
      document.getElementById("val-growth").textContent = `${this.state.growthWeight}%`;
      document.getElementById("val-rent").textContent = `${this.state.rentHeadroomWeight}%`;
      document.getElementById("val-burden").textContent = `${this.state.affordabilityWeight}%`;
    };

    const syncSliders = () => {
      this.state.growthWeight = Number(growthSlider.value);
      this.state.rentHeadroomWeight = Number(rentSlider.value);
      this.state.affordabilityWeight = Number(burdenSlider.value);
      updateWeightLabels();
      this.render();
    };

    viewSelect.addEventListener("change", (e) => {
      const preset = VIEW_PRESETS[e.target.value];
      if (!preset) return;
      this.state.view = e.target.value;
      this.state.burdenDirection = preset.burdenDirection;
      this.state.growthWeight = preset.growthWeight;
      this.state.rentHeadroomWeight = preset.rentHeadroomWeight;
      this.state.affordabilityWeight = preset.affordabilityWeight;

      growthSlider.value = String(preset.growthWeight);
      rentSlider.value = String(preset.rentHeadroomWeight);
      burdenSlider.value = String(preset.affordabilityWeight);
      updateWeightLabels();

      document.getElementById("burden-desc").textContent = preset.burdenText;
      document.getElementById("method-assumption").textContent = preset.assumptionText;
      document.getElementById("scorecard-title").textContent = preset.tableTitle;

      this.render();
    });

    growthSlider.addEventListener("input", syncSliders);
    rentSlider.addEventListener("input", syncSliders);
    burdenSlider.addEventListener("input", syncSliders);

    flaggedToggle.addEventListener("change", (e) => {
      this.state.excludeFlagged = e.target.checked;
      this.render();
    });

    segmentSelect.addEventListener("change", (e) => {
      this.state.segment = e.target.value;
      this.render();
    });
  }

  _initMap() {
    this.map = L.map("chicago-map", {
      center: [41.835, -87.68],
      zoom: 10,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles © Esri",
      maxZoom: 16,
    }).addTo(this.map);
  }

  _initScatterChart() {
    const ctx = document.getElementById("scatter-chart").getContext("2d");

    this.scatterChart = new Chart(ctx, {
      type: "bubble",
      data: { datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const d = context.raw;
                return [
                  `${d.area.name} (Score: ${d.score})`,
                  `FB Share Shift: ${d.x > 0 ? "+" : ""}${d.x.toFixed(2)} pts`,
                  `Real Rent Change: ${d.y > 0 ? "+" : ""}${d.y.toFixed(1)}%`,
                  `FB Count Shift: ${d.area.fbCountChange > 0 ? "+" : ""}${d.area.fbCountChange.toLocaleString()}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Foreign-Born Share Change (Percentage Points, 2015-2024)",
              font: { weight: "bold", size: 11 },
            },
            grid: { color: "#e2e8f0" },
          },
          y: {
            title: {
              display: true,
              text: "Real Median Rent Change (%, 2024 Dollars)",
              font: { weight: "bold", size: 11 },
            },
            grid: { color: "#e2e8f0" },
          },
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const dsIndex = elements[0].datasetIndex;
            const index = elements[0].index;
            const clicked = this.scatterChart.data.datasets[dsIndex].data[index];
            this.selectArea(clicked.area.caNum);
          }
        },
      },
    });
  }

  selectArea(caNum) {
    this.selectedCaNum = caNum;
    const target = this.repo.areas.find((a) => a.caNum === caNum);
    if (!target) return;

    const badge = target.isFlagged()
      ? '<span class="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">Flagged Sample</span>'
      : '<span class="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded">Passed Checks</span>';

    const title = `${target.name} <span class="text-xs font-normal text-slate-500">(#${target.caNum})</span>`;

    const metric1 = `${target.fbCountChange > 0 ? "+" : ""}${target.fbCountChange.toLocaleString()} Net Change in Immigrant Residents (A ${target.arrivals2024.toLocaleString()}-person yearly influx)`;

    const metric2 = `$${target.medianRent2024.toLocaleString()}/mo Median Rent (${target.rentRealPctChange > 0 ? "+" : ""}${target.rentRealPctChange.toFixed(1)}% change)`;

    const metric3 = `${Math.round(target.burdenShare2024 * 100)}% of Renters Strained (${target.burdenChangePts > 0 ? "+" : ""}${target.burdenChangePts.toFixed(1)} pts shift)`;

    const spotlight = document.getElementById("area-spotlight");
    spotlight.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
        <div>
          <span class="text-xs font-semibold uppercase tracking-wider text-indigo-600">${target.getSegment()}</span>
          <h4 class="text-lg font-bold text-slate-900">${title}</h4>
        </div>
        ${badge}
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div class="bg-slate-50 p-3 rounded">
          <div class="font-bold text-slate-900">${metric1}</div>
        </div>
        <div class="bg-slate-50 p-3 rounded">
          <div class="font-bold text-slate-900">${metric2}</div>
        </div>
        <div class="bg-slate-50 p-3 rounded">
          <div class="font-bold text-slate-900">${metric3}</div>
        </div>
      </div>
    `;

    this._updateMap(this.repo.getRankedAreas(this.state, this.state));
  }

  render() {
    const ranked = this.repo.getRankedAreas(
      {
        growthWeight: this.state.growthWeight,
        rentHeadroomWeight: this.state.rentHeadroomWeight,
        affordabilityWeight: this.state.affordabilityWeight,
        burdenDirection: this.state.burdenDirection,
      },
      {
        excludeFlagged: this.state.excludeFlagged,
        segment: this.state.segment,
      }
    );

    this._updateKpiBanner();
    this._updateMap(ranked);
    this._updateScatter(ranked);
    this._updateScorecard(ranked);
  }

  _updateKpiBanner() {
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    const sign = (val) => (val > 0 ? "+" : val < 0 ? "-" : "");
    const formatPct = (val, digits = 1) => `${sign(val)}${Math.abs(val).toFixed(digits)}%`;
    const formatHundreds = (val) => {
      const rounded = Math.round(val / 100) * 100;
      return `${sign(rounded)}${Math.abs(rounded).toLocaleString("en-US")}`;
    };

    // Card 1: rent change in the 10 areas where immigrants grew most
    const { top10MedianRentChange, cityMedianRentChange } =
      this.repo.getTopGrowthRentComparison({
        excludeFlagged: this.state.excludeFlagged,
      });
    const cityMedianText = formatPct(cityMedianRentChange);
    setText("kpi-top-growth-rent", formatPct(top10MedianRentChange));
    setText(
      "kpi-top-growth-rent-sub",
      `Median rent change, 2015 to 2024, after inflation, in the 10 areas where immigrants grew most. City median: ${cityMedianText}.`
    );

    // Cards 2 and 3: historic hubs
    const historic = this.repo.getHubSummary(HISTORIC_HUBS);
    setText("kpi-historic-hub-change", formatHundreds(historic.totalFbCountChange));

    const hubRents = historic.rentChanges.map((r) => r.rentRealPctChange);
    const hubMin = Math.min(...hubRents);
    const hubMax = Math.max(...hubRents);
    setText("kpi-historic-hub-rent", `${formatPct(hubMin, 0)} to ${formatPct(hubMax, 0)}`);

    const multMin = Math.round(hubMin / cityMedianRentChange);
    const multMax = Math.round(hubMax / cityMedianRentChange);
    const multText = multMin === multMax ? `${multMin}` : `${multMin} to ${multMax}`;
    setText(
      "kpi-historic-hub-rent-sub",
      `Rent growth after inflation, 2015 to 2024. About ${multText} times the city median of ${cityMedianText}.`
    );

    // Card 4: new destinations
    const newDest = this.repo.getHubSummary(NEW_DESTINATIONS);
    setText("kpi-new-dest-change", formatHundreds(newDest.totalFbCountChange));
  }

  _updateMap(ranked) {
    if (this.geoJsonLayer) {
      this.map.removeLayer(this.geoJsonLayer);
    }

    const scoreLookup = new Map(ranked.map((item) => [item.area.caNum, item]));
    const allLookup = new Map(this.repo.areas.map((a) => [a.caNum, a]));

    const getColor = (score, area) => {
      if (!area) return "#cbd5e1";
      if (score === undefined) return "#e2e8f0";
      if (score >= 70) return "#0f766e";
      if (score >= 55) return "#14b8a6";
      if (score >= 40) return "#6366f1";
      return "#f43f5e";
    };

    this.geoJsonLayer = L.geoJson(this.repo.geoJson, {
      style: (feature) => {
        const caNum = Number(feature.properties.area_numbe);
        const rankedItem = scoreLookup.get(caNum);
        const area = allLookup.get(caNum);
        const isSelected = this.selectedCaNum === caNum;

        return {
          fillColor: getColor(rankedItem ? rankedItem.score : undefined, area),
          weight: isSelected ? 3 : 1,
          opacity: 1,
          color: isSelected ? "#0f172a" : "#ffffff",
          fillOpacity: rankedItem ? 0.82 : 0.35,
        };
      },
      onEachFeature: (feature, layer) => {
        const caNum = Number(feature.properties.area_numbe);
        const rankedItem = scoreLookup.get(caNum);
        const area = allLookup.get(caNum);

        if (area) {
          const scoreLabel = rankedItem ? `Score: <b>${rankedItem.score}</b>` : "Filtered out";
          layer.bindTooltip(
            `<strong>${area.name}</strong><br/>${scoreLabel}<br/>FB Shift: ${area.fbShareChangePts > 0 ? "+" : ""}${area.fbShareChangePts.toFixed(2)} pts<br/>Real Rent: ${area.rentRealPctChange > 0 ? "+" : ""}${area.rentRealPctChange.toFixed(1)}%`
          );
          layer.on("click", () => this.selectArea(caNum));
        }
      },
    }).addTo(this.map);
  }

  _updateScatter(ranked) {
    const segmentColors = {
      "Displacement Gateway": "rgba(244, 63, 94, 0.78)",
      "Direct-Arrival Hub": "rgba(15, 118, 110, 0.82)",
      "Domestic-Migration Corridor": "rgba(79, 70, 229, 0.82)",
      "Stable / Other": "rgba(100, 116, 139, 0.55)",
    };

    const grouped = {};
    ranked.forEach(({ area, score }) => {
      const seg = area.getSegment();
      if (!grouped[seg]) grouped[seg] = [];
      grouped[seg].push({
        x: area.fbShareChangePts,
        y: area.rentRealPctChange,
        r: Math.max(5, Math.min(20, Math.sqrt(Math.abs(area.fbCountChange)) / 4.5)),
        area,
        score,
      });
    });

    this.scatterChart.data.datasets = Object.keys(grouped).map((seg) => ({
      label: seg,
      data: grouped[seg],
      backgroundColor: segmentColors[seg] || "rgba(100, 116, 139, 0.6)",
      borderColor: "#ffffff",
      borderWidth: 1,
    }));

    this.scatterChart.update();
  }

  _updateScorecard(ranked) {
    const tbody = document.getElementById("scorecard-body");
    const top10 = ranked.slice(0, 10);

    tbody.innerHTML = top10
      .map(
        ({ area, score }, idx) => `
        <tr class="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition" data-ca="${area.caNum}">
          <td class="py-2.5 px-3 font-bold text-slate-700">#${idx + 1}</td>
          <td class="py-2.5 px-3">
            <div class="font-semibold text-slate-900">${area.name}</div>
            <div class="text-xs text-slate-500">${area.getSegment()}</div>
          </td>
          <td class="py-2.5 px-3 text-right font-mono font-bold text-teal-700">${score.toFixed(1)}</td>
          <td class="py-2.5 px-3 text-right text-slate-700">${area.fbShareChangePts > 0 ? "+" : ""}${area.fbShareChangePts.toFixed(2)} pts</td>
          <td class="py-2.5 px-3 text-right text-slate-700">${area.rentRealPctChange > 0 ? "+" : ""}${area.rentRealPctChange.toFixed(1)}%</td>
          <td class="py-2.5 px-3 text-right text-slate-700">$${area.medianRent2024.toLocaleString()}</td>
          <td class="py-2.5 px-3 text-right text-slate-700">${(area.burdenShare2024 * 100).toFixed(1)}%</td>
        </tr>
      `
      )
      .join("");

    tbody.querySelectorAll("tr").forEach((row) => {
      row.addEventListener("click", () => {
        this.selectArea(Number(row.dataset.ca));
      });
    });
  }
}
