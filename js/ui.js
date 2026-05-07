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
    document.body.classList.toggle('vr-ui-hidden', uiHidden);
    $('hide-ui-btn').classList.toggle('active', uiHidden);
  }
  function showVRUI() {
    uiHidden = false;
    $('vr-ui').classList.remove('ui-hidden');
    $('minimap').classList.remove('ui-hidden');
    $('vr-reveal-btn').classList.remove('visible');
    document.body.classList.remove('vr-ui-hidden');
    $('hide-ui-btn').classList.remove('active');
  }

  /* ===== PANEL ===== */
  function openPanel() {
    panelOpen = true;
    $('right-panel').classList.add('open');
    $('right-panel-bg').classList.add('open');
    $('map').classList.add('panel-open');
    $('bottom-bar').classList.add('panel-open');
    document.body.classList.add('panel-open');
    $('panel-toggle').classList.remove('closed');
    const mb = $('mobile-panel-btn'); if (mb) mb.classList.add('active');
  }
  function closePanel() {
    panelOpen = false;
    $('right-panel').classList.remove('open');
    $('right-panel-bg').classList.remove('open');
    $('map').classList.remove('panel-open');
    $('bottom-bar').classList.remove('panel-open');
    document.body.classList.remove('panel-open');
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
    /* Mobile: panel mở full-screen → sau khi chọn 1 place phải tự thu lại
       để user thấy được map / VR. Cover cả portrait (≤768px) và landscape phone. */
    const isMobile = () =>
      window.matchMedia('(max-width: 768px)').matches ||
      window.matchMedia('(max-height: 500px) and (orientation: landscape)').matches;

    document.querySelectorAll('.lcard').forEach(el => {
      el.addEventListener('click', () => {
        const place = window.APP_DATA.places.find(x => x.id === +el.dataset.id);
        if (!place) return;
        if (vrMode) switchVRPlace(place);
        else enterVRMode(place);
        if (isMobile()) closePanel();
      });
    });
    document.querySelectorAll('.btn-go').forEach(el =>
      el.addEventListener('click', e => {
        e.stopPropagation();
        const id = +el.dataset.id;
        const place = window.APP_DATA.places.find(x => x.id === id);
        if (!place) return;
        /* 3D: chuyển cảnh VR ngay; 2D: flyTo bản đồ rồi mở VR */
        if (vrMode) {
          switchVRPlace(place);
        } else {
          window.MapModule.flyTo(id);
          enterVRMode(place);
        }
        if (isMobile()) closePanel();
      })
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
    const _mtLabel = document.querySelector('#three-d-btn .mt-label');
    if (_mtLabel) _mtLabel.textContent = '2D';

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
    const _numLoc = window.I18n && window.I18n.lang === 'en' ? 'en' : 'vi';
    $('vr-meta-rating').textContent = window.I18n.t('vr.ratingFmt', { r: place.r, n: place.rv?.toLocaleString(_numLoc) });
    $('vr-meta-entry').textContent = place.entry || '—';

    // Show info panel
    $('vr-info').classList.remove('hidden');

    // Reset controls state
    autoRotating = false;
    $('autorot-btn').classList.remove('active');
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
    const _mtLabel = document.querySelector('#three-d-btn .mt-label');
    if (_mtLabel) _mtLabel.textContent = '3D';

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
    $('autorot-btn').classList.remove('active');
    $('vr-reveal-btn').classList.remove('visible');
    $('hide-ui-btn').classList.remove('active');
    document.body.classList.remove('vr-ui-hidden');

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
          if (place) {
            /* Đang ở VR → chuyển panorama; chưa ở VR → enter từ map. */
            if (vrMode) switchVRPlace(place);
            else enterVRMode(place);
          }
          $('search-input').value = '';
          closeSearchResults();
        });
      });
    }
    box.classList.add('open');
    /* Đo bottom thực tế của dropdown → set CSS var để #vr-info bám sát.
       rAF đợi 1 tick để clip-path/animation render xong. */
    requestAnimationFrame(() => {
      const r = box.getBoundingClientRect();
      document.documentElement.style.setProperty('--search-dd-bottom', r.bottom + 'px');
    });
  }
  function closeSearchResults() {
    $('search-results').classList.remove('open');
    document.documentElement.style.removeProperty('--search-dd-bottom');
  }

  /* ===== LAYER POPUP ===== */
  function closeLayerPopup() {
    $('layer-popup').classList.remove('open');
    document.body.classList.remove('layers-open');
  }
  function toggleLayerPopup() {
    const popup = $('layer-popup');
    const btn = $('layers-btn');
    /* Neo popup ngay dưới-trái của nút Layers — đúng cho cả desktop + mobile */
    if (btn) {
      const r = btn.getBoundingClientRect();
      const popW = 220;
      const left = Math.max(8, Math.min(window.innerWidth - popW - 8, r.right - popW));
      popup.style.top   = (r.bottom + 6) + 'px';
      popup.style.left  = left + 'px';
      popup.style.right = 'auto';
    }
    const isOpen = popup.classList.toggle('open');
    document.body.classList.toggle('layers-open', isOpen);
  }

  /* ===== HELP TOUR – DANH SÁCH BƯỚC =====
     Trình tự sắp xếp theo cụm UI để tour đi mượt từ trên xuống, trái sang phải:
       1) Topbar (trái → phải): search → xã/phường
       2) Top-right (cụm icon góc phải, theo đúng thứ tự DOM):
          help → lang → fs → zoom in → zoom out → hide UI → layers → 3D
       3) Mẹo double-click toàn màn hình
       4) Mobile-only: mobile-more-btn (3 chấm) → mobile-panel-btn (icon bản đồ)
       5) Right panel toggle / panel đang mở
       6) Bottom bar (trái → phải): VR (kính) → Home → Guide
       7) Nút float bot AI (mép trái) — gộp voice + text
  */
  /* Help items dùng key i18n; label resolve qua I18n.t lúc showTourStep —
     vì vậy đổi ngôn ngữ giữa tour cũng cập nhật được. */
  const HELP_ITEMS_2D = [
    { target: '#search-bar',                 svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', labelKey: 'tour.items2d.search' },
    { target: '#xa-dd',                      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z"/><circle cx="12" cy="9" r="2.5"/></svg>', labelKey: 'tour.items2d.xa' },

    { target: '#help-btn',     round: true,  txt: '?', labelKey: 'tour.items2d.help' },
    { target: '#lang-btn',                   svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>', labelKey: 'tour.items2d.lang' },
    { target: '#fs-btn',       round: true,  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>', labelKey: 'tour.items2d.fs' },
    { target: '#zoom-in-btn',  round: true,  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>', labelKey: 'tour.items2d.zoomIn' },
    { target: '#zoom-out-btn', round: true,  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>', labelKey: 'tour.items2d.zoomOut' },
    { target: '#hide-ui-btn',  round: true,  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>', labelKey: 'tour.items2d.hideUI' },
    { target: '#layers-btn',   round: true,  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>', labelKey: 'tour.items2d.layers' },
    { target: '#three-d-btn',  round: true,  txt: '3D', labelKey: 'tour.items2d.threeD' },

    { target: '#map', labelKey: 'tour.items2d.dblclick' },

    { target: '#mobile-more-btn',  round: true, svg: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>', labelKey: 'tour.items2d.mobMore' },
    { target: '#mobile-panel-btn', round: true, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>', labelKey: 'tour.items2d.mobPanel' },

    {
      target: () => {
        const tg = document.getElementById('panel-toggle');
        const closed = tg && tg.classList.contains('closed');
        return closed ? tg : (document.getElementById('right-panel') || tg);
      },
      labelKey: () => document.getElementById('panel-toggle')?.classList.contains('closed')
        ? 'tour.items2d.panelClosed'
        : 'tour.items2d.panelOpen'
    },

    { target: '#bb-vr-nav', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4.5l-2.5-3h-4l-2.5 3H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="7.5" cy="12" r="1.5"/><circle cx="16.5" cy="12" r="1.5"/></svg>', labelKey: 'tour.items2d.vrNav' },
    { target: '#bottom-bar .bbt[data-view="map"]', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', labelKey: 'tour.items2d.home' },
    { target: '#bottom-bar .bbt[data-view="guide"]', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>', labelKey: 'tour.items2d.guide' },

    { target: '#bb-chat-btn', round: true, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>', labelKey: 'tour.items2d.ai' },
  ];

  /* HELP_ITEMS_3D – tour cho chế độ VR 360°.
     Trình tự:
       1) Khung cảnh VR (panorama) — kéo/chạm xoay + double-click fullscreen
       2) Topbar (vẫn dùng được trong 3D): search → xã/phường
       3) Top-right (cụm icon, đúng thứ tự DOM): help → autorot → lang → fs →
          zoom in → zoom out → hide UI → 2D toggle
       4) Mobile-only: mobile-more-btn → mobile-panel-btn (icon bản đồ)
       5) Bảng thông tin (#vr-info) — vị trí: bottom-left desktop / top-left mobile
       6) Right panel toggle / panel khi đang mở
       7) Minimap (chỉ desktop — mobile ẩn)
       8) Bottom bar (đúng DOM): VR → Home → Guide
       9) Bot AI float (mép trái) — gộp voice + text */
  const HELP_ITEMS_3D = [
    { target: '#vr-pannellum', labelKey: 'tour.items3d.panorama' },
    { target: '#vr-pannellum', labelKey: 'tour.items3d.panoDbl' },

    { target: '#search-bar', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', labelKey: 'tour.items3d.search' },
    { target: '#xa-dd', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z"/><circle cx="12" cy="9" r="2.5"/></svg>', labelKey: 'tour.items3d.xa' },

    { target: '#help-btn',     round: true, txt: '?',  labelKey: 'tour.items3d.help' },
    { target: '#autorot-btn',  round: true, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>', labelKey: 'tour.items3d.autorot' },
    { target: '#lang-btn',                  svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>', labelKey: 'tour.items3d.lang' },
    { target: '#fs-btn',       round: true, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>', labelKey: 'tour.items3d.fs' },
    { target: '#zoom-in-btn',  round: true, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>', labelKey: 'tour.items3d.zoomIn' },
    { target: '#zoom-out-btn', round: true, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>', labelKey: 'tour.items3d.zoomOut' },
    { target: '#hide-ui-btn',  round: true, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>', labelKey: 'tour.items3d.hideUI' },
    { target: '#three-d-btn',  round: true, txt: '2D', labelKey: 'tour.items3d.twoD' },

    { target: '#mobile-more-btn',  round: true, svg: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>', labelKey: 'tour.items3d.mobMore' },
    { target: '#mobile-panel-btn', round: true, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>', labelKey: 'tour.items3d.mobPanel' },

    { target: '#vr-info', labelKey: 'tour.items3d.vrInfo' },

    {
      target: () => {
        const tg = document.getElementById('panel-toggle');
        const closed = tg && tg.classList.contains('closed');
        return closed ? tg : (document.getElementById('right-panel') || tg);
      },
      labelKey: () => document.getElementById('panel-toggle')?.classList.contains('closed')
        ? 'tour.items3d.panelClosed'
        : 'tour.items3d.panelOpen'
    },

    { target: '#minimap', labelKey: 'tour.items3d.minimap' },

    { target: '#bb-vr-nav', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4.5l-2.5-3h-4l-2.5 3H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="7.5" cy="12" r="1.5"/><circle cx="16.5" cy="12" r="1.5"/></svg>', labelKey: 'tour.items3d.vrNav' },
    { target: '#bottom-bar .bbt[data-view="map"]', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', labelKey: 'tour.items3d.home' },
    { target: '#bottom-bar .bbt[data-view="guide"]', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>', labelKey: 'tour.items3d.guide' },

    { target: '#bb-chat-btn', round: true, svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>', labelKey: 'tour.items3d.ai' },
  ];

  /* ===== HELP TOUR (spotlight) ===== */
  let tourIdx = -1;
  let tourActive = false;
  let tourItems = HELP_ITEMS_2D;

  function startTour(items = HELP_ITEMS_2D, fromIndex = 0) {
    tourItems = items;
    tourActive = true;
    tourIdx = fromIndex;
    // Mobile: mở cột nút phải ra để spotlight chỉ đúng vị trí (đợi animation xong).
    // Cả 2D + 3D đều cần vì #top-right dùng chung. Ở 3D, panel + bottom-bar cũng dùng chung.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
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
    /* target: string selector | function returning Element */
    let target = null;
    if (typeof item.target === 'function')      target = item.target();
    else if (typeof item.target === 'string')   target = document.querySelector(item.target);
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

    // Tooltip nội dung — labelKey ưu tiên (i18n), fallback label cũ
    const tip = $('tour-tip');
    tip.querySelector('.tt-step').textContent = window.I18n.t('tour.step', { i: tourIdx + 1, n: tourItems.length });
    let labelText = '';
    if (item.labelKey) {
      const k = (typeof item.labelKey === 'function') ? item.labelKey() : item.labelKey;
      labelText = window.I18n.t(k);
    } else if (item.label) {
      labelText = (typeof item.label === 'function') ? item.label() : item.label;
    }
    tip.querySelector('.tt-label').textContent = labelText;

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
      list.innerHTML = `<div style="text-align:center;color:#999;font-size:12.5px;padding:24px 8px">${window.I18n.t('news.empty')}</div>`;
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
    renderNewsList();
  }
  function closeNewsPanel() {
    newsPanelOpen = false;
    $('news-panel').classList.remove('open');
  }
  function setNewsTab(tab) {
    newsTab = tab;
    document.querySelectorAll('.np-tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === tab));
    $('np-title').textContent = window.I18n.t(tab === 'events' ? 'news.events' : 'news.news');
    renderNewsList();
  }

  /* ===== INIT EVENTS ===== */
  function initEvents() {
    /* 2D panel */
    $('panel-toggle').addEventListener('click', () => panelOpen ? closePanel() : openPanel());

    /* hide-ui-btn: ở 2D toggle focus-mode, ở 3D toggle vr-ui */
    $('hide-ui-btn').addEventListener('click', () => {
      if (vrMode) toggleVRUI();
      else document.body.classList.toggle('focus-mode');
    });

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
      document.body.classList.remove('mobile-menu-open');
    });

    /* Help: click "?" → start spotlight tour theo mode hiện tại */
    $('help-btn').addEventListener('click', e => {
      e.stopPropagation();
      startTour(vrMode ? HELP_ITEMS_3D : HELP_ITEMS_2D);
    });
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

    /* three-d-btn: ở 2D enter VR, ở 3D exit VR */
    $('three-d-btn').addEventListener('click', () => {
      if (vrMode) { exitVRMode(); return; }
      const first = window.APP_DATA.places[0];
      if (first) enterVRMode(first);
    });

    /* fs-btn + double-click: ở 2D fullscreen document, ở 3D fullscreen vr-viewer */
    function toggleFullscreen() {
      const target = vrMode ? $('vr-viewer') : document.documentElement;
      if (!document.fullscreenElement) target.requestFullscreen?.();
      else document.exitFullscreen?.();
    }
    $('fs-btn').addEventListener('click', toggleFullscreen);

    /* Double-click vào nền map (2D) hoặc panorama (3D) cũng toggle fullscreen.
       2D: Leaflet đã tắt doubleClickZoom (xem map.js) nên dblclick vào tile rảnh
           cho ta dùng. Marker/popup/control sẽ stopPropagation tự nhiên hoặc
           không phải target của #map listener.
       3D: Pannellum không có behavior dblclick mặc định. */
    const _mapEl = $('map');
    if (_mapEl) _mapEl.addEventListener('dblclick', e => {
      if (vrMode) return; /* trong 3D, #map ẩn dưới #vr-viewer nên không tới đây */
      /* Bỏ qua dblclick trên marker/popup/control để không vô tình fullscreen */
      if (e.target.closest('.leaflet-marker-icon, .leaflet-popup, .leaflet-control, #hover-card')) return;
      toggleFullscreen();
    });
    const _pano = $('vr-pannellum');
    if (_pano) _pano.addEventListener('dblclick', e => {
      if (!vrMode) return;
      /* Bỏ qua nếu click vào hotspot Pannellum (nếu có sau này) */
      if (e.target.closest('.pnlm-hotspot')) return;
      toggleFullscreen();
    });

    /* zoom: ở 2D zoom Leaflet, ở 3D zoom Pannellum */
    $('zoom-in-btn').addEventListener('click', () => {
      if (vrMode) {
        if (vrViewer && vrViewer.getHfov) vrViewer.setHfov(Math.max(30, vrViewer.getHfov() - 15));
      } else {
        window.MapModule?.zoomIn?.();
      }
    });
    $('zoom-out-btn').addEventListener('click', () => {
      if (vrMode) {
        if (vrViewer && vrViewer.getHfov) vrViewer.setHfov(Math.min(120, vrViewer.getHfov() + 15));
      } else {
        window.MapModule?.zoomOut?.();
      }
    });

    /* autorot-btn: chỉ hoạt động ở 3D */
    $('autorot-btn').addEventListener('click', function () {
      if (!vrMode) return;
      autoRotating = !autoRotating;
      this.classList.toggle('active', autoRotating);
      if (vrViewer) {
        if (autoRotating) vrViewer.startAutoRotate(2);
        else vrViewer.stopAutoRotate();
      }
    });

    /* lang dropdown — toggle popup, chọn ngôn ngữ trong list */
    $('lang-btn').addEventListener('click', e => {
      e.stopPropagation();
      $('lang-dd').classList.toggle('open');
    });
    document.querySelectorAll('.lang-opt').forEach(opt => {
      opt.addEventListener('click', async e => {
        e.stopPropagation();
        const next = opt.dataset.lang;
        if (!next || next === window.I18n.lang) {
          $('lang-dd').classList.remove('open');
          return;
        }
        await window.I18n.setLang(next);
        $('lang-label').textContent = next.toUpperCase();
        document.querySelectorAll('.lang-opt').forEach(o =>
          o.classList.toggle('selected', o.dataset.lang === next));
        $('lang-dd').classList.remove('open');
      });
    });
    /* Đánh dấu lựa chọn hiện tại lúc khởi tạo */
    document.querySelectorAll('.lang-opt').forEach(o =>
      o.classList.toggle('selected', o.dataset.lang === window.I18n.lang));
    /* Click ngoài → đóng */
    document.addEventListener('click', e => {
      if (!$('lang-dd').contains(e.target)) $('lang-dd').classList.remove('open');
    });

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

    /* Click trên vùng VR (không phải UI) khi UI ẩn → hiện lại */
    $('vr-viewer').addEventListener('click', e => {
      if (uiHidden && e.target === $('vr-viewer') || e.target === $('vr-pannellum')) {
        showVRUI();
      }
    });
    $('vr-reveal-btn').addEventListener('click', showVRUI);

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

    document.addEventListener('click', e => {
      if (!$('layer-popup').contains(e.target) && e.target.id !== 'layers-btn') closeLayerPopup();
    });

    /* Bottom bar bubble — bbt: home / VR / guide.
       VR là nút action (không phải view), xử lý riêng để không "active" như tab. */
    document.querySelectorAll('.bbt').forEach(btn => {
      btn.addEventListener('click', function () {
        /* Nút VR (id=bb-vr-nav): enter VR cho place đầu tiên, không đổi active tab */
        if (this.id === 'bb-vr-nav') {
          if (vrMode) return;
          const first = window.APP_DATA.places[0];
          if (first) enterVRMode(first);
          return;
        }
        document.querySelectorAll('.bbt').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        moveBubble();
      });
    });
    /* Nút bot AI float (gộp voice + text) ở mép trái: mở ai-panel */
    const _chatBtn = $('bb-chat-btn');
    if (_chatBtn) _chatBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (window.AiPanel) window.AiPanel.toggle();
    });
    requestAnimationFrame(moveBubble);
    window.addEventListener('resize', moveBubble);

    /* Map click – close dropdowns */
    window.MapModule.onMapClick(() => closeLayerPopup());

    /* Language change — reload data theo lang rồi re-render mọi UI dùng data */
    window.addEventListener('langchange', async () => {
      /* Reload data.{lang}.json để name/desc/hours/entry/loc đổi theo */
      if (typeof window.reloadData === 'function') {
        try { await window.reloadData(); } catch (e) { console.warn('[ui] reloadData failed:', e); }
        /* Sync currentVRPlace sang object mới (giữ id) */
        if (currentVRPlace) {
          const fresh = window.APP_DATA.places.find(x => x.id === currentVRPlace.id);
          if (fresh) currentVRPlace = fresh;
        }
      }
      renderList();
      /* Re-populate VR info (name, desc, hours, entry, rating) khi đang ở VR */
      if (vrMode && currentVRPlace) populateVROverlay(currentVRPlace);
      if (newsPanelOpen) {
        $('np-title').textContent = window.I18n.t(newsTab === 'events' ? 'news.events' : 'news.news');
        renderNewsList();
      }
      /* Tour đang chạy → re-render bước hiện tại để đổi label */
      if (tourActive) showTourStep();
    });
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
    /* Ở 3D: khi user chọn 1 xã/phường, mở luôn right-panel để xem các địa
       điểm thuộc khu vực đó (ở 2D người dùng đã thấy marker trên bản đồ
       nên không cần auto-open). */
    if (vrMode && key && !panelOpen) openPanel();
  }

  function moveBubble() {
    const active = document.querySelector('.bbt.active');
    const indicator = document.getElementById('bb-indicator');
    const bar = document.getElementById('bottom-bar');
    if (!active || !indicator || !bar) return;
    const ar = active.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    indicator.style.transform = `translateX(${ar.left - br.left + (ar.width - indicator.offsetWidth) / 2}px)`;
    /* Vị trí .bb-float: bám sát 2 mép #bottom-bar (cách 12px) */
    const root = document.documentElement;
    const gap = 12;
    const btnSize = 64; /* var(--bb-h) */
    root.style.setProperty('--bb-edge-left',  Math.max(8, br.left - gap - btnSize) + 'px');
    root.style.setProperty('--bb-edge-right', Math.max(8, window.innerWidth - br.right - gap - btnSize) + 'px');
  }

  /* compat stubs */
  function openSheet() {}
  function closeSheet() {}

  return { openPanel, closePanel, renderList, openSheet, closeSheet, initEvents, enterVRMode, exitVRMode, updateBBIndicator: moveBubble };
})();
