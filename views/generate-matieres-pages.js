const fs = require('fs');
const path = require('path');

// ===============================
// Table de correspondance matières
// ===============================
// Format : titre, cours, tds, tps, annales, forum (true = afficher, false = masquer)
const titres = {
    //'transformations-integrales': ["Transformations d'Intégrales", true, true, true, true, true],
    'mecanique-du-solide': ['Mécanique du Solide', true, true, true, true, true],
    'probabilites-statistiques': ['Probabilités Statistiques', true, true, true, true, true],
    'anglais': ['Anglais', true, true, false, true, true],
    'decryptage-de-linformation': ["Décryptage de l'information", true, false, false, true, true],
    'electronique-numerique': ['Électronique Numérique', true, true, true, true, true],
    'enjeu-du-developpement-durable': ['Enjeu du Développement Durable', true, false, true, true, true],
    'ethique-de-lingenieur': ["Éthique de l'Ingénieur", true, false, false, true, true],
    'gestion-de-projet': ['Gestion de Projet', true, false, false, true, true],
    'infographie': ['Infographie', true, true, true, true, true],
    'international-break': ['International Break', true, false, false, true, true],
    'mecanique-quantique': ['Mécanique Quantique', true, true, false, true, true],
    'programmation-java': ['Programmation Java', true, true, true, true, true],
    'analyse-des-signaux': ['Analyse des Signaux', true, true, true, true, true],
    'automatique': ['Automatique', true, true, true, true, true],
    'base-de-donnees': ['Base de Données', true, true, true, true, true],
    'competences-en-travail-dequipe': ["Compétences en Travail d'Équipe", true, false, false, false, true],
    'comptabilite': ['Comptabilité', true, true, false, true, true],
    'devops': ['DevOps', true, true, true, true, true],
    'economie-dentreprise': ["Économie d'Entreprise", true, false, false, true, true],
    'electronique-analogique': ['Électronique Analogique', true, true, true, true, true],
    'marketing': ['Marketing', true, true, false, true, true],
    'physique-du-solide': ['Physique du Solide', true, true, true, true, true],
    'projet-de-fin-dannee': ["Projet de Fin d'Année", true, false, false, true, true],
    'projet-delectronique-numerique': ["Projet d'Électronique Numérique", true, false, false, true, true],
    'reseaux': ['Réseaux', true, true, true, true, true],
    'projet-dinformatique': ["Projet d'Informatique", true, false, false, true, true],
    'projet': ['Projet', true, false, false, false, true]
};

const matieres = Object.keys(titres);
const viewsDir = path.join(__dirname, 'matieres'); // Dossier de destination des fichiers générés

// ===============================
// Génération automatique des pages
// ===============================
matieres.forEach(matiere => {
    // Récupération des paramètres pour la matière
    const [titre, showCours, showTds, showTps, showAnnales, showForum] = titres[matiere];
    const titreMin = titre.toLowerCase();
    const deOuDStr = deOuD(titreMin);
    const phraseAccueil = `Bienvenue sur la page ${deOuDStr}${titreMin}.`;

    // Génération dynamique des sections selon les booléens (cours, tds, tps, annales, forum)
    let sections = '';
    // Section Cours
    if (showCours) {
        sections += `
    <section class="mb-6">
      <button type="button" onclick="toggleContent('cours-content')" class="text-lg font-semibold mb-2 px-4 py-2 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] transition inline-block">
        Cours
      </button>
      <div id="cours-content" class="hidden mt-2">
        <% if (cours && cours.length > 0) { %>
          <ul style="margin-left: 1.5rem;">
            <% cours.forEach(function(file, idx) { 
              var fileId = file.link && file.link.split('/').pop();
              var safeName = (file.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            %>
              <li style="margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    <a href="javascript:void(0)" onclick="togglePdfMulti('<%= fileId %>', 'cours-pdf-viewer-<%= idx %>')" class="inline-block px-3 py-1 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] transition mb-1">
                      <%= file.name %>
                    </a>
                  </span>
                  <span style="display:flex; gap:0.5rem; align-items:center;">
                    <a href="<%= file.link %>" download="<%= file.name %>" class="inline-block px-3 py-1 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] transition mb-1" title="Télécharger">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 20 20" style="vertical-align:middle;">
                        <path fill="currentColor" d="M10 2a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4A1 1 0 1 1 5.707 9.293L8 11.586V3a1 1 0 0 1 1-1zm-7 13a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z"/>
                      </svg>
                    </a>
                    <button type="button" class="inline-block px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition mb-1"
                      onclick="openQuizModal('<%= fileId %>', '<%= safeName %>')"
                      title="Quiz IA">
                      Quiz IA
                    </button>
                    <button type="button" class="inline-block px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition mb-1"
                      onclick="openResumeModal('<%= fileId %>', '<%= safeName %>')"
                      title="Résumé IA">
                      Résumé IA
                    </button>
                  </span>
                </div>
                <div id="cours-pdf-viewer-<%= idx %>" class="pdf-viewer-container" style="display:none;">
                  <iframe src="/view/<%= fileId %>#zoom=90" class="pdf-frame" allowfullscreen style="display:none;"></iframe>
                  <div class="pdf-fallback-message" style="display:none; color:#b91c1c; background:#fff0f0; border:1px solid #fca5a5; border-radius:8px; padding:1em; text-align:center;">
                    <span>La prévisualisation du PDF n'est pas disponible sur votre appareil.<br>
                    <a href="<%= file.link.replace('/download/', '/view/') %>" target="_blank" style="color:#5C83BA;text-decoration:underline;">Cliquez ici pour télécharger ou ouvrir le document dans un nouvel onglet</a></span>
                  </div>
                </div>
              </li>
            <% }); %>
          </ul>
        <% } else { %>
          <p class="text-gray-500" style="margin-left: 2.5rem;">Aucun cours disponible.</p>
        <% } %>
      </div>
    </section>
    `;
    }
    // Section TDs
    if (showTds) {
        sections += `
    <section class="mb-6">
      <button type="button" onclick="toggleContent('tds-content')" class="text-lg font-semibold mb-2 px-4 py-2 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] transition inline-block">
        TDs
      </button>
      <div id="tds-content" class="hidden mt-2">
        <% if (tds && tds.length > 0) { %>
          <ul style="margin-left: 1.5rem;">
            <% tds.forEach(function(file, idx) { %>
              <li style="margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <a href="javascript:void(0)" onclick="togglePdfMulti('<%= file.link.split('/').pop() %>', 'tds-pdf-viewer-<%= idx %>')" class="inline-block px-3 py-1 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] transition mb-1" style="margin-left: 0.5rem;">
                    <%= file.name %>
                  </a>
                  <a href="<%= file.link %>" download="<%= file.name %>" class="inline-block px-3 py-1 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] transition mb-1 ml-2" style="margin-left:0.5rem;" title="Télécharger">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 20 20" style="vertical-align:middle;">
                      <path fill="currentColor" d="M10 2a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4A1 1 0 1 1 5.707 9.293L8 11.586V3a1 1 0 0 1 1-1zm-7 13a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z"/>
                    </svg>
                  </a>
                </div>
                <div id="tds-pdf-viewer-<%= idx %>" class="pdf-viewer-container" style="display:none; margin-left: 0.5rem;">
                  <iframe src="" class="pdf-frame" allowfullscreen></iframe>
                </div>
              </li>
            <% }); %>
          </ul>
        <% } else { %>
          <p class="text-gray-500" style="margin-left: 2.5rem;">Aucun TD disponible.</p>
        <% } %>
      </div>
    </section>
    `;
    }
    // Section TPs
    if (showTps) {
        sections += `
    <section class="mb-6">
      <button type="button" onclick="toggleContent('tps-content')" class="text-lg font-semibold mb-2 px-4 py-2 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] transition inline-block">
        TPs
      </button>
      <div id="tps-content" class="hidden mt-2">
        <% if (tps && tps.length > 0) { %>
          <ul style="margin-left: 1.5rem;">
            <% tps.forEach(function(file, idx) { %>
              <li style="margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <a href="javascript:void(0)" onclick="togglePdfMulti('<%= file.link.split('/').pop() %>', 'tps-pdf-viewer-<%= idx %>')" class="inline-block px-3 py-1 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] transition mb-1" style="margin-left: 0.5rem;">
                    <%= file.name %>
                  </a>
                  <a href="<%= file.link %>" download="<%= file.name %>" class="inline-block px-3 py-1 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] transition mb-1 ml-2" style="margin-left:0.5rem;" title="Télécharger">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 20 20" style="vertical-align:middle;">
                      <path fill="currentColor" d="M10 2a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4A1 1 0 1 1 5.707 9.293L8 11.586V3a1 1 0 0 1 1-1zm-7 13a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z"/>
                    </svg>
                  </a>
                </div>
                <div id="tps-pdf-viewer-<%= idx %>" class="pdf-viewer-container" style="display:none; margin-left: 0.5rem;">
                  <iframe src="" class="pdf-frame" allowfullscreen></iframe>
                </div>
              </li>
            <% }); %>
          </ul>
        <% } else { %>
          <p class="text-gray-500" style="margin-left: 2.5rem;">Aucun TP disponible.</p>
        <% } %>
      </div>
    </section>
    `;
    }
    // Section Annales
    if (showAnnales) {
        sections += `
    <section class="mb-6">
      <button type="button" onclick="toggleContent('annales-content')" class="text-lg font-semibold mb-2 px-4 py-2 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] transition inline-block">
        Annales
      </button>
      <div id="annales-content" class="hidden mt-2">
        <% if (annales && annales.length > 0) { %>
          <ul style="margin-left: 1.5rem;">
            <% annales.forEach(function(file, idx) { %>
              <li style="margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <a href="javascript:void(0)" onclick="togglePdfMulti('<%= file.link.split('/').pop() %>', 'annales-pdf-viewer-<%= idx %>')" class="inline-block px-3 py-1 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] transition mb-1" style="margin-left: 0.5rem;">
                    <%= file.name %>
                  </a>
                  <a href="<%= file.link %>" download="<%= file.name %>" class="inline-block px-3 py-1 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] transition mb-1 ml-2" style="margin-left:0.5rem;" title="Télécharger">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 20 20" style="vertical-align:middle;">
                      <path fill="currentColor" d="M10 2a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4A1 1 0 1 1 5.707 9.293L8 11.586V3a1 1 0 0 1 1-1zm-7 13a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z"/>
                    </svg>
                  </a>
                </div>
                <div id="annales-pdf-viewer-<%= idx %>" class="pdf-viewer-container" style="display:none; margin-left: 0.5rem;">
                  <iframe src="" class="pdf-frame" allowfullscreen></iframe>
                </div>
              </li>
            <% }); %>
          </ul>
        <% } else { %>
          <p class="text-gray-500" style="margin-left: 2.5rem;">Aucune annale disponible.</p>
        <% } %>
      </div>
    </section>
    `;
    }
    // Section Forum
    if (showForum) {
        sections += `
    <section class="mb-6">
      <button type="button" onclick="toggleContent('forum-content')" class="text-lg font-semibold mb-2 px-4 py-2 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] transition inline-block">
        Forum
      </button>
      <div id="forum-content" class="hidden mt-2">
        <button type="button" onclick="openAddDiscussionModal()" class="mb-4 bg-[#5C83BA] text-white px-4 py-2 rounded hover:bg-[#466a99] transition">
          + Ajouter une discussion
        </button>
        <!-- Modal pour ajouter une discussion -->
        <div id="addDiscussionModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" style="display:none;">
          <div class="bg-white custom-modal p-3 sm:p-6 shadow-lg w-full max-w-sm sm:max-w-md md:max-w-lg">
            <button type="button" class="close-btn" onclick="closeAddDiscussionModal()" title="Fermer">&times;</button>
            <h2 class="text-lg sm:text-xl font-bold mb-4">Nouvelle discussion</h2>
            <form action="/forum/${matiere}/add" method="POST">
              <div class="mb-3">
                <label class="block mb-1 font-medium">Nom de la discussion</label>
                <input type="text" name="discussionName" required class="w-full border px-2 py-1 rounded" placeholder="Titre de la discussion"/>
              </div>
              <div class="flex flex-col sm:flex-row justify-end gap-2">
                <button type="button" onclick="closeAddDiscussionModal()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 w-full sm:w-auto">Annuler</button>
                <button type="submit" class="px-4 py-2 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] w-full sm:w-auto">Créer</button>
              </div>
            </form>
          </div>
        </div>
        <script>
          function openAddDiscussionModal() {
            document.getElementById('addDiscussionModal').style.display = 'flex';
          }
          function closeAddDiscussionModal() {
            document.getElementById('addDiscussionModal').style.display = 'none';
          }
        </script>
        <% if (forum && forum.length > 0) { %>
          <ul style="margin-left: 1.5rem;">
            <% forum.forEach(function(discussion, idx) { 
              var discussionId = '';
              if (discussion && discussion._id) {
                if (typeof discussion._id === 'object' && discussion._id !== null && discussion._id.toHexString) {
                  discussionId = discussion._id.toHexString();
                } else if (typeof discussion._id === 'string' && /^[a-fA-F0-9]{24}$/.test(discussion._id)) {
                  discussionId = discussion._id;
                } else if (discussion._id && typeof discussion._id.toString === 'function') {
                  var strId = discussion._id.toString();
                  if (/^[a-fA-F0-9]{24}$/.test(strId)) {
                    discussionId = strId;
                  }
                }
              }
            %>
              <li style="margin-bottom: 1.5rem;">
                <div>
                  <span class="font-semibold text-[#5C83BA]"><%= discussion.name %></span>
                </div>
                <div class="mt-2" style="margin-left: 0.5rem;">
                  <div style="background:#f1f5f9; border-radius:8px; padding:1rem;">
                    <% if (discussion.messages && discussion.messages.length > 0) { %>
                      <ul class="forum-messages-list" id="forum-messages-<%= discussionId %>">
                        <% discussion.messages.forEach(function(msg) { %>
                          <li style="margin-bottom:0.5rem;">
                            <span class="font-bold text-[#5C83BA]">
                              <% if (msg.author && msg.author.username) { %>
                                <%= msg.author.username %>
                              <% } else if (msg.author) { %>
                                <%= msg.author %>
                              <% } else { %>
                                Anonyme
                              <% } %>
                              :
                            </span>
                            <span><%= msg.text %></span>
                          </li>
                        <% }); %>
                      </ul>
                    <% } else { %>
                      <ul class="forum-messages-list" id="forum-messages-<%= discussionId %>"></ul>
                      <p class="text-gray-500" id="no-msg-<%= discussionId %>">Aucun message pour cette discussion.</p>
                    <% } %>
                  </div>
                  <% if (discussionId && discussionId.length === 24) { %>
                  <form class="forum-message-form mt-2 flex flex-col sm:flex-row gap-2" data-discussion-id="<%= discussionId %>">
                    <input type="text" name="text" placeholder="Votre message" required class="border rounded px-2 py-1 flex-1" />
                    <button type="submit" class="bg-[#5C83BA] text-white px-3 py-1 rounded hover:bg-[#466a99]">Envoyer</button>
                  </form>
                  <% } %>
                </div>
              </li>
            <% }); %>
          </ul>
        <% } else { %>
          <p class="text-gray-500" style="margin-left: 2.5rem;">Aucune discussion de forum disponible.</p>
        <% } %>
      </div>
    </section>
    `;
    }

    // Génération dynamique des options du select pour l'upload
    let selectOptions = '';
    selectOptions += `<% if (${showCours}) { %><option value="cours">Cours</option><% } %>`;
    selectOptions += `<% if (${showTds}) { %><option value="tds">Tds</option><% } %>`;
    selectOptions += `<% if (${showTps}) { %><option value="tps">Tps</option><% } %>`;
    selectOptions += `<% if (${showAnnales}) { %><option value="annales">Annales</option><% } %>`;
    selectOptions += `<% if (${showForum}) { %><option value="forum">Forum</option><% } %>`;

    // ===========================
    // Génération du contenu EJS
    // ===========================
    const content = `<!DOCTYPE html>
<html lang="fr">
<%- include('../partials/header.ejs') %>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <%- include('../partials/head.ejs') %>
  <title>${titre}</title>
  <link href="/stylesheets/style.css" rel="stylesheet">
  <style>
    .hidden { display: none; }
    #uploadModal {
      animation: fadeIn 0.2s;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .custom-modal {
      border-top: 6px solid #5C83BA;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      position: relative;
      padding-top: 2.5rem;
      width: 100%;
    }
    .close-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: transparent;
      border: none;
      font-size: 1.5rem;
      color: #5C83BA;
      cursor: pointer;
      transition: color 0.2s;
    }
    .close-btn:hover {
      color: #466a99;
    }
    .custom-modal h2 {
      margin-top: 0;
      color: #5C83BA;
      text-align: center;
    }
    .custom-modal form label {
      color: #1e293b;
    }
    .custom-modal form input,
    .custom-modal form select {
      border: 1px solid #cbd5e1;
      margin-bottom: 0.5rem;
    }
    .custom-modal form input:focus,
    .custom-modal form select:focus {
      border-color: #5C83BA;
      outline: none;
    }
    input[type="file"]::-webkit-file-upload-button {
      visibility: hidden;
      display: none;
    }
    input[type="file"]::file-selector-button {
      visibility: hidden;
      display: none;
    }
    input[type="file"] {
      color: transparent;
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      width: 1px;
      min-width: 0;
      max-width: 0;
      height: 1px;
      overflow: hidden;
      position: absolute;
    }
    .file-label {
      position: relative;
    }
    .custom-file-btn {
      display: inline-block;
      background: #5C83BA;
      color: #fff;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.95rem;
      transition: background 0.2s;
      margin-right: 0.5rem;
    }
    .custom-file-btn:hover {
      background: #466a99;
    }
    .file-chosen {
      font-weight: 500;
      color: #5C83BA;
      margin-left: 0.5rem;
    }
    .file-none {
      color: #64748b;
      font-style: italic;
      margin-left: 0.5rem;
    }
    .pdf-viewer-container {
      width: 100%;
      height: 60vh;
      min-height: 350px;
      max-height: 80vh;
      margin-bottom: 1rem;
    }
    .pdf-frame {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
    @media (max-width: 900px) {
      .pdf-viewer-container {
        height: 45vh;
        min-height: 220px;
      }
    }
    @media (max-width: 600px) {
      .pdf-viewer-container {
        height: 32vh;
        min-height: 140px;
      }
    }
    @media (max-width: 400px) {
      .pdf-viewer-container {
        height: 22vh;
        min-height: 90px;
      }
    }
    @media (max-width: 640px) {
      .custom-modal {
        padding: 1rem !important;
        border-radius: 10px;
        font-size: 0.97rem;
      }
      .custom-modal h2 {
        font-size: 1.1rem;
      }
    }
    /* Ajout pour rendre le quiz scrollable */
    .quiz-scroll-container {
      max-height: 60vh;
      overflow-y: auto;
      padding-right: 8px;
      margin-bottom: 1em;
    }
    .quiz-scroll-container::-webkit-scrollbar {
      width: 8px;
      background: #f1f5f9;
    }
    .quiz-scroll-container::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }
  </style>
</head>
<body class="bg-[#FAF3E5] min-h-screen">
  <main class="p-2 sm:p-4 md:p-8 max-w-4xl mx-auto">
    <div class="mt-16 sm:mt-24"></div>
    <div class="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
      <h1 class="text-xl sm:text-2xl font-bold mb-2 sm:mb-4 text-center sm:text-left">${titre}</h1>
      <button onclick="openModal()" class="w-full sm:w-auto bg-[#5C83BA] text-white px-4 py-2 rounded hover:bg-[#466a99] transition">
        + Ajouter un fichier
      </button>
    </div>
    <p class="text-base sm:text-lg text-center sm:text-left">${phraseAccueil}</p>
    ${sections}
  </main>
  <div id="uploadModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" style="display:none;">
    <div class="bg-white custom-modal p-3 sm:p-6 shadow-lg w-full max-w-sm sm:max-w-md md:max-w-lg">
      <button type="button" class="close-btn" onclick="closeModal()" title="Fermer">&times;</button>
      <h2 class="text-lg sm:text-xl font-bold mb-4">Ajouter un fichier</h2>
      <form action="/upload/${matiere}" method="POST" enctype="multipart/form-data">
        <div class="mb-3">
          <label class="block mb-1 font-medium">Fichier PDF</label>
          <div class="file-label">
            <label class="custom-file-btn">
              Choisir un ou plusieurs fichiers
              <input type="file" name="pdfFile" accept=".pdf" required multiple onchange="updateFileName(this)"/>
            </label>
            <span id="file-chosen" class="file-none">Aucun fichier choisi</span>
          </div>
        </div>
        <div class="mb-3">
          <label class="block mb-1 font-medium">Nom du fichier</label>
          <input type="text" name="customName" placeholder="Nom affiché (optionnel)" class="w-full border px-2 py-1 rounded"/>
        </div>
        <div class="mb-3">
          <label class="block mb-1 font-medium">Catégorie</label>
          <select name="categorie" required class="w-full border px-2 py-1 rounded">
            <% if (${showCours}) { %><option value="cours">Cours</option><% } %>
            <% if (${showTds}) { %><option value="tds">Tds</option><% } %>
            <% if (${showTps}) { %><option value="tps">Tps</option><% } %>
            <% if (${showAnnales}) { %><option value="annales">Annales</option><% } %>
            <% if (${showForum}) { %><option value="forum">Forum</option><% } %>
          </select>
        </div>
        <div class="flex flex-col sm:flex-row justify-end gap-2">
          <button type="button" onclick="closeModal()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 w-full sm:w-auto">Annuler</button>
          <button type="submit" class="px-4 py-2 bg-[#5C83BA] text-white rounded hover:bg-[#466a99] w-full sm:w-auto">Ajouter</button>
        </div>
      </form>
    </div>
  </div>
  <!-- Modal Quiz IA -->
  <div id="quizModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" style="display:none;">
    <div class="bg-white custom-modal p-3 sm:p-6 shadow-lg w-full max-w-lg relative" style="margin-top: 6rem;">
      <button type="button" class="close-btn" onclick="closeQuizModal()" title="Fermer">&times;</button>
      <h2 class="text-lg sm:text-xl font-bold mb-4" id="quizModalTitle">Quiz IA</h2>
      <div id="quizLoading" class="text-center text-blue-600 font-semibold" style="display:none;">Génération du quiz en cours...</div>
      <div id="quizError" class="text-center text-red-600 font-semibold" style="display:none;"></div>
      <div id="quizContent" class="quiz-scroll-container"></div>
      <div class="flex flex-col sm:flex-row justify-end gap-2 mt-4">
        <button type="button" onclick="regenerateQuizIA()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-700 w-full sm:w-auto">Régénérer</button>
        <button type="button" onclick="closeQuizModal()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 w-full sm:w-auto">Fermer</button>
      </div>
    </div>
  </div>
  <!-- Modal Résumé IA -->
  <div id="resumeModal" class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" style="display:none;">
    <div class="bg-white custom-modal p-3 sm:p-6 shadow-lg w-full max-w-lg relative" style="margin-top: 6rem;">
      <button type="button" class="close-btn" onclick="closeResumeModal()" title="Fermer">&times;</button>
      <h2 class="text-lg sm:text-xl font-bold mb-4" id="resumeModalTitle">Résumé IA</h2>
      <div id="resumeLoading" class="text-center text-blue-600 font-semibold" style="display:none;">Génération du résumé en cours...</div>
      <div id="resumeError" class="text-center text-red-600 font-semibold" style="display:none;"></div>
      <div id="resumeContent" class="quiz-scroll-container"></div>
      <div class="flex flex-col sm:flex-row justify-end gap-2 mt-4">
        <button type="button" onclick="regenerateResumeIA()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-700 w-full sm:w-auto">Régénérer</button>
        <button type="button" onclick="closeResumeModal()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 w-full sm:w-auto">Fermer</button>
      </div>
    </div>
  </div>
  Ajout script
</body>
<%- include("../partials/footer.ejs") %>
</html>
`;

    // Écriture du fichier EJS pour la matière
    fs.writeFileSync(path.join(viewsDir, `${matiere}.ejs`), content, 'utf8');
    console.log(`Page générée : matieres/${matiere}.ejs`);
});

// ===============================
// Fonction utilitaire pour "de" ou "d'"
// ===============================
function deOuD(titre) {
    // Retourne "de" ou "d'" selon la première lettre du titre (voyelle ou non)
    const voyelles = ['a', 'e', 'i', 'o', 'u', 'y', 'é', 'è', 'ê', 'â', 'î', 'ô', 'û', 'ù', 'ë', 'ï', 'ü', 'œ'];
    const firstLetter = titre.trim().toLowerCase()[0];
    return voyelles.includes(firstLetter) ? "d'" : "de ";
}
