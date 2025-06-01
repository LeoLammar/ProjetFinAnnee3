const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
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

let conversations = null;
let messages = null;
let database = null;
let compte = null;
let documents = null;

// On ne garde plus une seule collection "Documents" mais une collection par matière
let matiereCollections = {};

// Utiliser la collection "Ressources" pour tous les documents
let Ressources = null;

// Correction : attendre que la connexion MongoDB soit prête avant d'accepter les requêtes
let mongoReady = false;
async function ensureIndexes() {
    if (!Ressources) return;
    try {
        await Ressources.createIndex({ matiere: 1, categorie: 1 });
        await Ressources.createIndex({ _id: 1 });
        console.log('Indexes créés sur la collection Ressources');
    } catch (e) {
        console.error('Erreur lors de la création des indexes:', e);
    }
}

// Initialisation de la connexion MongoDB
async function initDB() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        database = client.db(DATABASE_NAME);
        compte = database.collection(DATABASE_COLLECTION);
        messages = database.collection("Messages");
        conversations = database.collection("Conversations");
        Ressources = database.collection("Ressources");
        matieres.forEach(matiere => {
            matiereCollections[matiere] = database.collection(matiere);
        });
        mongoReady = true;
        console.log('Connexion à MongoDB réussie');
        await ensureIndexes();
    } catch (err) {
        console.error('Erreur de connexion à MongoDB:', err);
    }
}
initDB();

app.use((req, res, next) => {
    if (!mongoReady) {
        return res.status(503).send('Base de données non prête, réessayez dans quelques secondes.');
    }
    next();
});

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

function toUtf8(str) {
    if (!str) return '';
    try {
        // Si la chaîne contient des caractères mal encodés, corrige
        if (/Ã|Ã©|Ã¨|Ãª|Ã«|Ã¢|Ã¤|Ã®|Ã¯|Ã´|Ã¶|Ã»|Ã¼|Ã§/.test(str)) {
            return Buffer.from(str, 'latin1').toString('utf8');
        }
        // Si la chaîne contient des points d'interrogation suspects, tente la correction
        if (str.includes('?')) {
            const test = Buffer.from(str, 'latin1').toString('utf8');
            if (!test.includes('?')) return test;
        }
        return str;
    } catch (e) {
        return str;
    }
}

// Fonction utilitaire pour encoder le nom de fichier dans l'en-tête Content-Disposition (RFC 5987)
function contentDispositionFilename(filename) {
    // Pour compatibilité, on met filename et filename* (UTF-8)
    const fallback = filename.replace(/[^\x20-\x7E]/g, '_');
    const encoded = encodeURIComponent(filename).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
    return `filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

// Fonction utilitaire pour lister les fichiers PDF d'une matière/catégorie depuis la BDD
async function getPdfFilesFromDB(matiere, categorie) {
    if (!Ressources) return [];
    const docs = await Ressources.find({ matiere, categorie }).sort({ name: 1 }).toArray();
    return docs.map(doc => ({
        name: toUtf8(doc.name),
        link: `/download/${doc._id}`
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
app.use(express.json());

// Configuration de multer pour l'upload (stockage temporaire)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'tmp_uploads'));
    },
    filename: function (req, file, cb) {
        let originalName = toUtf8(file.originalname)
        let customName = req.body && req.body.customName && req.body.customName.trim() !== ''
            ? toUtf8(req.body.customName.trim().replace(/[^a-zA-Z0-9_\-\.]/g, '_'))
            : originalName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        if (!customName.endsWith('.pdf')) customName += '.pdf';
        cb(null, customName);
    }
});
const upload = multer({ storage: storage });

// Storage spécifique pour les photos de profil
const profilePhotoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public')); // ou 'public/uploads/profils' si tu veux un sous-dossier
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        cb(null, uniqueName);
    }
});
const uploadProfilePhoto = multer({ storage: profilePhotoStorage });

// Génération dynamique des routes pour chaque matière
matieres.forEach(matiere => {
    app.get(`/${matiere}`, async (req, res) => {
        // Les fichiers sont récupérés depuis la BDD, pas depuis le filesystem
        const cours = await getPdfFilesFromDB(matiere, 'cours');
        const tds = await getPdfFilesFromDB(matiere, 'tds');
        const tps = await getPdfFilesFromDB(matiere, 'tps');
        const annales = await getPdfFilesFromDB(matiere, 'annales');
        const forum = await getPdfFilesFromDB(matiere, 'forum');
        // Modifie le chemin du template pour pointer vers le sous-dossier "matieres"
        res.render(path.join('matieres', matiere), { cours, tds, tps, annales, forum });
    });
});

// Route pour télécharger un fichier depuis la BDD
app.get('/download/:id', async (req, res) => {
    if (!Ressources) return res.status(500).send('DB non connectée');
    let doc;
    try {
        const id = req.params.id;
        if (!id || !ObjectId.isValid(id)) {
            return res.status(400).send('ID invalide');
        }
        doc = await Ressources.findOne({ _id: new ObjectId(id) });
        if (!doc) {
            return res.status(404).send('Fichier non trouvé');
        }
        if (!doc.file || !doc.file.buffer) {
            return res.status(500).send('Fichier PDF absent ou corrompu dans la base. Merci de re-téléverser un PDF valide.');
        }
        let fileBuffer = null;
        if (doc.file && doc.file.buffer) {
            if (Buffer.isBuffer(doc.file.buffer)) {
                fileBuffer = doc.file.buffer;
            } else if (doc.file.buffer._bsontype === 'Binary' && doc.file.buffer.buffer) {
                fileBuffer = Buffer.from(doc.file.buffer.buffer);
            } else if (doc.file.buffer instanceof Uint8Array) {
                fileBuffer = Buffer.from(doc.file.buffer);
            } else {
                try {
                    fileBuffer = Buffer.from(doc.file.buffer);
                } catch (e) {
                    fileBuffer = null;
                }
            }
        }
        if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length < 100) {
            return res.status(500).send('Fichier PDF vide ou corrompu. Merci de re-téléverser un PDF valide.');
        }
        const safeName = toUtf8(doc.name);
        res.setHeader('Content-Disposition', `attachment; ${contentDispositionFilename(safeName)}`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', fileBuffer.length);
        res.setHeader('Accept-Ranges', 'bytes');
        res.send(fileBuffer);
    } catch (e) {
        return res.status(400).send('ID invalide');
    }
});

app.get('/view/:id', async (req, res) => {
    if (!Ressources) return res.status(500).send('DB non connectée');
    let doc;
    try {
        const id = req.params.id && typeof req.params.id === 'string' ? req.params.id.trim() : '';
        if (!ObjectId.isValid(id)) {
            console.error('ID non valide pour MongoDB:', id);
            return res.status(400).send('ID invalide');
        }
        doc = await Ressources.findOne({ _id: new ObjectId(id) });
    } catch (e) {
        console.error('Erreur lors de la recherche MongoDB:', e);
        return res.status(400).send('ID invalide');
    }
    if (!doc) {
        console.error('Aucun document trouvé pour cet ID:', req.params.id);
        return res.status(404).send('Fichier non trouvé');
    }
    // Correction : gestion BSON Binary (cas MongoDB Compass/Node.js)
    let fileBuffer = null;
    if (doc.file && doc.file.buffer) {
        if (Buffer.isBuffer(doc.file.buffer)) {
            fileBuffer = doc.file.buffer;
        } else if (doc.file.buffer._bsontype === 'Binary' && doc.file.buffer.buffer) {
            // Cas BSON Binary (driver MongoDB)
            fileBuffer = Buffer.from(doc.file.buffer.buffer);
        } else if (doc.file.buffer instanceof Uint8Array) {
            fileBuffer = Buffer.from(doc.file.buffer);
        } else {
            try {
                fileBuffer = Buffer.from(doc.file.buffer);
            } catch (e) {
                fileBuffer = null;
            }
        }
    }
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length < 100) {
        return res.status(500).send('Fichier PDF vide ou corrompu. Merci de re-téléverser un PDF valide.');
    }
    let filename = doc.name && !doc.name.toLowerCase().endsWith('.pdf') ? doc.name + '.pdf' : doc.name;
    filename = toUtf8(filename);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.send(fileBuffer);
});

app.get('/pdf/:id', async (req, res) => {
    if (!Ressources) return res.status(500).send('DB non connectée');
    let doc;
    try {
        const id = req.params.id;
        if (!id || typeof id !== 'string' || id.length !== 24 || !/^[a-fA-F0-9]{24}$/.test(id)) {
            return res.status(400).send('ID invalide');
        }
        doc = await Ressources.findOne({ _id: ObjectId(id) });
    } catch (e) {
        return res.status(400).send('ID invalide');
    }
    if (!doc) return res.status(404).send('Fichier non trouvé');
    let fileBuffer = doc.file && doc.file.buffer
        ? (Buffer.isBuffer(doc.file.buffer) ? doc.file.buffer : Buffer.from(doc.file.buffer))
        : null;
    if (!fileBuffer) return res.status(500).send('Fichier corrompu');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.name}"`);
    res.send(fileBuffer);
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

app.get('/classement', (req, res) => {
    res.render('classement');
});
  
app.use('/icons', express.static(path.join(__dirname, 'icons')));
  

app.get('/Ressources-educatives', (req, res) => {
    res.render('Ressources-educatives');
});

app.post('/upload/:matiere', upload.array('pdfFile', 10), async (req, res) => {
    if (!Ressources) {
        return res.status(500).send('DB non connectée');
    }
    try {
        const matiere = req.params.matiere;
        if (!matieres.includes(matiere)) {
            return res.status(400).send('Matière inconnue');
        }
        const categorie = req.body.categorie;
        // req.files est un tableau de fichiers
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('Aucun fichier envoyé');
        }
        for (const file of req.files) {
            const fileBuffer = fs.readFileSync(file.path);
            if (!fileBuffer || fileBuffer.length < 100) {
                fs.unlinkSync(file.path);
                continue;
            }
            const doc = {
                matiere,
                categorie,
                name: toUtf8(req.body.customName && req.body.customName.trim() !== '' ? req.body.customName.trim() : file.originalname),
                file: { buffer: fileBuffer },
                uploadedAt: new Date()
            };
            await Ressources.insertOne(doc);
            fs.unlinkSync(file.path);
        }
        res.redirect('/' + matiere);
    } catch (err) {
        res.status(500).send('Erreur lors de l\'upload');
    }
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
    if (!req.session.user || !req.session.user._id) {
        return res.redirect('/connexion');
    }
    // Convertit l'id en ObjectId pour la requête MongoDB
    const user = await compte.findOne({ _id: new ObjectId(req.session.user._id) });
    if (!user) {
        req.session.destroy(() => {
            res.redirect('/connexion');
        });
        return;
    }
    req.session.user = {
        _id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        username: user.username,
        date_naissance: user.date_naissance,
        photo: user.photo
    };
    res.render('modifier', { user, error: null, success: null });
});

// Traitement du formulaire de modification
app.post('/modifier', uploadProfilePhoto.single('photo'), async (req, res) => {
    if (!req.session.user || !req.session.user._id) return res.redirect('/connexion');
    const { nom, prenom, email, username, date_naissance } = req.body;
    const userActuel = await compte.findOne({ _id: new ObjectId(req.session.user._id) });

    let updateFields = {};
    if (nom && nom !== userActuel.nom) updateFields.nom = nom;
    if (prenom && prenom !== userActuel.prenom) updateFields.prenom = prenom;
    if (email && email !== userActuel.email) updateFields.email = email;
    if (username && username !== userActuel.username) updateFields.username = username;
    if (date_naissance && date_naissance !== userActuel.date_naissance) updateFields.date_naissance = date_naissance;

    // Ajoute la photo SEULEMENT si un fichier est uploadé
    if (req.file) {
        updateFields.photo = '/' + req.file.filename;
    }

    if (Object.keys(updateFields).length === 0) {
        return res.render('modifier', { user: userActuel, error: "Aucune modification détectée.", success: null });
    }

    await compte.updateOne(
        { _id: new ObjectId(req.session.user._id) },
        { $set: updateFields }
    );

    // Mets à jour la session avec la nouvelle photo si besoin
    const userMaj = { ...userActuel, ...updateFields };
    req.session.user = {
        _id: userMaj._id,
        nom: userMaj.nom,
        prenom: userMaj.prenom,
        email: userMaj.email,
        username: userMaj.username,
        date_naissance: userMaj.date_naissance,
        photo: userMaj.photo
    };

    res.redirect('/compte');
});

function redirectIfAuthenticated(req, res, next) {
    if (req.session.user && req.session.user._id) {
        return res.redirect('/compte');
    }
    next();
}

// Utilise ce middleware sur les routes concernées
app.get('/connexion', redirectIfAuthenticated, (req, res) => {
    res.render('connexion');
});

app.get('/inscription', redirectIfAuthenticated, (req, res) => {
    res.render('inscription');
});

app.post('/connexion', redirectIfAuthenticated, async (req, res) => {
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
        photo: user.photo,
    };

    res.redirect('/');
});

app.post('/inscription', redirectIfAuthenticated, uploadProfilePhoto.single('photo'), async (req, res) => {
    const { nom, prenom, email, username, date_naissance, password, confirm_password } = req.body;
    let photoPath = req.file ? '/' + req.file.filename : '/default.png';

    // ...vérifications comme avant...

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
            photo: photoPath,
            date_inscription: new Date()
        });

        res.render('inscription', { success: "Inscription réussie !" });
    } catch (err) {
        console.error(err);
        res.render('inscription', { error: "Erreur lors de l'inscription." });
    }
});

// Démarrer le serveur
app.get('/search-users', async (req, res) => {
    const query = req.query.q;

    if (!query || !compte) return res.json([]);

    try {
        const users = await compte.find({
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { prenom: { $regex: query, $options: 'i' } },
                { nom: { $regex: query, $options: 'i' } }
            ]
        })
        .project({ username: 1, nom: 1, prenom: 1 }) // Pas d'email ou mot de passe !
        .limit(10)
        .toArray();

        res.json(users);
    } catch (err) {
        console.error('Erreur de recherche :', err);
        res.status(500).json([]);
    }
});

// Route API pour récupérer la liste des conversations
app.get('/api/conversations', async (req, res) => {
    const currentUser = req.session.user;
    
    if (!currentUser) {
        return res.status(401).json({ error: 'Non connecté' });
    }
    try {
        const conversationsCollection = database.collection('Conversations');
        
        const conversations = await conversationsCollection.find({
            participants: currentUser.username
        }).sort({ 
            lastActivity: -1,  // Trier par dernière activité
            createdAt: -1      // Puis par date de création
        }).toArray();

        res.json(conversations);
    } catch (error) {
        console.error('Erreur lors de la récupération des conversations:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Nouvelle route pour créer une conversation (GET avec réponse JSON)
app.get('/messagerie/create', async (req, res) => {
    const currentUser = req.session.user;
    const targetUsername = req.query.user;
    
    if (!currentUser || !targetUsername) {
        return res.json({ success: false, error: 'Paramètres manquants' });
    }
    try {
        const conversationsCollection = database.collection('Conversations');
        
        // Vérifier si la conversation existe déjà
        let conv = await conversationsCollection.findOne({
            participants: { $all: [currentUser.username, targetUsername] }
        });

        if (!conv) {
            // Créer une nouvelle conversation
            const insertResult = await conversationsCollection.insertOne({
                participants: [currentUser.username, targetUsername],
                messages: [],
                createdAt: new Date(),
                lastActivity: new Date()
            });
            
            conv = await conversationsCollection.findOne({ _id: insertResult.insertedId });
        }

        res.json({ success: true, conversation: conv });
    } catch (error) {
        console.error('Erreur lors de la création de la conversation:', error);
        res.json({ success: false, error: 'Erreur serveur' });
    }
});

app.get('/messagerie', async (req, res) => {
    const currentUser = req.session.user;
    if (!currentUser) return res.redirect('/connexion');

    const conversationsCollection = database.collection('Conversations');
    const selectedUsername = req.query.user;

    let selectedUser = null;
    let messages = [];

    // Toutes les conversations où l'utilisateur connecté participe
    const conversations = await conversationsCollection.find({
        participants: currentUser.username
    }).sort({
        lastActivity: -1,
        createdAt: -1
    }).toArray();

    // Si on a cliqué sur un utilisateur
    if (selectedUsername) {
        selectedUser = await compte.findOne({ username: selectedUsername });

        if (selectedUser) {
            let conv = await conversationsCollection.findOne({
                participants: { $all: [currentUser.username, selectedUsername] }
            });
            if (!conv) {
                // Créer une nouvelle conversation vide
                const insertResult = await conversationsCollection.insertOne({
                    participants: [currentUser.username, selectedUsername],
                    messages: [],
                    createdAt: new Date(),
                    lastActivity: new Date()
                });
                conv = await conversationsCollection.findOne({ _id: insertResult.insertedId });
            }

            if (conv && conv.messages) {
                messages = conv.messages;
            }
        }
    }

    res.render('messagerie', {
        currentUser,
        selectedUser,
        messages,
        conversations
    });
});

app.post('/messagerie/send', async (req, res) => {
    const { to, message } = req.body;
    const currentUser = req.session.user;

    if (!currentUser || !to || !message) {
        return res.redirect('/messagerie');
    }

    try {
        const conversationsCollection = database.collection('Conversations');
        
        // Trouver ou créer la conversation
        let conv = await conversationsCollection.findOne({
            participants: { $all: [currentUser.username, to] }
        });

        if (!conv) {
            const insertResult = await conversationsCollection.insertOne({
                participants: [currentUser.username, to],
                messages: [],
                createdAt: new Date(),
                lastActivity: new Date()
            });
            conv = await conversationsCollection.findOne({ _id: insertResult.insertedId });
        }
        // Ajouter le message
        const newMessage = {
            from: currentUser.username,
            to: to,
            text: message,
            timestamp: new Date()
        };

        await conversationsCollection.updateOne(
            { _id: conv._id },
            { 
                $push: { messages: newMessage },
                $set: { lastActivity: new Date() }
            }
        );

        // Émettre l'événement WebSocket pour notifier tous les clients
        io.emit('newMessage', {
            conversationId: conv._id,
            message: newMessage,
            participants: conv.participants
        });

        res.redirect('/messagerie?user=' + encodeURIComponent(to));
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        res.redirect('/messagerie');
    }
});

const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http);

// Démarre le serveur sur le port 3000 avec WebSocket
http.listen(3000, () => {
    console.log('Serveur WebSocket + Express lancé sur http://localhost:3000');
});

// Modification du gestionnaire WebSocket
io.on('connection', (socket) => {
    console.log('Un utilisateur est connecté via WebSocket');

    socket.on('newConversation', (data) => {
        console.log('Nouvelle conversation créée:', data);
        // Émettre à tous les clients connectés
        socket.broadcast.emit('refreshConversations', data);
    });

    socket.on('joinConversation', (conversationId) => {
        socket.join(conversationId);
        console.log(`Utilisateur rejoint la conversation: ${conversationId}`);
    });

    socket.on('disconnect', () => {
        console.log('Utilisateur déconnecté');
    });
});