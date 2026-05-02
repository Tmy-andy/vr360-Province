# THIẾT KẾ CHI TIẾT – Cẩm nang Du lịch & Đầu tư
*Trang VR360 Lâm Đồng – phục vụ song song Du lịch + Xúc tiến Đầu tư*

---

## 0. NGUYÊN TẮC – Bám theo design system hiện có

> ⚠️ **Quan trọng**: KHÔNG dùng dark theme + xanh ngọc như mockup gốc. Bám đúng tokens đang dùng trong `css/style.css`.

### 0.1. Color tokens (đã có sẵn, chỉ kế thừa)
| Token | Giá trị | Dùng cho |
|---|---|---|
| `--icon-blue` | `#2bb6e6` | Accent chính: text nổi bật, nút, viền active, badge |
| `--icon-blue-dark` | `#1aa0cf` | Hover state nút xanh |
| `--green` | `#1a8f5a` | Phụ – chip "đầu tư xanh", trạng thái "sẵn sàng" |
| `--green2` | `#22b46e` | Phụ – gradient nhẹ |
| `--teal` | `#26C6DA` | Phụ |
| `--ai-neon` | `#16d472` | CHỈ cho nút AI ở bottom-bar |
| Background page | `#fff` | Toàn bộ panel/sheet/card |
| Text heading | `#1a1a1a` | Tiêu đề chính |
| Text body | `#333` / `#555` | Nội dung |
| Text muted | `#888` / `#aaa` | Caption, time, count |
| Border | `#eef0f2` / `#e4e8ec` | Đường viền card, divider |
| Background nhẹ | `#f4f6f8` | Nền nút phụ, search input |
| Hover bg nhẹ | `#f4faff` | Hover item dropdown |

### 0.2. Spacing & Radius tokens
| Token | Giá trị |
|---|---|
| `--pill-h` | `44px` (chuẩn cho mọi nút topbar) |
| `--pill-radius` | `24px` |
| `--card-radius` | `14px` |
| `--panel-radius` | `16px` |
| `--panel-w` | `410px` (right panel) |
| `--bottom-h` | `54px` (bottom bar – đã chuẩn) |
| `--pill-shadow` | `0 4px 14px rgba(0,0,0,.12)` |
| `--shadow` | `0 2px 10px rgba(0,0,0,.14)` |
| Panel shadow | `0 8px 28px rgba(0,0,0,.18)` |

### 0.3. Typography
- Font: `'Be Vietnam Pro', sans-serif` (đã import)
- Tiêu đề lớn: `18–20px / 800`
- Tiêu đề card: `13.5–14px / 800`
- Body: `12–13px / 500`
- Caption: `11–11.5px / 600`
- Letter-spacing nhẹ với UPPERCASE label.

### 0.4. Animation pattern (đã có, tái dùng)
- Mở/đóng dropdown: `clip-path: inset(0 0 100% 0)` + `opacity` – `.3s cubic-bezier(.4,0,.2,1)`
- Slide panel: `transform: translateX()` – `.35s cubic-bezier(.4,0,.2,1)`
- Hover card: `box-shadow` tăng + `border-color` chuyển sang `--icon-blue`

---

## 1. TỔNG QUAN KIẾN TRÚC – Cách 2 phần mới gắn vào trang hiện tại

### 1.1. Quy ước "view"
Trang hiện đang có 2 view chính:
- **2D view** (bản đồ Leaflet + topbar + right-panel + bottom-bar)
- **3D view** (Pannellum + vr-ui)

→ **Bổ sung 2 view mới (đều thuộc nhóm 2D, cùng layout language):**
- **Guide view** – `body[data-view="guide"]` – "Cẩm nang Du lịch"
- **Invest view** – `body[data-view="invest"]` – "Đầu tư Lâm Đồng"

### 1.2. Cơ chế chuyển view
- Nguồn vào: nút trong **bottom-bar** (đã có sẵn 5 nút). Đề xuất ánh xạ lại:
  - `Trang chủ` → quay về Map 2D mặc định
  - `Khám phá` → mở **Guide view** (Cẩm nang)
  - `AI Hỗ trợ` (giữ nguyên – nút giữa)
  - `Ưu đãi` → đổi tên/icon thành **"Đầu tư"** → mở **Invest view**
  - `VR Tour` → giữ nguyên (mở 3D view)
- Cơ chế: thêm class `.view-guide` / `.view-invest` vào `<body>`, các view tương ứng `display: block`, các UI map (right-panel, layer-popup, mobile FAB…) `display: none`.
- Topbar: **giữ nguyên search + lang + fullscreen** (luôn xuất hiện), ẩn các nút riêng của map (zoom, layers, 3D-btn).
- Bottom-bar: **giữ nguyên ở mọi view**, chỉ đổi indicator vị trí.
- Transition: tận dụng `#view-transition` ripple đã có (hiện chỉ dùng khi vào 3D).

### 1.3. Sitemap mới
```
Map 2D (mặc định)
├── Right panel: danh sách địa điểm (đã có)
├── News panel: tin tức/sự kiện (đã có)
├── 3D view: VR tour 1 địa điểm (đã có)
├── Guide view (MỚI)
│   ├── Tổng quan Lâm Đồng
│   ├── Thời điểm du lịch
│   ├── Di chuyển
│   ├── Lưu trú
│   ├── Ẩm thực
│   ├── Điểm đến (link tới Map 2D + filter)
│   ├── Hoạt động
│   └── Kinh nghiệm/Mẹo
└── Invest view (MỚI)
    ├── Hero + 3 số liệu nổi bật
    ├── Lý do đầu tư (5 mục)
    ├── 6 lĩnh vực ưu tiên
    ├── Dự án kêu gọi đầu tư (list + filter + map)
    ├── Chính sách ưu đãi
    ├── Quy trình 1 cửa
    ├── Tài liệu & brochure
    ├── Câu chuyện thành công
    ├── Sự kiện xúc tiến
    └── Form liên hệ + footer
```

---

## 2. GUIDE VIEW – "Cẩm nang Du lịch"

### 2.1. Mục tiêu & user flow
- **Đối tượng**: du khách đang lập kế hoạch (chưa đến) + du khách đang ở Lâm Đồng (đã đến).
- **Câu hỏi họ trả lời được khi rời trang**: *"Đi tháng mấy? Đến bằng gì? Ở đâu? Ăn gì? Mua gì? Đi đâu?"*
- **Flow chính**:
  1. User click *Khám phá* ở bottom-bar.
  2. Vào landing Guide → thấy hero + 8 chủ đề.
  3. Click 1 chủ đề → panel nội dung mở ra (bên phải hoặc full-page tuỳ desktop/mobile).
  4. Trong nội dung có CTA *"Xem trên bản đồ"* → quay về Map 2D với filter tương ứng đã áp.
- **Flow phụ**:
  - Search trong cẩm nang (không phải search địa điểm).
  - Tải PDF cẩm nang theo ngôn ngữ.
  - Lưu offline (PWA – giai đoạn sau).

### 2.2. Cấu trúc DOM (desktop)
```
<section id="guide-view">
  <div id="gv-shell">                  <!-- panel trắng, bo 16px, shadow lớn, cách topbar 20px, full chiều cao -->
    <aside id="gv-sidebar">            <!-- 260px, fixed bên trái panel -->
      <div class="gv-side-title">CHỦ ĐỀ CẨM NANG</div>
      <button class="gv-side-item active" data-topic="overview">…</button>
      <button class="gv-side-item" data-topic="when">…</button>
      <!-- 8 mục -->
      <button id="gv-pdf-btn" class="gv-pdf">⬇ Tải cẩm nang PDF</button>
    </aside>
    <main id="gv-main">                <!-- nội dung scroll riêng -->
      <header class="gv-header">
        <h1>Cẩm nang Du lịch <span class="hl">Lâm Đồng</span></h1>
        <p class="gv-sub">Thông tin hữu ích cho hành trình khám phá trọn vẹn</p>
      </header>
      <section class="gv-hero">…</section>           <!-- hero ảnh + title chủ đề + CTA -->
      <section class="gv-stats">…</section>          <!-- 4 stat boxes hữu ích cho du khách -->
      <section class="gv-articles">…</section>       <!-- cards bài viết -->
      <section class="gv-tips">…</section>           <!-- mẹo hữu ích -->
    </main>
  </div>
</section>
```

### 2.3. Spec từng khối

#### A. `#gv-shell` (panel chính)
- Layout: `position: fixed; top: calc(var(--topbar) + 20px); left: var(--panel-gap); right: var(--panel-gap); bottom: var(--panel-gap);`
- Background: `#fff`, `border-radius: var(--panel-radius)`, shadow `0 8px 28px rgba(0,0,0,.18)` (trùng panel hiện có).
- Display: `flex; flex-direction: row;`
- Vào view: `transform: translateY(20px); opacity: 0` → animate về `translateY(0); opacity: 1` trong 0.35s.

#### B. `#gv-sidebar`
- Width: `260px`, `flex-shrink: 0`, padding `18px 14px`.
- Border-right: `1px solid #eef0f2`.
- Sidebar title: `font-size: 11px; font-weight: 700; color: #888; letter-spacing: .8px; text-transform: uppercase; margin-bottom: 10px;`
- `.gv-side-item`:
  - Reset button. `width: 100%; text-align: left; padding: 11px 12px; border-radius: 10px; border: 1.5px solid transparent; background: transparent; cursor: pointer; display: flex; gap: 10px; align-items: flex-start; margin-bottom: 4px;`
  - Icon trái: `24x24` SVG, `color: var(--icon-blue)`.
  - Title: `font-size: 13.5px; font-weight: 700; color: #1a1a1a; line-height: 1.3;`
  - Sub: `font-size: 11.5px; color: #888; margin-top: 2px;`
  - Hover: `background: #f4faff`.
  - Active: `background: #e8f6fc; border-color: var(--icon-blue);` (giống pattern card active hiện tại).
- 8 mục theo thứ tự:
  1. **Tổng quan** – icon book
  2. **Thời điểm du lịch** – icon calendar
  3. **Di chuyển** – icon car
  4. **Lưu trú** – icon bed
  5. **Ẩm thực** – icon utensils
  6. **Điểm đến** – icon map-pin (click → quay về Map 2D)
  7. **Hoạt động** – icon camera
  8. **Kinh nghiệm** – icon lightbulb
- `#gv-pdf-btn`: full-width, `height: 40px`, `border-radius: 10px`, `background: #f4f6f8`, hover `background: var(--icon-blue); color: #fff`, icon ⬇ trái + text "Tải cẩm nang PDF". Click → mở dropdown chọn ngôn ngữ (VI/EN).

#### C. `#gv-main`
- `flex: 1; padding: 20px 24px 24px; overflow-y: auto;`
- Scrollbar mỏng giống `#p-list` (`width: 4px; thumb #d0d5db`).
- Header `<h1>`: `font-size: 22px; font-weight: 800; color: #1a1a1a;`. Span `.hl` dùng `color: var(--icon-blue);`.
- Sub: `font-size: 13px; color: #888; margin-top: 4px;`.

#### D. Hero section `.gv-hero`
- Layout 2 cột: trái nội dung, phải ảnh.
- Container: `display: grid; grid-template-columns: 1fr 1.4fr; gap: 18px; margin-top: 18px; border-radius: 14px; overflow: hidden; border: 1px solid #eef0f2;`
- **Trái** (`background: #f4faff; padding: 24px;`):
  - Tag nhỏ uppercase: `TỔNG QUAN LÂM ĐỒNG` – `color: var(--icon-blue); font-size: 11px; font-weight: 700; letter-spacing: .8px;`.
  - Tiêu đề 2 dòng: `font-size: 22px; font-weight: 800; color: #1a1a1a; line-height: 1.25;`.
  - Mô tả 3 dòng: `font-size: 13px; color: #555; line-height: 1.6;`.
  - Nút "Khám phá ngay >": pill style đồng bộ `.btn-go` hiện có – `height: 36px; padding: 0 18px; border-radius: 18px; background: var(--icon-blue); color: #fff; font-size: 12.5px; font-weight: 700;`.
- **Phải**: `<img>` `object-fit: cover; height: 240px;`. Ảnh thật của Lâm Đồng (hồ + núi).

#### E. Stats `.gv-stats`
- 4 box ngang. Grid: `grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 14px;`
- Mỗi box: `padding: 14px 16px; border-radius: 12px; border: 1px solid #eef0f2; display: flex; gap: 12px; align-items: center; background: #fff;`
- Icon trái: tròn `40x40`, `background: rgba(43,182,230,.1); color: var(--icon-blue); display: flex; align-items: center; justify-content: center; border-radius: 50%;`
- Label: `font-size: 11.5px; color: #888; font-weight: 600;`
- Value: `font-size: 15px; font-weight: 800; color: #1a1a1a;`
- **Đề xuất nội dung 4 stat (hữu ích cho du khách – KHÔNG dùng diện tích/dân số như mockup)**:
  1. 🌡️ Nhiệt độ trung bình – **18–24°C**
  2. 📅 Mùa đẹp nhất – **Tháng 11 – 4**
  3. ✈️ Sân bay – **Liên Khương (30km)**
  4. 📍 Số điểm đến – **120+**

#### F. Articles `.gv-articles`
- Tiêu đề: "BÀI VIẾT NỔI BẬT" – `font-size: 13px; font-weight: 800; color: #1a1a1a; margin: 22px 0 12px;`.
- Grid: `grid-template-columns: 1.5fr 1fr 1fr; grid-template-rows: auto auto; gap: 12px;` – 1 card lớn featured + 4 card nhỏ.
- Card style: kế thừa `.lcard` hiện tại (white, `border-radius: 14px`, `border: 1px solid #eef0f2`, `box-shadow: 0 2px 6px rgba(0,0,0,.06)`).
- Card lớn: ảnh trên 180px + nội dung dưới.
- Card nhỏ: ảnh trên 120px + nội dung dưới.
- Tag chip góc trên trái ảnh: `position: absolute; top: 10px; left: 10px; background: rgba(43,182,230,.95); color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;`. Categories: Điểm đến / Kinh nghiệm / Hoạt động / Ẩm thực / Lưu trú.
- Tiêu đề: `font-size: 13.5px; font-weight: 800; color: #1a1a1a; line-height: 1.3;`
- Sub mô tả 1 dòng: `font-size: 12px; color: #555;`
- Footer card: ⏱ "5 phút đọc" (`color: #888; font-size: 11.5px;`) + nút bookmark phải.

#### G. Tips `.gv-tips`
- Section pad ngang giống stats.
- Tiêu đề: "MẸO HỮU ÍCH CHO DU KHÁCH" – đồng bộ với tiêu đề articles.
- Container: `border: 1px solid #eef0f2; border-radius: 14px; padding: 18px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px;`
- Mỗi tip: icon tròn (giống stats) + tiêu đề + 2 dòng mô tả.
- Nội dung 4 tip:
  1. 🛏 **Đặt phòng sớm** – Trước 1–2 tuần vào mùa cao điểm.
  2. 🧥 **Mang áo ấm** – Đặc biệt vào ban đêm và mùa đông.
  3. 💊 **Chuẩn bị thuốc** – Thuốc say xe và thuốc cá nhân.
  4. ❤ **Tôn trọng văn hoá** – Giữ gìn môi trường, văn hoá địa phương.

### 2.4. Mobile view (< 768px)
- `#gv-sidebar` chuyển thành **horizontal scroll chip bar** sticky top:
  - `flex-direction: row; overflow-x: auto; padding: 12px; gap: 8px; border-right: none; border-bottom: 1px solid #eef0f2; width: 100%;`
  - `.gv-side-item` thành chip: `padding: 8px 14px; border-radius: 18px; border: 1.5px solid #e2e6ea; white-space: nowrap; flex-direction: row; align-items: center;` – ẩn `sub`, chỉ hiện title.
  - Active: `background: var(--icon-blue); color: #fff; border-color: var(--icon-blue);`
- `.gv-hero` thành 1 cột (ảnh trên, content dưới).
- `.gv-stats` `grid-template-columns: 1fr 1fr;`
- `.gv-articles` 1 cột.
- `.gv-tips` 1 cột.
- `#gv-shell` `top: 70px; left: 8px; right: 8px; bottom: 70px;` (chừa bottom-bar).

---

## 3. INVEST VIEW – "Đầu tư Lâm Đồng"

### 3.1. Mục tiêu & user flow
- **Đối tượng**: nhà đầu tư trong nước, doanh nghiệp FDI, đoàn khảo sát.
- **Câu hỏi họ trả lời được**: *"Tỉnh có dự án nào? Quy mô bao nhiêu? Ưu đãi gì? Liên hệ ai? Thủ tục bao lâu?"*
- **Flow chính**:
  1. Click *Đầu tư* ở bottom-bar.
  2. Landing Invest → thấy hero + 3 số nổi + 5 lý do + 6 lĩnh vực + dự án.
  3. Click 1 lĩnh vực → list dự án filter theo lĩnh vực đó.
  4. Click 1 dự án → modal/sheet hồ sơ chi tiết → CTA *"Đăng ký quan tâm"* / *"Xem trên bản đồ"* / *"Tải hồ sơ PDF"*.
  5. Form đăng ký quan tâm → submit → thank-you.
- **Flow phụ**:
  - Đổi ngôn ngữ (VI/EN/KR/JP/CN ưu tiên trang này).
  - Liên hệ nhanh: Zalo OA / WhatsApp / hotline.
  - Tải brochure PDF.

### 3.2. Cấu trúc DOM
```
<section id="invest-view">
  <div id="iv-shell">
    <aside id="iv-sidebar">           <!-- 280px -->
      <div class="iv-side-title">LĨNH VỰC ƯU TIÊN</div>
      <button class="iv-side-item active" data-sector="all">Tất cả</button>
      <button class="iv-side-item" data-sector="tourism">Du lịch – Dịch vụ</button>
      <!-- 6 lĩnh vực -->
      <button id="iv-all-sectors-btn">Xem tất cả lĩnh vực ></button>
    </aside>
    <main id="iv-main">
      <header class="iv-header">
        <h1>Đầu tư & Phát triển <span class="hl">Lâm Đồng</span></h1>
        <p class="iv-sub">Cơ hội đầu tư hấp dẫn – Đồng hành phát triển bền vững</p>
      </header>
      <section class="iv-hero">…</section>          <!-- ảnh hero + 3 stats overlay -->
      <section class="iv-reasons">…</section>       <!-- 5 lý do – 2 cột -->
      <section class="iv-projects">…</section>      <!-- list dự án + filter chip -->
      <section class="iv-policy">…</section>        <!-- chính sách ưu đãi (timeline thuế) -->
      <section class="iv-process">…</section>       <!-- quy trình 1 cửa 5 bước -->
      <section class="iv-resources">…</section>     <!-- tài liệu PDF -->
      <section class="iv-success">…</section>       <!-- testimonial 3 doanh nghiệp -->
      <section class="iv-events">…</section>        <!-- sự kiện sắp tới -->
      <section class="iv-contact">…</section>       <!-- form liên hệ -->
    </main>
  </div>
</section>
```

### 3.3. Spec từng khối

#### A. `#iv-shell` & `#iv-sidebar`
- Cấu trúc + style **giống hệt** `#gv-shell` / `#gv-sidebar` để 2 view trông là 1 hệ.
- Sidebar title: `LĨNH VỰC ƯU TIÊN`.
- 7 mục (1 "Tất cả" + 6 lĩnh vực):
  1. **Tất cả** – icon grid
  2. **Du lịch – Dịch vụ** – icon briefcase
  3. **Nông nghiệp công nghệ cao** – icon leaf
  4. **Công nghiệp chế biến** – icon factory
  5. **Năng lượng tái tạo** – icon wind
  6. **Hạ tầng – Đô thị** – icon building
  7. **Thương mại – Logistics** – icon truck
- Nút cuối sidebar đổi thành **2 nút xếp dọc**:
  - "📄 Tải Cẩm nang Đầu tư"
  - "✉ Liên hệ Trung tâm XTĐT" (background `var(--icon-blue)`, color `#fff`)

#### B. Hero `.iv-hero`
- Layout: ảnh full-width 280px height + overlay nội dung dưới, **3 stat boxes nổi đè lên 1 nửa ảnh** (giống mockup nhưng đổi màu).
- Container: `border-radius: 14px; overflow: hidden; border: 1px solid #eef0f2; position: relative; margin-top: 18px;`
- Ảnh: ảnh drone Lâm Đồng (hồ Tuyền Lâm hoặc đồi chè), `width: 100%; height: 280px; object-fit: cover;`
- Overlay gradient dưới: `linear-gradient(to top, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 50%)`.
- 3 stat boxes: `position: absolute; bottom: 16px; left: 18px; display: flex; gap: 12px;`. Mỗi box:
  - `background: #fff; border-radius: 12px; padding: 14px 18px; box-shadow: var(--pill-shadow); display: flex; gap: 12px; align-items: center; min-width: 180px;`
  - Icon tròn `40x40` `background: rgba(43,182,230,.1); color: var(--icon-blue);`
  - Label nhỏ `font-size: 11px; color: #888; text-transform: uppercase; font-weight: 700;`
  - Value lớn `font-size: 18px; font-weight: 800; color: #1a1a1a;`
  - Unit `font-size: 11.5px; color: #888;`
- 3 stat:
  1. 💰 **TỔNG VỐN ĐẦU TƯ** – 220.000+ tỷ đồng
  2. 📋 **DỰ ÁN KÊU GỌI** – 128 dự án
  3. 🎯 **LĨNH VỰC** – 6 lĩnh vực
- *Phải kèm dòng nhỏ dưới hero*: `Nguồn: Sở KH&ĐT Lâm Đồng – cập nhật {năm}` – `font-size: 10.5px; color: #aaa; margin-top: 6px;`

#### C. Reasons `.iv-reasons` – "Vì sao đầu tư tại Lâm Đồng?"
- Tiêu đề section: `font-size: 13px; font-weight: 800; color: #1a1a1a; margin: 22px 0 12px; text-transform: uppercase; letter-spacing: .5px;`
- Grid `grid-template-columns: 1fr 1fr; gap: 12px;` – 5 mục → mục 5 chiếm cả 2 cột (hoặc làm 6 mục cho cân).
- Mỗi item: `padding: 16px; border-radius: 12px; border: 1px solid #eef0f2; display: flex; gap: 14px; align-items: flex-start;`
- Icon tròn `44x44`, **màu khác nhau theo mục** (giữ palette dịu):
  1. Vị trí chiến lược – `--icon-blue`
  2. Tiềm năng tự nhiên – `--green2`
  3. Chính sách ưu đãi – `#f4a73b` (cam vàng)
  4. Môi trường đầu tư minh bạch – `#7c5cff` (tím dịu)
  5. Hạ tầng hoàn thiện – `--teal`
  6. Nhân lực dồi dào – `#ee5a6f` (hồng đào)
- Title: `font-size: 13.5px; font-weight: 800; color: #1a1a1a;`
- Mô tả: `font-size: 12px; color: #555; line-height: 1.5; margin-top: 3px;`

#### D. Projects `.iv-projects` – "Dự án kêu gọi đầu tư"
- Tiêu đề: "DỰ ÁN KÊU GỌI ĐẦU TƯ TIÊU BIỂU"
- **Filter chip bar** dưới tiêu đề: cùng style `.pcat` đang có (rất quan trọng – consistency):
  - `Tất cả · Du lịch · Nông nghiệp · Năng lượng · Hạ tầng · Công nghiệp · Logistics`
- Bên phải có nút text "Xem tất cả dự án →" – `color: var(--icon-blue); font-weight: 700; font-size: 12.5px;`
- Grid: `grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin-top: 14px;` – tự co theo width.
- Card dự án (`.iv-pcard`):
  ```
  [ảnh 160px height]
  [tag chip lĩnh vực: top-left, đè lên ảnh]
  [trái tim ❤ bookmark: top-right]
  [content padding 14px:]
    Tên dự án (font 14px / 800)
    📍 Địa điểm (12px / #888)
    Quy mô: 350 ha
    Tổng vốn: 6.500 tỷ đồng
    [badge tiến độ – màu theo trạng thái]
  ```
- Card style: kế thừa `.lcard`. Hover: bóng tăng + viền `--icon-blue`.
- **Badge tiến độ** (rất cần cho nhà đầu tư):
  - 🟢 "Sẵn sàng mặt bằng" – `background: rgba(34,180,110,.12); color: var(--green);`
  - 🔵 "Đã có quy hoạch 1/500" – `background: rgba(43,182,230,.12); color: var(--icon-blue);`
  - 🟡 "Đang kêu gọi" – `background: rgba(244,167,59,.12); color: #c87a0e;`
- Card có **2 CTA dưới cùng**: "Xem chi tiết" (full filled) + "Trên bản đồ" (icon only `📍`, ghost).

#### E. Project detail (modal/sheet khi click card)
- Reuse `#sheet` đã có (bottom sheet 540px desktop / fullscreen mobile).
- Cấu trúc nội dung sheet:
  1. Ảnh hero dự án (full-width, 220px).
  2. Tên + tag lĩnh vực + badge tiến độ.
  3. Bảng thông tin 2 cột: Vị trí, Diện tích, Tổng vốn, Hình thức đầu tư, Thời gian thực hiện.
  4. **Mô tả dự án** (markdown 2–3 đoạn).
  5. **Ưu đãi cụ thể** (bullet):
     - Thuế TNDN: 10% trong 15 năm, miễn 4 năm đầu, giảm 50% trong 9 năm tiếp theo.
     - Thuê đất: miễn 11–15 năm.
     - Thuế nhập khẩu thiết bị: miễn.
  6. **Đầu mối liên hệ**: tên cán bộ, SĐT, email.
  7. CTA dòng cuối: `[Tải hồ sơ PDF] [Đăng ký quan tâm] [Xem trên bản đồ]` – `display: flex; gap: 8px;`. CTA chính filled `--icon-blue`, phụ ghost.

#### F. Policy `.iv-policy` – "Chính sách ưu đãi"
- Tiêu đề: "CHÍNH SÁCH ƯU ĐÃI ĐẦU TƯ"
- Layout 3 cột: **Thuế / Đất đai / Hỗ trợ khác** – mỗi cột là 1 card lớn.
- Mỗi cột:
  - Header: icon tròn lớn 56x56 + tên chính sách.
  - Bullet list 4–5 mục với check ✓ xanh.
- Background card: `background: linear-gradient(180deg, #f4faff 0%, #fff 100%);` (nhẹ, vẫn tone trắng).

#### G. Process `.iv-process` – "Quy trình 1 cửa"
- Tiêu đề: "QUY TRÌNH ĐẦU TƯ – HỖ TRỢ MỘT CỬA"
- 5 bước ngang (desktop) / dọc (mobile) – horizontal stepper:
  1. **Quan tâm** – Gửi yêu cầu sơ bộ – *trong ngày*
  2. **Khảo sát** – Bố trí khảo sát thực địa – *3–5 ngày*
  3. **Đăng ký** – Nộp hồ sơ chính thức – *7 ngày*
  4. **Cấp phép** – Thẩm định, ra quyết định – *15–30 ngày*
  5. **Triển khai** – Bàn giao mặt bằng, hỗ trợ thi công
- Mỗi step:
  - Số tròn `40x40` `background: var(--icon-blue); color: #fff; font-weight: 800;`
  - Title + thời gian
  - Đường nối ngang `2px dashed #d0e8f4` giữa các step (chỉ desktop).

#### H. Resources `.iv-resources` – "Tài liệu & Brochure"
- Grid 4 cột (desktop) / 1 cột (mobile).
- Mỗi item: icon PDF + tên + size + nút download.
- Items:
  1. Cẩm nang đầu tư Lâm Đồng 2026 (VI) – 4.2 MB
  2. Lam Dong Investment Guide (EN) – 4.1 MB
  3. Quy hoạch tỉnh đến 2030 – 8.7 MB
  4. Danh mục dự án kêu gọi đầu tư – 1.5 MB

#### I. Success stories `.iv-success`
- Slider ngang 3–5 testimonial.
- Mỗi card: ảnh logo công ty + ảnh nhà máy + trích dẫn (italic) + tên CEO/đại diện + tên dự án + năm.
- Style card: `.lcard` width 320px, scroll ngang.

#### J. Events `.iv-events` – "Sự kiện xúc tiến sắp tới"
- Tận dụng style từ `news-panel` đang có.
- 3–4 sự kiện gần nhất, mỗi card có ngày to bên trái + nội dung phải + nút "Đăng ký tham dự".

#### K. Contact `.iv-contact` – "Đăng ký quan tâm đầu tư"
- Box lớn `background: linear-gradient(135deg, rgba(43,182,230,.05), rgba(34,180,110,.05)); border: 1px solid #eef0f2; border-radius: 14px; padding: 28px;`
- Layout 2 cột:
  - **Trái**: form
    - Họ tên *
    - Doanh nghiệp *
    - Quốc gia (select)
    - Email *
    - SĐT *
    - Lĩnh vực quan tâm (multi-select chips)
    - Quy mô vốn dự kiến (select range)
    - Nhu cầu (checkboxes: Khảo sát / Tư vấn pháp lý / Kết nối đối tác / Tài liệu chi tiết)
    - Lời nhắn (textarea)
    - Nút submit "Gửi đăng ký" full-width primary.
  - **Phải**: thông tin liên hệ
    - Logo Trung tâm XTĐT
    - Địa chỉ
    - Hotline (icon phone, click-to-call)
    - Email
    - Zalo OA QR + button "Mở Zalo"
    - WhatsApp button (cho FDI)
- Input style: `height: 40px; border: 1.5px solid #e4e8ec; border-radius: 8px; padding: 0 12px; font-family: inherit; font-size: 13px;` (đồng bộ `#ph-search`).
- Focus: `border-color: var(--icon-blue);`.

### 3.4. Floating CTA "Liên hệ" (mobile-only)
- `position: fixed; bottom: 80px; right: 12px; z-index: 950;`
- Tròn `56x56`, `background: var(--icon-blue); color: #fff; box-shadow: 0 6px 18px rgba(43,182,230,.4);`
- Icon ✉ giữa, click → cuộn xuống `#iv-contact` form hoặc mở popup chọn kênh (Zalo / WhatsApp / Hotline / Form).

---

## 4. THAY ĐỔI Ở COMPONENTS HIỆN CÓ

### 4.1. Bottom-bar – đổi nút thứ 4
- HTML hiện tại: `<button class="bbt"> ... Ưu đãi ...`
- Đổi thành: `<button class="bbt" data-view="invest"> ... Đầu tư ...` với icon biểu đồ tăng (`bar-chart`).
- Nút thứ 2 "Khám phá" → đổi thành `data-view="guide"` mở Guide view (giữ nguyên text/icon).
- JS: thêm event listener bind `.bbt[data-view]` → set body class + di chuyển `#bb-indicator`.

### 4.2. Topbar – ẩn các nút riêng map khi vào Guide/Invest
- Khi `body.view-guide` hoặc `body.view-invest`:
  - Ẩn: `#xa-dd`, `#three-d-btn`, `#zoom-in-btn`, `#zoom-out-btn`, `#layers-btn`.
  - Giữ: `#menu-btn`, `#search-wrap` (đổi placeholder qua i18n: "Tìm kiếm cẩm nang…" / "Tìm dự án, lĩnh vực…"), `#lang-btn`, `#fs-btn`.
- Search behavior cũng đổi: thay vì search địa điểm → search bài viết / dự án trong view tương ứng.

### 4.3. Left toolbar – ẩn ở 2 view mới
- `#left-bar` hiện chỉ dùng cho map mode → `body.view-guide #left-bar, body.view-invest #left-bar { display: none; }`

### 4.4. Right panel – đóng khi chuyển view
- JS: trước khi mở Guide/Invest → đóng `#right-panel`, `#news-panel`, `#sheet`.

### 4.5. i18n – thêm key
File `js/i18n.js` cần thêm namespace:
```
guide.title, guide.sub, guide.topics.overview, guide.topics.when, ...
invest.title, invest.sub, invest.stats.capital, invest.sectors.tourism, ...
invest.cta.contact, invest.cta.download, invest.process.step1, ...
```
Ưu tiên 5 ngôn ngữ: VI / EN / KR / JP / CN.

### 4.6. Data files mới
- **Data thuần JSON** (tách hoàn toàn khỏi code, dễ chỉnh sửa/swap khi có data thật):
  - `data/guide.json` – nội dung 8 chủ đề + bài viết + tips.
  - `data/invest-sectors.json` – 6 lĩnh vực ưu tiên.
  - `data/invest-projects.json` – ~10 dự án mẫu (mỗi dự án: id, name, sector, district, lat, lng, area_ha, capital_billion_vnd, status, description, incentives[], contact{}, image, pdf_url).
  - `data/invest-policy.json` – chính sách ưu đãi (thuế / đất / hỗ trợ).
  - `data/invest-resources.json` – danh sách tài liệu PDF.
  - `data/invest-events.json` – sự kiện xúc tiến.
  - `data/invest-success.json` – testimonial.
- **JS chỉ chứa logic, fetch JSON khi mở view**:
  - `js/guide-ui.js` – fetch `data/guide.json` + render + event.
  - `js/invest-ui.js` – fetch các file JSON invest-* + render + event.
- Lý do tách JSON: dễ thay bằng API thật sau này (chỉ đổi URL fetch), team nội dung không cần biết JS để cập nhật.

---

## 5. RESPONSIVE BREAKPOINTS (đồng bộ trang hiện tại)

| Breakpoint | Hành vi Guide/Invest |
|---|---|
| `≥ 1280px` | Layout đầy đủ như spec trên (sidebar 260–280px + main) |
| `1024–1279px` | Sidebar co 220px, hero 1 cột, stats 4 cột |
| `768–1023px` | Sidebar đè dạng drawer (mở bằng nút hamburger trên main), hero 1 cột, stats 2 cột |
| `< 768px` | Sidebar → horizontal chip bar sticky top, mọi grid về 1 cột (trừ stats giữ 2 cột) |
| `< 480px` | Hero ảnh 200px, font giảm 1px, padding giảm còn 14–16px |

---

## 6. ACCESSIBILITY & PERFORMANCE

- **Contrast**: tất cả text body đảm bảo ≥ 4.5:1 trên nền trắng (text `#555` trên `#fff` đạt 7:1, OK).
- **Focus state**: tất cả button/input có outline `2px solid rgba(43,182,230,.5); outline-offset: 2px;` khi focus-visible.
- **Skip link**: thêm `<a class="skip" href="#gv-main">Bỏ qua đến nội dung</a>` ẩn, hiện khi focus.
- **Lazy load ảnh**: `<img loading="lazy">` cho mọi ảnh card.
- **Skeleton**: khi data đang fetch, render khung xám `background: #f4f6f8; animation: pulse 1.5s infinite;` (mới).

---

## 7. DỮ LIỆU CẦN CHUẨN BỊ

### Cẩm nang du lịch
1. 8 bài giới thiệu chủ đề (mỗi bài 200–400 từ × VI/EN).
2. 5–10 bài viết nổi bật (ảnh 1200x800 + 300 từ + 1 phút đọc).
3. PDF cẩm nang VI + EN (40–60 trang).
4. 4 stat số liệu cập nhật.

### Đầu tư
1. 5–10 dự án mẫu đầy đủ: ảnh, vị trí (lat/lng để chấm trên map), quy mô, vốn, ưu đãi, đầu mối, PDF hồ sơ.
2. GeoJSON ranh giới các KCN (Lộc Sơn, Phú Hội, Tân Phú, Lộc Phát) – để có lớp bản đồ về sau.
3. Bộ tài liệu PDF: Cẩm nang đầu tư VI/EN, Quy hoạch tỉnh, Danh mục dự án.
4. 3–5 case study testimonial.
5. Lịch sự kiện 6 tháng tới.
6. Thông tin liên hệ Trung tâm XTĐT.

---

## 8. ROADMAP TRIỂN KHAI ĐỀ XUẤT

### Sprint 1 (1 tuần) – Khung 2 view
- [ ] Thêm DOM `#guide-view`, `#invest-view` (rỗng) vào `index.html`.
- [ ] CSS shell + sidebar dùng chung token hiện có.
- [ ] JS chuyển view qua bottom-bar + ripple transition.
- [ ] Ẩn/hiện các UI map đúng theo view.

### Sprint 2 (1 tuần) – Guide nội dung
- [ ] 8 chủ đề + sidebar.
- [ ] Hero, stats, articles, tips.
- [ ] PDF download stub.
- [ ] Search trong guide.

### Sprint 3 (1.5 tuần) – Invest nội dung
- [ ] 6 sectors + filter chip + project cards.
- [ ] Project detail sheet.
- [ ] Policy + Process + Resources sections.
- [ ] Form liên hệ + validation.

### Sprint 4 (1 tuần) – i18n + mobile
- [ ] Hoàn thiện 5 ngôn ngữ.
- [ ] Chốt mobile responsive.
- [ ] Test trên iPhone SE / iPad / desktop full.

### Sprint 5 (sau) – Nâng cao
- [ ] Lớp bản đồ KCN GeoJSON tích hợp Leaflet.
- [ ] Map view filter theo dự án (link 2 chiều với Invest view).
- [ ] AI hỗ trợ mở rộng sang chủ đề đầu tư.
- [ ] Dashboard số liệu kinh tế (chart.js).

---

## 9. CHỐT YÊU CẦU TRƯỚC KHI CODE

1. ✅ **Theme**: dùng theme sáng + accent `#2bb6e6` như hiện tại (KHÔNG dark như mockup).
2. ✅ **Bottom-bar**: đổi *Khám phá → Cẩm nang* (icon book) và *Ưu đãi → Đầu tư* (icon biểu đồ tăng `bar-chart`).
3. ✅ **Ngôn ngữ MVP**: chỉ **VI + EN**. Cấu trúc i18n vẫn để mở để sau bổ sung KR/JP/CN.
4. ⏸ **Form liên hệ**: tạm gác – chỉ render UI form, submit log ra console/alert "Cảm ơn…". Tích hợp endpoint sau.
5. ⏸ **Logo**: chưa cần đổi – tái dùng logo hiện có (vòng tia trong `#loading` + chữ "VR360 · Lâm Đồng").
6. ✅ **Dữ liệu dự án**: tạo **data mẫu dạng JSON** trong `data/invest-projects.json` (~10 dự án giả định bám theo các KCN/dự án có thật ở Lâm Đồng). Toàn bộ data Guide/Invest đều ở dạng JSON thuần (xem mục 4.6) để dễ swap sang API thật sau này.

---

*Khung đã chốt – sẵn sàng triển khai Sprint 1 khi có lệnh.*
