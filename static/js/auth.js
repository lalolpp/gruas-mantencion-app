const Auth = {
  usuarioActual: null,
  EMAIL_ADMIN: 'edo.electric@gmail.com',
  EMAIL_ENCARGADO: 'eduardo.espinoza@garatehermanos.cl',
  guard() {
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
    return firebase.auth().signOut().then(() => { location.replace('login.html'); });
  },
  emailActual() {
    return (Auth.usuarioActual && Auth.usuarioActual.email || '').toLowerCase();
  },
  esAdmin() {
    return Auth.emailActual() === Auth.EMAIL_ADMIN;
  },
  esEncargado() {
    return Auth.emailActual() === Auth.EMAIL_ENCARGADO;
  },
  // Puede crear y editar (admin y encargado)
  puedeEditar() {
    return Auth.esAdmin() || Auth.esEncargado();
  },
  // Solo el admin borra
  puedeBorrar() {
    return Auth.esAdmin();
  }
};
