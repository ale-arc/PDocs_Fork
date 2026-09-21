const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('execute shows HTTP failure details instead of the generic message', async () => {
  let detail;
  const $ = () => ({
    attr: () => 'search',
    dialog: () => {},
    text: (value) => { detail = value; }
  });
  $.ajax = async () => { throw { status: 403, statusText: 'Forbidden' }; };
  const source = fs.readFileSync('src/js/functions/functions.js', 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  const context = vm.createContext({
    $, XMLHttpRequest: class {}, console: { log() {} },
    localStorage: { getItem: () => '4.1.5' }
  });
  vm.runInContext(source + `
    useExistingProcess = true;
    processoColumn = 'Processo';
    CSVData = [{ Processo: '10154.081065/2025-12' }];
    globalThis.run = execute;
  `, context);
  await context.run();
  assert.match(detail, /HTTP 403/);
  assert.match(detail, /Localizar processo de destino/);
  assert.match(detail, /Registro 1/);
});
