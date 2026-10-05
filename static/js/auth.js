const Auth = {
  usuarioActual: null,
  EMAIL_ADMIN: 'edo.electric@gmail.com',
  EMAIL_ENCARGADO: 'eduardo.espinoza@garatehermanos.cl',

  // MODO ABIERTO (decision del usuario, 2026-10-05): la app se abre sin login.
  // Con false vuelve a exigirse correo y contrasena (ver firestore.rules).
  MODO_ABIERTO: true,

  guard() {
    if (Auth.MODO_ABIERTO) {
      // Sin sesion real: objeto sintetico para que la UI pueda mostrar el estado.
      Auth.usuarioActual = { email: 'acceso abierto', abierto: true };
      return Promise.resolve(Auth.usuarioActual);
    }
    return new Promise(res => {
      firebase.auth().onAuthStateChanged(u => {
        if (u) {
          Auth.usuarioActual = u;
          res(u);
        } else {
          location.replace('login.html');
        }
      });
    });
  },
  login(email, pass) {
    return firebase.auth().signInWithEmailAndPassword(email, pass);
  },
  salir() {
    if (Auth.MODO_ABIERTO) return Promise.resolve();
    return firebase.auth().signOut().then(() => { location.replace('login.html'); });
  },
  emailActual() {
    return (Auth.usuarioActual && Auth.usuarioActual.email || '').toLowerCase();
  },
  esAdmin() {
    return Auth.MODO_ABIERTO || Auth.emailActual() === Auth.EMAIL_ADMIN;
  },
  esEncargado() {
    return Auth.MODO_ABIERTO || Auth.emailActual() === Auth.EMAIL_ENCARGADO;
  },
  // Puede crear y editar (admin y encargado)
  puedeEditar() {
    return Auth.MODO_ABIERTO || Auth.esAdmin() || Auth.esEncargado();
  },
  // En modo abierto tambien puede borrar
  puedeBorrar() {
    return Auth.MODO_ABIERTO || Auth.esAdmin();
  }
};