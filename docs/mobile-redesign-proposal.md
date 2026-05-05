# Đề xuất tái cấu trúc UI Mobile — Gộp Voice + Text AI Chat

**Ngày:** 2026-05-05
**Phạm vi:** Chỉ áp dụng cho **Mobile** (portrait + landscape). Desktop **giữ nguyên**.
**Mục tiêu:** Gộp `voice chat` + `bot chat AI` thành **một entity duy nhất** dạng panel mở rộng, đồng thời tái sắp xếp bottom-nav và `#vr-info` để giải phóng không gian.

---

## 1. Trạng thái hiện tại (Mobile)

### 1.1 Bottom navigation (`#bottom-bar`)
Thứ tự nút từ trái → phải:
1. `[data-view="map"]` — **Trang chủ** (Home)
2. `#bb-ai-btn` (`.bb-ai`) — **AI Hỗ trợ** (voice chat, dạng mic + sóng âm)
3. `[data-view="guide"]` — **Cẩm nang** (Guide)

### 1.2 Hai nút floating tròn (`.bb-float`) — nằm ngang hàng `#bottom-bar`
- `#bb-vr-btn` (`.bb-vr-btn`) — **mép trái**, mở chế độ VR kính. Background xanh `--icon-blue`.
- `#bb-chat-btn` (`.bb-chat-btn`) — **mép phải**, mở `#ai-panel` (text chat AI, file `js/ai-panel.js`). Hiện avatar `assets/img/2.png`.

→ JS đo width `#bottom-bar` và set CSS var `--bb-edge-left` / `--bb-edge-right` để 2 nút này bám sát 2 đầu bottom-bar.

### 1.3 `#mobile-panel-btn`
Nút mở `#right-panel` (danh sách địa điểm), hiện ở **mép phải giữa màn hình** (mobile portrait), thay thế `#panel-toggle` của desktop.

### 1.4 `#vr-info` (chỉ hiện ở 3D mode)
- Vị trí: **bottom-left**, anchor đáy, nằm phía **trên** `#bottom-bar` (`bottom ≈ 80–110px`).
- Animation hiện tại: collapse/expand bằng `#vr-info-x` (chevron), mở rộng **lên trên** (chiều cao tăng lên).
- FAB `#vr-info-fab` hiện khi panel collapsed.

---

## 2. Đề xuất thay đổi

### 2.1 Bottom nav — layout mới

```
┌─────────────────────────────────────────────────┐
│  [VR kính]    [🏠 Home – giữa]    [📖 Guide]    │
└─────────────────────────────────────────────────┘
```

**Thay đổi cụ thể:**
| Hành động | Element |
|---|---|
| **Bỏ** | `#bb-ai-btn` (nút voice mic + sóng âm trong bottom-bar) |
| **Bỏ vị trí cũ** của `#bb-vr-btn` (nút float trái) | Đưa nội dung sang dạng `<button class="bbt">` trong bottom-bar |
| **Thêm vào bottom-bar** | Nút VR kính, nằm **bên trái Home** |
| **Giữ nguyên** | Nút Guide ở bên phải |
| **Home** | Đẩy vào **giữa** (giờ là item thứ 2/3) |

**Thứ tự DOM mới trong `#bottom-bar`:**
```html
<button class="bbt" id="bb-vr-nav">…icon kính VR…<span>VR 360</span></button>
<button class="bbt active" data-view="map">…icon home…<span>Trang chủ</span></button>
<button class="bbt" data-view="guide">…icon book…<span>Cẩm nang</span></button>
```

### 2.2 Bot AI gộp (voice + text) — thay thế `#bb-chat-btn` ở vị trí `#bb-vr-btn` cũ

**Vị trí:** **Mép trái** (chiếm chỗ `#bb-vr-btn` cũ — tức là `left: var(--bb-edge-left, 16px)`).

> ⚠️ Làm rõ theo trao đổi: "nó nằm sát bên trái, không phải vị trí vr cũ, mà là vr-info cũ".
> → Hiểu là: nút float bot AI nằm **mép trái ngang hàng bottom-bar** (chính là chỗ `#bb-vr-btn` cũ chiếm). `#vr-info` cũ ở bottom-left thì đang được dời đi nơi khác (xem 2.3), nên slot trống đó dành cho bot AI.

**Hành vi mới:**
- Là một **nút float tròn** (giống `.bb-float` cũ) khi đóng.
- Khi bấm → **mở panel mở rộng** (không phải dropdown nhỏ như `#ai-panel` hiện tại).
- Panel chứa **đồng thời**:
  - Khung chat text (input + lịch sử tin nhắn).
  - Nút **mic** để voice input → kết quả voice được điền vào input chat (hoặc gửi thẳng).
- Các state: `idle` (nút tròn) → `open` (panel) → `listening` (đang ghi âm, hiển thị sóng).

### 2.3 `#vr-info` — vị trí mới

**Hiện tại:** bottom-left, mở rộng lên trên.
**Mới:** **top-right**, nằm **ngay bên dưới `#mobile-panel-btn`**.

**Tương tác:**
1. Mặc định: `#vr-info` collapsed, dạng pill nhỏ dưới `#mobile-panel-btn`.
2. Khi bấm `#vr-info-x` → mở rộng **xuống dưới** (không phải lên trên như cũ).
3. Animation **bề ngang giữ nguyên**: vẫn "mở rộng sang phải" như hiện tại — chỉ đổi trục dọc từ `bottom→up` thành `top→down`.
4. **Khi search dropdown mở** (`#search-results.open` hoặc `#xa-dd.open`):
   - `#vr-info` bị **đẩy xuống** để nằm bên dưới dropdown (không che dropdown).
   - Dùng selector kiểu `body:has(#search-results.open) #vr-info { top: <dropdown-bottom + gap>; }`.

**Vị trí cũ bottom-left** giờ trống → là chỗ cho bot AI mới (mục 2.2).

---

## 3. Mapping file → thay đổi cụ thể

### 3.1 `index.html`
| Dòng | Thay đổi |
|---|---|
| 198–200 | **Xóa** `#bb-vr-btn` (chuyển vào bottom-bar) |
| 201–203 | **Thay** `#bb-chat-btn` → đổi id thành `#bb-ai-float` (hoặc giữ id, đổi behavior). Avatar vẫn dùng `assets/img/2.png` nhưng giờ mở panel gộp voice+text |
| 206–232 | **Cấu trúc lại** `#bottom-bar`:<br>– Xóa `#bb-ai-btn` (212–226)<br>– Thêm nút VR mới ở đầu (trước `[data-view="map"]`) |
| 306–324 | `#vr-info` giữ nguyên markup, chỉ đổi CSS vị trí |

### 3.2 `css/style.css`
| Dòng | Thay đổi |
|---|---|
| 348–399 | `.bb-float` — đổi rule cho nút bot AI mới ở mép trái thay vì phải. Bỏ `.bb-vr-btn` rule (374, 376, 378) |
| 457–603 | **Xóa** toàn bộ block `.bb-ai` (nút mic voice) trong bottom-bar |
| 1127–1230 | `#vr-info` & `#vr-info-fab` — **viết lại** anchor: từ `bottom: …` → `top: …` (ngay dưới `#mobile-panel-btn`). Đổi chiều mở rộng |
| 1556–1603 | Giữ nguyên `#mobile-panel-btn`, `#mobile-more-btn` |
| 1690–1693 | Mở rộng selector `body:has(#search-results.open)` để cũng push `#vr-info` xuống |
| 1781–1789 | Mobile portrait rules — bỏ `.bb-float` cũ (vr-btn), thêm rule mới cho bot AI float |
| 1920–1980, 2030–2090, 2115– | `#vr-info` mobile portrait + landscape — viết lại toạ độ |
| 2259+ | `#ai-panel` — anchor lại theo nút float mới (mép trái thay vì phải) |

### 3.3 `js/ui.js`
- Hàm đo và set `--bb-edge-left` / `--bb-edge-right` cho `.bb-float`: chỉ còn 1 nút (bot AI bên trái) → có thể bỏ `--bb-edge-right`.
- Handler `#bb-ai-btn` (voice) trong bottom-bar: **xóa**.
- Logic toggle `#vr-info.collapsed`: cập nhật để animation đi xuống thay vì lên (nếu có hard-code transform/height).
- Thêm listener: khi `#search-results` hoặc `#xa-dd` mở/đóng → toggle class trên `body` (đã có `:has` thì không cần JS).

### 3.4 `js/ai-panel.js`
- Anchor panel: đổi từ `right` → `left` (bám theo nút float mới ở mép trái).
- **Tích hợp voice input:** thêm nút mic trong panel. Logic ghi âm có thể tái dùng từ handler `#bb-ai-btn` cũ trước khi xóa khỏi bottom-bar.
- States: `idle / open / listening / responding` để hiển thị sóng âm khi voice mode active.

---

## 4. Quyết định đã chốt (2026-05-05)

1. **Icon nút VR trong bottom-bar:** ✅ **Sử dụng lại** SVG kính VR hiện có (path `M3 7h18…` ở dòng 199 cũ).
2. **Bot AI float:** ✅ **Giữ avatar `assets/img/2.png`** như hiện tại, **thêm mic indicator nhỏ** (badge ở góc dưới-phải nút) để báo nút này có voice.
3. **Voice mode trong panel:** ✅ Hành vi như **ChatGPT / Gemini voice chat** — đối thoại 2 chiều liên tục:
   - User nhấn mic → app lắng nghe (sóng âm).
   - Khi user dừng nói (silence detection) → tự động gửi prompt.
   - AI trả lời bằng giọng nói (TTS) + hiển thị transcript trong panel.
   - Mic vẫn active để user nói tiếp → vòng lặp tiếp tục cho đến khi user tắt voice mode.
4. **Slot dưới `#mobile-panel-btn` ở 2D mode:** ✅ **Để trống** (`#vr-info` chỉ render ở 3D).
5. **Animation khi search dropdown đẩy `#vr-info` xuống:** ✅ **Animate** — transition `top` mượt, không snap.

---

## 5. Thứ tự triển khai đề xuất

1. **Bước 1 — HTML restructure:** Sửa `index.html` (xóa `#bb-ai-btn`, đổi `#bb-vr-btn` thành `.bbt` trong bottom-bar, đổi `#bb-chat-btn` sang trái).
2. **Bước 2 — CSS layout:** Cập nhật `.bb-float`, `#bottom-bar`, `#vr-info` (vị trí mới + animation đảo trục).
3. **Bước 3 — JS cleanup:** Xóa handler voice trong `ui.js`, tích hợp vào `ai-panel.js`.
4. **Bước 4 — Voice integration trong panel:** Thêm UI mic + binding speech-to-text.
5. **Bước 5 — Test:** Mobile portrait + landscape, 2D + 3D mode, dropdown search push `#vr-info`.

---

**→ Sau khi anh review file này và confirm các câu hỏi ở mục 4, tôi sẽ bắt tay vào sửa code theo đúng thứ tự bước 1–5.**
