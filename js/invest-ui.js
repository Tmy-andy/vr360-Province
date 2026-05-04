/* =========================================================
   MODULE: INVEST UI – Đầu tư Lâm Đồng
   - 2 mode render trong #iv-content:
       * landing : hero (3 stats overlay) + reasons sidecard +
                   projects grid (filter sector) + policy 3-col +
                   process 5-step + resources + CTA banner
       * project : breadcrumb + tag + title + meta + ảnh hero +
                   bảng thông tin + ưu đãi + đầu mối + 3 CTA
   - Sidebar 7 mục (1 "Tất cả" + 6 lĩnh vực): click → filter projects.
   - Search topbar: lọc projects theo tên / địa điểm.
   - Pattern bám đúng GuideUI để dễ maintain.
   ========================================================= */

window.InvestUI = (() => {
  let initialized = false;
  let activeSector = 'all';   // 'all' = không filter
  let activeStatus = 'all';   // 'all' | 'ready' | 'planned' | 'calling'
  let currentProject = null;
  let currentMode = 'landing';

  /* ----- Icon library (Lucide-like, stroke 2) ----- */
  const ICONS = {
    grid:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    leaf:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 4 13c0-7 9-11 16-11 0 9-3 17-9 18z"/><path d="M2 22c4-6 6-10 13-13"/></svg>',
    factory:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 21V10l5 3V10l5 3V10l5 3V6l5-2v17z"/><line x1="6" y1="17" x2="8" y2="17"/><line x1="11" y1="17" x2="13" y2="17"/><line x1="16" y1="17" x2="18" y2="17"/></svg>',
    wind:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/></svg>',
    building:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="10" y1="22" x2="10" y2="18"/><line x1="14" y1="22" x2="14" y2="18"/></svg>',
    truck:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="13" height="11"/><polygon points="14 9 18 9 22 13 22 17 14 17 14 9"/><circle cx="6" cy="19" r="2"/><circle cx="17" cy="19" r="2"/></svg>',

    pin:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    gift:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
    shield:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',

    wallet:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V7H4a2 2 0 0 1 0-4h12v4"/><path d="M2 5v15a2 2 0 0 0 2 2h16v-5"/><path d="M22 12v6h-6a3 3 0 0 1 0-6z"/></svg>',
    list:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    target:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',

    tax:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
    land:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22 12 2l10 20H2z"/><path d="M2 22h20"/></svg>',
    support:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',

    pdf:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    download:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    chevron:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    home:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    bookmark:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    check:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    map:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
    phone:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
  };
  const ic = key => ICONS[key] || '';

  function t(key) { return window.I18n ? window.I18n.t(key) : key; }
  function fmtMoney(billions) {
    if (!billions && billions !== 0) return '';
    const n = Number(billions).toLocaleString('vi-VN');
    return n + ' tỷ đồng';
  }
  function fmtArea(p) {
    if (p.area_ha) return p.area_ha + ' ha';
    if (p.capacity_mw) return p.capacity_mw + ' MW';
    return '—';
  }
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function statusBadge(status) {
    const map = {
      ready:   { cls: 'iv-badge-ready',   label: 'Sẵn sàng mặt bằng' },
      planned: { cls: 'iv-badge-planned', label: 'Đã có quy hoạch 1/500' },
      calling: { cls: 'iv-badge-calling', label: 'Đang kêu gọi' }
    };
    const s = map[status] || { cls: 'iv-badge-calling', label: status };
    return `<span class="iv-badge ${s.cls}">${s.label}</span>`;
  }
  function findProject(slug) {
    return window.INVEST_DATA.projects.find(p => p.slug === slug);
  }
  function ensureContent() {
    let c = document.getElementById('iv-content');
    if (c) return c;
    const main = document.getElementById('iv-main');
    if (!main) return null;
    c = document.createElement('div');
    c.id = 'iv-content';
    main.appendChild(c);
    return c;
  }

  /* =========================================================
     SIDEBAR
     ========================================================= */
  function renderSidebar() {
    const list = document.getElementById('iv-side-list');
    if (!list || !window.INVEST_DATA) return;
    list.innerHTML = window.INVEST_DATA.sectors.map(s => `
      <button type="button" class="iv-side-item${s.id === activeSector ? ' active' : ''}" data-sector="${s.id}">
        <span class="iv-side-icon">${ic(s.icon)}</span>
        <span class="iv-side-text">
          <span class="iv-side-name">${t(s.titleKey)}</span>
          <span class="iv-side-sub">${t(s.subKey)}</span>
        </span>
      </button>
    `).join('');
  }

  /* =========================================================
     LANDING
     ========================================================= */
  function filteredProjects(filterText) {
    const data = window.INVEST_DATA;
    let list = data.projects.slice();
    if (activeSector && activeSector !== 'all') list = list.filter(p => p.sector === activeSector);
    if (filterText) {
      const q = filterText.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  function renderLanding(filterText) {
    const data = window.INVEST_DATA;
    const c = ensureContent();
    if (!c) return;

    /* Hero with 3 stats overlay + reasons sidecard */
    const heroHtml = `
      <section class="iv-hero">
        <div class="iv-hero-img" style="background-image:url('${data.hero.image}')">
          <div class="iv-hero-overlay">
            <div class="iv-hero-stats">
              ${data.hero.stats.map(s => `
                <div class="iv-hero-stat">
                  <span class="iv-hero-stat-icon">${ic(s.icon)}</span>
                  <div>
                    <div class="iv-hero-stat-label">${escapeHtml(s.label)}</div>
                    <div class="iv-hero-stat-value">${escapeHtml(s.value)}</div>
                    <div class="iv-hero-stat-unit">${escapeHtml(s.unit)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="iv-source">${escapeHtml(data.hero.source)}</div>
      </section>
    `;

    /* Reasons – right sidecard */
    const reasonsHtml = `
      <aside class="iv-reasons">
        <h3 class="iv-reasons-title">${escapeHtml(data.reasonsTitle)}</h3>
        <ul class="iv-reasons-list">
          ${data.reasons.map((r, i) => `
            <li class="iv-reason iv-reason-c${i % 5}">
              <span class="iv-reason-icon">${ic(r.icon)}</span>
              <div>
                <div class="iv-reason-name">${escapeHtml(r.title)}</div>
                <div class="iv-reason-desc">${escapeHtml(r.desc)}</div>
              </div>
            </li>
          `).join('')}
        </ul>
      </aside>
    `;

    /* Projects grid */
    const list = filteredProjects(filterText);
    const sectorMap = Object.fromEntries(data.sectors.map(s => [s.id, t(s.titleKey)]));
    const projectsHtml = `
      <section class="iv-projects" id="iv-projects-section">
        <div class="iv-section-head">
          <h3 class="view-section-title">DỰ ÁN KÊU GỌI ĐẦU TƯ TIÊU BIỂU</h3>
          <a class="iv-link" href="#invest/projects">Xem tất cả dự án ${ic('chevron')}</a>
        </div>
        ${list.length === 0
          ? `<div class="iv-empty">Không có dự án phù hợp với bộ lọc.</div>`
          : `<div class="iv-projects-grid">
              ${list.slice(0, 5).map(p => `
                <article class="iv-pcard" data-slug="${p.slug}">
                  <a class="iv-pcard-img" href="#invest/project/${p.slug}" style="background-image:url('${p.image}')">
                    <span class="iv-pcard-tag">${escapeHtml(sectorMap[p.sector] || p.sector)}</span>
                    <button class="iv-pcard-bookmark" type="button" aria-label="Lưu" onclick="event.preventDefault();event.stopPropagation();">${ic('bookmark')}</button>
                  </a>
                  <div class="iv-pcard-body">
                    <a class="iv-pcard-title" href="#invest/project/${p.slug}">${escapeHtml(p.name)}</a>
                    <div class="iv-pcard-loc">${ic('pin')}<span>${escapeHtml(p.district)}</span></div>
                    <div class="iv-pcard-meta">
                      <div><span class="iv-pcard-k">Quy mô:</span> <b>${escapeHtml(fmtArea(p))}</b></div>
                      <div><span class="iv-pcard-k">Tổng vốn:</span> <b>${escapeHtml(fmtMoney(p.capital_billion_vnd))}</b></div>
                    </div>
                    ${statusBadge(p.status)}
                  </div>
                </article>
              `).join('')}
            </div>`
        }
      </section>
    `;

    /* Policy 3 columns */
    const policyHtml = `
      <section class="iv-policy">
        <h3 class="view-section-title">${escapeHtml(data.policyTitle)}</h3>
        <div class="iv-policy-grid">
          ${data.policy.map(col => `
            <div class="iv-policy-col">
              <div class="iv-policy-icon">${ic(col.icon)}</div>
              <div class="iv-policy-name">${escapeHtml(col.title)}</div>
              <ul class="iv-policy-items">
                ${col.items.map(item => `
                  <li>${ic('check')}<span>${escapeHtml(item)}</span></li>
                `).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </section>
    `;

    /* Process 5 steps */
    const processHtml = `
      <section class="iv-process">
        <h3 class="view-section-title">${escapeHtml(data.processTitle)}</h3>
        <div class="iv-process-steps">
          ${data.process.map((s, i) => `
            <div class="iv-step">
              <div class="iv-step-num">${s.step}</div>
              <div class="iv-step-name">${escapeHtml(s.title)}</div>
              <div class="iv-step-sub">${escapeHtml(s.sub)}</div>
              <div class="iv-step-dur">${escapeHtml(s.duration)}</div>
              ${i < data.process.length - 1 ? '<div class="iv-step-line"></div>' : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;

    /* Resources */
    const resourcesHtml = `
      <section class="iv-resources">
        <h3 class="view-section-title">${escapeHtml(data.resourcesTitle)}</h3>
        <div class="iv-resources-grid">
          ${data.resources.map(r => `
            <a class="iv-res" href="${r.url}" target="_blank">
              <span class="iv-res-icon">${ic(r.icon)}</span>
              <div class="iv-res-text">
                <div class="iv-res-title">${escapeHtml(r.title)}</div>
                <div class="iv-res-size">${escapeHtml(r.size)}</div>
              </div>
              <span class="iv-res-dl">${ic('download')}</span>
            </a>
          `).join('')}
        </div>
      </section>
    `;

    /* CTA banner + dashboard link */
    const ctaHtml = `
      <section class="iv-cta-banner">
        <div class="iv-cta-icon">${ic('briefcase')}</div>
        <div class="iv-cta-text">
          <div class="iv-cta-title">${escapeHtml(data.ctaBanner.title)}</div>
          <div class="iv-cta-sub">${escapeHtml(data.ctaBanner.sub)}</div>
        </div>
        <div class="iv-cta-actions">
          <a class="iv-cta-btn iv-cta-btn-ghost" href="#invest/dashboard">
            ${ic('target')}<span>Dashboard số liệu</span>
          </a>
          <a class="iv-cta-btn" href="${data.ctaBanner.ctaHref}">
            <span>${escapeHtml(data.ctaBanner.cta)}</span>
            ${ic('chevron')}
          </a>
        </div>
      </section>
    `;

    c.innerHTML = `
      <header class="iv-page-header">
        <h1>
          <span>${escapeHtml(data.hero.title.split(' Lâm Đồng')[0] || data.hero.title)}</span>
          <span class="hl">Lâm Đồng</span>
        </h1>
        <p class="iv-sub">${escapeHtml(data.hero.sub)}</p>
      </header>
      <div class="iv-hero-row">
        ${heroHtml}
        ${reasonsHtml}
      </div>
      ${projectsHtml}
      ${policyHtml}
      ${processHtml}
      ${resourcesHtml}
      ${ctaHtml}
    `;
    c.classList.remove('mode-project');
    c.classList.add('mode-landing');
    currentMode = 'landing';
    document.getElementById('iv-main').scrollTop = 0;
  }

  /* =========================================================
     PROJECT DETAIL
     ========================================================= */
  function renderProject(slug) {
    const p = findProject(slug);
    const c = ensureContent();
    if (!c) return;
    if (!p) {
      c.innerHTML = `<div class="iv-empty">Dự án không tồn tại.</div>`;
      return;
    }
    currentProject = p;
    const sectorName = (window.INVEST_DATA.sectors.find(s => s.id === p.sector) || {});
    const sectorLabel = sectorName.titleKey ? t(sectorName.titleKey) : p.sector;

    c.innerHTML = `
      <nav class="iv-breadcrumb">
        <a href="#map" class="iv-bc-home">${ic('home')}</a>
        <span class="iv-bc-sep">${ic('chevron')}</span>
        <a href="#invest">Đầu tư</a>
        <span class="iv-bc-sep">${ic('chevron')}</span>
        <a href="#invest" class="iv-bc-cat">${escapeHtml(sectorLabel)}</a>
        <span class="iv-bc-sep">${ic('chevron')}</span>
        <span class="iv-bc-current">${escapeHtml(p.name)}</span>
      </nav>

      <figure class="iv-proj-hero" style="background-image:url('${p.image}')">
        <span class="iv-proj-tag">${escapeHtml(sectorLabel)}</span>
      </figure>

      <div class="iv-proj-head">
        <h1 class="iv-proj-title">${escapeHtml(p.name)}</h1>
        ${statusBadge(p.status)}
      </div>

      <div class="iv-proj-grid">
        <div class="iv-proj-body">
          <h3 class="view-section-title">THÔNG TIN DỰ ÁN</h3>
          <table class="iv-info">
            <tbody>
              <tr><th>Vị trí</th><td>${escapeHtml(p.district)}</td></tr>
              <tr><th>Quy mô</th><td>${escapeHtml(fmtArea(p))}</td></tr>
              <tr><th>Tổng vốn</th><td><b>${escapeHtml(fmtMoney(p.capital_billion_vnd))}</b></td></tr>
              <tr><th>Lĩnh vực</th><td>${escapeHtml(sectorLabel)}</td></tr>
              <tr><th>Trạng thái</th><td>${statusBadge(p.status)}</td></tr>
            </tbody>
          </table>

          <h3 class="view-section-title">MÔ TẢ</h3>
          <p class="iv-proj-p">${escapeHtml(p.description)}</p>

          <h3 class="view-section-title">ƯU ĐÃI ÁP DỤNG</h3>
          <ul class="iv-proj-incentives">
            ${(p.incentives || []).map(i => `<li>${ic('check')}<span>${escapeHtml(i)}</span></li>`).join('')}
          </ul>
        </div>

        <aside class="iv-proj-side">
          <div class="iv-proj-contact">
            <div class="iv-proj-contact-title">ĐẦU MỐI LIÊN HỆ</div>
            <div class="iv-proj-contact-row"><b>${escapeHtml(p.contact?.person || '—')}</b></div>
            <div class="iv-proj-contact-row">${ic('phone')}<a href="tel:${escapeHtml(p.contact?.phone || '')}">${escapeHtml(p.contact?.phone || '')}</a></div>
            <div class="iv-proj-contact-row">${ic('briefcase')}<a href="mailto:${escapeHtml(p.contact?.email || '')}">${escapeHtml(p.contact?.email || '')}</a></div>
          </div>
          <div class="iv-proj-actions">
            <button class="iv-proj-btn primary" type="button">${ic('briefcase')}<span>Đăng ký quan tâm</span></button>
            <button class="iv-proj-btn" type="button">${ic('download')}<span>Tải hồ sơ PDF</span></button>
            <a class="iv-proj-btn" href="#map/project/${p.slug}">${ic('map')}<span>Xem trên bản đồ</span></a>
          </div>
        </aside>
      </div>
    `;
    c.classList.remove('mode-landing');
    c.classList.add('mode-project');
    currentMode = 'project';
    document.getElementById('iv-main').scrollTop = 0;
  }

  /* =========================================================
     PROJECTS LIST PAGE  (#invest/projects)
     ========================================================= */
  function renderProjectsList(filterText) {
    const data = window.INVEST_DATA;
    const c = ensureContent();
    if (!c) return;
    const sectorMap = Object.fromEntries(data.sectors.map(s => [s.id, t(s.titleKey)]));

    let list = data.projects.slice();
    if (activeSector !== 'all')  list = list.filter(p => p.sector === activeSector);
    if (activeStatus !== 'all')  list = list.filter(p => p.status === activeStatus);
    if (filterText) {
      const q = filterText.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }

    const sectorChips = ['all'].concat(data.sectors.filter(s => s.id !== 'all').map(s => s.id))
      .map(id => {
        const label = id === 'all' ? 'Tất cả' : sectorMap[id];
        return `<button type="button" class="iv-chip${id === activeSector ? ' active' : ''}" data-chip-sector="${id}">${escapeHtml(label)}</button>`;
      }).join('');
    const statusChips = [
      ['all', 'Tất cả trạng thái'],
      ['ready', 'Sẵn sàng mặt bằng'],
      ['planned', 'Đã có quy hoạch 1/500'],
      ['calling', 'Đang kêu gọi']
    ].map(([id, label]) => `<button type="button" class="iv-chip${id === activeStatus ? ' active' : ''}" data-chip-status="${id}">${escapeHtml(label)}</button>`).join('');

    c.innerHTML = `
      <nav class="iv-breadcrumb">
        <a href="#map" class="iv-bc-home">${ic('home')}</a>
        <span class="iv-bc-sep">${ic('chevron')}</span>
        <a href="#invest">Đầu tư</a>
        <span class="iv-bc-sep">${ic('chevron')}</span>
        <span class="iv-bc-current">Tất cả dự án</span>
      </nav>

      <header class="iv-page-header">
        <h1>
          <span>Tất cả</span>
          <span class="hl">dự án kêu gọi đầu tư</span>
        </h1>
        <p class="iv-sub">${list.length} dự án — lọc theo lĩnh vực, trạng thái hoặc tìm kiếm theo tên / địa điểm.</p>
      </header>

      <div class="iv-filterbar">
        <div class="iv-chip-row" data-chip-group="sector">${sectorChips}</div>
        <div class="iv-chip-row" data-chip-group="status">${statusChips}</div>
      </div>

      ${list.length === 0
        ? `<div class="iv-empty">Không có dự án phù hợp với bộ lọc.</div>`
        : `<div class="iv-projects-grid iv-projects-grid-full">
            ${list.map(p => `
              <article class="iv-pcard" data-slug="${p.slug}">
                <a class="iv-pcard-img" href="#invest/project/${p.slug}" style="background-image:url('${p.image}')">
                  <span class="iv-pcard-tag">${escapeHtml(sectorMap[p.sector] || p.sector)}</span>
                  <button class="iv-pcard-bookmark" type="button" aria-label="Lưu" onclick="event.preventDefault();event.stopPropagation();">${ic('bookmark')}</button>
                </a>
                <div class="iv-pcard-body">
                  <a class="iv-pcard-title" href="#invest/project/${p.slug}">${escapeHtml(p.name)}</a>
                  <div class="iv-pcard-loc">${ic('pin')}<span>${escapeHtml(p.district)}</span></div>
                  <div class="iv-pcard-meta">
                    <div><span class="iv-pcard-k">Quy mô:</span> <b>${escapeHtml(fmtArea(p))}</b></div>
                    <div><span class="iv-pcard-k">Tổng vốn:</span> <b>${escapeHtml(fmtMoney(p.capital_billion_vnd))}</b></div>
                  </div>
                  ${statusBadge(p.status)}
                </div>
              </article>
            `).join('')}
          </div>`
      }
    `;
    c.classList.remove('mode-landing', 'mode-project', 'mode-contact');
    c.classList.add('mode-projects');
    currentMode = 'projects';
    document.getElementById('iv-main').scrollTop = 0;

    /* Bind chip click delegation */
    c.querySelector('[data-chip-group="sector"]')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-chip-sector]');
      if (!btn) return;
      activeSector = btn.dataset.chipSector;
      renderSidebar();
      renderProjectsList(document.getElementById('iv-search')?.value.trim() || '');
    });
    c.querySelector('[data-chip-group="status"]')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-chip-status]');
      if (!btn) return;
      activeStatus = btn.dataset.chipStatus;
      renderProjectsList(document.getElementById('iv-search')?.value.trim() || '');
    });
  }

  /* =========================================================
     CONTACT PAGE  (#invest/contact)
     ========================================================= */
  function renderContact() {
    const data = window.INVEST_DATA;
    const c = ensureContent();
    if (!c) return;
    const sectors = data.sectors.filter(s => s.id !== 'all');

    c.innerHTML = `
      <nav class="iv-breadcrumb">
        <a href="#map" class="iv-bc-home">${ic('home')}</a>
        <span class="iv-bc-sep">${ic('chevron')}</span>
        <a href="#invest">Đầu tư</a>
        <span class="iv-bc-sep">${ic('chevron')}</span>
        <span class="iv-bc-current">Đăng ký quan tâm</span>
      </nav>

      <header class="iv-page-header">
        <h1>
          <span>Đăng ký</span>
          <span class="hl">quan tâm đầu tư</span>
        </h1>
        <p class="iv-sub">Để lại thông tin – Trung tâm Xúc tiến Đầu tư Lâm Đồng sẽ liên hệ trong vòng 24 giờ làm việc.</p>
      </header>

      <div class="iv-contact-box">
        <form class="iv-form" id="iv-form" novalidate>
          <div class="iv-form-row">
            <label class="iv-field">
              <span>Họ và tên *</span>
              <input type="text" name="name" required>
            </label>
            <label class="iv-field">
              <span>Doanh nghiệp *</span>
              <input type="text" name="company" required>
            </label>
          </div>
          <div class="iv-form-row">
            <label class="iv-field">
              <span>Quốc gia</span>
              <select name="country">
                <option>Việt Nam</option><option>Hàn Quốc</option><option>Nhật Bản</option>
                <option>Trung Quốc</option><option>Singapore</option><option>Khác</option>
              </select>
            </label>
            <label class="iv-field">
              <span>Email *</span>
              <input type="email" name="email" required>
            </label>
          </div>
          <div class="iv-form-row">
            <label class="iv-field">
              <span>Số điện thoại *</span>
              <input type="tel" name="phone" required>
            </label>
            <label class="iv-field">
              <span>Quy mô vốn dự kiến</span>
              <select name="budget">
                <option>Dưới 100 tỷ</option>
                <option>100 – 500 tỷ</option>
                <option>500 – 1.000 tỷ</option>
                <option>1.000 – 5.000 tỷ</option>
                <option>Trên 5.000 tỷ</option>
              </select>
            </label>
          </div>

          <div class="iv-field">
            <span>Lĩnh vực quan tâm</span>
            <div class="iv-chip-pick">
              ${sectors.map(s => `<label class="iv-pick"><input type="checkbox" name="sectors" value="${s.id}"><span>${escapeHtml(t(s.titleKey))}</span></label>`).join('')}
            </div>
          </div>

          <div class="iv-field">
            <span>Nhu cầu hỗ trợ</span>
            <div class="iv-chip-pick">
              ${[
                ['survey', 'Khảo sát thực địa'],
                ['legal',  'Tư vấn pháp lý'],
                ['partner','Kết nối đối tác'],
                ['docs',   'Tài liệu chi tiết']
              ].map(([id, label]) => `<label class="iv-pick"><input type="checkbox" name="needs" value="${id}"><span>${escapeHtml(label)}</span></label>`).join('')}
            </div>
          </div>

          <label class="iv-field">
            <span>Lời nhắn</span>
            <textarea name="message" rows="4" placeholder="Mô tả ngắn về dự án/lĩnh vực bạn quan tâm…"></textarea>
          </label>

          <button type="submit" class="iv-form-submit">
            ${ic('briefcase')}<span>Gửi đăng ký</span>
          </button>
          <p class="iv-form-note">Thông tin được bảo mật theo quy định và chỉ phục vụ mục đích kết nối đầu tư.</p>
        </form>

        <aside class="iv-contact-side">
          <div class="iv-contact-card">
            <div class="iv-contact-h">${escapeHtml(data.contact.name)}</div>
            <div class="iv-contact-row">${ic('pin')}<span>${escapeHtml(data.contact.address)}</span></div>
            <div class="iv-contact-row">${ic('phone')}<a href="tel:${escapeHtml(data.contact.hotline.replace(/\s/g,''))}">${escapeHtml(data.contact.hotline)}</a></div>
            <div class="iv-contact-row">${ic('briefcase')}<a href="mailto:${escapeHtml(data.contact.email)}">${escapeHtml(data.contact.email)}</a></div>
          </div>
          <a class="iv-contact-channel zalo" href="${escapeHtml(data.contact.zalo)}" target="_blank">
            <span class="iv-contact-channel-icon" style="background:#0068ff">Z</span>
            <span>Liên hệ qua Zalo OA</span>
            ${ic('chevron')}
          </a>
          <a class="iv-contact-channel wa" href="https://wa.me/${escapeHtml(data.contact.whatsapp.replace(/[^\d]/g,''))}" target="_blank">
            <span class="iv-contact-channel-icon" style="background:#25d366">W</span>
            <span>WhatsApp (FDI)</span>
            ${ic('chevron')}
          </a>
        </aside>
      </div>
    `;
    c.classList.remove('mode-landing', 'mode-project', 'mode-projects');
    c.classList.add('mode-contact');
    currentMode = 'contact';
    document.getElementById('iv-main').scrollTop = 0;

    /* Submit handler — Sprint 4: stub log + alert */
    const form = c.querySelector('#iv-form');
    form?.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = {};
      fd.forEach((v, k) => {
        if (payload[k] !== undefined) {
          payload[k] = [].concat(payload[k], v);
        } else {
          payload[k] = v;
        }
      });
      console.log('[invest-ui] form submit payload:', payload);
      alert('Cảm ơn bạn đã đăng ký quan tâm. Trung tâm XTĐT Lâm Đồng sẽ liên hệ lại trong 24 giờ làm việc.');
      form.reset();
    });
  }

  /* =========================================================
     EVENTS
     ========================================================= */
  function bindEvents() {
    const list = document.getElementById('iv-side-list');
    if (list) {
      list.addEventListener('click', e => {
        const btn = e.target.closest('.iv-side-item');
        if (!btn) return;
        activeSector = btn.dataset.sector;
        renderSidebar();
        const q = document.getElementById('iv-search')?.value.trim() || '';
        if (currentMode === 'landing')       renderLanding(q);
        else if (currentMode === 'projects') renderProjectsList(q);
        else if (window.ViewRouter)          window.ViewRouter.navigate('#invest');
      });
    }

    const pdfBtn = document.getElementById('iv-pdf-btn');
    if (pdfBtn) pdfBtn.addEventListener('click', () => alert('Tải PDF — sẽ tích hợp ở Sprint sau.'));
    const contactBtn = document.getElementById('iv-contact-btn');
    if (contactBtn) contactBtn.addEventListener('click', () => {
      if (window.ViewRouter) window.ViewRouter.navigate('#invest/contact', contactBtn);
    });
    const dashBtn = document.getElementById('iv-dashboard-btn');
    if (dashBtn) dashBtn.addEventListener('click', () => {
      if (window.ViewRouter) window.ViewRouter.navigate('#invest/dashboard', dashBtn);
    });

    const search = document.getElementById('iv-search');
    if (search) {
      let timer;
      search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const q = search.value.trim();
          if (currentMode === 'landing')       renderLanding(q);
          else if (currentMode === 'projects') renderProjectsList(q);
        }, 150);
      });
    }

    const langBtn = document.getElementById('iv-lang-btn');
    if (langBtn) langBtn.addEventListener('click', async () => {
      if (!window.I18n) return;
      const next = window.I18n.lang === 'vi' ? 'en' : 'vi';
      await window.I18n.setLang(next);
    });

    window.addEventListener('langchange', () => {
      if (!document.body.classList.contains('view-invest')) return;
      const langLabel = document.getElementById('iv-lang-label');
      if (langLabel) langLabel.textContent = window.I18n.lang.toUpperCase();
      renderSidebar();
      const q = document.getElementById('iv-search')?.value.trim() || '';
      if (currentMode === 'project' && currentProject) renderProject(currentProject.slug);
      else if (currentMode === 'projects') renderProjectsList(q);
      else if (currentMode === 'contact')  renderContact();
      else renderLanding(q);
    });
  }

  /* =========================================================
     PUBLIC: routing
     ========================================================= */
  function showLanding() {
    currentProject = null;
    renderLanding(document.getElementById('iv-search')?.value.trim() || '');
  }
  function showProject(slug) {
    renderProject(slug);
  }
  function showProjects() {
    currentProject = null;
    renderProjectsList(document.getElementById('iv-search')?.value.trim() || '');
  }
  function showContact() {
    currentProject = null;
    renderContact();
  }
  function showDashboard() {
    const c = ensureContent();
    if (!c) return;
    c.classList.remove('mode-landing', 'mode-project', 'mode-projects', 'mode-contact');
    c.classList.add('mode-dashboard');
    currentMode = 'dashboard';
    currentProject = null;
    c.innerHTML = `
      <nav class="iv-breadcrumb">
        <a href="#map" class="iv-bc-home">${ic('home')}</a>
        <span class="iv-bc-sep">${ic('chevron')}</span>
        <a href="#invest">Đầu tư</a>
        <span class="iv-bc-sep">${ic('chevron')}</span>
        <span class="iv-bc-current">Dashboard số liệu</span>
      </nav>
      <header class="iv-page-header">
        <h1><span>Dashboard</span> <span class="hl">đầu tư Lâm Đồng</span></h1>
        <p class="iv-sub">Tổng quan vốn – lĩnh vực – địa bàn – tiến độ. Dữ liệu tổng hợp từ ${window.INVEST_DATA.projects.length} dự án mẫu.</p>
      </header>
      <div id="iv-dash-host"></div>
    `;
    document.getElementById('iv-main').scrollTop = 0;
    if (window.InvestDashboard) {
      window.InvestDashboard.render(document.getElementById('iv-dash-host'));
    }
  }

  async function init() {
    if (initialized) return;
    await loadInvestData();
    renderSidebar();
    bindEvents();
    const langLabel = document.getElementById('iv-lang-label');
    if (langLabel && window.I18n) langLabel.textContent = window.I18n.lang.toUpperCase();
    if (window.I18n) window.I18n.apply(document.getElementById('invest-mount'));
    initialized = true;
  }

  return { init, showLanding, showProject, showProjects, showContact, showDashboard };
})();
