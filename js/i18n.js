/* =========================================================
   MODULE: I18N – Đa ngôn ngữ
   - Tải `data/i18n/{lang}.json` và áp dụng cho toàn bộ DOM.
   - Đánh dấu element cần dịch bằng:
       data-i18n="key.path"            → set textContent
       data-i18n-placeholder="key"     → set placeholder
       data-i18n-title="key"           → set title (tooltip)
   - Trong code JS động, gọi `I18n.t('key', { vars })` để lấy chuỗi.
   - Đổi ngôn ngữ: I18n.setLang('en') → tự fetch dict & apply.
   ========================================================= */

window.I18n = (() => {
  const STORAGE_KEY = 'vr360.lang';
  let dict = {};
  let lang = localStorage.getItem(STORAGE_KEY) || 'vi';

  async function load(l) {
    const res = await fetch(`data/i18n/${l}.json`);
    if (!res.ok) throw new Error(`Không tải được i18n/${l}.json`);
    dict = await res.json();
    lang = l;
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }

  function t(key, vars) {
    const v = key.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), dict);
    if (typeof v !== 'string') return key;
    if (!vars) return v;
    return v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
  }

  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
  }

  async function setLang(l) {
    await load(l);
    apply();
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: l } }));
  }

  return {
    load, apply, t, setLang,
    get lang() { return lang; },
  };
})();
