/* Field Key: Modern Vehicle Type Classification Front-End */
const T = window.TREE;
const CS = window.CLASS_STATS || {};
const $ = id => document.getElementById(id);
const el = (t, c, x) => {
  const e = document.createElement(t);
  if (c) e.className = c;
  if (x !== undefined) e.textContent = x;
  return e;
};
const root = document.documentElement;
root.classList.add('js', 'lock');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

const V_ICONS = {
  "Bike": "🏍️",
  "Scooter": "🛵",
  "Auto-Rickshaw": "🛺",
  "Car": "🚗",
  "SUV": "🚙",
  "Pickup": "🛻",
  "Van": "🚐",
  "Tractor": "🚜",
  "Truck": "🚚",
  "Bus": "🚌"
};

/* ============================================================
   ADAPTIVE GRID & CLOCK
   ============================================================ */
function grid() {
  const w = innerWidth, s = 16 - (16 * (((1920 - w) / 1920) * 100 * .6666)) / 100;
  if (s > 16) root.style.fontSize = s + 'px'; else root.style.removeProperty('font-size');
}
grid();
addEventListener('resize', grid);

function clk() {
  const d = new Date(), h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
  const t = (h % 12 || 12) + ':' + m + (h >= 12 ? 'pm' : 'am');
  if ($('c1')) $('c1').textContent = t;
  if ($('c3')) $('c3').textContent = t;
  if ($('c2')) $('c2').textContent = d.getDate() + ' ' + d.toLocaleString('en-GB', { month: 'short' }) + ', ' + d.getFullYear();
}
clk();
setInterval(clk, 1000);

/* ============================================================
   CONTENT ARRAYS
   ============================================================ */
const SC = [
  ["4–6", "A simple project", "Bike, car, bus, truck, and a couple more if you need them."],
  ["13", "US Federal Highway Administration", "Based largely on axle count and configuration."],
  ["+4", "Indian systems", "Auto-rickshaws, e-rickshaws, tractors and light commercial vehicles."]
];
const UA = [
  ["Tolling", "Charging automatically by vehicle class."],
  ["Traffic management", "Counting and flow analysis by type, signal timing, congestion planning."],
  ["Parking", "Allocating bays and pricing by vehicle dimension."],
  ["Enforcement", "Truck restrictions on certain roads or hours, overload checks."],
  ["Security", "Flagging restricted vehicle types in sensitive zones."],
  ["Planning and emissions", "Estimating road wear and pollution by vehicle mix."]
];
const CH = [
  ["Similar classes", "Car vs SUV, and truck vs pickup, are hard to separate."],
  ["Environment", "Night, rain, fog, glare and shadows degrade image quality."],
  ["Occlusion", "Vehicles hiding each other in dense traffic."],
  ["Viewpoint and scale", "Camera angle and distance change how a vehicle looks."],
  ["Regional variety", "Auto-rickshaws, modified vehicles and mixed traffic are poorly covered by Western datasets."],
  ["Class imbalance", "Cars are far more common than buses, so models neglect rare classes."],
  ["Real-time limits", "Edge devices need fast, small models."]
];
const DS = [
  ["MIO-TCD", "Large traffic camera dataset with several vehicle classes."],
  ["BIT-Vehicle", "Images labeled as bus, microbus, minivan, sedan, SUV and truck."],
  ["UA-DETRAC", "Traffic video with vehicle annotations."],
  ["COCO", "General-purpose, includes car, bus, truck and motorcycle."],
  ["India Driving Dataset (IDD)", "Indian road scenes, including auto-rickshaws."],
  ["Stanford Cars / CompCars", "Fine-grained make and model recognition."]
];

const lst = (id, a) => {
  const target = $(id);
  if (target) target.innerHTML = a.map((r, i) => `<li class="rv" style="--d:${i*50}ms;--y:16px"><b>${r[0]}</b><span>${r[1]}</span></li>`).join('');
};
lst('apps', UA);
lst('chal', CH);
lst('data', DS);

if ($('schemes')) {
  $('schemes').innerHTML = SC.map((r, i) => `<li class="rv" style="--d:${i*80}ms;--y:24px"><div class="row"><span style="width:auto;min-width:3.5rem;font-size:1.25rem;color:var(--acc);font-weight:700">${r[0]}</span><h3>${r[1]}</h3><p>${r[2]}</p></div></li>`).join('');
}

/* ============================================================
   MENU & NAVIGATION
   ============================================================ */
const NV = [
  ["AI Dashboard", "#home"],
  ["Classification", "#classifier"],
  ["Video analysis", "#video-section"],
  ["Analytics & insights", "#analytics-section"],
  ["Detection history", "#history-section"],
  ["Model performance", "#metrics"],
  ["Batch CSV", "#batch-section"],
  ["Feature sensitivity", "#sensitivity-section"],
];
if ($('mnav')) {
  $('mnav').innerHTML = '<ul>' + NV.map((n, i) => `<li><a class="mi" style="--i:${i}" href="${n[1]}" data-m><small>0${i+1}</small><span>${n[0]}</span></a></li>`).join('') + '</ul>';
}
const menu = $('menu');
let lastF;
let menuBackgroundState = [];
const navToggle = $('navToggle');
const sidebar = $('sidebar');
if (navToggle) {
  const navToggleLabel = navToggle.querySelector('span');
  navToggle.addEventListener('click', () => {
    const hidden = root.classList.toggle('nav-hidden');
    const label = hidden ? 'Show navigation' : 'Hide navigation';
    navToggle.setAttribute('aria-expanded', String(!hidden));
    navToggle.setAttribute('aria-label', label);
    if (navToggleLabel) navToggleLabel.textContent = label;
    if (sidebar) {
      sidebar.setAttribute('aria-hidden', String(hidden));
      sidebar.inert = hidden;
    }
  });
}

function menuFocusableElements() {
  return [...menu.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(element => element.getClientRects().length > 0);
}
function setMenuBackgroundInert(inert) {
  if (inert) {
    menuBackgroundState = [...document.body.children]
      .filter(element => element !== menu)
      .map(element => [element, element.inert]);
    menuBackgroundState.forEach(([element]) => { element.inert = true; });
  } else {
    menuBackgroundState.forEach(([element, wasInert]) => { element.inert = wasInert; });
    menuBackgroundState = [];
  }
}
function mOpen() {
  if (!menu || menu.classList.contains('open')) return;
  lastF = document.activeElement;
  menu.classList.add('open');
  root.classList.add('lock');
  $('mo').setAttribute('aria-expanded', 'true');
  setMenuBackgroundInert(true);
  setTimeout(() => {
    if (menu.classList.contains('open')) $('mc').focus();
  }, 50);
}
function mClose() {
  if (!menu || !menu.classList.contains('open')) return;
  menu.classList.remove('open');
  root.classList.remove('lock');
  setMenuBackgroundInert(false);
  $('mo').setAttribute('aria-expanded', 'false');
  const restoreFocus = lastF;
  lastF = null;
  if (restoreFocus && restoreFocus.isConnected) {
    setTimeout(() => {
      if (restoreFocus.isConnected && !restoreFocus.closest('[inert]')) restoreFocus.focus();
    }, 0);
  }
}
if ($('mo')) $('mo').onclick = mOpen;
if ($('mc')) $('mc').onclick = mClose;
addEventListener('keydown', event => {
  if (!menu || !menu.classList.contains('open')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    mClose();
    return;
  }
  if (event.key !== 'Tab') return;

  const focusable = menuFocusableElements();
  if (!focusable.length) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!menu.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
if (menu) {
  menu.querySelectorAll('[data-m]').forEach(a => a.addEventListener('click', () => {
    mClose();
  }));
}

function revealDetailsForHash() {
  if (!location.hash) return;
  const target = $(location.hash.slice(1));
  if (!target) return;
  const details = target.closest('details');
  if (details && !details.open) {
    details.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }
}
addEventListener('hashchange', revealDetailsForHash);
revealDetailsForHash();

const SERVICE_LABELS = {
  checking: { system: 'CHECKING INFERENCE API', side: 'CHECKING', model: 'MODEL CHECKING' },
  online: { system: 'INFERENCE API ONLINE', side: 'ONLINE', model: 'MODEL READY' },
  unavailable: { system: 'INFERENCE API UNAVAILABLE', side: 'OFFLINE', model: 'MODEL UNAVAILABLE' }
};
let currentServiceState = 'checking';
function renderServiceStatus(state) {
  if (state === currentServiceState) return;
  currentServiceState = state;
  document.querySelectorAll('[data-service-state]').forEach(status => {
    status.dataset.serviceState = state;
  });
  document.querySelectorAll('[data-service-label]').forEach(label => {
    label.textContent = SERVICE_LABELS[state][label.dataset.serviceLabel];
  });
}
let serviceCheckRunning = false;
async function checkServiceStatus() {
  if (serviceCheckRunning) return;
  serviceCheckRunning = true;
  try {
    if (currentServiceState !== 'online') renderServiceStatus('checking');
    const response = await fetch('/health', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Health check failed (${response.status}).`);
    const status = await response.json();
    if (status.status !== 'ok' || status.model_ready !== true) {
      throw new Error('Inference model is not ready.');
    }
    renderServiceStatus('online');
  } catch (error) {
    console.error('Inference service health check failed.', error);
    renderServiceStatus('unavailable');
  } finally {
    serviceCheckRunning = false;
  }
}
checkServiceStatus();
setInterval(checkServiceStatus, 30000);

/* ============================================================
   CLASSIFIER: Labels, Presets, Form
   ============================================================ */
const L = {
  wheels: ["Wheels", ""],
  length_m: ["Length", " m"],
  width_m: ["Width", " m"],
  height_m: ["Height", " m"],
  weight_kg: ["Weight", " kg"],
  engine_cc: ["Engine", " cc"],
  seating_capacity: ["Seats", ""],
  max_speed_kmh: ["Top speed", " km/h"]
};
const S = {
  // 10 Generic classes
  bike: [2, 2.1, 0.8, 1.15, 190, 350, 2, 145],
  scooter: [2, 1.8, 0.7, 1.15, 110, 125, 2, 85],
  rick: [3, 2.8, 1.3, 1.75, 360, 200, 3, 55],
  car: [4, 4.3, 1.75, 1.48, 1200, 1500, 5, 180],
  suv: [4, 4.7, 1.9, 1.8, 1900, 2400, 7, 190],
  pickup: [4, 5.4, 1.9, 1.85, 2200, 2800, 4, 150],
  van: [4, 5.2, 1.95, 2.3, 2600, 2500, 10, 135],
  tractor: [4, 3.6, 2.0, 2.5, 3400, 3000, 1, 35],
  truck: [8, 9.5, 2.5, 3.4, 11000, 6000, 2, 90],
  bus: [6, 11.5, 2.5, 3.3, 12000, 6500, 48, 95],
  // Real vehicle presets
  corolla: [4, 4.63, 1.78, 1.44, 1300, 1800, 5, 180],
  civic: [4, 4.55, 1.8, 1.42, 1350, 1500, 5, 195],
  fortuner: [4, 4.8, 1.86, 1.84, 2100, 2800, 7, 175],
  creta: [4, 4.3, 1.79, 1.63, 1350, 1500, 5, 170],
  hilux: [4, 5.32, 1.85, 1.81, 2150, 2755, 5, 165],
  sprinter: [4, 5.9, 2.02, 2.45, 2800, 2987, 12, 145],
  splendor: [2, 2.0, 0.72, 1.08, 112, 100, 2, 90],
  activa: [2, 1.84, 0.71, 1.16, 107, 110, 2, 85],
  deere: [4, 3.7, 2.1, 2.6, 3800, 3200, 1, 32],
  eicher: [6, 7.5, 2.35, 3.0, 7500, 5000, 2, 85],
  volvo: [6, 12.0, 2.5, 3.4, 12000, 7000, 50, 100]
};

const fields = $('fields');
const PLACEHOLDERS = {
  wheels: 'e.g. 4',
  length_m: 'e.g. 4.3',
  width_m: 'e.g. 1.75',
  height_m: 'e.g. 1.50',
  weight_kg: 'e.g. 1200',
  engine_cc: 'e.g. 1500',
  seating_capacity: 'e.g. 5',
  max_speed_kmh: 'e.g. 180',
};
const TRAINING_RANGES = Object.fromEntries(T.f.map(f => {
  const classRanges = Object.values(CS).map(stats => stats[f]).filter(Boolean);
  if (!classRanges.length) return [f, null];
  return [f, {
    min: Math.min(...classRanges.map(range => range.min)),
    max: Math.max(...classRanges.map(range => range.max))
  }];
}));
const formatRangeValue = value => String(Number(value.toFixed(2)));
function updateRangeHint(input) {
  const hint = input.parentElement.querySelector('.field-range');
  if (!hint) return;
  const range = TRAINING_RANGES[input.name];
  if (!range) {
    hint.textContent = 'Training range unavailable.';
    input.classList.remove('out-of-range');
    hint.classList.remove('range-warning');
    return;
  }
  const rangeText = `${formatRangeValue(range.min)}–${formatRangeValue(range.max)}${L[input.name][1]}`;
  const value = input.value.trim() ? Number(input.value) : NaN;
  const outside = Number.isFinite(value) && (value < range.min || value > range.max);
  input.classList.toggle('out-of-range', outside);
  hint.classList.toggle('range-warning', outside);
  hint.textContent = outside
    ? `Outside training range (${rangeText})`
    : `Training-data range: ${rangeText}`;
}

if (fields && T && T.f) {
  T.f.forEach(f => {
    const l = el('label');
    const inputId = 'field_' + f;
    l.htmlFor = inputId;
    const labelText = L[f][0] + (L[f][1] ? ' (' + L[f][1].trim() + ')' : '');
    l.append(labelText);
    const i = el('input');
    i.id = inputId;
    i.type = 'number';
    i.min = 0;
    i.step = 'any';
    i.name = f;
    i.inputMode = 'decimal';
    i.autocomplete = 'off';
    i.placeholder = PLACEHOLDERS[f] || '0.0';
    i.setAttribute('aria-label', labelText);
    l.append(i);
    l.append(el('small', 'field-range'));
    fields.append(l);
  });
}
const inputs = fields ? [...fields.querySelectorAll('input')] : [];
inputs.forEach(input => {
  updateRangeHint(input);
  input.addEventListener('input', () => updateRangeHint(input));
});

document.querySelectorAll('[data-s]').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('[data-s]').forEach(btn => btn.classList.remove('active'));
    b.classList.add('active');
    const vals = S[b.dataset.s];
    if (vals) {
      vals.forEach((v, i) => {
        if (inputs[i]) {
          inputs[i].value = v;
          inputs[i].classList.remove('bad');
          updateRangeHint(inputs[i]);
        }
      });
      $('key').requestSubmit();
    }
  };
});

if ($('key')) {
  $('key').addEventListener('reset', () => {
    inputs.forEach(i => i.classList.remove('bad'));
    requestAnimationFrame(() => inputs.forEach(updateRangeHint));
    document.querySelectorAll('[data-s]').forEach(btn => btn.classList.remove('active'));
    $('out').classList.remove('request-error');
    $('out').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><svg class="i" style="font-size:2rem"><use href="#spark"/></svg></div>
        <p class="em">Pick a sample or input specifications above, then click <strong>Classify vehicle</strong>.</p>
      </div>`;
    hideShareBar();
    if ($('radarWrap')) $('radarWrap').style.display = 'none';
  });
}

/* ============================================================
   TOAST HELPER
   ============================================================ */
function toast(msg) {
  let t = document.querySelector('.fk-toast');
  if (!t) { t = el('div', 'fk-toast'); document.body.append(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============================================================
   HISTORY
   ============================================================ */
function loadHistory() { try { return JSON.parse(localStorage.getItem('fk-history')) || []; } catch (e) { return []; } }
function saveHistory(h) { try { localStorage.setItem('fk-history', JSON.stringify(h.slice(0, 20))); } catch (e) {} }
function addHistory(specs, prediction, confidence) {
  const h = loadHistory();
  h.unshift({ specs, prediction, confidence, timestamp: new Date().toISOString() });
  saveHistory(h);
  renderHistory();
}
function renderHistory() {
  const list = $('historyList'), clr = $('clearHistory');
  if (!list) return;
  const h = loadHistory();
  list.innerHTML = '';
  if (clr) clr.style.display = h.length ? '' : 'none';
  if (!h.length) {
    list.append(el('p', 'em', 'No classification history yet.'));
    renderAnalytics(h);
    return;
  }
  h.forEach((entry) => {
    const d = el('div', 'hist-item');
    const dt = new Date(entry.timestamp);
    const ts = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const ic = V_ICONS[entry.prediction] || '🚗';
    d.innerHTML = `
      <div class="hist-main">
        <span class="hi-type">${ic} ${entry.prediction}</span>
        <span class="hi-conf">${Math.round(entry.confidence * 100)}% match</span>
        <span class="hi-ts">${ts}</span>
      </div>`;
    const rb = el('button', 'hi-re', 'Load & Classify');
    rb.type = 'button';
    rb.addEventListener('click', e => {
      e.stopPropagation();
      T.f.forEach((f, i) => { if (inputs[i]) { inputs[i].value = entry.specs[f] || ''; inputs[i].classList.remove('bad'); } });
      $('key').requestSubmit();
      $('key').scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    d.append(rb);
    list.append(d);
  });
  renderAnalytics(h);
}

function renderAnalytics(history) {
  const total = $('analyticsTotal'), top = $('analyticsTop');
  const topCount = $('analyticsTopCount'), average = $('analyticsConfidence');
  const chart = $('analyticsChart');
  if (!chart) return;
  const counts = {};
  history.forEach(entry => { counts[entry.prediction] = (counts[entry.prediction] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (total) total.textContent = String(history.length);
  if (top) top.textContent = sorted.length ? sorted[0][0] : '—';
  if (topCount) topCount.textContent = sorted.length ? `${sorted[0][1]} saved prediction${sorted[0][1] === 1 ? '' : 's'}` : 'No predictions yet';
  if (average) {
    const mean = history.length ? history.reduce((sum, entry) => sum + Number(entry.confidence || 0), 0) / history.length : 0;
    average.textContent = history.length ? `${Math.round(mean * 100)}%` : '—';
  }
  chart.replaceChildren();
  if (!sorted.length) {
    chart.append(el('p', 'analytics-empty', 'Classify a vehicle to populate local activity insights.'));
    return;
  }
  const max = sorted[0][1];
  sorted.forEach(([name, count]) => {
    const row = el('div', 'analytics-row');
    const header = el('div', 'analytics-row-head');
    header.append(el('span', '', `${V_ICONS[name] || ''} ${name}`), el('b', '', `${count} · ${Math.round(count / history.length * 100)}%`));
    const track = el('div', 'analytics-track');
    const fill = el('i');
    fill.style.width = `${count / max * 100}%`;
    track.append(fill);
    row.append(header, track);
    chart.append(row);
  });
}
renderHistory();
if ($('clearHistory')) {
  $('clearHistory').addEventListener('click', () => {
    try { localStorage.removeItem('fk-history'); } catch (e) {}
    renderHistory();
    toast('History cleared.');
  });
}

/* ============================================================
   RADAR PROFILE CHART
   ============================================================ */
function drawRadar(specs, prediction) {
  const cv = $('radarCanvas'), wrap = $('radarWrap');
  if (!cv || !wrap) return;
  const cls = CS[prediction];
  if (!cls) return;
  wrap.style.display = '';
  const ctx = cv.getContext('2d');
  const W = cv.width = 280, H = cv.height = 280, cx = W / 2, cy = H / 2 - 10, R = 90;
  ctx.clearRect(0, 0, W, H);
  const feats = T.f, n = feats.length, step = Math.PI * 2 / n;
  const gmin = {}, gmax = {};
  feats.forEach(f => {
    let mn = Infinity, mx = -Infinity;
    Object.values(CS).forEach(c => { if (c[f]) { mn = Math.min(mn, c[f].min); mx = Math.max(mx, c[f].max); } });
    gmin[f] = isFinite(mn) ? mn : 0;
    gmax[f] = isFinite(mx) ? mx : 100;
  });
  function norm(f, v) { const range = gmax[f] - gmin[f]; return range > 0 ? Math.max(0, Math.min(1, (v - gmin[f]) / range)) : 0.5; }
  function polyPt(i, v) { const a = -Math.PI / 2 + i * step; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; }

  // grid
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
  for (let r = 0.25; r <= 1; r += 0.25) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const [x, y] = polyPt(i, r); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.closePath(); ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const [x, y] = polyPt(i, 1);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
  }

  // Class polygon (Deep Navy)
  ctx.beginPath();
  feats.forEach((f, i) => { const v = cls[f] ? norm(f, cls[f].mean) : 0.5; const [x, y] = polyPt(i, v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.closePath(); ctx.fillStyle = 'rgba(15,43,92,.22)'; ctx.fill(); ctx.strokeStyle = '#0f2b5c'; ctx.lineWidth = 2; ctx.stroke();

  // User input polygon (Warm Beige / Gold)
  ctx.beginPath();
  feats.forEach((f, i) => { const v = norm(f, Number(specs[f]) || 0); const [x, y] = polyPt(i, v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.closePath(); ctx.fillStyle = 'rgba(184,149,100,.25)'; ctx.fill(); ctx.strokeStyle = '#b89564'; ctx.lineWidth = 2; ctx.stroke();

  // Labels
  ctx.fillStyle = '#0a192f'; ctx.font = '600 11px Manrope,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  feats.forEach((f, i) => { const [x, y] = polyPt(i, 1.20); ctx.fillText(L[f][0], x, y); });

  // Legend
  const ly = H - 8;
  ctx.fillStyle = '#0f2b5c'; ctx.fillRect(cx - 75, ly - 6, 10, 10);
  ctx.fillStyle = '#0a192f'; ctx.font = '500 11px Manrope,sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Class avg', cx - 60, ly);
  ctx.fillStyle = '#b89564'; ctx.fillRect(cx + 10, ly - 6, 10, 10);
  ctx.fillText('Your vehicle', cx + 25, ly);
}

/* ============================================================
   SHARE / EXPORT
   ============================================================ */
let lastClassification = null;
function showShareBar() { const sb = $('shareBar'); if (sb) sb.style.display = 'flex'; }
function hideShareBar() { const sb = $('shareBar'); if (sb) sb.style.display = 'none'; }

if ($('copyBtn')) {
  $('copyBtn').addEventListener('click', () => {
    if (!lastClassification) return;
    const d = lastClassification, conf = Math.round((d.probabilities[d.prediction] || 0) * 100);
    const specStr = T.f.map(f => `${L[f][0]}: ${d.specs[f]}${L[f][1]}`).join(', ');
    const txt = `Vehicle Classifier: ${d.prediction} (${conf}% confidence)\nSpecifications: ${specStr}`;
    navigator.clipboard.writeText(txt).then(() => toast('Summary copied to clipboard!')).catch(() => toast('Copy failed'));
  });
}

if ($('downloadBtn')) {
  $('downloadBtn').addEventListener('click', () => {
    if (!lastClassification) return;
    const d = lastClassification, conf = Math.round((d.probabilities[d.prediction] || 0) * 100);
    const cv = document.createElement('canvas'); cv.width = 620; cv.height = 420;
    const c = cv.getContext('2d');
    c.fillStyle = '#07101f'; c.fillRect(0, 0, 620, 420);
    c.strokeStyle = '#18324c'; c.lineWidth = 4; c.strokeRect(2, 2, 616, 416);
    c.fillStyle = '#38bdf8'; c.font = '700 14px Onest,sans-serif'; c.fillText('FIELD KEY VEHICLE CLASSIFIER', 35, 45);
    const ic = V_ICONS[d.prediction] || '🚗';
    c.fillStyle = '#ffffff'; c.font = '800 42px Onest,sans-serif'; c.fillText(`${ic} ${d.prediction}`, 35, 105);
    c.fillStyle = conf > 80 ? '#4ade80' : conf > 50 ? '#facc15' : '#f87171';
    c.font = '700 18px Onest,sans-serif'; c.fillText(`Confidence Score: ${conf}%`, 35, 140);
    c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(35, 155, 550, 1);
    c.fillStyle = '#e4e5e8'; c.font = '500 14px Onest,sans-serif';
    let col1X = 35, col2X = 320, sy = 190;
    T.f.forEach((f, idx) => {
      const posX = idx < 4 ? col1X : col2X;
      const posY = idx < 4 ? sy + (idx * 30) : sy + ((idx - 4) * 30);
      c.fillText(`${L[f][0]}: ${d.specs[f]}${L[f][1]}`, posX, posY);
    });
    c.fillStyle = '#666'; c.font = '500 12px Onest,sans-serif';
    c.fillText('Trained via Decision Tree • Instant classification engine', 35, 385);
    const link = document.createElement('a'); link.download = `${d.prediction.toLowerCase()}-classification.png`;
    link.href = cv.toDataURL('image/png'); link.click();
    toast('Image card downloaded!');
  });
}

/* ============================================================
   SHOW RESULT (ENHANCED UI)
   ============================================================ */
function show(d, elapsedMs) {
  const out = $('out'), p = d.probabilities;
  const conf = p[d.prediction] || 0;
  const ic = V_ICONS[d.prediction] || '🚗';
  const alternatives = Object.entries(p).filter(([name]) => name !== d.prediction).sort((a, b) => b[1] - a[1]).slice(0, 3);

  out.innerHTML = `
    <div class="result-topline"><span><i class="online-dot"></i> INFERENCE COMPLETE</span><span class="result-time">${Math.round(elapsedMs)} ms</span></div>
    <div class="result-main">
      <div class="pred-copy"><span class="result-label">PREDICTED VEHICLE TYPE</span><div class="big"><span class="pred-icon">${ic}</span> ${d.prediction}</div><span class="model-version">DECISION TREE · v1.0</span></div>
      <div class="confidence-ring" aria-label="${Math.round(conf * 100)} percent confidence">
        <svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="38"/><circle class="ring-value" id="confidenceRing" cx="50" cy="50" r="38"/></svg>
        <span><b id="confidenceValue">0</b><small>CONFIDENCE</small></span>
      </div>
    </div>
    <div class="result-divider"></div>
    <div class="result-section">
      <div class="result-section-head"><span>ALTERNATIVE PREDICTIONS</span><small>TOP CLASS PROBABILITIES</small></div>
      <div id="probBars"></div>
    </div>
    <details class="path-details"><summary><span>Explainable decision path</span><b>${(d.path || []).length} MODEL STEPS</b></summary><div class="pth">${(d.path || []).map((step, idx) => `<div class="pth-step"><span class="step-idx">${String(idx + 1).padStart(2, '0')}</span><span>${step}</span></div>`).join('')}</div></details>
  `;

  const ring = $('confidenceRing'), value = $('confidenceValue');
  if (ring) requestAnimationFrame(() => { ring.style.strokeDashoffset = String(239 * (1 - conf)); });
  if (value) {
    const target = Math.round(conf * 100), duration = RM ? 0 : 650, started = performance.now();
    function countConfidence(now) {
      const progress = duration ? Math.min(1, (now - started) / duration) : 1;
      value.textContent = String(Math.round(target * progress));
      if (progress < 1) requestAnimationFrame(countConfidence);
    }
    requestAnimationFrame(countConfidence);
  }
  const pb = $('probBars');
  [[d.prediction, conf], ...alternatives].forEach(([c, v], n) => {
    const r = el('div', 'pr' + (n ? '' : ' t'));
    const bar = el('i'), b = el('b');
    b.style.width = '0';
    bar.append(b);
    const classIcon = V_ICONS[c] || '🚗';
    r.append(el('span', '', `${classIcon} ${c}`), bar, el('span', '', Math.round(v * 100) + '%'));
    pb.append(r);
    requestAnimationFrame(() => requestAnimationFrame(() => b.style.width = (v * 100) + '%'));
  });

  out.closest('.rc').scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  showShareBar();
  if (lastClassification) {
    drawRadar(lastClassification.specs, d.prediction);
    addHistory(lastClassification.specs, d.prediction, conf);
  }
}

/* ============================================================
   CLASSIFIER FORM SUBMISSION
   ============================================================ */
if ($('key')) {
  $('key').addEventListener('submit', async e => {
    e.preventDefault();
    const out = $('out');
    out.replaceChildren();
    out.classList.remove('request-error');
    hideShareBar();
    let bad = false;
    const x = {};
    inputs.forEach(i => {
      const v = i.value.trim() === '' ? NaN : Number(i.value), b = !isFinite(v) || v < 0;
      i.classList.toggle('bad', b);
      updateRangeHint(i);
      bad = bad || b;
      x[i.name] = i.value;
    });
    if (bad) {
      out.innerHTML = `<p class="em er">Every field requires a valid number (0 or greater).</p>`;
      return;
    }
    if (Number(x.wheels) < 1) {
      if (inputs[0]) inputs[0].classList.add('bad');
      out.innerHTML = `<p class="em er">A road vehicle requires at least 1 wheel.</p>`;
      return;
    }
    lastClassification = { specs: Object.assign({}, x), probabilities: null, prediction: null };
    const btn = e.target.querySelector('button[type=submit]');
    if (btn) btn.disabled = true;
    const resultCard = out.closest('.rc');
    if (resultCard) resultCard.classList.add('is-processing');
    const started = performance.now();
    out.innerHTML = `<div class="processing-state"><span class="processing-orbit"><i></i><i></i><i></i></span><b>Evaluating vehicle profile</b><span>Traversing decision rules across ${T.f.length} model inputs…</span><div class="processing-track"><i></i></div></div>`;
    try {
      const res = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(x)
      });
      const d = await res.json();
      if (!res.ok) {
        out.textContent = d.error || 'Prediction request failed.';
        out.className = 'request-error';
        return;
      }
      lastClassification.probabilities = d.probabilities;
      lastClassification.prediction = d.prediction;
      show(d, performance.now() - started);
    } catch (err) {
      out.textContent = 'Could not reach classification server. Ensure app is running.';
      out.className = 'request-error';
    } finally {
      if (btn) btn.disabled = false;
      if (resultCard) resultCard.classList.remove('is-processing');
    }
  });
}

/* ============================================================
   RANDOM VEHICLE GENERATOR
   ============================================================ */
if ($('randomBtn')) {
  $('randomBtn').addEventListener('click', () => {
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const rf = (lo, hi) => Math.round((lo + Math.random() * (hi - lo)) * 100) / 100;
    const vals = [
      pick([2, 3, 4, 6, 10]),
      rf(1.7, 12.5),
      rf(0.7, 2.5),
      rf(1.0, 3.6),
      Math.round(rf(120, 12000)),
      Math.round(rf(100, 7000)),
      pick([1, 2, 4, 5, 7, 15, 30, 45]),
      Math.round(rf(50, 240))
    ];
    document.querySelectorAll('[data-s]').forEach(btn => btn.classList.remove('active'));
    vals.forEach((v, i) => { if (inputs[i]) { inputs[i].value = v; inputs[i].classList.remove('bad'); } });
    $('key').requestSubmit();
    toast('Generated surprise specifications!');
  });
}

/* ============================================================
   BATCH CSV UPLOAD
   ============================================================ */
(function initBatchCsv() {
  const dropZone = $('dropZone'), fileInput = $('csvFileInput'), browseBtn = $('browseCsvBtn');
  const preview = $('batchPreview'), dlBtn = $('downloadClassifiedBtn');
  let currentFile = null;

  if (browseBtn && fileInput) browseBtn.addEventListener('click', () => fileInput.click());
  if (dropZone && fileInput) {
    dropZone.addEventListener('click', e => { if (e.target !== browseBtn && !browseBtn.contains(e.target)) fileInput.click(); });
    ['dragenter', 'dragover'].forEach(name => dropZone.addEventListener(name, e => { e.preventDefault(); dropZone.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach(name => dropZone.addEventListener(name, e => { e.preventDefault(); dropZone.classList.remove('dragover'); }));
    dropZone.addEventListener('drop', e => {
      const files = e.dataTransfer.files;
      if (files && files.length) handleFile(files[0]);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length) handleFile(fileInput.files[0]);
    });
  }

  async function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast('Please upload a .csv file');
      return;
    }
    currentFile = file;
    const fd = new FormData();
    fd.append('file', file);
    try {
      toast('Processing CSV records...');
      const res = await fetch('/predict/csv', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) {
        toast(d.error || 'Failed to process CSV');
        return;
      }
      renderBatchResults(file.name, d);
    } catch (e) {
      toast('Error communicating with server.');
    }
  }

  function renderBatchResults(filename, data) {
    if (!preview) return;
    preview.style.display = 'block';
    if ($('batchFileName')) $('batchFileName').textContent = filename;
    if ($('batchCountBadge')) $('batchCountBadge').textContent = `${data.total_rows} rows classified`;
    
    const chips = $('batchSummaryChips');
    if (chips && data.summary) {
      chips.innerHTML = Object.entries(data.summary).map(([k, v]) => `
        <span class="bsc-chip">${V_ICONS[k] || '🚗'} <strong>${k}:</strong> ${v}</span>
      `).join('');
    }

    const tbody = $('batchTableBody');
    if (tbody && data.preview) {
      tbody.innerHTML = data.preview.map((r, i) => {
        const confPct = Math.round((r.confidence || 0) * 100);
        const ic = V_ICONS[r.predicted_type] || '🚗';
        return `
          <tr>
            <td>${i + 1}</td>
            <td><span class="tbl-badge">${ic} ${r.predicted_type}</span></td>
            <td><strong>${confPct}%</strong></td>
            <td>${r.wheels}</td>
            <td>${r.length_m}</td>
            <td>${r.width_m}</td>
            <td>${r.height_m}</td>
            <td>${r.weight_kg}</td>
            <td>${r.engine_cc}</td>
            <td>${r.seating_capacity}</td>
            <td>${r.max_speed_kmh}</td>
          </tr>
        `;
      }).join('');
    }
    preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (dlBtn) {
    dlBtn.addEventListener('click', async () => {
      if (!currentFile) return;
      const fd = new FormData();
      fd.append('file', currentFile);
      fd.append('format', 'csv');
      try {
        const res = await fetch('/predict/csv?format=csv', { method: 'POST', body: fd });
        if (!res.ok) { toast('Download failed.'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `classified_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Classified CSV downloaded!');
      } catch (e) {
        toast('Failed to download CSV.');
      }
    });
  }
})();

/* ============================================================
   VIDEO VEHICLE COUNTER
   ============================================================ */
(function initVideoAnalysis() {
  const dropZone = $('videoDropZone'), fileInput = $('videoFileInput');
  const browseBtn = $('browseVideoBtn'), analyzeBtn = $('analyzeVideoBtn');
  const fileLabel = $('videoFileName'), status = $('videoStatus');
  const results = $('videoResults'), countList = $('videoCounts');
  const analysisCard = dropZone ? dropZone.closest('.video-card') : null;
  const maxBytes = 100 * 1024 * 1024;
  const extensions = ['.avi', '.mkv', '.mov', '.mp4', '.webm'];
  const categories = [
    ['bicycle', 'Bicycles'],
    ['motorcycle', 'Motorcycles'],
    ['car', 'Cars'],
    ['bus', 'Buses'],
    ['truck', 'Trucks']
  ];
  let selectedFile = null;

  if (!dropZone || !fileInput || !browseBtn || !analyzeBtn || !fileLabel || !status || !results || !countList) return;

  function chooseFile(file) {
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!extensions.includes(extension)) {
      selectedFile = null;
      analyzeBtn.disabled = true;
      fileLabel.textContent = 'Drop a video here';
      status.textContent = 'Choose an AVI, MKV, MOV, MP4, or WebM video.';
      results.hidden = true;
      toast('Unsupported video format.');
      return;
    }
    if (file.size > maxBytes) {
      selectedFile = null;
      analyzeBtn.disabled = true;
      fileLabel.textContent = 'Drop a video here';
      status.textContent = 'The video exceeds the 100 MB size limit.';
      results.hidden = true;
      toast('Video files must be 100 MB or smaller.');
      return;
    }
    selectedFile = file;
    fileLabel.textContent = file.name;
    status.textContent = `${(file.size / (1024 * 1024)).toFixed(1)} MB · Ready to scan`;
    analyzeBtn.disabled = false;
    results.hidden = true;
  }

  browseBtn.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('click', event => {
    if (!browseBtn.contains(event.target)) fileInput.click();
  });
  ['dragenter', 'dragover'].forEach(name => dropZone.addEventListener(name, event => {
    event.preventDefault();
    dropZone.classList.add('dragover');
  }));
  ['dragleave', 'drop'].forEach(name => dropZone.addEventListener(name, event => {
    event.preventDefault();
    dropZone.classList.remove('dragover');
  }));
  dropZone.addEventListener('drop', event => {
    if (event.dataTransfer.files.length) chooseFile(event.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      chooseFile(fileInput.files[0]);
      fileInput.value = '';
    }
  });

  analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    analyzeBtn.disabled = true;
    fileInput.disabled = true;
    browseBtn.disabled = true;
    if (analysisCard) analysisCard.classList.add('is-processing');
    analyzeBtn.firstChild.nodeValue = 'Scanning video… ';
    status.textContent = 'Uploading and tracking vehicles. First use may download the model.';
    results.hidden = true;

    try {
      const response = await fetch('/analyze-video', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) {
        status.textContent = data.error || 'Video analysis failed.';
        toast(status.textContent);
        return;
      }

      countList.textContent = '';
      categories.forEach(([key, label]) => {
        const item = el('li', 'video-count');
        const value = el('strong', '', '0');
        item.append(el('span', '', label), value);
        countList.append(item);
        const target = Number(data.counts[key] || 0), duration = RM ? 0 : 650, started = performance.now();
        function countVehicle(now) {
          const progress = duration ? Math.min(1, (now - started) / duration) : 1;
          value.textContent = String(Math.round(target * progress));
          if (progress < 1) requestAnimationFrame(countVehicle);
        }
        requestAnimationFrame(countVehicle);
      });
      $('videoTotal').textContent = `${data.total} unique vehicles detected`;
      results.hidden = false;
      status.textContent = 'Analysis complete.';
      results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      status.textContent = 'Could not communicate with the server.';
      toast(status.textContent);
    } finally {
      if (analysisCard) analysisCard.classList.remove('is-processing');
      analyzeBtn.firstChild.nodeValue = 'Scan video ';
      analyzeBtn.disabled = !selectedFile;
      fileInput.disabled = false;
      browseBtn.disabled = false;
    }
  });
})();

/* ============================================================
   REVEALS & STATS ANIMATION
   ============================================================ */
function words(r) {
  let i = 0;
  (function w(n) {
    [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const f = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(t => {
          if (!t || /^\s+$/.test(t)) f.append(t);
          else {
            const s = el('span', 'w', t);
            s.style.setProperty('--d', i++ * 35 + 'ms');
            f.append(s);
          }
        });
        c.replaceWith(f);
      } else w(c);
    });
  })(r);
}
document.querySelectorAll('.wd').forEach(words);
document.querySelectorAll('.lines').forEach(h => {
  if (!h.querySelector('.ln')) h.innerHTML = '<span class="ln"><span>' + h.innerHTML + '</span></span>';
});

const nums = [...document.querySelectorAll('[data-n]')];
function count() {
  const vh = innerHeight;
  nums.forEach(n => {
    const r = n.getBoundingClientRect(), end = vh / 2 - r.height / 2;
    const p = Math.max(0, Math.min(1, (vh - r.top) / (vh - end)));
    const v = Math.round(p * n.dataset.n);
    n.textContent = n.dataset.f ? v.toLocaleString('en-US') : v;
  });
}

/* ============================================================
   STICKY HEADER & SCROLL PROGRESS
   ============================================================ */
const spyL = [...document.querySelectorAll('.side-nav a')].map(a => {
  const href = a.getAttribute('href');
  return [a, href && href.startsWith('#') ? document.querySelector(href) : null];
});
function chrome() {
  const y = scrollY, h = root.scrollHeight - innerHeight;
  root.style.setProperty('--p', h > 0 ? Math.min(1, y / h) : 0);
  if ($('hd')) $('hd').classList.toggle('stuck', y > 60);
  let cur = null;
  spyL.forEach(([a, s]) => { if (s && s.getBoundingClientRect().top <= innerHeight * .35) cur = a; });
  spyL.forEach(([a]) => {
    a.classList.toggle('on', a === cur);
    if (a === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
let cq = 0;
addEventListener('scroll', () => { if (!cq) cq = requestAnimationFrame(() => { cq = 0; count(); chrome(); }); }, { passive: true });
addEventListener('resize', () => { count(); chrome(); });

/* ============================================================
   SENSITIVITY EXPLORER
   ============================================================ */
(function initSensitivity() {
  const sf = $('sensFields'), sr = $('sensResult');
  if (!sf || !T || !T.f) return;

  const CONFIG = {
    wheels: { min: 2, max: 12, step: 1, round: 0 },
    length_m: { min: 1.5, max: 14.0, step: 0.1, round: 2 },
    width_m: { min: 0.6, max: 2.8, step: 0.05, round: 2 },
    height_m: { min: 1.0, max: 4.0, step: 0.05, round: 2 },
    weight_kg: { min: 80, max: 20000, step: 25, round: 0 },
    engine_cc: { min: 50, max: 9500, step: 25, round: 0 },
    seating_capacity: { min: 1, max: 65, step: 1, round: 0 },
    max_speed_kmh: { min: 25, max: 230, step: 5, round: 0 }
  };

  let activePresetKey = 'car';
  let baselineClass = 'Car';
  let baselineValues = [...(S[activePresetKey] || S.car)];
  let sliders = [];
  let numInputs = [];
  let fieldWraps = [];
  let diffPills = [];

  function syncModifiedIndicators() {
    T.f.forEach((f, idx) => {
      const s = sliders[idx];
      const wrap = fieldWraps[idx];
      const pill = diffPills[idx];
      if (!s || !wrap || !pill) return;
      const cur = Number(s.value);
      const base = Number(baselineValues[idx]);
      const isDiff = Math.abs(cur - base) > 0.001;
      if (isDiff) {
        wrap.classList.add('is-modified');
        pill.textContent = `${base} ➔ ${cur}`;
      } else {
        wrap.classList.remove('is-modified');
        pill.textContent = '';
      }
    });
  }

  function setSliderValues(arr) {
    if (!arr) return;
    baselineValues = [...arr];
    T.f.forEach((f, idx) => {
      const s = sliders[idx];
      const n = numInputs[idx];
      if (s && n && arr[idx] !== undefined) {
        s.value = arr[idx];
        n.value = arr[idx];
      }
    });
    syncModifiedIndicators();
    debouncedPredict();
  }

  sf.innerHTML = '';
  sliders = [];
  numInputs = [];
  fieldWraps = [];
  diffPills = [];

  const initialVals = S[activePresetKey] || S.car;

  T.f.forEach((f, idx) => {
    const cfg = CONFIG[f] || { min: 0, max: 100, step: 1, round: 1 };
    const curVal = initialVals[idx] !== undefined ? initialVals[idx] : cfg.min;

    const wrap = el('div', 'sens-field');

    const head = el('div', 'sens-field-head');
    const lblWrap = el('div', '');
    const lbl = el('label', '', L[f][0] + (L[f][1] ? ` (${L[f][1].trim()})` : ''));
    lbl.htmlFor = 'sens_range_' + f;
    const diffPill = el('span', 'sens-diff-pill');
    lblWrap.append(lbl, diffPill);

    const numInp = el('input', 'sens-num-input');
    numInp.type = 'number';
    numInp.id = 'sens_num_' + f;
    numInp.min = cfg.min;
    numInp.max = cfg.max;
    numInp.step = cfg.step;
    numInp.value = curVal;
    numInp.setAttribute('aria-label', L[f][0] + ' value');

    head.append(lblWrap, numInp);

    const row = el('div', 'sens-slider-row');
    const rangeInp = el('input');
    rangeInp.type = 'range';
    rangeInp.id = 'sens_range_' + f;
    rangeInp.min = cfg.min;
    rangeInp.max = cfg.max;
    rangeInp.step = cfg.step;
    rangeInp.value = curVal;
    rangeInp.name = f;
    rangeInp.setAttribute('aria-label', L[f][0] + ' slider');

    rangeInp.addEventListener('input', () => {
      numInp.value = rangeInp.value;
      syncModifiedIndicators();
      debouncedPredict();
    });

    numInp.addEventListener('input', () => {
      let v = Number(numInp.value);
      if (isNaN(v)) return;
      v = Math.max(cfg.min, Math.min(cfg.max, v));
      rangeInp.value = v;
      syncModifiedIndicators();
      debouncedPredict();
    });

    row.append(rangeInp);
    wrap.append(head, row);
    sf.append(wrap);

    sliders.push(rangeInp);
    numInputs.push(numInp);
    fieldWraps.push(wrap);
    diffPills.push(diffPill);
  });

  // Ensure DOM registers preset baseline values correctly on initial layout
  requestAnimationFrame(() => {
    T.f.forEach((f, idx) => {
      const s = sliders[idx];
      const n = numInputs[idx];
      const v = initialVals[idx];
      if (s && n && v !== undefined) {
        s.value = v;
        n.value = v;
      }
    });
    syncModifiedIndicators();
    sensPredict();
  });

  const presetBtns = document.querySelectorAll('[data-sens-preset]');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePresetKey = btn.dataset.sensPreset;
      const pData = S[activePresetKey];
      if (pData) {
        baselineClass = btn.dataset.sensLabel || btn.textContent.replace(/^[\s\S]*?\s/, '').trim();
        setSliderValues(pData);
      }
    });
  });

  const resetBtn = $('sensResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const pData = S[activePresetKey] || S.car;
      setSliderValues(pData);
      toast('Reset sliders to ' + activePresetKey.toUpperCase() + ' baseline');
    });
  }

  let debounceTimer = null;
  function debouncedPredict() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(sensPredict, 120);
  }

  async function sensPredict() {
    if (!sr) return;
    const x = {};
    const modifiedList = [];
    sliders.forEach((s, idx) => {
      x[s.name] = Number(s.value);
      const cur = Number(s.value);
      const base = Number(baselineValues[idx]);
      if (Math.abs(cur - base) > 0.001) {
        modifiedList.push({
          name: L[s.name][0],
          from: base,
          to: cur,
          feature: s.name
        });
      }
    });

    try {
      const res = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(x)
      });
      const d = await res.json();
      if (!res.ok) return;

      const conf = d.probabilities[d.prediction] || 0;
      const ic = V_ICONS[d.prediction] || '🚗';

      const isShifted = baselineClass && (d.prediction.toLowerCase() !== baselineClass.toLowerCase());
      const hasMods = modifiedList.length > 0;

      let shiftTag = '';
      let statusNote = '';

      if (!hasMods) {
        shiftTag = `<span class="sens-transition-tag baseline">✓ Default ${baselineClass} baseline</span>`;
        statusNote = `<div class="sens-status-note">Perturb any vehicle slider on the left to observe decision boundary thresholds and classification shifts.</div>`;
      } else if (isShifted) {
        shiftTag = `<span class="sens-transition-tag shifted">⚡ Boundary Crossed: ${baselineClass} ➔ ${d.prediction}</span>`;
        statusNote = `<div class="sens-status-note">Perturbation in <strong>${modifiedList.map(m => m.name).join(', ')}</strong> crossed a tree decision threshold, flipping the predicted class to <strong>${d.prediction}</strong>.</div>`;
      } else {
        const modSummary = modifiedList.map(m => `${m.name} (${m.from}➔${m.to})`).join(', ');
        shiftTag = `<span class="sens-transition-tag invariant">⚠️ Perturbed: Invariant at ${d.prediction}</span>`;
        statusNote = `<div class="sens-status-note">Adjusted <strong>${modSummary}</strong>. The model output remains <strong>${d.prediction}</strong> because this decision branch does not evaluate those features.</div>`;
      }

      const pathHtml = d.path && d.path.length
        ? `<div class="sens-path-trail">
            <small>Active Decision Path</small>
            ${d.path.slice(0, 3).map(p => `<span class="sens-path-step">${p}</span>`).join('')}
           </div>`
        : '';

      sr.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">
          <small style="color:rgba(255,255,255,.5);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Live Prediction</small>
          <span style="font-family:'DM Mono',monospace;font-size:.78rem;font-weight:700;color:var(--accL)">${Math.round(conf * 100)}% CONFIDENCE</span>
        </div>
        <div class="big" style="margin-top:.4rem;display:flex;align-items:center;gap:.6rem">
          <span>${ic}</span> <span>${d.prediction}</span>
        </div>
        <div>${shiftTag}</div>
        ${statusNote}
        <div class="pr-wrap" style="margin-top:.85rem"></div>
        ${pathHtml}
      `;

      const prWrap = sr.querySelector('.pr-wrap');
      Object.entries(d.probabilities).sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(([c, v], n) => {
        const r = el('div', 'pr' + (n ? '' : ' t')), bar = el('i'), b = el('b');
        b.style.width = '0';
        bar.append(b);
        r.append(el('span', '', `${V_ICONS[c] || '🚗'} ${c}`), bar, el('span', '', Math.round(v * 100) + '%'));
        prWrap.append(r);
        requestAnimationFrame(() => requestAnimationFrame(() => b.style.width = (v * 100) + '%'));
      });
    } catch (e) {}
  }
})();

/* ============================================================
   LOADER & INITIALIZATION
   ============================================================ */
function ready() {
  root.classList.remove('lock');
  root.classList.add('ready');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12 });
  document.querySelectorAll('.rv,.lines,.wd').forEach(n => io.observe(n));
  count();
  chrome();
}

(function() {
  const ld = $('loader');
  if (!ld) { ready(); return; }
  function done() { ld.classList.add('out'); setTimeout(() => { ld.remove(); ready(); }, RM ? 0 : 700); }
  if (RM) { done(); return; }
  let t0;
  const ez = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function f(t) {
    t0 = t0 || t;
    const k = Math.min(1, (t - t0) / 1200), n = Math.round(ez(k) * 100);
    if ($('lf')) $('lf').style.width = n + '%';
    if ($('ln')) $('ln').textContent = String(n).padStart(3, '0');
    if (k < 1) requestAnimationFrame(f); else done();
  }
  requestAnimationFrame(f);
})();

/* ============================================================
   EVALUATION TABS & LIGHTBOX MODAL
   ============================================================ */
(function initEvaluationGallery() {
  const tabBtns = document.querySelectorAll('.eval-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      document.querySelectorAll('.eval-tab-content').forEach(panel => {
        panel.classList.remove('active');
      });
      const activePanel = $(`eval-tab-${tabName}`);
      if (activePanel) activePanel.classList.add('active');
    });
  });

  const lightbox = $('imageLightbox');
  const lbImg = $('lightboxImg');
  const lbTitle = $('lightboxTitle');
  const lbClose = $('lightboxClose');

  if (lightbox && lbImg) {
    document.querySelectorAll('.zoomable-img').forEach(img => {
      img.addEventListener('click', () => {
        lbImg.src = img.src;
        lbImg.alt = img.alt || 'Enlarged model evaluation visualization';
        if (lbTitle) lbTitle.textContent = img.dataset.title || img.alt || 'Model Visualization';
        lightbox.classList.add('open');
      });
    });

    if (lbClose) {
      lbClose.addEventListener('click', () => lightbox.classList.remove('open'));
    }
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) lightbox.classList.remove('open');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) {
        lightbox.classList.remove('open');
      }
    });
  }
})();

