/* =========================================================
   MODULE: GUIDE DATA LOADER
   - Tải song song guide.{lang}.json (landing) + guide-articles.{lang}.json.
   - Fallback về .vi.json nếu file lang không tồn tại.
   - Cache theo lang; gọi reloadGuideData() khi đổi ngôn ngữ.
   ========================================================= */

window.GUIDE_DATA = null;
let _guideLoadedLang = null;

async function _fetchJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Không tải được ${path}`);
  return r.json();
}

async function loadGuideData() {
  const lang = (window.I18n && window.I18n.lang) || 'vi';
  if (window.GUIDE_DATA && _guideLoadedLang === lang) return window.GUIDE_DATA;
  let landing, articles;
  try {
    [landing, articles] = await Promise.all([
      _fetchJson(`data/guide.${lang}.json`),
      _fetchJson(`data/guide-articles.${lang}.json`)
    ]);
  } catch (_) {
    /* fallback VI */
    [landing, articles] = await Promise.all([
      _fetchJson('data/guide.vi.json'),
      _fetchJson('data/guide-articles.vi.json')
    ]);
  }
  window.GUIDE_DATA = Object.assign({}, landing, { articles: articles.articles });
  _guideLoadedLang = lang;
  return window.GUIDE_DATA;
}

async function reloadGuideData() {
  _guideLoadedLang = null;
  window.GUIDE_DATA = null;
  return loadGuideData();
}
