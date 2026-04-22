# 🏆 Tournoi National de Jeu Vidéo

Application web complète pour gérer le tournoi eFootball & DLS.

---

## 📁 Structure des fichiers

```
tournoi-national/
├── index.html          ← Page d'accueil
├── inscription.html    ← Inscription des joueurs
├── matches.html        ← Liste des matchs
├── classement.html     ← Classement général
├── regles.html         ← Règles du tournoi
├── admin.html          ← Dashboard administrateur
├── css/
│   └── style.css       ← Design complet
├── js/
│   └── firebase.js     ← Config Firebase + toutes les fonctions
└── README.md
```

---

## 🔧 CONFIGURATION FIREBASE (OBLIGATOIRE)

### Étape 1 — Créer un projet Firebase gratuit

1. Va sur https://console.firebase.google.com
2. Clique "Ajouter un projet"
3. Donne un nom : `tournoi-national`
4. Désactive Google Analytics (optionnel)
5. Clique "Créer le projet"

### Étape 2 — Activer Firestore

1. Dans le menu gauche → "Firestore Database"
2. Clique "Créer une base de données"
3. Choisis "Mode production"
4. Sélectionne une région (ex: `us-central1`)
5. Clique "Activer"

### Étape 3 — Configurer les règles Firestore

Dans Firestore → onglet "Règles", colle ceci :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Lecture publique pour tous
    match /players/{doc} {
      allow read: if true;
      allow write: if true; // Pour simplifier. En prod, utilise Auth.
    }
    match /matches/{doc} {
      allow read: if true;
      allow write: if true;
    }
    match /config/{doc} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

Clique "Publier".

### Étape 4 — Récupérer les clés Firebase

1. Dans Firebase → ⚙️ Paramètres du projet
2. Descends vers "Vos applications"
3. Clique l'icône `</>` (Web)
4. Donne un nom à l'app : `tournoi-web`
5. Clique "Enregistrer l'application"
6. Copie le bloc `firebaseConfig`

### Étape 5 — Coller les clés dans le code

Ouvre le fichier `js/firebase.js` et remplace :

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "REMPLACE_PAR_TON_API_KEY",
  authDomain:        "REMPLACE_PAR_TON_AUTH_DOMAIN",
  projectId:         "REMPLACE_PAR_TON_PROJECT_ID",
  storageBucket:     "REMPLACE_PAR_TON_STORAGE_BUCKET",
  messagingSenderId: "REMPLACE_PAR_TON_MESSAGING_SENDER_ID",
  appId:             "REMPLACE_PAR_TON_APP_ID"
};
```

Par tes vraies clés copiées depuis Firebase.

---

## 🚀 DÉPLOIEMENT SUR GITHUB PAGES (GRATUIT)

### Étape 1 — Créer un repo GitHub

1. Va sur https://github.com
2. Clique "New repository"
3. Nom : `tournoi-national`
4. Coche "Public"
5. Clique "Create repository"

### Étape 2 — Uploader les fichiers

Option A — Via l'interface GitHub :
1. Clique "uploading an existing file"
2. Glisse TOUS les fichiers ET dossiers (css/, js/)
3. Clique "Commit changes"

Option B — Via Git :
```bash
git init
git add .
git commit -m "Premier déploiement"
git remote add origin https://github.com/TON-USERNAME/tournoi-national.git
git push -u origin main
```

### Étape 3 — Activer GitHub Pages

1. Dans ton repo → Settings
2. Scroll vers "Pages"
3. Source : "Deploy from a branch"
4. Branch : `main` / `/ (root)`
5. Clique "Save"
6. Attends 2-3 minutes
7. Ton site est en ligne à :
   `https://TON-USERNAME.github.io/tournoi-national/`

---

## 🔐 MOT DE PASSE ADMIN

Par défaut : **`admin2025!`**

Pour le changer, ouvre `js/firebase.js` et modifie :
```javascript
const ADMIN_PASSWORD_DEFAULT = "admin2025!";
```

---

## 📱 NUMÉRO WHATSAPP ADMIN

Dans `matches.html`, remplace `50900000000` par ton vrai numéro :
```html
onclick="window.open('https://wa.me/50900000000?...')"
```

---

## ✅ VÉRIFICATION

Après déploiement, vérifie que :
- [ ] La page d'accueil charge
- [ ] Les 24 équipes apparaissent dans Inscription
- [ ] Le classement s'affiche
- [ ] L'admin se connecte avec `admin2025!`
- [ ] Tu peux créer un match dans l'admin
- [ ] Les données apparaissent dans Firebase Console

---

## 🆘 PROBLÈMES FRÉQUENTS

**"Firebase non connecté"** → Vérifie les clés dans `js/firebase.js`

**"Permission denied"** → Vérifie les règles Firestore (étape 3)

**Page blanche sur GitHub** → Assure-toi que le fichier principal s'appelle `index.html`

**Les joueurs n'apparaissent pas** → Va dans admin.html → onglet "Ajouter" → les joueurs initiaux sont auto-importés au premier chargement
