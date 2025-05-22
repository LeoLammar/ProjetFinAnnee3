const express = require('express');
const app = express();
const path = require('path');

// Définir le moteur de vue
app.set('view engine', 'ejs');
// Indiquer le dossier des vues
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Définir une route
app.get('/', (req, res) => {
    res.render('index'); // index.ejs dans le dossier "views"
});
app.get('/emploidutemps', (req, res) => {
    res.render('emploidutemps');
  });
  
// Démarrer le serveur
app.listen(3000, () => {
    console.log('Serveur démarré sur http://localhost:3000');
});
