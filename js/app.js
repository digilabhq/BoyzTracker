/*
 *  Main Entry — Orchestrates app modules
 */
import APP_CONFIG from './config.js';
import AUTH from './auth.js';
import DB from './db.js';
import CAL from './calendar.js';

async function boot() {
  await DB.init();

  AUTH.init(async (userId) => {
    document.getElementById('app').classList.add('active');
    if (APP_CONFIG.features.calendar) {
      CAL.init(userId);
    }
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log('SW:', err));
}

boot().catch(err => console.error('Boot error:', err));
