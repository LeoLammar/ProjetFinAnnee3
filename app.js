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

// Initialisation de la connexion MongoDB
async function initDB() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        database = client.db(DATABASE_NAME);
        compte = database.collection(DATABASE_COLLECTION);
        documents = database.collection(DOCUMENTS_COLLECTION); // Ajout
        messages = database.collection("Messages"); // Ajout
        conversations = database.collection("Conversations"); // Ajout
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
app.use(express.json());

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


// Route d'inscription avec upload photo



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
    password_mauria: req.session.user.password_mauria // <-- garde le mot de passe Mauria !
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
        photo: user.photo // <-- ajoute cette ligne
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
app.listen(3000, () => {
    console.log('Serveur démarré sur http://localhost:3000');
//Code pour gérer la messagerie : 
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

// Modification de la route POST existante pour émettre via WebSocket
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
});