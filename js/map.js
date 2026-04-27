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
    map = L.map('map', { center: [p.lat, p.lng], zoom: p.zoom, zoomControl: false });
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

  return { initMap, setLayer, addMarker, flyTo, flyToCoords, onMapClick, markers };
})();
