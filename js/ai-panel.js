/* =========================================================
   MODULE: AI PANEL — gộp voice + text (ChatGPT/Gemini style)
   - Trang thuần du lịch: bỏ tabs Đầu tư/Du lịch, bỏ FAQ list.
   - Mở panel hiển thị demo đoạn chat về du lịch Lâm Đồng.
   - Composer: input text + mic + send. Bấm mic → voice mode (sóng âm).
   ========================================================= */

window.AiPanel = (() => {
  let panel = null;

  /* Demo lịch sử chat ban đầu — du lịch Lâm Đồng */
  const DEMO_HISTORY = [
    { role: 'bot',  text: 'Xin chào! Mình là trợ lý du lịch Lâm Đồng. Bạn muốn khám phá điểm đến nào hôm nay?' },
    { role: 'user', text: 'Đà Lạt có gì hay vào tháng này?' },
    { role: 'bot',  text: 'Tháng này Đà Lạt mát mẻ, lý tưởng để ngắm hoa dã quỳ vàng rực ven đường, dạo Hồ Xuân Hương lúc sớm và thưởng thức cà phê tại các quán view đồi thông.' },
    { role: 'user', text: 'Gợi ý vài thác nước đẹp gần Đà Lạt?' },
    { role: 'bot',  text: 'Bạn có thể ghé thác Pongour (~50km, hùng vĩ 7 tầng), thác Datanla (gần trung tâm, có máng trượt) và thác Voi (gắn với truyền thuyết K\'Ho).' },
  ];

  /* Voice state */
  let recognition = null;
  let voiceActive = false;
  let listening = false;
  let speaking = false;
  let lastTranscript = '';

  /* Web Audio API — đo volume thực tế từ mic */
  let audioCtx = null;
  let analyser = null;
  let micStream = null;
  let micSource = null;
  let waveformRAF = null;

  function buildShell() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'ai-panel';
    panel.innerHTML = `
      <div class="ai-pn-head">
        <div class="ai-pn-orb">
          <img src="assets/img/2.png" alt="AI" />
        </div>
        <div class="ai-pn-h">
          <div class="ai-pn-title">Trợ lý Du lịch Lâm Đồng</div>
          <div class="ai-pn-sub">
            <span class="ai-pn-status-dot" aria-hidden="true"></span>
            <span class="ai-pn-status-text">Đang hoạt động</span>
          </div>
        </div>
        <button class="ai-pn-x" type="button" aria-label="Đóng">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
        </button>
      </div>
      <div class="ai-pn-body">
        <div class="ai-pn-chat"></div>
      </div>
      <div class="ai-pn-composer">
        <input type="text" class="ai-pn-input" placeholder="Nhập câu hỏi…" />
        <button class="ai-pn-mic" type="button" title="Trò chuyện bằng giọng nói">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>
        </button>
        <button class="ai-pn-send" type="button" title="Gửi" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
        <div class="ai-pn-waveform" aria-hidden="true">
          ${'<span></span>'.repeat(24)}
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('.ai-pn-x').addEventListener('click', close);

    const input = panel.querySelector('.ai-pn-input');
    const sendBtn = panel.querySelector('.ai-pn-send');
    const micBtn = panel.querySelector('.ai-pn-mic');
    input.addEventListener('input', () => {
      sendBtn.disabled = input.value.trim().length === 0;
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !sendBtn.disabled) sendTextQuestion(input.value.trim());
    });
    sendBtn.addEventListener('click', () => sendTextQuestion(input.value.trim()));
    micBtn.addEventListener('click', () => {
      if (voiceActive) exitVoiceMode();
      else enterVoiceMode();
    });

    return panel;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }

  function renderHistory() {
    const chat = panel.querySelector('.ai-pn-chat');
    chat.innerHTML = DEMO_HISTORY.map(m => bubbleHtml(m.role, m.text)).join('');
    scrollChatToEnd();
  }

  function bubbleHtml(role, text) {
    return `<div class="ai-pn-bubble ${role}">${escapeHtml(text)}</div>`;
  }

  function appendBubble(role, text) {
    const chat = panel.querySelector('.ai-pn-chat');
    chat.insertAdjacentHTML('beforeend', bubbleHtml(role, text));
    scrollChatToEnd();
  }

  function scrollChatToEnd() {
    const body = panel.querySelector('.ai-pn-body');
    body.scrollTop = body.scrollHeight;
  }

  function sendTextQuestion(text) {
    if (!text) return;
    appendBubble('user', text);
    const input = panel.querySelector('.ai-pn-input');
    input.value = '';
    panel.querySelector('.ai-pn-send').disabled = true;
    /* Stub trả lời — sau này swap bằng LLM */
    setTimeout(() => appendBubble('bot', generateReply(text)), 450);
  }

  function generateReply(query) {
    return 'Đây là phản hồi mẫu (chưa kết nối LLM thật). Câu hỏi của bạn: "' + query + '". Bạn có thể hỏi mình về điểm đến, lịch trình, ẩm thực hoặc thời tiết Lâm Đồng.';
  }

  /* === Voice === */

  function getRecognition() {
    if (recognition) return recognition;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    recognition = new SR();
    recognition.lang = (document.documentElement.lang || 'vi') === 'en' ? 'en-US' : 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    return recognition;
  }

  /* Khởi tạo Web Audio: getUserMedia → AnalyserNode → đo frequency data theo
     thời gian thực và set scaleY cho từng bar trong .ai-pn-waveform. */
  async function startWaveform() {
    try {
      if (!micStream) {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
      }
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      if (!analyser) {
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;          // 32 bins — chia cho 24 bars vẫn dư
        analyser.smoothingTimeConstant = 0.6;
      }
      if (!micSource) {
        micSource = audioCtx.createMediaStreamSource(micStream);
        micSource.connect(analyser);
      }
      const bars = panel.querySelectorAll('.ai-pn-waveform > span');
      const data = new Uint8Array(analyser.frequencyBinCount);
      const N = bars.length;
      const tick = () => {
        analyser.getByteFrequencyData(data);
        for (let i = 0; i < N; i++) {
          /* Bar đối xứng: bar giữa lấy bin thấp (bass), bar 2 đầu lấy bin cao */
          const mid = (N - 1) / 2;
          const dist = Math.abs(i - mid);
          const binIdx = Math.min(data.length - 1, Math.floor(dist * (data.length / mid)));
          const v = data[binIdx] / 255;          // 0..1
          const scale = 0.15 + v * 1.4;          // baseline 0.15 để bar không hoàn toàn biến mất
          bars[i].style.transform = `scaleY(${scale})`;
          bars[i].style.opacity = (0.4 + v * 0.6).toFixed(2);
        }
        waveformRAF = requestAnimationFrame(tick);
      };
      waveformRAF = requestAnimationFrame(tick);
    } catch (err) {
      console.warn('[ai-panel] mic audio analysis failed:', err);
    }
  }

  function stopWaveform() {
    if (waveformRAF) {
      cancelAnimationFrame(waveformRAF);
      waveformRAF = null;
    }
    /* Reset bars về baseline để CSS animation idle có thể tiếp quản lại */
    if (panel) {
      panel.querySelectorAll('.ai-pn-waveform > span').forEach(b => {
        b.style.transform = '';
        b.style.opacity = '';
      });
    }
  }

  function teardownAudio() {
    stopWaveform();
    if (micSource) { try { micSource.disconnect(); } catch (_) {} micSource = null; }
    if (analyser) { try { analyser.disconnect(); } catch (_) {} analyser = null; }
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    if (audioCtx) { try { audioCtx.close(); } catch (_) {} audioCtx = null; }
  }

  function setVoiceState(state) {
    panel.classList.remove('listening', 'thinking', 'speaking');
    if (state) panel.classList.add(state);
    const statusText = panel.querySelector('.ai-pn-status-text');
    if (statusText) {
      statusText.textContent = ({
        listening: 'Đang lắng nghe…',
        thinking:  'Đang suy nghĩ…',
        speaking:  'Đang trả lời…',
      })[state] || 'Đang hoạt động';
    }
  }

  function enterVoiceMode() {
    const rec = getRecognition();
    if (!rec) {
      alert('Trình duyệt của bạn chưa hỗ trợ nhận dạng giọng nói. Hãy thử Chrome hoặc Edge mới nhất.');
      return;
    }
    voiceActive = true;
    document.body.classList.add('ai-voice-active');
    startListening();
  }

  function exitVoiceMode() {
    voiceActive = false;
    setVoiceState(null);
    document.body.classList.remove('ai-voice-active');
    stopListening();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    speaking = false;
    /* Trả mic + đóng AudioContext để giải phóng tài nguyên */
    teardownAudio();
  }

  function startListening() {
    if (!voiceActive) return;
    const rec = getRecognition();
    if (!rec || listening) return;
    setVoiceState('listening');
    lastTranscript = '';
    /* Bật analyser đo volume mic → sóng âm chạy theo âm lượng thực */
    startWaveform();
    try {
      rec.onresult = e => {
        let interim = '', final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        lastTranscript = (final || interim).trim();
      };
      rec.onerror = ev => {
        console.warn('[ai-panel] recognition error:', ev.error);
        listening = false;
        if (voiceActive && ev.error !== 'aborted' && ev.error !== 'not-allowed') {
          setTimeout(() => startListening(), 600);
        } else if (ev.error === 'not-allowed') {
          alert('Bạn cần cho phép truy cập micro để dùng chế độ giọng nói.');
          exitVoiceMode();
        }
      };
      rec.onend = () => {
        listening = false;
        if (!voiceActive) return;
        const t = lastTranscript.trim();
        if (t.length >= 2) handleVoicePrompt(t);
        else setTimeout(() => startListening(), 400);
      };
      rec.start();
      listening = true;
    } catch (err) {
      console.warn('[ai-panel] start listening failed:', err);
      listening = false;
    }
  }

  function stopListening() {
    if (!recognition || !listening) return;
    try { recognition.stop(); } catch (_) {}
    listening = false;
    stopWaveform();
  }

  function handleVoicePrompt(text) {
    setVoiceState('thinking');
    appendBubble('user', text);
    const ans = generateReply(text);
    setTimeout(() => {
      appendBubble('bot', ans);
      speak(ans);
    }, 450);
  }

  function speak(text) {
    if (!window.speechSynthesis) {
      if (voiceActive) setTimeout(() => startListening(), 800);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = recognition?.lang || 'vi-VN';
    u.rate = 1.0;
    u.pitch = 1.0;
    speaking = true;
    setVoiceState('speaking');
    u.onend = () => {
      speaking = false;
      if (voiceActive) startListening();
    };
    u.onerror = () => {
      speaking = false;
      if (voiceActive) startListening();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function open() {
    buildShell();
    renderHistory();
    panel.classList.add('open');
    document.body.classList.add('ai-panel-open');
    /* Deactivate tất cả bbt — bubble indicator tự ẩn theo rule body.ai-panel-open #bb-indicator */
    document.querySelectorAll('.bbt').forEach(b => b.classList.remove('active'));
  }

  function close() {
    if (!panel) return;
    if (voiceActive) exitVoiceMode();
    panel.classList.remove('open');
    document.body.classList.remove('ai-panel-open');
    /* Re-activate Home, mở lại bubble */
    document.querySelectorAll('.bbt').forEach(b => b.classList.remove('active'));
    const home = document.querySelector('.bbt[data-view="map"]');
    if (home) home.classList.add('active');
    if (window.UI && typeof window.UI.updateBBIndicator === 'function') {
      window.UI.updateBBIndicator();
    }
  }

  function toggle() {
    if (panel && panel.classList.contains('open')) close();
    else open();
  }

  return { open, close, toggle };
})();
