/* =========================================================
   MODULE: DATA LOADER
   - Tải data/data.{lang}.json theo I18n.lang.
   - Fallback: nếu file lang không tồn tại → dùng data.vi.json.
   - Khi đổi ngôn ngữ, gọi reloadData() rồi re-render lại UI.
   ========================================================= */

window.APP_DATA = null;

async function fetchLang(lang) {
  const res = await fetch(`data/data.${lang}.json`);
  if (!res.ok) throw new Error(`data/data.${lang}.json not found`);
  return res.json();
}

async function loadData() {
  const lang = (window.I18n && window.I18n.lang) || 'vi';
  try {
    window.APP_DATA = await fetchLang(lang);
  } catch (_) {
    /* fallback: dùng VI nếu file lang không có */
    window.APP_DATA = await fetchLang('vi');
  }
  return window.APP_DATA;
}

/* Reload theo ngôn ngữ hiện tại — UI gọi sau khi I18n.setLang() */
async function reloadData() {
  return loadData();
}
