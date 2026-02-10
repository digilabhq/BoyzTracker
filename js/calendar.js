/*
 *  Calendar Module — Rendering, interactions, stats
 */
import APP_CONFIG from './config.js';
import DB from './db.js';
import { toast } from './ui.js';

let selected = {};
let pawPositions = {};
let currentMonth = new Date();
let currentUser = null;
let currentEditKey = null;
let lockTimers = {};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CAL = {
  init(userId) {
    currentUser = userId;
    currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Set hero image (rotating)
    const visitCount = parseInt(localStorage.getItem('boyz_visits') || '1') - 1;
    const heroIdx = visitCount % APP_CONFIG.heroImages.length;
    document.getElementById('heroImg').src = APP_CONFIG.heroImages[heroIdx];

    // Start listening
    DB.listen((sel, paw, status) => {
      if (sel !== null) {
        selected = sel;
        pawPositions = paw;
      }
      document.getElementById('syncLabel').textContent =
        status === 'synced' ? 'Synced' : status === 'ready' ? 'Ready' : 'Offline';
      this.render();
    });

    this.render();
    this.bindNav();
    this.bindEditor();
    this.bindViewers();
    this.bindActions();
  },

  render() {
    const grid = document.getElementById('calGrid');
    grid.innerHTML = '';
    const y = currentMonth.getFullYear(), m = currentMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();

    document.getElementById('monthLabel').innerHTML =
      `${MONTHS[m]} <span class="year">${y}</span>`;

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      grid.appendChild(empty);
    }

    let rpC = 0, vrC = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const cell = document.createElement('div');
      cell.className = 'cal-day';

      if (today.getFullYear()===y && today.getMonth()===m && today.getDate()===d) {
        cell.classList.add('today');
      }

      const entry = selected[key];
      if (entry) {
        if (entry.owner === 'rp') { rpC++; cell.classList.add('rp-day'); }
        else if (entry.owner === 'vr') { vrC++; cell.classList.add('vr-day'); }

        if (!pawPositions[key]) pawPositions[key] = this.genPositions();
        const pawSrc = APP_CONFIG.users[entry.owner]?.paw || 'images/icons/paw-blue.png';
        const scatter = document.createElement('div');
        scatter.className = 'paw-scatter';
        pawPositions[key].forEach(p => {
          const img = document.createElement('img');
          img.src = pawSrc;
          img.style.top = p.top + '%';
          img.style.left = p.left + '%';
          img.style.transform = `rotate(${p.rot}deg)`;
          scatter.appendChild(img);
        });
        cell.appendChild(scatter);

        if (entry.photo) {
          const thumb = document.createElement('img');
          thumb.src = entry.photo;
          thumb.className = 'day-thumb';
          cell.appendChild(thumb);
        } else if (entry.note) {
          const pin = document.createElement('div');
          pin.className = 'day-indicator';
          pin.textContent = '📌';
          cell.appendChild(pin);
        }
      }

      const num = document.createElement('div');
      num.className = 'day-num';
      num.textContent = d;
      cell.appendChild(num);

      this.bindDay(cell, key, entry);
      grid.appendChild(cell);
    }

    document.getElementById('rpCount').textContent = rpC;
    document.getElementById('vrCount').textContent = vrC;
  },

  bindDay(cell, key, entry) {
    let pressTimer;
    const startPress = () => { pressTimer = setTimeout(() => this.openEditor(key), 500); };
    const endPress = () => clearTimeout(pressTimer);

    cell.addEventListener('touchstart', startPress, {passive:true});
    cell.addEventListener('touchend', endPress);
    cell.addEventListener('touchmove', endPress);
    cell.addEventListener('mousedown', startPress);
    cell.addEventListener('mouseup', endPress);

    cell.addEventListener('click', () => {
      if (entry?.locked) {
        if (entry.photo) {
          document.getElementById('viewerImg').src = entry.photo;
          document.getElementById('viewerCaption').textContent = entry.note || '';
          document.getElementById('photoViewer').classList.add('show');
        } else if (entry.note) {
          document.getElementById('viewerNote').textContent = entry.note;
          document.getElementById('noteViewer').classList.add('show');
        }
        return;
      }

      if (!selected[key]) {
        selected[key] = { owner: currentUser, note:'', photo:null, locked:false };
        if (!pawPositions[key]) pawPositions[key] = this.genPositions();
      } else if (selected[key].owner === 'rp' && !selected[key].photo && !selected[key].note) {
        selected[key].owner = 'vr';
        pawPositions[key] = this.genPositions();
      } else if (selected[key].owner === 'vr' && !selected[key].photo && !selected[key].note) {
        delete selected[key];
        delete pawPositions[key];
      } else {
        this.openEditor(key);
        return;
      }

      clearTimeout(lockTimers[key]);
      lockTimers[key] = setTimeout(() => {
        if (selected[key]) { selected[key].locked = true; this.save(); }
      }, 5000);
      this.save();
    });
  },

  // ─── Editor ───
  openEditor(key) {
    currentEditKey = key;
    const entry = selected[key] || { owner: currentUser, note:'', photo:null };

    const [y,m,d] = key.split('-');
    document.getElementById('editTitle').textContent =
      `${MONTHS_SHORT[parseInt(m)-1]} ${parseInt(d)}, ${y}`;

    this.setOwnerToggle(entry.owner);
    document.getElementById('noteInput').value = entry.note || '';
    document.getElementById('photoInput').value = '';
    document.getElementById('deleteBtn').style.display = selected[key] ? 'block' : 'none';

    document.getElementById('editOverlay').classList.add('show');
    setTimeout(() => document.getElementById('editModal').classList.add('show'), 10);
  },

  closeEditor() {
    document.getElementById('editModal').classList.remove('show');
    setTimeout(() => document.getElementById('editOverlay').classList.remove('show'), 350);
  },

  setOwnerToggle(owner) {
    document.getElementById('optRP').className = 'owner-opt' + (owner === 'rp' ? ' active-rp' : '');
    document.getElementById('optVR').className = 'owner-opt' + (owner === 'vr' ? ' active-vr' : '');
  },

  bindEditor() {
    document.getElementById('optRP').onclick = () => this.setOwnerToggle('rp');
    document.getElementById('optVR').onclick = () => this.setOwnerToggle('vr');

    document.getElementById('saveBtn').onclick = () => {
      const owner = document.getElementById('optRP').classList.contains('active-rp') ? 'rp' : 'vr';
      const note = document.getElementById('noteInput').value.trim();
      const file = document.getElementById('photoInput').files[0];

      const finalize = (photoData) => {
        selected[currentEditKey] = { owner, note, photo: photoData || null, locked: false };
        if (!pawPositions[currentEditKey]) pawPositions[currentEditKey] = this.genPositions();
        clearTimeout(lockTimers[currentEditKey]);
        lockTimers[currentEditKey] = setTimeout(() => {
          if (selected[currentEditKey]) { selected[currentEditKey].locked = true; this.save(); }
        }, 5000);
        this.save();
        this.closeEditor();
        toast('Saved');
      };

      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxW = 300;
            const scale = maxW / img.width;
            canvas.width = maxW;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            finalize(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      } else {
        finalize((selected[currentEditKey] || {}).photo || null);
      }
    };

    document.getElementById('deleteBtn').onclick = () => {
      if (currentEditKey && selected[currentEditKey]) {
        delete selected[currentEditKey];
        delete pawPositions[currentEditKey];
        this.save();
        this.closeEditor();
        toast('Deleted');
      }
    };

    document.getElementById('cancelBtn').onclick = () => this.closeEditor();
    document.getElementById('editOverlay').onclick = () => this.closeEditor();
  },

  // ─── Viewers ───
  bindViewers() {
    document.getElementById('closeViewer').onclick = () =>
      document.getElementById('photoViewer').classList.remove('show');
    document.getElementById('photoViewer').onclick = e => {
      if (e.target.id === 'photoViewer') document.getElementById('photoViewer').classList.remove('show');
    };
    document.getElementById('closeNoteViewer').onclick = () =>
      document.getElementById('noteViewer').classList.remove('show');
    document.getElementById('noteViewer').onclick = e => {
      if (e.target.id === 'noteViewer') document.getElementById('noteViewer').classList.remove('show');
    };
  },

  // ─── Nav ───
  bindNav() {
    document.getElementById('prevMonth').onclick = () => {
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      this.render();
    };
    document.getElementById('nextMonth').onclick = () => {
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      this.render();
    };
  },

  // ─── Actions ───
  bindActions() {
    document.getElementById('screenshotBtn').onclick = async () => {
      try {
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
        toast('Creating screenshot...');
        const canvas = await html2canvas(document.getElementById('captureArea'), {
          scale: 2, useCORS: true, backgroundColor: '#0f0f1a'
        });
        canvas.toBlob(blob => {
          const f = new File([blob], 'the_boyz.png', { type: 'image/png' });
          if (navigator.share && navigator.canShare?.({ files: [f] })) {
            navigator.share({ files: [f], title: 'The Boyz' });
          } else {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'the_boyz.png';
            a.click();
          }
        });
      } catch (err) { console.error(err); toast('Screenshot failed'); }
    };

    document.getElementById('yearBtn').onclick = () => this.showYearSummary();
    document.getElementById('yearClose').onclick = () => this.closeYearModal();
    document.getElementById('yearOverlay').onclick = () => this.closeYearModal();
    document.getElementById('yearExport').onclick = () => this.exportCSV();

    document.getElementById('logoutBtn').onclick = () => {
      sessionStorage.removeItem('boyz_user');
      location.reload();
    };
  },

  // ─── Year Summary ───
  showYearSummary() {
    const y = currentMonth.getFullYear();
    document.getElementById('yearTitle').textContent = `${y} Summary`;
    const chart = document.getElementById('yearChart');
    chart.innerHTML = '';

    let maxTotal = 1;
    const monthData = [];
    for (let m = 0; m < 12; m++) {
      let rp = 0, vr = 0;
      const prefix = `${y}-${String(m+1).padStart(2,'0')}`;
      for (const k in selected) {
        if (k.startsWith(prefix)) {
          if (selected[k].owner === 'rp') rp++;
          else if (selected[k].owner === 'vr') vr++;
        }
      }
      monthData.push({ rp, vr });
      if (rp + vr > maxTotal) maxTotal = rp + vr;
    }

    monthData.forEach((d, i) => {
      const row = document.createElement('div');
      row.className = 'year-row';
      const rpW = maxTotal > 0 ? (d.rp / maxTotal * 100) : 0;
      const vrW = maxTotal > 0 ? (d.vr / maxTotal * 100) : 0;
      row.innerHTML = `
        <div class="year-row-label">${MONTHS_SHORT[i]}</div>
        <div class="year-bars">
          <div class="year-bar-rp" style="width:${rpW}%"></div>
          <div class="year-bar-vr" style="width:${vrW}%"></div>
        </div>
        <div class="year-row-counts">${d.rp} / ${d.vr}</div>`;
      chart.appendChild(row);
    });

    document.getElementById('yearOverlay').classList.add('show');
    setTimeout(() => document.getElementById('yearModal').classList.add('show'), 10);
  },

  closeYearModal() {
    document.getElementById('yearModal').classList.remove('show');
    setTimeout(() => document.getElementById('yearOverlay').classList.remove('show'), 350);
  },

  exportCSV() {
    const totals = {};
    for (const k in selected) {
      const [y,m] = k.split('-');
      const ym = `${y}-${m}`;
      if (!totals[ym]) totals[ym] = { RP:0, VR:0 };
      if (selected[k].owner === 'rp') totals[ym].RP++;
      else if (selected[k].owner === 'vr') totals[ym].VR++;
    }
    let csv = 'Year,Month,RP,VR\n';
    Object.keys(totals).sort().forEach(ym => {
      const [yy,mm] = ym.split('-');
      csv += `${yy},${mm},${totals[ym].RP},${totals[ym].VR}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'boyz_summary.csv';
    a.click();
    toast('Exported');
  },

  // ─── Utilities ───
  async save() {
    const ok = await DB.save(selected, pawPositions);
    if (!ok) toast('Save failed');
  },

  genPositions() {
    const bases = [{top:22,left:28},{top:22,left:68},{top:62,left:28},{top:62,left:68}];
    return bases.map(b => ({
      top: Math.max(12, Math.min(78, b.top + (Math.random()*10-5))),
      left: Math.max(12, Math.min(78, b.left + (Math.random()*10-5))),
      rot: Math.floor(Math.random()*50-25)
    }));
  }
};

export default CAL;
