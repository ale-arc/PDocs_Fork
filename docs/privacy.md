---
title: Política de Privacidade — PDocs SEI
---

# Política de Privacidade — PDocs SEI

_Última atualização: 29 de junho de 2026_

A extensão **PDocs SEI** ("a extensão") foi desenvolvida para auxiliar usuários do
Sistema Eletrônico de Informações (SEI) em tarefas de inserção de documentos em
lote, inclusão em bloco de assinatura, atribuição de processos e download de
blocos em PDF.

Esta política descreve como a extensão lida com dados.

## Resumo

**A extensão não coleta, não armazena em servidores e não transmite a terceiros
qualquer dado pessoal ou informação do usuário.** Todo o processamento ocorre
localmente, no seu próprio navegador, dentro da sua sessão autenticada do SEI.

## Dados acessados e como são usados

Para funcionar, a extensão acessa, **apenas localmente e durante o uso**:

- **Arquivos `.CSV` selecionados por você** — lidos no navegador para servir de
  base de dados na replicação de documentos. O conteúdo não sai do seu
  computador.
- **Páginas e formulários do SEI** em que você está autenticado — a extensão lê
  e preenche campos, gera documentos, inclui em blocos e baixa PDFs usando a sua
  própria sessão (os mesmos cookies já presentes no seu navegador). As
  requisições são feitas para o **mesmo domínio do SEI** que você está acessando,
  nunca para servidores externos.

A extensão **não** utiliza serviços de analytics, **não** rastreia navegação,
**não** envia telemetria e **não** compartilha dados com o desenvolvedor ou com
qualquer terceiro.

## Permissões

A extensão é injetada somente em páginas do SEI (endereços `*.br` com o
controlador do SEI). Ela não solicita acesso ao seu histórico, a outras abas ou a
sites fora do SEI.

## Armazenamento

A extensão não mantém banco de dados próprio. Eventuais dados ficam apenas na
memória da aba enquanto a tarefa é executada e são descartados ao final.

## Código aberto

O código-fonte é público e pode ser auditado em
[github.com/ale-arc/PDocs_Fork](https://github.com/ale-arc/PDocs_Fork).
A extensão é uma versão estendida (fork) do projeto PluriDocs-SEI.

## Contato

Dúvidas sobre esta política podem ser enviadas para:
**[alexandre.augusto@outlook.com](mailto:alexandre.augusto@outlook.com)**

## Alterações

Eventuais mudanças nesta política serão publicadas nesta mesma página, com a data
de atualização revisada.
