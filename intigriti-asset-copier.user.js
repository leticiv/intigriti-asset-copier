// ==UserScript==
// @name         Intigriti — Asset Copier
// @namespace    https://github.com/leticiv/intigriti-asset-copier
// @version      2.0.0
// @description  Extrai todos os assets de um programa Intigriti e copia para o clipboard com um clique
// @author       leticiv
// @match        https://app.intigriti.com/programs/*
// @match        https://app.intigriti.com/researcher/programs/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  GM_addStyle(`
    @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Geist:wght@400;500;600&display=swap');

    /* ── tokens ─────────────────────────────────────────────────────────── */
    #iac-root {
      --bg:        #0a0a0a;
      --surface:   #111111;
      --elevated:  #181818;
      --border:    #1e1e1e;
      --border-hi: #2e2e2e;
      --text:      #e8e8e8;
      --muted:     #555;
      --accent:    #eb6f92;
      --accent-lo: rgba(235,111,146,.12);
      --green:     #3ddc84;
      --red:       #ff5f57;
      --mono:      'Geist Mono', monospace;
      --sans:      'Geist', sans-serif;
      --radius:    14px;
      --radius-sm: 8px;
    }

    /* ── botão principal ──────────────────────────────────────────────────
       posicionado no canto inferior ESQUERDO para não colidir com o
       chat widget da Intigriti (que fica no canto inferior direito)       */
    #iac-btn {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      background: var(--surface);
      color: var(--text);
      font-family: var(--mono);
      font-size: .75rem;
      font-weight: 500;
      letter-spacing: .06em;
      border: 1px solid var(--border-hi);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background .15s, border-color .15s, color .15s;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }
    #iac-btn:hover {
      background: var(--elevated);
      border-color: var(--accent);
      color: var(--accent);
    }
    #iac-btn:active { opacity: .8; }
    #iac-btn svg { flex-shrink: 0; }
    #iac-btn .iac-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
      animation: iac-pulse 2.4s ease-in-out infinite;
      flex-shrink: 0;
    }
    @keyframes iac-pulse {
      0%,100% { opacity: 1; transform: scale(1); }
      50%      { opacity: .4; transform: scale(.65); }
    }

    /* ── toast ───────────────────────────────────────────────────────────── */
    #iac-toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%) translateY(80px);
      z-index: 999999;
      padding: 10px 18px;
      background: #1c1c1c;
      color: var(--text);
      font-family: var(--mono);
      font-size: .78rem;
      letter-spacing: .03em;
      border: 1px solid var(--border-hi);
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,.5);
      opacity: 0;
      pointer-events: none;
      white-space: pre-line;
      transition: opacity .2s ease-out, transform .25s cubic-bezier(.34,1.56,.64,1);
      -webkit-font-smoothing: antialiased;
    }
    #iac-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    #iac-toast.ok-toast  { border-color: var(--green); color: var(--green); }
    #iac-toast.err-toast { border-color: var(--red);   color: var(--red);   }

    /* ── overlay ─────────────────────────────────────────────────────────── */
    #iac-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 999998;
      background: rgba(0,0,0,.65);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-font-smoothing: antialiased;
    }

    /* ── modal ───────────────────────────────────────────────────────────── */
    #iac-modal {
      background: var(--surface);
      border: 1px solid var(--border-hi);
      border-radius: var(--radius);
      width: min(620px, 92vw);
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      gap: 0;
      animation: iac-slideUp .2s ease;
      overflow: hidden;
    }
    @keyframes iac-slideUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* header do modal */
    #iac-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px 16px;
      border-bottom: 1px solid var(--border);
      gap: 12px;
    }
    #iac-modal-wordmark {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--mono);
      font-size: .7rem;
      font-weight: 500;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: var(--muted);
    }
    #iac-modal-wordmark .iac-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
      flex-shrink: 0;
    }
    #iac-modal-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
    }
    .iac-badge {
      font-family: var(--mono);
      font-size: .68rem;
      letter-spacing: .06em;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 500;
    }
    .iac-badge-in  { background: rgba(61,220,132,.1);  color: var(--green); }
    .iac-badge-oos { background: rgba(255,95,87,.1);   color: var(--red);   }
    #iac-modal-close {
      background: none;
      border: 1px solid var(--border);
      color: var(--muted);
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      transition: color .15s, border-color .15s, background .15s;
      font-family: var(--mono);
    }
    #iac-modal-close:hover {
      color: var(--text);
      border-color: var(--border-hi);
      background: var(--elevated);
    }

    /* conteúdo */
    #iac-modal-pre {
      flex: 1;
      overflow-y: auto;
      background: var(--bg);
      border-top: none;
      border-bottom: 1px solid var(--border);
      padding: 16px 20px;
      white-space: pre;
      line-height: 1.75;
      color: var(--text);
      font-family: var(--mono);
      font-size: .8rem;
      letter-spacing: .03em;
      outline: none;
    }
    #iac-modal-pre::-webkit-scrollbar { width: 4px; }
    #iac-modal-pre::-webkit-scrollbar-track { background: transparent; }
    #iac-modal-pre::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 4px; }

    .iac-section-in  { color: var(--green); font-weight: 600; }
    .iac-section-oos { color: var(--red);   font-weight: 600; }

    /* rodapé do modal */
    #iac-modal-footer {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 20px;
      flex-wrap: wrap;
    }
    #iac-format-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--mono);
      font-size: .7rem;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    #iac-format-select {
      padding: 6px 10px;
      background: var(--bg);
      color: var(--text);
      border: 1px solid var(--border-hi);
      border-radius: var(--radius-sm);
      font-family: var(--mono);
      font-size: .75rem;
      outline: none;
      cursor: pointer;
      transition: border-color .15s;
    }
    #iac-format-select:focus { border-color: var(--accent); }

    .iac-action-btn {
      flex: 1 1 120px;
      padding: 8px 0;
      border-radius: var(--radius-sm);
      font-family: var(--mono);
      font-size: .75rem;
      font-weight: 500;
      letter-spacing: .06em;
      cursor: pointer;
      transition: background .15s, border-color .15s, color .15s, opacity .15s;
      border: 1px solid transparent;
    }
    #iac-copy-btn {
      background: var(--accent);
      color: #0a0a0a;
      border-color: var(--accent);
    }
    #iac-copy-btn:hover { opacity: .88; }
    #iac-close-btn {
      background: var(--elevated);
      color: var(--muted);
      border-color: var(--border-hi);
    }
    #iac-close-btn:hover { color: var(--text); border-color: var(--border-hi); }
  `);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const FORMAT_STORAGE_KEY = 'iac-output-format';
  const OUTPUT_FORMATS = new Set(['plain', 'json', 'csv']);
  const DEFAULT_OUTPUT_FORMAT = 'plain';

  function normalizeFormat(format) {
    return OUTPUT_FORMATS.has(format) ? format : DEFAULT_OUTPUT_FORMAT;
  }

  function getSavedFormat() {
    try { return normalizeFormat(GM_getValue(FORMAT_STORAGE_KEY, DEFAULT_OUTPUT_FORMAT)); }
    catch (_) { return DEFAULT_OUTPUT_FORMAT; }
  }

  function setSavedFormat(format) {
    try { GM_setValue(FORMAT_STORAGE_KEY, normalizeFormat(format)); }
    catch (_) { /* ignore */ }
  }

  function waitForAssets(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const nodes = document.querySelectorAll('lib-asset-detail');
        if (nodes.length > 0) return resolve(nodes);
        if (Date.now() - start > timeout) return reject(new Error('assets não encontrados'));
        setTimeout(check, 400);
      };
      check();
    });
  }

  function extractAssetName(node) {
    const span = node.querySelector('.asset-name span, .asset-name a');
    return span ? span.textContent.trim() : null;
  }

  function isOOS(node) {
    const tier = node.querySelector('.tier .copy');
    return tier && tier.textContent.trim().toLowerCase().includes('out of scope');
  }

  function getTier(node) {
    const tier = node.querySelector('.tier .copy');
    return tier ? tier.textContent.trim() : '';
  }

  function getType(node) {
    const type = node.querySelector('.type .copy');
    return type ? type.textContent.trim() : '';
  }

  async function collectAssets() {
    const nodes = await waitForAssets();
    const inScope = [], outOfScope = [];
    nodes.forEach(node => {
      const name = extractAssetName(node);
      if (!name) return;
      const entry = { name, tier: getTier(node), type: getType(node) };
      (isOOS(node) ? outOfScope : inScope).push(entry);
    });
    return { inScope, outOfScope };
  }

  function csvEscape(value) {
    const str = String(value ?? '');
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }

  function formatPlainAssets({ inScope, outOfScope }) {
    const lines = [];
    if (inScope.length)     { lines.push('## IN SCOPE ##');     inScope.forEach(a => lines.push(a.name)); }
    if (outOfScope.length)  { lines.push(''); lines.push('## OUT OF SCOPE ##'); outOfScope.forEach(a => lines.push(a.name)); }
    return lines.join('\n');
  }

  function formatJsonAssets({ inScope, outOfScope }) {
    return JSON.stringify({
      inScope:    inScope.map(({ name, type, tier }) => ({ name, type, tier })),
      outOfScope: outOfScope.map(({ name, type, tier }) => ({ name, type, tier })),
    }, null, 2);
  }

  function formatCsvAssets({ inScope, outOfScope }) {
    const rows = [
      ['name', 'type', 'tier', 'scope'],
      ...inScope.map(a => [a.name, a.type, a.tier, 'in-scope']),
      ...outOfScope.map(a => [a.name, a.type, a.tier, 'out-of-scope']),
    ];
    return rows.map(row => row.map(csvEscape).join(',')).join('\n');
  }

  function formatAssets(assets, format = DEFAULT_OUTPUT_FORMAT) {
    switch (normalizeFormat(format)) {
      case 'json': return formatJsonAssets(assets);
      case 'csv':  return formatCsvAssets(assets);
      default:     return formatPlainAssets(assets);
    }
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function renderModalText(text, format) {
    const escaped = escapeHtml(text);
    if (normalizeFormat(format) !== 'plain') return escaped;
    return escaped
      .replace(/## IN SCOPE ##/g,     '<span class="iac-section-in">## in scope ##</span>')
      .replace(/## OUT OF SCOPE ##/g, '<span class="iac-section-oos">## out of scope ##</span>');
  }

  // ─── Toast ────────────────────────────────────────────────────────────────
  function showToast(msg, type = '') {
    let el = document.getElementById('iac-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'iac-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = type === 'ok' ? 'ok-toast' : type === 'err' ? 'err-toast' : '';
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2800);
  }

  // ─── Modal ────────────────────────────────────────────────────────────────
  function showModal(assets, stats) {
    const existing = document.getElementById('iac-modal-overlay');
    if (existing) existing.remove();

    let selectedFormat = getSavedFormat();

    const overlay = document.createElement('div');
    overlay.id = 'iac-modal-overlay';
    // herdamos os tokens do root (sem body reset)
    overlay.innerHTML = `
      <div id="iac-root">
        <div id="iac-modal">
          <div id="iac-modal-header">
            <div id="iac-modal-wordmark">
              <div class="iac-dot"></div>
              asset copier
            </div>
            <div id="iac-modal-meta">
              <span class="iac-badge iac-badge-in">${stats.inScope} in-scope</span>
              <span class="iac-badge iac-badge-oos">${stats.outOfScope} oos</span>
            </div>
            <button id="iac-modal-close" title="fechar (esc)">✕</button>
          </div>
          <div id="iac-modal-pre" tabindex="0"></div>
          <div id="iac-modal-footer">
            <label id="iac-format-label" for="iac-format-select">
              format
              <select id="iac-format-select">
                <option value="plain">plain text</option>
                <option value="json">json</option>
                <option value="csv">csv</option>
              </select>
            </label>
            <button class="iac-action-btn" id="iac-copy-btn">copy all</button>
            <button class="iac-action-btn" id="iac-close-btn">close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const pre          = document.getElementById('iac-modal-pre');
    const formatSelect = document.getElementById('iac-format-select');
    const copyButton   = document.getElementById('iac-copy-btn');

    const closeModal = () => overlay.remove();

    const updatePreview = () => {
      const text = formatAssets(assets, selectedFormat);
      pre.innerHTML = renderModalText(text, selectedFormat);
    };

    formatSelect.value = selectedFormat;
    updatePreview();

    document.getElementById('iac-modal-close').addEventListener('click', closeModal);
    document.getElementById('iac-close-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    const escHandler = e => {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    formatSelect.addEventListener('change', () => {
      selectedFormat = normalizeFormat(formatSelect.value);
      setSavedFormat(selectedFormat);
      updatePreview();
    });

    copyButton.addEventListener('click', () => {
      const text = formatAssets(assets, selectedFormat);
      GM_setClipboard(text);
      showToast(`copiado — ${stats.inScope} in-scope · ${stats.outOfScope} oos`, 'ok');
      copyButton.textContent = '✓ copiado';
      setTimeout(() => {
        const btn = document.getElementById('iac-copy-btn');
        if (btn) btn.textContent = 'copy all';
      }, 2000);
    });
  }

  // ─── Botão principal ──────────────────────────────────────────────────────
  function injectButton() {
    if (document.getElementById('iac-btn')) return;

    // wrapper de tokens para o botão também
    const wrapper = document.createElement('div');
    wrapper.id = 'iac-root';

    const btn = document.createElement('button');
    btn.id = 'iac-btn';
    btn.title = 'extrair todos os assets desta página';
    btn.innerHTML = `
      <div class="iac-dot"></div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      copy assets
    `;

    btn.addEventListener('click', async () => {
      btn.style.opacity = '.5';
      btn.style.pointerEvents = 'none';

      const origHTML = btn.innerHTML;

      btn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
          style="animation: iac-spin .6s linear infinite">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        extraindo...
      `;

      try {
        const { inScope, outOfScope } = await collectAssets();

        if (!inScope.length && !outOfScope.length) {
          showToast('nenhum asset encontrado — a página carregou?', 'err');
          return;
        }

        showModal({ inScope, outOfScope }, { inScope: inScope.length, outOfScope: outOfScope.length });

      } catch (err) {
        showToast(`erro: ${err.message}`, 'err');
        console.error('[IAC]', err);
      } finally {
        btn.innerHTML = origHTML;
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
      }
    });

    wrapper.appendChild(btn);
    document.body.appendChild(wrapper);
  }

  // spin keyframe injetado separado para o estado de loading
  GM_addStyle(`
    @keyframes iac-spin { to { transform: rotate(360deg); } }
  `);

  // ─── Inicialização (SPA-aware) ─────────────────────────────────────────
  let lastUrl = location.href;

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(injectButton, 1200);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(injectButton, 1500);

})();
