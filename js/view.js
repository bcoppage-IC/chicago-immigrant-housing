// Community area names (as they appear in ca_combined.csv) for the banner hub cards.
const HISTORIC_HUBS = ["AVONDALE", "LOGAN SQUARE", "LOWER WEST SIDE"];
const NEW_DESTINATIONS = ["HUMBOLDT PARK", "WEST ENGLEWOOD", "OHARE", "CLEARING"];

const SEGMENT_LABELS = {
  "Direct-Arrival Hub": "Direct-Arrival Hubs",
  "Domestic-Migration Corridor": "Domestic-Migration Corridors",
  "Displacement Gateway": "Displacement Gateways",
  "Stable / Other": "Stable / Other",
};

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
      pinnedCaNum: null,
      pinSource: null,
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
    const homeBtn = document.getElementById("home-btn");
    const homePanel = document.getElementById("home-panel");
    const homePicker = document.getElementById("home-picker");

    if (homePicker) {
      const sortedAreas = [...this.repo.areas].sort((a, b) => a.name.localeCompare(b.name));
      sortedAreas.forEach((area) => {
        const opt = document.createElement("option");
        opt.value = String(area.caNum);
        opt.textContent = area.name;
        homePicker.appendChild(opt);
      });

      homePicker.addEventListener("change", (e) => {
        if (!e.target.value) return;
        this.pinArea(Number(e.target.value), "home");
        if (homePanel) homePanel.classList.add("hidden");
      });
    }

    if (homeBtn && homePanel) {
      homeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        homePanel.classList.toggle("hidden");
      });

      document.addEventListener("click", (e) => {
        if (!homePanel.classList.contains("hidden") && !homePanel.contains(e.target) && !homeBtn.contains(e.target)) {
          homePanel.classList.add("hidden");
        }
      });
    }

    const updateWeightLabels = () => {
      document.getElementById("val-growth").textContent = `${this.state.growthWeight}%`;
      document.getElementById("val-rent").textContent = `${this.state.rentHeadroomWeight}%`;
      document.getElementById("val-burden").textContent = `${this.state.affordabilityWeight}%`;
    };

    const syncSliders = () => {
      this.state.growthWeight = Number(growthSlider.value);
      this.state.rentHeadroomWeight = Number(rentSlider.value);
      this.state.affordabilityWeight = Number(burdenSlider.value);
      this.state.pinnedCaNum = null;
      this.state.pinSource = null;
      if (homePicker) homePicker.value = "";
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
      this.state.pinnedCaNum = null;
      this.state.pinSource = null;
      if (homePicker) homePicker.value = "";

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
      this.state.pinnedCaNum = null;
      this.state.pinSource = null;
      if (homePicker) homePicker.value = "";
      this.render();
    });

    segmentSelect.addEventListener("change", (e) => {
      this.state.segment = e.target.value;
      this.state.pinnedCaNum = null;
      this.state.pinSource = null;
      if (homePicker) homePicker.value = "";
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
            this.pinArea(clicked.area.caNum, "bubble");
          }
        },
      },
    });
  }

  pinArea(caNum, source) {
    this.state.pinnedCaNum = caNum;
    this.state.pinSource = source;
    const homePicker = document.getElementById("home-picker");
    if (homePicker) homePicker.value = String(caNum);
    this.render();
  }

  _getSpotlightSourceLine(mode) {
    if (mode === "selected") {
      if (this.state.pinSource === "home") return "Home";
      if (this.state.pinSource === "map") return "Selected on the map";
      if (this.state.pinSource === "bubble") return "Selected on the bubble chart";
      if (this.state.pinSource === "table") return "Selected in the top 10 table";
    }
    const preset = VIEW_PRESETS[this.state.view];
    let line = `#1 ranked in ${preset.label} view`;
    const hasCustomWeights =
      this.state.growthWeight !== preset.growthWeight ||
      this.state.rentHeadroomWeight !== preset.rentHeadroomWeight ||
      this.state.affordabilityWeight !== preset.affordabilityWeight;
    if (hasCustomWeights) {
      line += ", your slider weights";
    }
    if (this.state.segment !== "ALL") {
      const segLabel = SEGMENT_LABELS[this.state.segment] || this.state.segment;
      line += `, ${segLabel} only`;
    }
    return line;
  }

  _updateSpotlight(area, mode, ranked) {
    const spotlight = document.getElementById("area-spotlight");
    if (!area) {
      spotlight.innerHTML = `
        <div class="text-xs text-slate-500 text-center py-2">
          No areas match these filters.
        </div>
      `;
      return;
    }

    const badge = area.isFlagged()
      ? '<span class="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded">Flagged Sample</span>'
      : '<span class="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded">Passed Checks</span>';

    const sourceLine = this._getSpotlightSourceLine(mode);
    const title = `${area.name} <span class="text-xs font-normal text-slate-500">(#${area.caNum})</span>`;

    const rankIdx = ranked.findIndex((r) => r.area.caNum === area.caNum);
    const scoreLine =
      rankIdx !== -1
        ? `Score ${ranked[rankIdx].score.toFixed(1)}, rank #${rankIdx + 1} of ${ranked.length}`
        : "Not ranked with current filters";
    const flaggedNote =
      area.isFlagged() && this.state.excludeFlagged
        ? '<div class="text-xs text-amber-700 mt-0.5">Note: This area is flagged (under 1,000 renters).</div>'
        : "";

    const sign = (val) => (val > 0 ? "+" : val < 0 ? "−" : "");
    const formatSignedInt = (val) => `${sign(val)}${Math.abs(val).toLocaleString("en-US")}`;
    const formatSignedDecimal = (val, digits = 1) => `${sign(val)}${Math.abs(val).toFixed(digits)}`;

    const box1Value = formatSignedInt(area.fbCountChange);
    const fbRange = `${area.fbCount2015.toLocaleString("en-US")} to ${area.fbCount2024.toLocaleString("en-US")} people.`;
    const arrivalsText = area.arrivals2024 < 25
      ? "Arrivals directly from another country: too few to measure (2020–24)."
      : `About ${area.arrivals2024.toLocaleString("en-US")} a year moved here directly from another country (2020–24 average).`;
    const box1Detail = `${fbRange} ${arrivalsText} Source: Census ACS, B05002, B07007.`;

    const box2Value = `$${area.medianRent2024.toLocaleString("en-US")}/mo`;
    const box2Detail = `${formatSignedDecimal(area.rentRealPctChange, 1)}% since 2015, after inflation. Source: Census ACS, B25063. Inflation: BLS R-CPI-U-RS.`;

    const box3Value = `${Math.round(area.burdenShare2024 * 100)}%`;
    const box3Detail = `${formatSignedDecimal(area.burdenChangePts, 1)} points since 2015. Source: Census ACS, B25070.`;

    spotlight.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
        <div>
          <div class="text-xs">
            <span class="font-semibold text-indigo-600">${sourceLine}</span>
            <span class="text-slate-500"> · ${area.getSegment()}</span>
          </div>
          <h4 class="text-lg font-bold text-slate-900">${title}</h4>
          <div class="text-xs text-slate-600">${scoreLine}</div>
          ${flaggedNote}
        </div>
        ${badge}
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div class="bg-slate-50 p-3 rounded">
          <div class="text-xs text-slate-500">Foreign-born residents, net change 2015 to 2024</div>
          <div class="text-lg font-bold text-slate-900 mt-0.5">${box1Value}</div>
          <div class="text-xs text-slate-600 mt-1">${box1Detail}</div>
        </div>
        <div class="bg-slate-50 p-3 rounded">
          <div class="text-xs text-slate-500">Median rent, 2024</div>
          <div class="text-lg font-bold text-slate-900 mt-0.5">${box2Value}</div>
          <div class="text-xs text-slate-600 mt-1">${box2Detail}</div>
        </div>
        <div class="bg-slate-50 p-3 rounded">
          <div class="text-xs text-slate-500">Renters paying 30%+ of income on rent, 2024</div>
          <div class="text-lg font-bold text-slate-900 mt-0.5">${box3Value}</div>
          <div class="text-xs text-slate-600 mt-1">${box3Detail}</div>
        </div>
      </div>
    `;
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

    let spotlightArea = null;
    let spotlightMode = "empty";
    if (this.state.pinnedCaNum !== null) {
      spotlightArea = this.repo.areas.find((a) => a.caNum === this.state.pinnedCaNum) || null;
      spotlightMode = spotlightArea ? "selected" : "empty";
    } else if (ranked.length > 0) {
      spotlightArea = ranked[0].area;
      spotlightMode = "top";
    }
    this.selectedCaNum = spotlightArea ? spotlightArea.caNum : null;

    this._updateKpiBanner();
    this._updateMap(ranked);
    this._updateScatter(ranked);
    this._updateScorecard(ranked);
    this._updateSpotlight(spotlightArea, spotlightMode, ranked);
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

    // Card 1: rent change in the 10 areas where the foreign-born share grew most
    const { top10MedianRentChange, cityMedianRentChange } =
      this.repo.getTopGrowthRentComparison({
        excludeFlagged: this.state.excludeFlagged,
      });
    const cityMedianText = formatPct(cityMedianRentChange);
    setText("kpi-top-growth-rent", formatPct(top10MedianRentChange));
    setText(
      "kpi-top-growth-rent-sub",
      `Median rent change, 2015 to 2024, after inflation, in the 10 areas where the foreign-born share grew most. City median: ${cityMedianText}.`
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
          fillColor: isSelected ? "#FBBF24" : getColor(rankedItem ? rankedItem.score : undefined, area),
          weight: isSelected ? 3 : 1,
          opacity: 1,
          color: isSelected ? "#0f172a" : "#ffffff",
          fillOpacity: isSelected ? 0.9 : rankedItem ? 0.82 : 0.35,
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
          layer.on("click", () => this.pinArea(caNum, "map"));
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
        this.pinArea(Number(row.dataset.ca), "table");
      });
    });
  }
}
