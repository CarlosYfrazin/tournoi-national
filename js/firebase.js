// ============================================
// firebase.js — Configuration Firebase + Utils
// ============================================
// 🔧 REMPLACE ces valeurs par tes propres clés Firebase
// (Créer un projet sur https://console.firebase.google.com)

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD_SxDK81-5EC-IcHj3-FR8FtyCHTkKN-0",
  authDomain: "tournoi-national-951f9.firebaseapp.com",
  projectId: "tournoi-national-951f9",
  storageBucket: "tournoi-national-951f9.firebasestorage.app",
  messagingSenderId: "650480870115",
  appId: "1:650480870115:web:bd46e18656407e319ddbd6"
};

// ──────────────────────────────────────────
// INITIALISATION FIREBASE
// ──────────────────────────────────────────
firebase.initializeApp(FIREBASE_CONFIG);
const db = firebase.firestore();

// Collections Firestore
const PLAYERS_COL = "players";
const MATCHES_COL  = "matches";
const CONFIG_COL   = "config";

// ──────────────────────────────────────────
// MOT DE PASSE ADMIN (stocké dans Firestore)
// Par défaut : admin2025!
// ──────────────────────────────────────────
const ADMIN_PASSWORD_DEFAULT = "admin2025!";

// ──────────────────────────────────────────
// INDICATEUR DE CONNEXION FIREBASE
// ──────────────────────────────────────────
function setFirebaseStatus(connected) {
  document.querySelectorAll('.fb-dot').forEach(d => {
    d.classList.toggle('connected', connected);
  });
  document.querySelectorAll('.fb-status-text').forEach(el => {
    el.textContent = connected ? 'Firebase connecté' : 'Hors ligne';
  });
}

db.collection(CONFIG_COL).doc('status').get()
  .then(() => setFirebaseStatus(true))
  .catch(() => setFirebaseStatus(false));

// ──────────────────────────────────────────
// GÉNÉRATION D'ID UNIQUE
// EF-001, EF-002 ... / DLS-001, DLS-002 ...
// ──────────────────────────────────────────
async function generatePlayerId(game) {
  const prefix = game === 'eFootball' ? 'EF' : 'DLS';
  const snap = await db.collection(PLAYERS_COL)
    .where('game', '==', game)
    .orderBy('createdAt', 'desc')
    .get();

  // Trouver le dernier numéro utilisé
  let max = 0;
  snap.forEach(doc => {
    const id = doc.data().id || '';
    const num = parseInt(id.replace(prefix + '-', '')) || 0;
    if (num > max) max = num;
  });

  // Joueurs pré-existants : EF commence à 19, DLS à 5
  const base = game === 'eFootball' ? 19 : 5;
  const next = Math.max(max, base) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

// ──────────────────────────────────────────
// JOUEURS — CRUD
// ──────────────────────────────────────────

/** Récupère tous les joueurs d'un jeu */
async function getPlayers(game = null) {
  let q = db.collection(PLAYERS_COL).orderBy('createdAt', 'asc');
  if (game) q = db.collection(PLAYERS_COL).where('game', '==', game).orderBy('createdAt', 'asc');
  const snap = await q.get();
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
}

/** Vérifie si un nom d'équipe existe déjà */
async function teamNameExists(name, game) {
  const snap = await db.collection(PLAYERS_COL)
    .where('teamLower', '==', name.toLowerCase().trim())
    .where('game', '==', game)
    .get();
  return !snap.empty;
}

/** Inscrit un nouveau joueur */
async function registerPlayer(data) {
  const { team, game, rating, connexion, dispo, wa } = data;

  // Vérifier doublon
  const exists = await teamNameExists(team, game);
  if (exists) throw new Error('DUPLICATE');

  // Générer ID
  const id = await generatePlayerId(game);

  const player = {
    id,
    team: team.trim(),
    teamLower: team.toLowerCase().trim(),
    game,
    rating: rating || '',
    connexion: connexion || '',
    dispo: dispo || '',
    wa: wa || '',
    status: 'active',
    locked: true,
    wins: 0, losses: 0, draws: 0,
    points: 0, gf: 0, ga: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  await db.collection(PLAYERS_COL).add(player);
  return id;
}

/** Modifier un joueur (admin uniquement) */
async function updatePlayer(docId, updates) {
  if (updates.team) updates.teamLower = updates.team.toLowerCase().trim();
  await db.collection(PLAYERS_COL).doc(docId).update(updates);
}

/** Supprimer un joueur (admin uniquement) */
async function deletePlayer(docId) {
  await db.collection(PLAYERS_COL).doc(docId).delete();
}

// ──────────────────────────────────────────
// MATCHS — CRUD
// ──────────────────────────────────────────

/** Récupère tous les matchs */
async function getMatches(game = null) {
  let q = db.collection(MATCHES_COL).orderBy('createdAt', 'desc');
  if (game) q = db.collection(MATCHES_COL).where('game', '==', game).orderBy('createdAt', 'desc');
  const snap = await q.get();
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
}

/** Créer un match */
async function createMatch(data) {
  const match = {
    ...data,
    status: 'pending',
    score1: null,
    score2: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  const ref = await db.collection(MATCHES_COL).add(match);
  return ref.id;
}

/** Valider un résultat (admin uniquement) */
async function validateMatchResult(docId, score1, score2, p1DocId, p2DocId) {
  const s1 = parseInt(score1) || 0;
  const s2 = parseInt(score2) || 0;

  // Mettre à jour le match
  await db.collection(MATCHES_COL).doc(docId).update({
    status: 'done',
    score1: s1,
    score2: s2,
    validatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  // Mettre à jour les stats des joueurs
  const batch = db.batch();

  const p1Ref = db.collection(PLAYERS_COL).doc(p1DocId);
  const p2Ref = db.collection(PLAYERS_COL).doc(p2DocId);

  if (s1 > s2) {
    // p1 gagne
    batch.update(p1Ref, { wins: firebase.firestore.FieldValue.increment(1), points: firebase.firestore.FieldValue.increment(3), gf: firebase.firestore.FieldValue.increment(s1), ga: firebase.firestore.FieldValue.increment(s2) });
    batch.update(p2Ref, { losses: firebase.firestore.FieldValue.increment(1), gf: firebase.firestore.FieldValue.increment(s2), ga: firebase.firestore.FieldValue.increment(s1) });
  } else if (s2 > s1) {
    // p2 gagne
    batch.update(p2Ref, { wins: firebase.firestore.FieldValue.increment(1), points: firebase.firestore.FieldValue.increment(3), gf: firebase.firestore.FieldValue.increment(s2), ga: firebase.firestore.FieldValue.increment(s1) });
    batch.update(p1Ref, { losses: firebase.firestore.FieldValue.increment(1), gf: firebase.firestore.FieldValue.increment(s1), ga: firebase.firestore.FieldValue.increment(s2) });
  } else {
    // Nul
    batch.update(p1Ref, { draws: firebase.firestore.FieldValue.increment(1), points: firebase.firestore.FieldValue.increment(1), gf: firebase.firestore.FieldValue.increment(s1), ga: firebase.firestore.FieldValue.increment(s2) });
    batch.update(p2Ref, { draws: firebase.firestore.FieldValue.increment(1), points: firebase.firestore.FieldValue.increment(1), gf: firebase.firestore.FieldValue.increment(s2), ga: firebase.firestore.FieldValue.increment(s1) });
  }

  await batch.commit();
}

/** Supprimer un match */
async function deleteMatch(docId) {
  await db.collection(MATCHES_COL).doc(docId).delete();
}

// ──────────────────────────────────────────
// JOUEURS PRÉ-EXISTANTS (import initial)
// ──────────────────────────────────────────
async function importInitialPlayers() {
  const existing = await getPlayers();
  if (existing.length > 0) return; // Déjà importés

  const efPlayers = [
    { team: "Bobyohann", rating: "3167" },
    { team: "MarcoGaello", rating: "3165" },
    { team: "PHODJY LOCO", rating: "3187" },
    { team: "REY-509", rating: "3133" },
    { team: "Menkou509", rating: "3140" },
    { team: "fc force", rating: "3189" },
    { team: "As Roma", rating: "3172" },
    { team: "Fc Triple H", rating: "3164" },
    { team: "Arsenal", rating: "3187" },
    { team: "INVINCIBLE CF", rating: "3200" },
    { team: "fc K-MELO", rating: "3220" },
    { team: "Olympique Lionais", rating: "" },
    { team: "LAZIO DE ROME", rating: "" },
    { team: "FC Bonapat", rating: "3152" },
    { team: "SLEYREMI20", rating: "" },
    { team: "FBI Nahusky", rating: "" },
    { team: "Fc Dragon", rating: "3212" },
    { team: "HunterMarc", rating: "3180" },
    { team: "OPTIMUS PRIME", rating: "" }
  ];

  const dlsPlayers = [
    { team: "Fedler Fc", rating: "" },
    { team: "FC CITY DE MARCABEE", rating: "" },
    { team: "Vinn goûté Tend", rating: "" },
    { team: "Full FC", rating: "" },
    { team: "Atomic FC", rating: "" }
  ];

  const batch = db.batch();
  const ts = firebase.firestore.Timestamp.fromDate(new Date('2025-01-01'));

  efPlayers.forEach((p, i) => {
    const ref = db.collection(PLAYERS_COL).doc();
    batch.set(ref, {
      id: `EF-${String(i+1).padStart(3,'0')}`,
      team: p.team, teamLower: p.team.toLowerCase(),
      game: 'eFootball', rating: p.rating,
      connexion: '', dispo: '', wa: '',
      status: 'active', locked: true,
      wins: 0, losses: 0, draws: 0, points: 0, gf: 0, ga: 0,
      createdAt: ts
    });
  });

  dlsPlayers.forEach((p, i) => {
    const ref = db.collection(PLAYERS_COL).doc();
    batch.set(ref, {
      id: `DLS-${String(i+1).padStart(3,'0')}`,
      team: p.team, teamLower: p.team.toLowerCase(),
      game: 'DLS', rating: p.rating,
      connexion: '', dispo: '', wa: '',
      status: 'active', locked: true,
      wins: 0, losses: 0, draws: 0, points: 0, gf: 0, ga: 0,
      createdAt: ts
    });
  });

  await batch.commit();
  console.log('✅ Joueurs initiaux importés dans Firebase');
}

// ──────────────────────────────────────────
// UTILS GLOBAUX
// ──────────────────────────────────────────
function showAlert(id, msg) {
  const el = document.getElementById(id);
  const msgEl = document.getElementById(id + '-msg');
  if (el)    el.classList.add('show');
  if (msgEl) msgEl.textContent = msg;
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

function toast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '⚠️', info: 'ℹ️' };
  t.innerHTML = `<span>${icons[type] || '✅'}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function setActivePage(page) {
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });
}
