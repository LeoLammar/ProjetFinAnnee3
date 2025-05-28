const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const crypt = require('crypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');
require('dotenv').config();
const axios = require('axios');

// Connexion à MongoDB
const uri = `mongodb+srv://${process.env.DB_ID}:${process.env.DB_PASSWORD}@cluster0.rphccsl.mongodb.net`;
const DATABASE_NAME = "Argos";
const DATABASE_COLLECTION = "Compte";
const DOCUMENTS_COLLECTION = "Documents"; // Nouvelle collection pour les fichiers

let database = null;
let compte = null;
let documents = null;

// Initialisation de la connexion MongoDB
async function initDB() {
    try {
        const client = new MongoClient(uri, { useUnifiedTopology: true });
        await client.connect();
        database = client.db(DATABASE_NAME);
        compte = database.collection(DATABASE_COLLECTION);
        documents = database.collection(DOCUMENTS_COLLECTION); // Ajout
        console.log('Connexion à MongoDB réussie');
    } catch (err) {
        console.error('Erreur de connexion à MongoDB:', err);
    }
}
initDB();

// Sessions utilisateurs stockées dans MongoDB
app.use(session({
    secret: process.env.SESSION_SECRET || 'argos_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: uri, dbName: DATABASE_NAME }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 jour
}));

let data_to_send = {
    msg: "",
    data: null,
    user: null
};



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

// Fonction utilitaire pour lister les fichiers PDF d'une matière/catégorie depuis la BDD
async function getPdfFilesFromDB(matiere, categorie) {
    if (!documents) return [];
    const docs = await documents.find({ matiere, categorie }).toArray();
    return docs.map(doc => ({
        name: doc.name,
        link: `/download/${doc._id}` // Route de téléchargement
    }));
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

// Supprimer la route d'upload qui stocke dans le filesystem (gardez uniquement la BDD)
app.post('/upload/:matiere', upload.single('pdfFile'), async (req, res) => {
    const matiere = req.params.matiere;
    if (!matieres.includes(matiere)) {
        return res.status(400).send('Matière inconnue');
    }
    const categorie = req.body.categorie;
    const fileBuffer = fs.readFileSync(req.file.path);
    const doc = {
        matiere,
        categorie,
        name: req.body.customName && req.body.customName.trim() !== '' ? req.body.customName.trim() : req.file.originalname,
        file: { buffer: fileBuffer },
        uploadedAt: new Date()
    };
    await documents.insertOne(doc);
    fs.unlinkSync(req.file.path); // Nettoyage du fichier temporaire
    res.redirect('/' + matiere);
});

// Génération dynamique des routes pour chaque matière
matieres.forEach(matiere => {
    app.get(`/${matiere}`, async (req, res) => {
        // Les fichiers sont récupérés depuis la BDD, pas depuis le filesystem
        const cours = await getPdfFilesFromDB(matiere, 'cours');
        const tds = await getPdfFilesFromDB(matiere, 'tds');
        const tps = await getPdfFilesFromDB(matiere, 'tps');
        const annales = await getPdfFilesFromDB(matiere, 'annales');
        const forum = await getPdfFilesFromDB(matiere, 'forum');
        res.render(matiere, { cours, tds, tps, annales, forum });
    });
});

// Route pour télécharger un fichier depuis la BDD
app.get('/download/:id', async (req, res) => {
    if (!documents) return res.status(500).send('DB non connectée');
    const doc = await documents.findOne({ _id: new require('mongodb').ObjectId(req.params.id) });
    if (!doc) return res.status(404).send('Fichier non trouvé');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.name}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(doc.file.buffer);
});

// Définir une route
app.get('/', (req, res) => {
    res.render('accueil'); // index.ejs dans le dossier "views"
});


app.get('/emploidutemps', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/connexion');
    }
    // Affiche juste le formulaire, pas d'appel API ici
    res.render('emploidutemps', { planning: [], error: null });
});

app.post('/emploidutemps', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/connexion');
    }
    const password_mauria = req.body.password_mauria;
    if (!password_mauria) {
        return res.render('emploidutemps', { planning: [], error: "Veuillez saisir votre mot de passe Aurion pour accéder à l'emploi du temps." });
    }

    const email = req.session.user.email;

    // Récupère la date de début de semaine depuis le formulaire ou prend la semaine courante
    let start = req.body.start ? new Date(req.body.start) : new Date();
    // Si la date n'est pas valide, prend aujourd'hui
    if (isNaN(start)) start = new Date();
    // Calcule le lundi de la semaine
    start.setDate(start.getDate() - start.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 5); // Samedi

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    let planning = [];
    let error = null;

    try {
        const response = await axios.post(
            `https://mauriaapi.fly.dev/exactPlanning?start=${startStr}&end=${endStr}`,
            {
                username: email,
                password: password_mauria
            },
            {
                headers: {
                    'accept': '/',
                    'Content-Type': 'application/json'
                }
            }
        );
        planning = response.data;
    } catch (err) {
        error = "Mot de passe aurion incorrect.";
    }

    // Passe la date de début à la vue pour la navigation
    res.render('emploidutemps', { planning, error, start: startStr, password_mauria });
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
        date_naissance: user.date_naissance,
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

// Exemple d'utilisation de la base pour une route front/back
app.get('/api/user/:username', async (req, res) => {
    if (!compte) return res.status(500).json({ error: 'DB non connectée' });
    const user = await compte.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ username: user.username, email: user.email });
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
    date_naissance: userMaj.date_naissance,
    password_mauria: req.session.user.password_mauria // <-- garde le mot de passe Mauria !
};

    res.redirect('/compte');
});

// Démarrer le serveur
app.listen(3000, () => {
    console.log('Serveur démarré sur http://localhost:3000');
});