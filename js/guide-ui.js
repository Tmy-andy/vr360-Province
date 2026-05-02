/* =========================================================
   MODULE: GUIDE UI – Cẩm nang Du lịch
   - 2 mode render trong #gv-content:
       * landing  : hero + stats + featured articles + tips
       * article  : breadcrumb + tag + meta + hero + body + TOC sidebar
   - Sidebar 8 chủ đề: click → set hash #guide?topic=:id (Sprint 2 chỉ
     filter danh sách bài viết nổi bật theo topic, vẫn ở landing).
   - Search bar ở topbar: lọc featured theo title/excerpt.
   - Scrollspy: cuộn trong #gv-main, highlight item TOC tương ứng.
   ========================================================= */

window.GuideUI = (() => {
  let initialized = false;
  let currentMode = 'landing';   // 'landing' | 'article'
  let activeTopic = null;        // null = all
  let currentArticle = null;
  let scrollspyHandler = null;

  /* ----- Bộ icon stroke 2 (Lucide-like) – dùng key trong JSON ----- */
  const ICONS = {
    book:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    calendar:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    car:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14l-1.5-7H6.5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>',
    bed:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 17V7"/><path d="M2 12h20v5"/><path d="M22 17V12"/><path d="M6 11V8h6v3"/></svg>',
    utensils:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7a3 3 0 0 0 3 3v10"/><path d="M9 2v7a3 3 0 0 1-3 3"/><path d="M15 2c-1.5 2-2 4-2 7 0 2 1 3 2 3v10"/></svg>',
    'map-pin': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    camera:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    lightbulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>',

    /* Stat & tip icons */
    thermo:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>',
    plane:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
    pin:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    altitude:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>',
    users:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    jacket:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 2 12 6 8 2 3 5v15a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5z"/><path d="M12 6v16"/></svg>',
    medkit:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>',
    heart:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    bookmark:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    clock:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    share:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    download:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    home:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    chevron:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    verified:  '<svg viewBox="0 0 24 24" fill="#2bb6e6" stroke="#fff" stroke-width="2"><path d="M12 2 14.39 5.42 18.7 4.6 18.18 8.92 22 11l-3.82 2.08L18.7 17.4l-4.31-.82L12 20l-2.39-3.42-4.31.82.52-4.32L2 11l3.82-2.08L5.3 4.6l4.31.82z"/><polyline points="9 12 11 14 15 10" fill="none" stroke="#fff"/></svg>'
  };
  const ic = key => ICONS[key] || '';

  /* ----- Helpers ----- */
  function t(key) { return window.I18n ? window.I18n.t(key) : key; }
  function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(window.I18n && window.I18n.lang === 'en' ? 'en-GB' : 'vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function findArticle(slug) {
    return window.GUIDE_DATA.articles.find(a => a.slug === slug);
  }
  function articlesByTopic(topicId) {
    if (!topicId) return window.GUIDE_DATA.articles;
    return window.GUIDE_DATA.articles.filter(a => a.topicId === topicId);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  /* Tự tạo #gv-content nếu thiếu (đề phòng partial cache lỗi) */
  function ensureContent() {
    let c = document.getElementById('gv-content');
    if (c) return c;
    const main = document.getElementById('gv-main');
    if (!main) {
      console.error('[guide-ui] #gv-main không có trong DOM — partial chưa nạp.');
      return null;
    }
    console.warn('[guide-ui] Thiếu #gv-content, tự tạo lại.');
    c = document.createElement('div');
    c.id = 'gv-content';
    main.appendChild(c);
    return c;
  }

  /* =========================================================
     SIDEBAR
     ========================================================= */
  function renderSidebar() {
    const list = document.getElementById('gv-side-list');
    if (!list || !window.GUIDE_DATA) return;
    list.innerHTML = window.GUIDE_DATA.topics.map(topic => `
      <button type="button" class="gv-side-item${topic.id === activeTopic ? ' active' : ''}" data-topic="${topic.id}">
        <span class="gv-side-icon">${ic(topic.icon)}</span>
        <span class="gv-side-text">
          <span class="gv-side-name">${t(topic.titleKey)}</span>
          <span class="gv-side-sub">${t(topic.subKey)}</span>
        </span>
      </button>
    `).join('');
  }

  /* =========================================================
     LANDING
     ========================================================= */
  function renderLanding(filterText) {
    const data = window.GUIDE_DATA;
    const featuredIds = data.featured || [];
    let articles = featuredIds.map(id => data.articles.find(a => a.slug === id)).filter(Boolean);
    if (activeTopic) articles = articles.filter(a => a.topicId === activeTopic);
    if (filterText) {
      const q = filterText.toLowerCase();
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(q) || (a.excerpt || '').toLowerCase().includes(q)
      );
    }

    const heroHtml = `
      <section class="gv-hero">
        <div class="gv-hero-text">
          <span class="gv-hero-tag">${escapeHtml(data.hero.tag)}</span>
          <h2 class="gv-hero-title">${escapeHtml(data.hero.title)}</h2>
          <p class="gv-hero-desc">${escapeHtml(data.hero.desc)}</p>
          <a class="gv-hero-cta" href="${data.hero.ctaHref}">
            <span>${escapeHtml(data.hero.cta)}</span>
            ${ic('chevron')}
          </a>
        </div>
        <div class="gv-hero-img" style="background-image:url('${data.hero.image}')"></div>
      </section>
      <section class="gv-stats">
        ${data.stats.map(s => `
          <div class="gv-stat">
            <span class="gv-stat-icon">${ic(s.icon)}</span>
            <div>
              <div class="gv-stat-label">${escapeHtml(s.label)}</div>
              <div class="gv-stat-value">${escapeHtml(s.value)}</div>
            </div>
          </div>
        `).join('')}
      </section>
    `;

    const articlesHtml = `
      <h3 class="view-section-title">${t('guide.featured')}</h3>
      ${articles.length === 0
        ? `<div class="gv-empty">${t('guide.empty')}</div>`
        : `<div class="gv-articles">
            ${articles.map(a => `
              <article class="gv-card" data-slug="${a.slug}">
                <a class="gv-card-img" href="#guide/article/${a.slug}" style="background-image:url('${a.hero}')">
                  <span class="gv-card-tag">${escapeHtml(a.category)}</span>
                </a>
                <div class="gv-card-body">
                  <a class="gv-card-title" href="#guide/article/${a.slug}">${escapeHtml(a.title)}</a>
                  <p class="gv-card-excerpt">${escapeHtml(a.excerpt || '')}</p>
                  <div class="gv-card-meta">
                    <span class="gv-card-read">${ic('clock')}<span>${a.readMin} ${t('guide.minRead')}</span></span>
                    <button class="gv-card-bookmark" type="button" aria-label="Lưu">${ic('bookmark')}</button>
                  </div>
                </div>
              </article>
            `).join('')}
          </div>`
      }
    `;

    const tipsHtml = `
      <h3 class="view-section-title">${t('guide.tipsTitle')}</h3>
      <div class="gv-tips">
        ${data.tips.map(tip => `
          <div class="gv-tip">
            <span class="gv-tip-icon">${ic(tip.icon)}</span>
            <div>
              <div class="gv-tip-title">${escapeHtml(tip.title)}</div>
              <div class="gv-tip-desc">${escapeHtml(tip.desc)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    (ensureContent() || {}).innerHTML = `
      <header class="gv-header">
        <h1>
          <span>${t('guide.title')}</span>
          <span class="hl">${t('guide.title_hl')}</span>
        </h1>
        <p class="gv-sub">${t('guide.sub')}</p>
      </header>
      ${heroHtml}
      ${articlesHtml}
      ${tipsHtml}
    `;
    currentMode = 'landing';
    const cl = ensureContent();
    if (cl) { cl.classList.remove('mode-article'); cl.classList.add('mode-landing'); }
    cleanupScrollspy();
  }

  /* =========================================================
     ARTICLE DETAIL
     ========================================================= */
  function renderBodyBlocks(article) {
    return article.body.map(b => {
      if (b.type === 'heading') {
        const slug = 'h-' + (b.num || Math.random().toString(36).slice(2, 7));
        return `<h2 class="gv-art-h" id="${slug}" data-num="${b.num || ''}">
          ${b.num ? `<span class="gv-art-h-num">${b.num}.</span>` : ''}
          <span>${escapeHtml(b.text)}</span>
        </h2>`;
      }
      if (b.type === 'para') {
        return `<p class="gv-art-p">${escapeHtml(b.text)}</p>`;
      }
      if (b.type === 'stats') {
        const items = (b.items || article.stats || []);
        if (!items.length) return '';
        return `<div class="gv-art-stats">${items.map(s => `
          <div class="gv-stat">
            <span class="gv-stat-icon">${ic(s.icon)}</span>
            <div>
              <div class="gv-stat-label">${escapeHtml(s.label)}</div>
              <div class="gv-stat-value">${escapeHtml(s.value)}</div>
            </div>
          </div>`).join('')}</div>`;
      }
      return '';
    }).join('');
  }

  function buildToc(article) {
    const headings = article.body.filter(b => b.type === 'heading');
    return headings.map((h, i) => {
      const num = h.num || String(i + 1).padStart(2, '0');
      const slug = 'h-' + h.num;
      return `<a class="gv-toc-item" href="#${slug}" data-target="${slug}">
        <span class="gv-toc-num">${num}.</span>
        <span class="gv-toc-text">${escapeHtml(h.text)}</span>
      </a>`;
    }).join('');
  }

  function renderArticle(slug) {
    const article = findArticle(slug);
    if (!article) {
      (ensureContent() || {}).innerHTML = `<div class="gv-empty">${t('guide.notFound')}</div>`;
      return;
    }
    currentArticle = article;
    const verified = article.verified ? `<span class="gv-art-verified" title="Đã xác thực">${ic('verified')}</span>` : '';
    const html = `
      <nav class="gv-breadcrumb">
        <a href="#map" class="gv-bc-home">${ic('home')}</a>
        <span class="gv-bc-sep">${ic('chevron')}</span>
        <a href="#guide">${t('guide.title')}</a>
        <span class="gv-bc-sep">${ic('chevron')}</span>
        <a href="#guide" class="gv-bc-cat">${escapeHtml(article.category)}</a>
        <span class="gv-bc-sep">${ic('chevron')}</span>
        <span class="gv-bc-current">${escapeHtml(article.title)}</span>
      </nav>

      <span class="gv-art-tag">${escapeHtml(article.category)}</span>

      <div class="gv-art-headline">
        <div class="gv-art-headline-text">
          <h1 class="gv-art-title">${escapeHtml(article.title)}</h1>
          <p class="gv-art-excerpt">${escapeHtml(article.excerpt || '')}</p>
          <div class="gv-art-meta">
            <span class="gv-art-author">
              <span class="gv-art-avatar"></span>
              <span>${escapeHtml(article.author)}</span>
              ${verified}
            </span>
            <span class="gv-art-dot">•</span>
            <span>${t('guide.publishedOn')} ${fmtDate(article.date)}</span>
            <span class="gv-art-dot">•</span>
            <span>${article.readMin} ${t('guide.minRead')}</span>
          </div>
        </div>
        <div class="gv-art-actions">
          <button class="gv-art-btn" type="button">${ic('heart')}<span>${t('guide.like')}</span></button>
          <button class="gv-art-btn" type="button">${ic('share')}<span>${t('guide.share')}</span></button>
          <button class="gv-art-btn primary" type="button">${ic('download')}<span>${t('guide.pdfShort')}</span></button>
        </div>
      </div>

      <figure class="gv-art-hero" style="background-image:url('${article.hero}')"></figure>

      <div class="gv-art-grid">
        <article class="gv-art-body">
          ${renderBodyBlocks(article)}
        </article>
        <aside class="gv-art-side">
          <div class="gv-toc">
            <div class="gv-toc-title">${t('guide.tocTitle')}</div>
            <div class="gv-toc-list">${buildToc(article)}</div>
          </div>
          ${article.tipBox ? `
            <div class="gv-tipbox">
              <div class="gv-tipbox-title">
                ${ic('lightbulb')}
                <span>${escapeHtml(article.tipBox.title)}</span>
              </div>
              <p>${escapeHtml(article.tipBox.text)}</p>
            </div>
          ` : ''}
        </aside>
      </div>
    `;
    const content = ensureContent();
    if (!content) return;
    content.innerHTML = html;
    content.classList.remove('mode-landing');
    content.classList.add('mode-article');
    currentMode = 'article';
    const main = document.getElementById('gv-main');
    if (main) main.scrollTop = 0;
    setupScrollspy();
  }

  /* =========================================================
     SCROLLSPY (TOC active state)
     ========================================================= */
  function setupScrollspy() {
    cleanupScrollspy();
    const main = document.getElementById('gv-main');
    if (!main) return;
    const headings = Array.from(main.querySelectorAll('.gv-art-h'));
    const tocItems = Array.from(main.querySelectorAll('.gv-toc-item'));
    if (!headings.length || !tocItems.length) return;

    function update() {
      const scrollTop = main.scrollTop;
      const trigger = scrollTop + 120;
      let activeIdx = 0;
      for (let i = 0; i < headings.length; i++) {
        if (headings[i].offsetTop <= trigger) activeIdx = i;
      }
      tocItems.forEach((item, i) => item.classList.toggle('active', i === activeIdx));
    }
    main.addEventListener('scroll', update, { passive: true });
    update();
    scrollspyHandler = { main, fn: update };

    /* Smooth scroll cho TOC click trong cùng main scroller */
    tocItems.forEach(item => {
      item.addEventListener('click', e => {
        const id = item.dataset.target;
        const target = main.querySelector('#' + id);
        if (target) {
          e.preventDefault();
          main.scrollTo({ top: target.offsetTop - 16, behavior: 'smooth' });
        }
      });
    });
  }
  function cleanupScrollspy() {
    if (scrollspyHandler) {
      scrollspyHandler.main.removeEventListener('scroll', scrollspyHandler.fn);
      scrollspyHandler = null;
    }
  }

  /* =========================================================
     EVENT BINDING (chỉ bind 1 lần)
     ========================================================= */
  function bindEvents() {
    /* Sidebar click */
    const list = document.getElementById('gv-side-list');
    if (list) {
      list.addEventListener('click', e => {
        const btn = e.target.closest('.gv-side-item');
        if (!btn) return;
        const next = btn.dataset.topic;
        activeTopic = (activeTopic === next) ? null : next;
        renderSidebar();
        if (currentMode === 'landing') renderLanding(document.getElementById('gv-search').value.trim());
        else if (window.ViewRouter) window.ViewRouter.navigate('#guide');
      });
    }

    /* PDF stub */
    const pdf = document.getElementById('gv-pdf-btn');
    if (pdf) pdf.addEventListener('click', () => alert('Tải PDF — sẽ tích hợp ở Sprint sau.'));

    /* Search */
    const search = document.getElementById('gv-search');
    if (search) {
      let timer;
      search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (currentMode === 'landing') renderLanding(search.value.trim());
        }, 150);
      });
    }

    /* Lang button: tái dùng I18n.setLang toggle vi/en */
    const langBtn = document.getElementById('gv-lang-btn');
    if (langBtn) langBtn.addEventListener('click', async () => {
      if (!window.I18n) return;
      const next = window.I18n.lang === 'vi' ? 'en' : 'vi';
      await window.I18n.setLang(next);
    });
    /* Fullscreen */
    const fsBtn = document.getElementById('gv-fs-btn');
    if (fsBtn) fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    });

    /* Đổi ngôn ngữ → re-render label sidebar + view hiện tại */
    window.addEventListener('langchange', () => {
      if (!document.body.classList.contains('view-guide')) return;
      const langLabel = document.getElementById('gv-lang-label');
      if (langLabel) langLabel.textContent = window.I18n.lang.toUpperCase();
      renderSidebar();
      if (currentMode === 'article' && currentArticle) renderArticle(currentArticle.slug);
      else renderLanding(document.getElementById('gv-search').value.trim());
    });
  }

  /* =========================================================
     PUBLIC: routing
     ========================================================= */
  function showLanding() {
    cleanupScrollspy();
    currentArticle = null;
    renderLanding(document.getElementById('gv-search')?.value.trim() || '');
  }
  function showArticle(slug) {
    renderArticle(slug);
  }

  async function init() {
    if (initialized) return;
    await loadGuideData();
    renderSidebar();
    bindEvents();
    const langLabel = document.getElementById('gv-lang-label');
    if (langLabel && window.I18n) langLabel.textContent = window.I18n.lang.toUpperCase();
    if (window.I18n) window.I18n.apply(document.getElementById('guide-mount'));
    initialized = true;
  }

  return { init, showLanding, showArticle };
})();
