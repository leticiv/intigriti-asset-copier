// ==UserScript==
// @name         Intigriti — Asset Copier
// @namespace    https://github.com/you/intigriti-asset-copier
// @version      1.0.0
// @description  Extrai todos os assets de um programa Intigriti e copia para o clipboard com um clique
// @author       você
// @match        https://app.intigriti.com/programs/*
// @match        https://app.intigriti.com/researcher/programs/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ─── Estilos do painel ────────────────────────────────────────────────────
  GM_addStyle(`
    #iac-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: #6b46ff;
      color: #fff;
      font-family: 'Segoe UI', sans-serif;
      font-size: 13px;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(107,70,255,0.45);
      transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
      user-select: none;
    }
    #iac-btn:hover {
      background: #5533ee;
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(107,70,255,0.55);
    }
    #iac-btn:active { transform: scale(0.97); }
    #iac-btn svg { flex-shrink: 0; }

    #iac-toast {
      position: fixed;
      bottom: 80px;
      right: 24px;
      z-index: 99999;
      padding: 10px 16px;
      background: #1e1e2e;
      color: #cdd6f4;
      font-family: 'Segoe UI', sans-serif;
      font-size: 12px;
      border-radius: 8px;
      border-left: 3px solid #6b46ff;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.25s, transform 0.25s;
      pointer-events: none;
      white-space: pre-line;
      max-width: 280px;
    }
    #iac-toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    #iac-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 999998;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(3px);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #iac-modal {
      background: #1e1e2e;
      color: #cdd6f4;
      font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
      font-size: 12px;
      border-radius: 14px;
      padding: 24px;
      width: min(640px, 90vw);
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.6);
    }
    #iac-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: 'Segoe UI', sans-serif;
    }
    #iac-modal-title {
      font-size: 15px;
      font-weight: 700;
      color: #cba6f7;
    }
    #iac-modal-meta {
      font-size: 11px;
      color: #6c7086;
      font-family: 'Segoe UI', sans-serif;
    }
    #iac-modal-close {
      background: none;
      border: none;
      color: #6c7086;
      font-size: 20px;
      cursor: pointer;
      line-height: 1;
      padding: 2px 6px;
      border-radius: 6px;
      transition: color 0.15s, background 0.15s;
    }
    #iac-modal-close:hover { color: #cdd6f4; background: #313244; }
    #iac-modal-textarea {
      flex: 1;
      overflow-y: auto;
      background: #181825;
      border: 1px solid #313244;
      border-radius: 8px;
      padding: 14px;
      white-space: pre;
      line-height: 1.7;
      color: #cdd6f4;
      font-size: 12px;
      outline: none;
      resize: none;
    }
    .iac-section-header {
      color: #a6e3a1;
      font-weight: bold;
    }
    .iac-oos-header {
      color: #f38ba8;
      font-weight: bold;
    }
    #iac-modal-actions {
      display: flex;
      gap: 10px;
    }
    .iac-action-btn {
      flex: 1;
      padding: 9px 0;
      border: none;
      border-radius: 8px;
      font-family: 'Segoe UI', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: filter 0.15s;
    }
    .iac-action-btn:hover { filter: brightness(1.1); }
    #iac-copy-btn  { background: #6b46ff; color: #fff; }
    #iac-close-btn { background: #313244; color: #cdd6f4; }
  `);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Aguarda o DOM do Angular carregar os assets (até 10s) */
  function waitForAssets(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const nodes = document.querySelectorAll('lib-asset-detail');
        if (nodes.length > 0) return resolve(nodes);
        if (Date.now() - start > timeout) return reject(new Error('Assets não encontrados'));
        setTimeout(check, 400);
      };
      check();
    });
  }

  /** Extrai texto do asset-name de um lib-asset-detail */
  function extractAssetName(node) {
    const span = node.querySelector('.asset-name span, .asset-name a');
    return span ? span.textContent.trim() : null;
  }

  /** Verifica se o asset é OOS */
  function isOOS(node) {
    const tier = node.querySelector('.tier .copy');
    return tier && tier.textContent.trim().toLowerCase().includes('out of scope');
  }

  /** Obtém o tier label (ex: "Tier 2") */
  function getTier(node) {
    const tier = node.querySelector('.tier .copy');
    return tier ? tier.textContent.trim() : '';
  }

  /** Obtém o tipo (Wildcard, URL, etc.) */
  function getType(node) {
    const type = node.querySelector('.type .copy');
    return type ? type.textContent.trim() : '';
  }

  /** Coleta todos os assets e separa em in-scope e OOS */
  async function collectAssets() {
    const nodes = await waitForAssets();
    const inScope = [];
    const outOfScope = [];

    nodes.forEach(node => {
      const name = extractAssetName(node);
      if (!name) return;

      const tier = getTier(node);
      const type = getType(node);
      const entry = { name, tier, type };

      if (isOOS(node)) {
        outOfScope.push(entry);
      } else {
        inScope.push(entry);
      }
    });

    return { inScope, outOfScope };
  }

  /** Formata a lista de assets como texto simples (um por linha) */
  function formatAssets({ inScope, outOfScope }) {
    const lines = [];

    if (inScope.length) {
      lines.push('## IN SCOPE ##');
      inScope.forEach(a => lines.push(a.name));
    }

    if (outOfScope.length) {
      lines.push('');
      lines.push('## OUT OF SCOPE ##');
      outOfScope.forEach(a => lines.push(a.name));
    }

    return lines.join('\n');
  }

  // ─── Toast ────────────────────────────────────────────────────────────────
  function showToast(msg, duration = 3000) {
    let el = document.getElementById('iac-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'iac-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), duration);
  }

  // ─── Modal ────────────────────────────────────────────────────────────────
  function showModal(text, stats) {
    // remove modal anterior se existir
    const existing = document.getElementById('iac-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'iac-modal-overlay';

    const modal = document.createElement('div');
    modal.id = 'iac-modal';

    // header
    const header = document.createElement('div');
    header.id = 'iac-modal-header';
    header.innerHTML = `
      <div>
        <div id="iac-modal-title">📋 Intigriti Asset Copier</div>
        <div id="iac-modal-meta">${stats.inScope} in-scope · ${stats.outOfScope} out-of-scope</div>
      </div>
      <button id="iac-modal-close" title="Fechar">✕</button>
    `;

    // textarea (read-only com conteúdo colorido simulado via div)
    const pre = document.createElement('div');
    pre.id = 'iac-modal-textarea';
    pre.setAttribute('tabindex', '0');
    pre.contentEditable = 'false';

    // Renderiza com cores por seção
    const rendered = text.replace(/## IN SCOPE ##/g, '<span class="iac-section-header">## IN SCOPE ##</span>')
                         .replace(/## OUT OF SCOPE ##/g, '<span class="iac-oos-header">## OUT OF SCOPE ##</span>');
    pre.innerHTML = rendered.split('\n').join('\n');
    pre.style.whiteSpace = 'pre';

    // actions
    const actions = document.createElement('div');
    actions.id = 'iac-modal-actions';
    actions.innerHTML = `
      <button class="iac-action-btn" id="iac-copy-btn">⎘ Copiar tudo</button>
      <button class="iac-action-btn" id="iac-close-btn">Fechar</button>
    `;

    modal.appendChild(header);
    modal.appendChild(pre);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // eventos
    const closeModal = () => overlay.remove();

    document.getElementById('iac-modal-close').addEventListener('click', closeModal);
    document.getElementById('iac-close-btn').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
    });

    document.getElementById('iac-copy-btn').addEventListener('click', () => {
      GM_setClipboard(text);
      showToast(`✅ Copiado!\n${stats.inScope} in-scope + ${stats.outOfScope} OOS`);
      document.getElementById('iac-copy-btn').textContent = '✓ Copiado!';
      setTimeout(() => {
        const btn = document.getElementById('iac-copy-btn');
        if (btn) btn.textContent = '⎘ Copiar tudo';
      }, 2000);
    });
  }

  // ─── Botão principal ──────────────────────────────────────────────────────
  function injectButton() {
    if (document.getElementById('iac-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'iac-btn';
    btn.title = 'Extrair todos os assets desta página';
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      Copy Assets
    `;

    btn.addEventListener('click', async () => {
      btn.textContent = '⏳ Extraindo...';
      btn.disabled = true;

      try {
        const { inScope, outOfScope } = await collectAssets();

        if (inScope.length === 0 && outOfScope.length === 0) {
          showToast('⚠️ Nenhum asset encontrado.\nA página carregou os assets?');
          return;
        }

        const text = formatAssets({ inScope, outOfScope });
        showModal(text, { inScope: inScope.length, outOfScope: outOfScope.length });

      } catch (err) {
        showToast(`❌ Erro: ${err.message}`);
        console.error('[IAC]', err);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy Assets`;
      }
    });

    document.body.appendChild(btn);
  }

  // ─── Inicialização ────────────────────────────────────────────────────────
  // O Angular faz navegação SPA, então observamos mudanças de URL
  let lastUrl = location.href;

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // pequeno delay para o Angular renderizar a nova rota
      setTimeout(injectButton, 1200);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // injeção inicial
  setTimeout(injectButton, 1500);

})();
