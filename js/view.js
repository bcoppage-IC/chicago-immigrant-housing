export class DashboardView {
  constructor(repository) {
    this.repo = repository;
    this.map = null;
    this.geoJsonLayer = null;
    this.scatterChart = null;
    this.selectedCaNum = null;

    this.state = {
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
    const growthSlider = document.getElementById("weight-growth");
    const rentSlider = document.getElementById("weight-rent");
    const burdenSlider = document.getElementById("weight-burden");
    const flaggedToggle = document.getElementById("toggle-flagged");
    const segmentSelect = document.getElementById("filter-segment");

    const syncSliders = () => {
      this.state.growthWeight = Number(growthSlider.value);
      this.state.rentHeadroomWeight = Number(rentSlider.value);
      this.state.affordabilityWeight = Number(burdenSlider.value);

      document.getElementById("val-growth").textContent = `${this.state.growthWeight}%`;
      document.getElementById("val-rent").textContent = `${this.state.rentHeadroomWeight}%`;
      document.getElementById("val-burden").textContent = `${this.state.affordabilityWeight}%`;

      this.render();
    };

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

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
      maxZoom: 18,
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
      : '<span class="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded">Validated ACS</span>';

    const spotlight = document.getElementById("area-spotlight");
    spotlight.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
        <div>
          <span class="text-xs font-semibold uppercase tracking-wider text-indigo-600">${target.getSegment()}</span>
          <h4 class="text-lg font-bold text-slate-900">${target.name} <span class="text-xs font-normal text-slate-500">(#${target.caNum})</span></h4>
        </div>
        ${badge}
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div class="bg-slate-50 p-2.5 rounded">
          <div class="text-xs text-slate-500">FB Share Shift</div>
          <div class="font-bold text-slate-900">${target.fbShareChangePts > 0 ? "+" : ""}${target.fbShareChangePts.toFixed(2)} pts</div>
          <div class="text-xs text-slate-400">${(target.fbShare2015 * 100).toFixed(1)}% → ${(target.fbShare2024 * 100).toFixed(1)}%</div>
        </div>
        <div class="bg-slate-50 p-2.5 rounded">
          <div class="text-xs text-slate-500">FB Net Change</div>
          <div class="font-bold text-slate-900">${target.fbCountChange > 0 ? "+" : ""}${target.fbCountChange.toLocaleString()}</div>
          <div class="text-xs text-slate-400">${target.arrivals2024.toLocaleString()} arrivals/yr</div>
        </div>
        <div class="bg-slate-50 p-2.5 rounded">
          <div class="text-xs text-slate-500">Real Rent Growth</div>
          <div class="font-bold text-slate-900">${target.rentRealPctChange > 0 ? "+" : ""}${target.rentRealPctChange.toFixed(1)}%</div>
          <div class="text-xs text-slate-400">$${target.medianRent2024.toLocaleString()}/mo (2024)</div>
        </div>
        <div class="bg-slate-50 p-2.5 rounded">
          <div class="text-xs text-slate-500">Cost-Burdened</div>
          <div class="font-bold text-slate-900">${(target.burdenShare2024 * 100).toFixed(1)}%</div>
          <div class="text-xs text-slate-400">${target.burdenChangePts > 0 ? "+" : ""}${target.burdenChangePts.toFixed(1)} pts shift</div>
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
      },
      {
        excludeFlagged: this.state.excludeFlagged,
        segment: this.state.segment,
      }
    );

    this._updateMap(ranked);
    this._updateScatter(ranked);
    this._updateScorecard(ranked);
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