/* =========================================================
   MODULE: DATA LOADER
   - Tải data/data.json và export ra biến toàn cục `APP_DATA`.
   - Không sửa logic ở đây khi muốn thay địa điểm — chỉ sửa data.json.
   - Nếu mở file index.html bằng đường dẫn file:// trực tiếp,
     fetch() có thể bị chặn do CORS. Hãy chạy local server, ví dụ:
        py -m http.server      (Python)
        npx serve              (Node)
     hoặc dùng Live Server trong VSCode.
   ========================================================= */

window.APP_DATA = null;

async function loadData() {
  const res = await fetch('data/data.json');
  if (!res.ok) throw new Error('Không tải được data.json');
  window.APP_DATA = await res.json();
  return window.APP_DATA;
}
