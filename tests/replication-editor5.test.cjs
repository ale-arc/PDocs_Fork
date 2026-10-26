const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

/* Página do editor do SEI 5.0.4 (CKEditor 5): sem frmEditor, conteúdo no INFRA_EDITOR_CONFIG */
const config = {
  licenseKey: 'GPL',
  sei: {
    urlSalvar: 'controlador_rest.php?id_documento=2&acao_rest=editor_salvar_conteudo&infra_hash=abc',
    versao: '1'
  },
  initialData: {
    txaEditor_1132: '<p>Cabeçalho</p>',
    txaEditor_1134: '<p>PROCESSO: ##PROCESSO_SEI##</p><p>Nome: ##NOME##</p><p>##OUTRO##</p>'
  }
};
const htmlEditor5 = `<html><head><title>SEI/MGI - 1 - Despacho</title>
<script charset="utf-8">window.INFRA_EDITOR_CONFIG = ${JSON.stringify(config).replace(/\//g, '\\/')};</script>
<script>window.INFRA_EDITOR_ASSETS = [];</script></head><body></body></html>`;

const load = (ajax) => {
  const $ = (html) => ({ filter: () => ({ add: () => ({ first: () => ({ attr: () => undefined }) }) }), find: () => [] });
  $.get = async () => htmlEditor5;
  $.ajax = ajax;
  const source = fs.readFileSync('src/js/functions/functions.js', 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  const context = vm.createContext({
    $, XMLHttpRequest: class {}, console: { log() {}, error() {} },
    localStorage: { getItem: () => '5.0.4' }, specialChars: { 'ã': '&atilde;' }
  });
  vm.runInContext(source + `
    dataCrossing = ['PROCESSO_SEI', 'NOME'];
    globalThis.edit = editDocContent;
    globalThis.save = saveDoc;
  `, context);
  return context;
};

test('editor do SEI 5: substitui os campos em cada seção e salva por JSON no urlSalvar', async () => {
  let request;
  const ctx = load(async (opts) => { request = opts; return { versao: 2, comentariosAtualizados: false }; });

  const r = await ctx.edit('url', { PROCESSO_SEI: '10154.081065/2025-12', NOME: 'João' });
  assert.equal(r.editor5, true);
  assert.equal(r.urlSubmitForm, config.sei.urlSalvar);

  const result = await ctx.save(r.urlSubmitForm, r.paramsSaveDoc, r.editor5);
  assert.equal(result.success, true);
  assert.equal(request.url, config.sei.urlSalvar);
  assert.equal(request.contentType, 'application/json');

  const body = JSON.parse(request.data);
  assert.equal(body.versao, '1');
  assert.equal(body.ignorarNovaVersao, 'N');
  assert.deepEqual(body.secoesConteudo.map((s) => s.nome), ['txaEditor_1132', 'txaEditor_1134']);
  assert.equal(body.secoesConteudo[1].html,
    '<p>PROCESSO: 10154.081065/2025-12</p><p>Nome: Jo&atilde;o</p><p>##OUTRO##</p>');
});

test('editor do SEI 5: repassa a mensagem de erro do SEI ao salvar', async () => {
  const ctx = load(async () => { throw { status: 409, responseJSON: { erro: 'Documento alterado por outro usuário.' } }; });
  const r = await ctx.edit('url', { PROCESSO_SEI: '1', NOME: 'x' });
  await assert.rejects(ctx.save(r.urlSubmitForm, r.paramsSaveDoc, r.editor5), /alterado por outro usuário/);
});
