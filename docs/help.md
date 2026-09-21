# PluriDocs SEI!
---

> A extensão é compatívelo com as versões do SEI 3.x e 4.x. Também não apresentou problemas de compatibilidade com outras extensões, como SEI Pro, SEI++ e SEI+Trello.

---
Bem-vindo(a) à extensão para o navegador Google Chrome PluriDocs SEI!.

Segue abaixo os passos para obtenção de um bom resultado com o programa:

1. Antes de utilizar a extensão propriamente dita, serão necessárias duas preparações prévias, a saber:
    - No mesmo processo onde ocorrerão as replicações, deverá haver um documento modelo contendo campos dinâmicos seguinte padrão:
      -   ##nome_do_campo##
    - Utilizando um editor como: MS Excel, Libre Calc, Google Planilhas, produza uma planilha contendo a base de dados onde a extensão buscará os dados para publicação. Os nomes dos cabeçalhos da planilha deverão coincidir **exatamente** com os nomes inseridos nos campos dinâmicos correspondentes no documento modelo do SEI. A planilha deverá ser salva no formato **.CSV**
 
2. Uma vez realizados os preparativos iniciais, basta clicar no ícone da extensão (
![logo-16](https://user-images.githubusercontent.com/64798940/179245041-bcc4fd7d-5e13-4eac-8a26-862d6bfb1b61.png)), localizado na barra de ícone da tela inicial do processo;

3. Selecione o documento modelo previamente preparado para ser replicado;

4. Na próxima janela será mostrada a análise do documento modelo identificando os campos dinâmicos detectados. Caso esteja conforme esperado clique em "OK";

5. Selecione planilha no formato .CSV previamente preparada para ser a base de dados da replicação;

6. Na próxima janela será mostrada a análise da planilha de base identificando os cabeçalhos detectados e a quantidade de registros. Caso esteja conforme esperado, clique em "OK";

7. Na próxima tela verifique o cruzamento de dados entre `Base de Dados X Documento Modelo`. É também possível selecionar quais nomes os documentos receberão na árvore de processo, caso o tipo de documento a ser replicado exija a inserção de um nome através do campo "Número", presente no formulário de inserção de novo documento.
    - Existe uma tratativa de caracteres especiais (letras acentuadas, símbolos, etc.) na escolha no nome dos documentos na árvore, uma vez que a codificação adotada pelo SEI não é um padrão seguido mundialmente na Web. Para tanto, ao serem detectados caracteres deste tipo nos nomes, será apresentado uma mensagem ao usuário informando esta condição e requerendo sua autorização para proceder.

8. Ao confirmar a tela anterior, e não houverem erros no procedimento, abrirá-se uma janela que indicará o progresso da replicação. Findo este, a tela será atualizada e os novos documentos aparecerão na árvore.


---

## Excluir documentos em lote pela árvore

1. Abra o processo e clique no ícone **Excluir documentos em lote**, ao lado de **Inserir arquivos em lote**. Só então a barra **PDocs · Ações em lote** e as caixas de seleção aparecem na árvore.
2. Marque as caixas ao lado dos documentos desejados. **Marcar exibidos** seleciona os documentos visíveis; expanda as pastas para selecionar outros documentos. **Limpar** desfaz a seleção.
3. Clique em **Excluir selecionados** e confira os nomes na janela de confirmação.
4. Clique em **Confirmar exclusão**. A exclusão é definitiva e depende das permissões que o SEI disponibiliza para cada documento.
5. Acompanhe o resultado individual e clique em **Atualizar processo** ao terminar.

**Interromper após o documento atual** deixa os próximos documentos sem execução; não desfaz exclusões já realizadas. Documentos sem a ação nativa Excluir são informados como não excluídos. Se houver falha ou resultado incerto, o lote para: atualize o processo e confira o estado dos documentos antes de tentar novamente. Uma resposta HTTP bem-sucedida, sozinha, não é considerada prova de exclusão.

Esta função não depende do SEI Pro. Use **Sair da seleção** ou clique novamente no ícone para ocultar os controles e limpar a seleção. Enquanto o modo de seleção estiver ativo, as caixas acompanham os documentos carregados na árvore, inclusive após expandir pastas ou atualizar o frame.

Para qualquer dúvida, reportação de erro ou sugestão, por favor me contacte através do e-mail: [gontijo.tulio@gmail.com](mailto:gontijo.tulio@gmail.com)

