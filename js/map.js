/* =========================================================
   MODULE: MAP – Bản đồ Leaflet, lớp nền & marker
   API export ra window:
     - initMap()              : khởi tạo bản đồ
     - setLayer(key)          : đổi lớp nền (satellite|street|topo|dark)
     - addMarker(place)       : thêm 1 marker
     - flyTo(id)              : bay tới địa điểm theo id
     - markers                : map { id -> {marker, el} } để highlight
   ========================================================= */

window.MapModule = (() => {
  let map = null;
  let tileLayers = [];
  const markers = {};
  let hoverCard = null;
  let hoverPlace = null;
  let hideTimer = null;

  function ensureHoverCard() {
    if (hoverCard) return hoverCard;
    hoverCard = document.createElement('div');
    hoverCard.id = 'hotspot-card';
    document.getElementById('map').appendChild(hoverCard);
    hoverCard.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    hoverCard.addEventListener('mouseleave', scheduleHideCard);
    return hoverCard;
  }

  function starsHTML(r) {
    const full = Math.round(r);
    let s = '';
    for (let i = 1; i <= 5; i++) s += `<span class="${i <= full ? 'on' : ''}">★</span>`;
    return s;
  }

  function showHoverCard(place, markerEl) {
    clearTimeout(hideTimer);
    hoverPlace = place;
    const card = ensureHoverCard();
    const numLocale = window.I18n?.lang === 'vi' ? 'vi' : 'en';
    const t = window.I18n?.t || (k => k);
    card.innerHTML = `
      <div class="hc-img" style="background-image:url('${place.img}')">
        <span class="hc-views">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
          ${(place.rv || 0).toLocaleString(numLocale)}
        </span>
      </div>
      <div class="hc-body">
        <div class="hc-name">${place.name}</div>
        <div class="hc-desc">${place.desc || ''}</div>
        <div class="hc-rating">
          <b>${place.r?.toFixed ? place.r.toFixed(1) : place.r}</b>
          <span class="hc-stars">${starsHTML(place.r || 0)}</span>
          <span class="sep">|</span>
          ${(place.rv || 0).toLocaleString(numLocale)} ${t('card.reviews') || 'Đánh giá'}
        </div>
        <div class="hc-actions">
          <button class="hc-go" data-act="go">
            Tham quan
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
          </button>
          <button class="hc-icon" data-act="locate" title="Định vị">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          </button>
          <button class="hc-icon" data-act="share" title="Chia sẻ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>`;

    card.querySelector('[data-act="go"]').onclick = () => { hideHoverCard(true); window.UI.enterVRMode(place); };
    card.querySelector('[data-act="locate"]').onclick = () => flyTo(place.id);
    card.querySelector('[data-act="share"]').onclick = () => {
      const url = location.href.split('#')[0] + '#place=' + place.id;
      navigator.clipboard?.writeText(url);
    };

    positionHoverCard(markerEl);
    requestAnimationFrame(() => card.classList.add('show'));
  }

  function positionHoverCard(markerEl) {
    if (!hoverCard || !markerEl) return;
    const mapRect = document.getElementById('map').getBoundingClientRect();
    const r = markerEl.getBoundingClientRect();
    hoverCard.style.left = (r.left - mapRect.left + r.width / 2) + 'px';
    hoverCard.style.top = (r.top - mapRect.top) + 'px';
  }

  function scheduleHideCard() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => hideHoverCard(), 180);
  }

  function hideHoverCard(immediate) {
    clearTimeout(hideTimer);
    if (!hoverCard) return;
    hoverCard.classList.remove('show');
    hoverPlace = null;
  }

  function initMap() {
    const p = window.APP_DATA.province;
    /* doubleClickZoom: false – để dành cử chỉ double-click cho toggle fullscreen
       (xử lý ở ui.js). User vẫn zoom bằng nút +/- và scroll wheel. */
    map = L.map('map', { center: [p.lat, p.lng], zoom: p.zoom, zoomControl: false, doubleClickZoom: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    setLayer('satellite');
    window.APP_DATA.places.forEach(addMarker);
    map.on('move zoom movestart zoomstart', () => {
      if (hoverPlace && markers[hoverPlace.id]) positionHoverCard(markers[hoverPlace.id].el);
    });
    map.on('click', () => hideHoverCard(true));
    window.map = map;
    return map;
  }

  function setLayer(key) {
    const layers = window.APP_DATA.layers;
    tileLayers.forEach(l => map.removeLayer(l));
    tileLayers = [];
    (layers[key] || layers.satellite).forEach(cfg => {
      tileLayers.push(L.tileLayer(cfg.url, cfg.opts).addTo(map));
    });
    document.querySelectorAll('.layer-option').forEach(el => {
      el.classList.toggle('active', el.dataset.layer === key);
    });
  }

  function addMarker(place) {
    const el = document.createElement('div');
    el.className = 'mmarker';
    el.textContent = place.id;
    const icon = L.divIcon({ html: el, className: '', iconSize: [30, 30], iconAnchor: [15, 15] });
    const m = L.marker([place.lat, place.lng], { icon }).addTo(map);
    m.on('click', e => {
      L.DomEvent.stopPropagation(e);
      window.UI.enterVRMode(place);
    });
    el.addEventListener('mouseenter', () => showHoverCard(place, el));
    el.addEventListener('mouseleave', scheduleHideCard);
    markers[place.id] = { marker: m, el };
  }

  function flyTo(id) {
    const a = window.APP_DATA.places.find(x => x.id === id);
    if (a) map.flyTo([a.lat, a.lng], 15, { duration: 1.4 });
  }

  function flyToCoords(lat, lng, zoom) {
    map.flyTo([lat, lng], zoom, { duration: 1.2 });
  }

  function onMapClick(handler) {
    map.on('click', handler);
  }

  /* =========================================================
     INVEST LAYER (Sprint 5) – marker dự án + polygon KCN
     ========================================================= */
  let investLayer = null;
  let investData = null;
  let investSectorFilter = 'all';
  let investMarkerMap = {};   // slug -> marker

  /* Màu badge theo status (đồng bộ invest.css) */
  const STATUS_COLOR = {
    ready:   '#22b46e',
    planned: '#2bb6e6',
    calling: '#f4a73b'
  };

  async function ensureInvestData() {
    if (investData) return investData;
    const [proj, kcn] = await Promise.all([
      fetch('data/invest-projects.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('data/kcn-lamdong.geojson').then(r => r.ok ? r.json() : null).catch(() => null)
    ]);
    investData = { projects: proj?.projects || [], kcn };
    return investData;
  }

  function buildInvestPopupHtml(p) {
    const statusLabel = ({ ready: 'Sẵn sàng mặt bằng', planned: 'Đã có quy hoạch', calling: 'Đang kêu gọi' })[p.status] || p.status;
    const cap = (p.capital_billion_vnd || 0).toLocaleString('vi-VN');
    return `
      <div class="iv-mpop">
        <div class="iv-mpop-img" style="background-image:url('${p.image}')"></div>
        <div class="iv-mpop-body">
          <div class="iv-mpop-title">${p.name}</div>
          <div class="iv-mpop-meta">
            <span>📍 ${p.district}</span>
            <span>💰 ${cap} tỷ</span>
          </div>
          <span class="iv-mpop-badge" style="--c:${STATUS_COLOR[p.status] || '#888'}">${statusLabel}</span>
          <a class="iv-mpop-cta" href="#invest/project/${p.slug}">Xem chi tiết →</a>
        </div>
      </div>
    `;
  }

  function makeInvestIcon(status) {
    const color = STATUS_COLOR[status] || '#2bb6e6';
    const html = `<div class="iv-mmarker" style="background:${color}">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
    </div>`;
    return L.divIcon({ html, className: '', iconSize: [30, 30], iconAnchor: [15, 15] });
  }

  function applySectorFilter() {
    if (!investLayer) return;
    Object.entries(investMarkerMap).forEach(([slug, m]) => {
      const p = investData.projects.find(x => x.slug === slug);
      const visible = investSectorFilter === 'all' || p.sector === investSectorFilter;
      if (visible) { if (!investLayer.hasLayer(m)) m.addTo(investLayer); }
      else { investLayer.removeLayer(m); }
    });
  }

  async function showInvestLayer() {
    const d = await ensureInvestData();
    if (!investLayer) {
      investLayer = L.featureGroup();
      /* Markers dự án */
      d.projects.forEach(p => {
        if (typeof p.lat !== 'number') return;
        const m = L.marker([p.lat, p.lng], { icon: makeInvestIcon(p.status), riseOnHover: true });
        m.bindPopup(buildInvestPopupHtml(p), { className: 'iv-mpop-wrap', maxWidth: 280, minWidth: 240 });
        m.addTo(investLayer);
        investMarkerMap[p.slug] = m;
      });
      /* KCN polygons */
      if (d.kcn) {
        L.geoJSON(d.kcn, {
          style: () => ({ color: '#2bb6e6', weight: 2, fillColor: '#2bb6e6', fillOpacity: 0.18, dashArray: '4 4' }),
          onEachFeature: (feat, layer) => {
            const pr = feat.properties || {};
            layer.bindTooltip(`<b>${pr.name}</b><br/>${pr.district || ''} · ${pr.area_ha || '?'} ha · lấp đầy ${pr.fill_rate || 0}%`, { sticky: true });
          }
        }).addTo(investLayer);
      }
    }
    investLayer.addTo(map);
    applySectorFilter();
  }

  function hideInvestLayer() {
    if (investLayer && map.hasLayer(investLayer)) map.removeLayer(investLayer);
  }

  function isInvestVisible() {
    return !!(investLayer && map.hasLayer(investLayer));
  }

  async function toggleInvestLayer() {
    if (isInvestVisible()) hideInvestLayer();
    else await showInvestLayer();
    return isInvestVisible();
  }

  function setInvestSectorFilter(sectorId) {
    investSectorFilter = sectorId || 'all';
    if (isInvestVisible()) applySectorFilter();
  }

  let highlightCircle = null;
  let highlightTimer = null;

  async function flyToProject(slug) {
    if (!isInvestVisible()) await showInvestLayer();
    const m = investMarkerMap[slug];
    if (!m) return;
    const ll = m.getLatLng();
    map.flyTo(ll, 13, { duration: 1.2 });
    /* Vòng tròn highlight pulse — xoá sau 6s hoặc khi click chỗ khác */
    if (highlightCircle) map.removeLayer(highlightCircle);
    clearTimeout(highlightTimer);
    highlightCircle = L.circle(ll, {
      radius: 1200,
      color: '#2bb6e6',
      weight: 2.5,
      fillColor: '#2bb6e6',
      fillOpacity: 0.12,
      className: 'iv-highlight-ring'
    }).addTo(map);
    highlightTimer = setTimeout(() => {
      if (highlightCircle) { map.removeLayer(highlightCircle); highlightCircle = null; }
    }, 6000);
    setTimeout(() => m.openPopup(), 1100);
  }

  function clearHighlight() {
    if (highlightCircle) { map.removeLayer(highlightCircle); highlightCircle = null; }
    clearTimeout(highlightTimer);
  }

  return {
    initMap, setLayer, addMarker, flyTo, flyToCoords, onMapClick, markers,
    zoomIn:  () => map?.zoomIn?.(),
    zoomOut: () => map?.zoomOut?.(),
    get map() { return map; },
    /* Sprint 5 */
    showInvestLayer, hideInvestLayer, toggleInvestLayer, isInvestVisible,
    setInvestSectorFilter, flyToProject, clearHighlight
  };
})();
