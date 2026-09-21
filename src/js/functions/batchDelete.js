// No page scripts are executed. URLs must come from SEI and retain their hashes.
export function seiUrl(value, base, action, documentId) {
  try {
    const url = new URL(value.replace(/&amp;/g, '&'), base);
    if (url.origin !== new URL(base).origin || !/\/controlador\.php$/.test(url.pathname)) return null;
    if (url.searchParams.get('acao') !== action) return null;
    if (documentId !== undefined && url.searchParams.get('id_documento') !== String(documentId)) return null;
    return url.href;
  } catch { return null; }
}

export function pageLinks(html) {
  // Handles HTML attributes and quoted URLs inside SEI's inline JavaScript.
  const decoded = html.replace(/\\x26|\\u0026/g, '&').replace(/\\\//g, '/');
  return decoded.match(/(?:https?:\/\/[^\s"'<>\\]+\/|\/?(?:[\w.-]+\/)*)controlador\.php\?[^\s"'<>\\]+/g) || [];
}

export function findAction(html, base, action, id) {
  return pageLinks(html).map(value => seiUrl(value, base, action, id)).find(Boolean) || null;
}

function treeIdentity(html) {
  return html.match(/Nos\s*\[\s*0\s*\]\s*=\s*new\s+infraArvoreNo\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/)?.slice(1).join(':');
}

export function treeSnapshot(html, base) {
  // A login/error page or a partial folder response must never prove deletion.
  if (!treeIdentity(html)) {
    throw new Error('O SEI não retornou uma árvore completa. Atualize o processo e confira os documentos.');
  }
  const ids = new Set();
  for (const link of pageLinks(html)) {
    const url = seiUrl(link, base, 'arvore_visualizar');
    if (url) {
      const id = new URL(url).searchParams.get('id_documento');
      if (/^\d+$/.test(id || '')) ids.add(id);
    }
  }
  // Also account for documents whose native node does not expose a view URL.
  for (const match of html.matchAll(/new\s+infraArvoreNo\s*\(\s*["']DOCUMENTO["']\s*,\s*["'](\d+)["']/g)) ids.add(match[1]);
  return ids;
}

export async function requestPage(url) {
  const response = await fetch(url, {
    credentials: 'same-origin', cache: 'no-store', redirect: 'error',
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`O SEI respondeu HTTP ${response.status}.`);
  const buffer = await response.arrayBuffer();
  const charset = response.headers.get('content-type')?.match(/charset=([^;\s]+)/i)?.[1] || 'utf-8';
  return new TextDecoder(charset).decode(buffer);
}

export async function deleteDocuments({ documents, treeUrl, request = requestPage, onResult = () => {}, isCancelled = () => false }) {
  const results = [];
  const report = (doc, status, message) => {
    const result = { ...doc, status, message };
    results.push(result);
    onResult(result);
  };
  const unique = [...new Map(documents.map(doc => [String(doc.id), doc])).values()];
  for (const doc of unique) {
    if (isCancelled()) break;
    let tree;
    let action;
    try {
      tree = await request(treeUrl);
      if (!treeSnapshot(tree, treeUrl).has(String(doc.id))) {
        report(doc, 'skipped', 'Documento não localizado na árvore atual.');
        continue;
      }
      action = findAction(tree, treeUrl, 'documento_excluir', doc.id);
      if (!action) {
        const view = findAction(tree, treeUrl, 'arvore_visualizar', doc.id);
        if (view) action = findAction(await request(view), treeUrl, 'documento_excluir', doc.id);
      }
      if (!action) {
        report(doc, 'skipped', 'O SEI não disponibilizou a ação Excluir para este documento.');
        continue;
      }
    } catch (error) {
      report(doc, 'error', error.message);
      break;
    }
    if (isCancelled()) break;
    // A failed request may still have reached the server. Never retry a deletion.
    let requestFailed = false;
    try { await request(action); } catch { requestFailed = true; }
    try {
      const updatedTree = await request(treeUrl);
      const remaining = treeSnapshot(updatedTree, treeUrl);
      if (treeIdentity(updatedTree) !== treeIdentity(tree) ||
          [...treeSnapshot(tree, treeUrl)].some(id => id !== String(doc.id) && !remaining.has(id))) {
        throw new Error('A árvore mudou de processo ou ficou incompleta.');
      }
      if (!remaining.has(String(doc.id))) {
        report(doc, 'deleted', 'Exclusão confirmada na árvore do SEI.');
      } else {
        report(doc, requestFailed ? 'uncertain' : 'error', requestFailed
          ? 'A requisição falhou e a exclusão não foi confirmada. Confira o processo antes de tentar novamente.'
          : 'O documento continua na árvore. O SEI não confirmou a exclusão; verifique a ação nativa Excluir.');
        break;
      }
    } catch {
      report(doc, 'uncertain', 'Não foi possível conferir a árvore após a exclusão. Confira o processo antes de tentar novamente.');
      break;
    }
  }
  for (const doc of unique) {
    if (!results.some(result => String(result.id) === String(doc.id))) report(doc, 'pending', 'Não executado: lote interrompido.');
  }
  return results;
}
