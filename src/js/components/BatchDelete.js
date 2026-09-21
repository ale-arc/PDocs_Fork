import { deleteDocuments, seiUrl } from '../functions/batchDelete.js';

export default function initialize() {
  if (document.getElementById('pdocs-delete-dialog')) return;
  let treeDocument;
  let treeObserver;
  let running = false;
  let cancelled = false;
  let selectionActive = false;
  const selected = new Map();
  const frameListeners = new WeakSet();
  const toggle = document.createElement('button');
  toggle.id = 'pdocs-delete-toggle';
  toggle.type = 'button';
  toggle.hidden = true;
  toggle.setAttribute('aria-pressed', 'false');
  toggle.addEventListener('click', () => {
    if (running || dialog.open) return;
    selectionActive = !selectionActive;
    toggle.setAttribute('aria-pressed', String(selectionActive));
    if (!selectionActive) {
      selected.clear();
      treeDocument?.querySelectorAll('.pdocs-delete-checkbox').forEach(input => { input.checked = false; });
    }
    const frame = document.getElementById('ifrArvore');
    if (frame && treeDocument) decorate(frame);
  });
  document.body.append(toggle);
  const dialog = document.createElement('dialog');
  dialog.id = 'pdocs-delete-dialog';
  dialog.setAttribute('aria-labelledby', 'pdocs-delete-title');
  dialog.innerHTML = `
    <h2 id="pdocs-delete-title">Excluir documentos selecionados</h2>
    <p>A exclusão é definitiva. Confira a lista antes de confirmar. O SEI só permite excluir documentos autorizados para sua unidade e usuário.</p>
    <p class="pdocs-delete-summary" role="status" aria-live="polite"></p>
    <ul class="pdocs-delete-results"></ul>
    <div class="pdocs-delete-buttons">
      <button type="button" data-action="confirm">Confirmar exclusão</button>
      <button type="button" data-action="stop" hidden>Interromper após o documento atual</button>
      <button type="button" data-action="refresh" hidden>Atualizar processo</button>
      <button type="button" data-action="close">Cancelar</button>
    </div>`;
  document.body.append(dialog);
  const confirm = dialog.querySelector('[data-action="confirm"]');
  const stop = dialog.querySelector('[data-action="stop"]');
  const refresh = dialog.querySelector('[data-action="refresh"]');
  const close = dialog.querySelector('[data-action="close"]');
  const summary = dialog.querySelector('.pdocs-delete-summary');
  const list = dialog.querySelector('ul');
  close.addEventListener('click', () => dialog.close());
  refresh.addEventListener('click', () => window.location.reload());
  stop.addEventListener('click', () => {
    cancelled = true;
    stop.disabled = true;
    summary.textContent = 'Interrompendo após conferir o documento atual…';
  });
  dialog.addEventListener('cancel', event => { if (running) event.preventDefault(); });
  const beforeUnload = event => { event.preventDefault(); event.returnValue = ''; };

  function updateControls() {
    if (!treeDocument) return;
    const button = treeDocument.getElementById('pdocs-delete-selected');
    if (button) {
      button.textContent = `Excluir selecionados (${selected.size})`;
      button.disabled = running || selected.size === 0;
    }
    treeDocument.querySelectorAll('[data-pdocs-delete-control]').forEach(control => { control.disabled = running; });
    treeDocument.querySelectorAll('input[data-attempted]').forEach(input => { input.disabled = true; });
    const toolbar = treeDocument.getElementById('pdocs-delete-toolbar');
    if (toolbar) toolbar.hidden = !selectionActive;
    treeDocument.querySelectorAll('.pdocs-delete-checkbox').forEach(input => { input.hidden = !selectionActive; });
    document.querySelectorAll('iframe').forEach(frame => {
      try {
        frame.contentDocument?.getElementById('pdocs-delete-icon')?.setAttribute('aria-pressed', String(selectionActive));
      } catch { /* Ignore unrelated cross-origin frames. */ }
    });
  }

  function openConfirmation(frame) {
    if (running || !selected.size) return;
    const documents = [...selected.values()].map(({ id, label }) => ({ id, label }));
    const sourceDocument = treeDocument;
    const sourceUrl = frame.contentWindow.location.href;
    const expanded = sourceDocument.querySelector('a[id^="anchorAP"]')?.getAttribute('href');
    const treeAction = new URL(sourceUrl).searchParams.get('acao');
    const treeUrl = (expanded && seiUrl(expanded, sourceUrl, treeAction)) || seiUrl(sourceUrl, sourceUrl, treeAction);
    const rows = new Map();
    list.replaceChildren();
    for (const doc of documents) {
      const row = document.createElement('li');
      row.textContent = doc.label;
      list.append(row);
      rows.set(doc.id, row);
    }
    summary.textContent = `${documents.length} documento(s) selecionado(s).`;
    confirm.hidden = false;
    confirm.disabled = false;
    stop.hidden = true;
    stop.disabled = false;
    refresh.hidden = true;
    close.disabled = false;
    close.textContent = 'Cancelar';
    dialog.showModal();
    close.focus();
    confirm.onclick = async () => {
      if (running) return;
      if (!treeUrl || frame.contentDocument !== sourceDocument || frame.contentWindow.location.href !== sourceUrl) {
        summary.textContent = 'A árvore mudou. Feche esta janela e selecione os documentos novamente.';
        confirm.disabled = true;
        return;
      }
      running = true;
      cancelled = false;
      confirm.hidden = true;
      stop.hidden = false;
      close.disabled = true;
      updateControls();
      window.addEventListener('beforeunload', beforeUnload);
      summary.textContent = 'Excluindo e conferindo os documentos no SEI…';
      try {
        const results = await deleteDocuments({
          documents, treeUrl,
          isCancelled: () => cancelled || frame.contentDocument !== sourceDocument || frame.contentWindow.location.href !== sourceUrl,
          onResult: result => {
            const row = rows.get(result.id);
            row.dataset.status = result.status;
            row.textContent = `${result.label} — ${result.message}`;
          }
        });
        const deleted = results.filter(result => result.status === 'deleted').length;
        summary.textContent = `${deleted} de ${documents.length} documento(s) excluído(s). Confira os resultados abaixo e atualize o processo.`;
        // Re-enable only after a fresh tree is loaded; uncertain results must not be retried accidentally.
        for (const doc of documents) {
          selected.delete(doc.id);
          const input = sourceDocument.getElementById(`pdocs-delete-${doc.id}`);
          if (input) { input.checked = false; input.dataset.attempted = 'true'; }
        }
      } catch {
        summary.textContent = 'O lote foi interrompido. Atualize o processo e confira os documentos antes de tentar novamente.';
      } finally {
        running = false;
        window.removeEventListener('beforeunload', beforeUnload);
        stop.hidden = true;
        close.disabled = false;
        close.textContent = 'Fechar';
        refresh.hidden = false;
        updateControls();
        sourceDocument.querySelectorAll('input[data-attempted]').forEach(input => { input.disabled = true; });
      }
    };
  }

  function decorate(frame) {
    if (!treeDocument?.body) return;
    if (!selectionActive) { updateControls(); return; }
    if (!treeDocument.getElementById('pdocs-delete-toolbar')) {
      const style = treeDocument.createElement('link');
      style.rel = 'stylesheet';
      style.href = chrome.runtime.getURL('src/css/batchDelete.css');
      treeDocument.head.append(style);
      const toolbar = treeDocument.createElement('div');
      toolbar.id = 'pdocs-delete-toolbar';
      toolbar.innerHTML = `<strong>PDocs · Ações em lote</strong>
        <button type="button" data-pdocs-delete-control data-action="all">Marcar exibidos</button>
        <button type="button" data-pdocs-delete-control data-action="none">Limpar</button>
        <button type="button" id="pdocs-delete-selected" disabled>Excluir selecionados (0)</button>
        <button type="button" data-pdocs-delete-control data-action="exit">Sair da seleção</button>`;
      treeDocument.body.prepend(toolbar);
      toolbar.querySelector('[data-action="all"]').addEventListener('click', () => {
        treeDocument.querySelectorAll('input.pdocs-delete-checkbox:not(:disabled)').forEach(input => {
          if (input.getClientRects().length) { input.checked = true; input.dispatchEvent(new Event('change')); }
        });
      });
      toolbar.querySelector('[data-action="none"]').addEventListener('click', () => {
        selected.clear();
        treeDocument.querySelectorAll('input.pdocs-delete-checkbox').forEach(input => { input.checked = false; });
        updateControls();
      });
      toolbar.querySelector('#pdocs-delete-selected').addEventListener('click', () => openConfirmation(frame));
      toolbar.querySelector('[data-action="exit"]').addEventListener('click', () => toggle.click());
    }
    const liveIds = new Set();
    treeDocument.querySelectorAll('a[id^="anchor"][href]').forEach(anchor => {
      const id = anchor.id.match(/^anchor(\d+)$/)?.[1];
      if (!id || !seiUrl(anchor.getAttribute('href'), frame.contentWindow.location.href, 'arvore_visualizar', id)) return;
      liveIds.add(id);
      if (treeDocument.getElementById(`pdocs-delete-${id}`)) return;
      const label = anchor.textContent.trim() || `Documento ${id}`;
      const input = treeDocument.createElement('input');
      input.type = 'checkbox';
      input.id = `pdocs-delete-${id}`;
      input.className = 'pdocs-delete-checkbox';
      input.setAttribute('data-pdocs-delete-control', '');
      input.setAttribute('aria-label', `Selecionar ${label} para exclusão`);
      input.title = `Selecionar ${label} para exclusão`;
      input.checked = selected.has(id);
      input.addEventListener('change', () => {
        if (input.checked) selected.set(id, { id, label }); else selected.delete(id);
        updateControls();
      });
      anchor.before(input);
    });
    for (const id of selected.keys()) if (!liveIds.has(id)) selected.delete(id);
    updateControls();
    treeDocument.querySelectorAll('input[data-attempted]').forEach(input => { input.disabled = true; });
  }

  function attach() {
    const frame = document.getElementById('ifrArvore');
    if (!frame) return;
    if (!frameListeners.has(frame)) {
      frame.addEventListener('load', attach);
      frameListeners.add(frame);
    }
    try {
      const next = frame.contentDocument;
      if (!next?.body || next === treeDocument || !next.querySelector('#divArvore, a[id^="anchor"]')) return;
      treeObserver?.disconnect();
      selected.clear();
      treeDocument = next;
      decorate(frame);
      treeObserver = new MutationObserver(() => {
        // Disconnect while decorating so our labels/checkboxes don't cause an observer loop.
        treeObserver.disconnect();
        decorate(frame);
        treeObserver.observe(next.body, { childList: true, subtree: true });
      });
      treeObserver.observe(next.body, { childList: true, subtree: true });
    } catch { /* A non-SEI/cross-origin frame is not a process tree. */ }
  }
  new MutationObserver(attach).observe(document.body, { childList: true, subtree: true });
  attach();
}
