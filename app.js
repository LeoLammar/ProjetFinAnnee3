const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const crypt = require('crypt');
require('dotenv').config();

async function initDB() {
    try {
        const client = new MongoClient(uri, { useUnifiedTopology: true });
        await client.connect();
        database = client.db(DATABASE_NAME);
        compte = database.collection(DATABASE_COLLECTION);
        console.log('Connexion à MongoDB réussie');
    } catch (err) {
        console.error('Erreur de connexion à MongoDB:', err);
    }
}
const uri = `mongodb+srv://${process.env.DB_ID}:${process.env.DB_PASSWORD}@cluster0.rphccsl.mongodb.net`;

const DATABASE_NAME = "Argos";
const DATABASE_COLLECTION = "Compte";

let data_to_send = {
    msg: "",
    data: null,
    user: null
};
let database = null;
let compte = null;
let current_treated_file = null;

initDB();

const session = require('express-session');


app.use(session({
    secret: 'votre_secret', // Mets une vraie valeur secrète en production
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

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

app.post('/inscription', async (req, res) => {
    const { nom, prenom, email, username, date_naissance, password, confirm_password } = req.body;

    if (!nom || !prenom || !email || !username || !date_naissance || !password || !confirm_password) {
        return res.render('inscription', { error: "Tous les champs sont obligatoires." });
    }
    if (password !== confirm_password) {
        return res.render('inscription', { error: "Les mots de passe ne correspondent pas." });
    }

    try {
        const existingUser = await compte.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.render('inscription', { error: "Email ou pseudo déjà utilisé." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await compte.insertOne({
            nom,
            prenom,
            email,
            username,
            date_naissance,
            password: hashedPassword,
            date_inscription: new Date()
        });

        res.render('inscription', { success: "Inscription réussie !" });
    } catch (err) {
        console.error(err);
        res.render('inscription', { error: "Erreur lors de l'inscription." });
    }
});

app.get('/connexion', (req, res) => {
    res.render('connexion');
});

app.post('/connexion', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('connexion', { error: "Tous les champs sont obligatoires." });
    }

    // Recherche par username ou email
    const user = await compte.findOne({
        $or: [{ username }, { email: username }]
    });

    if (!user) {
        return res.render('connexion', { error: "Identifiants incorrects." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
        return res.render('connexion', { error: "Identifiants incorrects." });
    }

    req.session.user = {
        _id: user._id,
        username: user.username,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        date_naissance: user.date_naissance
    };

    res.redirect('/');
});

app.get('/compte', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/connexion');
    }
    res.render('compte', { user: req.session.user });
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
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

// Affichage du formulaire de modification
app.get('/modifier', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/connexion');
    }
    // On récupère les infos les plus à jour depuis la base
    const user = await compte.findOne({ _id: req.session.user._id });
    res.render('modifier', { user, error: null, success: null });
});

// Traitement du formulaire de modification
app.post('/modifier', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/connexion');
    }
    const { nom, prenom, email, username, date_naissance } = req.body;

    // On récupère l'utilisateur actuel
    const userActuel = await compte.findOne({ _id: new ObjectId(req.session.user._id) });

    // On construit dynamiquement l'objet de mise à jour
    let updateFields = {};
    if (nom && nom !== userActuel.nom) updateFields.nom = nom;
    if (prenom && prenom !== userActuel.prenom) updateFields.prenom = prenom;
    if (email && email !== userActuel.email) updateFields.email = email;
    if (username && username !== userActuel.username) updateFields.username = username;
    if (date_naissance && date_naissance !== userActuel.date_naissance) updateFields.date_naissance = date_naissance;

    // Vérifier si email ou username déjà utilisé par un autre utilisateur
    if ((email && email !== userActuel.email) || (username && username !== userActuel.username)) {
        const existing = await compte.findOne({
            $and: [
                { _id: { $ne: new ObjectId(req.session.user._id) } },
                { $or: [
                    ...(email && email !== userActuel.email ? [{ email }] : []),
                    ...(username && username !== userActuel.username ? [{ username }] : [])
                ]}
            ]
        });
        if (existing) {
            return res.render('modifier', { user: req.body, error: "Email ou pseudo déjà utilisé.", success: null });
        }
    }

    // Si rien à modifier
    if (Object.keys(updateFields).length === 0) {
        return res.render('modifier', { user: userActuel, error: "Aucune modification détectée.", success: null });
    }

    // Mise à jour dans la base
    await compte.updateOne(
        { _id: new ObjectId(req.session.user._id) },
        { $set: updateFields }
    );

    // Mettre à jour la session avec les nouvelles valeurs
    const userMaj = { ...userActuel, ...updateFields };
    req.session.user = {
        _id: userMaj._id,
        nom: userMaj.nom,
        prenom: userMaj.prenom,
        email: userMaj.email,
        username: userMaj.username,
        date_naissance: userMaj.date_naissance
    };

    res.redirect('/compte');
});

// Démarrer le serveur
app.listen(3000, () => {
    console.log('Serveur démarré sur http://localhost:3000');
});