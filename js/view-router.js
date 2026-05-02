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

  async function loadPartial(url, mountId, expectId) {
    const mount = document.getElementById(mountId);
    if (!mount) throw new Error(`Mount #${mountId} không có trong index.html`);
    if (mount.dataset.loaded === '1' && (!expectId || mount.querySelector('#' + expectId))) {
      return;
    }
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Không tải được ${url} (HTTP ${res.status})`);
    let text = await res.text();
    const _origLen = text.length;
    const _origTail = text.slice(-300);

    /* VS Code Live Server inject `<script>` reload vào BÊN TRONG
       các thẻ </svg> của partial (sai chỗ) → phá HTML parser.
       Partial không có script thật nên cứ strip mọi <script>…</script>
       + comment marker của Live Server. Dùng strip nguyên-tử (mỗi
       lần một block) thay vì regex /g để tránh match-overlap.       */
    function stripBlock(s, openRe, closeStr) {
      let out = '', i = 0;
      while (i < s.length) {
        openRe.lastIndex = i;
        const m = openRe.exec(s);
        if (!m) { out += s.slice(i); break; }
        out += s.slice(i, m.index);
        const closeAt = s.indexOf(closeStr, openRe.lastIndex);
        if (closeAt === -1) { out += s.slice(i); break; }
        i = closeAt + closeStr.length;
        while (i < s.length && /\s/.test(s[i])) i++;
      }
      return out;
    }
    text = stripBlock(text, /<script\b[^>]*>/gi, '</script>');
    text = text.replace(/<!--\s*Code injected by live-server\s*-->\s*/gi, '');

    /* Dùng <template> để parse fragment — không bị quirk html/head/body. */
    const tpl = document.createElement('template');
    tpl.innerHTML = text;
    mount.innerHTML = '';
    mount.appendChild(tpl.content.cloneNode(true));

    if (expectId && !mount.querySelector('#' + expectId)) {
      const ids = Array.from(mount.querySelectorAll('[id]')).map(e => e.tagName + '#' + e.id);
      const tags = Array.from(mount.querySelectorAll('*')).map(e => e.tagName.toLowerCase()).join(',');
      console.error('[loadPartial] BEFORE-strip length:', _origLen, 'AFTER-strip length:', text.length, 'mount innerHTML length:', mount.innerHTML.length);
      console.error('[loadPartial] BEFORE-strip cuối 300:\n' + _origTail);
      console.error('[loadPartial] AFTER-strip cuối 300:\n' + text.slice(-300));
      console.error('[loadPartial] ALL IDs in mount:', ids);
      console.error('[loadPartial] ALL tags in mount (đầu 50):', tags.split(',').slice(0, 50).join(','));
      console.error('[loadPartial] mount.innerHTML cuối 600:', mount.innerHTML.slice(-600));
      throw new Error(`Partial ${url} không có #${expectId}.`);
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
    if (view === 'guide') {
      if (parts[1] === 'article' && parts[2]) return { view: 'guide', sub: 'article', slug: parts[2] };
      return { view: 'guide' };
    }
    if (view === 'invest') {
      // Sprint 3 sẽ parse thêm; hiện tại trả landing
      return { view: 'invest', sub: parts[1], param: parts[2] };
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

    if (view === 'guide') {
      try {
        await loadPartial('pages/guide.html', 'guide-mount', 'gv-main');
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
        await loadPartial('pages/invest.html', 'invest-mount', 'iv-main');
        if (window.I18n) window.I18n.apply(document.getElementById('invest-mount'));
        await window.InvestUI.init();
        // Sprint 3: dispatch sub-route → InvestUI
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
