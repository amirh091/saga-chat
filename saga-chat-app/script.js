// =========================================
// CONFIGURATION SUPABASE (UNE SEULE FOIS !)
// =========================================
const SUPABASE_URL = 'https://zvicbdylshshutozoaux.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2aWNiZHlsc2hzaHV0b3pvYXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5ODAyMjYsImV4cCI6MjEwNzU1NjIyNn0.3ZEOzb1gR4FeUJkMwqurvskv9p7-pDcRtG8G_M40tcw'; // ⚠️ Remplace par ta vraie clé anon

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =========================================
// ÉLÉMENTS DU DOM
// =========================================
const messagesArea = document.getElementById('messages-area');
const inputMessage = document.getElementById('message-input');
const inputNom = document.getElementById('nom-utilisateur');
const btnSend = document.getElementById('send-btn');

// Variable pour le badge de notification
let messagesNonLus = 0;

// Remettre le titre normal quand on revient sur l'onglet
window.addEventListener('focus', () => {
    messagesNonLus = 0;
    document.title = "Saga Chat";
});

// =========================================
// FONCTIONS SONORES (STYLE IMESSAGE)
// =========================================

function jouerSonEnvoi() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        
        oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1400, audioCtx.currentTime + 0.08);
        
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) { console.log('Son désactivé'); }
}

function jouerSonReception() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        
        oscillator.frequency.setValueAtTime(1400, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.08);
        
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) { console.log('Son désactivé'); }
}

// =========================================
// FONCTIONS UTILITAIRES
// =========================================

function formaterHeure(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getCouleurPourAuteur(nom) {
    let hash = 0;
    for (let i = 0; i < nom.length; i++) {
        hash = nom.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 5;
}

// =========================================
// AFFICHAGE DES MESSAGES + MOBILE
// =========================================

function afficherMessage(msg) {
    const welcome = document.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    const div = document.createElement('div');
    const estMoi = msg.auteur === inputNom.value.trim();
    
    //  TOUCHES MOBILES : Son + Vibration + Badge
    if (!estMoi) {
        jouerSonReception();
        
        // Vibration (Fonctionne sur Android, limité sur iOS)
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]); // Vibre 100ms, pause 50ms, vibre 100ms
        }
        
        // Badge dans le titre de l'onglet
        messagesNonLus++;
        document.title = `(${messagesNonLus}) Saga Chat`;
    }
    
    const couleurIndex = getCouleurPourAuteur(msg.auteur);
    div.className = `message color-${couleurIndex}`;
    if (estMoi) div.classList.add('moi');
    
    div.innerHTML = `
        <span class="auteur">${msg.auteur}</span>
        <span class="texte">${msg.texte}</span>
        <span class="heure">${formaterHeure(msg.created_at)}</span>
    `;
    
    messagesArea.appendChild(div);
    messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: 'smooth' });
}

// =========================================
// CHARGEMENT & ENVOI
// =========================================

async function chargerMessages() {
    try {
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(50);
        
        if (!error && data && data.length > 0) {
            messagesArea.innerHTML = '';
            data.forEach(afficherMessage);
        }
    } catch (err) { console.error('Erreur:', err); }
}

async function envoyerMessage() {
    const texte = inputMessage.value.trim();
    const auteur = inputNom.value.trim() || 'Anonyme';
    
    if (texte === '') return;

    jouerSonEnvoi();

    try {
        const { error } = await supabaseClient
            .from('messages')
            .insert([{ auteur, texte }]);
        
        if (!error) {
            inputMessage.value = '';
            inputMessage.focus();
        }
    } catch (err) { console.error('Erreur:', err); }
}

// =========================================
// ÉVÉNEMENTS & TEMPS RÉEL
// =========================================

btnSend.addEventListener('click', envoyerMessage);

inputMessage.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') envoyerMessage();
});

supabaseClient
    .channel('salle-discussion')
    .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => { afficherMessage(payload.new); }
    )
    .subscribe();

chargerMessages();
console.log('✅ Saga Chat initialisé avec succès !');

// =========================================
// ENREGISTREMENT DU SERVICE WORKER (PWA)
// =========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('✅ Service Worker enregistré pour PWA'))
            .catch(err => console.error('❌ Erreur Service Worker:', err));
    });
}