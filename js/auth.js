/*
 *  Auth Module — PIN-based login with photo background
 */
import APP_CONFIG from './config.js';

const AUTH = {
  currentUser: null,
  pinEntry: '',

  init(onSuccess) {
    this.onSuccess = onSuccess;

    // Rotating hero background (on refresh + every 4s while auth is visible)
    const visitCount = parseInt(localStorage.getItem('boyz_visits') || '0');
    let heroIdx = visitCount % APP_CONFIG.heroImages.length;
    localStorage.setItem('boyz_visits', String(visitCount + 1));

    const authBgEl = document.getElementById('authBg');
    const setHero = () => {
      authBgEl.style.backgroundImage = `url('${APP_CONFIG.heroImages[heroIdx]}')`;
    };
    setHero();

    // Keep rotating if user stays on auth screen
    if (this._heroTimer) clearInterval(this._heroTimer);
    this._heroTimer = setInterval(() => {
      // Stop if auth screen is no longer visible
      const authScreen = document.getElementById('authScreen');
      if (!authScreen || getComputedStyle(authScreen).display === 'none') {
        clearInterval(this._heroTimer);
        this._heroTimer = null;
        return;
      }
      heroIdx = (heroIdx + 1) % APP_CONFIG.heroImages.length;
      setHero();
    }, 4000);

    // Check session
    const saved = sessionStorage.getItem('boyz_user');
    if (saved && APP_CONFIG.users[saved]) {
      this.currentUser = saved;
      if (this._heroTimer) { clearInterval(this._heroTimer); this._heroTimer = null; }
      this.onSuccess(saved);
      return;
    }

    document.getElementById('authScreen').style.display = 'flex';
    this.bindPad();
  },

  bindPad() {
    document.getElementById('pinPad').addEventListener('click', e => {
      const key = e.target.closest('.pin-key');
      if (!key) return;
      const val = key.dataset.val;
      if (!val) return;

      if (val === 'back') {
        this.pinEntry = this.pinEntry.slice(0, -1);
      } else if (this.pinEntry.length < 4) {
        this.pinEntry += val;
      }

      this.updateDots();
      if (this.pinEntry.length === 4) {
        setTimeout(() => this.validate(), 150);
      }
    });
  },

  updateDots() {
    const dots = document.getElementById('pinDots').children;
    for (let i = 0; i < 4; i++) {
      dots[i].classList.toggle('filled', i < this.pinEntry.length);
      dots[i].classList.remove('error');
    }
    document.getElementById('authStatus').textContent = '';
  },

  async validate() {
    const userId = APP_CONFIG.pins[this.pinEntry];
    if (userId) {
      this.currentUser = userId;
      const user = APP_CONFIG.users[userId];
      document.getElementById('authStatus').textContent = `Welcome, ${user.name}`;
      document.getElementById('authStatus').classList.add('success');
      sessionStorage.setItem('boyz_user', userId);

      setTimeout(() => {
        document.getElementById('authScreen').classList.add('leaving');
        setTimeout(() => {
          document.getElementById('authScreen').style.display = 'none';
          if (this._heroTimer) { clearInterval(this._heroTimer); this._heroTimer = null; }
          this.onSuccess(userId);
        }, 500);
      }, 600);
    } else {
      const dots = document.getElementById('pinDots').children;
      for (let i = 0; i < 4; i++) dots[i].classList.add('error');
      setTimeout(() => { this.pinEntry = ''; this.updateDots(); }, 500);
    }
  }
};

export default AUTH;
