const Auth = {
  usuarioActual: null,
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
  }
};
