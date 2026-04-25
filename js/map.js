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

  function initMap() {
    // Khởi động ở góc nhìn tỉnh Lâm Đồng (data.json > province)
    const p = window.APP_DATA.province;
    map = L.map('map', { center: [p.lat, p.lng], zoom: p.zoom, zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    setLayer('satellite');
    window.APP_DATA.places.forEach(addMarker);
    // expose biến `map` global để các button onclick="map.zoomIn()" trong HTML hoạt động
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
      window.UI.openSheet(place.id);
    });
    markers[place.id] = { marker: m, el };
  }

  function flyTo(id) {
    const a = window.APP_DATA.places.find(x => x.id === id);
    if (a) map.flyTo([a.lat, a.lng], 13, { duration: 1.1 });
  }

  function flyToCoords(lat, lng, zoom) {
    map.flyTo([lat, lng], zoom, { duration: 1.2 });
  }

  function onMapClick(handler) {
    map.on('click', handler);
  }

  return { initMap, setLayer, addMarker, flyTo, flyToCoords, onMapClick, markers };
})();
