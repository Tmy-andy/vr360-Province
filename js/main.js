/* =========================================================
   MODULE: MAIN – Bootstrap ứng dụng
   Thứ tự khởi động:
     1. loadData()           : tải data.json
     2. MapModule.initMap()  : khởi tạo bản đồ + marker
     3. UI.initEvents()      : đăng ký event UI
     4. UI.renderList()      : render lần đầu
     5. UI.openPanel()       : mở panel + tắt loading
   ========================================================= */

window.addEventListener('load', async () => {
  try {
    await loadData();
    await window.I18n.load(window.I18n.lang);   // tải dict ngôn ngữ hiện tại
    window.I18n.apply();                         // áp dụng cho HTML tĩnh
    document.getElementById('lang-label').textContent = window.I18n.lang.toUpperCase();
    window.MapModule.initMap();
    window.UI.initEvents();

    setTimeout(() => {
      document.getElementById('loading').classList.add('done');
      window.UI.renderList();
      window.UI.openPanel();
    }, 700);
  } catch (err) {
    console.error('[VR360] Khởi động thất bại:', err);
    const loading = document.getElementById('loading');
    if (loading) loading.querySelector('p').textContent = 'Lỗi tải dữ liệu. Hãy chạy local server (xem js/data.js).';
  }
});