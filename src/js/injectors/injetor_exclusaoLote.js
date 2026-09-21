// Runs alongside the existing process tools, independently of jQuery and SEI Pro.
import(chrome.runtime.getURL('src/js/components/BatchDelete.js'))
  .then(({ default: initialize }) => initialize())
  .catch(() => console.error('PDocs: não foi possível carregar a exclusão em lote.'));
