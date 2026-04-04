/*
 *  Firebase Module — Database & Auth abstraction
 */
import APP_CONFIG from './config.js';

let db = null;
let auth = null;
let unsubscribe = null;

// Firestore rejects `undefined` values — replace them with null recursively
function sanitize(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined ? null : v)));
}

const DB = {
  async init() {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
    const { getAuth, signInAnonymously } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');

    const app = initializeApp(APP_CONFIG.firebase);
    db = getFirestore(app);
    auth = getAuth(app);

    await signInAnonymously(auth);
    return { db, auth };
  },

  async save(selected, pawPositions) {
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
    try {
      const ref = doc(db, 'shared', 'calendar');
      await setDoc(ref, { selected: sanitize(selected), pawPositions: sanitize(pawPositions) });
      return true;
    } catch (err) {
      console.error('Save error:', err);
      return false;
    }
  },

  async listen(onChange) {
    const { doc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
    if (unsubscribe) unsubscribe();

    const ref = doc(db, 'shared', 'calendar');
    unsubscribe = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const data = snap.data();
        onChange(data.selected || {}, data.pawPositions || {}, 'synced');
      } else {
        onChange({}, {}, 'ready');
      }
    }, err => {
      console.error('Sync error:', err);
      onChange(null, null, 'error');
    });
  }
};

export default DB;
