# 🎓 Plateforme Étudiante Junia - ProjetFinAnnee3

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-16.x-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/express.js-4.x-lightgrey.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/mongodb-5.x-brightgreen.svg)](https://www.mongodb.com/)
[![EJS](https://img.shields.io/badge/template-EJS-red.svg)](https://ejs.co/)
[![Socket.IO](https://img.shields.io/badge/websocket-Socket.IO-black.svg)](https://socket.io/)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()

## 📋 Table des matières

- [À propos](#à-propos)
- [Fonctionnalités](#fonctionnalités)
- [Technologies utilisées](#technologies-utilisées)
- [Architecture technique](#architecture-technique)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Structure du projet](#structure-du-projet)
- [API Documentation](#api-documentation)
- [Captures d'écran](#captures-décran)
- [Contributeurs](#contributeurs)
- [Licence](#licence)

## 🎯 À propos

Cette plateforme étudiante complète a été développée en **1 mois et demi** dans le cadre de notre projet de fin de 3ème année à Junia. Elle centralise tous les outils nécessaires à la vie étudiante : gestion d'emploi du temps, système de mentorat, ressources éducatives avec IA et messagerie temps réel.

### Vision du projet
Créer un écosystème numérique intégré pour optimiser l'expérience étudiante en centralisant :
- 📅 La gestion personnalisée des emplois du temps Junia via API Mauria
- 👨‍🏫 Le système de mentorat collaboratif entre étudiants
- 📚 Le partage de ressources éducatives avec intelligence artificielle
- 💬 La communication instantanée avec WebSocket
- 🏛️ La gestion des événements associatifs

### Contexte académique
- **Niveau** : 3ème année d'études d'ingénieur
- **Établissement** : Junia École d'Ingénieurs
- **Type** : Projet de fin d'année
- **Durée** : 1 mois et demi de développement
- **Nom du projet** : Argos

## ✨ Fonctionnalités

### 📅 Gestion d'emploi du temps intelligente
- **Import automatique** : Récupération temps réel via l'API Mauria
- **Personnalisation complète** : Ajout d'événements personnels avec interface intuitive
- **Synchronisation mentorat** : Intégration automatique des sessions créées
- **Vue périodique** : Affichage hebdomadaire et personnalisé avec navigation
- **Gestion événements associatifs** : Calendrier dédié aux activités des associations

### 🏛️ Système d'événements associatifs
- **Calendrier centralisé** : Planning dédié aux événements des associations étudiantes
- **Gestion des permissions** : Comptes "association" (perm niveau 1) pour création d'événements
- **Supervision administrative** : Interface complète de modération (perm niveau 2)
- **CRUD complet** : Création, lecture, modification, suppression des événements
- **Notifications** : Alertes automatiques pour les nouveaux événements

### 👨‍🏫 Système de mentorat avancé
- **Création de sessions** : Interface pour proposer du tutorat dans toutes les matières possibles
- **Inscription simple** : Système de réservation en un clic
- **Gestion temporelle** : Nettoyage automatique des cours passés
- **Gamification** : Attribution de points pour participation (+1 point étudiant/tuteur)
- **Intégration planning** : Ajout automatique dans l'emploi du temps des participants
- **Suivi complet** : Historique des sessions et statistiques

### 📚 Ressources éducatives avec IA
- **Bibliothèque complète** : Organisation par 30+ matières Junia spécifiques
- **Stockage MongoDB** : Documents PDF stockés directement en base de données
- **Upload intelligent** : Gestion des noms personnalisés et métadonnées
- **Catégorisation** : Cours, TD, TP, Annales pour chaque matière
- **IA Google Gemini** : Génération automatique de quiz et résumés
- **Forum intégré** : Discussions par matière avec messages temps réel
- **Recherche avancée** : Filtrage par matière, type, date

#### Matières supportées (30+)
- **Informatique** : Programmation Java, Base de données, DevOps, Réseaux
- **Électronique** : Électronique analogique/numérique, projets spécialisés
- **Mathématiques** : Probabilités-statistiques, Transformations intégrales, Analyse des signaux
- **Physique** : Mécanique quantique, Physique du solide, Mécanique du solide
- **Gestion** : Économie d'entreprise, Comptabilité, Marketing, Gestion de projet
- **Soft Skills** : Anglais, Compétences en travail d'équipe, Éthique de l'ingénieur
- **Et bien plus...** : Automatique, Infographie, etc.

### 💬 Messagerie temps réel complète
- **Chat privé** : Conversations individuelles avec WebSocket
- **Groupes dynamiques** : Création, gestion et personnalisation de groupes
- **Temps réel** : Communication instantanée via Socket.IO
- **Notifications intelligentes** : Compteurs de messages non lus
- **Gestion des médias** : Photos de groupe personnalisées
- **Statuts de lecture** : Suivi des messages lus/non lus
- **Historique complet** : Sauvegarde permanente des conversations

### 🏆 Système de gamification
- **Points d'activité** : Récompenses pour participation au mentorat (+1 point/session)
- **Classement global** : Leaderboard en temps réel des utilisateurs les plus actifs
- **Progression personnelle** : Suivi individuel des contributions
- **Motivation collective** : Encouragement de l'entraide entre étudiants

### 👨‍💼 Administration avancée
- **Dashboard admin** : Interface complète de gestion (permission niveau 2)
- **Gestion utilisateurs** : Attribution des rôles et permissions (0: étudiant, 1: association, 2: admin)
- **Modération événements** : Supervision des créations d'événements associatifs
- **Statistiques** : Vue d'ensemble de l'activité de la plateforme
- **Suppression comptes** : Gestion complète des utilisateurs

### 🤖 Intelligence Artificielle intégrée
- **Quiz automatiques** : Génération via Google Gemini 2.0 Flash à partir des PDF
- **Résumés intelligents** : Création automatique de synthèses de cours
- **Analyse de documents** : Extraction et traitement du contenu PDF
- **Personnalisation** : Questions variées selon une seed aléatoire

## 🛠️ Technologies utilisées

### Backend & Core
- **Node.js** - Runtime JavaScript haute performance
- **Express.js** - Framework web rapide et minimaliste
- **EJS** - Moteur de templates pour le rendu côté serveur
- **MongoDB** - Base de données NoSQL
- **compression** - Middleware de compression gzip/brotli

### Authentification & Sécurité
- **bcrypt** - Hachage sécurisé des mots de passe (10 rounds)
- **express-session** - Gestion des sessions utilisateur
- **connect-mongo** - Stockage des sessions dans MongoDB
- **crypto** - Fonctions de cryptographie natives Node.js

### Communication & Temps réel
- **Socket.IO** - WebSocket bidirectionnel pour chat temps réel
- **Axios** - Client HTTP pour les requêtes API externes

### Intelligence Artificielle
- **@google/generative-ai** - SDK officiel Google Gemini 2.0 Flash
- **pdf-parse** - Extraction et analyse du contenu PDF pour l'IA

### Frontend & Styling
- **Tailwind CSS** - Framework CSS utilitaire avec configuration personnalisée
- **Vanilla JavaScript** - Interactions côté client pour modals et interface
- **EJS Partials** - Composants réutilisables (header, footer, etc.)
- **Font Poppins** - Typographie moderne

### Gestion de fichiers
- **Multer** - Upload et gestion des fichiers (PDF, images)
- **Path & FS** - Manipulation des chemins et système de fichiers
- **Buffer** - Gestion des données binaires pour stockage MongoDB

### Services externes
- **API Mauria** - Récupération emplois du temps Junia (mauriaapi.fly.dev)
- **Google Gemini AI** - Génération de quiz et résumés intelligents

## 🏗️ Architecture technique

### Base de données MongoDB
```javascript
// Collections principales
DATABASE_NAME = "Argos"
- Compte (utilisateurs)
- Messages (chat privé et groupes) 
- Conversations (chats privés)
- Groups (groupes de discussion)
- Ressources (documents PDF + métadonnées)
- mentorat (sessions de tutorat)
- AssociationEvents (événements associatifs)
```

### Gestion des sessions
- Stockage MongoDB avec `connect-mongo`
- Durée de vie : 24 heures
- Données utilisateur en session : `_id`, `username`, `email`, `nom`, `prenom`, `photo`, `perm`

### WebSocket Architecture
```javascript
// Mapping utilisateur ↔ socket
userSocketMap = new Map(); // username -> socketId

// Événements principaux
- authenticate : Authentification socket
- sendMessage : Envoi message privé
- sendGroupMessage : Envoi message groupe
- markAsRead : Marquage messages lus
- joinConversation/Group : Rejoindre chat
```

### API Externe Mauria
```javascript
POST https://mauriaapi.fly.dev/exactPlanning
{
  "username": "email.etudiant@junia.com",
  "password": "motdepasse_aurion"
}
```

## 🚀 Installation

### Prérequis système
- **Node.js** (version 16.x ou supérieure)
- **MongoDB** (version 5.x ou supérieure) - Atlas
- **npm** (inclus avec Node.js)
- **Git** pour cloner le repository

### Étapes d'installation complète

1. **Cloner le repository**
   ```bash
   git clone https://github.com/LeoLammar/ProjetFinAnnee3.git
   cd ProjetFinAnnee3
   ```

2. **Installer toutes les dépendances**
   ```bash
   # Installation groupée recommandée
   npm install
   
   # Ou installation détaillée
   npm install express ejs mongodb dotenv crypt bcrypt
   npm install connect-mongo express-session axios socket.io
   npm install openai pdf-parse @google/generative-ai compression
   ```

3. **Configuration MongoDB**
   ```bash   
   # Option 3: MongoDB Atlas (recommandé)
   # Créer un cluster sur https://cloud.mongodb.com
   ```

4. **Configuration des variables d'environnement**
   ```bash
   # Créer le fichier .env
   touch .env
   ```

## ⚙️ Configuration

### Variables d'environnement (.env)
```env
# Configuration MongoDB Atlas
DB_ID=votre_nom_utilisateur_mongodb
DB_PASSWORD=votre_mot_de_passe_mongodb

# Pour MongoDB Atlas, l'URI sera automatiquement construite :
# mongodb+srv://${DB_ID}:${DB_PASSWORD}@cluster0.rphccsl.mongodb.net

# Intelligence Artificielle Google
GEMINI_API_KEY=votre_cle_api_google_gemini

# Sécurité des sessions (optionnel, fallback: 'argos_secret')
SESSION_SECRET=votre_secret_session_ultra_securise

# Configuration serveur (optionnel, défaut: 3000)
PORT=3000
NODE_ENV=development
```

### Configuration MongoDB Atlas 
1. Créer un compte sur [MongoDB Atlas](https://cloud.mongodb.com)
2. Créer un cluster gratuit
3. Créer un utilisateur de base de données
4. Récupérer les identifiants pour `DB_ID` et `DB_PASSWORD`
5. Autoriser votre IP dans "Network Access"

### Configuration Google Gemini AI
1. Aller sur [Google AI Studio](https://aistudio.google.com/)
2. Créer un projet et activer l'API Gemini
3. Générer une clé API
4. L'ajouter dans `.env` comme `GEMINI_API_KEY`

### Configuration Tailwind CSS
Le fichier `tailwind.config.js` est déjà configuré :
```javascript
module.exports = {
  content: ["./views/**/*.ejs", "./public/**/*.js"],
  theme: {
    extend: {
      fontFamily: {
        'poppins': ['Poppins', 'sans-serif']
      }
    }
  }
}
```

## 📖 Utilisation

### Démarrage de l'application

```bash
# Démarrage standard
node app.js

# L'application sera accessible sur
# http://localhost:3000
```

### Première utilisation

#### Configuration administrateur
1. **Inscription** : Créer un compte avec email Junia
2. **Base de données** : Modifier manuellement le champ `perm` à `2` pour le premier admin
3. **Interface admin** : Accéder à `/admin` pour gérer les permissions

#### Workflow utilisateur type
1. **Inscription/Connexion** avec email et mot de passe
2. **Import emploi du temps** : Saisir mot de passe Aurion pour synchronisation
3. **Exploration des matières** : Accès aux 30+ pages dédiées
4. **Participation mentorat** : Créer ou rejoindre des sessions
5. **Messagerie** : Communication privée ou en groupe
6. **Ressources IA** : Upload de documents et génération de quiz

### Types de comptes et permissions

#### 👤 Étudiant (perm: 0)
- Accès complet aux fonctionnalités étudiantes
- Import et gestion emploi du temps personnel
- Participation au système de mentorat
- Accès aux ressources éducatives et IA
- Messagerie complète

#### 🏛️ Association (perm: 1)
- Toutes les fonctionnalités étudiant
- **Permissions spéciales** :
  - Création d'événements associatifs
  - Gestion de leurs propres événements
  - Modification et suppression de leurs événements

#### 👨‍💼 Administrateur (perm: 2)
- Accès complet à toutes les fonctionnalités
- **Permissions administratives** :
  - Dashboard `/admin` complet
  - Gestion des utilisateurs et permissions
  - Suppression de comptes
  - Modération de tous les événements associatifs
  - Supervision générale de la plateforme

## 📁 Structure du projet détaillée

```
ProjetFinAnnee3/
├── app.js                    # 🚀 Point d'entrée principal (1500+ lignes)
├── package.json              # 📦 Dépendances et métadonnées
├── package-lock.json         # 🔒 Verrouillage des versions
├── tailwind.config.js        # 🎨 Configuration Tailwind CSS
├── .env                     # 🔐 Variables d'environnement 
├── .gitignore               # 📝 Fichiers ignorés par Git
├── README.md                # 📖 Documentation complète
├── public/                   # 🌐 Assets statiques (cache 7 jours)
│   ├── fonts/
│   │   └── Poppins.ttf      # Police principale de l'interface
│   │
│   ├── stylesheets/
│   │   ├── header.css       # Styles spécifiques du header
│   │   └── tailwind.css     # CSS Tailwind compilé
│   │
│   ├── group_photos/        # 📸 Photos de groupes de discussion
│   │   ├── [timestamp].jpg  # Photos uploadées dynamiquement
│   │   └── default.png      # Image par défaut des groupes
│   │
│   ├── uploads/             # 📄 Documents utilisateurs uploadés
│   │   └── [timestamp]_[filename].[ext]
│   │
│   └── [images_interface]/   # 🖼️ Images de l'interface
│       ├── edt.png          # Icône emploi du temps
│       ├── logoargos.png    # Logo principal Argos
│       ├── mentorat.png     # Icône système mentorat
│       ├── messagerie.png   # Icône messagerie
│       └── default.png      # Avatar par défaut
│
├── tmp_uploads/             # 📁 Stockage temporaire uploads (traitement)
│   └── .txt                 # Fichier placeholder
│
└── views/                   # 🎭 Templates EJS avec partials
    ├── partials/            # 🧩 Composants réutilisables
    │   ├── head.ejs         # <head> HTML avec métadonnées
    │   ├── header.ejs       # Navigation principale avec authentification
    │   ├── footer.ejs       # Pied de page
    │   └── ressources-matiere.ejs  # Template générique matière
    │
    ├── matieres/            # 📚 30+ pages spécifiques par matière
    │   ├── programmation-java.ejs
    │   ├── base-de-donnees.ejs
    │   ├── automatique.ejs
    │   ├── electronique-analogique.ejs
    │   ├── mecanique-quantique.ejs
    │   ├── gestion-de-projet.ejs
    │   ├── marketing.ejs
    │   ├── anglais.ejs
    │   ├── devops.ejs
    │   └── [...27 autres matières].ejs
    │
    ├── accueil.ejs          # 🏠 Page d'accueil avec présentation
    ├── connexion.ejs        # 🔐 Formulaire de connexion
    ├── inscription.ejs      # ✍️ Formulaire d'inscription + upload photo
    ├── emploidutemps.ejs    # 📅 Interface emploi du temps + API Mauria
    ├── mentorat.ejs         # 👨‍🏫 Système de mentorat complet
    ├── ressources-educatives.ejs  # 📚 Hub des ressources par matière
    ├── messagerie.ejs       # 💬 Interface chat temps réel
    ├── classement.ejs       # 🏆 Leaderboard et scores
    ├── compte.ejs           # 👤 Profil utilisateur
    ├── modifier.ejs         # ✏️ Modification profil + photo
    ├── admin.ejs            # 👨‍💼 Dashboard administrateur
    └── generate-matieres-pages.js  # 🔧 Script de génération automatique
```

### Architecture des collections MongoDB

```javascript
// Collection "Compte" - Utilisateurs
{
  _id: ObjectId,
  nom: String,
  prenom: String,
  email: String,          // Email Junia pour API Mauria
  username: String,       // Pseudo unique
  password: String,       // Hash bcrypt
  date_naissance: String,
  photo: String,          // Chemin vers photo de profil
  perm: Number,          // 0: étudiant, 1: association, 2: admin
  score: Number,         // Points de gamification
  date_inscription: Date
}

// Collection "Ressources" - Documents PDF + métadonnées
{
  _id: ObjectId,
  matiere: String,       // Nom de la matière
  categorie: String,     // "cours", "tds", "tps", "annales", "forum"
  name: String,          // Nom du fichier
  file: {
    buffer: Binary,      // Contenu PDF en binaire
    mimetype: String     // "application/pdf"
  },
  quizIA: Array,         // Quiz généré par Gemini
  resumeIA: String,      // Résumé généré par IA
  uploadedAt: Date,
  quizIAUpdatedAt: Date,
  resumeIAUpdatedAt: Date
}

// Collection "mentorat" - Sessions de tutorat
{
  _id: ObjectId,
  matiere: String,
  duree: String,         // Format "HH:MM"
  module: String,        // Lieu/description
  message: String,       // Message optionnel
  enseignant_id: ObjectId,
  enseignant_nom: String,
  enseignant_prenom: String,
  eleve_id: ObjectId,    // Quand réservé
  reserve: Boolean,
  date: Date,
  heure_debut: String,   // Format "HH:MM"
  heure_fin: String,     // Calculé automatiquement
  date_creation: Date
}

// Collection "Messages" - Chat privé et groupes
{
  _id: ObjectId,
  // Pour chat privé
  conversationId: ObjectId,
  from: String,          // Username expéditeur
  to: String,           // Username destinataire
  read: Boolean,
  readAt: Date,
  // Pour groupes
  groupId: ObjectId,
  readBy: [{
    username: String,
    readAt: Date
  }],
  // Commun
  text: String,
  timestamp: Date
}
```

## 🔌 API Documentation

### Routes d'authentification
```javascript
GET  /                    // Page d'accueil
GET  /connexion          // Formulaire de connexion
POST /connexion          // Authentification utilisateur
GET  /inscription        // Formulaire d'inscription
POST /inscription        // Création de compte
GET  /logout             // Déconnexion et destruction session
GET  /compte             // Profil utilisateur
GET  /modifier           // Formulaire modification profil
POST /modifier           // Mise à jour profil + photo
```

### Routes emploi du temps et planification
```javascript
GET  /emploidutemps         // Interface emploi du temps
POST /emploidutemps         // Import depuis API Mauria
POST /api/custom-planning   // Planning sur période précise
GET  /api/association-events // Récupération événements associatifs
POST /api/association-events // Création événement (perm 1+)
PUT  /api/association-events/:id    // Modification événement
DELETE /api/association-events/:id  // Suppression événement (admin)
```

### Routes système de mentorat
```javascript
GET  /mentorat                 // Interface principale mentorat
POST /mentorat/creer          // Création session de tutorat
GET  /mentorat/liste          // Liste sessions disponibles
GET  /mentorat/mes-cours      // Sessions créées par l'utilisateur
PATCH /mentorat/reserver/:id  // Réservation d'une session
DELETE /mentorat/supprimer/:id // Suppression session (créateur)
```

### Routes ressources et IA
```javascript
// Matières (30+ routes générées dynamiquement)
GET /:matiere                    // Page dédiée à une matière
POST /upload/:matiere           // Upload PDF dans matière
GET /download/:id               // Téléchargement PDF depuis BDD
GET /view/:id                   // Affichage PDF dans navigateur
GET /pdf/:id                    // Visualisation PDF inline

// IA et quiz
GET /api/quiz-from-doc/:id      // Génération quiz depuis PDF
GET /api/resume-from-doc/:id    // Génération résumé depuis PDF

// Forum par matière
POST /forum/:matiere/add                        // Nouvelle discussion
POST /forum/:matiere/:discussionId/message      // Nouveau message
```

### Routes messagerie et WebSocket
```javascript
GET  /messagerie              // Interface chat principale
POST /messagerie/send         // Envoi message (privé/groupe)
GET  /messagerie/create       // Création conversation
GET  /search-users           // Recherche utilisateurs pour chat
GET  /api/conversations      // Liste conversations avec compteurs
GET  /api/groups            // Liste groupes avec métadonnées

// Gestion des groupes
POST /groups/create                    // Création groupe + photo
GET  /groups/:groupId/edit            // Récupération données groupe
POST /groups/:groupId/update          // Mise à jour groupe
POST /groups/:groupId/add-members     // Ajout de membres
POST /groups/:groupId/leave           // Quitter le groupe
```

### Routes administration
```javascript
GET  /admin                   // Dashboard admin (perm 2)
POST /admin/permission/:id    // Modification permissions
POST /admin/delete/:id        // Suppression compte utilisateur
```

### WebSocket Events (Socket.IO)
```javascript
// Authentification et connexion
authenticate(username)        // Authentification du socket
joinConversation(convId)     // Rejoindre conversation privée
joinGroup(groupId)          // Rejoindre groupe
leaveConversation(convId)   // Quitter conversation
leaveGroup(groupId)        // Quitter groupe

// Messagerie temps réel
sendMessage(data)           // Envoi message privé
sendGroupMessage(data)      // Envoi message groupe
markAsRead(data)           // Marquage messages lus
newMessage(data)           // Réception nouveau message
newGroupMessage(data)      // Réception message groupe
messageConfirmed(data)     // Confirmation envoi

// Notifications et mises à jour
conversationUpdated(data)  // Mise à jour conversation
refreshGroups(data)       // Actualisation liste groupes
refreshConversations(data) // Actualisation conversations
```

## 🧪 Tests et développement

### Lancement en mode développement
```bash
# Variables d'environnement de développement
NODE_ENV=development
DEBUG=true

# Démarrage avec logs détaillés (optionnel)
DEBUG=* node app.js

# Ou avec nodemon pour rechargement automatique
nodemon app.js
```

### Tests manuels essentiels
1. **Authentification complète** : Inscription → Connexion → Déconnexion
2. **Import emploi du temps** : Test API Mauria avec vrais identifiants Junia
3. **Upload et IA** : Upload PDF → Génération quiz → Génération résumé
4. **Messagerie temps réel** : Chat privé et groupes avec plusieurs onglets
5. **Système de mentorat** : Création → Réservation → Points
6. **Permissions** : Test des 3 niveaux d'autorisation (0, 1, 2)
7. **WebSocket** : Déconnexion/reconnexion, messages temps réel

### Debug et monitoring
```bash
# Logs WebSocket détaillés
console.log('[WebSocket] événement:', data);

# Vérification connexion MongoDB
if (!mongoReady) return res.status(503).send('DB non prête');

# Logs des requêtes IA
console.error('Erreur Gemini:', err);
```

## 🚀 Déploiement

### Configuration production
```env
NODE_ENV=production
PORT=80

# MongoDB Atlas production
DB_ID=prod_user
DB_PASSWORD=prod_password_securise

# Sessions sécurisées
SESSION_SECRET=secret_production_ultra_securise

# IA production
GEMINI_API_KEY=cle_production_gemini
```

### Optimisations pour la production
```javascript
// Compression activée
app.use(compression());

// Cache statique 7 jours
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));

// Headers de cache PDF
res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
```

## 🤝 Contributeurs

- **Lammar Léo** -- **Hubert Matthieu** -- **Dumas Antonin** -- **Delrue Cyprien** -- **Basset Maxime ** -


### Architecture des contributions
- **Backend** : Nouvelles routes dans `app.js` avec middleware approprié
- **Frontend** : Templates EJS avec Tailwind CSS et JavaScript
- **Database** : Requêtes MongoDB optimisées avec indexes
- **WebSocket** : Événements avec logging et gestion d'erreurs
- **IA** : Intégrations Gemini avec gestion des quotas et erreurs

## 📝 Licence

Ce projet est sous licence MIT 

```
MIT License

Copyright (c) 2025 Léo Lammar - Projet Argos Junia

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
## 📞 Contact et support

### Contact principal
- **Emails** : [leo.lammar@student.junia.com] [maxime.basset@student.junia.com] [antonin.dumas@student.junia.com] [hubert.matthieu@student.junia.com] [delrue.cyprien@student.junia.com]
- **Repository GitHub** : [https://github.com/LeoLammar/ProjetFinAnnee3](https://github.com/LeoLammar/ProjetFinAnnee3)

### Support technique
- **Documentation** : README.md complet avec exemples
- **Code source** : Commentaires détaillés en français
- **Issues GitHub** : Pour signaler bugs et demandes de fonctionnalités

### Fonctionnalités techniques
- **Upload de fichiers** : Support PDF jusqu'à 20MB avec stockage MongoDB
- **IA intégrée** : Quiz et résumés automatiques via Google Gemini 2.0
- **Temps réel** : Chat privé et groupes avec Socket.IO
- **Authentification** : Sessions sécurisées avec bcrypt et MongoDB
- **Responsive** : Interface optimisée mobile et desktop avec Tailwind
- **Permissions** : 3 niveaux d'autorisation (étudiant, association, admin)

### Documentation 
## 📚 Documentation et ressources

### Documentation des technologies principales

#### Socket.IO (Communication temps réel)
- [Documentation officielle Socket.IO v4](https://socket.io/docs/v4/)
- [API serveur Node.js](https://socket.io/docs/v4/server-api/)
- [API client JavaScript](https://socket.io/docs/v4/client-api/)
- [Gestion des événements](https://socket.io/docs/v4/listening-to-events/)
- [Rooms et namespaces](https://socket.io/docs/v4/rooms/)

#### MongoDB (Base de données)
- [Documentation MongoDB](https://docs.mongodb.com/)
- [Driver Node.js officiel](https://docs.mongodb.com/drivers/node/current/)
- [Opérations CRUD](https://docs.mongodb.com/manual/crud/)
- [Pipeline d'agrégation](https://docs.mongodb.com/manual/aggregation/)
- [Indexation et performance](https://docs.mongodb.com/manual/indexes/)

#### Express.js (Framework backend)
- [Documentation Express.js](https://expressjs.com/)
- [Guide des middlewares](https://expressjs.com/en/guide/using-middleware.html)
- [Système de routage](https://expressjs.com/en/guide/routing.html)
- [Gestion des erreurs](https://expressjs.com/en/guide/error-handling.html)

#### Frontend et styling
- [Documentation EJS](https://ejs.co/) - Moteur de templates
- [Guide de syntaxe EJS](https://github.com/mde/ejs)
- [Documentation Tailwind CSS](https://tailwindcss.com/docs)
- [Responsive design avec Tailwind](https://tailwindcss.com/docs/responsive-design)
- [Configuration Tailwind](https://tailwindcss.com/docs/configuration)

#### Gestion des fichiers et sécurité
- [Documentation Multer](https://github.com/expressjs/multer) - Upload de fichiers
- [Guide Multer NPM](https://www.npmjs.com/package/multer)
- [bcrypt pour Node.js](https://www.npmjs.com/package/bcrypt) - Hachage de mots de passe
- [express-session](https://www.npmjs.com/package/express-session) - Gestion des sessions

#### Intelligence Artificielle
- [Google AI SDK](https://ai.google.dev/docs) - Documentation Gemini
- [Guide Node.js Gemini](https://ai.google.dev/tutorials/node_quickstart)
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - Extraction de contenu PDF

### Ressources d'apprentissage complémentaires

#### WebSocket et temps réel
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Real-time web applications with Socket.IO](https://socket.io/get-started/chat)

#### MongoDB et NoSQL
- [MongoDB University](https://university.mongodb.com/) - Cours gratuits
- [MongoDB Compass](https://docs.mongodb.com/compass/) - Interface graphique

#### Node.js et JavaScript
- [Documentation Node.js](https://nodejs.org/en/docs/)
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 🏷️ Tags et mots-clés

`node.js` `express` `mongodb` `socket.io` `ejs` `tailwind` `google-gemini` `pdf-processing` `real-time-chat` `student-platform` `schedule-management` `ai-integration` `tutoring-system` `junia` `engineering-school` `web-application` `javascript` `websocket` `file-upload` `authentication`
