import * as functions from '../functions/functions.js'

const ModalSucesso = () => {
  $('body').append(`
    <div id="modalSucesso" title="✅ Concluído">
    <div style="text-align:center;margin-top:15px">
    <span class='ui-icon ui-icon-circle-b-check' style="display:inline-block;transform:scale(2.2);margin:10px 0 20px;color:#0a8a4f"></span>
    <p style="font-size:1.15em;font-weight:bold">Documentos criados com sucesso! 🎉</p>
    <br>
    <p id="sucessoResumo"></p>
    </div>
    </div>
  `)

  $('#modalSucesso').dialog({
    autoOpen: false,
    resizable: false,
    classes: {
      "ui-dialog": "modalPluri"
    },
    position: { my: "center", of: window },
    width: 500,
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
      }
    ]
  });
}

export default ModalSucesso;
