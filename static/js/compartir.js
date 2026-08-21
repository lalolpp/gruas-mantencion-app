Vistas.compartir = async function (vista) {
  const url = location.origin + '/index.html';

  vista.innerHTML = `
    <h2>Instalar en otro dispositivo</h2>
    <p class="muted">Escanea el código QR con la cámara del celular, o envía el enlace por WhatsApp / correo.</p>

    <div class="ficha">
      <div id="qrBox" class="qr-box"><p class="muted">Generando QR…</p></div>
      <div class="compartir-acciones">
        <p><strong>Enlace de la app:</strong></p>
        <p class="enlace" id="txtUrl">${esc(url)}</p>
        <button class="btn primario ancho" id="btnCompartir">Compartir enlace</button>
        <button class="btn ancho" id="btnCopiar">Copiar enlace</button>
        <button class="btn ancho" id="btnInstalar" style="display:none">Instalar aplicación</button>
        <p class="muted">En el celular, abre el enlace y usa «Agregar a pantalla principal» para dejarla como app con ícono propio.</p>
      </div>
    </div>`;

  const qrBox = document.getElementById('qrBox');
  try {
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrBox, {
        text: url,
        width: 200,
        height: 200,
        colorDark: '#1f3a5f',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } else {
      qrBox.innerHTML = `<img alt="QR" width="200" height="200"
        src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" />`;
    }
  } catch (e) {
    qrBox.innerHTML = '<p class="aviso">No se pudo generar el QR; usa el botón de copiar o compartir.</p>';
  }

  document.getElementById('btnCopiar').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Enlace copiado');
    } catch (e) {
      const inp = document.createElement('input');
      inp.value = url;
      document.body.appendChild(inp);
      inp.select();
      document.execCommand('copy');
      inp.remove();
      toast('Enlace copiado');
    }
  });

  const btnShare = document.getElementById('btnCompartir');
  if (navigator.share) {
    btnShare.addEventListener('click', () =>
      navigator.share({ title: 'Mantención de Grúas', url })
    );
  } else {
    btnShare.style.display = 'none';
  }

  const btnInstalar = document.getElementById('btnInstalar');
  if (window._instalacionDiferida) {
    btnInstalar.style.display = 'block';
    btnInstalar.addEventListener('click', async () => {
      window._instalacionDiferida.prompt();
      await window._instalacionDiferida.userChoice;
      window._instalacionDiferida = null;
      btnInstalar.style.display = 'none';
    });
  }
};
