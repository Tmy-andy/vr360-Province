/* =========================================================
   MODULE: UI – Panel danh sách, bottom sheet, VR, topbar, search, filter
   Bao gồm các SECTION nhỏ:
     A. STATE          – trạng thái UI (active id, filter, search)
     B. PANEL          – mở/đóng panel phải
     C. LIST RENDER    – render danh sách thẻ địa điểm
     D. SHEET          – mở/đóng bottom sheet chi tiết
     E. VR             – mở/đóng VR fullscreen
     F. SEARCH         – ô tìm kiếm topbar + panel
     G. CATEGORY       – filter danh mục
     H. AREA SELECT    – select Xã/Phường (bay tới)
     I. LAYER POPUP    – popup chọn lớp bản đồ
     J. BOTTOM BAR     – thanh nav dưới
     K. FULLSCREEN     – nút full màn hình trình duyệt
     L. INIT EVENTS    – đăng ký toàn bộ event sau khi DOM/data sẵn sàng
   ========================================================= */

window.UI = (() => {
  /* ===== A. STATE ===== */
  let activeId = null;
  let activeCat = 'all';
  let searchQ = '';
  let locFilter = '';
  let panelOpen = true;

  const $ = id => document.getElementById(id);

  /* ===== B. PANEL ===== */
  function openPanel() {
    panelOpen = true;
    $('right-panel').classList.add('open');
    $('map').classList.add('panel-open');
    $('bottom-bar').classList.add('panel-open');
    $('panel-toggle').classList.remove('closed');
  }
  function closePanel() {
    panelOpen = false;
    $('right-panel').classList.remove('open');
    $('map').classList.remove('panel-open');
    $('bottom-bar').classList.remove('panel-open');
    $('panel-toggle').classList.add('closed');
  }

  /* ===== C. LIST RENDER ===== */
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
      <div class="lcard ${activeId === a.id ? 'active' : ''}" data-id="${a.id}">
        <div class="lthumb"><img src="${a.img}" alt="${a.name}" loading="lazy" onerror="this.style.opacity=0" /></div>
        <div class="lbody">
          <div class="lname">${a.name}</div>
          <div class="ltype">${t('cat_long.' + a.cat)}</div>
          <div class="lrating">${a.r} <span class="lstar">★</span><span class="sep">|</span>${a.rv.toLocaleString(numLocale)} ${t('card.reviews')}</div>
          <div class="lactions">
            <button class="btn-go" data-id="${a.id}">
              ${t('buttons.go')}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z"/><circle cx="12" cy="9" r="2"/></svg>
            </button>
            <button class="btn-share" title="${t('buttons.share')}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
    document.querySelectorAll('.lcard').forEach(el =>
      el.addEventListener('click', () => openSheet(+el.dataset.id))
    );
    document.querySelectorAll('.btn-go').forEach(el =>
      el.addEventListener('click', e => { e.stopPropagation(); window.MapModule.flyTo(+el.dataset.id); })
    );
  }

  /* ===== D. SHEET ===== */
  // URL VR Pannellum dùng chung cho preview (iframe trong sheet) và fullscreen
  function vrUrl(a) {
    return `https://pannellum.org/api/?panorama=${encodeURIComponent(a.img)}&autoLoad=true&title=${encodeURIComponent(a.name)}`;
  }

  function openSheet(id) {
    const a = window.APP_DATA.places.find(x => x.id === id);
    if (!a) return;
    activeId = id;
    window.MapModule.flyTo(id);
    $('s-img').src = vrUrl(a);
    $('s-name').textContent = a.name;
    $('s-loc-txt').textContent = a.loc;
    $('s-desc').textContent = a.desc || '';
    $('s-hours').textContent = a.hours;
    $('s-entry').textContent = a.entry;
    $('s-rating').textContent = `★ ${a.r}`;
    $('s-vr').onclick = () => openVR(a);
    $('sheet').classList.add('open');
    Object.values(window.MapModule.markers).forEach(({ el }) => el.classList.remove('active'));
    if (window.MapModule.markers[id]) window.MapModule.markers[id].el.classList.add('active');
    renderList();
  }
  function closeSheet() {
    activeId = null;
    $('sheet').classList.remove('open');
    $('s-img').src = '';   // dừng iframe VR thu nhỏ để khỏi chạy nền
    Object.values(window.MapModule.markers).forEach(({ el }) => el.classList.remove('active'));
    renderList();
  }

  /* ===== E. VR ===== */
  function openVR(a) {
    $('vr-title').textContent = window.I18n.t('vr.title_with', { name: a.name });
    $('vr-frame').src = vrUrl(a);
    $('vr-full').classList.add('open');
  }
  function closeVR() {
    $('vr-full').classList.remove('open');
    $('vr-frame').src = '';
  }

  /* ===== F. SEARCH ===== */
  // Dùng cho ô tìm trong PANEL (#ph-input): lọc danh sách inline, mở panel.
  function doSearch(q) {
    searchQ = q.toLowerCase().trim();
    if (!panelOpen) openPanel();
    renderList();
  }

  // Dùng cho ô tìm TOP BAR (#search-input): hiện dropdown gợi ý dưới ô.
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
          const id = +el.dataset.id;
          openSheet(id);
          $('search-input').value = '';
          closeSearchResults();
        });
      });
    }
    box.classList.add('open');
  }
  function closeSearchResults() { $('search-results').classList.remove('open'); }

  /* ===== I. LAYER POPUP =====
     Khi popup mở: thêm class body.layers-open để CSS tạm ẩn panel + sheet
     (giữ nguyên state nội bộ, chỉ ẩn thị giác). Đóng popup → khôi phục. */
  function closeLayerPopup() {
    $('layer-popup').classList.remove('open');
    document.body.classList.remove('layers-open');
  }
  function toggleLayerPopup() {
    const isOpen = $('layer-popup').classList.toggle('open');
    document.body.classList.toggle('layers-open', isOpen);
  }

  /* ===== L. INIT EVENTS ===== */
  function initEvents() {
    /* B – panel toggle */
    $('panel-toggle').addEventListener('click', () => panelOpen ? closePanel() : openPanel());

    /* B+ – nút menu: bật/tắt focus mode (ẩn toàn bộ UI để xem map/VR) */
    $('menu-btn').addEventListener('click', () => {
      document.body.classList.toggle('focus-mode');
    });

    /* D – sheet close */
    $('s-close').addEventListener('click', closeSheet);

    /* D+ – dblclick vào VR preview để mở fullscreen */
    $('s-img-overlay').addEventListener('dblclick', () => {
      if (!activeId) return;
      const a = window.APP_DATA.places.find(x => x.id === activeId);
      if (a) openVR(a);
    });

    /* E – VR close */
    $('vr-x').addEventListener('click', closeVR);

    /* F – search */
    // Topbar: hiện dropdown gợi ý (KHÔNG mở panel)
    $('search-input').addEventListener('input', e => renderSearchResults(e.target.value));
    $('search-input').addEventListener('focus', e => {
      if (e.target.value.trim()) renderSearchResults(e.target.value);
    });
    $('search-input').addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.target.value = ''; closeSearchResults(); }
    });
    // Click ngoài để đóng dropdown
    document.addEventListener('click', e => {
      if (!$('search-wrap').contains(e.target)) closeSearchResults();
    });
    // Panel: lọc danh sách inline
    $('ph-input').addEventListener('input', e => doSearch(e.target.value));

    /* G – category */
    document.querySelectorAll('.pcat').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pcat').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCat = btn.dataset.cat;
        renderList();
      });
    });

    /* H – Custom dropdown Xã/Phường (có search) */
    initXaDropdown();

    /* I – layer popup */
    document.querySelectorAll('.layer-option').forEach(el => {
      el.addEventListener('click', () => {
        window.MapModule.setLayer(el.dataset.layer);
        closeLayerPopup();
      });
    });
    $('layers-btn').addEventListener('click', e => {
      e.stopPropagation();
      toggleLayerPopup();
    });
    document.addEventListener('click', e => {
      if (!$('layer-popup').contains(e.target) && e.target.id !== 'layers-btn') closeLayerPopup();
    });

    /* J – bottom bar active state + di chuyển bubble indicator */
    document.querySelectorAll('.bbt').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.bbt').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        moveBubble();
      });
    });
    // Đặt vị trí bubble lần đầu + cập nhật khi resize
    requestAnimationFrame(moveBubble);
    window.addEventListener('resize', moveBubble);

    /* K – fullscreen */
    $('fs-btn').addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    });

    /* M – đổi ngôn ngữ: tải dict mới, áp dụng cho HTML tĩnh, re-render list. */
    $('lang-btn').addEventListener('click', async () => {
      const next = window.I18n.lang === 'vi' ? 'en' : 'vi';
      await window.I18n.setLang(next);
      $('lang-label').textContent = next.toUpperCase();
    });

    // Khi ngôn ngữ thay đổi: render lại danh sách + cập nhật label động
    window.addEventListener('langchange', () => {
      renderList();
      // Nếu sheet đang mở, cập nhật VR title (nếu user đã bấm VR thì iframe đã có title riêng)
      if (activeId) {
        const a = window.APP_DATA.places.find(x => x.id === activeId);
        if (a) $('vr-title').textContent = window.I18n.t('vr.title_with', { name: a.name });
      }
    });

    /* Map click – đóng sheet & layer popup */
    window.MapModule.onMapClick(() => { closeSheet(); closeLayerPopup(); });
  }

  /* ===== H. CUSTOM DROPDOWN: Xã/Phường ===== */
  // State riêng của dropdown này: key đang chọn ('' = Tất cả) và filter search.
  let xaSelected = '';
  let xaSearch = '';

  function initXaDropdown() {
    renderXaOptions();
    const dd = $('xa-dd');
    const trigger = dd.querySelector('.xa-trigger');
    const searchInput = $('xa-search-input');

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      dd.classList.toggle('open');
      if (dd.classList.contains('open')) {
        searchInput.focus();
      }
    });
    searchInput.addEventListener('input', e => {
      xaSearch = e.target.value.toLowerCase().trim();
      renderXaOptions();
    });
    document.addEventListener('click', e => {
      if (!dd.contains(e.target)) dd.classList.remove('open');
    });
    // Re-render label khi đổi ngôn ngữ
    window.addEventListener('langchange', () => {
      renderXaOptions();
      updateXaLabel();
    });
  }

  function renderXaOptions() {
    const areas = window.APP_DATA.areas;
    const t = window.I18n.t;
    // Item "Tất cả" luôn đứng đầu
    const all = { key: '', label: t('filter.area_all') };
    const items = [all, ...Object.entries(areas).map(([key, a]) => ({
      key, label: a.label || key,
    }))];
    const filtered = xaSearch
      ? items.filter(it => it.label.toLowerCase().includes(xaSearch))
      : items;
    const list = $('xa-list');
    if (!filtered.length) {
      list.innerHTML = `<div class="xa-empty">—</div>`;
      return;
    }
    list.innerHTML = filtered.map(it => `
      <div class="xa-opt ${it.key === xaSelected ? 'selected' : ''}" data-key="${it.key}">${it.label}</div>
    `).join('');
    list.querySelectorAll('.xa-opt').forEach(el => {
      el.addEventListener('click', () => {
        xaSelected = el.dataset.key;
        applyXa(xaSelected);
        $('xa-dd').classList.remove('open');
        $('xa-search-input').value = '';
        xaSearch = '';
        renderXaOptions();
        updateXaLabel();
      });
    });
  }

  function updateXaLabel() {
    const areas = window.APP_DATA.areas;
    const t = window.I18n.t;
    const label = xaSelected && areas[xaSelected]
      ? (areas[xaSelected].label || xaSelected)
      : t('filter.area_all');
    $('xa-current').textContent = label;
  }

  // Áp filter Xã/Phường: bay tới tọa độ tương ứng + cập nhật locFilter cho list
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

  /* Tính & set transform cho #bb-indicator để khớp với nút .bbt.active */
  function moveBubble() {
    const active = document.querySelector('.bbt.active');
    const indicator = document.getElementById('bb-indicator');
    const bar = document.getElementById('bottom-bar');
    if (!active || !indicator || !bar) return;
    const ar = active.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    const x = ar.left - br.left + (ar.width - indicator.offsetWidth) / 2;
    indicator.style.transform = `translateX(${x}px)`;
  }

  return { openPanel, closePanel, renderList, openSheet, closeSheet, initEvents };
})();
