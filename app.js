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

app.get('/transformations-integrales', (req, res) => {
    const coursDisponibles = [
        { name: 'Cours 1 : Introduction aux Transformations Intégrales', link: '/documents/Partiel_HEIencule_2022_Corrige.pdf' },
        { name: 'Cours 2 : Applications des Transformations Intégrales', link: '/documents/TD_EA4_approximations_des_filtres.pdf' },
    ];
    res.render('transformations-integrales', { cours: coursDisponibles });
});

app.get('/mecanique-du-solide', (req, res) => {
    res.render('mecanique-du-solide');
  });
  
  app.get('/probabilites-statistiques', (req, res) => {
    res.render('probabilites-statistiques');
  });
  
  app.get('/ressources-educatives', (req, res) => {
    res.render('ressources-educatives');
  });


app.listen(3000, () => {
    console.log(`Server is running on http://localhost:${3000}`);
  });
