/*
 *  Main Entry — Orchestrates app modules
 */
import APP_CONFIG from './config.js';
import AUTH from './auth.js';
import DB from './db.js';
import CAL from './calendar.js';
import { toast } from './ui.js';

async function boot() {
  // Never let Firebase failure (e.g. offline first load) block the PIN screen.
  let dbOk = true;
  try {
    await DB.init();
  } catch (err) {
    console.error('DB init failed (offline?):', err);
    dbOk = false;
  }

  AUTH.init(async (userId) => {
    document.getElementById('app').classList.add('active');
    if (APP_CONFIG.features.calendar) {
      CAL.init(userId);
      if (!dbOk) toast('Offline — changes won\'t save');
    }
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log('SW:', err));
}

boot().catch(err => console.error('Boot error:', err));
