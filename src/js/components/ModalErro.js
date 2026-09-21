import * as functions from '../functions/functions.js'

const ModalErro = () => {
  $('body').append(`
    <div id="modalErro" title="🤦‍♂️ Ops...">
    <div style="text-align:center;margin-top:15px">
    <p>Eita! Algo deu errado na replicação de documentos 😔</p>
    <br>
    <p>Verifique as configurações selecionadas e tente novamente.</p>
    <p id="modalErroDetalhe" style="overflow-wrap:anywhere"></p>
    <br>
    <small>Caso o problema persista, entre em contato com o desenvolvedor através do email:</small>
    <br><br>
    <a href="mailto:alexandre.augusto@outlook.com" style="font-size: 12.5px">alexandre.augusto@outlook.com</a>
    </div>
    </div>
  `)

  $('#modalErro').dialog({
    autoOpen: false,
    resizable: false,
    classes: {
      "ui-dialog": "modalPluri"
    },
    position: { my: "center", of: window },
    width: 600,
    show: 100,
    close: () => {
      $(this).dialog("close");
      functions.clearInputs();
    },
    modal: true,
    buttons: [
      {
        text: "OK",
        prepend: `<span class='ui-icon ui-icon-circle-b-check'></span>`,
        click: function () {
          $(this).dialog("close");
          functions.clearInputs();
        }
      },
      {
        text: "Ajuda",
        prepend: `<span class='ui-icon ui-icon-circle-b-help'></span>`,
        click: function () {
          window.open("https://tcgontijo.github.io/PluriDocs-SEI/help")
        }
      }
    ]
  });
}

export default ModalErro;
