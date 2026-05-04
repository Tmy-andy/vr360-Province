/* =========================================================
   MODULE: INVEST DATA LOADER
   - Tải song song nhiều file JSON invest-* và gộp vào
     window.INVEST_DATA = { sectors, projects, ...meta }.
   - Pattern y hệt js/data.js để dễ thay sang API thật sau này.
   ========================================================= */

window.INVEST_DATA = null;

const _INVEST_MANIFEST = [
  { key: 'meta',     url: 'data/invest.json',           required: true,  flatten: true },
  { key: 'sectors',  url: 'data/invest-sectors.json',   required: true },
  { key: 'projects', url: 'data/invest-projects.json',  required: true }
];

async function loadInvestData() {
  if (window.INVEST_DATA) return window.INVEST_DATA;
  const results = await Promise.all(
    _INVEST_MANIFEST.map(async m => {
      try {
        const res = await fetch(m.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return [m, await res.json()];
      } catch (err) {
        if (m.required) throw new Error(`Không tải được ${m.url}: ${err.message}`);
        console.warn(`[invest-data] Bỏ qua ${m.url}:`, err.message);
        return [m, null];
      }
    })
  );
  const out = {};
  for (const [m, json] of results) {
    if (!json) continue;
    if (m.flatten) {
      Object.assign(out, json);            // meta: trải các key vào root
    } else if (m.key === 'sectors') {
      out.sectors = json.sectors;
    } else if (m.key === 'projects') {
      out.projects = json.projects;
    } else {
      out[m.key] = json;
    }
  }
  window.INVEST_DATA = out;
  return out;
}
