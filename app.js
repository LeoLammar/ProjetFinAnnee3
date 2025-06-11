const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI, Part } = require("@google/generative-ai");
const { file } = require("buffer");
require('dotenv').config();
const multer = require('multer');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');
const axios = require('axios');

// Connexion à MongoDB
const uri = `mongodb+srv://${process.env.DB_ID}:${process.env.DB_PASSWORD}@cluster0.rphccsl.mongodb.net`;
const DATABASE_NAME = "Argos";
const DATABASE_COLLECTION = "Compte";
const DOCUMENTS_COLLECTION = "Documents";

let conversations = null;
let messages = null;
let database = null;
let compte = null;
let documents = null;
let mentorat = null;
let associationEvents = null;

let groups = null; // NOUVEAU: Collection pour les groupes

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
        groups = database.collection("Groups"); 
        Ressources = database.collection("Ressources");
        mentorat = database.collection('mentorat');
        associationEvents = database.collection('AssociationEvents');
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
        let forum = [];
        if (Ressources) {
            forum = await Ressources.find({ matiere, categorie: 'forum' }).sort({ createdAt: -1 }).toArray();
        }
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
    res.render('emploidutemps', { planning: [], error: null, user: req.session.user});
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
    res.render('emploidutemps', { planning, error, start: startStr, password_mauria, user: req.session.user });
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

app.get('/mentorat/mes-cours', async (req, res) => {
    if (!req.session.user || !req.session.user._id) {
        return res.status(401).json({ success: false, error: 'Non connecté' });
    }

    try {
        const cours = await mentorat.find({ enseignant_id: new ObjectId(req.session.user._id) }).toArray();
        res.json({ success: true, cours });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.delete('/mentorat/supprimer/:id', async (req, res) => {
    if (!req.session.user || !req.session.user._id) {
        return res.status(401).json({ success: false, error: 'Non connecté' });
    }

    const coursId = req.params.id;
    if (!ObjectId.isValid(coursId)) {
        return res.status(400).json({ success: false, error: 'ID invalide' });
    }

    try {
        const resultat = await mentorat.deleteOne({
            _id: new ObjectId(coursId),
            enseignant_id: new ObjectId(req.session.user._id) // Sécurité : on supprime que ses propres cours
        });

        if (resultat.deletedCount === 1) {
            res.json({ success: true });
        } else {
            res.json({ success: false, error: "Cours introuvable ou non autorisé" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.delete('/mentorat/reserver/:id', async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(403).json({ success: false, error: 'Non autorisé' });
    }

    const coursId = req.params.id;
    const cours = await mentorat.findOne({ _id: new ObjectId(coursId) });

    if (!cours) {
      return res.status(404).json({ success: false, error: 'Cours introuvable' });
    }

    await mentorat.deleteOne({ _id: new ObjectId(coursId) });

    // Incrément score élève
    await compte.updateOne(
      { _id: new ObjectId(req.session.user._id) },
      { $inc: { score: 1 } }
    );

    // Incrément score enseignant
    await compte.updateOne(
      { _id: cours.enseignant_id },
      { $inc: { score: 1 } }
    );

    console.log("Réservation traitée avec succès");
    res.json({ success: true }); // 👈 cette ligne est essentielle
  } catch (err) {
    console.error("Erreur dans /mentorat/reserver/:id :", err);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});




app.get('/mentorat/liste', async (req, res) => {
    if (!req.session.user || !req.session.user._id) {
        return res.status(401).json({ success: false, error: 'Non connecté' });
    }

    try {
        const cours = await mentorat.find({
            enseignant_id: { $ne: new ObjectId(req.session.user._id) }
        }).toArray();


        res.json({ success: true, cours });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});



app.post('/mentorat/creer', async (req, res) => {
    if (!req.session.user || !req.session.user._id) {
        return res.status(401).json({ success: false, error: 'Utilisateur non connecté' });
    }

    const { matiere, duree, module, message, heure_debut, date } = req.body;

    if (!matiere || !duree || !module) {
        return res.status(400).json({ success: false, error: 'Champs manquants' });
    }

    try {
        const cours = {
            matiere,
            duree,
            module,
            message: message || '',
            enseignant_id: new ObjectId(req.session.user._id),
            enseignant_nom: req.session.user.nom,
            enseignant_prenom: req.session.user.prenom,
            date_creation: new Date(),
            date: new Date(date)
        };

        let heure_fin = null;
        if (heure_debut && duree) {
            const [startHour, startMin] = heure_debut.split(':').map(Number);
            const [dureeHour, dureeMin] = duree.split(':').map(Number);
            const end = new Date(0, 0, 0, startHour + dureeHour, startMin + dureeMin);
            heure_fin = end.getHours().toString().padStart(2, '0') + ':' + end.getMinutes().toString().padStart(2, '0');
        }

        cours.heure_debut = heure_debut;
        cours.heure_fin = heure_fin;


        await mentorat.insertOne(cours);

        res.json({ success: true, message: 'Cours créé avec succès' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.get('/salles', (req, res) => {
    res.render('salleDeClasse');
});

app.get('/classement', async (req, res) => {
  try {
    const utilisateurs = await compte
      .find({}, { nom: 1, prenom: 1, score: 1, _id: 0 })
      .sort({ score: -1 })
      .toArray();

    res.render('classement', { utilisateurs });
  } catch (err) {
    console.error('Erreur chargement classement:', err);
    res.status(500).send('Erreur serveur');
  }
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
        photo: user.photo,
        perm: user.perm
    };
    res.render('modifier', { user, error: null, success: null });
});

// Traitement du formulaire de modification
app.post('/modifier', uploadProfilePhoto.single('photo'), async (req, res) => {
    if (!req.session.user || !req.session.user._id) return res.redirect('/connexion');
    const { nom, prenom, email, username, date_naissance } = req.body;
    const userActuel = await compte.findOne({ _id: new ObjectId(req.session.user._id) });

    if (req.body.nom && req.body.nom.trim() === '/gambling') {
        return res.render('gambling');
    }
    
    let updateFields = {};
    if (nom && nom !== userActuel.nom) updateFields.nom = nom;
    if (prenom && prenom !== userActuel.prenom) updateFields.prenom = prenom;
    if (email && email !== userActuel.email) updateFields.email = email;
    if (username && username !== userActuel.username) updateFields.username = username;
    if (date_naissance && date_naissance !== userActuel.date_naissance) updateFields.date_naissance = date_naissance;

    // Gestion de la photo de profil
    if (req.file) {
        // Supprimer l'ancienne photo si ce n'est pas la photo par défaut
        if (userActuel.photo && userActuel.photo !== '/default.png') {
            try {
                const oldPhotoPath = path.join(__dirname, 'public', userActuel.photo.replace(/^\//, ''));
                if (fs.existsSync(oldPhotoPath)) {
                    fs.unlinkSync(oldPhotoPath);
                }
            } catch (err) {
                console.error("Erreur lors de la suppression de l'ancienne photo:", err);
            }
        }
        // Enregistre le chemin de la nouvelle photo (dans public)
        updateFields.photo = '/' + req.file.filename;
    }

    if (Object.keys(updateFields).length === 0) {
        return res.render('modifier', { user: userActuel, error: "Aucune modification détectée.", success: null });
    }

    await compte.updateOne(
        { _id: new ObjectId(req.session.user._id) },
        { $set: updateFields }
    );

    // Mettre à jour la session
    const userMaj = await compte.findOne({ _id: new ObjectId(req.session.user._id) });
    req.session.user = {
        _id: userMaj._id,
        nom: userMaj.nom,
        prenom: userMaj.prenom,
        email: userMaj.email,
        username: userMaj.username,
        date_naissance: userMaj.date_naissance,
        photo: userMaj.photo,
        perm: userMaj.perm
    };

    // Forcer le rechargement en redirigeant
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
        perm: user.perm
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
            date_inscription: new Date(),
            perm: 0
        });

        res.render('inscription', { success: "Inscription réussie !" });
    } catch (err) {
        console.error(err);
        res.render('inscription', { error: "Erreur lors de l'inscription." });
    }
});

// ========== ROUTES DE RECHERCHE ET MESSAGERIE ==========

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

// ========== NOUVELLES ROUTES POUR LES GROUPES ==========

// Configuration du stockage pour les photos de groupe
const groupPhotoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public', 'group_photos'));
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        cb(null, uniqueName);
    }
});
const uploadGroupPhoto = multer({ storage: groupPhotoStorage });

app.post('/groups/create', uploadGroupPhoto.single('avatar'), async (req, res) => {
    const currentUser = req.session.user;
    if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Non connecté' });
    }

    try {
        const { name, description } = req.body;
        
        // Parse les membres - ils peuvent être envoyés comme string JSON
        let members = [];
        if (req.body.members) {
            if (typeof req.body.members === 'string') {
                try {
                    members = JSON.parse(req.body.members);
                } catch (e) {
                    // Si ce n'est pas du JSON valide, on considère que c'est un tableau vide
                    members = [];
                }
            } else if (Array.isArray(req.body.members)) {
                members = req.body.members;
            }
        }

        // Validation - le nom est obligatoire, mais pas les membres
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: 'Le nom du groupe est obligatoire' });
        }

        // Créer la liste des membres (au minimum l'utilisateur actuel)
        const memberUsernames = [currentUser.username];
        if (Array.isArray(members) && members.length > 0) {
            // Ajouter les autres membres s'il y en a
            members.forEach(member => {
                if (member && typeof member === 'string' && member !== currentUser.username) {
                    memberUsernames.push(member);
                }
            });
        }
        
        const uniqueMembers = [...new Set(memberUsernames)]; // Supprimer les doublons

        // Vérifier que tous les membres existent (seulement s'il y en a d'autres que l'utilisateur actuel)
        if (uniqueMembers.length > 1) {
            const existingUsers = await compte.find({
                username: { $in: uniqueMembers }
            }).toArray();
            
            if (existingUsers.length !== uniqueMembers.length) {
                return res.status(400).json({ success: false, error: 'Certains utilisateurs n\'existent pas' });
            }
        }

        // Déterminer le chemin de l'avatar
        let avatarPath = '/group_photos/default.png';
        if (req.file) {
            avatarPath = '/group_photos/' + req.file.filename;
        }

        // Créer le groupe
        const newGroup = {
            name: name.trim(),
            description: description ? description.trim() : '',
            members: uniqueMembers,
            admins: [currentUser.username],
            createdBy: currentUser.username,
            createdAt: new Date(),
            lastActivity: new Date(),
            avatar: avatarPath
        };

        const result = await groups.insertOne(newGroup);
        newGroup._id = result.insertedId;

        res.json({ success: true, group: newGroup });
    } catch (error) {
        console.error('Erreur lors de la création du groupe:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Route pour afficher le formulaire de modification d'un groupe
app.get('/groups/:groupId/edit', async (req, res) => {
    const currentUser = req.session.user;
    if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Non connecté' });
    }

    try {
        const group = await groups.findOne({ 
            _id: new ObjectId(req.params.groupId),
            members: currentUser.username // Seuls les admins peuvent modifier
        });

        if (!group) {
            return res.status(404).json({ success: false, error: 'Groupe non trouvé ou accès refusé' });
        }

        res.json({ success: true, group });
    } catch (error) {
        console.error('Erreur lors de la récupération du groupe:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Route pour mettre à jour un groupe (CORRIGÉE)
app.post('/groups/:groupId/update', uploadGroupPhoto.single('avatar'), async (req, res) => {
    const currentUser = req.session.user;
    if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Non connecté' });
    }

    try {
        const { name, description } = req.body; // AJOUT: Extraction des données du body
        
        const group = await groups.findOne({
            _id: new ObjectId(req.params.groupId),
            members: currentUser.username
        });

        if (!group) {
            return res.status(403).json({ success: false, error: 'Accès refusé' });
        }

        // Construire les données de mise à jour
        const updateData = {
            name: name && name.trim() ? name.trim() : group.name,
            description: description || group.description || '',
            lastActivity: new Date()
        };

        // Ajouter l'avatar s'il y en a un nouveau
        if (req.file) {
            updateData.avatar = '/group_photos/' + req.file.filename;
        }

        // Mettre à jour le groupe
        await groups.updateOne(
            { _id: group._id },
            { $set: updateData }
        );

        // Récupérer le groupe mis à jour
        const updatedGroup = await groups.findOne({ _id: group._id });
        
        // Notifier via WebSocket
        updatedGroup.members.forEach(member => {
            try {
                const memberSocketId = userSocketMap.get(member);
                if (memberSocketId) {
                    io.to(memberSocketId).emit('refreshGroups', {
                        groupId: group._id,
                        action: 'groupUpdated',
                        group: updatedGroup
                    });
                }
            } catch (e) {
                console.error('Erreur WebSocket pour', member, e);
            }
        });

        res.json({ success: true, group: updatedGroup });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du groupe:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});


// Route pour ajouter des membres à un groupe (CORRIGÉE)
app.post('/groups/:groupId/add-members', async (req, res) => {
    const currentUser = req.session.user;
    if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Non connecté' });
    }

    try {
        const groupId = req.params.groupId;
        const { members } = req.body;

        if (!members || !Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ success: false, error: 'Aucun membre à ajouter' });
        }

        // Vérifier que le groupe existe et que l'utilisateur en fait partie
        const group = await groups.findOne({
            _id: new ObjectId(groupId),
            members: currentUser.username
        });

        if (!group) {
            return res.status(404).json({ success: false, error: 'Groupe non trouvé ou accès refusé' });
        }

        // Vérifier que tous les utilisateurs à ajouter existent
        const existingUsers = await compte.find({
            username: { $in: members }
        }).toArray();

        if (existingUsers.length !== members.length) {
            return res.status(400).json({ success: false, error: 'Certains utilisateurs n\'existent pas' });
        }

        // Filtrer les membres qui ne sont pas déjà dans le groupe
        const newMembers = members.filter(member => !group.members.includes(member));

        if (newMembers.length === 0) {
            return res.status(400).json({ success: false, error: 'Tous les utilisateurs sont déjà membres du groupe' });
        }

        // Ajouter les nouveaux membres au groupe
        await groups.updateOne(
            { _id: new ObjectId(groupId) },
            { 
                $push: { members: { $each: newMembers } },
                $set: { lastActivity: new Date() }
            }
        );

        // Notifier via WebSocket
        const updatedGroup = await groups.findOne({ _id: new ObjectId(groupId) });
        
        // Notifier tous les membres (anciens et nouveaux) du changement
        updatedGroup.members.forEach(member => {
            try {
                const memberSocketId = userSocketMap.get(member);
                if (memberSocketId) {
                    io.to(memberSocketId).emit('refreshGroups', {
                        groupId: groupId,
                        action: 'membersAdded',
                        newMembers: newMembers
                    });
                }
            } catch (e) {
                console.error('Erreur WebSocket pour', member, e);
            }
        });

        // IMPORTANT: Retourner une réponse de succès avec les nouveaux membres
        res.json({ 
            success: true, 
            newMembers: newMembers,
            message: `${newMembers.length} membre(s) ajouté(s) avec succès`
        });

    } catch (error) {
        console.error('Erreur lors de l\'ajout de membres au groupe:', error);
        return res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Route pour quitter un groupe (modifiée pour être plus simple)
app.post('/groups/:groupId/leave', async (req, res) => {
    const currentUser = req.session.user;
    const groupId = req.params.groupId;
    
    if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Non connecté' });
    }
    
    try {
        // Vérifier que le groupe existe et que l'utilisateur en fait partie
        const group = await groups.findOne({ 
            _id: new ObjectId(groupId),
            members: currentUser.username
        });
        
        if (!group) {
            return res.status(404).json({ success: false, error: 'Groupe non trouvé ou vous n\'en faites pas partie' });
        }
        
        // Retirer l'utilisateur du groupe
        await groups.updateOne(
            { _id: new ObjectId(groupId) },
            { 
                $pull: { 
                    members: currentUser.username
                },
                $set: { lastActivity: new Date() }
            }
        );

        // Notifier les autres membres via WebSocket
        const remainingMembers = group.members.filter(member => member !== currentUser.username);
        remainingMembers.forEach(member => {
            const memberSocketId = userSocketMap.get(member);
            if (memberSocketId) {
                io.to(memberSocketId).emit('refreshGroups', {
                    groupId: groupId,
                    action: 'memberLeft',
                    leftMember: currentUser.username
                });
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la sortie du groupe:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Route pour récupérer les groupes d'un utilisateur
app.get('/api/groups', async (req, res) => {
    const currentUser = req.session.user;
    
    if (!currentUser) {
        return res.status(401).json({ error: 'Non connecté' });
    }
    
    try {
        const userGroups = await groups.find({
            members: currentUser.username
        }).sort({ 
            lastActivity: -1,
            createdAt: -1
        }).toArray();

        // Enrichir chaque groupe avec le dernier message et le compteur de non lus
        for (const group of userGroups) {
            const lastMsg = await messages.findOne(
                { groupId: group._id },
                { sort: { timestamp: -1 } }
            );
            
            // Compter les messages non lus pour l'utilisateur actuel
            const unreadCount = await messages.countDocuments({
                groupId: group._id,
                from: { $ne: currentUser.username }, // Pas ses propres messages
                readBy: { $not: { $elemMatch: { username: currentUser.username } } } // Pas encore lu
            });
            
            if (lastMsg) {
                group.lastMessage = lastMsg.text;
                group.lastMessageTime = lastMsg.timestamp;
                group.lastMessageFrom = lastMsg.from;
            } else {
                group.lastMessage = "Pas encore de message";
                group.lastMessageTime = group.createdAt;
                group.lastMessageFrom = null;
            }
            
            group.unreadCount = unreadCount;
        }

        res.json(userGroups);
    } catch (error) {
        console.error('Erreur lors de la récupération des groupes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour rejoindre un groupe
app.post('/groups/:groupId/join', async (req, res) => {
    const currentUser = req.session.user;
    const groupId = req.params.groupId;
    
    if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Non connecté' });
    }
    
    try {
        const group = await groups.findOne({ _id: new ObjectId(groupId) });
        
        if (!group) {
            return res.status(404).json({ success: false, error: 'Groupe non trouvé' });
        }
        
        if (group.members.includes(currentUser.username)) {
            return res.status(400).json({ success: false, error: 'Déjà membre du groupe' });
        }
        
        await groups.updateOne(
            { _id: new ObjectId(groupId) },
            { 
                $push: { members: currentUser.username },
                $set: { lastActivity: new Date() }
            }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de l\'ajout au groupe:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Route pour quitter un groupe
app.post('/groups/:groupId/leave', async (req, res) => {
    const currentUser = req.session.user;
    const groupId = req.params.groupId;
    
    if (!currentUser) {
        return res.status(401).json({ success: false, error: 'Non connecté' });
    }
    
    try {
        const group = await groups.findOne({ _id: new ObjectId(groupId) });
        
        if (!group) {
            return res.status(404).json({ success: false, error: 'Groupe non trouvé' });
        }
        
        if (!group.members.includes(currentUser.username)) {
            return res.status(400).json({ success: false, error: 'Pas membre du groupe' });
        }
        
        await groups.updateOne(
            { _id: new ObjectId(groupId) },
            { 
                $pull: { 
                    members: currentUser.username,
                    admins: currentUser.username
                },
                $set: { lastActivity: new Date() }
            }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur lors de la sortie du groupe:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Route API pour récupérer la liste des conversations avec notifications
app.get('/api/conversations', async (req, res) => {
    const currentUser = req.session.user;
    
    if (!currentUser) {
        return res.status(401).json({ error: 'Non connecté' });
    }
    
    try {
        const conversationsCollection = database.collection('Conversations');
        const messagesCollection = database.collection('Messages');
        
        const conversations = await conversationsCollection.find({
            participants: currentUser.username
        }).sort({ 
            lastActivity: -1,
            createdAt: -1
        }).toArray();

        // Enrichir chaque conversation avec le dernier message et le compteur de non lus
        for (const conv of conversations) {
            const lastMsg = await messagesCollection.findOne(
                { conversationId: conv._id },
                { sort: { timestamp: -1 } }
            );
            
            // Compter les messages non lus pour l'utilisateur actuel
            const unreadCount = await messagesCollection.countDocuments({
                conversationId: conv._id,
                to: currentUser.username,
                read: false
            });
            
            if (lastMsg) {
                conv.lastMessage = lastMsg.text;
                conv.lastMessageTime = lastMsg.timestamp;
            } else {
                conv.lastMessage = "Pas encore de message";
                conv.lastMessageTime = conv.createdAt;
            }
            
            conv.unreadCount = unreadCount; // NOUVEAU : ajouter le compteur
        }

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

// Route messagerie avec marquage automatique des messages comme lus
app.get('/messagerie', async (req, res) => {
    const currentUser = req.session.user;
    if (!currentUser) return res.redirect('/connexion');

    const conversationsCollection = database.collection('Conversations');
    const messagesCollection = database.collection('Messages');
    const selectedUsername = req.query.user;
    const selectedGroupId = req.query.group;

    let selectedUser = null;
    let selectedGroup = null;
    let messages = [];

    // Toutes les conversations où l'utilisateur connecté participe
    const conversations = await conversationsCollection.find({
        participants: currentUser.username
    }).sort({
        lastActivity: -1,
        createdAt: -1
    }).toArray();

    // Tous les groupes où l'utilisateur connecté participe
    const userGroups = await groups.find({
        members: currentUser.username
    }).sort({
        lastActivity: -1,
        createdAt: -1
    }).toArray();

    // Enrichir chaque conversation avec le dernier message, compteur non lus ET la photo de l'autre utilisateur
    for (const conv of conversations) {
        const lastMsg = await messagesCollection.findOne(
            { conversationId: conv._id },
            { sort: { timestamp: -1 } }
        );

        // Compter les messages non lus
        const unreadCount = await messagesCollection.countDocuments({
            conversationId: conv._id,
            to: currentUser.username,
            read: false
        });

        if (lastMsg) {
            conv.lastMessage = lastMsg.text;
            conv.lastMessageTime = lastMsg.timestamp;
        } else {
            conv.lastMessage = "Pas encore de message";
            conv.lastMessageTime = conv.createdAt;
        }

        conv.unreadCount = unreadCount;

        // AJOUT : récupérer la photo de l'autre utilisateur
        const otherUsername = conv.participants.find(p => p !== currentUser.username);
        if (otherUsername) {
            const otherUser = await compte.findOne({ username: otherUsername }, { projection: { photo: 1 } });
            conv.photo = otherUser && otherUser.photo ? otherUser.photo : '/default.png';
        } else {
            conv.photo = '/default.png';
        }
    }

    // Enrichir chaque groupe avec le dernier message et compteur non lus
    for (const group of userGroups) {
        const lastMsg = await messagesCollection.findOne(
            { groupId: group._id },
            { sort: { timestamp: -1 } }
        );

        // Compter les messages non lus pour l'utilisateur actuel
        const unreadCount = await messagesCollection.countDocuments({
            groupId: group._id,
            from: { $ne: currentUser.username },
            readBy: { $not: { $elemMatch: { username: currentUser.username } } }
        });

        if (lastMsg) {
            group.lastMessage = lastMsg.text;
            group.lastMessageTime = lastMsg.timestamp;
            group.lastMessageFrom = lastMsg.from;
        } else {
            group.lastMessage = "Pas encore de message";
            group.lastMessageTime = group.createdAt;
            group.lastMessageFrom = null;
        }

        group.unreadCount = unreadCount;
    }

    // Si on a cliqué sur un utilisateur
    if (selectedUsername) {
        selectedUser = await compte.findOne({ username: selectedUsername });

        if (selectedUser && !selectedUser.photo) {
            selectedUser.photo = '/default.png';
        }

        if (selectedUser) {
            let conv = await conversationsCollection.findOne({
                participants: { $all: [currentUser.username, selectedUsername] }
            });
            
            if (!conv) {
                // Créer une nouvelle conversation vide
                const insertResult = await conversationsCollection.insertOne({
                    participants: [currentUser.username, selectedUsername],
                    createdAt: new Date(),
                    lastActivity: new Date()
                });
                conv = await conversationsCollection.findOne({ _id: insertResult.insertedId });
            }

            // Récupérer les messages de cette conversation
            messages = await messagesCollection.find({
                conversationId: conv._id
            }).sort({ timestamp: 1 }).toArray();
            
            // NOUVEAU : Marquer tous les messages de cette conversation comme lus
            await messagesCollection.updateMany(
                {
                    conversationId: conv._id,
                    to: currentUser.username,
                    read: false
                },
                {
                    $set: {
                        read: true,
                        readAt: new Date()
                    }
                }
            );
            
            // Remettre le compteur à zéro pour cette conversation
            await conversationsCollection.updateOne(
                { _id: conv._id },
                { $set: { [`unreadCount.${currentUser.username}`]: 0 } }
            );
        }
    }

    // Si on a cliqué sur un groupe
    if (selectedGroupId) {
        selectedGroup = await groups.findOne({ _id: new ObjectId(selectedGroupId) });

        if (selectedGroup && selectedGroup.members.includes(currentUser.username)) {
            // Récupérer les messages de ce groupe
            messages = await messagesCollection.find({
                groupId: selectedGroup._id
            }).sort({ timestamp: 1 }).toArray();
            
            // Marquer tous les messages de ce groupe comme lus pour cet utilisateur
            await messagesCollection.updateMany(
                {
                    groupId: selectedGroup._id,
                    from: { $ne: currentUser.username },
                    readBy: { $not: { $elemMatch: { username: currentUser.username } } }
                },
                {
                    $push: {
                        readBy: {
                            username: currentUser.username,
                            readAt: new Date()
                        }
                    }
                }
            );
            
            // Mettre à jour l'activité du groupe
            await groups.updateOne(
                { _id: selectedGroup._id },
                { $set: { lastActivity: new Date() } }
            );
        }
    }

    res.render('messagerie', {
        currentUser,
        selectedUser,
        selectedGroup,
        messages,
        conversations,
        groups: userGroups
    });
});

// Route modifiée pour envoyer des messages avec système de notifications (privé et groupe)
app.post('/messagerie/send', async (req, res) => {
    const { to, message, conversationId, groupId } = req.body;
    const currentUser = req.session.user;

    if (!currentUser || !message || (!to && !groupId)) {
        return res.status(400).json({ success: false, error: 'Données manquantes' });
    }

    try {
        const conversationsCollection = database.collection('Conversations');
        const messagesCollection = database.collection('Messages');

        if (groupId) {
            // Message de groupe
            const group = await groups.findOne({ _id: new ObjectId(groupId) });
            
            if (!group || !group.members.includes(currentUser.username)) {
                return res.status(403).json({ success: false, error: 'Accès refusé au groupe' });
            }

            // Créer le message de groupe
            const newMessage = {
                groupId: group._id,
                from: currentUser.username,
                text: message,
                timestamp: new Date(),
                readBy: [
                    {
                        username: currentUser.username,
                        readAt: new Date()
                    }
                ]
            };

            const insertResult = await messagesCollection.insertOne(newMessage);
            newMessage._id = insertResult.insertedId;

            // Mettre à jour l'activité du groupe
            await groups.updateOne(
                { _id: group._id },
                { 
                    $set: { 
                        lastActivity: new Date(),
                        lastMessage: message,
                        lastMessageTime: new Date(),
                        lastMessageFrom: currentUser.username
                    } 
                }
            );

            // Émettre le message à tous les membres du groupe
            const messageData = {
                _id: newMessage._id,
                groupId: group._id,
                from: currentUser.username,
                text: message,
                timestamp: newMessage.timestamp
            };

            // Envoyer à tous les membres connectés du groupe
            group.members.forEach(member => {
                const memberSocketId = userSocketMap.get(member);
                if (memberSocketId) {
                    io.to(memberSocketId).emit('newGroupMessage', messageData);
                }
            });

            // Confirmer l'envoi à l'expéditeur
            socket.emit('messageConfirmed', messageData);

            logWebSocketEvent('sendGroupMessage', { from, groupId, messageId: newMessage._id });

        } else {
            // Message privé (code existant)
            // Trouver ou créer la conversation
            let conv = await conversationsCollection.findOne({
                participants: { $all: [currentUser.username, to] }
            });

            if (!conv) {
                const insertResult = await conversationsCollection.insertOne({
                    participants: [currentUser.username, to],
                    createdAt: new Date(),
                    lastActivity: new Date()
                });
                conv = await conversationsCollection.findOne({ _id: insertResult.insertedId });
            }

            // Créer le message avec statut de lecture
            const newMessage = {
                conversationId: conv._id,
                from: currentUser.username,
                to: to,
                text: message,
                timestamp: new Date(),
                read: false,
                readAt: null
            };

            const insertResult = await messagesCollection.insertOne(newMessage);
            newMessage._id = insertResult.insertedId;

            // Compter les messages non lus pour le destinataire
            const unreadCount = await messagesCollection.countDocuments({
                conversationId: conv._id,
                to: to,
                read: false
            });

            // Mettre à jour la dernière activité avec compteur
            await conversationsCollection.updateOne(
                { _id: conv._id },
                { 
                    $set: { 
                        lastActivity: new Date(),
                        lastMessage: message,
                        lastMessageTime: new Date(),
                        [`unreadCount.${to}`]: unreadCount
                    } 
                }
            );

            // Émettre le message avec le compteur de non lus
            const messageData = {
                _id: newMessage._id,
                conversationId: conv._id,
                from: currentUser.username,
                to: to,
                text: message,
                timestamp: newMessage.timestamp,
                read: false
            };

            // Envoyer au destinataire s'il est connecté
            const recipientSocketId = userSocketMap.get(to);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('newMessage', {
                    ...messageData,
                    unreadCount: unreadCount
                });
            }

            // Confirmer l'envoi à l'expéditeur
            socket.emit('messageConfirmed', messageData);

            // Notifier les participants du changement de conversation
            const conversationData = {
                conversationId: conv._id,
                participants: conv.participants,
                lastMessage: message,
                lastMessageTime: new Date(),
                lastActivity: new Date(),
                unreadCount: unreadCount
            };

            if (recipientSocketId) {
                io.to(recipientSocketId).emit('conversationUpdated', conversationData);
            }
            socket.emit('conversationUpdated', conversationData);

            logWebSocketEvent('sendMessage', { from, to, messageId: newMessage._id, unreadCount });
        }

    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// Route pour vérifier le statut de connexion
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'ok', 
        user: req.session.user ? req.session.user.username : null,
        timestamp: new Date().toISOString()
    });
});

// ========== CONFIGURATION WEBSOCKET AVEC NOTIFICATIONS ==========
app.get('/admin', async (req, res) => {
    if (!req.session.user || req.session.user.perm !== 2) {
        return res.redirect('/');
    }
    const comptes = await compte.find({}).toArray();
    const success = req.query.success || null;
    const error = req.query.error || null;
    res.render('admin', { comptes, success, error });
});

app.post('/admin/permission/:id', async (req, res) => {
    if (!req.session.user || req.session.user.perm !== 2) {
        return res.redirect('/');
    }
    const id = req.params.id;
    const perm = parseInt(req.body.perm, 10);
    if (![0, 1, 2].includes(perm)) {
        return res.redirect('/admin');
    }
    await compte.updateOne({ _id: new ObjectId(id) }, { $set: { perm } });
    res.redirect('/admin?success=Permission modifiée avec succès');
});

app.post('/admin/delete/:id', async (req, res) => {
    if (!req.session.user || req.session.user.perm !== 2) {
        return res.redirect('/');
    }
    const id = req.params.id;
    try {
        await compte.deleteOne({ _id: new ObjectId(id) });
        res.redirect('/admin?success=Compte supprimé avec succès');
    } catch (err) {
        res.redirect('/admin?error=Erreur lors de la suppression');
    }
});

const http = require('http').createServer(app);
const { Server } = require('socket.io');

// Configuration avancée du socket.io
const io = new Server(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

// Forum : création d'une discussion pour une matière (à placer AVANT http.listen)
app.post('/forum/:matiere/add', async (req, res) => {
    const matiere = req.params.matiere;
    const discussionName = req.body.discussionName && req.body.discussionName.trim();
    if (!matiere || !discussionName) {
        return res.redirect(`/${matiere}`);
    }
    try {
        await Ressources.insertOne({
            matiere,
            categorie: 'forum',
            name: discussionName,
            messages: [],
            createdAt: new Date()
        });
        res.redirect(`/${matiere}`);
    } catch (err) {
        res.redirect(`/${matiere}`);
    }
});

// Forum : ajout d'un message à une discussion (vérification stricte de l'id et du message, sans toucher à la messagerie)
app.post('/forum/:matiere/:discussionId/message', async (req, res) => {
    const matiere = req.params.matiere;
    let discussionId = req.params.discussionId;
    const user = req.session.user;
    const text = req.body.text && req.body.text.trim();
    // Vérifie que discussionId est bien un ObjectId MongoDB valide et que le message n'est pas vide
    if (
        !discussionId ||
        typeof discussionId !== 'string' ||
        !/^[a-fA-F0-9]{24}$/.test(discussionId) ||
        !user ||
        !text ||
        text.length === 0
    ) {
        return res.redirect('back');
    }
    try {
        // Vérifie que la discussion existe bien AVANT d'ajouter le message
        const discussion = await Ressources.findOne({ _id: new ObjectId(discussionId), matiere, categorie: 'forum' });
        if (!discussion) {
            return res.redirect('back');
        }
        // Récupérer les infos du compte depuis la collection "Compte"
        const userDb = await compte.findOne({ username: user.username });
        if (!userDb) return res.redirect('back');
        await Ressources.updateOne(
            { _id: new ObjectId(discussionId) },
            { $push: { messages: {
                author: {
                    _id: userDb._id,
                    username: userDb.username,
                    nom: userDb.nom,
                    prenom: userDb.prenom,
                    photo: userDb.photo
                },
                text,
                date: new Date()
            } } }
        );
        // Ajout pour le temps réel forum :
        io.emit('forumMessage', {
            discussionId,
            author: userDb.username,
            text
        });
        res.status(200).end();
    } catch (err) {
        res.redirect('back');
    }
});



// Map pour stocker les connexions utilisateur
const userSocketMap = new Map(); // username -> socketId

// Fonction de logging pour débugger
function logWebSocketEvent(event, data) {
    console.log(`[WebSocket] ${new Date().toISOString()} - ${event}:`, data);
}

// Middleware de gestion d'erreurs WebSocket
io.engine.on("connection_error", (err) => {
    console.log('Erreur de connexion WebSocket:', err.req);
    console.log('Code d\'erreur:', err.code);
    console.log('Message d\'erreur:', err.message);
    console.log('Contexte:', err.context);
});

// Gestion des connexions WebSocket avec système de notifications
io.on('connection', (socket) => {
    console.log('Un utilisateur est connecté via WebSocket:', socket.id);

    // Authentification du socket avec l'utilisateur
    socket.on('authenticate', (username) => {
        if (username) {
            userSocketMap.set(username, socket.id);
            socket.username = username;
            console.log(`Utilisateur ${username} authentifié avec socket ${socket.id}`);
            logWebSocketEvent('authenticate', { username, socketId: socket.id });
        }
    });

    // Écouter les mises à jour de groupe
socket.on('groupUpdated', (data) => {
    console.log('Groupe mis à jour:', data);
    
    // Mettre à jour l'affichage si on est dans ce groupe
    if (window.innerWidth >= 768) {
        // Desktop
        if ('<%= selectedGroup ? selectedGroup._id : "" %>' === data.groupId) {
            window.location.reload();
        }
    } else {
        // Mobile
        if (currentMobileGroupId === data.groupId) {
            window.location.reload();
        }
    }
    
    // Mettre à jour la liste des groupes
    refreshGroupsList();
});

    // Rejoindre une conversation
    socket.on('joinConversation', (conversationId) => {
        socket.join(conversationId);
        console.log(`Socket ${socket.id} a rejoint la conversation: ${conversationId}`);
        logWebSocketEvent('joinConversation', { socketId: socket.id, conversationId });
    });

    // Rejoindre un groupe
    socket.on('joinGroup', (groupId) => {
        socket.join(`group_${groupId}`);
        console.log(`Socket ${socket.id} a rejoint le groupe: ${groupId}`);
        logWebSocketEvent('joinGroup', { socketId: socket.id, groupId });
    });

    // Quitter une conversation
    socket.on('leaveConversation', (conversationId) => {
        socket.leave(conversationId);
        console.log(`Socket ${socket.id} a quitté la conversation: ${conversationId}`);
        logWebSocketEvent('leaveConversation', { socketId: socket.id, conversationId });
    });

    // Quitter un groupe
    socket.on('leaveGroup', (groupId) => {
        socket.leave(`group_${groupId}`);
        console.log(`Socket ${socket.id} a quitté le groupe: ${groupId}`);
        logWebSocketEvent('leaveGroup', { socketId: socket.id, groupId });
    });

    // Écouter les nouveaux messages avec gestion des notifications
    socket.on('sendMessage', async (data) => {
        const { to, message, conversationId, groupId } = data;
        const from = socket.username;

        if (!from || !message || (!to && !groupId)) {
            socket.emit('error', { message: 'Données manquantes' });
            return;
        }

        try {
            const conversationsCollection = database.collection('Conversations');
            const messagesCollection = database.collection('Messages');

            if (groupId) {
                // Message de groupe
                const group = await groups.findOne({ _id: new ObjectId(groupId) });
                
                if (!group || !group.members.includes(from)) {
                    socket.emit('error', { message: 'Accès refusé au groupe' });
                    return;
                }

                // Créer le message de groupe
                const newMessage = {
                    groupId: group._id,
                    from: from,
                    text: message,
                    timestamp: new Date(),
                    readBy: [
                        {
                            username: from,
                            readAt: new Date()
                        }
                    ]
                };

                const insertResult = await messagesCollection.insertOne(newMessage);
                newMessage._id = insertResult.insertedId;

                // Mettre à jour l'activité du groupe
                await groups.updateOne(
                    { _id: group._id },
                    { 
                        $set: { 
                            lastActivity: new Date(),
                            lastMessage: message,
                            lastMessageTime: new Date(),
                            lastMessageFrom: from
                        } 
                    }
                );

                // Émettre le message à tous les membres du groupe
                const messageData = {
                    _id: newMessage._id,
                    groupId: group._id,
                    from: from,
                    text: message,
                    timestamp: newMessage.timestamp
                };

                // Envoyer à tous les membres connectés du groupe
                group.members.forEach(member => {
                    const memberSocketId = userSocketMap.get(member);
                    if (memberSocketId) {
                        io.to(memberSocketId).emit('newGroupMessage', messageData);
                    }
                });

                // Confirmer l'envoi à l'expéditeur
                socket.emit('messageConfirmed', messageData);

                logWebSocketEvent('sendGroupMessage', { from, groupId, messageId: newMessage._id });

            } else {
                // Message privé (code existant)
                // Trouver ou créer la conversation
                let conv = await conversationsCollection.findOne({
                    participants: { $all: [from, to] }
                });

                if (!conv) {
                    const insertResult = await conversationsCollection.insertOne({
                        participants: [from, to],
                        createdAt: new Date(),
                        lastActivity: new Date()
                    });
                    conv = await conversationsCollection.findOne({ _id: insertResult.insertedId });
                }

                // Créer le message avec statut de lecture
                const newMessage = {
                    conversationId: conv._id,
                    from: from,
                    to: to,
                    text: message,
                    timestamp: new Date(),
                    read: false,
                    readAt: null
                };

                const insertResult = await messagesCollection.insertOne(newMessage);
                newMessage._id = insertResult.insertedId;

                // Compter les messages non lus pour le destinataire
                const unreadCount = await messagesCollection.countDocuments({
                    conversationId: conv._id,
                    to: to,
                    read: false
                });

                // Mettre à jour la dernière activité avec compteur
                await conversationsCollection.updateOne(
                    { _id: conv._id },
                    { 
                        $set: { 
                            lastActivity: new Date(),
                            lastMessage: message,
                            lastMessageTime: new Date(),
                            [`unreadCount.${to}`]: unreadCount
                        } 
                    }
                );

                // Émettre le message avec le compteur de non lus
                const messageData = {
                    _id: newMessage._id,
                    conversationId: conv._id,
                    from: from,
                    to: to,
                    text: message,
                    timestamp: newMessage.timestamp,
                    read: false
                };

                // Envoyer au destinataire s'il est connecté
                const recipientSocketId = userSocketMap.get(to);
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('newMessage', {
                        ...messageData,
                        unreadCount: unreadCount
                    });
                }

                // Confirmer l'envoi à l'expéditeur
                socket.emit('messageConfirmed', messageData);

                // Notifier les participants du changement de conversation
                const conversationData = {
                    conversationId: conv._id,
                    participants: conv.participants,
                    lastMessage: message,
                    lastMessageTime: new Date(),
                    lastActivity: new Date(),
                    unreadCount: unreadCount
                };

                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('conversationUpdated', conversationData);
                }
                socket.emit('conversationUpdated', conversationData);

                logWebSocketEvent('sendMessage', { from, to, messageId: newMessage._id, unreadCount });
            }

        } catch (error) {
            console.error('Erreur lors de l\'envoi du message:', error);
            socket.emit('error', { message: 'Erreur lors de l\'envoi du message' });
        }
    });

    // NOUVEAU : Événement pour marquer les messages comme lus
    socket.on('markAsRead', async (data) => {
        const { conversationId, groupId, username } = data;
        
        try {
            const messagesCollection = database.collection('Messages');
            const conversationsCollection = database.collection('Conversations');
            
            if (groupId) {
                // Marquer les messages du groupe comme lus
                await messagesCollection.updateMany(
                    {
                        groupId: new ObjectId(groupId),
                        from: { $ne: username },
                        readBy: { $not: { $elemMatch: { username: username } } }
                    },
                    {
                        $push: {
                            readBy: {
                                username: username,
                                readAt: new Date()
                            }
                        }
                    }
                );
                
                socket.emit('messagesMarkedAsRead', { groupId, username });
                
            } else if (conversationId) {
                // Marquer les messages de conversation comme lus
                await messagesCollection.updateMany(
                    {
                        conversationId: new ObjectId(conversationId),
                        to: username,
                        read: false
                    },
                    {
                        $set: {
                            read: true,
                            readAt: new Date()
                        }
                    }
                );
                
                // Remettre le compteur à zéro
                await conversationsCollection.updateOne(
                    { _id: new ObjectId(conversationId) },
                    { $set: { [`unreadCount.${username}`]: 0 } }
                );
                
                socket.emit('messagesMarkedAsRead', { conversationId, username });
            }
            
            console.log(`Messages marqués comme lus pour ${username}`);
            
        } catch (error) {
            console.error('Erreur lors du marquage comme lu:', error);
            socket.emit('error', { message: 'Erreur lors du marquage comme lu' });
        }
    });

    // Nouvelle conversation créée
    socket.on('newConversation', (data) => {
        console.log('Nouvelle conversation créée:', data);
        const { participants, initiator } = data;
        
        // Notifier tous les participants
        participants.forEach(participant => {
            const participantSocketId = userSocketMap.get(participant);
            if (participantSocketId && participant !== initiator) {
                io.to(participantSocketId).emit('refreshConversations', data);
            }
        });

        logWebSocketEvent('newConversation', data);
    });

    // Nouveau groupe créé
    socket.on('newGroup', (data) => {
        console.log('Nouveau groupe créé:', data);
        const { members, initiator } = data;
        
        // Notifier tous les membres
        members.forEach(member => {
            const memberSocketId = userSocketMap.get(member);
            if (memberSocketId && member !== initiator) {
                io.to(memberSocketId).emit('refreshGroups', data);
            }
        });

        logWebSocketEvent('newGroup', data);
    });

    // Déconnexion
    socket.on('disconnect', () => {
        if (socket.username) {
            userSocketMap.delete(socket.username);
            console.log(`Utilisateur ${socket.username} déconnecté`);
            logWebSocketEvent('disconnect', { username: socket.username, socketId: socket.id });
        }
        console.log('Socket déconnecté:', socket.id);
    });
});

// Exposer io globalement
global.io = io;

const pdfParse = require('pdf-parse');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Route pour générer un quiz à partir d'un document PDF (par ID)
// Passe de POST à GET pour l'appel AJAX
console.log("Clé GoogleAI chargée : ", process.env.GEMINI_API_KEY);
app.get('/api/quiz-from-doc/:id', async (req, res) => {
    const docId = req.params.id;
    if (!docId || !/^[a-fA-F0-9]{24}$/.test(docId)) {
        return res.status(400).json({ error: 'ID invalide' });
    }
    if (!process.env.GEMINI_API_KEY) {
        // Change OPENROUTER_API_KEY à GEMINI_API_KEY
        return res.status(500).json({ error: "Clé API Gemini manquante. Assurez-vous que GEMINI_API_KEY est définie." });
    }
    try {
        const doc = await Ressources.findOne({ _id: new ObjectId(docId) });
        if (!doc || !doc.file || !doc.file.buffer) {
            return res.status(404).json({ error: 'Document non trouvé' });
        }
        // Extraction du texte du PDF
        let fileBuffer;
        if (Buffer.isBuffer(doc.file.buffer)) {
            fileBuffer = doc.file.buffer;
        } else if (doc.file.buffer && doc.file.buffer.buffer) {
            fileBuffer = Buffer.from(doc.file.buffer.buffer);
        } else if (doc.file.buffer instanceof Uint8Array) {
            fileBuffer = Buffer.from(doc.file.buffer);
        } else {
            fileBuffer = null;
            try {
                fileBuffer = Buffer.from(doc.file.buffer);
            } catch (e) {}
        }
        if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length < 100) {
            return res.status(500).json({ error: "Fichier PDF vide ou corrompu." });
        }
        // --- Début de l'intégration spécifique à Gemini ---

        // Choisis le modèle Gemini adapté à la multimodalité et aux longs contextes
        // 'gemini-1.5-flash' est rapide et économique. 'gemini-1.5-pro' est plus puissant.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Ou "gemini-1.5-pro"

        let filePart;
        // Vérifie la taille du fichier pour savoir si un upload via File API est nécessaire
        const MAX_INLINE_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

        if (fileBuffer.length <= MAX_INLINE_FILE_SIZE_BYTES) {
            // Pour les petits PDF (< 20MB), on l'envoie directement (inline)
            filePart = {
                inlineData: {
                    data: fileBuffer.toString('base64'),
                    mimeType: doc.file.mimetype || 'application/pdf', // Assure-toi que mimetype est correct
                },
            };
        } else {
            // Pour les grands PDF (> 20MB), il faut l'uploader via File API d'abord
            // L'upload est asynchrone et renvoie un URI
            // NOTE: Les fichiers uploadés sont disponibles 48h. Pour une utilisation persistante,
            // tu devras implémenter un mécanisme pour les uploader une fois et stocker l'URI.
            console.log(`Fichier trop grand (${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB), upload via File API...`);
            try {
                // Utilise la méthode uploadFile du SDK de Gemini
                // L'uploadFile nécessite un chemin de fichier ou un objet File (dans un environnement de navigateur)
                // Pour Node.js avec un buffer, il faut créer un fichier temporaire ou utiliser une astuce
                // Le SDK n'expose pas directement l'upload de buffer pour l'API File
                // La meilleure approche est de passer par un service de stockage intermédiaire
                // OU, si le buffer est vraiment nécessaire, on devrait appeler l'API REST `/v1beta/files` manuellement
                // Pour simplifier ici, je vais montrer une version théorique ou assumer une version future du SDK
                // qui supporterait mieux les buffers.

                // Solution provisoire pour les buffers en attendant de meilleurs outils ou un service de stockage:
                // Pour l'instant, le SDK ne supporte pas directement l'upload de buffer
                // via `genAI.uploadFile()`. Il faut soit un chemin de fichier, soit un File web API.
                // Donc, si le fichier est > 20MB, tu devras soit :
                // 1. Sauvegarder temporairement le buffer sur disque, puis passer le chemin à `genAI.uploadFile()`.
                // 2. Utiliser une base de données vectorielle avec des chunks pour les très longs documents.
                // 3. Revenir à l'extraction de texte et "chunking" manuel pour les modèles avec fenêtre de contexte plus petite.

                // Pour les besoins de cet exemple, je vais te donner une version simplifiée
                // et noter que la gestion des fichiers > 20MB avec un buffer en Node.js
                // nécessite des étapes supplémentaires (création de fichier temp ou appel REST direct).
                // Si la taille est un problème récurrent, envisage le service de stockage de Google Cloud (GCS).

                // Pour l'instant, je vais laisser cette branche en commentaire et te suggérer une approche plus robuste
                // pour les fichiers très volumineux. Pour la plupart des cours, <20MB est courant.
                // Si tes fichiers sont souvent > 20MB, dis-le moi, et je détaillerai la stratégie.

                // Temporairement, si un fichier est > 20MB, nous allons retourner une erreur pour cet exemple
                // car l'upload direct de buffer en Node.js pour l'API File n'est pas simple avec le SDK actuel.
                return res.status(413).json({ error: "Le fichier PDF est trop volumineux (>20MB) pour un traitement direct. " +
                                                 "Veuillez implémenter l'upload via l'API File de Gemini ou une solution de stockage temporaire." });

                // Exemple théorique si genAI.uploadFile supportait les buffers directement:
                // const uploadedFile = await genAI.uploadFile({
                //     data: fileBuffer,
                //     mimeType: doc.file.mimetype || 'application/pdf',
                //     displayName: `quiz_doc_${docId}.pdf` // Nom pour l'affichage dans Google AI Studio
                // });
                // console.log(`Fichier uploadé avec URI: ${uploadedFile.uri}`);
                // filePart = uploadedFile; // L'objet retourné par uploadFile est directement utilisable
            } catch (uploadErr) {
                console.error("Erreur lors de l'upload du fichier via l'API File:", uploadErr);
                return res.status(500).json({ error: "Erreur lors de l'upload du fichier PDF volumineux." });
            }
        }


        // Prompt IA pour générer un quiz (5 questions QCM)
        // Le prompt est maintenant plus court car le PDF est passé comme contenu.
        const prompt = `À partir du document PDF ci-joint, génère un quiz de 5 questions à choix multiples avec 4 options par question.
Indique la bonne réponse pour chaque question.
Assure-toi que les questions sont pertinentes au contenu du document.
Réponds en JSON :
[
  {
    "question": "...",
    "choices": ["...", "...", "...", "..."],
    "answer": "..."
  }
]
`.trim();

        let response;
        try {
            // Envoie le prompt et le fichier PDF au modèle Gemini
            // Le tableau `parts` permet de combiner texte et données binaires
            response = await model.generateContent({
                contents: [
                    {
                        role: "user",
                        parts: [
                            filePart, // Le PDF lui-même
                            { text: prompt }, // Le prompt textuel
                        ],
                    },
                ],
                // Spécifie la sortie JSON structurée, c'est une fonctionnalité très puissante de Gemini 1.5
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                question: { type: "string" },
                                choices: {
                                    type: "array",
                                    items: { type: "string" }
                                },
                                answer: { type: "string" }
                            },
                            required: ["question", "choices", "answer"]
                        }
                    }
                }
            });

            const apiResponse = response.response; // Accède à l'objet réel contenant les candidats


            // Vérifie si des candidats sont présents avant d'accéder à l'index 0
            if (!apiResponse.candidates || apiResponse.candidates.length === 0) {
                if (apiResponse.promptFeedback && apiResponse.promptFeedback.blockReason) {
                    const blockReason = apiResponse.promptFeedback.blockReason;
                    const safetyRatings = apiResponse.promptFeedback.safetyRatings || [];
                    console.error(`Contenu bloqué par Gemini. Raison: ${blockReason}`);
                    safetyRatings.forEach(rating => {
                        console.error(`Catégorie: ${rating.category}, Seuil: ${rating.threshold}, Probabilité: ${rating.probability}`);
                    });
                    return res.status(400).json({
                        error: `La génération du quiz a été bloquée par les filtres de sécurité de l'IA. Raison: ${blockReason}`,
                        details: safetyRatings
                    });
                } else {
                    return res.status(500).json({ error: "L'IA n'a pas pu générer de contenu (pas de candidats)." });
                }
            }

            // Accède au contenu généré
            const generatedContent = apiResponse.candidates[0].content.parts[0].text;
            const quiz = JSON.parse(generatedContent);

            res.json({ quiz });

        } catch (err) {
            console.error('Erreur lors de l\'appel à l\'API Gemini :', err);
            // Si l'erreur vient de Gemini, elle peut contenir des détails utiles
            if (err.response && err.response.data) {
                console.error('Détails de l\'erreur Gemini:', err.response.data);
                return res.status(500).json({ error: "Erreur IA: " + JSON.stringify(err.response.data) });
            }
            res.status(500).json({ error: "Erreur lors de la génération du quiz avec Gemini." });
        }

    } catch (err) {
        console.error('Erreur générale dans la route /api/quiz-from-doc :', err);
        res.status(500).json({ error: "Une erreur interne est survenue." });
    }
});


// Démarrer le serveur WebSocket + Express
http.listen(3000, () => {
    console.log('http://localhost:3000');
});

app.get('/api/association-events', async (req, res) => {
    const { start, end } = req.query;
    if (!associationEvents) return res.json([]);
    // Récupère tous les événements qui touchent la semaine affichée
    const events = await associationEvents.find({
        start: { $lt: end },
        end: { $gt: start }
    }).toArray();
    res.json(events);
});

app.post('/api/association-events', async (req, res) => {
    if (!req.session.user || ![1,2].includes(req.session.user.perm)) {
        return res.status(403).json({ error: "Non autorisé" });
    }
    const { title, organizer, location, description, start, end } = req.body;
    if (!title || !organizer || !location || !description || !start || !end) {
        return res.status(400).json({ error: "Champs manquants" });
    }
    await associationEvents.insertOne({
        title,
        organizer,
        location,
        description,
        start,
        end,
        createdBy: req.session.user.username
    });
    res.json({ success: true });
});


app.delete('/api/association-events/:id', async (req, res) => {
    if (!req.session.user || req.session.user.perm !== 2) {
        return res.status(403).json({ error: "Non autorisé" });
    }
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    const event = await associationEvents.findOne({ _id: new ObjectId(id) });
    if (!event) return res.status(404).json({ error: "Événement introuvable" });

    if (req.session.user.perm === 2 ||
        (req.session.user.perm === 1 && event.createdBy === req.session.user.username)) {
        await associationEvents.deleteOne({ _id: new ObjectId(id) });
        return res.json({ success: true });
    }
    return res.status(403).json({ error: "Non autorisé à supprimer cet événement" });
});

app.put('/api/association-events/:id', async (req, res) => {
    if (!req.session.user || typeof req.session.user.perm !== 'number') {
        return res.status(403).json({ error: "Non autorisé" });
    }
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "ID invalide" });
    }
    const event = await associationEvents.findOne({ _id: new ObjectId(id) });
    if (!event) return res.status(404).json({ error: "Événement introuvable" });

    if (
        req.session.user.perm === 2 ||
        (req.session.user.perm === 1 && event.createdBy === req.session.user.username)
    ) {
        const { title, organizer, location, description, start, end } = req.body;
        if (!title || !organizer || !location || !description || !start || !end) {
            return res.status(400).json({ error: "Champs manquants" });
        }
        await associationEvents.updateOne(
            { _id: new ObjectId(id) },
            { $set: { title, organizer, location, description, start, end } }
        );
        return res.json({ success: true });
    }
    return res.status(403).json({ error: "Non autorisé à modifier cet événement" });
});
