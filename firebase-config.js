import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, off } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyBeSx8HVZ9qD3-t1-Ww2SoA27UnDmhIKtw",
    authDomain: "hpmiotbruno-default-rtdb.firebaseio.com",
    databaseURL: "https://hpmiotbruno-default-rtdb.firebaseio.com/",
    projectId: "hpmiotbruno",
    storageBucket: "hpmiotbruno.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

window.firebaseApp = app;
window.firebaseDatabase = database;
window.firebaseRef = ref;
window.firebaseOnValue = onValue;
window.firebaseOff = off;

console.log('Firebase configurado com sucesso!');

