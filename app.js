'use strict';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MASK_DAYS = ['Tue','Fri'];

const SCHEDULE = {
  Sun:{melacare:true,mask:false},
  Mon:{melacare:true,mask:false},
  Tue:{melacare:false,mask:true},
  Wed:{melacare:true,mask:false},
  Thu:{melacare:true,mask:false},
  Fri:{melacare:false,mask:true},
  Sat:{melacare:true,mask:false}
};

const POST_MNRF_KEY = 'postMnrf';
const STATE_KEY = 'dermstate2';
const NOTIF_KEY = 'notifEnabled';
const INTERVAL_MS = 5 * 60 * 1000;

let state = {};
let notifEnabled = true;
let notifInterval = null;
let currentDay = DAYS[new Date().getDay()];
let isPostMnrf = false;

function getTasks(dayName, postMnrf) {
  const s = SCHEDULE[dayName];
  if (postMnrf) {
    return {
      'Morning — recovery': [
        {id:'rinse_proc', name:'Cold water rinse only', note:'No products. Skin is healing post-MNRF.', badge:'bproc', time:'AM'},
      ],
      'Night — recovery': [
        {id:'calamine_proc', name:'Calamine + Vit E lotion (04) only', note:'Gently press on full face. Nothing else tonight.', badge:'bproc', time:'PM'},
      ]
    };
  }
  const am = [
    {id:'rinse', name:'Rinse face with cold water', note:'No cleanser in morning. Cold water only.', badge:'bam', time:'AM'},
    {id:'clinda', name:'Clindamycin + Nicotinamide gel (01)', note:'Thin layer full face. Wait 60 sec to absorb.', badge:'bam', time:'AM'},
    {id:'moist_am', name:'Oxygluta moisturizer (08)', note:'Press into slightly damp skin for better absorption.', badge:'bam', time:'AM'},
    {id:'spf', name:'Lakme SPF 50 PA+++ (05)', note:'Generous amount. Always last AM step.', badge:'bam', time:'AM'},
  ];
  const mid = [
    {id:'spf_mid', name:'Reapply IPCA SPF 30 (03)', note:'After Dhuhr/Asr wudhu — light pat, don\'t rub.', badge:'bam', time:'Midday'},
  ];
  const pm_base = [
    {id:'wash_pm', name:'Oxygluta facewash (09)', note:'Gentle lather 60 sec, lukewarm water. Pat dry.', badge:'bpm', time:'PM'},
  ];
  const pm_mel = [
    {id:'vrh', name:'VRH gel (07) — scar + spots only', note:'Dab on 5mm scar and dark spots only. Wait 2 mins.', badge:'bpm', time:'PM'},
    {id:'melacare', name:'Melacare cream (02)', note:'Rice grain amount, thin layer. Avoid lips/eyes.', badge:'bpm', time:'PM'},
    {id:'moist_pm', name:'Oxygluta moisturizer (08) over Melacare', note:'Sandwich method — reduces irritation, locks hydration.', badge:'bpm', time:'PM'},
  ];
  const pm_mask = [
    {id:'mask', name:'Charcoal mask (06)', note:'Full face, 10–15 mins, rinse off.', badge:'bwk', time:'PM'},
    {id:'calamine', name:'Calamine + Vit E lotion (04)', note:'After mask. Soothes redness and tightness.', badge:'bwk', time:'PM'},
  ];
  return {
    'Morning': am,
    'Midday': mid,
    'Night': [...pm_base, ...(s.melacare ? pm_mel : pm_mask)]
  };
}

function key(day, id) { return day + '_' + id; }

function loadState() {
  try { state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); } catch(e) { state = {}; }
  notifEnabled = localStorage.getItem(NOTIF_KEY) !== 'false';
  isPostMnrf = localStorage.getItem(POST_MNRF_KEY) === 'true';
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
  localStorage.setItem(NOTIF_KEY, String(notifEnabled));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning — here\'s your morning routine';
  if (h < 17) return 'Good afternoon — check your midday steps';
  return 'Good evening — time for your night routine';
}

function getUndone(day) {
  const sections = getTasks(day, isPostMnrf);
  const undone = [];
  Object.values(sections).flat().forEach(t => {
    if (!state[key(day, t.id)]) undone.push(t.name);
  });
  return undone;
}

function getProgress(day) {
  const sections = getTasks(day, isPostMnrf);
  const all = Object.values(sections).flat();
  const done = all.filter(t => state[key(day, t.id)]).length;
  return { done, total: all.length };
}

async function requestNotifPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const p = await Notification.requestPermission();
  return p === 'granted';
}

async function sendNotif(title, body, tag) {
  if (!notifEnabled) return;
  if (Notification.permission !== 'granted') return;
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready;
    reg.active && reg.active.postMessage({ type: 'NOTIFY', title, body, tag });
  }
}

function startNotifLoop() {
  if (notifInterval) clearInterval(notifInterval);
  if (!notifEnabled) return;
  notifInterval = setInterval(async () => {
    const today = DAYS[new Date().getDay()];
    const undone = getUndone(today);
    if (undone.length === 0) return;
    const first = undone[0];
    await sendNotif(
      '⏰ Skin routine pending',
      `${undone.length} step${undone.length > 1 ? 's' : ''} left — Next: ${first}`,
      'derm-reminder'
    );
  }, INTERVAL_MS);
}

function stopNotifLoop() {
  if (notifInterval) clearInterval(notifInterval);
  notifInterval = null;
}

function checkmark() {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderApp(day) {
  currentDay = day;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

  document.getElementById('greeting').textContent = greeting();
  document.getElementById('datebadge').textContent = dateStr;

  // Day chips
  const chipEl = document.getElementById('daychips');
  chipEl.innerHTML = '';
  DAYS.forEach(d => {
    const c = document.createElement('div');
    c.className = 'dchip' + (d === day ? ' active' : '');
    c.textContent = d;
    c.onclick = () => renderApp(d);
    chipEl.appendChild(c);
  });

  // Progress
  const { done, total } = getProgress(day);
  const pct = total > 0 ? Math.round(done / total * 100) : 0;
  document.getElementById('progfill').style.width = pct + '%';
  document.getElementById('progpct').textContent = pct + '%';
  document.getElementById('progtxt').textContent = `${done} of ${total} steps completed`;

  // Notif permission bar
  const nb = document.getElementById('notifbar');
  if (Notification.permission === 'denied') {
    nb.innerHTML = `<div class="notif-icon">🔕</div><div class="notif-text"><strong>Notifications blocked</strong>Enable in Android settings → App info → Notifications</div>`;
    nb.style.display = 'flex';
  } else if (Notification.permission !== 'granted') {
    nb.innerHTML = `<div class="notif-icon">🔔</div><div class="notif-text"><strong>Enable notifications</strong>Tap to allow — you'll get reminders every 5 mins until done</div>`;
    nb.style.display = 'flex';
    nb.onclick = async () => {
      const ok = await requestNotifPermission();
      if (ok) { startNotifLoop(); renderApp(day); }
    };
  } else {
    nb.style.display = 'none';
  }

  // Notif toggle
  document.getElementById('toggle').className = 'toggle' + (notifEnabled ? ' on' : '');

  // Task sections
  const tl = document.getElementById('tasklist');
  tl.innerHTML = '';
  const sections = getTasks(day, isPostMnrf);
  Object.entries(sections).forEach(([sec, tasks]) => {
    const lbl = document.createElement('div');
    lbl.className = 'sec-label';
    lbl.textContent = sec;
    tl.appendChild(lbl);
    tasks.forEach(t => {
      const isDone = !!state[key(day, t.id)];
      const el = document.createElement('div');
      el.className = 'task' + (isDone ? ' done' : '');
      el.innerHTML = `
        <div class="chk${isDone ? ' on' : ''}">${isDone ? checkmark() : ''}</div>
        <div class="task-inner">
          <div class="tbadge ${t.badge}">${t.time}</div>
          <div class="task-name">${t.name}</div>
          <div class="task-note">${t.note}</div>
        </div>`;
      el.onclick = () => {
        state[key(day, t.id)] = !state[key(day, t.id)];
        saveState();
        renderApp(day);
        checkAllDone(day);
      };
      tl.appendChild(el);
    });
  });

  // Wudhu
  const wt = document.getElementById('wudhutasks');
  wt.innerHTML = '';
  let wdone = 0;
  for (let i = 1; i <= 5; i++) {
    const k = key(day, 'wudhu' + i);
    const done = !!state[k];
    if (done) wdone++;
    const el = document.createElement('div');
    el.className = 'wtask' + (done ? ' done' : '');
    el.innerHTML = `<div class="wchk${done ? ' on' : ''}">${done ? checkmark() : ''}</div><div class="wtask-name">Wudhu ${i} — pat dry + 1 drop Oxygluta moist</div>`;
    el.onclick = () => {
      state[k] = !state[k];
      saveState();
      renderApp(day);
    };
    wt.appendChild(el);
  }
  document.getElementById('wcount').textContent = wdone + ' of 5 wudhu moisturised today';

  // Done banner
  const db = document.getElementById('donecard');
  db.style.display = (pct === 100 && total > 0) ? 'block' : 'none';
}

function checkAllDone(day) {
  const { done, total } = getProgress(day);
  if (done === total && total > 0) {
    sendNotif('Routine complete!', 'All skin steps done for this session. Great job.', 'derm-done');
  }
}

window.resetDay = function() {
  const day = currentDay;
  Object.keys(state).filter(k => k.startsWith(day + '_')).forEach(k => delete state[k]);
  saveState();
  renderApp(day);
};

window.toggleNotif = function() {
  notifEnabled = !notifEnabled;
  saveState();
  if (notifEnabled) startNotifLoop();
  else stopNotifLoop();
  document.getElementById('toggle').className = 'toggle' + (notifEnabled ? ' on' : '');
};

async function init() {
  loadState();

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch(e) { console.log('SW reg failed', e); }
  }

  if (Notification.permission === 'granted' && notifEnabled) {
    startNotifLoop();
  }

  renderApp(currentDay);

  // Fire one immediate reminder if undone tasks exist
  setTimeout(async () => {
    if (Notification.permission === 'granted' && notifEnabled) {
      const undone = getUndone(currentDay);
      if (undone.length > 0) {
        await sendNotif('Derm Secretary', `You have ${undone.length} skin routine steps pending`, 'derm-init');
      }
    }
  }, 3000);
}

init();
