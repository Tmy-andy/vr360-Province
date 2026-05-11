# Help Tour (Nút "?") — Tài liệu kỹ thuật & UI/UX (port-ready spec)

> Mục đích: tài liệu mô tả **đầy đủ** module **Help Tour** (spotlight onboarding) đang dùng trong `vr360` — nút `?` ở top-right kích hoạt một tour highlight từng nút UI, tooltip có mũi tên trỏ về spotlight, click bất kỳ đâu để sang bước tiếp theo. Đủ chi tiết để **port sang dự án khác**.

- **Logic JS:** [js/ui.js:455-682, 773-790](../js/ui.js#L455-L682) (block `HELP_ITEMS_2D / HELP_ITEMS_3D / startTour / endTour / showTourStep` + binding events)
- **HTML overlay:** [index.html:163-173](../index.html#L163-L173)
- **Nút trigger `#help-btn`:** [index.html:47](../index.html#L47)
- **CSS:** [css/style.css:170-229](../css/style.css#L170-L229) (button `.ticon` + `#help-btn`) và [css/style.css:1363-1446](../css/style.css#L1363-L1446) (overlay + spot + tip + arrow)
- **i18n:** [`tour.*`](../data/i18n/vi.json#L334-L381) và [`tour_overlay.*`](../data/i18n/vi.json#L255-L258), [`top.help`](../data/i18n/vi.json) cho tooltip title

---

## 1. Tổng quan chức năng

Help Tour là một **interactive onboarding spotlight**:

| Đặc điểm | Mô tả |
|---|---|
| Trigger | Click nút `?` ở top-right (`#help-btn`) |
| Backdrop | Toàn màn hình tối `rgba(0,0,0,.72)`, "khoét" 1 lỗ sáng quanh element đang highlight |
| Spotlight | Box-shadow `0 0 0 9999px` để tạo cảm giác đục lỗ qua nền tối |
| Tooltip | Card trắng 280px, có **mũi tên CSS** tự xoay 4 hướng để trỏ về spotlight |
| Navigation | Click **bất kỳ đâu trên overlay** → bước tiếp; nút `×` (`#tour-skip`) → thoát; `Esc` → thoát |
| Auto-skip | Element ẩn (display:none / size 0) → tự nhảy bước tiếp |
| Multi-mode | 2 danh sách bước khác nhau cho 2D map vs 3D VR (`HELP_ITEMS_2D` / `HELP_ITEMS_3D`) |
| Responsive | Tự mở mobile menu (`body.mobile-menu-open`) trước khi tour ở mobile để spotlight các nút bị ẩn |
| Resize-aware | Lắng nghe `resize` → re-render spot/tip ở vị trí mới |
| i18n live | Label/step resolve qua `I18n.t()` mỗi lần show step → đổi ngôn ngữ giữa tour cũng cập nhật |
| Smart placement | Tooltip tự chọn cạnh **bottom → top → right → left** dựa trên không gian còn trống của viewport |
| Step counter | Hiển thị "Bước i / n" trong tooltip |

---

## 2. Phụ thuộc

### Bắt buộc
- Vanilla JS, không cần framework.
- DOM phải tồn tại các phần tử: `#tour-overlay`, `#tour-spot`, `#tour-tip` (với 4 con `.tt-arrow`, `.tt-step`, `.tt-label`, `.tt-hint`, `#tour-skip`), và `#help-btn`.

### Tùy chọn
- `window.I18n.t(key, vars)` — nếu không có, fallback dùng `item.label` (string raw) thay cho `item.labelKey`.
- Class `body.mobile-menu-open` — chỉ cần khi UI mobile của bạn ẩn các nút sau menu hamburger; nếu không bỏ phần `if (isMobile)`.

---

## 3. Cấu trúc DOM

### 3.1 Nút trigger
```html
<button class="ticon tr-help" id="help-btn"
        data-i18n-title="top.help"
        title="Hướng dẫn sử dụng">?</button>
```
- Nằm trong cụm `#top-right`, cùng layout flex ngang với các nút icon khác.
- Là một `.ticon` 36×36 tròn (`--pill-h: 36px`) NHƯNG **đảo màu**: nền trắng + chữ xanh `--icon-blue`, font-size 16px, font-weight 700, ký tự "?".

### 3.2 Overlay
```html
<div id="tour-overlay">
  <div id="tour-spot"></div>
  <div id="tour-tip">
    <div class="tt-arrow"></div>
    <div class="tt-step"></div>     <!-- "Bước 1 / 18" -->
    <div class="tt-label"></div>    <!-- "Tìm kiếm địa điểm theo tên" -->
    <div class="tt-hint" data-i18n="tour_overlay.hint">
      Click bất kỳ đâu để tiếp tục →
    </div>
    <button id="tour-skip"
            data-i18n-title="tour_overlay.skip"
            title="Bỏ qua">×</button>
  </div>
</div>
```

Một overlay duy nhất gắn vào `<body>` — không tạo từng spotlight riêng cho từng bước.

---

## 4. Cấu trúc data — HELP_ITEMS

Mỗi step là 1 object:

```js
{
  target:    '#search-bar' | () => Element,    // CSS selector HOẶC function trả về element
  round:     true | false,                      // spotlight bo tròn (50%) thay vì radius 14px
  svg:       '<svg>…</svg>',                    // (không dùng để hiển thị; chỉ là metadata di sản)
  txt:       '?' | '3D' | '2D',                 // (cũng metadata di sản)
  labelKey:  'tour.items2d.search'              // i18n key cho text trong tooltip
             | () => 'tour.items2d.panelOpen',  // function nếu cần resolve động
  label:     'Raw text…'                        // (chỉ dùng khi không có labelKey)
}
```

> **Lưu ý:** `svg` / `txt` đang **không được render** trong tooltip ở phiên bản hiện tại (chỉ giữ lại như metadata cho khả năng mở rộng — VD show icon cạnh label). Bạn có thể bỏ chúng khi port nếu muốn gọn.

### 4.1 Danh sách 2D (HELP_ITEMS_2D)

Thứ tự đi từ trên xuống / trái sang phải:
1. `#search-bar` — `tour.items2d.search` ("Tìm kiếm địa điểm theo tên")
2. `#xa-dd` — `tour.items2d.xa` ("Lọc theo Xã/Phường")
3. `#help-btn` (round, txt `?`) — `tour.items2d.help`
4. `#lang-btn` — `tour.items2d.lang`
5. `#fs-btn` (round) — `tour.items2d.fs`
6. `#zoom-in-btn` (round)
7. `#zoom-out-btn` (round)
8. `#hide-ui-btn` (round)
9. `#layers-btn` (round)
10. `#three-d-btn` (round, txt `3D`)
11. `#map` — `tour.items2d.dblclick` (mẹo double-click toàn màn hình)
12. `#mobile-more-btn` (round, chỉ mobile)
13. `#mobile-panel-btn` (round, chỉ mobile)
14. `#right-panel` — labelKey **function** trả về `panelClosed` / `panelOpen` tùy state hiện tại của panel
15. `#bb-vr-nav` — VR 360
16. `#bottom-bar .bbt[data-view="map"]` — Trang chủ
17. `#bottom-bar .bbt[data-view="guide"]` — Cẩm nang
18. `#bb-chat-btn` (round) — Bot AI

### 4.2 Danh sách 3D (HELP_ITEMS_3D)
~20 bước tương tự nhưng cho VR mode: `#vr-pannellum` (panorama + dblclick mẹo), `#autorot-btn`, `#vr-info`, `#minimap`, `#three-d-btn` (txt `2D`), bottom-bar tabs, `#bb-chat-btn`,…

Cả 2 danh sách dùng chung structure → cùng `showTourStep()` xử lý.

---

## 5. State & API

```js
let tourIdx    = -1;                 // chỉ số bước hiện tại
let tourActive = false;
let tourItems  = HELP_ITEMS_2D;      // mảng đang chạy (2D hoặc 3D)

function startTour(items = HELP_ITEMS_2D, fromIndex = 0) { … }
function endTour() { … }
function showTourStep() { … }        // render spot + tip cho tourItems[tourIdx]
```

Kết nối lên UI:
```js
$('help-btn').addEventListener('click', e => {
  e.stopPropagation();
  startTour(vrMode ? HELP_ITEMS_3D : HELP_ITEMS_2D);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && tourActive) endTour();
});

$('tour-overlay').addEventListener('click', e => {
  if (e.target.closest('#tour-skip')) return;       // nhường cho handler riêng
  // Click vào tip OR vào nền → next step
  tourIdx++; showTourStep();
});
$('tour-skip').addEventListener('click', e => {
  e.stopPropagation();
  endTour();
});

window.addEventListener('resize', () => {
  if (tourActive) showTourStep();
});
```

---

## 6. Thuật toán `showTourStep()`

```
1. Nếu tourIdx >= tourItems.length → endTour(); return.

2. Resolve target:
   - typeof target === 'function' → target()
   - typeof target === 'string'   → document.querySelector(target)
   - null → tourIdx++; recurse.

3. rect = target.getBoundingClientRect()
   Nếu width=0 hoặc height=0 (element ẩn) → tourIdx++; recurse.

4. Tính ô spotlight (có pad 6px):
     sx = rect.left - 6, sy = rect.top - 6
     sw = rect.width + 12, sh = rect.height + 12
   Đặt #tour-spot vị trí + kích thước này.
   Toggle class .round theo item.round.

5. Resolve label:
   - item.labelKey (string hoặc function) → I18n.t(...)
   - hoặc item.label (string hoặc function)
   - tt-step = I18n.t('tour.step', { i: tourIdx+1, n: tourItems.length })

6. Chọn cạnh đặt tooltip theo không gian còn trống của viewport:
     space.bottom = vh - (sy+sh)
     space.top    = sy
     space.right  = vw - (sx+sw)
     space.left   = sx
   Ưu tiên: bottom > top > right > left.
   Logic:
     side = 'bottom'
     if (bottom < tipH+gap && top >= tipH+gap) side = 'top'
     else if (bottom < tipH+gap && right >= tipW+gap) side = 'right'
     else if (bottom < tipH+gap && left >= tipW+gap) side = 'left'

7. Tính (tx, ty) cho tip theo side; clamp trong viewport (margin 10px).

8. Áp class mũi tên (`.arrow-up | arrow-down | arrow-left | arrow-right`)
   tương ứng với cạnh — mũi tên nằm ở MẶT của tip hướng VỀ spot.

9. Set CSS variable --arrow-x hoặc --arrow-y để dịch mũi tên đến đúng vị
   trí tương ứng tâm spot, clamp trong khoảng [14, tipW-28] hoặc [14, tipH-28].

10. Set tip.style.left/top = tx/ty.
```

Mọi giá trị left/top/width/height đều transition CSS (.35s cubic-bezier) → step chuyển bước mượt mà.

---

## 7. CSS chi tiết

### 7.1 Overlay (full-screen)
```css
#tour-overlay {
  position: fixed; inset: 0;
  z-index: 4500;
  opacity: 0; pointer-events: none;
  transition: opacity .25s ease;
  cursor: pointer;        /* gợi ý: click bất kỳ đâu */
}
#tour-overlay.open { opacity: 1; pointer-events: auto; }
```

### 7.2 Spotlight (đục lỗ qua nền tối)
```css
#tour-spot {
  position: absolute;
  left: 0; top: 0; width: 0; height: 0;
  border-radius: 14px;
  box-shadow:
    0 0 0 9999px rgba(0,0,0,.72),     /* nền tối lan ra tận viewport */
    0 0 0 3px var(--icon-blue),        /* viền xanh quanh spotlight */
    0 0 24px rgba(43,182,230,.6);      /* glow */
  transition:
    left .35s cubic-bezier(.4,0,.2,1),
    top  .35s cubic-bezier(.4,0,.2,1),
    width .35s cubic-bezier(.4,0,.2,1),
    height .35s cubic-bezier(.4,0,.2,1),
    border-radius .25s ease;
  pointer-events: none;
}
#tour-spot.round { border-radius: 50%; }
```
**Kỹ thuật cốt lõi**: `box-shadow: 0 0 0 9999px rgba(0,0,0,.72)` cho phần tử nhỏ — phần "lỗ" chính là kích thước thực của `#tour-spot`, còn bóng đổ phình ra tận biên viewport, tạo overlay tối có khoét cửa sổ sáng. Không cần SVG mask, không cần canvas.

### 7.3 Tooltip + mũi tên CSS
```css
#tour-tip {
  position: absolute;
  background: #fff;
  border-radius: 12px;
  padding: 14px 18px 12px;
  width: 280px;
  box-shadow: 0 10px 32px rgba(0,0,0,.35);
  pointer-events: auto;
  transition:
    left .35s cubic-bezier(.4,0,.2,1),
    top  .35s cubic-bezier(.4,0,.2,1);
}

.tt-step  { font-size:11px;  font-weight:700; letter-spacing:.08em;
            color: var(--icon-blue); text-transform: uppercase;
            margin-bottom: 4px; }
.tt-label { font-size:14px;  font-weight:700; color:#1a1a1a;
            line-height:1.4; margin-bottom: 8px; }
.tt-hint  { font-size:11.5px; color:#888; font-style: italic; }

#tour-skip {
  position:absolute; top:6px; right:6px;
  width:24px; height:24px; border-radius:50%;
  background:#f1f3f5; border:none; color:#666;
  cursor:pointer; font-size:16px; line-height:1;
  display:flex; align-items:center; justify-content:center;
  transition: background .14s, color .14s;
}
#tour-skip:hover { background:#e74c3c; color:#fff; }

/* Mũi tên: 1 div vuông 14×14 xoay 45° giả làm tam giác */
.tt-arrow {
  position:absolute;
  width:14px; height:14px;
  background:#fff;
  transform: rotate(45deg);
}
#tour-tip.arrow-up    .tt-arrow { top:-6px;    left: var(--arrow-x, 24px); box-shadow:-2px -2px 4px rgba(0,0,0,.04); }
#tour-tip.arrow-down  .tt-arrow { bottom:-6px; left: var(--arrow-x, 24px); box-shadow: 2px  2px 4px rgba(0,0,0,.04); }
#tour-tip.arrow-left  .tt-arrow { left:-6px;   top:  var(--arrow-y, 20px); box-shadow:-2px  2px 4px rgba(0,0,0,.04); }
#tour-tip.arrow-right .tt-arrow { right:-6px;  top:  var(--arrow-y, 20px); box-shadow: 2px -2px 4px rgba(0,0,0,.04); }

/* An toàn: khi overlay đóng nhưng còn trong DOM, ép inert */
#tour-overlay:not(.open) #tour-tip,
#tour-overlay:not(.open) #tour-spot {
  pointer-events: none !important;
  visibility: hidden;
}
```
- Mũi tên dùng kỹ thuật **vuông xoay 45°** chứ không SVG → đơn giản, mượt, dùng `box-shadow` chéo để giả viền/độ sâu.
- `--arrow-x` / `--arrow-y` được JS gán → mũi tên trượt theo tâm spotlight (clamp tránh tràn cạnh tip).

### 7.4 Nút trigger `#help-btn`
```css
.ticon {
  width: var(--pill-h, 36px); height: var(--pill-h, 36px);
  border-radius: 50%;
  border: none; background: var(--icon-blue); color: #fff;
  cursor: pointer; flex-shrink: 0;
  display:flex; align-items:center; justify-content:center;
  box-shadow: var(--pill-shadow);
  font-family: inherit; font-size: 14px; font-weight: 700;
  transition:
    background .14s, transform .32s cubic-bezier(.4,0,.2,1),
    width .32s, margin .32s, padding .32s, opacity .22s;
  position: relative; overflow: hidden;
}
.ticon:hover { background: var(--icon-blue-dark); transform: translateY(-1px); }
.ticon.active { background: var(--icon-blue); }

#help-btn {
  background: #fff;
  color: var(--icon-blue);
  font-size: 16px;
}
#help-btn:hover { background: #e8f7fd; color: var(--icon-blue-dark); }
```

---

## 8. Biến CSS cần có

```css
:root {
  --pill-h: 36px;                                  /* size button .ticon */
  --pill-shadow: 0 2px 8px rgba(0,0,0,.18);
  --icon-blue: #2bb6e6;                            /* màu spotlight ring + tooltip step */
  --icon-blue-dark: #1a9bcb;
}
```

---

## 9. i18n keys cần dịch

```jsonc
"top": {
  "help": "Hướng dẫn sử dụng"                       // tooltip nút ?
},

"tour_overlay": {
  "hint": "Click bất kỳ đâu để tiếp tục →",
  "skip": "Bỏ qua"
},

"tour": {
  "step": "Bước {i} / {n}",                         // có placeholder

  "items2d": {                                       // label cho từng step ở chế độ 2D
    "search": "Tìm kiếm địa điểm theo tên",
    "xa": "Lọc danh sách theo Xã/Phường",
    "help": "Mở lại hướng dẫn sử dụng",
    "lang": "Đổi ngôn ngữ (VI / EN)",
    "fs": "Bật/tắt toàn màn hình",
    "zoomIn": "Phóng to bản đồ",
    "zoomOut": "Thu nhỏ bản đồ",
    "hideUI": "Ẩn toàn bộ giao diện…",
    "layers": "Đổi bản đồ nền…",
    "threeD": "Chuyển sang chế độ VR 360°",
    "dblclick": "Mẹo: double-click vào bản đồ…",
    "mobMore": "Thực đơn (chỉ mobile)…",
    "mobPanel": "Danh sách địa điểm (chỉ mobile)…",
    "panelClosed": "Mở bảng danh sách địa điểm bên phải",
    "panelOpen": "Danh sách địa điểm – tìm kiếm, lọc…",
    "vrNav": "VR 360 – vào trải nghiệm panorama…",
    "home": "Trang chủ – quay về bản đồ",
    "guide": "Cẩm nang Du lịch…",
    "ai": "Trợ lý AI Du lịch…"
  },

  "items3d": { /* tương tự, key riêng cho VR mode */ }
}
```

---

## 10. Hướng dẫn port nhanh sang dự án mới

1. **Copy HTML overlay** [index.html:163-173](../index.html#L163-L173) vào `<body>`.
2. **Copy CSS** block trong mục 7 (hoặc trích từ [css/style.css:1363-1446](../css/style.css#L1363-L1446)) + style `.ticon` + `#help-btn` cho nút trigger.
3. **Copy JS**: lấy 3 hàm `startTour / endTour / showTourStep` + 2 mảng `HELP_ITEMS_*` + 4 event listeners ở [ui.js:773-790](../js/ui.js#L773-L790).
4. **Sửa lại `HELP_ITEMS_*`** cho khớp UI dự án mới (đổi selector + labelKey).
5. **Thêm nút trigger** `<button class="ticon" id="help-btn">?</button>` ở góc UI và đăng ký:
   ```js
   document.getElementById('help-btn').addEventListener('click', e => {
     e.stopPropagation();
     startTour(HELP_ITEMS);
   });
   ```
6. **i18n**: hoặc bê namespace `tour.*` + `tour_overlay.*` + cung cấp `window.I18n.t()`; hoặc thay bằng `label` raw string thẳng trong HELP_ITEMS và bỏ `I18n.t()` trong `showTourStep`.
7. **Bỏ phần mobile menu** (`document.body.classList.add('mobile-menu-open')` + setTimeout 350) nếu dự án không cần.
8. **Tùy biến brand**: đổi `--icon-blue` để đổi màu ring spotlight + step label.

### Minimal port (không i18n, không mobile, không 3D mode):
```html
<button id="help-btn">?</button>

<div id="tour-overlay">
  <div id="tour-spot"></div>
  <div id="tour-tip">
    <div class="tt-arrow"></div>
    <div class="tt-step"></div>
    <div class="tt-label"></div>
    <div class="tt-hint">Click bất kỳ đâu để tiếp tục →</div>
    <button id="tour-skip">×</button>
  </div>
</div>

<script>
const HELP_ITEMS = [
  { target: '#btn-search', label: 'Tìm kiếm…' },
  { target: '#btn-filter', round: true, label: 'Bộ lọc nhanh' },
  { target: () => document.querySelector('.card.active') || document.querySelector('.card'),
    label: 'Card sản phẩm — click để xem chi tiết' },
];
// … (paste 3 hàm startTour/endTour/showTourStep, thay window.I18n.t(...) bằng label/step text trực tiếp)
</script>
```

---

## 11. Checklist kiểm tra sau khi port

- [ ] Click `?` → màn hình mờ đen, ring xanh sáng quanh nút đầu tiên.
- [ ] Tooltip xuất hiện với "Bước 1 / N" + nhãn + dòng hint xám in nghiêng.
- [ ] Click bất kỳ vùng tối → next step, ring trượt mượt 350ms sang element tiếp.
- [ ] Mũi tên tooltip luôn chỉ về spotlight, đúng cạnh (trên / dưới / trái / phải).
- [ ] Element ẩn (responsive bị `display:none`) → tour tự skip, không kẹt.
- [ ] Resize trình duyệt khi tour đang chạy → spotlight + tip tự re-position.
- [ ] Nhấn `Esc` → tour đóng ngay.
- [ ] Click nút `×` → tour đóng, không trigger nhầm "next step".
- [ ] Đến bước cuối → click 1 lần nữa → tour kết thúc, overlay fade out.
- [ ] Đổi ngôn ngữ giữa tour (nếu có i18n) → label step hiện tại đổi liền (tour resolve `I18n.t()` mỗi lần show).
- [ ] Mobile: cột nút phải tự bung ra, các nút mobile-only được spotlight đúng.

---

## 12. Hạn chế đã biết

- Không support **2 tour song song** (state global). Nếu cần nhiều flow → wrap thành class/factory để mỗi tour có state riêng.
- Không có **animation in-out** ở từng bubble — chỉ overlay fade và spot transition. Có thể thêm `@keyframes` cho tip nếu muốn pop.
- Click vào nội dung TRONG tooltip cũng next step (do listener bắt cả). Nếu muốn tooltip có link/btn riêng → kiểm tra `e.target.closest('a, button')` trước khi tăng `tourIdx`.
- **Không có nút Back / Prev** — luồng tuyến tính một chiều. Thêm dễ: nút `‹` + `tourIdx = Math.max(0, tourIdx - 1); showTourStep();`.
- Element có **position: fixed bên trong iframe** không spotlight chính xác (do `getBoundingClientRect` không cross-frame).
- Spot dùng box-shadow `9999px` — đủ cho mọi viewport thực tế, nhưng nếu màn hình > 20000px (multi-monitor span) thì viền tối có thể không phủ hết.
- Không lưu cờ "đã xem tour rồi" — nếu muốn auto-show ở first visit thì wrap bằng `localStorage.getItem('tour-seen')`.

---

*File này tự đủ. Mang nó cùng overlay HTML, 3 hàm tour và block CSS spotlight sang dự án mới — help tour chạy được trong < 15 phút.*
