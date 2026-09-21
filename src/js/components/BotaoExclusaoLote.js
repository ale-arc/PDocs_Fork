export default function BotaoExclusaoLote() {
  const insert = document.getElementById('btn-modal');
  if (!insert || document.getElementById('pdocs-delete-icon')) return;
  const button = document.createElement('a');
  button.id = 'pdocs-delete-icon';
  button.className = 'botaoSEI';
  button.href = '#';
  button.setAttribute('role', 'button');
  button.setAttribute('aria-label', 'Excluir documentos em lote');
  button.setAttribute('aria-pressed', window.parent.document.getElementById('pdocs-delete-toggle')?.getAttribute('aria-pressed') || 'false');
  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('src/img/excluir-lote.svg');
  icon.title = 'Excluir documentos em lote';
  icon.alt = 'Excluir documentos em lote';
  icon.width = 32;
  icon.height = 32;
  button.append(icon);
  button.addEventListener('click', event => {
    event.preventDefault();
    window.parent.document.getElementById('pdocs-delete-toggle')?.click();
  });
  button.addEventListener('keydown', event => {
    if (event.key === ' ') { event.preventDefault(); button.click(); }
  });
  insert.after(button);
}
