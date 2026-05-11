# BotChat AI Panel — Tài liệu kỹ thuật & UI/UX (port-ready spec)

> Mục đích: tài liệu này mô tả **đầy đủ** cấu trúc, hành vi, giao diện, animation, state machine, i18n và phụ thuộc của module **AI Panel (botchat)** trong dự án `vr360`, đủ chi tiết để **port sang dự án khác** mà không cần đọc lại source.

- **Module gốc:** [js/ai-panel.js](../js/ai-panel.js) (386 dòng, IIFE, expose `window.AiPanel`)
- **Style:** [css/style.css](../css/style.css) (block từ dòng ~2195 trở đi, cùng biến `--ai-neon`, `--bb-h` ở dòng ~344, ~484)
- **HTML entry:** nút float `#bb-chat-btn` trong [index.html](../index.html#L199-L208)
- **i18n:** namespace `ai.*` và `bb.ai` trong [data/i18n/vi.json](../data/i18n/vi.json#L311-L332) và `en.json`
- **Asset:** avatar AI `assets/img/2.png` (ảnh tròn 38×38 hiển thị trong header panel + nút float)

---

## 1. Tổng quan chức năng

BotChat là **trợ lý AI hợp nhất voice + text** theo phong cách ChatGPT / Gemini mobile:

| Khả năng | Mô tả |
|---|---|
| Text chat | Gõ câu hỏi → gửi → bubble user xuất hiện → bot trả lời (stub, có thể swap LLM) |
| Voice chat | Bấm mic → ghi âm → STT → bot trả lời bằng TTS → tự động lắng nghe tiếp (vòng lặp conversational) |
| Waveform realtime | Sóng âm 24 bars phản ứng theo **âm lượng mic thực tế** (Web Audio API + AnalyserNode) |
| Demo lịch sử | Khi mở lần đầu hiện 5 bubble mẫu (3 bot + 2 user) đa ngôn ngữ |
| Session history | Mọi bubble user/bot trong phiên được lưu và render lại khi đổi ngôn ngữ / mở-đóng panel |
| Đa ngôn ngữ | Re-render toàn panel khi bắt sự kiện `langchange` |
| Trạng thái voice | 4 state: `idle` / `listening` / `thinking` / `speaking` — đổi màu chấm + label |
| Capsule mode | Khi voice active, panel **biến hình** thành thanh capsule ngang nằm cạnh nút float |

Không cần backend: voice dùng Web Speech API của browser, reply dùng stub `t('ai.replyStub', { q })`. Để gắn LLM thật → thay hàm `generateReply()`.

---

## 2. Phụ thuộc & yêu cầu môi trường

### Browser APIs
- **SpeechRecognition** / `webkitSpeechRecognition` (Chrome/Edge desktop & Android; **Safari iOS không hỗ trợ ổn định** — graceful fallback bằng `alert(t('ai.noSR'))`).
- **SpeechSynthesis** (`window.speechSynthesis`) cho TTS.
- **getUserMedia** (mic permission) cho analyser waveform.
- **AudioContext** / `webkitAudioContext` + **AnalyserNode** (fftSize 64, smoothing 0.6).
- **requestAnimationFrame** cho vòng lặp vẽ sóng.

### JS globals tùy chọn (chỉ là hook nhẹ, **không bắt buộc** khi port):
- `window.I18n.t(key, vars)` — nếu không có thì `t()` trả về chính `key` ⇒ panel vẫn chạy với text thô.
- `window.UI.updateBBIndicator()` — cập nhật indicator dưới bottom-bar, có thể bỏ.
- Class `.bbt` (bottom-bar tab buttons) + `#bb-indicator` — chỉ liên quan layout chung của vr360, **không thuộc botchat**.

### Sự kiện DOM custom
- `langchange` (window): khi đổi ngôn ngữ, panel sẽ rebuild shell + renderHistory.

---

## 3. Cấu trúc DOM (panel khi mở)

```html
<div id="ai-panel" class="open">
  <div class="ai-pn-head">
    <div class="ai-pn-orb"><img src="assets/img/2.png" alt="AI"/></div>
    <div class="ai-pn-h">
      <div class="ai-pn-title">Trợ lý Du lịch Lâm Đồng</div>
      <div class="ai-pn-sub">
        <span class="ai-pn-status-dot"></span>
        <span class="ai-pn-status-text">Đang hoạt động</span>
      </div>
    </div>
    <button class="ai-pn-x" aria-label="Đóng">✕</button>
  </div>

  <div class="ai-pn-body">
    <div class="ai-pn-chat">
      <div class="ai-pn-bubble bot">…</div>
      <div class="ai-pn-bubble user">…</div>
      …
    </div>
  </div>

  <div class="ai-pn-composer">
    <input type="text" class="ai-pn-input" placeholder="Nhập câu hỏi…"/>
    <button class="ai-pn-mic"><svg>…mic icon…</svg></button>
    <button class="ai-pn-send" disabled><svg>…paper-plane…</svg></button>
    <div class="ai-pn-waveform" aria-hidden="true">
      <span></span> × 24
    </div>
  </div>
</div>
```

Và **nút trigger** đứng độc lập ngoài panel:
```html
<button class="bb-float bb-chat-btn" id="bb-chat-btn">
  <img src="assets/img/2.png" alt="AI"/>
  <span class="bb-mic-indicator">
    <svg>…mic icon nhỏ…</svg>
  </span>
</button>
```

---

## 4. State machine

```
                    ┌──────────────────────────────────────┐
                    │            CLOSED (panel ẩn)         │
                    └──────────────┬───────────────────────┘
                            click #bb-chat-btn
                                   │
                    ┌──────────────▼───────────────────────┐
                    │   OPEN / IDLE  (text chat)           │
                    │   - input + mic + send hiển thị      │
                    │   - status dot xanh, "Đang hoạt động"│
                    └─┬────────────────────────┬───────────┘
       click mic │                        │ click ✕ / Esc / outside (tùy port)
                 ▼                        ▼
   ┌──────────────────────────┐    CLOSED
   │ VOICE / LISTENING        │
   │ - panel biến capsule     │◀──┐
   │ - dot xanh neon, pulse   │   │ TTS xong
   │ - waveform realtime mic  │   │
   └────────┬─────────────────┘   │
            │ user nói ≥ 2 ký tự  │
            ▼                     │
   ┌──────────────────────────┐   │
   │ THINKING                 │   │
   │ - dot vàng, "Đang suy…"  │   │
   └────────┬─────────────────┘   │
            │ 450ms                │
            ▼                     │
   ┌──────────────────────────┐   │
   │ SPEAKING                 │───┘
   │ - dot xanh dương, TTS    │
   └──────────────────────────┘
```

State được biểu hiện bằng class trên `#ai-panel`:
- `.open` — panel hiện ra (opacity + transform).
- `.listening` / `.thinking` / `.speaking` — capsule mode + animation.

Và 1 class trên `<body>`:
- `body.ai-panel-open` — các UI khác có thể phản ứng (ví dụ ẩn bubble indicator).
- `body.ai-voice-active` — nút float mic indicator pulse mạnh hơn.

---

## 5. UI / UX chi tiết

### 5.1 Nút float trigger
- Hình tròn 64×64 (var `--bb-h`), avatar PNG full bleed, bo tròn 50%.
- Vị trí: `position: fixed; bottom: 16px`. Mobile bám mép trái `--bb-edge-left` (do JS chính của vr360 đặt theo vị trí bottom-bar). Desktop ≥769px: `left: 20px`.
- Box-shadow `0 6px 22px rgba(0,0,0,.18)`, hover `translateY(-1px)`.
- Mic indicator nhỏ 22×22 góc dưới-phải, màu `--ai-neon (#16d472)`, viền trắng 2.5px. Khi `body.ai-voice-active` → animation `bbMicPulse 1.2s` (scale 1 ↔ 1.15 + glow neon).

### 5.2 Panel — chế độ chat text (idle)
- Vị trí: `fixed; left: var(--bb-edge-left, 16px); bottom: calc(--bb-h + 28px)` — nằm **trên** nút float.
- Width 360px (mobile `max-width: calc(100vw - 32px)`), max-height 70vh.
- Background trắng, `border-radius: 16px`, shadow `0 14px 36px rgba(0,0,0,.22)`.
- Transition mở: `opacity .22s, transform .22s` — vào từ `translateY(20px) scale(.96)` → `translateY(0) scale(1)`.

**Header `.ai-pn-head`** (padding 14×16, border-bottom `#eef0f2`):
- Orb avatar 38×38 tròn, ảnh `assets/img/2.png` cover, shadow nhẹ.
- Title font 14px / 800 weight / `#1a1a1a`.
- Sub-row: dot 8×8 màu `--ai-neon` + status text 11.5px `#16a35a`. Dot animation `aiPnStatusPulse 1.6s` (box-shadow nhịp).
- Nút ✕: 28×28 tròn, nền `#f4f6f8`, hover `#e8f6fc` + đổi sang `--icon-blue`.

**Body `.ai-pn-body`** (scroll vùng chat):
- `flex: 1; overflow-y: auto; padding: 14px 14px; background: #f7f9fb`.
- Scrollbar mảnh 4px, thumb `#d0d5db`.
- Auto-scroll xuống cuối sau mỗi bubble mới (`scrollChatToEnd`).

**Bubble `.ai-pn-bubble`**:
- Padding 10×14, radius 14, font 13/1.5, max-width 85%, word-wrap break-word.
- Animation vào: `aiBubbleIn .25s` (opacity 0→1, translateY 6→0).
- `.user`: nền `--icon-blue`, chữ trắng, align-self end, `border-bottom-right-radius: 4px` (đuôi).
- `.bot`: nền trắng, chữ `#1a2330`, align-self start, `border-bottom-left-radius: 4px`, shadow nhẹ.

**Composer `.ai-pn-composer`** (padding 10/16/14, border-top `#eef0f2`, nền `#fafbfc`):
- Layout flex ngang, gap 8px.
- `.ai-pn-input`: flex 1, height 36, padding 0 14, border 1.5 `#e4e8ec`, radius 18, font 13. Focus → border `--icon-blue`.
- `.ai-pn-mic`: 36×36 tròn, nền trắng, viền 1.5 `--ai-neon`, icon mic neon. Hover nền `--ai-neon-soft`.
- `.ai-pn-send`: 36×36 tròn, nền `--icon-blue`, chữ trắng, paper-plane SVG. Disabled khi input rỗng (`opacity .45`). Hover nền `--icon-blue-dark` + lift.

### 5.3 Voice / capsule mode
Khi `#ai-panel` có class `.listening / .thinking / .speaking`:

- **Vị trí đổi**: panel rời khỏi vị trí trên nút float, neo **bên phải nút float** ngang hàng (cùng `bottom: 16px`). Right offset = `calc(--bb-edge-right + --bb-h + 12px)`. Desktop: `right: calc(20px + --bb-h + 12px)`.
- **Hình dạng**: width auto (min 270, max 300), height = `--bb-h`, radius `--bb-h / 2` ⇒ thành **viên thuốc ngang**.
- **Ẩn**: `.ai-pn-head`, `.ai-pn-body`, `.ai-pn-input`, `.ai-pn-send` đều `display: none` / hidden.
- **Layout còn lại**: `[mic 44×44 bên trái glow neon] [waveform flex:1 sóng âm trải đều]`.
- Mic animation `aiMicPulseSmall 1.4s` (box-shadow ring 3px → 7px nhịp).
- Mobile ≤768: mic 40×40, icon 16×16.

**Đổi màu theo state** (chỉ ở dot + sub text khi còn ở dạng panel; trong capsule ẩn header nên user nhận biết qua mic + sóng):
| State | dot color | sub text |
|---|---|---|
| listening | `--ai-neon #16d472` | "Đang lắng nghe…" |
| thinking | `#f0a020` (cam) | "Đang suy nghĩ…" |
| speaking | `--icon-blue #2bb6e6` | "Đang trả lời…" |

### 5.4 Waveform
- 24 thẻ `<span>` con, mỗi cái 3×100% (capsule mode) / 4px width (panel mode), radius 2, nền `--ai-neon`, glow `0 0 6px var(--ai-neon), 0 0 12px var(--ai-neon-strong)`.
- **Idle CSS animation** `aiWaveBar 1s ease-in-out infinite` với delay stagger từng bar — tạo sóng chạy nhẹ khi đang chờ.
- **Listening: tắt CSS animation**, JS gọi `requestAnimationFrame` đọc `analyser.getByteFrequencyData(data)` mỗi frame, set:
  - `scaleY = 0.15 + (v/255) * 1.4` (baseline 0.15 không biến mất)
  - `opacity = 0.4 + (v/255) * 0.6`
- **Phân bố bin đối xứng**: bar giữa lấy bin tần số thấp (bass), bar 2 đầu lấy bin cao — `binIdx = floor(|i - mid| * binCount / mid)`. Cảm giác sóng tỏa đều từ giữa.

---

## 6. Logic JS chính (ai-panel.js)

### 6.1 IIFE & state
```js
window.AiPanel = (() => {
  let panel = null;                 // singleton DOM
  const DEMO_KEYS = [...];          // 5 cặp { role, k }
  const sessionHistory = [];        // user-generated bubbles { role, text }
  let recognition, voiceActive, listening, speaking, lastTranscript;
  let audioCtx, analyser, micStream, micSource, waveformRAF;
  // ...
  return { open, close, toggle };
})();
```

### 6.2 API public
| Hàm | Mô tả |
|---|---|
| `AiPanel.open()` | Build shell nếu chưa có → render history → add `.open` + `body.ai-panel-open` |
| `AiPanel.close()` | Exit voice nếu đang active → remove `.open` → re-activate Home tab |
| `AiPanel.toggle()` | Open/close theo trạng thái hiện tại |

### 6.3 Pipeline text
```
input.keydown(Enter)/sendBtn.click
   → sendTextQuestion(text)
   → appendBubble('user', text)         // push vào sessionHistory + DOM
   → setTimeout(450ms)
   → appendBubble('bot', generateReply(text))
```
`generateReply(q)` hiện chỉ là `t('ai.replyStub', { q })`. **Khi port + tích LLM thật**: hàm này biến thành async, gọi fetch tới API, có thể thêm bubble loading skeleton trước.

### 6.4 Pipeline voice
```
mic click → enterVoiceMode()
   → getRecognition()              // tạo SpeechRecognition, lang vi-VN/en-US theo <html lang>
   → body.classList.add('ai-voice-active')
   → startListening()
       → setVoiceState('listening')
       → startWaveform()           // getUserMedia + AudioContext + analyser + RAF loop
       → recognition.start()
       → onresult: gộp interim + final → lastTranscript
       → onend: nếu lastTranscript.length ≥ 2 → handleVoicePrompt(t)
                                   else → setTimeout(400, startListening)  // tự nghe lại
       → onerror:
            'not-allowed' / 'service-not-allowed' → alert(micDenied) + exitVoiceMode
            'network' → alert(networkErr) + exitVoiceMode
            khác → setTimeout(600, startListening)

handleVoicePrompt(text):
   → setVoiceState('thinking')
   → appendBubble('user', text)
   → setTimeout(450)
   → appendBubble('bot', reply)
   → speak(reply)
       → SpeechSynthesisUtterance, lang khớp recognition.lang
       → setVoiceState('speaking')
       → onend / onerror → if voiceActive: startListening()    // VÒNG LẶP
```
**Thoát voice**: bấm lại mic ⇒ `exitVoiceMode()`: clear state, stop recognition, `speechSynthesis.cancel()`, `teardownAudio()` (disconnect source/analyser, stop tracks, close AudioContext).

### 6.5 Render & i18n re-render
- `renderHistory()` = `DEMO_KEYS.map(t).join('') + sessionHistory.map(...)` rồi gán `chat.innerHTML`.
- `bubbleHtml(role, text)` HTML-escape qua `escapeHtml` (chống XSS với user input).
- Khi `langchange` fire: lưu `wasOpen`, gỡ panel, build lại, render lại, restore `.open`. Demo bubble đổi ngôn ngữ; sessionHistory giữ nguyên (vì là text user đã gõ).

---

## 7. Biến CSS cần có

Đặt trong `:root` của dự án đích (giữ tên hoặc thay đồng loạt):

```css
:root {
  --bb-h: 64px;                    /* chiều cao nút float + capsule */
  --bb-edge-left: 16px;            /* JS có thể override theo bottom-bar */
  --bb-edge-right: 16px;
  --icon-blue: #2bb6e6;            /* màu chính bubble user + send */
  --icon-blue-dark: #1a9bcb;
  --ai-neon: #16d472;              /* màu thương hiệu voice */
  --ai-neon-soft: rgba(22,212,114,.18);
  --ai-neon-strong: rgba(22,212,114,.55);
}
```

---

## 8. i18n keys cần dịch

Đường dẫn `ai.*` (xem [data/i18n/vi.json:311-332](../data/i18n/vi.json#L311-L332)):

| Key | VI mẫu |
|---|---|
| `ai.title` | "Trợ lý Du lịch Lâm Đồng" *(đổi theo dự án)* |
| `ai.active` | "Đang hoạt động" |
| `ai.listening` | "Đang lắng nghe…" |
| `ai.thinking` | "Đang suy nghĩ…" |
| `ai.speaking` | "Đang trả lời…" |
| `ai.placeholder` | "Nhập câu hỏi…" |
| `ai.send` | "Gửi" |
| `ai.voice` | "Trò chuyện bằng giọng nói" |
| `ai.close` | "Đóng" |
| `ai.noSR` | "Trình duyệt của bạn chưa hỗ trợ nhận dạng giọng nói…" |
| `ai.micDenied` | "Bạn cần cho phép truy cập micro…" |
| `ai.networkErr` | "Không thể kết nối dịch vụ nhận dạng giọng nói…" |
| `ai.replyStub` | "Đây là phản hồi mẫu… Câu hỏi của bạn: \"{q}\"…" |
| `ai.demo.g1` | bubble bot demo 1 |
| `ai.demo.u1` | bubble user demo 1 |
| `ai.demo.g2` | bubble bot demo 2 |
| `ai.demo.u2` | bubble user demo 2 |
| `ai.demo.g3` | bubble bot demo 3 |
| `bb.ai` | tooltip nút float "Chat với trợ lý AI (voice + text)" |

Nếu không có hệ i18n, hardcode trực tiếp trong `buildShell()` + `DEMO_KEYS` (đổi sang `{ role, text }`) và bỏ listener `langchange`.

---

## 9. Animation/Keyframes cần copy

```css
@keyframes aiBubbleIn        { from {opacity:0; transform:translateY(6px);} to {opacity:1; transform:translateY(0);} }
@keyframes aiPnStatusPulse   { 0%,100% {box-shadow:0 0 0 2px rgba(22,212,114,.22);} 50% {box-shadow:0 0 0 5px rgba(22,212,114,.10);} }
@keyframes aiMicPulseSmall   { 0%,100% {box-shadow:0 0 0 3px var(--ai-neon-soft), 0 0 14px var(--ai-neon);} 50% {box-shadow:0 0 0 7px rgba(22,212,114,.10), 0 0 22px var(--ai-neon);} }
@keyframes aiWaveBar         { 0%,100% {transform:scaleY(.3);} 50% {transform:scaleY(1);} }
@keyframes bbMicPulse        { 0%,100% {transform:scale(1);} 50% {transform:scale(1.15);} }
```

Bars trong waveform có delay stagger riêng: `:nth-child(1)..nth-child(24)` mỗi cái `animation-delay` tăng dần ~0.04s, kèm `height` % khác nhau (18%, 28%, 38%…) để tạo profile sóng tự nhiên.

---

## 10. Trách nhiệm bảo mật & quyền

- **HTTPS bắt buộc** cho `getUserMedia` + `SpeechRecognition` (trừ localhost).
- Lần đầu bấm mic → browser hỏi quyền microphone. Nếu user từ chối → alert `ai.micDenied` rồi tự `exitVoiceMode()`.
- **Web Speech API (Chrome) cần Internet** vì Chrome gửi audio lên server Google. Trường hợp `error.network` → alert + exit (không retry để tránh spam).
- HTML escape mọi text user (`escapeHtml`) trước khi nhúng vào innerHTML.

---

## 11. Hướng dẫn port nhanh sang dự án mới

1. **Copy file**: [js/ai-panel.js](../js/ai-panel.js) (giữ nguyên), thêm vào `<script defer>` trước khi gọi `AiPanel.open()`.
2. **Copy CSS**: trích các selector `#ai-panel*`, `.ai-pn-*`, `.bb-chat-btn`, `.bb-mic-indicator`, `.bb-float`, và 5 keyframes ở mục 9. Dán vào stylesheet của project mới.
3. **Thêm biến CSS** ở mục 7 vào `:root`.
4. **Thêm HTML nút trigger**:
   ```html
   <button class="bb-float bb-chat-btn" id="bb-chat-btn">
     <img src="path/to/avatar.png" alt="AI"/>
     <span class="bb-mic-indicator"><svg>mic icon</svg></span>
   </button>
   <script>
     document.getElementById('bb-chat-btn')
       .addEventListener('click', () => window.AiPanel.toggle());
   </script>
   ```
5. **Cung cấp asset** avatar (project gốc dùng `assets/img/2.png`, 1:1, recommended ≥ 120×120).
6. **i18n**: hoặc bê namespace `ai.*` + tạo `window.I18n.t(k, vars)`, hoặc sửa `t()` trong `ai-panel.js` thành lookup map cứng / template string.
7. **Tùy biến brand**: đổi `--ai-neon` (voice), `--icon-blue` (bubble user + send), title trong `ai.title`, demo bubbles.
8. **Tích LLM thật**: thay `generateReply(q)` thành async fetch tới backend của bạn (OpenAI / Anthropic / Gemini / nội bộ). Khuyến nghị thêm bubble "…" loading trước khi resolve, và stream token nếu API hỗ trợ.
9. **Bỏ phụ thuộc vr360**: xoá đoạn `document.querySelectorAll('.bbt')…` và lời gọi `window.UI.updateBBIndicator()` trong `open()` / `close()` nếu project mới không có bottom-bar.
10. **Kiểm thử**: Chrome desktop (full features), Edge, Firefox (SpeechRecognition KHÔNG có → mic sẽ alert noSR, text vẫn chạy), Safari iOS (text-only).

---

## 12. Checklist kiểm tra sau khi port

- [ ] Bấm nút float → panel trượt lên mượt 220ms.
- [ ] 5 bubble demo hiện đúng theo ngôn ngữ hiện hành.
- [ ] Gõ text + Enter → user bubble + bot bubble sau 450ms.
- [ ] Bấm mic → panel co lại thành capsule ngang bên phải nút float.
- [ ] Sóng âm 24 bars **phản ứng đúng theo âm lượng** mic (không phải animation tĩnh).
- [ ] Nói → state đổi sang thinking (dot vàng) → speaking (dot xanh dương) → tự quay về listening.
- [ ] Bấm mic lần 2 trong capsule → thoát voice, panel mở lại dạng chat full.
- [ ] Bấm ✕ → panel đóng, mic + TTS giải phóng (Task Manager: không còn process audio).
- [ ] Đổi ngôn ngữ → demo dịch lại, sessionHistory giữ nguyên.
- [ ] Mobile (≤ 768px): panel max-width = viewport - 32, capsule mic 40×40.
- [ ] Từ chối mic permission → alert tiếng địa phương, exit gracefully.

---

## 13. Hạn chế đã biết

- **Firefox** không có `SpeechRecognition` → mic không dùng được; text vẫn OK.
- **Safari iOS** Web Speech không ổn định; thường fail im lặng.
- Reply là **stub** — không có context history gửi cho LLM. Khi gắn LLM, tự thêm phần build messages từ `sessionHistory`.
- Voice mode **không có nút "huỷ giữa chừng"** khi TTS đang nói — phải bấm mic để thoát hẳn. Có thể bổ sung nút stop riêng nếu cần.
- Khi đổi ngôn ngữ, input đang gõ dở sẽ mất (acceptable trade-off, có nhận xét trong code dòng 370-372).
- `sessionHistory` chỉ lưu trong RAM — refresh page là mất. Muốn persist → wrap getter/setter vào `localStorage`.

---

*File này tự đủ. Đem nó cùng `ai-panel.js`, block CSS `#ai-panel*`, biến `--ai-neon` và avatar PNG sang dự án mới — botchat hoạt động trong < 10 phút.*
