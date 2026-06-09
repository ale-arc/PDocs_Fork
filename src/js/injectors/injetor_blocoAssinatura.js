/**
 * PluriDocs — Baixar documentos de um Bloco de Assinatura em PDF.
 *
 * Injeta botões na barra de comandos da tela do bloco (acao=rel_bloco_protocolo_listar):
 *   • "Baixar PDFs"  -> um PDF por documento.
 *   • "Baixar ZIP"   -> todos os PDFs em um único arquivo .zip.
 *
 * Cada arquivo é nomeado com o "nome na árvore" do documento, sem o tipo (ex.: Despacho)
 * e sem o número entre parênteses. Nomes repetidos recebem sufixo " (2)", " (3)"… para
 * que nenhum arquivo seja perdido.
 *
 * Fluxo por documento (tudo via fetch autenticado, sem alterar o processo):
 *   processo (procedimento_trabalhar) -> árvore (procedimento_visualizar)
 *     -> nome na árvore + link de "Gerar Arquivo PDF do Processo"
 *     -> POST procedimento_gerar_pdf (rdoTipo=A, apenas o id_documento)
 *     -> URL exibir_arquivo -> blob PDF.
 *
 * Vanilla JS de propósito: evita carregar jQuery na página do bloco.
 */
(() => {
  'use strict';

  const BTN_PDF_ID = 'btnBaixarBlocoPluri';
  const BTN_ZIP_ID = 'btnBaixarBlocoZipPluri';
  const STATUS_ID = 'statusBaixarBlocoPluri';
  const TABLE_ID = 'tblProtocolosBlocos';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clean = (u) => (u || '').replace(/&amp;/g, '&');

  /* Converte o rótulo da árvore "<Tipo> <Nome> (<número>)" no nome desejado para o
     arquivo: remove o trecho final entre parênteses e o tipo do documento (prefixo). */
  const limparNome = (label, tipo) => {
    let nome = (label || '').replace(/\s*\([^()]*\)\s*$/, '').trim(); // remove "(número)" no fim
    const t = (tipo || '').trim();
    if (t && nome.toLowerCase().indexOf(t.toLowerCase()) === 0)
      nome = nome.slice(t.length).trim();
    return nome;
  };

  const sanitizeFilename = (name) =>
    ((name || 'documento')
      .replace(/[\/\\:*?"<>|\n\r\t]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'documento');

  /* Garante nome único: se já existir, acrescenta " (2)", " (3)"… (sem extensão). */
  const nomeUnico = (base, usados) => {
    let nome = base;
    let i = 1;
    while (usados.has(nome.toLowerCase())) { i++; nome = base + ' (' + i + ')'; }
    usados.add(nome.toLowerCase());
    return nome;
  };

  /* Extrai o rótulo (nome na árvore) do documento a partir do HTML da árvore.
     Os nós são definidos em JS: Nos[i] = new infraArvoreNo("...", "...", ...).
     O rótulo visível é o argumento logo após o alvo do frame de visualização. */
  const extrairNomeArvore = (htmlArvore, idDocumento) => {
    const lines = htmlArvore.split('\n');
    const srcLine = lines.find((l) => /Nos\[\d+\]\.src/.test(l) && l.indexOf('id_documento=' + idDocumento) !== -1);
    if (!srcLine) return null;
    const idx = (srcLine.match(/Nos\[(\d+)\]/) || [])[1];
    if (idx == null) return null;
    const defLine = lines.find((l) => new RegExp('Nos\\[' + idx + '\\] = new infraArvoreNo\\(').test(l));
    if (!defLine) return null;
    const inside = defLine.slice(defLine.indexOf('(') + 1, defLine.lastIndexOf(')'));
    const quoted = inside.match(/"(?:[^"\\]|\\.)*"/g) || [];
    const desq = (s) => s.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    const alvo = quoted.findIndex((q) => q.indexOf('Visualizacao') !== -1);
    let label = (alvo >= 0 && quoted[alvo + 1]) ? desq(quoted[alvo + 1]) : (quoted[5] ? desq(quoted[5]) : null);
    return label || null;
  };

  /* Gera e retorna o PDF (blob) e o nome (já sem tipo/número) de um documento, a partir
     do link "procedimento_trabalhar" da linha do bloco (que contém id_documento). */
  const gerarPdfDocumento = async (procHref, tipo) => {
    const idDocumento = (procHref.match(/id_documento=(\d+)/) || [])[1];
    if (!idDocumento) throw new Error('id_documento não encontrado no link do processo.');

    const htmlProc = await fetch(clean(procHref)).then((r) => r.text());
    const urlArvore = (htmlProc.match(/controlador\.php\?acao=procedimento_visualizar[^"'\\\s]*/) || [])[0];
    if (!urlArvore) throw new Error('Árvore do processo não localizada.');

    const htmlArvore = await fetch(clean(urlArvore)).then((r) => r.text());
    const label = extrairNomeArvore(htmlArvore, idDocumento);
    const nome = limparNome(label, tipo) || label || ('documento_' + idDocumento);

    const urlFormPdf = (htmlArvore.match(/controlador\.php\?acao=procedimento_gerar_pdf[^"'\\\s]*/) || [])[0];
    if (!urlFormPdf) throw new Error('Ação "Gerar PDF" não disponível neste processo.');

    const htmlForm = await fetch(clean(urlFormPdf)).then((r) => r.text());
    const form = new DOMParser().parseFromString(htmlForm, 'text/html').querySelector('#frmProcedimentoPdf');
    if (!form) throw new Error('Formulário de geração de PDF não encontrado.');

    const action = clean(form.getAttribute('action') || urlFormPdf);
    const params = new URLSearchParams();
    form.querySelectorAll('input[type=hidden]').forEach((i) => { if (i.name) params.set(i.name, i.value || ''); });
    params.set('rdoTipo', 'A');                 // "Apenas selecionados"
    params.set('hdnDocumentosApenas', idDocumento);
    params.set('hdnFlagGerar', '1');

    const htmlGerado = await fetch(action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    }).then((r) => r.text());

    const urlExibir = (htmlGerado.match(/controlador\.php\?acao=exibir_arquivo[^"'\\\s]*/) || [])[0];
    if (!urlExibir) throw new Error('PDF não foi gerado (link exibir_arquivo ausente).');

    const blob = await fetch(clean(urlExibir)).then((r) => r.blob());
    if (blob.type && blob.type.indexOf('pdf') === -1 && blob.type.indexOf('octet') === -1)
      throw new Error('Resposta não é um PDF (tipo: ' + blob.type + ').');

    return { blob, nome };
  };

  /* ---------- ZIP (método "store", sem compressão — PDFs já são comprimidos) ---------- */
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();
  const crc32 = (u8) => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < u8.length; i++) c = crcTable[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const criarZip = (arquivos) => {
    const enc = new TextEncoder();
    const u16 = (v) => [v & 0xFF, (v >>> 8) & 0xFF];
    const u32 = (v) => [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF];
    const now = new Date();
    const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
    const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

    const partes = [];
    const central = [];
    let offset = 0;

    for (const f of arquivos) {
      const nameBytes = enc.encode(f.name);
      const data = f.data;
      const crc = crc32(data);
      const size = data.length;
      const local = [].concat(
        u32(0x04034b50), u16(20), u16(0x0800), u16(0),     // sig, versão, flag(UTF-8), método=store
        u16(dosTime), u16(dosDate),
        u32(crc), u32(size), u32(size),
        u16(nameBytes.length), u16(0)
      );
      partes.push(new Uint8Array(local), nameBytes, data);
      const cen = [].concat(
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0),
        u16(dosTime), u16(dosDate),
        u32(crc), u32(size), u32(size),
        u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0),
        u32(0), u32(offset)
      );
      central.push(new Uint8Array(cen), nameBytes);
      offset += local.length + nameBytes.length + size;
    }

    let centralSize = 0;
    central.forEach((c) => { centralSize += c.length; });
    const end = [].concat(
      u32(0x06054b50), u16(0), u16(0),
      u16(arquivos.length), u16(arquivos.length),
      u32(centralSize), u32(offset),
      u16(0)
    );
    return new Blob([...partes, ...central, new Uint8Array(end)], { type: 'application/zip' });
  };

  const baixarBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const nomeZip = () => {
    const id = (location.href.match(/id_bloco=(\d+)/) || [])[1];
    return 'Bloco_' + (id || 'assinatura') + '.zip';
  };

  const getStatusEl = () => document.getElementById(STATUS_ID);

  const coletarLinhas = () => {
    const tbl = document.getElementById(TABLE_ID);
    if (!tbl) return [];
    return [...tbl.querySelectorAll('tr')]
      .map((tr) => {
        const a = tr.querySelector('a[href*="acao=procedimento_trabalhar"][href*="id_documento="]');
        if (!a) return null;
        const tds = tr.querySelectorAll('td');
        return {
          procHref: a.getAttribute('href'),
          tipo: tds[4] ? tds[4].textContent.trim() : '',       // coluna "Tipo"
          processo: tds[2] ? tds[2].textContent.trim() : '',   // coluna "Processo"
          documento: tds[3] ? tds[3].textContent.trim() : ''   // coluna "Documento"
        };
      })
      .filter(Boolean);
  };

  const setBotoesAtivos = (ativo) => {
    [BTN_PDF_ID, BTN_ZIP_ID].forEach((id) => { const b = document.getElementById(id); if (b) b.disabled = !ativo; });
  };

  /* ---------- Modal de resultado/erros (JS puro) ---------- */
  const MODAL_ID = 'modalResultadoBlocoPluri';
  const fecharModal = () => {
    const m = document.getElementById(MODAL_ID);
    if (m) m.remove();
    document.removeEventListener('keydown', onEscModal);
  };
  const onEscModal = (e) => { if (e.key === 'Escape') fecharModal(); };

  const mostrarModalErros = (erros, ok, total) => {
    fecharModal();
    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483647;display:flex;align-items:center;justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;max-width:640px;width:90%;max-height:80vh;display:flex;flex-direction:column;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,.35);font-family:"Segoe UI",Arial,sans-serif;overflow:hidden;';

    const header = document.createElement('div');
    header.style.cssText = 'padding:14px 18px;background:#c0392b;color:#fff;font-weight:bold;font-size:15px;';
    header.textContent = 'PluriDocs — ' + erros.length + ' documento(s) não baixado(s)';

    const body = document.createElement('div');
    body.style.cssText = 'padding:16px 18px;overflow:auto;';
    const resumo = document.createElement('p');
    resumo.style.cssText = 'margin:0 0 12px;color:#333;font-size:14px;';
    resumo.textContent = ok + ' de ' + total + ' baixado(s) com sucesso. Os documentos abaixo falharam:';
    body.appendChild(resumo);

    const ul = document.createElement('ul');
    ul.style.cssText = 'margin:0;padding-left:18px;color:#444;font-size:13px;line-height:1.55;';
    erros.forEach((er) => {
      const li = document.createElement('li');
      li.style.cssText = 'margin-bottom:8px;';
      const ref = document.createElement('strong');
      ref.textContent = 'Doc ' + (er.documento || '?') + ' (processo ' + (er.processo || '?') + '): ';
      const msg = document.createElement('span');
      msg.textContent = er.msg;
      li.appendChild(ref);
      li.appendChild(msg);
      ul.appendChild(li);
    });
    body.appendChild(ul);

    const footer = document.createElement('div');
    footer.style.cssText = 'padding:12px 18px;border-top:1px solid #eee;text-align:right;';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'infraButton';
    btn.textContent = 'Fechar';
    btn.style.cssText = 'padding:6px 18px;cursor:pointer;';
    btn.addEventListener('click', fecharModal);
    footer.appendChild(btn);

    box.appendChild(header);
    box.appendChild(body);
    box.appendChild(footer);
    overlay.appendChild(box);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharModal(); });
    document.addEventListener('keydown', onEscModal);
    document.body.appendChild(overlay);
  };

  /* modo: 'individual' (um PDF por documento) ou 'zip' (todos em um .zip) */
  const processar = async (modo) => {
    const itens = coletarLinhas();
    if (!itens.length) { alert('Nenhum documento localizado no bloco.'); return; }

    const msg = modo === 'zip'
      ? 'PluriDocs: baixar ' + itens.length + ' documento(s) do bloco em um único ZIP?'
      : 'PluriDocs: baixar ' + itens.length + ' documento(s) do bloco em PDF?\n\n' +
        'O navegador pode pedir permissão para baixar vários arquivos — autorize.';
    if (!confirm(msg)) return;

    setBotoesAtivos(false);
    const status = getStatusEl();
    const usados = new Set();
    const arquivos = [];
    let ok = 0;
    const erros = [];

    for (let i = 0; i < itens.length; i++) {
      if (status) { status.style.color = '#0a5'; status.textContent = 'Processando ' + (i + 1) + '/' + itens.length + '…'; }
      try {
        const { blob, nome } = await gerarPdfDocumento(itens[i].procHref, itens[i].tipo);
        const finalNome = nomeUnico(sanitizeFilename(nome), usados) + '.pdf';
        if (modo === 'zip') arquivos.push({ name: finalNome, data: new Uint8Array(await blob.arrayBuffer()) });
        else baixarBlob(blob, finalNome);
        ok++;
      } catch (e) {
        erros.push({ processo: itens[i].processo, documento: itens[i].documento, msg: (e && e.message) ? e.message : String(e) });
        console.error('PluriDocs [bloco-download] linha ' + (i + 1) + ' ->', e);
      }
      await sleep(modo === 'zip' ? 120 : 500);
    }

    if (modo === 'zip' && arquivos.length) {
      if (status) status.textContent = 'Compactando ' + arquivos.length + ' arquivo(s)…';
      baixarBlob(criarZip(arquivos), nomeZip());
    }

    if (status) {
      status.style.color = erros.length ? '#c00' : '#0a5';
      status.textContent = 'Concluído: ' + ok + (modo === 'zip' ? ' no ZIP' : ' baixado(s)') +
        (erros.length ? ' · ' + erros.length + ' falha(s)' : '') + '.';
    }
    setBotoesAtivos(true);

    if (erros.length) mostrarModalErros(erros, ok, itens.length);
  };

  const criarBotao = (id, texto, titulo, onClick) => {
    const btn = document.createElement('button');
    btn.id = id;
    btn.type = 'button'; // nunca submeter o form
    btn.className = 'infraButton';
    btn.textContent = texto;
    btn.title = titulo;
    btn.style.cssText = 'margin-left:6px;';
    btn.addEventListener('click', onClick);
    return btn;
  };

  const adicionarBotoes = () => {
    if (document.getElementById(BTN_PDF_ID)) return true;
    const bar = document.getElementById('divInfraBarraComandosSuperior') ||
      document.querySelector('[id^="divInfraBarraComandos"]');
    const tbl = document.getElementById(TABLE_ID);
    if (!bar || !tbl) return false;

    bar.appendChild(criarBotao(BTN_PDF_ID, '⬇ Baixar PDFs (PluriDocs)',
      'Baixa cada documento do bloco como um PDF, nomeado pelo nome na árvore', () => processar('individual')));
    bar.appendChild(criarBotao(BTN_ZIP_ID, '🗜 Baixar ZIP (PluriDocs)',
      'Baixa todos os documentos do bloco em um único arquivo .zip', () => processar('zip')));

    const status = document.createElement('span');
    status.id = STATUS_ID;
    status.style.cssText = 'margin-left:10px;font-size:0.9em;font-weight:bold;color:#0a5;';
    bar.appendChild(status);
    return true;
  };

  /* A barra/tabela podem renderizar após o load; tenta algumas vezes. */
  const init = () => {
    if (adicionarBotoes()) return;
    let tentativas = 0;
    const timer = setInterval(() => {
      if (adicionarBotoes() || ++tentativas > 20) clearInterval(timer);
    }, 300);
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else
    init();
})();
