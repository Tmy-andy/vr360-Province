/* =========================================================
   MODULE: UI – 2D Panel, 3D VR mode với overlay đầy đủ
   ========================================================= */

window.UI = (() => {
  /* ===== STATE ===== */
  let activeCat = 'all';
  let searchQ = '';
  let locFilter = '';
  let panelOpen = false;
  let vrMode = false;
  let uiHidden = false;
  let autoRotating = false;
  let currentVRPlace = null;
  let vrViewer = null;
  let minimapLeaflet = null;
  let headingRaf = null;

  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function toggleVRUI() {
    uiHidden = !uiHidden;
    $('vr-ui').classList.toggle('ui-hidden', uiHidden);
    $('minimap').classList.toggle('ui-hidden', uiHidden);
    $('vr-reveal-btn').classList.toggle('visible', uiHidden);
    $('vr-hideui').classList.toggle('active', uiHidden);
  }
  function showVRUI() {
    uiHidden = false;
    $('vr-ui').classList.remove('ui-hidden');
    $('minimap').classList.remove('ui-hidden');
    $('vr-reveal-btn').classList.remove('visible');
    $('vr-hideui').classList.remove('active');
  }

  /* ===== PANEL ===== */
  function openPanel() {
    panelOpen = true;
    $('right-panel').classList.add('open');
    $('right-panel-bg').classList.add('open');
    $('map').classList.add('panel-open');
    $('bottom-bar').classList.add('panel-open');
    $('panel-toggle').classList.remove('closed');
    const mb = $('mobile-panel-btn'); if (mb) mb.classList.add('active');
  }
  function closePanel() {
    panelOpen = false;
    $('right-panel').classList.remove('open');
    $('right-panel-bg').classList.remove('open');
    $('map').classList.remove('panel-open');
    $('bottom-bar').classList.remove('panel-open');
    $('panel-toggle').classList.add('closed');
    const mb = $('mobile-panel-btn'); if (mb) mb.classList.remove('active');
  }

  /* ===== LIST RENDER ===== */
  function renderList() {
    const { places } = window.APP_DATA;
    const t = window.I18n.t;
    const numLocale = window.I18n.lang === 'vi' ? 'vi' : 'en';
    const filtered = places.filter(a => {
      const catOk = activeCat === 'all' || a.cat === activeCat;
      const qOk = !searchQ || a.name.toLowerCase().includes(searchQ) || a.loc.toLowerCase().includes(searchQ);
      const locOk = !locFilter || a.loc === locFilter;
      return catOk && qOk && locOk;
    });
    $('p-count').textContent = t('count.places', { n: filtered.length });
    $('p-list').innerHTML = filtered.map(a => `
      <div class="lcard" data-id="${a.id}">
        <div class="lthumb"><img src="${a.img}" alt="${a.name}" loading="lazy" onerror="this.style.opacity=0" /></div>
        <div class="lbody">
          <div class="lname">${a.name}</div>
          <div class="ltype">${t('cat_long.' + a.cat)}</div>
          <div class="lrating">${a.r} <span class="lstar">★</span><span class="sep">|</span>${a.rv.toLocaleString(numLocale)} ${t('card.reviews')}</div>
          <div class="lactions">
            <button class="btn-go" data-id="${a.id}">${t('buttons.go')}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z"/><circle cx="12" cy="9" r="2"/></svg>
            </button>
            <button class="btn-share" title="${t('buttons.share')}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
    document.querySelectorAll('.lcard').forEach(el => {
      el.addEventListener('click', () => {
        const place = window.APP_DATA.places.find(x => x.id === +el.dataset.id);
        if (place) enterVRMode(place);
      });
    });
    document.querySelectorAll('.btn-go').forEach(el =>
      el.addEventListener('click', e => { e.stopPropagation(); window.MapModule.flyTo(+el.dataset.id); })
    );
  }

  /* ===== RIPPLE TRANSITION ===== */
  function expandRipple(originX, originY) {
    return new Promise(resolve => {
      const el = $('view-transition');
      const dx = Math.max(originX, window.innerWidth - originX);
      const dy = Math.max(originY, window.innerHeight - originY);
      const scale = Math.ceil((Math.sqrt(dx * dx + dy * dy) * 2) / 10);

      el.style.transition = 'none';
      el.style.left = originX + 'px';
      el.style.top = originY + 'px';
      el.style.transform = 'translate(-50%, -50%) scale(0)';
      el.style.opacity = '1';
      el.getBoundingClientRect();

      el.style.transition = 'transform 0.52s cubic-bezier(.4,0,.2,1)';
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;
      setTimeout(resolve, 540);
    });
  }

  function collapseRipple(destX, destY) {
    return new Promise(resolve => {
      const el = $('view-transition');
      const dx = Math.max(destX, window.innerWidth - destX);
      const dy = Math.max(destY, window.innerHeight - destY);
      const scale = Math.ceil((Math.sqrt(dx * dx + dy * dy) * 2) / 10);

      el.style.transition = 'none';
      el.style.left = destX + 'px';
      el.style.top = destY + 'px';
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;
      el.style.opacity = '1';
      el.getBoundingClientRect();

      el.style.transition = 'transform 0.52s cubic-bezier(.4,0,.2,1), opacity 0.35s ease 0.18s';
      el.style.transform = 'translate(-50%, -50%) scale(0)';
      el.style.opacity = '0';
      setTimeout(resolve, 600);
    });
  }

  /* ===== VR MODE: ENTER ===== */
  async function enterVRMode(place) {
    if (!place || vrMode) return;
    currentVRPlace = place;

    // Highlight marker on map
    Object.values(window.MapModule.markers).forEach(({ el }) => el.classList.remove('active'));
    if (window.MapModule.markers[place.id]) window.MapModule.markers[place.id].el.classList.add('active');

    // 1. Fly map to location then wait
    window.MapModule.flyTo(place.id);
    await sleep(1500);

    // 2. Ripple expand from screen center
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    await expandRipple(cx, cy);

    // 3. Enter 3D mode
    vrMode = true;
    uiHidden = false;
    document.body.classList.add('mode-3d');

    // 4. Init Pannellum VR
    initVRViewer(place);

    // 5. Populate VR overlay UI
    populateVROverlay(place);

    // 6. Init minimap (delay for DOM visibility)
    await sleep(60);
    initMinimap(place);

    // 7. Collapse ripple to reveal VR
    await collapseRipple(cx, cy);

    // 8. Start heading update loop
    startHeadingUpdate();
  }

  function initVRViewer(place) {
    const container = $('vr-pannellum');
    container.innerHTML = '';
    vrViewer = null;

    if (typeof pannellum !== 'undefined') {
      try {
        vrViewer = pannellum.viewer(container, {
          type: 'equirectangular',
          panorama: place.img,
          autoLoad: true,
          showControls: false,
          compass: false,
          showFullscreenCtrl: false,
          showZoomCtrl: false,
          mouseZoom: true,
          draggable: true,
          hfov: 100,
        });
        return;
      } catch (e) {
        console.warn('[VR360] Pannellum init failed:', e);
      }
    }
    // Fallback iframe
    container.innerHTML = `<iframe
      src="https://pannellum.org/api/?panorama=${encodeURIComponent(place.img)}&autoLoad=true&title=${encodeURIComponent(place.name)}&showControls=false"
      style="width:100%;height:100%;border:none;"
      allow="vr; gyroscope; accelerometer"></iframe>`;
  }

  function populateVROverlay(place) {
    // Info panel
    $('vr-place-name').textContent = place.name;
    $('vr-place-desc').textContent = place.desc || '';
    $('vr-meta-hours').textContent = place.hours || '—';
    $('vr-meta-rating').textContent = `★ ${place.r}  (${place.rv?.toLocaleString('vi')} đánh giá)`;
    $('vr-meta-entry').textContent = place.entry || '—';

    // Location dropdown – có thumbnail ảnh cho từng lựa chọn
    $('vr-loc-current').textContent = place.name;
    const locList = $('vr-loc-list');
    locList.innerHTML = window.APP_DATA.places.map(p => `
      <div class="vr-loc-opt${p.id === place.id ? ' selected' : ''}" data-id="${p.id}">
        <div class="vr-loc-thumb"><img src="${p.img}" alt="" loading="lazy" onerror="this.style.opacity=0"/></div>
        <div class="vr-loc-meta">
          <div class="vr-loc-name">${p.name}</div>
          ${p.area ? `<div class="vr-loc-sub">${p.area}</div>` : ''}
        </div>
      </div>
    `).join('');
    locList.querySelectorAll('.vr-loc-opt').forEach(el => {
      el.addEventListener('click', () => {
        const newPlace = window.APP_DATA.places.find(x => x.id === +el.dataset.id);
        if (newPlace) { $('vr-loc-dd').classList.remove('open'); switchVRPlace(newPlace); }
      });
    });

    // Language label sync
    $('vr-lang-label').textContent = window.I18n.lang.toUpperCase();

    // Show info panel
    $('vr-info').classList.remove('hidden');

    // Reset controls state
    autoRotating = false;
    $('vr-autorot').classList.remove('active');
  }

  async function switchVRPlace(newPlace) {
    if (!vrMode) return;
    currentVRPlace = newPlace;

    // Fade pannellum container, switch, fade back
    const pnlm = $('vr-pannellum');
    pnlm.style.transition = 'opacity .3s ease';
    pnlm.style.opacity = '0';
    await sleep(300);

    if (vrViewer && typeof vrViewer.destroy === 'function') {
      try { vrViewer.destroy(); } catch (e) {}
      vrViewer = null;
    }
    initVRViewer(newPlace);
    populateVROverlay(newPlace);
    $('vr-loc-current').textContent = newPlace.name;

    // Update minimap tile
    document.getElementById('minimap-map').style.backgroundImage = `url(${minimapTileUrl(newPlace, 12)})`;

    pnlm.style.opacity = '1';
  }

  /* Convert lat/lng to tile XY at given zoom (Mercator tile scheme) */
  function latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y };
  }

  function minimapTileUrl(place, zoom) {
    const { x, y } = latLngToTile(place.lat, place.lng, zoom);
    // ESRI World Imagery – same layer as main map satellite
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
  }

  function initMinimap(place) {
    // Use static satellite tile – avoids Leaflet stacking context covering the SVG overlay
    const mapEl = document.getElementById('minimap-map');
    mapEl.style.backgroundImage = `url(${minimapTileUrl(place, 12)})`;
    // Reset any previous Leaflet instance (shouldn't exist but safety)
    if (minimapLeaflet) { minimapLeaflet.remove(); minimapLeaflet = null; }
  }

  /* Compute SVG arc path for FOV sector.
     cx,cy = center (100,100), r = radius, yaw = Pannellum heading, hfov = field of view */
  function computeFOVPath(yaw, hfov) {
    const cx = 100, cy = 100, r = 84;
    const half = (hfov || 100) / 2;
    // In SVG: angle 0 = right (east), north = -90deg.
    // Map yaw (0=forward) to SVG angle where -90deg = up (north).
    const startDeg = yaw - half - 90;
    const endDeg = yaw + half - 90;
    const s = startDeg * Math.PI / 180;
    const e = endDeg * Math.PI / 180;
    const x1 = (cx + r * Math.cos(s)).toFixed(2);
    const y1 = (cy + r * Math.sin(s)).toFixed(2);
    const x2 = (cx + r * Math.cos(e)).toFixed(2);
    const y2 = (cy + r * Math.sin(e)).toFixed(2);
    const largeArc = hfov > 180 ? 1 : 0;
    return `M${cx},${cy} L${x1},${y1} A${r},${r},0,${largeArc},1,${x2},${y2} Z`;
  }

  function startHeadingUpdate() {
    if (headingRaf) cancelAnimationFrame(headingRaf);
    const sector = $('fov-sector');

    function tick() {
      if (!vrMode) return;
      if (vrViewer && typeof vrViewer.getYaw === 'function') {
        try {
          const yaw = vrViewer.getYaw();
          const hfov = vrViewer.getHfov ? vrViewer.getHfov() : 100;
          if (sector) sector.setAttribute('d', computeFOVPath(yaw, hfov));
        } catch (e) {}
      }
      headingRaf = requestAnimationFrame(tick);
    }
    headingRaf = requestAnimationFrame(tick);
  }

  /* ===== VR MODE: EXIT ===== */
  async function exitVRMode() {
    if (!vrMode) return;

    // Ripple from minimap center
    const mm = $('minimap');
    const rect = mm.getBoundingClientRect();
    const ox = rect.left + rect.width / 2;
    const oy = rect.top + rect.height / 2;
    await expandRipple(ox, oy);

    // Tear down
    vrMode = false;
    uiHidden = false;
    document.body.classList.remove('mode-3d');
    $('vr-ui').classList.remove('ui-hidden');

    if (headingRaf) { cancelAnimationFrame(headingRaf); headingRaf = null; }
    if (vrViewer && typeof vrViewer.destroy === 'function') {
      try { vrViewer.destroy(); } catch (e) {}
      vrViewer = null;
    }
    document.getElementById('minimap-map').style.backgroundImage = '';
    if (minimapLeaflet) { minimapLeaflet.remove(); minimapLeaflet = null; }
    $('vr-pannellum').innerHTML = '';

    // Reset UI state
    autoRotating = false;
    $('vr-autorot').classList.remove('active');
    $('vr-reveal-btn').classList.remove('visible');
    $('vr-hideui').classList.remove('active');

    // Reset markers
    Object.values(window.MapModule.markers).forEach(({ el }) => el.classList.remove('active'));

    // Collapse from screen center to reveal map
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    await collapseRipple(cx, cy);

    if (currentVRPlace) window.MapModule.flyTo(currentVRPlace.id);
  }

  /* ===== SEARCH ===== */
  function doSearch(q) {
    searchQ = q.toLowerCase().trim();
    if (!panelOpen) openPanel();
    renderList();
  }

  function renderSearchResults(q) {
    const box = $('search-results');
    const query = q.toLowerCase().trim();
    if (!query) { box.classList.remove('open'); box.innerHTML = ''; return; }
    const matches = window.APP_DATA.places.filter(a =>
      a.name.toLowerCase().includes(query) || a.loc.toLowerCase().includes(query)
    );
    if (!matches.length) {
      box.innerHTML = `<div class="sr-empty">${window.I18n.t('search.empty') || 'Không tìm thấy'}</div>`;
    } else {
      box.innerHTML = matches.map(a => `
        <div class="sr-item" data-id="${a.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          <div class="sr-name">${a.name}</div>
        </div>
      `).join('');
      box.querySelectorAll('.sr-item').forEach(el => {
        el.addEventListener('click', () => {
          const place = window.APP_DATA.places.find(x => x.id === +el.dataset.id);
          if (place) enterVRMode(place);
          $('search-input').value = '';
          closeSearchResults();
        });
      });
    }
    box.classList.add('open');
  }
  function closeSearchResults() { $('search-results').classList.remove('open'); }

  /* ===== LAYER POPUP ===== */
  function closeLayerPopup() {
    $('layer-popup').classList.remove('open');
    document.body.classList.remove('layers-open');
  }
  function toggleLayerPopup() {
    const isOpen = $('layer-popup').classList.toggle('open');
    document.body.classList.toggle('layers-open', isOpen);
  }

  /* ===== HELP TOUR – DANH SÁCH BƯỚC ===== */
  const HELP_ITEMS_2D = [
    { target: '#menu-btn',     round: true,  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>', label: 'Ẩn/hiện giao diện' },
    { target: '#mobile-panel-btn', round: true, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>', label: 'Mở danh sách địa điểm (toàn màn hình)' },
    { target: '#mobile-more-btn', round: true, svg: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>', label: 'Mở/đóng cột nút bên phải' },
    { target: '#search-bar',                 svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', label: 'Tìm kiếm địa điểm' },
    { target: '#xa-dd',                      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z"/><circle cx="12" cy="9" r="2.5"/></svg>', label: 'Lọc theo Xã/Phường' },
    { target: '#lang-btn',                   svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>', label: 'Đổi ngôn ngữ' },
    { target: '#three-d-btn',  round: true,  txt: '3D', label: 'Chuyển sang bản đồ 3D' },
    { target: '#fs-btn',       round: true,  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>', label: 'Toàn màn hình' },
    { target: '#zoom-in-btn',  round: true,  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>', label: 'Phóng to bản đồ' },
    { target: '#zoom-out-btn', round: true,  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>', label: 'Thu nhỏ bản đồ' },
    { target: '#layers-btn',   round: true,  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>', label: 'Thay đổi bản đồ nền' },
    { target: '#invest-layer-btn', round: true, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>', label: 'Hiện/ẩn dự án đầu tư + ranh giới các KCN trên bản đồ' },
    { target: '#help-btn',     round: true,  txt: '?', label: 'Mở hướng dẫn sử dụng' },
    { target: '#news-btn',     round: true,  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', label: 'Xem tin tức, sự kiện' },
    { target: '#left-bar .lbtn:nth-child(3)', round: true, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', label: 'Tài khoản người dùng' },
    { target: '#bottom-bar .bbt:nth-child(2)', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', label: 'Trang chủ' },
    { target: '#bottom-bar .bbt:nth-child(3)', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>', label: 'Cẩm nang Du lịch – Mẹo, kinh nghiệm, gợi ý lịch trình' },
    { target: '#bottom-bar .bbt:nth-child(4)', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>', label: 'Trợ lý AI – Câu hỏi nhanh về du lịch & đầu tư' },
    { target: '#bottom-bar .bbt:nth-child(5)', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>', label: 'Đầu tư Lâm Đồng – Dự án, chính sách, dashboard' },
    { target: '#bottom-bar .bbt:nth-child(6)', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>', label: 'Khởi động VR Tour 360°' },
  ];

  const HELP_ITEMS_3D = [
    { target: '#vr-loc-trigger',                      label: 'Chọn điểm đến VR khác từ danh sách' },
    { target: '#vr-lang-btn',     round: true,        label: 'Đổi ngôn ngữ giao diện' },
    { target: '#vr-vol-btn',      round: true,        label: 'Bật/tắt âm thanh nền' },
    { target: '#vr-share-btn',    round: true,        label: 'Chia sẻ điểm đến VR đang xem' },
    { target: '#vr-help-btn',     round: true,        label: 'Mở hướng dẫn sử dụng chế độ VR' },
    { target: '#vr-back-btn',                         label: 'Quay về bản đồ 2D' },
    { target: '#vr-info',                             label: 'Thông tin điểm đến: tên, giờ mở, đánh giá, vé vào' },
    { target: '#vr-autorot',                          label: 'Bật chế độ tự động xoay 360°' },
    { target: '#vr-zout',                             label: 'Thu nhỏ tầm nhìn (zoom out)' },
    { target: '#vr-hideui',                           label: 'Ẩn giao diện để xem toàn cảnh VR' },
    { target: '#vr-zin',                              label: 'Phóng to tầm nhìn (zoom in)' },
    { target: '#vr-fullscr',                          label: 'Xem VR ở chế độ toàn màn hình' },
    { target: '#minimap',                             label: 'Minimap la bàn – click để quay về bản đồ 2D' },
  ];

  /* ===== HELP TOUR (spotlight) ===== */
  let tourIdx = -1;
  let tourActive = false;
  let tourItems = HELP_ITEMS_2D;

  function startTour(items = HELP_ITEMS_2D, fromIndex = 0) {
    tourItems = items;
    tourActive = true;
    tourIdx = fromIndex;
    // Mobile: mở cột nút phải ra để spotlight chỉ đúng vị trí (đợi animation xong)
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile && items === HELP_ITEMS_2D) {
      document.body.classList.add('mobile-menu-open');
      $('tour-overlay').classList.add('open');
      setTimeout(showTourStep, 350);
      return;
    }
    $('tour-overlay').classList.add('open');
    showTourStep();
  }

  function endTour() {
    tourActive = false;
    $('tour-overlay').classList.remove('open');
    // Đóng menu mobile sau khi tour kết thúc
    document.body.classList.remove('mobile-menu-open');
  }

  function showTourStep() {
    if (!tourActive) return;
    if (tourIdx >= tourItems.length) { endTour(); return; }
    const item = tourItems[tourIdx];
    const target = item.target ? document.querySelector(item.target) : null;
    if (!target) { tourIdx++; showTourStep(); return; }

    const rect = target.getBoundingClientRect();
    /* Skip element ẩn (display:none / kích thước 0) — VD #mobile-panel-btn
       trên desktop, hoặc các #top-right ticons trước khi mobile-menu mở */
    if (rect.width === 0 || rect.height === 0) {
      tourIdx++; showTourStep(); return;
    }
    const pad = 6;
    const sx = rect.left - pad;
    const sy = rect.top - pad;
    const sw = rect.width + pad * 2;
    const sh = rect.height + pad * 2;

    const spot = $('tour-spot');
    spot.classList.toggle('round', !!item.round);
    spot.style.left = sx + 'px';
    spot.style.top = sy + 'px';
    spot.style.width = sw + 'px';
    spot.style.height = sh + 'px';

    // Tooltip nội dung
    const tip = $('tour-tip');
    tip.querySelector('.tt-step').textContent = `Bước ${tourIdx + 1} / ${tourItems.length}`;
    tip.querySelector('.tt-label').textContent = item.label;

    // Định vị tooltip: chọn cạnh có nhiều không gian nhất
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tipW = 280;
    const tipH = tip.offsetHeight || 110;
    const gap = 14;

    const space = {
      bottom: vh - (sy + sh),
      top: sy,
      right: vw - (sx + sw),
      left: sx,
    };
    let side = 'bottom';
    if (space.bottom < tipH + gap && space.top >= tipH + gap) side = 'top';
    else if (space.bottom < tipH + gap && space.right >= tipW + gap) side = 'right';
    else if (space.bottom < tipH + gap && space.left >= tipW + gap) side = 'left';

    let tx, ty;
    if (side === 'bottom') {
      tx = sx + sw / 2 - tipW / 2;
      ty = sy + sh + gap;
    } else if (side === 'top') {
      tx = sx + sw / 2 - tipW / 2;
      ty = sy - tipH - gap;
    } else if (side === 'right') {
      tx = sx + sw + gap;
      ty = sy + sh / 2 - tipH / 2;
    } else {
      tx = sx - tipW - gap;
      ty = sy + sh / 2 - tipH / 2;
    }
    // Giữ trong viewport
    tx = Math.max(10, Math.min(vw - tipW - 10, tx));
    ty = Math.max(10, Math.min(vh - tipH - 10, ty));

    tip.classList.remove('arrow-up', 'arrow-down', 'arrow-left', 'arrow-right');
    if (side === 'bottom') tip.classList.add('arrow-up');
    if (side === 'top')    tip.classList.add('arrow-down');
    if (side === 'right')  tip.classList.add('arrow-left');
    if (side === 'left')   tip.classList.add('arrow-right');

    // Vị trí mũi tên (offset dọc theo cạnh tooltip, trỏ về tâm spot)
    const spotCx = sx + sw / 2;
    const spotCy = sy + sh / 2;
    if (side === 'bottom' || side === 'top') {
      const ax = Math.max(14, Math.min(tipW - 28, spotCx - tx - 7));
      tip.style.setProperty('--arrow-x', ax + 'px');
    } else {
      const ay = Math.max(14, Math.min(tipH - 28, spotCy - ty - 7));
      tip.style.setProperty('--arrow-y', ay + 'px');
    }

    tip.style.left = tx + 'px';
    tip.style.top = ty + 'px';
  }


  /* ===== NEWS PANEL ===== */
  let newsTab = 'news';
  let newsPanelOpen = false;

  function formatDate(d = new Date()) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}-${d.getFullYear()}`;
  }

  function renderNewsList() {
    const data = window.APP_DATA;
    const items = newsTab === 'events' ? (data.events || []) : (data.news || []);
    const list = $('np-list');
    if (!items.length) {
      list.innerHTML = '<div style="text-align:center;color:#999;font-size:12.5px;padding:24px 8px">Chưa có nội dung</div>';
      return;
    }
    list.innerHTML = items.map(it => `
      <div class="ncard" data-url="${it.url}">
        <div class="nthumb"><img src="${it.img}" alt="" loading="lazy" onerror="this.style.opacity=0"/></div>
        <div class="nbody">
          <div class="ntitle">${it.title}</div>
          <div class="nexcerpt">${it.excerpt}</div>
        </div>
      </div>
    `).join('');
    list.querySelectorAll('.ncard').forEach(el => {
      el.addEventListener('click', () => {
        const url = el.dataset.url;
        if (url) window.open(url, '_blank', 'noopener');
      });
    });
  }

  function openNewsPanel() {
    newsPanelOpen = true;
    $('np-date').textContent = formatDate();
    $('news-panel').classList.add('open');
    $('news-btn').classList.add('active');
    renderNewsList();
  }
  function closeNewsPanel() {
    newsPanelOpen = false;
    $('news-panel').classList.remove('open');
    $('news-btn').classList.remove('active');
  }
  function setNewsTab(tab) {
    newsTab = tab;
    document.querySelectorAll('.np-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === tab));
    $('np-title').textContent = tab === 'events' ? 'Sự kiện' : 'Tin tức';
    renderNewsList();
  }

  /* ===== INIT EVENTS ===== */
  function initEvents() {
    /* 2D panel */
    $('panel-toggle').addEventListener('click', () => panelOpen ? closePanel() : openPanel());
    $('menu-btn').addEventListener('click', () => document.body.classList.toggle('focus-mode'));

    /* Mobile: nút "more" gom top-right + left-bar */
    $('mobile-more-btn').addEventListener('click', e => {
      e.stopPropagation();
      document.body.classList.toggle('mobile-menu-open');
    });
    /* Mobile: nút mở right-panel full screen */
    $('mobile-panel-btn').addEventListener('click', e => {
      e.stopPropagation();
      panelOpen ? closePanel() : openPanel();
    });
    /* Nút đóng panel (chỉ hiện ở mobile) */
    $('ph-close').addEventListener('click', closePanel);

    /* Click ra ngoài → đóng menu mobile (trừ khi đang chạy tour) */
    document.addEventListener('click', e => {
      if (!document.body.classList.contains('mobile-menu-open')) return;
      if (tourActive) return;
      if (e.target.closest('#mobile-more-btn')) return;
      if (e.target.closest('#mobile-panel-btn')) return;
      if (e.target.closest('#top-right')) return;
      if (e.target.closest('#left-bar')) return;
      document.body.classList.remove('mobile-menu-open');
    });

    /* Help: click "?" → start spotlight tour ngay từ bước 1 */
    $('help-btn').addEventListener('click', e => { e.stopPropagation(); startTour(HELP_ITEMS_2D); });
    $('vr-help-btn').addEventListener('click', e => { e.stopPropagation(); startTour(HELP_ITEMS_3D); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && tourActive) endTour();
    });

    /* Tour spotlight: click bất kỳ đâu trên overlay → bước tiếp; nút × → thoát */
    $('tour-overlay').addEventListener('click', e => {
      if (e.target.closest('#tour-skip')) return;
      if (e.target.closest('#tour-tip')) { tourIdx++; showTourStep(); return; }
      tourIdx++; showTourStep();
    });
    $('tour-skip').addEventListener('click', e => { e.stopPropagation(); endTour(); });

    /* Tour: cập nhật vị trí khi resize để spotlight bám đúng nút */
    window.addEventListener('resize', () => { if (tourActive) showTourStep(); });

    /* News panel: open/close + tab switching */
    $('news-btn').addEventListener('click', e => {
      e.stopPropagation();
      newsPanelOpen ? closeNewsPanel() : openNewsPanel();
    });
    $('np-back').addEventListener('click', closeNewsPanel);
    document.querySelectorAll('.np-tab').forEach(t => {
      t.addEventListener('click', () => setNewsTab(t.dataset.tab));
    });

    /* 2D: 3D button – enter VR for first/random place */
    $('three-d-btn').addEventListener('click', () => {
      if (vrMode) return;
      const first = window.APP_DATA.places[0];
      if (first) enterVRMode(first);
    });

    /* 2D: fullscreen */
    $('fs-btn').addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    });

    /* 2D: lang */
    $('lang-btn').addEventListener('click', async () => {
      const next = window.I18n.lang === 'vi' ? 'en' : 'vi';
      await window.I18n.setLang(next);
      $('lang-label').textContent = next.toUpperCase();
    });

    /* 3D: location dropdown */
    $('vr-loc-trigger').addEventListener('click', e => {
      e.stopPropagation();
      const dd = $('vr-loc-dd');
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      // Mobile: bấm lần 1 → nở từ nút tròn ra pill; lần 2 → mở list
      if (isMobile && !dd.classList.contains('expanded')) {
        dd.classList.add('expanded');
      } else {
        dd.classList.toggle('open');
      }
    });
    /* 3D: collapse dropdown trên mobile (× bên phải pill) */
    $('vr-loc-collapse').addEventListener('click', e => {
      e.stopPropagation();
      const dd = $('vr-loc-dd');
      dd.classList.remove('open');
      dd.classList.remove('expanded');
    });

    /* 3D: back to 2D */
    $('vr-back-btn').addEventListener('click', exitVRMode);

    /* 3D: minimap click → exit VR */
    $('minimap').addEventListener('click', exitVRMode);

    /* 3D: info panel toggle (thu gọn / mở rộng) */
    $('vr-info-x').addEventListener('click', e => {
      e.stopPropagation();
      $('vr-info').classList.toggle('collapsed');
    });
    /* Mobile: nút FAB tròn để mở lại panel khi đang collapsed */
    const fab = $('vr-info-fab');
    if (fab) fab.addEventListener('click', e => {
      e.stopPropagation();
      $('vr-info').classList.remove('collapsed');
    });

    /* 3D: language toggle – đồng bộ cả 2D và 3D label */
    $('vr-lang-btn').addEventListener('click', async () => {
      const next = window.I18n.lang === 'vi' ? 'en' : 'vi';
      await window.I18n.setLang(next);
      ['lang-label', 'vr-lang-label'].forEach(id => {
        const el = $(id); if (el) el.textContent = next.toUpperCase();
      });
    });

    /* 3D: share */
    $('vr-share-btn').addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: currentVRPlace?.name || 'VR360 Lâm Đồng', url: location.href });
      } else {
        navigator.clipboard?.writeText(location.href);
      }
    });

    /* 3D: controls */
    $('vr-autorot').addEventListener('click', function () {
      autoRotating = !autoRotating;
      this.classList.toggle('active', autoRotating);
      if (vrViewer) {
        if (autoRotating) vrViewer.startAutoRotate(2);
        else vrViewer.stopAutoRotate();
      }
    });

    $('vr-zin').addEventListener('click', () => {
      if (vrViewer && vrViewer.getHfov) vrViewer.setHfov(Math.max(30, vrViewer.getHfov() - 15));
    });
    $('vr-zout').addEventListener('click', () => {
      if (vrViewer && vrViewer.getHfov) vrViewer.setHfov(Math.min(120, vrViewer.getHfov() + 15));
    });

    $('vr-hideui').addEventListener('click', toggleVRUI);

    /* Click trên vùng VR (không phải UI) khi UI ẩn → hiện lại */
    $('vr-viewer').addEventListener('click', e => {
      if (uiHidden && e.target === $('vr-viewer') || e.target === $('vr-pannellum')) {
        showVRUI();
      }
    });
    $('vr-reveal-btn').addEventListener('click', showVRUI);

    $('vr-fullscr').addEventListener('click', () => {
      if (!document.fullscreenElement) $('vr-viewer').requestFullscreen?.();
      else document.exitFullscreen?.();
    });

    /* 2D: search */
    $('search-input').addEventListener('input', e => renderSearchResults(e.target.value));
    $('search-input').addEventListener('focus', e => { if (e.target.value.trim()) renderSearchResults(e.target.value); });
    $('search-input').addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.target.value = ''; closeSearchResults(); }
    });
    document.addEventListener('click', e => { if (!$('search-wrap').contains(e.target)) closeSearchResults(); });
    $('ph-input').addEventListener('input', e => doSearch(e.target.value));

    /* Category filter */
    document.querySelectorAll('.pcat').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pcat').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCat = btn.dataset.cat;
        renderList();
      });
    });

    initXaDropdown();

    /* Layer popup */
    document.querySelectorAll('.layer-option').forEach(el => {
      el.addEventListener('click', () => { window.MapModule.setLayer(el.dataset.layer); closeLayerPopup(); });
    });
    $('layers-btn').addEventListener('click', e => { e.stopPropagation(); toggleLayerPopup(); });

    /* Sprint 5: invest layer toggle (markers dự án + polygon KCN) */
    const _investBtn = $('invest-layer-btn');
    if (_investBtn) {
      _investBtn.addEventListener('click', async e => {
        e.stopPropagation();
        const visible = await window.MapModule.toggleInvestLayer();
        _investBtn.classList.toggle('active', visible);
      });
    }

    document.addEventListener('click', e => {
      if (!$('layer-popup').contains(e.target) && e.target.id !== 'layers-btn') closeLayerPopup();
      if (!$('vr-loc-dd').contains(e.target)) $('vr-loc-dd').classList.remove('open');
    });

    /* Bottom bar bubble */
    document.querySelectorAll('.bbt').forEach(btn => {
      btn.addEventListener('click', function () {
        if (this.classList.contains('bb-ai')) {
          this.classList.toggle('listening');
          if (window.AiPanel) window.AiPanel.toggle();   // Sprint 5: mở panel FAQ
          return;
        }
        document.querySelectorAll('.bbt').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        moveBubble();
      });
    });
    /* Click ngoài để tắt listening AI */
    document.addEventListener('click', e => {
      const ai = document.getElementById('bb-ai-btn');
      if (ai && ai.classList.contains('listening') && !ai.contains(e.target)) {
        ai.classList.remove('listening');
      }
    });
    requestAnimationFrame(moveBubble);
    window.addEventListener('resize', moveBubble);

    /* Map click – close dropdowns */
    window.MapModule.onMapClick(() => closeLayerPopup());

    /* Language change */
    window.addEventListener('langchange', () => renderList());
  }

  /* ===== XA DROPDOWN (dùng chung cho topbar #xa-dd và panel #ph-xa-dd) ===== */
  let xaSelected = '';
  let xaSearch = '';

  /* Cấu hình từng dropdown — để dễ thêm bản clone mới */
  const XA_DROPDOWNS = [
    { ddId: 'xa-dd',    listId: 'xa-list',    searchId: 'xa-search-input' },
    { ddId: 'ph-xa-dd', listId: 'ph-xa-list', searchId: 'ph-xa-search-input' },
  ];

  function initXaDropdown() {
    renderXaOptions();
    XA_DROPDOWNS.forEach(cfg => bindXaDropdown(cfg));
    document.addEventListener('click', e => {
      XA_DROPDOWNS.forEach(cfg => {
        const dd = $(cfg.ddId);
        if (dd && !dd.contains(e.target)) dd.classList.remove('open');
      });
    });
    window.addEventListener('langchange', () => { renderXaOptions(); updateXaLabel(); });
  }

  function bindXaDropdown(cfg) {
    const dd = $(cfg.ddId);
    const searchInput = $(cfg.searchId);
    if (!dd || !searchInput) return;
    dd.querySelector('.xa-trigger').addEventListener('click', e => {
      e.stopPropagation();
      // Đóng các dropdown khác trước khi mở cái này
      XA_DROPDOWNS.forEach(c => { if (c.ddId !== cfg.ddId) $(c.ddId)?.classList.remove('open'); });
      dd.classList.toggle('open');
      if (dd.classList.contains('open')) setTimeout(() => searchInput.focus(), 50);
    });
    searchInput.addEventListener('input', e => {
      xaSearch = e.target.value.toLowerCase().trim();
      renderXaOptions();
    });
  }

  function renderXaOptions() {
    const areas = window.APP_DATA.areas;
    const t = window.I18n.t;
    const all = { key: '', label: t('filter.area_all') };
    const items = [all, ...Object.entries(areas).map(([key, a]) => ({ key, label: a.label || key }))];
    const filtered = xaSearch ? items.filter(it => it.label.toLowerCase().includes(xaSearch)) : items;

    XA_DROPDOWNS.forEach(cfg => {
      const list = $(cfg.listId);
      if (!list) return;
      if (!filtered.length) { list.innerHTML = '<div class="xa-empty">—</div>'; return; }
      list.innerHTML = filtered.map(it =>
        `<div class="xa-opt ${it.key === xaSelected ? 'selected' : ''}" data-key="${it.key}">${it.label}</div>`
      ).join('');
      list.querySelectorAll('.xa-opt').forEach(el => {
        el.addEventListener('click', () => {
          xaSelected = el.dataset.key;
          applyXa(xaSelected);
          // Đóng & reset search ở MỌI dropdown
          XA_DROPDOWNS.forEach(c => {
            $(c.ddId)?.classList.remove('open');
            const s = $(c.searchId); if (s) s.value = '';
          });
          xaSearch = '';
          renderXaOptions();
          updateXaLabel();
        });
      });
    });
  }

  function updateXaLabel() {
    const areas = window.APP_DATA.areas;
    const t = window.I18n.t;
    const label = xaSelected && areas[xaSelected] ? (areas[xaSelected].label || xaSelected) : t('filter.area_all');
    /* Sync label cho cả 2 trigger */
    ['xa-current', 'ph-xa-current'].forEach(id => {
      const el = $(id); if (el) el.textContent = label;
    });
  }

  function applyXa(key) {
    const areas = window.APP_DATA.areas;
    if (key && areas[key]) {
      window.MapModule.flyToCoords(areas[key].lat, areas[key].lng, areas[key].zoom);
      locFilter = areas[key].label || '';
    } else {
      const p = window.APP_DATA.province;
      window.MapModule.flyToCoords(p.lat, p.lng, p.zoom);
      locFilter = '';
    }
    renderList();
  }

  function moveBubble() {
    const active = document.querySelector('.bbt.active');
    const indicator = document.getElementById('bb-indicator');
    const bar = document.getElementById('bottom-bar');
    if (!active || !indicator || !bar) return;
    const ar = active.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    indicator.style.transform = `translateX(${ar.left - br.left + (ar.width - indicator.offsetWidth) / 2}px)`;
  }

  /* compat stubs */
  function openSheet() {}
  function closeSheet() {}

  return { openPanel, closePanel, renderList, openSheet, closeSheet, initEvents, enterVRMode, exitVRMode, updateBBIndicator: moveBubble };
})();
