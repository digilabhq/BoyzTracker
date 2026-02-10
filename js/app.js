/*
 *  Main Entry — Orchestrates app modules
 */
import APP_CONFIG from './config.js';
import AUTH from './auth.js';
import DB from './db.js';
import CAL from './calendar.js';

async function boot() {
  // Initialize Firebase first
  await DB.init();

  // Initialize auth with callback
  AUTH.init(async (userId) => {
    // Show main app
    document.getElementById('app').classList.add('active');

    // Boot enabled features
    if (APP_CONFIG.features.calendar) {
      CAL.init(userId);
    }

    // Future feature hooks:
    // if (APP_CONFIG.features.profiles) { PROFILES.init(); }
    // if (APP_CONFIG.features.activityLog) { ACTIVITY.init(); }
    // if (APP_CONFIG.features.expenses) { EXPENSES.init(); }
  });
}

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log('SW:', err));
}

// Boot
boot().catch(err => console.error('Boot error:', err));
