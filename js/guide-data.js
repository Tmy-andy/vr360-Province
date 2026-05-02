/* =========================================================
   MODULE: GUIDE DATA LOADER
   - Tải song song guide.json (landing) + guide-articles.json (chi tiết).
   - Export ra `window.GUIDE_DATA = { topics, hero, stats, featured,
     tips, articles }`. Pattern y hệt js/data.js để dễ thay sang API
     thật sau này.
   ========================================================= */

window.GUIDE_DATA = null;

async function loadGuideData() {
  if (window.GUIDE_DATA) return window.GUIDE_DATA;
  const [landing, articles] = await Promise.all([
    fetch('data/guide.json').then(r => {
      if (!r.ok) throw new Error('Không tải được guide.json');
      return r.json();
    }),
    fetch('data/guide-articles.json').then(r => {
      if (!r.ok) throw new Error('Không tải được guide-articles.json');
      return r.json();
    })
  ]);
  window.GUIDE_DATA = Object.assign({}, landing, { articles: articles.articles });
  return window.GUIDE_DATA;
}
