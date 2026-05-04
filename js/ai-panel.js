/* =========================================================
   MODULE: AI PANEL – Sprint 5 stub
   - Click bb-ai (#bb-ai-btn) → mở panel với FAQ pre-canned.
   - Câu hỏi chia 2 nhóm: Đầu tư / Du lịch.
   - Click 1 câu hỏi → hiển thị câu trả lời (canned text).
   - Khi có LLM/endpoint thật, swap _renderAnswer() bằng fetch.
   ========================================================= */

window.AiPanel = (() => {
  let faqData = null;
  let panel = null;
  let activeCat = 'invest';

  async function ensureData() {
    if (faqData) return faqData;
    const res = await fetch('data/ai-invest-faq.json');
    if (!res.ok) throw new Error('Không tải được ai-invest-faq.json');
    faqData = await res.json();
    return faqData;
  }

  function buildShell() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'ai-panel';
    panel.innerHTML = `
      <div class="ai-pn-head">
        <div class="ai-pn-orb">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/></svg>
        </div>
        <div class="ai-pn-h">
          <div class="ai-pn-title">Trợ lý AI Lâm Đồng</div>
          <div class="ai-pn-sub">Hỏi nhanh về đầu tư &amp; du lịch</div>
        </div>
        <button class="ai-pn-x" type="button" aria-label="Đóng">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
        </button>
      </div>
      <div class="ai-pn-tabs"></div>
      <div class="ai-pn-body"></div>
      <div class="ai-pn-foot">
        <span class="ai-pn-stub">Phản hồi mẫu — chưa kết nối LLM thật.</span>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('.ai-pn-x').addEventListener('click', close);
    return panel;
  }

  function renderTabs() {
    const tabs = panel.querySelector('.ai-pn-tabs');
    tabs.innerHTML = faqData.categories.map(c => `
      <button type="button" class="ai-pn-tab${c.id === activeCat ? ' active' : ''}" data-cat="${c.id}">${c.label}</button>
    `).join('');
    tabs.onclick = e => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      activeCat = btn.dataset.cat;
      renderTabs();
      renderQuestions();
    };
  }

  function renderQuestions() {
    const cat = faqData.categories.find(c => c.id === activeCat) || faqData.categories[0];
    const body = panel.querySelector('.ai-pn-body');
    body.innerHTML = `
      <div class="ai-pn-prompts">
        ${cat.questions.map((q, i) => `
          <button type="button" class="ai-pn-q" data-i="${i}">
            <span>${q.q}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        `).join('')}
      </div>
      <div class="ai-pn-answer" hidden></div>
    `;
    body.querySelector('.ai-pn-prompts').onclick = e => {
      const btn = e.target.closest('.ai-pn-q');
      if (!btn) return;
      const idx = +btn.dataset.i;
      const q = cat.questions[idx];
      renderAnswer(q);
    };
  }

  function renderAnswer(q) {
    const ans = panel.querySelector('.ai-pn-answer');
    ans.hidden = false;
    ans.innerHTML = `
      <div class="ai-pn-bubble user"><b>Bạn:</b> ${q.q}</div>
      <div class="ai-pn-bubble bot">
        <b>AI:</b> ${q.a}
      </div>
      <button type="button" class="ai-pn-back">← Câu hỏi khác</button>
    `;
    ans.querySelector('.ai-pn-back').onclick = () => { ans.hidden = true; ans.innerHTML = ''; };
    ans.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function open() {
    try {
      await ensureData();
      buildShell();
      renderTabs();
      renderQuestions();
      panel.classList.add('open');
      document.body.classList.add('ai-panel-open');
    } catch (err) {
      console.error('[ai-panel]', err);
      alert('Không tải được dữ liệu AI: ' + err.message);
    }
  }

  function close() {
    if (panel) panel.classList.remove('open');
    document.body.classList.remove('ai-panel-open');
  }

  function toggle() {
    if (panel && panel.classList.contains('open')) close();
    else open();
  }

  return { open, close, toggle };
})();
