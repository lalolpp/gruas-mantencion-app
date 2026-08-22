const $ = sel => document.querySelector(sel);

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

let authOk = false;

async function navegar() {
  const hash = location.hash || '#/';
  const [ruta, query] = hash.split('?');
  const params = new URLSearchParams(query || '');
  const vista = $('#vista');

  document.querySelectorAll('.nav a')
    .forEach(a => a.classList.toggle('activo', a.getAttribute('href') === ruta));

  vista.scrollTop = 0;
  window.scrollTo(0, 0);

  try {
    if (ruta === '#/' || ruta === '#' || ruta === '') {
      await Vistas.inicio(vista);
    } else if (ruta.startsWith('#/equipo/')) {
      await Vistas.equipo(vista, decodeURIComponent(ruta.split('/')[2]));
    } else if (ruta === '#/nuevo') {
      await Vistas.nuevo(vista, params.get('equipo'));
    } else if (ruta === '#/importar') {
      await Vistas.importar(vista);
    } else if (ruta === '#/catalogo') {
      await Vistas.catalogo(vista);
    } else if (ruta.startsWith('#/editar/')) {
      await Vistas.editar(vista, decodeURIComponent(ruta.split('/')[2]));
    } else if (ruta === '#/compartir') {
      await Vistas.compartir(vista);
    } else if (ruta === '#/exportar') {
      await Vistas.exportar(vista);
    } else {
      vista.innerHTML = '<p>Vista no encontrada. <a href="#/">Ir al inicio</a></p>';
    }
  } catch (err) {
    vista.innerHTML = `<span class="aviso">Error al cargar la vista: ${esc(err.message)}</span>`;
  }
}

window.addEventListener('hashchange', () => { if (authOk) navegar(); });

window.addEventListener('beforeinstallprompt', ev => {
  ev.preventDefault();
  window._instalacionDiferida = ev;
});

Auth.guard().then(user => {
  authOk = true;
  $('#usuario').textContent = user.email;
  $('#btnSalir').addEventListener('click', () => Auth.salir());
  navegar();
}).catch(() => { location.replace('login.html'); });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
