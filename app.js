const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Fonction utilitaire pour lister les fichiers PDF d'un dossier
function getPdfFilesFromDir(dirPath) {
    try {
        const files = fs.readdirSync(dirPath);
        return files
            .filter(file => file.endsWith('.pdf'))
            .map(file => ({
                name: file,
                link: dirPath.replace(path.join(__dirname, 'public'), '').replace(/\\/g, '/') + '/' + file
            }));
    } catch (e) {
        return [];
    }
}

// Liste des matières à gérer dynamiquement
const matieres = [
    'transformations-integrales',
    'mecanique-du-solide',
    'probabilites-statistiques',
    'anglais',
    'decryptage-de-linformation',
    'electronique-numerique',
    'enjeu-du-developpement-durable',
    'ethique-de-lingenieur',
    'gestion-de-projet',
    'infographie',
    'international-break',
    'mecanique-quantique',
    'programmation-java',
    'analyse-des-signaux',
    'automatique',
    'base-de-donnees',
    'competences-en-travail-dequipe',
    'comptabilite',
    'devops',
    'economie-dentreprise',
    'electronique-analogique',
    'marketing',
    'physique-du-solide',
    'projet-de-fin-dannee',
    'projet-delectronique-numerique',
    'reseaux',
    'projet-dinformatique',
    'projet'
];

// Définir le moteur de vue
app.set('view engine', 'ejs');
// Indiquer le dossier des vues
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware pour parser les formulaires
app.use(express.urlencoded({ extended: true }));

// Configuration de multer pour l'upload (stockage temporaire)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'tmp_uploads'));
    },
    filename: function (req, file, cb) {
        let customName = req.body && req.body.customName && req.body.customName.trim() !== ''
            ? req.body.customName.trim().replace(/[^a-zA-Z0-9_\-\.]/g, '_')
            : file.originalname.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        if (!customName.endsWith('.pdf')) customName += '.pdf';
        cb(null, customName);
    }
});
const upload = multer({ storage: storage });

// Génération dynamique des routes pour chaque matière
matieres.forEach(matiere => {
    app.get(`/${matiere}`, (req, res) => {
        const baseDir = path.join(__dirname, 'public', 'documents', matiere);
        const cours = getPdfFilesFromDir(path.join(baseDir, 'cours'));
        const tds = getPdfFilesFromDir(path.join(baseDir, 'tds'));
        const tps = getPdfFilesFromDir(path.join(baseDir, 'tps'));
        const annales = getPdfFilesFromDir(path.join(baseDir, 'annales'));
        const forum = getPdfFilesFromDir(path.join(baseDir, 'forum'));
        res.render(matiere, { cours, tds, tps, annales, forum });
    });
});

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
  

app.get('/ressources-educatives', (req, res) => {
    res.render('ressources-educatives');
});

// Route POST générique pour l'upload de fichiers pour toutes les matières
app.post('/upload/:matiere', upload.single('pdfFile'), (req, res) => {
    const matiere = req.params.matiere;
    if (!matieres.includes(matiere)) {
        return res.status(400).send('Matière inconnue');
    }
    const categorie = req.body.categorie;
    const tmpPath = req.file.path;
    const destDir = path.join(__dirname, 'public', 'documents', matiere, categorie);
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, req.file.filename);
    fs.renameSync(tmpPath, destPath);
    res.redirect('/' + matiere);
});

// Démarrer le serveur
app.listen(3000, () => {
    console.log('Serveur démarré sur http://localhost:3000');
});