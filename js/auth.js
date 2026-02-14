/*
 *  Auth Module — PIN-based login with photo background
 */
import APP_CONFIG from './config.js';

const AUTH = {
  currentUser: null,
  pinEntry: '',

  init(onSuccess) {
    this.onSuccess = onSuccess;

    // Rotating hero background
    const visitCount = parseInt(localStorage.getItem('boyz_visits') || '0');
    const heroIdx = visitCount % APP_CONFIG.heroImages.length;
    localStorage.setItem('boyz_visits', String(visitCount + 1));
    document.getElementById('authBg').style.backgroundImage =
      `url('${APP_CONFIG.heroImages[heroIdx]}')`;

    // Check session
    const saved = sessionStorage.getItem('boyz_user');
    if (saved && APP_CONFIG.users[saved]) {
      this.currentUser = saved;
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
