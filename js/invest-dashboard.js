/* =========================================================
   MODULE: INVEST DASHBOARD – Sprint 5
   - Render 4 chart từ data/invest-projects.json bằng Chart.js.
   - Mode 'dashboard' của Invest view (#invest/dashboard).
   - API: window.InvestDashboard.render(containerEl)
   ========================================================= */

window.InvestDashboard = (() => {
  let activeCharts = [];

  function destroy() {
    activeCharts.forEach(c => { try { c.destroy(); } catch(_) {} });
    activeCharts = [];
  }

  /* Palette nhạt đồng bộ theme sáng */
  const PALETTE = ['#2bb6e6', '#22b46e', '#f4a73b', '#7c5cff', '#26C6DA', '#ee5a6f', '#ffd93d'];
  const STATUS_COLOR = { ready: '#22b46e', planned: '#2bb6e6', calling: '#f4a73b' };
  const t = (k, vars) => (window.I18n ? window.I18n.t(k, vars) : k);
  const statusShort = key => t('invest.dashboard.statusShort.' + key);

  function aggregate(projects, sectors) {
    const sectorMap = Object.fromEntries(
      sectors.filter(s => s.id !== 'all').map(s => [s.id, (window.I18n?.t(s.titleKey)) || s.id])
    );

    /* 1. Capital by sector */
    const capBySector = {};
    projects.forEach(p => { capBySector[p.sector] = (capBySector[p.sector] || 0) + (p.capital_billion_vnd || 0); });

    /* 2. Project count by sector */
    const cntBySector = {};
    projects.forEach(p => { cntBySector[p.sector] = (cntBySector[p.sector] || 0) + 1; });

    /* 3. Top districts by capital */
    const capByDistrict = {};
    projects.forEach(p => { capByDistrict[p.district] = (capByDistrict[p.district] || 0) + (p.capital_billion_vnd || 0); });
    const topDistricts = Object.entries(capByDistrict).sort((a, b) => b[1] - a[1]).slice(0, 6);

    /* 4. Status distribution */
    const byStatus = { ready: 0, planned: 0, calling: 0 };
    projects.forEach(p => { if (byStatus[p.status] !== undefined) byStatus[p.status]++; });

    return { sectorMap, capBySector, cntBySector, topDistricts, byStatus };
  }

  function commonOpts(extra = {}) {
    return Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: "'Be Vietnam Pro', sans-serif", size: 11 }, color: '#555' } },
        tooltip: { backgroundColor: '#1a1a1a', titleFont: { size: 12 }, bodyFont: { size: 12 } }
      }
    }, extra);
  }

  function render(container) {
    if (!window.Chart) {
      container.innerHTML = `<div class="iv-empty">${t('invest.dashboard.noChart')}</div>`;
      return;
    }
    destroy();

    const data = window.INVEST_DATA;
    const agg = aggregate(data.projects, data.sectors);
    const sectorIds = Object.keys(agg.capBySector);
    const sectorLabels = sectorIds.map(id => agg.sectorMap[id] || id);

    container.innerHTML = `
      <div class="iv-dash-grid">
        <div class="iv-dash-card">
          <div class="iv-dash-h">${t('invest.dashboard.ch1.title')}</div>
          <div class="iv-dash-sub">${t('invest.dashboard.ch1.sub')}</div>
          <div class="iv-dash-canvas"><canvas id="ch-cap-sector"></canvas></div>
        </div>
        <div class="iv-dash-card">
          <div class="iv-dash-h">${t('invest.dashboard.ch2.title')}</div>
          <div class="iv-dash-sub">${t('invest.dashboard.ch2.sub')}</div>
          <div class="iv-dash-canvas"><canvas id="ch-cnt-sector"></canvas></div>
        </div>
        <div class="iv-dash-card">
          <div class="iv-dash-h">${t('invest.dashboard.ch3.title')}</div>
          <div class="iv-dash-sub">${t('invest.dashboard.ch3.sub')}</div>
          <div class="iv-dash-canvas"><canvas id="ch-top-district"></canvas></div>
        </div>
        <div class="iv-dash-card">
          <div class="iv-dash-h">${t('invest.dashboard.ch4.title')}</div>
          <div class="iv-dash-sub">${t('invest.dashboard.ch4.sub')}</div>
          <div class="iv-dash-canvas"><canvas id="ch-status"></canvas></div>
        </div>
      </div>
    `;

    /* 1. Capital by sector – pie */
    activeCharts.push(new Chart(container.querySelector('#ch-cap-sector'), {
      type: 'pie',
      data: {
        labels: sectorLabels,
        datasets: [{
          data: sectorIds.map(id => agg.capBySector[id]),
          backgroundColor: sectorIds.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: '#fff', borderWidth: 2
        }]
      },
      options: commonOpts()
    }));

    /* 2. Project count by sector – doughnut */
    activeCharts.push(new Chart(container.querySelector('#ch-cnt-sector'), {
      type: 'doughnut',
      data: {
        labels: sectorLabels,
        datasets: [{
          data: sectorIds.map(id => agg.cntBySector[id]),
          backgroundColor: sectorIds.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: '#fff', borderWidth: 2
        }]
      },
      options: commonOpts({ cutout: '55%' })
    }));

    /* 3. Top districts – horizontal bar */
    activeCharts.push(new Chart(container.querySelector('#ch-top-district'), {
      type: 'bar',
      data: {
        labels: agg.topDistricts.map(([d]) => d),
        datasets: [{
          label: t('invest.dashboard.capLabel'),
          data: agg.topDistricts.map(([, v]) => v),
          backgroundColor: '#2bb6e6',
          borderRadius: 6
        }]
      },
      options: commonOpts({
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#eef0f2' }, ticks: { font: { size: 10 } } },
          y: { grid: { display: false }, ticks: { font: { size: 11 } } }
        }
      })
    }));

    /* 4. Status – donut */
    const statusKeys = Object.keys(agg.byStatus);
    activeCharts.push(new Chart(container.querySelector('#ch-status'), {
      type: 'doughnut',
      data: {
        labels: statusKeys.map(k => statusShort(k)),
        datasets: [{
          data: statusKeys.map(k => agg.byStatus[k]),
          backgroundColor: statusKeys.map(k => STATUS_COLOR[k]),
          borderColor: '#fff', borderWidth: 2
        }]
      },
      options: commonOpts({ cutout: '60%' })
    }));
  }

  return { render, destroy };
})();
