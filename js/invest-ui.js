/* =========================================================
   MODULE: INVEST UI – render Đầu tư Lâm Đồng
   - Render sidebar 7 mục (1 "Tất cả" + 6 lĩnh vực) từ
     window.INVEST_DATA.sectors. Click → đổi active state.
   - Nội dung chi tiết (hero/projects/policy…) để Sprint 3.
   ========================================================= */

window.InvestUI = (() => {
  let initialized = false;
  let activeSector = 'all';

  const ICONS = {
    grid:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    leaf:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 4 13c0-7 9-11 16-11 0 9-3 17-9 18z"/><path d="M2 22c4-6 6-10 13-13"/></svg>',
    factory:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 21V10l5 3V10l5 3V10l5 3V6l5-2v17z"/><line x1="6" y1="17" x2="8" y2="17"/><line x1="11" y1="17" x2="13" y2="17"/><line x1="16" y1="17" x2="18" y2="17"/></svg>',
    wind:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/></svg>',
    building:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="10" y1="22" x2="10" y2="18"/><line x1="14" y1="22" x2="14" y2="18"/></svg>',
    truck:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="13" height="11"/><polygon points="14 9 18 9 22 13 22 17 14 17 14 9"/><circle cx="6" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg>'
  };

  function iconHtml(key) { return ICONS[key] || ICONS.grid; }

  function renderSidebar() {
    const list = document.getElementById('iv-side-list');
    if (!list || !window.INVEST_DATA || !window.INVEST_DATA.sectors) return;
    const t = window.I18n ? window.I18n.t.bind(window.I18n) : (k => k);
    list.innerHTML = window.INVEST_DATA.sectors.map(s => `
      <button type="button" class="iv-side-item${s.id === activeSector ? ' active' : ''}" data-sector="${s.id}">
        <span class="iv-side-icon">${iconHtml(s.icon)}</span>
        <span class="iv-side-text">
          <span class="iv-side-name">${t(s.titleKey)}</span>
          <span class="iv-side-sub">${t(s.subKey)}</span>
        </span>
      </button>
    `).join('');
  }

  function bindEvents() {
    const list = document.getElementById('iv-side-list');
    if (!list) return;
    list.addEventListener('click', e => {
      const btn = e.target.closest('.iv-side-item');
      if (!btn) return;
      activeSector = btn.dataset.sector;
      list.querySelectorAll('.iv-side-item').forEach(b =>
        b.classList.toggle('active', b.dataset.sector === activeSector)
      );
      // Sprint 3: filter danh sách dự án trong #iv-content theo activeSector
    });

    const pdfBtn = document.getElementById('iv-pdf-btn');
    if (pdfBtn) pdfBtn.addEventListener('click', () => {
      console.log('[invest-ui] Tải Cẩm nang Đầu tư – Sprint 3');
    });
    const contactBtn = document.getElementById('iv-contact-btn');
    if (contactBtn) contactBtn.addEventListener('click', () => {
      console.log('[invest-ui] Liên hệ Trung tâm XTĐT – Sprint 3');
    });

    window.addEventListener('langchange', () => {
      if (document.body.classList.contains('view-invest')) renderSidebar();
    });
  }

  async function init() {
    if (initialized) return;
    await loadInvestData();
    renderSidebar();
    bindEvents();
    if (window.I18n) window.I18n.apply(document.getElementById('invest-mount'));
    initialized = true;
  }

  return { init };
})();
