const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const loadConfirmDocData = (version) => {
  const $ = () => ({ find: () => ({ first: () => ({ text: () => '' }) }) });
  const source = fs.readFileSync('src/js/functions/functions.js', 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  const context = vm.createContext({
    $, XMLHttpRequest: class {}, console: { log() {}, error() {} },
    localStorage: { getItem: () => version }
  });
  vm.runInContext(source + `
    globalThis.confirm = (html) => { $.ajax = async () => html; return confirmDocData('url', {}); };
  `, context);
  return context.confirm;
};

test('extrai o link do editor no formato do SEI 4.1', async () => {
  const html = "<script>\nvar linkEditarConteudo = 'controlador.php?acao=editor_montar&id_procedimento=1&id_documento=2&infra_hash=abc';\n</script>";
  const { urlEditor } = await loadConfirmDocData('4.1.5')(html);
  assert.equal(urlEditor, 'controlador.php?acao=editor_montar&id_procedimento=1&id_documento=2&infra_hash=abc');
});

test('extrai o link do editor quando o SEI 5 muda o trecho de JS e escapa &amp;', async () => {
  const html = '<script>\nconst cfg = { editar: "controlador.php?acao=editor_montar&amp;id_procedimento=1&amp;id_documento=2&amp;infra_hash=abc" };\n</script>';
  const { urlEditor } = await loadConfirmDocData('5.0.4')(html);
  assert.equal(urlEditor, 'controlador.php?acao=editor_montar&id_procedimento=1&id_documento=2&infra_hash=abc');
});

test('falha com mensagem clara quando o link do editor não vem na resposta', async () => {
  await assert.rejects(loadConfirmDocData('5.0.4')('<html><title>SEI - 10154.081065/2025-12</title></html>'),
    /link do editor/);
});
