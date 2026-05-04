/* =========================================================
   MODULE: VIEW ROUTER – Map / Guide / Invest + hash routing
   - Hash schema:
       (rỗng) | #map                   → Map 2D
       #guide                          → Cẩm nang landing
       #guide/article/:slug            → Bài viết chi tiết
       #invest                         → Đầu tư landing
       (Sprint 3 sẽ bổ sung: #invest/sector/:id, #invest/projects,
        #invest/project/:id, #invest/policy, #invest/contact …)
   - Lazy-load partial pages/{guide,invest}.html lần đầu vào view.
   - Đóng overlay map (right-panel, news, sheet) trước khi đổi view.
   - Phát ripple #view-transition; cập nhật bottom-bar active state.
   - Click vào element có data-view-go="map" → quay lại Map.
   ========================================================= */

window.ViewRouter = (() => {
  let currentView = 'map';

  function closeMapOverlays() {
    document.body.classList.remove('panel-open', 'news-open', 'sheet-open');
    ['right-panel', 'news-panel', 'sheet'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('open');
    });
    const lp  = document.getElementById('layer-popup');
    const rpb = document.getElementById('right-panel-bg');
    if (lp)  lp.classList.remove('show');
    if (rpb) rpb.classList.remove('show');
  }

  /* Nạp partial từ <template id="..."> trong index.html.
     KHÔNG fetch nữa: VS Code Live Server inject script live-reload sai
     chỗ vào response của file partial (giữa SVG, truncate body) →
     không thể tin cậy. Template trong file chính không bị inject vì
     Live Server chỉ inject 1 lần ở cuối <body>. */
  function loadPartial(templateId, mountId, expectId) {
    const mount = document.getElementById(mountId);
    if (!mount) throw new Error(`Mount #${mountId} không có trong index.html`);
    if (mount.dataset.loaded === '1' && (!expectId || mount.querySelector('#' + expectId))) {
      return;
    }
    const tpl = document.getElementById(templateId);
    if (!tpl || !('content' in tpl)) {
      throw new Error(`Template #${templateId} không có trong index.html`);
    }
    mount.innerHTML = '';
    mount.appendChild(tpl.content.cloneNode(true));
    if (expectId && !mount.querySelector('#' + expectId)) {
      throw new Error(`Template #${templateId} không chứa #${expectId} — kiểm tra markup trong index.html.`);
    }
    mount.dataset.loaded = '1';
  }

  function playRipple(originEl) {
    const ripple = document.getElementById('view-transition');
    if (!ripple) return;
    const rect = originEl ? originEl.getBoundingClientRect() : null;
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight - 40;
    ripple.style.left = cx + 'px';
    ripple.style.top = cy + 'px';
    ripple.style.background = '#fff';
    ripple.style.transition = 'none';
    ripple.style.transform = 'translate(-50%, -50%) scale(0)';
    ripple.style.opacity = '0';
    void ripple.offsetWidth;
    ripple.style.transition = 'transform .55s cubic-bezier(.4,0,.2,1), opacity .55s';
    ripple.style.opacity = '0.18';
    ripple.style.transform = 'translate(-50%, -50%) scale(280)';
    setTimeout(() => {
      ripple.style.transition = 'opacity .35s';
      ripple.style.opacity = '0';
    }, 380);
  }

  function setBottomBarActive(view) {
    document.querySelectorAll('#bottom-bar .bbt').forEach(b => b.classList.remove('active'));
    const target = document.querySelector(`#bottom-bar .bbt[data-view="${view}"]`);
    if (target) target.classList.add('active');
    if (window.UI && typeof window.UI.updateBBIndicator === 'function') {
      window.UI.updateBBIndicator();
    }
  }

  /* ----- Hash parsing ----- */
  function parseHash(hash) {
    hash = (hash || '').replace(/^#/, '').trim();
    if (!hash || hash === 'map') return { view: 'map' };
    const parts = hash.split('/');
    const view = parts[0];
    if (view === 'map') {
      if (parts[1] === 'project' && parts[2]) return { view: 'map', sub: 'project', slug: parts[2] };
      return { view: 'map' };
    }
    if (view === 'guide') {
      if (parts[1] === 'article' && parts[2]) return { view: 'guide', sub: 'article', slug: parts[2] };
      return { view: 'guide' };
    }
    if (view === 'invest') {
      if (parts[1] === 'project' && parts[2]) return { view: 'invest', sub: 'project', slug: parts[2] };
      if (parts[1] === 'projects')             return { view: 'invest', sub: 'projects' };
      if (parts[1] === 'contact')              return { view: 'invest', sub: 'contact' };
      if (parts[1] === 'dashboard')            return { view: 'invest', sub: 'dashboard' };
      return { view: 'invest' };
    }
    return { view: 'map' };
  }

  /* ----- Apply route lên DOM ----- */
  async function applyRoute(route, originEl, fromHashChange) {
    const view = route.view;
    const body = document.body;

    if (currentView !== view) {
      closeMapOverlays();
      if (!fromHashChange) playRipple(originEl);
      body.classList.remove('view-map', 'view-guide', 'view-invest');
      body.classList.add('view-' + view);
      currentView = view;
      setBottomBarActive(view);
    }

    if (view === 'map' && route.sub === 'project' && route.slug) {
      /* Kích hoạt invest layer + bay tới project + highlight ring */
      if (window.MapModule?.flyToProject) {
        setTimeout(() => window.MapModule.flyToProject(route.slug), 100);
      }
    }

    if (view === 'guide') {
      try {
        loadPartial('tpl-guide-view', 'guide-mount', 'gv-main');
        if (window.I18n) window.I18n.apply(document.getElementById('guide-mount'));
        await window.GuideUI.init();
        if (route.sub === 'article' && route.slug) {
          window.GuideUI.showArticle(route.slug);
        } else {
          window.GuideUI.showLanding();
        }
      } catch (err) { console.error('[router] Guide load fail:', err); }
    } else if (view === 'invest') {
      try {
        loadPartial('tpl-invest-view', 'invest-mount', 'iv-main');
        if (window.I18n) window.I18n.apply(document.getElementById('invest-mount'));
        await window.InvestUI.init();
        if (route.sub === 'project' && route.slug) window.InvestUI.showProject(route.slug);
        else if (route.sub === 'projects')          window.InvestUI.showProjects();
        else if (route.sub === 'contact')           window.InvestUI.showContact();
        else if (route.sub === 'dashboard')         window.InvestUI.showDashboard();
        else                                        window.InvestUI.showLanding();
      } catch (err) { console.error('[router] Invest load fail:', err); }
    }
  }

  /* ----- Public navigate (đổi hash → trigger hashchange) ----- */
  function navigate(hash, originEl) {
    const target = (hash.startsWith('#') ? hash : '#' + hash);
    if (location.hash === target) {
      // re-apply (force) for state changes within same hash
      applyRoute(parseHash(target), originEl, false);
      return;
    }
    if (originEl) _pendingOrigin = originEl;
    location.hash = target;
  }
  let _pendingOrigin = null;

  function onHashChange() {
    const route = parseHash(location.hash);
    applyRoute(route, _pendingOrigin, true);
    _pendingOrigin = null;
  }

  function bindBottomBar() {
    document.querySelectorAll('#bottom-bar .bbt[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.view;
        navigate('#' + (v === 'map' ? '' : v), btn);
      });
    });
  }

  /* Click delegate cho mọi link/element data-view-go="..." */
  function bindDelegated() {
    document.addEventListener('click', e => {
      const goEl = e.target.closest('[data-view-go]');
      if (goEl) {
        e.preventDefault();
        const v = goEl.dataset.viewGo;
        navigate('#' + (v === 'map' ? '' : v), goEl);
      }
    });
  }

  function initRouter() {
    document.body.classList.add('view-map');
    bindBottomBar();
    bindDelegated();
    window.addEventListener('hashchange', onHashChange);
    /* Apply route ban đầu (nếu hash đã có sẵn lúc reload) */
    if (location.hash) onHashChange();
    else setBottomBarActive('map');
  }

  return { initRouter, navigate, parseHash };
})();
