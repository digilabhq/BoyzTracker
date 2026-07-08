/*
 *  Calendar Module — Rendering, interactions, entries, report
 */
import APP_CONFIG from './config.js';
import DB from './db.js';
import { toast } from './ui.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

    // Set rotating background (shuffle once per visit + rotate every 4s while app is active)
    // Use the shuffled order created on auth screen for this visit, or create one if missing.
    let heroOrder = null;
    const stored = sessionStorage.getItem('boyz_hero_shuffle');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        heroOrder = Array.isArray(parsed.heroes) ? parsed.heroes : null;
      } catch (_) { heroOrder = null; }
    }
    if (!heroOrder || !heroOrder.length) {
      heroOrder = shuffleArray(APP_CONFIG.heroImages);
      sessionStorage.setItem('boyz_hero_shuffle', JSON.stringify({ visitId: Date.now(), heroes: heroOrder }));
    }

    // One framed masthead photo per visit — still, not a slideshow.
    this._heroOrder = heroOrder;
    document.getElementById('mastheadPhoto').style.backgroundImage =
      `url('${heroOrder[0]}')`;

    // Start listening
    DB.listen((sel, paw, status) => {
      if (sel !== null) {
        selected = sel;
        pawPositions = paw;
      }
      document.getElementById('syncDot').style.background =
        status === 'synced' ? '#4CAF50' : status === 'ready' ? '#D4A853' : '#ef4444';
      document.getElementById('syncLabel').textContent =
        status === 'synced' ? 'synced' : status === 'ready' ? 'ready' : 'offline';
      this.render();
    });

    this.render();
    this.bindNav();
    this.bindEditor();
    this.bindViewers();
    this.bindGallery();
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
      `${MONTHS[m]} <span class="year-text">${y}</span>`;

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
        if (entry.owner === 'rp') rpC++;
        else if (entry.owner === 'vr') vrC++;

        // Scattered paw prints
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

        // Entry indicator (gold dot)
        const entries = entry.entries || [];
        if (entries.length > 0 || entry.note) {
          const dot = document.createElement('div');
          dot.className = 'entry-dot';
          cell.appendChild(dot);
        }

        // Photo thumbnail (varies per visit if multiple photos exist)
        const photos = entry.photos || (entry.photo ? [entry.photo] : []);
        if (photos.length) {
          const thumb = document.createElement('img');
          thumb.className = 'day-thumb';
          thumb.dataset.key = key;

          // Rotate on refresh by offsetting with visitId (from hero shuffle) + day number
          let visitSalt = 0;
          try {
            const stored = sessionStorage.getItem('boyz_hero_shuffle');
            if (stored) visitSalt = (JSON.parse(stored).visitId || 0) % 997;
          } catch (_) {}
          const startIdx = photos.length > 1 ? ((visitSalt + d) % photos.length) : 0;

          thumb.dataset.idx = String(startIdx);
          thumb.src = photos[startIdx];
          cell.appendChild(thumb);
        }
      }

      const num = document.createElement('div');
      num.className = 'day-num';
      num.textContent = d;
      cell.appendChild(num);

      this.bindDay(cell, key);
      grid.appendChild(cell);
    }

    document.getElementById('rpCount').textContent = rpC;
    document.getElementById('vrCount').textContent = vrC;
  },

  bindDay(cell, key) {
    let pressTimer;
    let longPressFired = false;
    const startPress = () => {
      longPressFired = false;
      pressTimer = setTimeout(() => { longPressFired = true; this.openEditor(key); }, 500);
    };
    const endPress = () => clearTimeout(pressTimer);

    cell.addEventListener('touchstart', startPress, {passive:true});
    cell.addEventListener('touchend', endPress);
    cell.addEventListener('touchmove', endPress);
    cell.addEventListener('mousedown', startPress);
    cell.addEventListener('mouseup', endPress);
    cell.addEventListener('mouseleave', endPress);

    cell.addEventListener('click', () => {
      // Long-press already opened the editor — swallow the trailing click.
      if (longPressFired) { longPressFired = false; return; }

      const entry = selected[key]; // always read live state

      if (entry?.locked) {
        const photos = entry.photos || (entry.photo ? [entry.photo] : []);
        if (photos.length) {
          // Show whichever photo the day thumbnail is currently displaying.
          const thumb = document.querySelector(`img.day-thumb[data-key="${key}"]`);
          document.getElementById('viewerImg').src = thumb?.src || photos[0];
          document.getElementById('viewerCaption').textContent =
            (entry.entries || []).join(' · ') || entry.note || '';
          document.getElementById('photoViewer').classList.add('show');
        } else if ((entry.entries && entry.entries.length) || entry.note) {
          document.getElementById('viewerNote').textContent =
            (entry.entries || []).join('\n') || entry.note;
          document.getElementById('noteViewer').classList.add('show');
        }
        return;
      }

      if (!entry) {
        selected[key] = { owner: currentUser, entries:[], photo:null, locked:false };
        if (!pawPositions[key]) pawPositions[key] = this.genPositions();
      } else if (!(entry.entries?.length) && !entry.photo && !entry.note) {
        // Toggle owner rp ↔ vr — deletion happens only via the editor.
        entry.owner = entry.owner === 'rp' ? 'vr' : 'rp';
        pawPositions[key] = this.genPositions();
      } else {
        this.openEditor(key);
        return;
      }

      clearTimeout(lockTimers[key]);
      lockTimers[key] = setTimeout(() => {
        if (selected[key]) { selected[key].locked = true; this.saveDay(key); }
      }, 5000);
      this.render(); // optimistic — don't wait for the snapshot echo
      this.saveDay(key);
    });
  },

  // ─── Editor ───
  openEditor(key) {
    currentEditKey = key;
    const entry = selected[key] || { owner: currentUser, entries:[], photo:null };

    const [y,m,d] = key.split('-');
    document.getElementById('editTitle').textContent =
      `${MONTHS_SHORT[parseInt(m)-1]} ${parseInt(d)}, ${y}`;

    this.setOwnerToggle(entry.owner);

    // Populate entries
    const list = document.getElementById('entriesList');
    list.innerHTML = '';
    const entries = [...(entry.entries || [])]; // copy — never mutate live data
    // Migrate old note field if exists
    if (!entries.length && entry.note) entries.push(entry.note);
    entries.forEach((e, i) => this.addEntryRow(list, e, i));

    // Reset photo
    document.getElementById('photoInput').value = '';
    document.getElementById('previewImg').style.display = 'none';
    document.getElementById('photoUploadContent').style.display = 'flex';
    if (entry.photo) {
      document.getElementById('previewImg').src = entry.photo;
      document.getElementById('previewImg').style.display = 'block';
      document.getElementById('photoUploadContent').style.display = 'none';
    }

    document.getElementById('deleteBtn').style.display = selected[key] ? 'inline' : 'none';

    document.getElementById('editOverlay').classList.add('show');
    setTimeout(() => document.getElementById('editModal').classList.add('show'), 10);
  },

  addEntryRow(list, text, idx) {
    const row = document.createElement('div');
    row.className = 'entry-row';
    row.innerHTML = `
      <input type="text" class="entry-input" placeholder="What happened today?">
      <span class="entry-remove">✕</span>
    `;
    row.querySelector('.entry-input').value = text || ''; // property, not attribute — quotes are safe
    row.querySelector('.entry-remove').onclick = () => row.remove();
    list.appendChild(row);
    if (!text) row.querySelector('.entry-input').focus();
  },

  closeEditor() {
    document.getElementById('editModal').classList.remove('show');
    setTimeout(() => document.getElementById('editOverlay').classList.remove('show'), 350);
  },

  setOwnerToggle(owner) {
    document.getElementById('optRP').className = 'owner-pill' + (owner === 'rp' ? ' active-rp' : '');
    document.getElementById('optVR').className = 'owner-pill' + (owner === 'vr' ? ' active-vr' : '');
  },

  bindEditor() {
    document.getElementById('optRP').onclick = () => this.setOwnerToggle('rp');
    document.getElementById('optVR').onclick = () => this.setOwnerToggle('vr');

    document.getElementById('addEntryBtn').onclick = () => {
      const list = document.getElementById('entriesList');
      this.addEntryRow(list, '', list.children.length);
    };

    // Photo preview
    document.getElementById('photoInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          document.getElementById('previewImg').src = reader.result;
          document.getElementById('previewImg').style.display = 'block';
          document.getElementById('photoUploadContent').style.display = 'none';
        };
        reader.readAsDataURL(file);
      }
    });

    document.getElementById('saveBtn').onclick = () => {
      const owner = document.getElementById('optRP').classList.contains('active-rp') ? 'rp' : 'vr';
      const inputs = document.querySelectorAll('#entriesList .entry-input');
      const entries = [];
      inputs.forEach(inp => { if (inp.value.trim()) entries.push(inp.value.trim()); });
      const file = document.getElementById('photoInput').files[0];

      const finalize = (photoData) => {
        const prev = selected[currentEditKey] || {};
        const prevPhotos = prev.photos || (prev.photo ? [prev.photo] : []);
        let nextPhotos = prevPhotos.slice();

        if (photoData) {
          if (!nextPhotos.includes(photoData)) nextPhotos.push(photoData);
        }

        selected[currentEditKey] = {
          owner,
          entries,
          photo: photoData || prev.photo || null,
          photos: nextPhotos.length ? nextPhotos : undefined,
          locked: false
        };
        if (!pawPositions[currentEditKey]) pawPositions[currentEditKey] = this.genPositions();
        clearTimeout(lockTimers[currentEditKey]);
        const savedKey = currentEditKey;
        lockTimers[savedKey] = setTimeout(() => {
          if (selected[savedKey]) { selected[savedKey].locked = true; this.saveDay(savedKey); }
        }, 5000);
        this.render();
        this.saveDay(savedKey);
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
        clearTimeout(lockTimers[currentEditKey]);
        delete selected[currentEditKey];
        delete pawPositions[currentEditKey];
        this.render();
        this.removeDay(currentEditKey);
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

  // ─── Hero Gallery (tap masthead) ───
  bindGallery() {
    const viewer = document.getElementById('galleryViewer');
    const track = document.getElementById('galleryTrack');
    const count = document.getElementById('galleryCount');

    document.getElementById('masthead').addEventListener('click', () => {
      const heroes = this._heroOrder || APP_CONFIG.heroImages;
      track.innerHTML = '';
      heroes.forEach(src => {
        const slide = document.createElement('div');
        slide.className = 'gallery-slide';
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.src = src;
        slide.appendChild(img);
        track.appendChild(slide);
      });
      count.textContent = `1 / ${heroes.length}`;
      track.scrollLeft = 0;
      viewer.classList.add('show');
    });

    track.addEventListener('scroll', () => {
      const total = track.children.length;
      if (!total) return;
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      count.textContent = `${Math.min(idx + 1, total)} / ${total}`;
    }, { passive: true });

    document.getElementById('closeGallery').onclick = () =>
      viewer.classList.remove('show');
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
    document.getElementById('shareBtn').onclick = async () => {
      try {
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
        toast('Creating screenshot...');
        const canvas = await html2canvas(document.getElementById('app'), {
          scale: 2, useCORS: true, backgroundColor: '#0C0C0C'
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

    document.getElementById('reportBtn').onclick = () => this.showReport();
    document.getElementById('reportClose').onclick = () => this.closeReport();
    document.getElementById('reportOverlay').onclick = () => this.closeReport();
    document.getElementById('reportExport').onclick = () => this.exportReport();
    document.getElementById('reportShare').onclick = () => this.shareReport();

    document.getElementById('yearBtn').onclick = () => this.showYearSummary();
    document.getElementById('yearClose').onclick = () => this.closeYearModal();
    document.getElementById('yearOverlay').onclick = () => this.closeYearModal();
    document.getElementById('yearExport').onclick = () => this.exportCSV();

    document.getElementById('lockBtn').onclick = () => {
      sessionStorage.removeItem('boyz_user');
      location.reload();
    };
  },

  // ─── Monthly Report ───
  showReport() {
    const y = currentMonth.getFullYear(), m = currentMonth.getMonth();
    document.getElementById('reportTitle').textContent =
      `${MONTHS[m]} ${y}`;

    let rpC = 0, vrC = 0, entryCount = 0;
    const timeline = document.getElementById('reportTimeline');
    timeline.innerHTML = '';

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const entry = selected[key];
      if (!entry) continue;

      if (entry.owner === 'rp') rpC++;
      else if (entry.owner === 'vr') vrC++;

      const entries = [...(entry.entries || [])]; // copy — never mutate live data
      // Also check legacy note field
      if (entry.note && !entries.length) entries.push(entry.note);
      if (!entries.length) continue;

      entryCount += entries.length;

      const row = document.createElement('div');
      row.className = 'report-row';
      row.innerHTML = `
        <div class="report-date">
          <div class="report-day ${entry.owner}">${d}</div>
          <div class="report-month">${MONTHS_SHORT[m]}</div>
        </div>
        <div class="report-line"></div>
        <div class="report-entries">
          ${entries.map(e => `<div class="report-entry">${esc(e)}</div>`).join('')}
        </div>
      `;
      timeline.appendChild(row);
    }

    document.getElementById('reportRpCount').textContent = `${rpC} days`;
    document.getElementById('reportVrCount').textContent = `${vrC} days`;
    document.getElementById('reportEntryCount').textContent = `${entryCount} entries`;

    document.getElementById('reportOverlay').classList.add('show');
    setTimeout(() => document.getElementById('reportModal').classList.add('show'), 10);
  },

  closeReport() {
    document.getElementById('reportModal').classList.remove('show');
    setTimeout(() => document.getElementById('reportOverlay').classList.remove('show'), 350);
  },

  exportReport() {
    const y = currentMonth.getFullYear(), m = currentMonth.getMonth();
    let csv = 'Date,Owner,Entry\n';
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const entry = selected[key];
      if (!entry) continue;
      const entries = [...(entry.entries || [])];
      if (entry.note && !entries.length) entries.push(entry.note);
      entries.forEach(e => {
        csv += `"${MONTHS_SHORT[m]} ${d} ${y}","${entry.owner.toUpperCase()}","${String(e).replace(/"/g, '""')}"\n`;
      });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `boyz_report_${MONTHS_SHORT[m].toLowerCase()}_${y}.csv`;
    a.click();
    toast('Exported');
  },

  async shareReport() {
    try {
      const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
      toast('Creating report...');
      const canvas = await html2canvas(document.getElementById('reportModal'), {
        scale: 2, useCORS: true, backgroundColor: '#141416'
      });
      canvas.toBlob(blob => {
        const f = new File([blob], 'boyz_report.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [f] })) {
          navigator.share({ files: [f], title: 'The Boyz Report' });
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'boyz_report.png';
          a.click();
        }
      });
    } catch (err) { console.error(err); toast('Share failed'); }
  },

  // ─── Year Summary ───
  showYearSummary() {
    const y = currentMonth.getFullYear();
    document.getElementById('yearTitle').textContent = `${y} Summary`;
    const chart = document.getElementById('yearChart');
    chart.innerHTML = '';

    let maxTotal = 1;
    const monthData = [];
    for (let mo = 0; mo < 12; mo++) {
      let rp = 0, vr = 0;
      const prefix = `${y}-${String(mo+1).padStart(2,'0')}`;
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
      const rpW = maxTotal > 0 ? (d.rp / maxTotal * 100) : 0;
      const vrW = maxTotal > 0 ? (d.vr / maxTotal * 100) : 0;
      const row = document.createElement('div');
      row.className = 'year-row';
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
  async saveDay(key) {
    if (!selected[key]) return;
    const ok = await DB.saveDay(key, selected[key], pawPositions[key] || null);
    if (!ok) toast('Save failed');
  },

  async removeDay(key) {
    const ok = await DB.deleteDay(key);
    if (!ok) toast('Delete failed');
  },

  genPositions() {
    const bases = [{top:20,left:25},{top:20,left:65},{top:58,left:25},{top:58,left:65}];
    return bases.map(b => ({
      top: Math.max(10, Math.min(75, b.top + (Math.random()*12-6))),
      left: Math.max(10, Math.min(75, b.left + (Math.random()*12-6))),
      rot: Math.floor(Math.random()*50-25)
    }));
  }
};

export default CAL;
