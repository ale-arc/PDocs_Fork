const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(pages) {
  const requests = [];
  const $ = (html) => ({
    attr: () => 'search',
    find: (selector) => ({ attr: () => {
      const id = selector.slice(1);
      const tag = String(html).match(new RegExp(`<iframe id="${id}" src="([^"]+)"`));
      return tag?.[1].replaceAll('&amp;', '&');
    } })
  });
  $.ajax = async () => { requests.push('search'); return 'controlador.php?acao=procedimento_trabalhar&id_procedimento=1'; };
  $.get = async (url) => { requests.push(url); assert.ok(url in pages, `Unexpected URL: ${url}`); return pages[url]; };
  const source = fs.readFileSync('src/js/functions/functions.js', 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  const context = vm.createContext({ $, XMLHttpRequest: class {}, window: { location: { href: '' } } });
  vm.runInContext(source + '\nprocessoColumn = "Processo"; globalThis.resolveTarget = resolveNewDocTarget;', context);
  return { resolve: context.resolveTarget, requests };
}
const proc = 'controlador.php?acao=procedimento_trabalhar&id_procedimento=1';
const tree = 'controlador.php?acao=arvore_montar&id_procedimento=1';
const view = 'controlador.php?acao=arvore_visualizar&id_procedimento=1';
const create = 'controlador.php?acao=documento_escolher_tipo&id_procedimento=1&infra_hash=valid';

test('finds Include Document in the destination visualization frame', async () => {
  const { resolve } = setup({
    [proc]: `<html><iframe id="ifrArvore" src="${tree}"></iframe><iframe id="ifrVisualizacao" src="${view}"></iframe></html>`,
    [tree]: '<html>Process tree without action toolbar</html>',
    [view]: `<a href="${create.replaceAll('&', '&amp;')}">Incluir Documento</a>`
  });
  const target = await resolve({ Processo: '10154.081065/2025-12' });
  assert.equal(target.urlNewDoc, create);
  assert.equal(target.urlArvore, tree);
});

test('rejects a person name as destination before searching SEI', async () => {
  const { resolve, requests } = setup({});
  await assert.rejects(resolve({ Processo: 'ALEXANDRE' }), /coluna.*Processo.*número de processo/i);
  assert.deepEqual(requests, []);
});

test('preserves direct links in the tree', async () => {
  const { resolve } = setup({
    [proc]: `<html><iframe id="ifrArvore" src="${tree}"></iframe></html>`,
    [tree]: `<a href="${create}">Incluir Documento</a>`
  });
  assert.equal((await resolve({ Processo: '10154081065202512' })).urlNewDoc, create);
});

test('follows tree initialization and nested visualization panels', async () => {
  const nested = 'controlador.php?acao=procedimento_visualizar&id_procedimento=1';
  const { resolve } = setup({
    [proc]: `<html><iframe id="ifrArvore" src="${tree}"></iframe></html>`,
    [tree]: `<script>var src = '${view}';</script>`,
    [view]: `<html><iframe id="ifrConteudoVisualizacao" src="${nested}"></iframe></html>`,
    [nested]: `<a href="${create}">Incluir Documento</a>`
  });
  assert.equal((await resolve({ Processo: '10154.081065/2025-12' })).urlNewDoc, create);
});

test('missing Include Document stops without attempting document creation', async () => {
  const { resolve, requests } = setup({
    [proc]: `<html><iframe id="ifrArvore" src="${tree}"></iframe></html>`,
    [tree]: `<script>var src = '${view}';</script>`,
    [view]: `<html><iframe id="ifrVisualizacao" src="${view}"></iframe></html>`
  });
  await assert.rejects(resolve({ Processo: '10154081065202512' }), /permite incluir documentos/);
  assert.equal(requests.filter(url => url === view).length, 1);
  assert.ok(!requests.includes(create));
});

test('ignores about:blank and follows the initial visualization from the tree', async () => {
  const { resolve, requests } = setup({
    [proc]: `<html><iframe id="ifrArvore" src="${tree}"></iframe><iframe id="ifrVisualizacao" src="about:blank"></iframe></html>`,
    [tree]: `<script>var src = '${view}';</script>`,
    [view]: `<a href="${create}">Incluir Documento</a>`
  });
  assert.equal((await resolve({ Processo: '10154.081065/2025-12' })).urlNewDoc, create);
  assert.ok(!requests.includes('about:blank'));
});
