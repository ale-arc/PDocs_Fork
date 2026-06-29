# Textos da listagem — Edge Add-ons Store (PDocs SEI)

Materiais prontos para copiar/colar no Partner Center. Ajuste o que quiser.

---

## Nome de exibição
```
PDocs SEI
```

## Descrição curta (resumo) — máx. ~132 caracteres
```
Versão estendida para o SEI: inserção de documentos em lote via CSV, inclusão em bloco de assinatura e download de blocos em PDF.
```

## Categoria
```
Productivity (Produtividade)
```

## Idioma
```
Português (Brasil)
```

---

## Descrição detalhada

```
PDocs SEI é uma extensão (versão estendida/fork do projeto PluriDocs-SEI) que
automatiza tarefas repetitivas no Sistema Eletrônico de Informações (SEI),
poupando tempo em rotinas de produção e tramitação de documentos.

PRINCIPAIS FUNCIONALIDADES

• Inserção de documentos em lote: gere vários documentos a partir de um documento
  modelo com campos dinâmicos (##campo##) e uma planilha .CSV como base de dados.

• Inserção em processos existentes: direcione cada documento gerado ao processo
  correto, indicando a coluna de processo no próprio CSV.

• Inclusão automática em bloco de assinatura: os documentos criados podem ser
  adicionados a um bloco de assinatura em uma única operação.

• Download de blocos em PDF: dentro de um bloco de assinatura, baixe todos os
  documentos como PDF (individualmente ou em um único arquivo .ZIP), já nomeados
  pelo nome na árvore.

• Atribuição de processos em lote: atribua processos a um usuário da unidade
  diretamente pela tela do bloco.

• Tratamento de acentuação/codificação compatível com o padrão do SEI.

COMPATIBILIDADE
Compatível com as versões 3.x, 4.x e 5 do SEI. Conviva sem conflitos com outras
extensões de SEI.

PRIVACIDADE
Todo o processamento é local, na sua sessão autenticada do SEI. A extensão não
coleta, não armazena em servidores e não transmite dados a terceiros.
Código aberto: https://github.com/ale-arc/PDocs_Fork
```

---

## Justificativa de permissões (caso a revisão pergunte)

```
content_scripts (host *.br + controlador.php do SEI):
A extensão precisa ser injetada nas páginas do SEI para ler o documento modelo,
preencher formulários de criação de documentos, incluir documentos em blocos de
assinatura e gerar/baixar PDFs. A atuação é restrita às páginas do próprio SEI
em que o usuário já está autenticado; nenhuma página fora do SEI é acessada.

web_accessible_resources:
Necessário para carregar os módulos de script e os recursos visuais (CSS/ícones)
da própria extensão dentro do contexto da página do SEI.

A extensão NÃO usa código remoto: todas as bibliotecas (jQuery, jQuery-UI,
PapaParse, jschardet) estão empacotadas localmente.
```

---

## Política de privacidade (URL)

Após ativar o GitHub Pages no repositório (Settings → Pages → Branch: main,
pasta /docs), a política ficará disponível em:

```
https://ale-arc.github.io/PDocs_Fork/privacy.html
```

## Materiais visuais necessários na loja

- [x] Logo da loja 300×300 — `store/store-logo-300.png` (gerado)
- [ ] Screenshots 1280×800 (ou 640×480) — capturar a extensão em uso no SEI
      (mínimo 1; recomendado 3–4 mostrando: botão na árvore, modal de cruzamento
      de dados, tela de sucesso, download do bloco)
- [ ] (Opcional) Promo tile 440×280
