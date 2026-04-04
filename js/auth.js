/*
 *  Auth Module — PIN-based login with photo background
 */
import APP_CONFIG from './config.js';

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const AUTH = {
  currentUser: null,
  pinEntry: '',

  init(onSuccess) {
    this.onSuccess = onSuccess;

    // Rotating hero background (shuffle once per visit + rotate every 4s while auth is visible)
    const visitId = parseInt(localStorage.getItem('boyz_visits') || '0');
    localStorage.setItem('boyz_visits', String(visitId + 1));

    // Shuffle once for this visit and share with the main app
    const shuffledHeroes = shuffleArray(APP_CONFIG.heroImages);
    sessionStorage.setItem('boyz_hero_shuffle', JSON.stringify({ visitId, heroes: shuffledHeroes }));

    let heroIdx = 0;
    const authBgEl = document.getElementById('authBg');
    const setHero = () => {
      authBgEl.style.backgroundImage = `url('${shuffledHeroes[heroIdx]}')`;
    };
    setHero();

    if (this._heroTimer) clearInterval(this._heroTimer);
    this._heroTimer = setInterval(() => {
      const authScreen = document.getElementById('authScreen');
      if (!authScreen || getComputedStyle(authScreen).display === 'none') {
        clearInterval(this._heroTimer);
        this._heroTimer = null;
        return;
      }
      heroIdx = (heroIdx + 1) % shuffledHeroes.length;
      setHero();
    }, 10000);

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
