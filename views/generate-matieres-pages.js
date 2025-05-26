const fs = require('fs');
const path = require('path');

// Table de correspondance pour les titres avec accents et majuscules corrects
const titres = {
    'transformations-integrales': "Transformations d'Intégrales",
    'mecanique-du-solide': 'Mécanique du Solide',
    'probabilites-statistiques': 'Probabilités Statistiques',
    'anglais': 'Anglais',
    'decryptage-de-linformation': "Décryptage de l'information",
    'electronique-numerique': 'Électronique Numérique',
    'enjeu-du-developpement-durable': 'Enjeu du Développement Durable',
    'ethique-de-lingenieur': "Éthique de l'Ingénieur",
    'gestion-de-projet': 'Gestion de Projet',
    'infographie': 'Infographie',
    'international-break': 'International Break',
    'mecanique-quantique': 'Mécanique Quantique',
    'programmation-java': 'Programmation Java',
    'analyse-des-signaux': 'Analyse des Signaux',
    'automatique': 'Automatique',
    'base-de-donnees': 'Base de Données',
    'competences-en-travail-dequipe': "Compétences en Travail d'Équipe",
    'comptabilite': 'Comptabilité',
    'devops': 'DevOps',
    'economie-dentreprise': "Économie d'Entreprise",
    'electronique-analogique': 'Électronique Analogique',
    'marketing': 'Marketing',
    'physique-du-solide': 'Physique du Solide',
    'projet-de-fin-dannee': "Projet de Fin d'Année",
    'projet-delectronique-numerique': "Projet d'Électronique Numérique",
    'reseaux': 'Réseaux',
    'projet-dinformatique': "Projet d'Informatique",
    'projet': 'Projet'
};

const matieres = Object.keys(titres);

// Correction du chemin du dossier views
const viewsDir = __dirname;

// Fonction pour choisir "de" ou "d'" selon la première lettre du titre
function deOuD(titre) {
    const voyelles = ['a', 'e', 'i', 'o', 'u', 'y', 'é', 'è', 'ê', 'â', 'î', 'ô', 'û', 'ù', 'ë', 'ï', 'ü', 'œ'];
    const firstLetter = titre.trim().toLowerCase()[0];
    return voyelles.includes(firstLetter) ? "d'" : "de ";
}

matieres.forEach(matiere => {
    const titre = titres[matiere];
    const titreMin = titre.toLowerCase();
    const deOuDStr = deOuD(titreMin);
    const phraseAccueil = `Bienvenue sur la page ${deOuDStr}${titreMin}.`;
    const content = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <%- include('partials/header.ejs') %>
  <%- include('partials/head.ejs') %>
  <br>
  <br>
  <br>
  <br>
  <title>${titre}</title>
  <link href="/stylesheets/style.css" rel="stylesheet">
  <style>
    .hidden { display: none; }
  </style>
</head>
<body class="bg-gray-100">
  <main class="p-4">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold mb-4">${titre}</h1>
      <button onclick="openModal()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        + Ajouter un fichier
      </button>
    </div>
    <p>${phraseAccueil}</p>
    <br>
    <%- include('partials/ressources-matiere.ejs') %>
  </main>
  <!-- Modal d'ajout de fichier -->
  <div id="uploadModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" style="display:none;">
    <div class="bg-white p-6 rounded shadow-lg w-full max-w-md">
      <h2 class="text-xl font-bold mb-4">Ajouter un fichier</h2>
      <form action="/upload/${matiere}" method="POST" enctype="multipart/form-data">
        <div class="mb-3">
          <label class="block mb-1 font-medium">Fichier PDF</label>
          <input type="file" name="pdfFile" accept=".pdf" required class="w-full"/>
        </div>
        <div class="mb-3">
          <label class="block mb-1 font-medium">Nom du fichier</label>
          <input type="text" name="customName" placeholder="Nom affiché (optionnel)" class="w-full border px-2 py-1 rounded"/>
        </div>
        <div class="mb-3">
          <label class="block mb-1 font-medium">Catégorie</label>
          <select name="categorie" required class="w-full border px-2 py-1 rounded">
            <option value="cours">Cours</option>
            <option value="tds">Tds</option>
            <option value="tps">Tps</option>
            <option value="annales">Annales</option>
          </select>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" onclick="closeModal()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Annuler</button>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Ajouter</button>
        </div>
      </form>
    </div>
  </div>
  <%- include("partials/footer.ejs") %>
  <script>
    function openModal() {
      document.getElementById('uploadModal').style.display = 'flex';
    }
    function closeModal() {
      document.getElementById('uploadModal').style.display = 'none';
    }
    function toggleContent(id) {
      const content = document.getElementById(id);
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
      } else {
        content.classList.add('hidden');
      }
    }
  </script>
</body>
</html>
`;

    fs.writeFileSync(path.join(viewsDir, `${matiere}.ejs`), content, 'utf8');
    console.log(`Page générée : ${matiere}.ejs`);
});
