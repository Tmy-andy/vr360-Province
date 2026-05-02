/* =========================================================
   MODULE: INVEST DATA LOADER
   - Tải song song nhiều file JSON invest-* và gộp vào
     window.INVEST_DATA = { sectors, projects, policy, ... }.
   - Sprint 1: chỉ load invest-sectors.json (đủ cho sidebar).
     Các file còn lại để Sprint sau – khai báo sẵn ở MANIFEST
     để khi có file thì uncomment, không phải sửa logic.
   ========================================================= */

window.INVEST_DATA = null;

const _INVEST_MANIFEST = [
  { key: 'sectors',   url: 'data/invest-sectors.json',  required: true  },
  // Các file dưới đây sẽ được kích hoạt ở Sprint sau:
  // { key: 'projects',  url: 'data/invest-projects.json',  required: false },
  // { key: 'policy',    url: 'data/invest-policy.json',    required: false },
  // { key: 'resources', url: 'data/invest-resources.json', required: false },
  // { key: 'events',    url: 'data/invest-events.json',    required: false },
  // { key: 'success',   url: 'data/invest-success.json',   required: false }
];

async function loadInvestData() {
  if (window.INVEST_DATA) return window.INVEST_DATA;
  const results = await Promise.all(
    _INVEST_MANIFEST.map(async m => {
      try {
        const res = await fetch(m.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return [m.key, await res.json()];
      } catch (err) {
        if (m.required) throw new Error(`Không tải được ${m.url}: ${err.message}`);
        console.warn(`[invest-data] Bỏ qua ${m.url}:`, err.message);
        return [m.key, null];
      }
    })
  );
  window.INVEST_DATA = Object.fromEntries(results);
  return window.INVEST_DATA;
}
