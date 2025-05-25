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
    res.render('accueil'); // index.ejs dans le dossier "views"
});
app.get('/emploidutemps', (req, res) => {
    res.render('emploidutemps');
});

app.get('/inscription', (req, res) => {
  res.render('inscription');
});

app.post('/inscription', (req, res) => {
  res.redirect('/');
});

app.get('/connexion', (req, res) => {
    res.render('connexion');
});

app.post('/connexion', (req, res) => {
  res.redirect('/');
});

app.get('/compte', (req, res) => {
  res.render('compte');
});

app.get('/mentorat', (req, res) => {
    res.render('mentorat');
});

app.get('/salles', (req, res) => {
    res.render('salleDeClasse');
});

app.get('/messagerie', (req, res) => {
    res.render('messagerie');
});

app.get('/classement', (req, res) => {
    res.render('classement');
});
  
app.use('/icons', express.static(path.join(__dirname, 'icons')));
  

// Démarrer le serveur
app.listen(3000, () => {
    console.log('Serveur démarré sur http://localhost:3000');
});