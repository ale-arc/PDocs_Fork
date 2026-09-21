const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('src/js/functions/batchDelete.js', 'utf8');
const modulePromise = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const base = 'https://sei.example.br/sei/controlador.php?acao=procedimento_visualizar&id_procedimento=1&infra_hash=tree';
const url = (action, id) => `controlador.php?acao=${action}&id_documento=${id}&infra_hash=hash${id}`;
const tree = (ids, permitted = ids) => '<script>Nos[0] = new infraArvoreNo("PROCESSO", "1");\n' + ids.map((id, i) =>
  `Nos[${i + 1}] = new infraArvoreNo("DOCUMENTO", "${id}");\nNos[${i + 1}].src = '${url('arvore_visualizar', id)}';\n` +
  (permitted.includes(id) ? `Nos[${i + 1}].acoes = '<a href="${url('documento_excluir', id)}">Excluir</a>';` : '')
).join('\n') + '</script>';
const documents = ['12', '123'].map(id => ({ id, label: `Documento ${id}` }));

test('parses exact document/action IDs and preserves the signed native URL', async () => {
  const { findAction, seiUrl } = await modulePromise;
  assert.equal(findAction(tree(['123', '12']), base, 'documento_excluir', '12'), new URL(url('documento_excluir', '12'), base).href);
  assert.equal(seiUrl(url('documento_excluir', '123'), base, 'documento_excluir', '12'), null);
  assert.equal(seiUrl(url('documento_excluir_extra', '12'), base, 'documento_excluir', '12'), null);
  assert.equal(seiUrl('https://other.br/' + url('documento_excluir', '12'), base, 'documento_excluir', '12'), null);
  assert.equal(findAction(`<a href="${url('documento_excluir', '12').replaceAll('&', '&amp;')}">`, base, 'documento_excluir', '12'), new URL(url('documento_excluir', '12'), base).href);
});

test('rejects login, empty HTML and partial folder responses as deletion evidence', async () => {
  const { treeSnapshot } = await modulePromise;
  for (const html of ['', '<form>Login</form>', 'Nos[3] = new infraArvoreNo("DOCUMENTO", "12");']) {
    assert.throws(() => treeSnapshot(html, base), /árvore completa/);
  }
  assert.deepEqual([...treeSnapshot(tree(['12', '123']), base)].sort(), ['12', '123']);
  assert.equal(treeSnapshot(tree([]), base).size, 0);
});

test('deletes sequentially, deduplicates, and verifies each document before the next', async () => {
  const { deleteDocuments } = await modulePromise;
  const ids = new Set(['12', '123']);
  const requests = [];
  const results = await deleteDocuments({ documents: [...documents, documents[0]], treeUrl: base, request: async value => {
    const link = new URL(value);
    const action = link.searchParams.get('acao');
    requests.push(action);
    if (action === 'documento_excluir') { ids.delete(link.searchParams.get('id_documento')); return ''; }
    return tree([...ids]);
  }});
  assert.deepEqual(results.map(result => result.status), ['deleted', 'deleted']);
  assert.deepEqual(requests, ['procedimento_visualizar', 'documento_excluir', 'procedimento_visualizar', 'procedimento_visualizar', 'documento_excluir', 'procedimento_visualizar']);
});

test('HTTP 200 without deletion is a failure and stops subsequent deletions', async () => {
  const { deleteDocuments } = await modulePromise;
  const deleted = [];
  const results = await deleteDocuments({ documents, treeUrl: base, request: async value => {
    const link = new URL(value);
    if (link.searchParams.get('acao') === 'documento_excluir') { deleted.push(link.searchParams.get('id_documento')); return '<p>Sem permissão</p>'; }
    return tree(['12', '123']);
  }});
  assert.deepEqual(deleted, ['12']);
  assert.deepEqual(results.map(result => result.status), ['error', 'pending']);
});

test('documents without a native delete action are skipped, not force-deleted', async () => {
  const { deleteDocuments } = await modulePromise;
  const requests = [];
  const results = await deleteDocuments({ documents, treeUrl: base, request: async value => {
    requests.push(value);
    return value === base ? tree(['12', '123'], []) : '<p>Documento assinado</p>';
  }});
  assert.deepEqual(results.map(result => result.status), ['skipped', 'skipped']);
  assert.equal(requests.some(value => value.includes('acao=documento_excluir')), false);
});

test('finds delete action in the document toolbar when absent from the tree', async () => {
  const { deleteDocuments } = await modulePromise;
  let deleted = false;
  const results = await deleteDocuments({ documents: [documents[0]], treeUrl: base, request: async value => {
    const action = new URL(value).searchParams.get('acao');
    if (action === 'procedimento_visualizar') return tree(deleted ? [] : ['12'], []);
    if (action === 'arvore_visualizar') return `<script>location.href = '${url('documento_excluir', '12')}';</script>`;
    deleted = true;
    return '';
  }});
  assert.equal(results[0].status, 'deleted');
});

test('network failure after server deletion is reconciled without repeating the action', async () => {
  const { deleteDocuments } = await modulePromise;
  let deletes = 0;
  const results = await deleteDocuments({ documents: [documents[0]], treeUrl: base, request: async value => {
    if (new URL(value).searchParams.get('acao') === 'documento_excluir') { deletes++; throw new Error('Network error'); }
    return tree(deletes ? [] : ['12']);
  }});
  assert.equal(deletes, 1);
  assert.equal(results[0].status, 'deleted');
});

test('unverifiable response after deletion stops the batch with an uncertain result', async () => {
  const { deleteDocuments } = await modulePromise;
  let deletes = 0;
  const results = await deleteDocuments({ documents, treeUrl: base, request: async value => {
    if (new URL(value).searchParams.get('acao') === 'documento_excluir') { deletes++; return ''; }
    return deletes ? '<form>Login</form>' : tree(['12', '123']);
  }});
  assert.equal(deletes, 1);
  assert.deepEqual(results.map(result => result.status), ['uncertain', 'pending']);
});

test('network failure before deleting sends no destructive request', async () => {
  const { deleteDocuments } = await modulePromise;
  let requests = 0;
  const results = await deleteDocuments({ documents, treeUrl: base, request: async () => { requests++; throw new Error('HTTP 503'); } });
  assert.equal(requests, 1);
  assert.deepEqual(results.map(result => result.status), ['error', 'pending']);
});

test('a different process or a newly collapsed tree cannot confirm deletion', async () => {
  const { deleteDocuments } = await modulePromise;
  for (const response of [tree([]), tree(['123']).replace('"PROCESSO", "1"', '"PROCESSO", "2"')]) {
    let deleted = false;
    const results = await deleteDocuments({ documents, treeUrl: base, request: async value => {
      if (new URL(value).searchParams.get('acao') === 'documento_excluir') { deleted = true; return ''; }
      return deleted ? response : tree(['12', '123']);
    }});
    assert.deepEqual(results.map(result => result.status), ['uncertain', 'pending']);
  }
});

test('cancel after a confirmed document leaves the remainder untouched', async () => {
  const { deleteDocuments } = await modulePromise;
  let deleted = false;
  let cancelled = false;
  const results = await deleteDocuments({ documents, treeUrl: base, isCancelled: () => cancelled,
    onResult: result => { if (result.status === 'deleted') cancelled = true; },
    request: async value => {
      if (new URL(value).searchParams.get('acao') === 'documento_excluir') { deleted = true; return ''; }
      return tree(deleted ? ['123'] : ['12', '123']);
    }
  });
  assert.deepEqual(results.map(result => result.status), ['deleted', 'pending']);
});

test('cancellation or process navigation during preflight prevents deletion', async () => {
  const { deleteDocuments } = await modulePromise;
  let cancelled = false;
  let requests = 0;
  const results = await deleteDocuments({ documents, treeUrl: base, isCancelled: () => cancelled,
    request: async () => { requests++; cancelled = true; return tree(['12', '123']); }
  });
  assert.equal(requests, 1);
  assert.deepEqual(results.map(result => result.status), ['pending', 'pending']);
});
