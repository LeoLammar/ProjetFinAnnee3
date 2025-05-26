const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const crypt = require('crypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');
require('dotenv').config();

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

    const body = req.body;

    // Check fields
    if (!body.email || !body.password) {
        return res.redirect("/inscription");
    }

    // Hashing password using md5
    const clearPass = body.password;
    const hashedPass = crypto.createHash('md5').update(clearPass).digest("hex");

    // Find user by username
    let query = { username: body.email, password: hashedPass };
    let findUser = await clients.findOne(query);

    // Find user by email
    query = { email: body.email, password: hashedPass };
    if (!findUser)
        findUser = await clients.findOne(query);


    // User doesn't exist
    if (!findUser) {
        updateDataToSend(req, "Les identifiants sont incorrects");
        return res.redirect('/connexion');
    }

    req.session.user = findUser;

    data_to_send.connected = true;

    updateDataToSend(req, "");

    return res.redirect("/");

})

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

// Exemple d'utilisation de la base pour une route front/back
app.get('/api/user/:username', async (req, res) => {
    if (!compte) return res.status(500).json({ error: 'DB non connectée' });
    const user = await compte.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ username: user.username, email: user.email });
});

// Démarrer le serveur
app.listen(3000, () => {
    console.log('Serveur démarré sur http://localhost:3000');
});