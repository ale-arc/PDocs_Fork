// Integration fixture served locally: no connection to an authenticated SEI.
// Uses the installed Chromium browser and Node's built-in CDP/WebSocket support.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const chromePath = process.env.PDOCS_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

test('real browser: tree selection, confirmation, deletion, dynamic nodes and reloading', { skip: !fs.existsSync(chromePath), timeout: 30000 }, async () => {
  const ids = new Set(['12', '123']);
  const deletions = [];
  const assetPaths = new Set([
    '/src/js/components/BatchDelete.js', '/src/js/functions/batchDelete.js', '/src/css/batchDelete.css'
  ]);
  const treeHtml = () => `<html><head></head><body><div id="divArvore">
    <a id="anchor1" href="controlador.php?acao=arvore_visualizar&id_procedimento=1">Processo 1</a>
    <a id="anchorPASTA1" href="#">Pasta</a>
    ${[...ids].map(id => `<a id="anchor${id}" target="ifrVisualizacao" href="controlador.php?acao=arvore_visualizar&id_documento=${id}">Documento ${id}</a><br>`).join('')}
    </div><script type="text/plain">Nos[0] = new infraArvoreNo("PROCESSO", "1");
    ${[...ids].map((id, i) => `Nos[${i + 1}] = new infraArvoreNo("DOCUMENTO", "${id}");
    Nos[${i + 1}].src = 'controlador.php?acao=arvore_visualizar&id_documento=${id}';
    Nos[${i + 1}].acoes = '<a href="controlador.php?acao=documento_excluir&id_documento=${id}&infra_hash=valid">Excluir</a>';`).join('\n')}
    </script></body></html>`;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (assetPaths.has(url.pathname)) {
      res.setHeader('Content-Type', url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript');
      return res.end(fs.readFileSync(path.join(process.cwd(), url.pathname)));
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const action = url.searchParams.get('acao');
    if (action === 'documento_excluir') {
      const id = url.searchParams.get('id_documento');
      deletions.push(id); ids.delete(id); return res.end('');
    }
    if (action === 'procedimento_visualizar') return res.end(treeHtml());
    res.end(`<html><head><link rel="stylesheet" href="/src/css/batchDelete.css"></head><body>
      <iframe id="ifrArvore" src="/controlador.php?acao=procedimento_visualizar&id_procedimento=1" style="height:500px;width:350px"></iframe>
      <script type="module">window.chrome = { runtime: { getURL: p => new URL('/' + p, location.href).href } };
      const {default: initialize} = await import('/src/js/components/BatchDelete.js'); initialize();</script>
      </body></html>`);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pdocs-batch-browser-'));
  const browser = spawn(chromePath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true });
  let socket;
  const pending = new Map();
  let sequence = 0;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Chrome startup timed out')), 10000);
      browser.once('error', error => { clearTimeout(timer); reject(error); });
      browser.stderr.on('data', data => {
        const match = data.toString().match(/DevTools listening on (ws:\/\/\S+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    socket = new WebSocket(endpoint);
    await once(socket, 'open');
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const handler = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handler.reject(new Error(message.error.message)); else handler.resolve(message.result);
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const evaluate = async expression => {
      const value = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
      if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails));
      return value.result.value;
    };
    await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` }, sessionId);
    const waitFor = expression => evaluate(`new Promise((resolve, reject) => {
      const end = Date.now() + 5000;
      const check = () => { if (${expression}) resolve(true); else if (Date.now() > end) reject(new Error('UI timed out')); else setTimeout(check, 20); }; check();
    })`);
    await waitFor("document.querySelector('#ifrArvore')?.contentDocument?.querySelectorAll('.pdocs-delete-checkbox').length === 2");
    assert.equal(await evaluate("document.querySelector('#ifrArvore').contentDocument.querySelectorAll('#pdocs-delete-toolbar').length"), 1);
    assert.equal(await evaluate("document.querySelector('#ifrArvore').contentDocument.querySelector('#pdocs-delete-1') === null"), true);
    await evaluate("document.querySelector('#ifrArvore').contentDocument.querySelector('#pdocs-delete-12').click(); document.querySelector('#ifrArvore').contentDocument.querySelector('#pdocs-delete-selected').click()");
    assert.equal(await evaluate("document.querySelector('#pdocs-delete-dialog').open"), true);
    assert.deepEqual(deletions, []);
    await evaluate("document.querySelector('[data-action=close]').click()");
    assert.deepEqual(deletions, []);
    await evaluate("document.querySelector('#ifrArvore').contentDocument.querySelector('#pdocs-delete-selected').click(); document.querySelector('[data-action=confirm]').click()");
    await waitFor("document.querySelector('[data-action=refresh]').hidden === false");
    assert.deepEqual(deletions, ['12']);
    assert.equal(await evaluate("document.querySelector('li[data-status=deleted]').textContent.includes('Documento 12')"), true);
    assert.equal(await evaluate("document.querySelector('#ifrArvore').contentDocument.querySelector('#pdocs-delete-12').disabled"), true);
    assert.equal(await evaluate("document.querySelector('#ifrArvore').contentDocument.querySelector('#pdocs-delete-123').disabled"), false);
    await evaluate(`document.querySelector('[data-action=close]').click();
      const tree = document.querySelector('#ifrArvore').contentDocument;
      const anchor = tree.createElement('a'); anchor.id = 'anchor999'; anchor.href = 'controlador.php?acao=arvore_visualizar&id_documento=999'; anchor.textContent = 'Novo documento'; tree.querySelector('#divArvore').append(anchor);`);
    await waitFor("document.querySelector('#ifrArvore').contentDocument.querySelector('#pdocs-delete-999')");
    await evaluate("document.querySelector('#ifrArvore').contentWindow.location.reload()");
    await waitFor("document.querySelector('#ifrArvore').contentDocument.querySelectorAll('.pdocs-delete-checkbox').length === 1");
    assert.equal(await evaluate("document.querySelector('#ifrArvore').contentDocument.querySelectorAll('#pdocs-delete-toolbar').length"), 1);
    await send('Browser.close');
  } finally {
    socket?.close();
    if (browser.exitCode === null) browser.kill();
    server.closeAllConnections();
    server.close();
    // Only the unique profile created by this test may be removed.
    if (path.dirname(profile) === path.resolve(os.tmpdir()) && path.basename(profile).startsWith('pdocs-batch-browser-')) {
      await fs.promises.rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {});
    }
  }
});
