/*
 *  Firebase Module — Database & Auth abstraction
 *  v2.1 — per-day merge writes (no more whole-doc clobbering)
 */
import APP_CONFIG from './config.js';

const FB = 'https://www.gstatic.com/firebasejs/11.0.1';

let db = null;
let auth = null;
let unsubscribe = null;
let fs = null; // cached firestore module

// Firestore rejects `undefined` values — replace them with null recursively
function sanitize(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) => (v === undefined ? null : v)));
}

const DB = {
  ready: false,

  async init() {
    const { initializeApp } = await import(`${FB}/firebase-app.js`);
    fs = await import(`${FB}/firebase-firestore.js`);
    const { getAuth, signInAnonymously } = await import(`${FB}/firebase-auth.js`);

    const app = initializeApp(APP_CONFIG.firebase);
    db = fs.getFirestore(app);
    auth = getAuth(app);

    await signInAnonymously(auth);
    this.ready = true;
    return { db, auth };
  },

  // Write ONLY the given day — safe against concurrent edits of other days.
  async saveDay(key, dayData, pawData) {
    if (!this.ready) return false;
    const ref = fs.doc(db, 'shared', 'calendar');
    try {
      await fs.updateDoc(ref,
        new fs.FieldPath('selected', key), sanitize(dayData),
        new fs.FieldPath('pawPositions', key), pawData ? sanitize(pawData) : fs.deleteField()
      );
      return true;
    } catch (err) {
      // Doc doesn't exist yet — create it with this day.
      if (err?.code === 'not-found') {
        try {
          await fs.setDoc(ref, {
            selected: { [key]: sanitize(dayData) },
            pawPositions: pawData ? { [key]: sanitize(pawData) } : {}
          }, { merge: true });
          return true;
        } catch (e2) { console.error('Save error:', e2); return false; }
      }
      console.error('Save error:', err);
      return false;
    }
  },

  // Remove ONLY the given day.
  async deleteDay(key) {
    if (!this.ready) return false;
    const ref = fs.doc(db, 'shared', 'calendar');
    try {
      await fs.updateDoc(ref,
        new fs.FieldPath('selected', key), fs.deleteField(),
        new fs.FieldPath('pawPositions', key), fs.deleteField()
      );
      return true;
    } catch (err) {
      if (err?.code === 'not-found') return true; // nothing to delete
      console.error('Delete error:', err);
      return false;
    }
  },

  async listen(onChange) {
    if (!this.ready) { onChange(null, null, 'error'); return; }
    if (unsubscribe) unsubscribe();

    const ref = fs.doc(db, 'shared', 'calendar');
    unsubscribe = fs.onSnapshot(ref, snap => {
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
