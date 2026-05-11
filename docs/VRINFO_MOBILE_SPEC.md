# VR-Info Mobile Collapse/Expand — Tài liệu kỹ thuật & UI/UX (port-ready spec)

> Mục đích: tài liệu mô tả **đầy đủ** hiệu ứng **đóng / mở (collapse ↔ expand)** của thẻ `#vr-info` ở **mobile** trong dự án `vr360`. Đặc trưng: pill tròn (width = height) phình ra thành panel chữ nhật bo tròn — width/height/padding chạy **lệch pha staggered** để không bị méo trung gian, các nội dung con fade-in chậm / fade-out nhanh. Phù hợp port sang dự án khác làm thẻ thông tin / floating card kiểu Material FAB → sheet.
>
> **Lưu ý quan trọng:** spec này đã **bỏ phần "di chuyển theo trạng thái dropdown của ô search"** (tức là rule `body:has(#search-results.open) #vr-info { top: ... }` và biến `--search-dd-bottom`). Khi port, vị trí top của panel là cố định theo `--vr-info-top`.

- **HTML:** [index.html:301-322](../index.html#L301-L322)
- **JS toggle:** [js/ui.js:886-895](../js/ui.js#L886-L895)
- **CSS desktop base:** [css/style.css:1015-1139](../css/style.css#L1015-L1139)
- **CSS mobile portrait (chính):** [css/style.css:1818-1893](../css/style.css#L1818-L1893)
- **CSS mobile landscape:** [css/style.css:1945-1995](../css/style.css#L1945-L1995)
- **i18n keys:** [`vr_info.*`](../data/i18n/vi.json#L260-L265)

---

## 1. Tổng quan hiệu ứng

| Đặc điểm | Mô tả |
|---|---|
| Trigger mở rộng | Bấm vào **FAB tròn** `#vr-info-fab` (chữ "i") khi panel đang collapsed |
| Trigger thu gọn | Bấm chevron `#vr-info-x` trong header panel khi đang expanded |
| State | Class `.collapsed` trên `#vr-info` quyết định hình dạng |
| Hình dạng collapsed | **Pill tròn 100%** = `var(--pill-h)` × `var(--pill-h)` (36–40px), không có nội dung hiển thị, `pointer-events: none` |
| Hình dạng expanded | Rectangle bo `calc(--pill-h / 2)` đều 4 góc, `width: calc(100vw - 24px)`, `height: 200px` (portrait) / `170px` (landscape), hiển thị toàn bộ nội dung |
| Animation pha 1 (mở) | `width` + `padding` chạy ngay (0s) trong 0.4s |
| Animation pha 2 (mở) | `height` chạy **chậm hơn 0.42s** sau pha 1 → tạo cảm giác "kéo ngang trước, kéo dọc sau" |
| Animation pha 1 (đóng) | `height` co ngay (0s) trong 0.4s |
| Animation pha 2 (đóng) | `width` + `padding` co **chậm hơn 0.42s** → ngược lại pha mở |
| Border-radius | **KHÔNG transition** — luôn `calc(--pill-h / 2)`. Khi width = height = pill-h → tự thành tròn 100%; khi expanded → bo đều |
| Children | Fade-in **chậm** (delay 0.45s, sau khi panel nở xong); fade-out **nhanh** (0.15s, trước khi panel thu) |
| Chevron | `transform: rotate(-180deg)` khi expanded (trỏ lên); `rotate(0)` khi collapsed (trỏ xuống) |
| FAB hiển thị | `opacity: 0` lúc expanded; `opacity: 1` với delay 0.85s khi collapsed (chờ panel co xong) |
| Easing | `cubic-bezier(.4,0,.2,1)` (Material standard) cho mọi transition kích thước |

**Kết quả cảm quan:** pill tròn nhỏ → bung rộng sang phải (ngang đầy hàng) → bung xuống cao thành panel; chiều ngược lại: panel xẹp lên thành pill mỏng → co lại tròn ở chỗ ban đầu. Không có bước "méo hình chữ nhật xấu" giữa chừng.

---

## 2. Cấu trúc DOM

```html
<!-- Panel chính, tự xử lý cả collapsed lẫn expanded chỉ bằng class -->
<div id="vr-info">
  <div id="vr-info-hd">
    <div class="vr-info-tag">
      <svg>… icon info …</svg>
      <span data-i18n="vr_info.label">THÔNG TIN ĐIỂM ĐẾN:</span>
    </div>
    <button id="vr-info-x" title="Thu gọn / mở rộng">
      <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 12 15 18 9"/>   <!-- chevron-down -->
      </svg>
    </button>
  </div>
  <div id="vr-place-name">Tên điểm đến</div>
  <div id="vr-place-desc">Mô tả ngắn…</div>
  <div id="vr-place-meta">
    <div class="vr-meta-row">…giờ mở cửa…</div>
    <div class="vr-meta-row">…đánh giá…</div>
    <div class="vr-meta-row">…giá vé…</div>
  </div>
</div>

<!-- FAB hiển thị KHI panel.collapsed (mobile-only) -->
<button id="vr-info-fab" title="Mở thông tin">i</button>
```

`#vr-info` và `#vr-info-fab` là **anh em ruột** (siblings) — cùng cấp trong DOM. CSS dùng selector `#vr-info.collapsed ~ #vr-info-fab` (general sibling combinator) để FAB chỉ hiện khi anh nó có class `.collapsed`. Không cần JS để toggle FAB.

---

## 3. JavaScript (chỉ 2 listener — cực gọn)

```js
/* Bấm chevron trong header → đóng panel */
document.getElementById('vr-info-x').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('vr-info').classList.toggle('collapsed');
});

/* Bấm FAB tròn → mở panel trở lại */
const fab = document.getElementById('vr-info-fab');
if (fab) fab.addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('vr-info').classList.remove('collapsed');
});
```

Tất cả phần còn lại — animation, layout, hiện/ẩn nội dung, đổi chiều chevron, hiện FAB — **đều do CSS xử lý** dựa trên duy nhất class `.collapsed`.

---

## 4. CSS chi tiết (mobile portrait)

> Đây là phần **trọng tâm**. Toàn bộ trong media query `@media (max-width: 768px)`.

### 4.1 Biến CSS
```css
:root {
  --pill-h: 36px;                                    /* size pill collapsed + FAB */
  --vr-info-top: calc(12px + var(--pill-h) + 8px
                  + var(--pill-h) + 8px);            /* dưới 2 hàng pill phía trên */
}
```

> *Lưu ý:* công thức `--vr-info-top` ở dự án gốc tính tới các nút topbar ở trên. Khi port qua dự án mới, **thay bằng giá trị top phù hợp**, ví dụ `--vr-info-top: 80px;`. **KHÔNG cần** biến `--search-dd-bottom` hay rule `body:has(...)` — đã loại bỏ theo yêu cầu.

### 4.2 Panel EXPANDED (state mặc định, không có class `.collapsed`)
```css
#vr-info {
  position: absolute;                  /* hoặc fixed tùy layout dự án */
  top: var(--vr-info-top);
  bottom: auto;
  left: 12px;
  right: auto;
  width: calc(100vw - 24px);           /* full-width trừ 2 mép 12px */
  max-width: none;
  padding: 12px 14px;
  border-radius: calc(var(--pill-h) / 2);
  height: 200px;
  overflow: hidden;
  background: rgba(255, 255, 255, .94);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  border: 1px solid rgba(255,255,255,.6);
  box-shadow: 0 8px 28px rgba(0,0,0,.18);

  /* === ANIMATION KHI MỞ (từ collapsed → expanded) ===
     width + padding: chạy NGAY (delay 0s)
     height:           chạy SAU 0.42s
     → tạo cảm giác: "kéo ngang trước, kéo dọc sau" */
  transition:
    width   .4s cubic-bezier(.4,0,.2,1)   0s,
    padding .4s cubic-bezier(.4,0,.2,1)   0s,
    height  .4s cubic-bezier(.4,0,.2,1) .42s,
    background-color .3s ease;
}
```

### 4.3 Panel COLLAPSED (pill tròn)
```css
#vr-info.collapsed {
  width: var(--pill-h);
  height: var(--pill-h);
  padding: 0;
  background: rgba(255,255,255,.94);
  pointer-events: none;                  /* để FAB nhận click bên trên/cùng vị trí */

  /* === ANIMATION KHI ĐÓNG (từ expanded → collapsed) ===
     height:            chạy NGAY (delay 0s)  → panel xẹp lên trước
     width + padding:   chạy SAU 0.42s       → rồi mới co bề ngang về pill */
  transition:
    height  .4s cubic-bezier(.4,0,.2,1)   0s,
    width   .4s cubic-bezier(.4,0,.2,1) .42s,
    padding .4s cubic-bezier(.4,0,.2,1) .42s,
    background-color .3s ease;
}
```

> **Bí mật ở đây**: cùng 3 thuộc tính (`width`, `height`, `padding`) nhưng **delay khác nhau** giữa state mở (`#vr-info`) và state đóng (`#vr-info.collapsed`). CSS transition luôn áp dụng theo state hiện tại, nên:
> - Mở: dùng transition của `#vr-info` (width nhanh, height chậm) ⇒ ngang trước, dọc sau.
> - Đóng: dùng transition của `.collapsed` (height nhanh, width chậm) ⇒ dọc trước, ngang sau.
>
> Hiệu ứng đối xứng "phình ra theo trục X rồi Y → thu lại theo trục Y rồi X" tạo cảm giác như pill **nở ra một góc rồi căng đầy**, ngược lại khi đóng. Đây là kỹ thuật **staggered transition** mà không cần JS hoặc @keyframes.

### 4.4 Nội dung con — fade chậm vào, fade nhanh ra
```css
/* Mặc định (expanded): hiện, fade-in CHẬM với delay 0.45s
   → chờ panel nở xong rồi text mới xuất hiện, tránh chữ bị bóp méo */
#vr-info-hd,
#vr-place-name,
#vr-place-desc,
#vr-place-meta {
  transition: opacity .3s ease .45s;
}

/* Khi collapsed: ẩn ngay, fade-out NHANH (0.15s, không delay)
   → chữ biến mất trước khi panel bắt đầu co */
#vr-info.collapsed #vr-info-hd,
#vr-info.collapsed #vr-place-name,
#vr-info.collapsed #vr-place-desc,
#vr-info.collapsed #vr-place-meta {
  opacity: 0;
  pointer-events: none;
  transition: opacity .15s ease;
}
```

Cùng kỹ thuật **bất đối xứng delay**: delay 0.45s lúc enter, 0s lúc exit.

### 4.5 Chevron xoay
```css
/* Expanded: chevron trỏ lên (panel mở xuống → bấm "lên" để thu) */
#vr-info #vr-info-x svg {
  transition: transform .35s cubic-bezier(.4,0,.2,1);
  transform: rotate(-180deg);
}
/* Collapsed: chevron trỏ xuống (nhưng lúc này panel đã tròn → chevron ẩn cùng header) */
#vr-info.collapsed #vr-info-x svg {
  transform: rotate(0deg);
}
```

### 4.6 Nút chevron `#vr-info-x` & tag
```css
#vr-info-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.vr-info-tag {
  display: flex; align-items: center; gap: 5px;
  font-size: 9px;                         /* mobile portrait */
  font-weight: 700; letter-spacing: .08em;
  color: var(--icon-blue);
  text-transform: uppercase;
}
.vr-info-tag svg { flex-shrink: 0; }
#vr-info-x {
  background: rgba(43,182,230,.12);
  border: none; color: var(--icon-blue);
  width: 24px; height: 24px; border-radius: 50%;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background .14s;
}
#vr-info-x:hover { background: var(--icon-blue); color: #fff; }
```

### 4.7 Typography nội dung
```css
#vr-place-name {
  font-size: 18px; font-weight: 800;
  color: var(--icon-blue-dark, #1a9bcb);
  line-height: 1.22;
  margin-bottom: 4px;
}
#vr-place-desc {
  font-size: 13px; color: #4a6470;
  line-height: 1.55;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2; line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
#vr-place-meta { display: flex; flex-direction: column; gap: 5px; }
.vr-meta-row {
  display: flex; align-items: center; gap: 7px;
  font-size: 11.5px; color: #2d5260; font-weight: 500;
}

/* @media (max-width: 480px) — phone nhỏ */
@media (max-width: 480px) {
  #vr-info { padding: 10px 12px; }
  #vr-place-name { font-size: 16px; }
  #vr-place-desc { font-size: 12.5px; }
}
```

### 4.8 FAB `#vr-info-fab`
```css
/* Base (desktop) — ẩn */
#vr-info-fab {
  display: none;
  position: absolute;
  left: 12px; bottom: 12px;
  width: 48px; height: 48px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,.94);
  color: var(--icon-blue-dark);
  font-family: 'Be Vietnam Pro', serif;
  font-style: italic;
  font-weight: 800;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  z-index: 5;
  opacity: 0;
  pointer-events: none;
  transition: opacity .3s ease;
  align-items: center; justify-content: center;
}

/* Khi anh em #vr-info có .collapsed → hiện FAB với DELAY 0.85s
   (chờ panel co hoàn toàn rồi mới fade in để tránh chồng visual) */
#vr-info.collapsed ~ #vr-info-fab {
  opacity: 1;
  pointer-events: auto;
  transition: opacity .3s ease .85s;
}

/* Mobile portrait: hiển thị FAB, đặt CÙNG TỌA ĐỘ với pill collapsed
   để cảm giác như pill "biến thành" FAB tại chỗ */
@media (max-width: 768px) {
  #vr-info-fab {
    display: flex;
    top: var(--vr-info-top);
    bottom: auto;
    left: 12px;
    width: var(--pill-h);
    height: var(--pill-h);
    transition: opacity .3s ease .45s;       /* fade-in chậm hơn nội dung */
  }
}
```

> **Quan trọng:** FAB nằm đúng vị trí với pill khi `#vr-info.collapsed` (cùng `top`, `left`, cùng size `--pill-h`). Pill collapsed bị set `pointer-events: none`, nên click "trên pill" thực ra click vào FAB phía sau/trên. Cảm giác: pill là vỏ visual, FAB là interaction layer.

---

## 5. CSS mobile landscape (orientation ngang, max-height: 500px)

Gần giống portrait nhưng dimensions nhỏ hơn:

```css
@media (max-height: 500px) and (orientation: landscape) {
  :root { --pill-h: 38px; }

  #vr-info {
    top: calc(12px + var(--pill-h) + 8px + var(--pill-h) + 8px);
    left: 12px;
    width: 240px;                  /* không full-width, chỉ ~38vw */
    max-width: 38vw;
    padding: 9px 12px;
    border-radius: calc(var(--pill-h) / 2);
    overflow: hidden;
    height: 170px;                 /* thấp hơn portrait */
    transition:
      width   .4s cubic-bezier(.4,0,.2,1)   0s,
      padding .4s cubic-bezier(.4,0,.2,1)   0s,
      height  .4s cubic-bezier(.4,0,.2,1) .42s,
      background-color .3s ease;
  }
  #vr-info.collapsed {
    width: var(--pill-h); height: var(--pill-h);
    padding: 0;
    pointer-events: none;
    transition:
      height  .4s cubic-bezier(.4,0,.2,1)   0s,
      width   .4s cubic-bezier(.4,0,.2,1) .42s,
      padding .4s cubic-bezier(.4,0,.2,1) .42s,
      background-color .3s ease;
  }
  /* Children fade — delay tăng lên 0.85s do panel co lâu hơn */
  #vr-info-hd, #vr-place-name, #vr-place-desc, #vr-place-meta {
    transition: opacity .3s ease .85s;
  }
  #vr-info.collapsed #vr-info-hd,
  #vr-info.collapsed #vr-place-name,
  #vr-info.collapsed #vr-place-desc,
  #vr-info.collapsed #vr-place-meta {
    opacity: 0; pointer-events: none;
    transition: opacity .15s ease;
  }
  #vr-info-fab {
    display: flex; align-items: center; justify-content: center;
    top: calc(12px + var(--pill-h) + 8px + var(--pill-h) + 8px);
    left: 12px;
    width: var(--pill-h); height: var(--pill-h);
  }
}
```

---

## 6. Sơ đồ thời gian (timeline) — pha rõ ràng

### 6.1 Mở (collapsed → expanded)
```
t = 0s     : user bấm FAB → JS remove class .collapsed
0 → 0.4s   : width   (--pill-h → 100vw-24px)   chạy
0 → 0.4s   : padding (0 → 12 14)               chạy
0 → 0.15s  : background-color giữ nguyên
0.42 → 0.82s: height (--pill-h → 200px)        chạy
0.45 → 0.75s: opacity nội dung con (0 → 1)     chạy
0.85s      : end. Panel đầy đủ.
```

### 6.2 Đóng (expanded → collapsed)
```
t = 0s     : user bấm chevron → JS add class .collapsed
0 → 0.15s  : opacity nội dung (1 → 0)          chạy NHANH
0 → 0.4s   : height (200 → --pill-h)           chạy
0.42 → 0.82s: width   (100vw-24 → --pill-h)    chạy
0.42 → 0.82s: padding (12 14 → 0)              chạy
0.85 → 1.15s: opacity FAB (0 → 1, delay 0.85s) chạy
1.15s      : end. Pill tròn + FAB hiển thị.
```

---

## 7. Biến CSS cần có khi port

```css
:root {
  --pill-h: 36px;                          /* size pill collapsed + FAB */
  --vr-info-top: 80px;                     /* chỉnh theo layout dự án mới */
  --icon-blue: #2bb6e6;
  --icon-blue-dark: #1a9bcb;
}
```

---

## 8. i18n keys

```jsonc
"vr_info": {
  "label":  "THÔNG TIN ĐIỂM ĐẾN:",
  "toggle": "Thu gọn / mở rộng",      // tooltip nút chevron
  "open":   "Mở thông tin",            // tooltip FAB
  "reveal": "Hiện giao diện"          // (cho vr-reveal-btn — không thuộc spec này)
}
```

---

## 9. Hướng dẫn port nhanh sang dự án mới

1. **Copy HTML**: 2 element anh em — `#vr-info` (panel) + `#vr-info-fab` (button).
2. **Copy CSS**: 3 block:
   - Base desktop (`#vr-info-fab` display:none + `#vr-info.collapsed ~ #vr-info-fab` để hiện FAB)
   - Mobile portrait `@media (max-width: 768px)` — phần trọng tâm ở mục 4
   - (Tùy chọn) Mobile landscape ở mục 5
3. **Copy JS** (chỉ 2 listener ở mục 3) — không cần thư viện.
4. **Thay biến**: `--pill-h`, `--vr-info-top`, `--icon-blue`, `--icon-blue-dark` cho khớp brand.
5. **Đổi nội dung** trong `#vr-info` (tên trường, icon, layout) tùy use case. Cấu trúc transition không phụ thuộc nội dung — chỉ phụ thuộc class `.collapsed`.
6. **i18n**: thêm `vr_info.toggle`, `vr_info.open` vào i18n hoặc hard-code title.

### Minimal port (vanilla, không i18n, không brand)
```html
<style>
  :root {
    --pill-h: 40px;
    --info-top: 80px;
    --info-blue: #2bb6e6;
  }
  #info {
    position: fixed;
    top: var(--info-top); left: 12px;
    width: calc(100vw - 24px);
    height: 200px;
    padding: 12px 14px;
    background: rgba(255,255,255,.94);
    backdrop-filter: blur(22px);
    border-radius: calc(var(--pill-h) / 2);
    box-shadow: 0 8px 28px rgba(0,0,0,.18);
    overflow: hidden;
    transition:
      width   .4s cubic-bezier(.4,0,.2,1)   0s,
      padding .4s cubic-bezier(.4,0,.2,1)   0s,
      height  .4s cubic-bezier(.4,0,.2,1) .42s;
  }
  #info.collapsed {
    width: var(--pill-h); height: var(--pill-h);
    padding: 0; pointer-events: none;
    transition:
      height  .4s cubic-bezier(.4,0,.2,1)   0s,
      width   .4s cubic-bezier(.4,0,.2,1) .42s,
      padding .4s cubic-bezier(.4,0,.2,1) .42s;
  }
  #info > * { transition: opacity .3s ease .45s; }
  #info.collapsed > * { opacity: 0; pointer-events: none; transition: opacity .15s ease; }

  #info-fab {
    position: fixed;
    top: var(--info-top); left: 12px;
    width: var(--pill-h); height: var(--pill-h);
    border-radius: 50%; border: none;
    background: rgba(255,255,255,.94);
    color: var(--info-blue);
    font-style: italic; font-weight: 800; font-size: 22px;
    cursor: pointer;
    opacity: 0; pointer-events: none;
    transition: opacity .3s ease;
  }
  #info.collapsed ~ #info-fab {
    opacity: 1; pointer-events: auto;
    transition: opacity .3s ease .85s;
  }
</style>

<div id="info">
  <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--info-blue)">THÔNG TIN</span>
    <button id="info-x" style="width:24px;height:24px;border-radius:50%;border:none;background:rgba(43,182,230,.12);color:var(--info-blue);cursor:pointer">×</button>
  </header>
  <h3 style="margin:0 0 4px;font-size:18px">Tên mục</h3>
  <p style="margin:0;font-size:13px;color:#4a6470">Mô tả ngắn của mục…</p>
</div>
<button id="info-fab">i</button>

<script>
  document.getElementById('info-x').onclick = () =>
    document.getElementById('info').classList.add('collapsed');
  document.getElementById('info-fab').onclick = () =>
    document.getElementById('info').classList.remove('collapsed');
</script>
```

---

## 10. Checklist kiểm tra sau khi port

- [ ] Lần load đầu: panel ở trạng thái expanded, FAB ẩn.
- [ ] Bấm chevron `×` → text fade-out nhanh (~150ms), panel xẹp dọc trước (~400ms), rồi co ngang về pill tròn (~420ms tiếp), FAB xuất hiện sau khoảng 0.85s.
- [ ] Bấm FAB → panel kéo ngang ra full-width trước, sau đó kéo dọc xuống height đầy, text fade-in chậm sau khi panel ổn định.
- [ ] **Không thấy** state trung gian "hình chữ nhật xấu" giữa pill và panel — luôn cảm giác **một chiều trước, chiều kia sau**.
- [ ] Border-radius luôn bo đúng: tròn 100% lúc pill, bo `--pill-h/2` lúc panel.
- [ ] Chevron xoay 180° khi đóng/mở (mượt 350ms).
- [ ] FAB tròn nằm CHÍNH XÁC vị trí pill collapsed (chồng khít).
- [ ] Resize sang landscape: kích thước thu nhỏ (`--pill-h: 38px`, width 240px, height 170px) nhưng pattern hoạt động y hệt.
- [ ] Nội dung dài (3 dòng desc) bị clamp 2 dòng, không vỡ layout pill.

---

## 11. Hạn chế / lưu ý

- **Mất pha sync nếu transition-duration bị override**: kỹ thuật staggered hoàn toàn dựa vào `.4s + delay .42s`. Nếu bạn đặt lại `transition: all .3s` đè lên, hiệu ứng sẽ thành "mọi thuộc tính chạy cùng lúc" và **mất cảm giác phình theo trục**.
- **Border-radius KHÔNG transition**: nếu thêm `border-radius` vào transition list → lúc collapsed có thể flash hình vuông một frame trước khi tròn. Giữ nguyên: width/height đi từ giá trị bất kỳ về `--pill-h`, lúc đó `calc(--pill-h / 2)` tự thành nửa cạnh = 50% → tròn.
- **`pointer-events: none` ở pill collapsed** là bắt buộc — nếu bỏ, click vào pill sẽ KHÔNG kích hoạt FAB (vì pill nằm cùng vị trí, có thể che FAB tùy z-index).
- **General sibling combinator (`~`) yêu cầu DOM order**: `#vr-info-fab` PHẢI đứng **sau** `#vr-info` trong DOM. Đảo thứ tự → selector `#vr-info.collapsed ~ #vr-info-fab` không match → FAB không hiện.
- **Không hỗ trợ animation collapse khi panel chứa height động** (VD nội dung tự co theo data). Height đang hard-code 200px/170px. Nếu cần height linh hoạt → đổi sang `max-height` + animate `max-height` (giữ pattern delay tương tự).
- **Backdrop-filter** không hoạt động trên Firefox cũ < 103 → panel trong suốt hoàn toàn, có thể nền dưới làm khó đọc. Fallback: `background: rgba(255,255,255,.96)` đậm hơn cho `@supports not (backdrop-filter: blur(1px))`.
- **Spec này đã bỏ phần liên kết với search dropdown** (`body:has(#search-results.open) #vr-info { top: ... }`). Nếu dự án đích cần panel "né" 1 element khác — tự thêm lại pattern `body:has(...)` tùy use case, hoặc dùng JS đo + set CSS var.

---

*File này tự đủ. Port: copy 2 element HTML + 3 block CSS (base + portrait + landscape) + 2 listener JS — hiệu ứng pill↔panel staggered hoạt động ngay trong < 10 phút.*
