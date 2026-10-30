// Railway Deadlock Simulation - Transportation & Rail Systems
// Created by Nishad Patil | Int. B.Tech TY CSE B | Roll No. 41 | PRN 1262241550 | Subject: Operating System
// Plain JavaScript, no libraries. Open index.html directly in Chrome.
//
// Mapping:  P1 = Express 101 (eastbound)   P2 = Freight 202 (westbound)
//           R1 = Track Block A (west)      R2 = Track Block B (east)

var STEP_DELAY = 2000; // milliseconds between simulation steps

// ---------- System state ----------
var procs, owner, phase, running, queue, idx, timer, clock, resultText;
// phase: 'idle' | 'run' | 'deadlock' | 'recover' | 'done'

var NAME = { P1: 'P1 (Express 101)', P2: 'P2 (Freight 202)' };
var RES  = { R1: 'R1 (Block A)', R2: 'R2 (Block B)' };

// Resource Allocation Graph node centres (match the SVG in index.html)
var POS = {
  P1: { x: 100, y: 92 },
  R2: { x: 360, y: 92 },
  P2: { x: 360, y: 248 },
  R1: { x: 100, y: 248 }
};

// Text shown for each recovery method
var NOTES = {
  auto: 'Auto: the dispatcher picks the cheapest victim (the train that has made less progress; if equal, P2) and terminates it (withdrawn from service). This breaks <b>Circular Wait</b>.',
  killP1: 'Terminate P1: Express 101 is withdrawn from service and releases Block A. Freight 202 then gets Block A and completes its journey. This breaks <b>Circular Wait</b>.',
  killP2: 'Terminate P2: Freight 202 is withdrawn from service and releases Block B. Express 101 then gets Block B and completes its journey. This breaks <b>Circular Wait</b>.',
  preemptP1: 'Preempt Block A from P1: Block A is forcibly taken from Express 101 (the train reverses to its depot and its journey is rolled back) and given to Freight 202. Freight 202 completes, then Express 101 restarts and also completes. This breaks <b>No Preemption</b>.',
  preemptP2: 'Preempt Block B from P2: Block B is forcibly taken from Freight 202 (the train reverses to its depot and its journey is rolled back) and given to Express 101. Express 101 completes, then Freight 202 restarts and also completes. This breaks <b>No Preemption</b>.'
};

function other(p) { return p === 'P1' ? 'P2' : 'P1'; }

function resetState() {
  procs = {
    P1: { status: 'idle', holds: [], waiting: null, progress: 0, text: 'IDLE', rolledBack: false },
    P2: { status: 'idle', holds: [], waiting: null, progress: 0, text: 'IDLE', rolledBack: false }
  };
  owner = { R1: null, R2: null };
  phase = 'idle';
  running = false;
  queue = MAIN_STEPS;
  idx = 0;
  clock = 0;
  resultText = '';
  if (timer) { clearInterval(timer); timer = null; }
}

// ---------- Core OS-style operations ----------
function tryAcquire(p) {
  var proc = procs[p];
  var r = proc.waiting;
  if (!r) return;
  if (owner[r] === null) {
    owner[r] = p;                 // grant the block
    proc.holds.push(r);
    proc.waiting = null;
    proc.rolledBack = false;
    proc.status = 'running';
    proc.text = 'RUNNING (holds ' + proc.holds.join(', ') + ')';
    log(NAME[p] + ' acquired ' + RES[r] + '. Signal turns green.', 'act');
  } else {
    proc.status = 'blocked';      // block busy -> train must stop
    proc.text = 'BLOCKED (waiting for ' + r + ')';
    log(NAME[p] + ' requested ' + RES[r] + ' but it is occupied by ' + owner[r] + '. ' + p + ' is BLOCKED at a red signal.', '');
  }
}

function release(p, r) {
  if (owner[r] === p) owner[r] = null;
  var i = procs[p].holds.indexOf(r);
  if (i >= 0) procs[p].holds.splice(i, 1);
  log(p + ' released ' + RES[r] + '.', 'ok');
}

// Deadlock detection: build wait-for graph (P -> Q if P waits for a block held by Q)
// and look for a cycle.
function findCycle() {
  var names = ['P1', 'P2'];
  var waitsFor = {};
  names.forEach(function (p) {
    var r = procs[p].waiting;
    waitsFor[p] = (r && owner[r] && owner[r] !== p && procs[p].status === 'blocked') ? owner[r] : null;
  });
  for (var i = 0; i < names.length; i++) {
    var seen = [];
    var cur = names[i];
    while (cur && seen.indexOf(cur) === -1) {
      seen.push(cur);
      cur = waitsFor[cur];
    }
    if (cur && seen.indexOf(cur) !== -1) return seen; // cycle found
  }
  return null;
}

// ---------- Simulation steps (normal run until deadlock) ----------
var MAIN_STEPS = [
  function () {
    phase = 'run';
    log('Simulation started. Express 101 (P1) requests Block A (R1); Freight 202 (P2) requests Block B (R2).', '');
    procs.P1.waiting = 'R1'; procs.P1.status = 'requesting'; procs.P1.text = 'REQUESTING R1';
    procs.P2.waiting = 'R2'; procs.P2.status = 'requesting'; procs.P2.text = 'REQUESTING R2';
  },
  function () {
    tryAcquire('P1');
    tryAcquire('P2');
  },
  function () {
    log('Both trains are running inside the block they hold.', '');
    procs.P1.progress = 50;
    procs.P2.progress = 50;
  },
  function () {
    log('P1 now requests R2 (Block B). P2 now requests R1 (Block A).', '');
    procs.P1.waiting = 'R2';
    procs.P2.waiting = 'R1';
    tryAcquire('P1');
    tryAcquire('P2');
  },
  function () {
    var cycle = findCycle();
    if (cycle) {
      phase = 'deadlock';
      log('DEADLOCK DETECTED! Cycle: P1 -> R2 -> P2 -> R1 -> P1', 'warn');
      log('Both trains are stopped nose-to-nose at red signals. Choose a recovery method and press Recover.', 'warn');
    }
  }
];

// ---------- Recovery methods ----------

// Method 1: terminate victim v, release its block, let the other train finish.
function buildTerminate(v) {
  var o = other(v);
  var res = procs[v].holds[0];   // the block the victim holds
  return [
    function () {
      log('Recovery: dispatcher terminates ' + NAME[v] + ' (train withdrawn from service).', 'act');
      procs[v].status = 'terminated';
      procs[v].text = 'TERMINATED';
      procs[v].waiting = null;   // its pending request is cancelled
      procs[v].progress = 0;
    },
    function () {
      release(v, res);           // victim releases its block
    },
    function () {
      log(RES[res] + ' is clear now. ' + o + ' gets a green signal.', '');
      tryAcquire(o);
      procs[o].progress = 75;
    },
    function () {
      log(o + ' holds R1 and R2 and runs through both blocks.', '');
      procs[o].progress = 100;
    },
    function () {
      release(o, 'R1');
      release(o, 'R2');
      procs[o].status = 'done';
      procs[o].text = 'COMPLETED';
      phase = 'done';
      resultText = v + ' was terminated, ' + res + ' was released, and ' + o + ' completed its journey.';
      log('System recovered. ' + o + ' reached its destination. ' + v + ' can be rescheduled later.', 'ok');
    }
  ];
}

// Method 2: preempt the block held by v (roll v back), give it to the other train.
function buildPreempt(v) {
  var o = other(v);
  var held = procs[v].holds[0];  // taken away from v
  var want = procs[v].waiting;   // what v was waiting for (held by o)
  return [
    function () {
      log('Recovery: dispatcher preempts ' + RES[held] + ' from ' + NAME[v] + ' (forced reversal). ' + v + ' is rolled back to its depot.', 'act');
      owner[held] = null;
      procs[v].holds = [];
      procs[v].status = 'requesting';
      procs[v].text = 'ROLLED BACK';
      procs[v].rolledBack = true;
      procs[v].progress = 0;
    },
    function () {
      log(RES[held] + ' is clear now. ' + o + ' gets a green signal.', '');
      tryAcquire(o);
      procs[o].progress = 75;
    },
    function () {
      log(o + ' holds R1 and R2 and runs through both blocks.', '');
      procs[o].progress = 100;
    },
    function () {
      release(o, 'R1');
      release(o, 'R2');
      procs[o].status = 'done';
      procs[o].text = 'COMPLETED';
      log(o + ' reached its destination. ' + v + ' can restart now.', 'ok');
    },
    function () {
      log(v + ' restarts from the depot and requests ' + RES[held] + ' again.', '');
      procs[v].waiting = held;
      procs[v].progress = 25;
      tryAcquire(v);
    },
    function () {
      log(v + ' now requests ' + RES[want] + '.', '');
      procs[v].waiting = want;
      tryAcquire(v);
      procs[v].progress = 75;
    },
    function () {
      log(v + ' holds R1 and R2 and runs through both blocks.', '');
      procs[v].progress = 100;
    },
    function () {
      release(v, 'R1');
      release(v, 'R2');
      procs[v].status = 'done';
      procs[v].text = 'COMPLETED';
      phase = 'done';
      resultText = held + ' was preempted from ' + v + ', so ' + o + ' finished first; then ' + v + ' restarted and completed too.';
      log('System recovered. Both trains completed their journeys.', 'ok');
    }
  ];
}

// Pick the method from the dropdown (Auto chooses a victim by cost).
function chooseMethod() {
  var m = $('recoverySelect').value;
  if (m !== 'auto') return m;
  if (procs.P1.progress < procs.P2.progress) {
    log('Auto: P1 has made less progress, so P1 is the cheapest victim.', 'act');
    return 'killP1';
  }
  if (procs.P1.progress === procs.P2.progress) {
    log('Auto: both trains have made equal progress, so P2 is chosen as victim.', 'act');
  } else {
    log('Auto: P2 has made less progress, so P2 is the cheapest victim.', 'act');
  }
  return 'killP2';
}

// ---------- Timer control ----------
function tick() {
  if (idx >= queue.length) { stopTimer(); render(); return; }
  clock++;
  queue[idx++]();
  if (idx >= queue.length || phase === 'deadlock' || phase === 'done') {
    // end of this sequence
    stopTimer();
  }
  render();
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null; }
  running = false;
}

function startTimer() {
  if (running) return;
  running = true;
  tick();                                   // run first step immediately
  if (running) timer = setInterval(tick, STEP_DELAY);
}

// ---------- Buttons ----------
function onStart() {
  if (phase === 'idle' || phase === 'run' || phase === 'recover') startTimer();
}
function onPause() {
  if (running) { stopTimer(); log('Simulation paused.', ''); render(); }
}
function onRecover() {
  if (phase !== 'deadlock') return;
  var m = chooseMethod();
  phase = 'recover';
  if (m === 'killP1') queue = buildTerminate('P1');
  else if (m === 'killP2') queue = buildTerminate('P2');
  else if (m === 'preemptP1') queue = buildPreempt('P1');
  else queue = buildPreempt('P2');
  idx = 0;
  startTimer();
}
function onReset() {
  resetState();
  document.getElementById('log').innerHTML = '';
  log('System reset. Ready.', '');
  render();
}
function updateNote() {
  $('recoveryNote').innerHTML = NOTES[$('recoverySelect').value];
}

// ---------- Log ----------
function log(msg, cls) {
  var ul = document.getElementById('log');
  var li = document.createElement('li');
  if (cls) li.className = cls;
  li.innerHTML = '<span class="t">[t=' + clock + ']</span>' + msg;
  ul.appendChild(li);
  ul.scrollTop = ul.scrollHeight;
}

// =====================================================================
//  RAILWAY SCENE
// =====================================================================
var SVGNS = 'http://www.w3.org/2000/svg';
var LANE_DY = 84;            // distance between main line and depot siding
var RAIL_Y = 330;            // top of the main-line rail (wheels sit here)
var REF_Y = 334;             // water-reflection mirror line (just under the rail)
var TRAIN_LEN = 272;
var lastFrame = 0, animT = 0, lastClock = -1;

function $(id) { return document.getElementById(id); }

function se(name, attrs, parent) {
  var e = document.createElementNS(SVGNS, name);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

// ----- static scenery -----
function buildStars() {
  var r = rng(11), g = $('stars');
  for (var i = 0; i < 80; i++) {
    var c = se('circle', { cx: (r() * 1400).toFixed(0), cy: (r() * 210).toFixed(0), r: (0.5 + r() * 1.1).toFixed(2), 'class': 'star' }, g);
    c.style.animationDelay = (-r() * 3).toFixed(2) + 's';
    c.style.animationDuration = (2 + r() * 3).toFixed(2) + 's';
  }
}

function skyline(id, base, hmin, hmax, wmin, wmax, fill, seed, wcols, wprob) {
  var r = rng(seed), g = $(id), x = -10;
  while (x < 1410) {
    var w = Math.round(wmin + r() * (wmax - wmin));
    var h = Math.round(hmin + r() * (hmax - hmin));
    se('rect', { x: x, y: base - h, width: w, height: h, fill: fill }, g);
    if (r() < 0.35) se('rect', { x: x + w * 0.3, y: base - h - 8, width: w * 0.4, height: 8, fill: fill }, g);
    if (r() < 0.2) se('line', { x1: x + w / 2, y1: base - h, x2: x + w / 2, y2: base - h - 22, stroke: fill, 'stroke-width': 2 }, g);
    var cols = Math.floor((w - 6) / 10), rows = Math.floor((h - 8) / 13);
    for (var cI = 0; cI < cols; cI++) {
      for (var rI = 0; rI < rows; rI++) {
        if (r() < wprob) {
          se('rect', { x: x + 4 + cI * 10, y: base - h + 6 + rI * 13, width: 4, height: 6,
                       fill: wcols[Math.floor(r() * wcols.length)], opacity: (0.45 + r() * 0.5).toFixed(2) }, g);
        }
      }
    }
    x += w + Math.round(r() * 5);
  }
}

function buildSkyline() {
  skyline('sky1', 300, 40, 110, 30, 62, '#0e1932', 21, ['#ffb35c', '#6ab8ff', '#ffe9a8'], 0.3);
  skyline('sky2', 318, 30, 78, 34, 70, '#0a1222', 33, ['#ff9a3a', '#7cc4ff'], 0.28);
  var p = $('pillars');
  for (var x = 20; x < 1400; x += 140) se('rect', { x: x, y: 269, width: 8, height: 62, fill: '#0d1522' }, p);
}

function buildGlassE() {
  var g = $('glassE');
  for (var c = 0; c < 10; c++) {
    for (var rI = 0; rI < 5; rI++) {
      se('rect', { x: 1152 + c * 23, y: 196 + rI * 22, width: 19, height: 18, rx: 2, fill: 'url(#gGlassE)', opacity: 0.75 }, g);
    }
  }
}

function buildLamps() {
  var g = $('lamps');
  [[60, 'gHaloO'], [150, 'gHaloO'], [240, 'gHaloO'], [1160, 'gHaloB'], [1250, 'gHaloB'], [1340, 'gHaloB']].forEach(function (l) {
    var h = se('circle', { cx: l[0], cy: 258, r: 54, fill: 'url(#' + l[1] + ')', 'class': 'lamp-halo' }, g);
    h.style.animationDelay = (-Math.random() * 4).toFixed(1) + 's';
    se('rect', { x: l[0] - 9, y: 245, width: 18, height: 5, rx: 2, fill: '#cfd8e3' }, g);
  });
}

function buildCatenary() {
  var px = [40, 200, 400, 560, 840, 1000, 1200, 1360];
  var g = $('pylons'), w = $('wires');
  px.forEach(function (x) {
    se('rect', { x: x - 3, y: 198, width: 6, height: 136, 'class': 'pylon' }, g);
    for (var y = 206; y < 330; y += 18) {
      se('line', { x1: x - 3, y1: y, x2: x + 3, y2: y + 18, 'class': 'pylon-lat' }, g);
      se('line', { x1: x + 3, y1: y, x2: x - 3, y2: y + 18, 'class': 'pylon-lat' }, g);
    }
    se('rect', { x: x - 14, y: 195, width: 28, height: 4, rx: 1, 'class': 'pylon' }, g);
    se('circle', { cx: x - 12, cy: 202, r: 2.5, 'class': 'insul' }, g);
    se('circle', { cx: x + 12, cy: 202, r: 2.5, 'class': 'insul' }, g);
  });
  se('line', { x1: 0, y1: 218, x2: 1400, y2: 218, 'class': 'wire' }, w);
  var pts = [0].concat(px).concat([1400]);
  for (var i = 0; i < pts.length - 1; i++) {
    var x1 = pts[i], x2 = pts[i + 1], xm = (x1 + x2) / 2;
    se('path', { d: 'M' + x1 + ',200 Q' + xm + ',216 ' + x2 + ',200', 'class': 'mess' }, w);
    for (var k = 1; k < 7; k++) {
      var t = k / 7, dx = x1 + t * (x2 - x1), dy = 200 + 16 * t * (1 - t) * 2 * 0.5 * 2;
      // quadratic bezier y(t) = (1-t)^2*200 + 2(1-t)t*216 + t^2*200 = 200 + 32 t(1-t)
      dy = 200 + 32 * t * (1 - t);
      se('line', { x1: dx.toFixed(1), y1: dy.toFixed(1), x2: dx.toFixed(1), y2: 218, 'class': 'drop' }, w);
    }
  }
}

function buildWeather() {
  var r = rng(77), g = $('rain'), i;
  for (i = 0; i < 70; i++) {
    var l = se('line', { x1: 0, y1: 0, x2: -5, y2: 17 }, g);
    l.setAttribute('transform', 'translate(' + (r() * 1460).toFixed(0) + ',' + (r() * 40).toFixed(0) + ')');
    l.style.animationDuration = (0.55 + r() * 0.5).toFixed(2) + 's';
    l.style.animationDelay = (-r() * 1.2).toFixed(2) + 's';
  }
  var rp = $('ripples');
  for (i = 0; i < 16; i++) {
    var e = se('ellipse', { cx: (20 + r() * 1360).toFixed(0), cy: (440 + r() * 66).toFixed(0), rx: 16, ry: 4, 'class': 'ripple' }, rp);
    e.style.animationDelay = (-r() * 2.4).toFixed(2) + 's';
    e.style.animationDuration = (1.8 + r() * 1.2).toFixed(2) + 's';
  }
}

// ----- signals -----
function makeHead(parent, id, x, y) {
  var g = se('g', { id: id, 'class': 'sig r', transform: 'translate(' + x + ',' + y + ')' }, parent);
  se('rect', { x: -9, y: 0, width: 18, height: 44, rx: 4, 'class': 'sig-box' }, g);
  [['r', 10], ['a', 22], ['g', 34]].forEach(function (l) {
    se('circle', { cx: 0, cy: l[1], r: 17, 'class': 'halo h' + l[0] }, g);
    se('circle', { cx: 0, cy: l[1], r: 5, 'class': 'lamp l' + l[0] }, g);
  });
  return g;
}

function buildSignals() {
  var fg = $('fgSignals');
  [330, 1070].forEach(function (x, i) {
    se('rect', { x: x - 3, y: 232, width: 6, height: 102, 'class': 'mast' }, fg);
    se('rect', { x: x - 8, y: 328, width: 16, height: 6, rx: 2, 'class': 'mast' }, fg);
    makeHead(fg, i === 0 ? 'sgW' : 'sgE', x, 188);
  });
  makeHead($('bridgeHeads'), 'sgC1', 678, 152);
  makeHead($('bridgeHeads'), 'sgC2', 722, 152);
}

// ----- trains -----
var TR = {
  P1: { dir: 1,  home: 300,  off: [50, 146, 232], fx: 300,  v: 0, lane: 0, odo: 0, alpha: 1, cars: [], spokes: [], cls: '', tagKey: '', g: null },
  P2: { dir: -1, home: 1100, off: [50, 146, 232], fx: 1100, v: 0, lane: 0, odo: 0, alpha: 1, cars: [], spokes: [], cls: '', tagKey: '', g: null }
};

function addWheels(g, xs, r, T) {
  xs.forEach(function (x) {
    var w = se('g', { transform: 'translate(' + x + ',' + (-r) + ')' }, g);
    se('circle', { r: r, 'class': 'tire' }, w);
    var sp = se('g', { 'class': 'spoke' }, w);
    se('line', { x1: -(r - 2), y1: 0, x2: r - 2, y2: 0 }, sp);
    se('line', { x1: 0, y1: -(r - 2), x2: 0, y2: r - 2 }, sp);
    se('circle', { r: 2, 'class': 'hub' }, w);
    T.spokes.push(sp);
  });
}

function headlight(g, x, y) {
  se('circle', { cx: x, cy: y, r: 20, 'class': 'halo-w' }, g);
  se('circle', { cx: x, cy: y, r: 3.4, fill: '#fff' }, g);
}

function tailLight(g, x, y) {
  se('circle', { cx: x, cy: y, r: 15, 'class': 'tail' }, g);
  se('circle', { cx: x, cy: y, r: 3, fill: '#ff3b2a' }, g);
}

function expressLoco(g, T) {
  se('polygon', { points: '50,-26 340,-76 340,22', 'class': 'beam' }, g);
  se('rect', { x: -46, y: -14, width: 92, height: 6, fill: '#1b232e' }, g);
  se('path', { d: 'M-50,-10 L-50,-56 Q-50,-64 -42,-64 L12,-64 Q36,-64 48,-34 L50,-12 Q50,-8 46,-8 L-46,-8 Q-50,-8 -50,-10 Z', fill: 'url(#gExp)', stroke: '#4b5a70', 'stroke-width': 1 }, g);
  se('rect', { x: -40, y: -68, width: 54, height: 5, rx: 2, fill: '#9fb0c6' }, g);
  se('path', { d: 'M16,-58 Q32,-58 42,-38 L16,-38 Z', fill: 'url(#gGlass)' }, g);
  se('rect', { x: -10, y: -56, width: 22, height: 16, rx: 2, fill: 'url(#gGlass)' }, g);
  se('rect', { x: -38, y: -58, width: 18, height: 34, rx: 2, fill: 'none', stroke: '#7f90a7', 'stroke-width': 1 }, g);
  se('path', { d: 'M-50,-30 L47,-30 L48,-24 L-50,-24 Z', fill: '#2d9cff' }, g);
  se('rect', { x: -50, y: -21, width: 98, height: 2.5, fill: '#ff8a1f' }, g);
  var t = se('text', { x: -12, y: -13, 'text-anchor': 'middle', 'class': 'num' }, g); t.textContent = '101';
  se('path', { d: 'M-6,-68 L4,-96 L14,-68 M4,-96 L-4,-113 M4,-96 L12,-113 M-12,-113.5 L18,-113.5', 'class': 'panto' }, g);
  se('circle', { cx: 3, cy: -115, r: 4, 'class': 'spark' }, g);
  headlight(g, 50, -26);
  addWheels(g, [-32, -16, 16, 32], 8, T);
  se('rect', { x: 50, y: -14, width: 6, height: 3, fill: '#7a889c' }, g);
}

function coach(g, T, last) {
  se('rect', { x: -43, y: -56, width: 86, height: 44, fill: '#10161f' }, g);
  se('rect', { x: -40, y: -62, width: 80, height: 52, rx: 7, fill: 'url(#gExp)', stroke: '#4b5a70', 'stroke-width': 1 }, g);
  se('rect', { x: -36, y: -66, width: 72, height: 5, rx: 2, fill: '#9fb0c6' }, g);
  for (var i = 0; i < 5; i++) {
    var wx = -34 + i * 14.4;
    se('rect', { x: wx, y: -54, width: 10, height: 15, rx: 2, 'class': 'win' }, g);
    if (i === 1 || i === 3) se('circle', { cx: wx + 5, cy: -44, r: 3.2, fill: 'rgba(10,15,25,.55)' }, g);
  }
  se('rect', { x: -40, y: -33, width: 80, height: 6, fill: '#2d9cff' }, g);
  se('rect', { x: -40, y: -25, width: 80, height: 2.5, fill: '#ff8a1f' }, g);
  se('rect', { x: -38, y: -14, width: 76, height: 5, fill: '#1b232e' }, g);
  addWheels(g, [-26, -14, 14, 26], 8, T);
  se('rect', { x: 40, y: -14, width: 6, height: 3, fill: '#7a889c' }, g);
  if (last) tailLight(g, -40, -24);
}

function dieselLoco(g, T) {
  se('polygon', { points: '50,-30 340,-80 340,18', 'class': 'beam' }, g);
  se('rect', { x: -50, y: -16, width: 100, height: 8, fill: '#1b232e' }, g);
  se('rect', { x: -6, y: -46, width: 56, height: 32, rx: 3, fill: 'url(#gDiesel)', stroke: '#4b6b94', 'stroke-width': 1 }, g);
  se('rect', { x: -6, y: -32, width: 56, height: 6, fill: '#ff8a1f' }, g);
  for (var v = 0; v < 5; v++) se('line', { x1: 2 + v * 9, y1: -44, x2: 2 + v * 9, y2: -35, stroke: '#0a1424', 'stroke-width': 2 }, g);
  se('rect', { x: -50, y: -64, width: 44, height: 50, rx: 4, fill: 'url(#gCab)', stroke: '#a85a10', 'stroke-width': 1 }, g);
  se('rect', { x: -52, y: -68, width: 48, height: 5, rx: 2, fill: '#3a4658' }, g);
  se('rect', { x: -44, y: -57, width: 24, height: 16, rx: 2, fill: 'url(#gGlass)' }, g);
  se('rect', { x: -16, y: -57, width: 8, height: 16, rx: 2, fill: 'url(#gGlass)' }, g);
  var t = se('text', { x: -28, y: -22, 'text-anchor': 'middle', 'class': 'num' }, g); t.textContent = '202';
  se('rect', { x: 20, y: -56, width: 9, height: 11, rx: 1, fill: '#10151c' }, g);
  var sm = se('g', { transform: 'translate(24,-58)' }, g);
  se('circle', { r: 6, 'class': 'puff' }, sm);
  se('circle', { r: 6, 'class': 'puff' }, sm);
  se('circle', { r: 6, 'class': 'puff' }, sm);
  se('polyline', { points: '-6,-46 -6,-52 50,-52 50,-46', fill: 'none', stroke: '#8fa0b6', 'stroke-width': 1.2 }, g);
  headlight(g, 50, -32);
  addWheels(g, [-38, -26, -14, 16, 28, 40], 7, T);
  se('rect', { x: 50, y: -14, width: 6, height: 3, fill: '#7a889c' }, g);
}

function tankWagon(g, T) {
  se('rect', { x: -43, y: -14, width: 86, height: 5, fill: '#1b232e' }, g);
  se('rect', { x: -38, y: -48, width: 76, height: 34, rx: 17, fill: 'url(#gTank)', stroke: '#4a5668', 'stroke-width': 1 }, g);
  se('rect', { x: -20, y: -48, width: 4, height: 34, fill: '#ff8a1f', opacity: 0.9 }, g);
  se('rect', { x: 16, y: -48, width: 4, height: 34, fill: '#ff8a1f', opacity: 0.9 }, g);
  se('rect', { x: -6, y: -54, width: 12, height: 7, rx: 2, fill: '#8896ab' }, g);
  se('path', { d: 'M0,-40 L7,-33 L0,-26 L-7,-33 Z', fill: '#ff8a1f', stroke: '#1a1208', 'stroke-width': 1 }, g);
  addWheels(g, [-28, -16, 16, 28], 7, T);
  se('rect', { x: 40, y: -14, width: 6, height: 3, fill: '#7a889c' }, g);
}

function containerWagon(g, T) {
  se('rect', { x: -43, y: -14, width: 86, height: 5, fill: '#1b232e' }, g);
  function box(x, color, edge) {
    se('rect', { x: x, y: -50, width: 37, height: 36, fill: color, stroke: edge, 'stroke-width': 1 }, g);
    for (var i = 1; i < 9; i++) se('line', { x1: x + i * 4, y1: -49, x2: x + i * 4, y2: -15, stroke: 'rgba(255,255,255,.18)', 'stroke-width': 1 }, g);
  }
  box(-40, '#ff8a1f', '#a85a10');
  box(3, '#2d7fc8', '#164c7c');
  addWheels(g, [-28, -16, 16, 28], 7, T);
  se('rect', { x: 40, y: -14, width: 6, height: 3, fill: '#7a889c' }, g);
  tailLight(g, -41, -26);
}

function buildTrains() {
  ['P1', 'P2'].forEach(function (p) {
    var T = TR[p];
    T.g = $('train' + p);
    for (var i = 0; i < 3; i++) {
      var cg = se('g', {}, T.g);
      T.cars.push(cg);
      if (p === 'P1') { if (i === 0) expressLoco(cg, T); else coach(cg, T, i === 2); }
      else { if (i === 0) dieselLoco(cg, T); else if (i === 1) tankWagon(cg, T); else containerWagon(cg, T); }
    }
  });
}

function buildFx() {
  var fx = $('fx');
  ['P1', 'P2'].forEach(function (p) {
    var pf = se('g', { id: 'puffs' + p, 'class': 'puffs' }, fx);
    se('circle', { cx: -26, cy: 0, r: 16 }, pf);
    se('circle', { cx: 0, cy: -6, r: 20 }, pf);
    se('circle', { cx: 26, cy: 0, r: 15 }, pf);
    var tg = se('g', { id: 'tag' + p, 'class': 'fxtag kill' }, fx);
    se('rect', { x: -92, y: -17, width: 184, height: 32, rx: 16 }, tg);
    se('text', { x: 0, y: 5 }, tg);
  });
}

// ----- movement -----
// u = distance travelled from the west edge for P1 (P2 is mirrored)
function targetU(p) {
  var pr = procs[p];
  if (pr.status === 'terminated') return null;
  if (pr.status === 'done') return 1360;
  if (pr.holds.length >= 2) return pr.progress >= 100 ? 1360 : 1040;
  if (pr.holds.length === 1) return pr.status === 'blocked' ? 688 : 620 + pr.progress * 0.4;
  return 300;   // idle, requesting or rolled back: at the depot end
}

function updateTrain(p, dt, frozen, now) {
  var T = TR[p], pr = procs[p], s = dt / 1000;

  if (pr.status === 'idle') {
    T.fx = T.home; T.v = 0; T.lane = 0; T.alpha = 1;
  } else if (!frozen) {
    var u = targetU(p);
    var tx = (u === null) ? T.fx : (T.dir > 0 ? u : 1400 - u);
    var laneT = (pr.rolledBack && Math.abs(T.fx - T.home) < 6) ? 1 : 0;
    T.lane += (laneT - T.lane) * (1 - Math.exp(-dt / 230));
    if (Math.abs(laneT - T.lane) < 0.004) T.lane = laneT;
    var canMove = T.lane < 0.03;
    var dx = tx - T.fx;
    var vDes = canMove ? clamp(dx * 2.4, -230, 230) : 0;
    var acc = 400 * s;
    T.v += clamp(vDes - T.v, -acc, acc);
    T.fx += T.v * s;
    if (Math.abs(dx) < 0.6 && Math.abs(T.v) < 4) { T.fx = tx; T.v = 0; }
    T.odo += T.v * s;
    T.alpha += ((pr.status === 'terminated' ? 0 : 1) - T.alpha) * (1 - Math.exp(-dt / 300));
  }

  // draw cars
  var moving = Math.abs(T.v) > 8;
  for (var i = 0; i < 3; i++) {
    var cx = T.fx - T.dir * T.off[i];
    var y = RAIL_Y + T.lane * LANE_DY;
    if (moving) y += Math.sin(now / 45 + i * 1.7) * 0.5 * Math.min(1, Math.abs(T.v) / 150);
    T.cars[i].setAttribute('transform', 'translate(' + cx.toFixed(1) + ',' + y.toFixed(1) + ') scale(' + T.dir + ',1)');
  }
  var ang = (T.dir * T.odo / 8 * 57.2958) % 360;
  var rot = 'rotate(' + ang.toFixed(1) + ')';
  for (var k = 0; k < T.spokes.length; k++) T.spokes[k].setAttribute('transform', rot);

  T.g.setAttribute('opacity', T.alpha.toFixed(2));
  var cls = 'train ' + pr.status + (moving ? ' moving' : '');
  if (cls !== T.cls) { T.g.setAttribute('class', cls); T.cls = cls; }

  // reflection on the wet rails
  var rf = $('refl' + p);
  rf.setAttribute('transform', 'translate(0,' + (2 * (REF_Y + T.lane * LANE_DY)).toFixed(1) + ') scale(1,-1)');
  rf.setAttribute('opacity', (T.alpha * 0.22).toFixed(2));

  // smoke puffs + floating tag
  var mid = T.fx - T.dir * 136;
  var py = 296 + T.lane * LANE_DY;
  var pf = $('puffs' + p);
  pf.setAttribute('transform', 'translate(' + mid.toFixed(1) + ',' + py.toFixed(1) + ')');
  pf.setAttribute('class', 'puffs' + (pr.status === 'terminated' ? ' on' : ''));
  var tg = $('tag' + p);
  tg.setAttribute('transform', 'translate(' + mid.toFixed(1) + ',' + (236 + T.lane * LANE_DY).toFixed(1) + ')');
  var key = pr.status === 'terminated' ? 'kill' : (pr.rolledBack ? 'roll' : '');
  if (key !== T.tagKey) {
    T.tagKey = key;
    if (key) {
      tg.setAttribute('class', 'fxtag ' + key);
      tg.lastChild.textContent = key === 'kill' ? p + ' TERMINATED' : p + ' ROLLED BACK';
      void tg.getBoundingClientRect();
      tg.setAttribute('class', 'fxtag ' + key + ' show');
    } else {
      tg.setAttribute('class', 'fxtag');
    }
  }

  // dispatcher board marker
  var m = $('ctc' + p);
  var mx = (p === 'P1') ? T.fx - TRAIN_LEN : T.fx;
  m.setAttribute('transform', 'translate(' + mx.toFixed(1) + ',' + (31 + T.lane * 37).toFixed(1) + ')');
  m.setAttribute('opacity', T.alpha.toFixed(2));

  return T.lane;
}

var lastTop = '';
function frame(now) {
  var dt = lastFrame ? Math.min(now - lastFrame, 50) : 16;
  lastFrame = now;
  var frozen = (phase === 'run' || phase === 'recover') && !running;   // paused
  var l1 = updateTrain('P1', dt, frozen, now);
  var l2 = updateTrain('P2', dt, frozen, now);

  // the train nearer the camera (on the depot lane) is drawn on top
  var top = l1 > l2 ? 'P1' : (l2 > l1 ? 'P2' : lastTop);
  if (top && top !== lastTop) { $('trainLayer').appendChild(TR[top].g); lastTop = top; }

  $('tvW').setAttribute('class', 'tv' + (l1 > 0.03 && l1 < 0.97 ? ' on' : ''));
  $('tvE').setAttribute('class', 'tv' + (l2 > 0.03 && l2 < 0.97 ? ' on' : ''));

  if (Math.floor(now / 1000) !== lastClock) { lastClock = Math.floor(now / 1000); updateClocks(); }
  requestAnimationFrame(frame);
}

function updateClocks() {
  var d = new Date();
  var h = (d.getHours() % 12 + d.getMinutes() / 60) * 30, m = d.getMinutes() * 6;
  [['W', 230, 186], ['E', 1362, 170]].forEach(function (c) {
    $('clock' + c[0] + 'h').setAttribute('transform', 'rotate(' + h.toFixed(1) + ' ' + c[1] + ' ' + c[2] + ')');
    $('clock' + c[0] + 'm').setAttribute('transform', 'rotate(' + m + ' ' + c[1] + ' ' + c[2] + ')');
  });
}

// ----- state-driven scene updates -----
function aspect(p, r) {
  var pr = procs[p];
  if (owner[r] === p) return 'g';
  if (pr.waiting === r && pr.status === 'requesting' && !pr.rolledBack) return 'a';
  return 'r';
}

function setSig(id, st) { $(id).setAttribute('class', 'sig ' + st); }

function boardInfo(p) {
  var pr = procs[p];
  if (pr.status === 'terminated') return ['CANCELLED', 'warn'];
  if (pr.rolledBack) return ['DELAYED - REVERSED', 'amber'];
  switch (pr.status) {
    case 'requesting': return ['BOARDING', 'amber'];
    case 'running': return ['DEPARTED', ''];
    case 'blocked': return ['HELD AT SIGNAL', 'warn'];
    case 'done': return ['ARRIVED', ''];
  }
  return ['ON TIME', ''];
}

function renderScene() {
  $('scene').setAttribute('class', 'scene ph-' + phase);

  // block occupancy (track circuits, labels, dispatcher board)
  [['R1', 'blkA', 'lblA', 'ctcA'], ['R2', 'blkB', 'lblB', 'ctcB']].forEach(function (b) {
    var o = owner[b[0]];
    var st = !o ? 'free' : (phase === 'deadlock' ? 'dead' : 'held');
    $(b[1]).setAttribute('class', 'blk ' + st);
    $(b[3]).setAttribute('class', 'ctc-blk ' + st);
    var l = $(b[2] + 's');
    l.textContent = o ? 'OCCUPIED BY ' + o : 'FREE';
    l.setAttribute('class', 'lbl-s ' + st);
  });

  // signals
  var a = [aspect('P1', 'R1'), aspect('P1', 'R2'), aspect('P2', 'R1'), aspect('P2', 'R2')];
  setSig('sgW', a[0]);
  setSig('sgC1', a[1]);
  setSig('sgC2', a[2]);
  setSig('sgE', a[3]);
  ['ctcS0', 'ctcS1a', 'ctcS1b', 'ctcS2'].forEach(function (id, i) {
    $(id).setAttribute('class', 'ctc-sig ' + a[i]);
  });

  // station departure boards
  var b1 = boardInfo('P1'), b2 = boardInfo('P2');
  $('dbWt2').textContent = b1[0]; $('dbWt2').setAttribute('class', 'db-s ' + b1[1]);
  $('dbEt2').textContent = b2[0]; $('dbEt2').setAttribute('class', 'db-s ' + b2[1]);
}

// ---------- Rendering ----------
function render() {
  renderProcesses();
  renderResources();
  renderScene();
  renderGraph();
  renderConditions();
  renderStepper();
  renderBanner();
  renderButtons();
}

function renderProcesses() {
  ['P1', 'P2'].forEach(function (p) {
    var pr = procs[p];
    $('card' + p).className = 'chip machine ' + pr.status;
    $('status' + p).textContent = pr.text;
    $('bar' + p).style.width = pr.progress + '%';
  });
}

function renderResources() {
  ['R1', 'R2'].forEach(function (r) {
    var o = owner[r];
    $('card' + r).className = 'chip resource' + (o ? ' held' : '');
    $('status' + r).textContent = o ? 'HELD BY ' + o : 'FREE';
  });
}

// --- Resource Allocation Graph ---
function edgePath(a, b) {
  var dx = POS[b].x - POS[a].x, dy = POS[b].y - POS[a].y;
  var len = Math.sqrt(dx * dx + dy * dy);
  var c1 = 38, c2 = 42;
  var x1 = POS[a].x + dx / len * c1, y1 = POS[a].y + dy / len * c1;
  var x2 = POS[b].x - dx / len * c2, y2 = POS[b].y - dy / len * c2;
  return 'M' + x1 + ',' + y1 + ' L' + x2 + ',' + y2;
}

function edgeLabel(a, b, text, cls) {
  var mx = (POS[a].x + POS[b].x) / 2, my = (POS[a].y + POS[b].y) / 2;
  var vx = mx - 230, vy = my - 170;
  var vl = Math.sqrt(vx * vx + vy * vy) || 1;
  var off = Math.abs(vx) > Math.abs(vy) ? 30 : 14;
  var lx = mx + vx / vl * off, ly = my + vy / vl * off + 4;
  return '<text class="elabel ' + cls + '" x="' + lx + '" y="' + ly + '" text-anchor="middle">' + text + '</text>';
}

function renderGraph() {
  var dead = (phase === 'deadlock');
  var html = '', labels = '';
  ['R1', 'R2'].forEach(function (r) {
    if (owner[r]) {
      html += '<path class="edge assign' + (dead ? ' deadly' : '') + '" d="' + edgePath(r, owner[r]) +
              '" marker-end="url(#' + (dead ? 'arrowRed' : 'arrowBlue') + ')"></path>';
      labels += edgeLabel(r, owner[r], 'allocated', 'assign' + (dead ? ' deadly' : ''));
    }
  });
  ['P1', 'P2'].forEach(function (p) {
    var r = procs[p].waiting;
    if (r) {
      html += '<path class="edge request' + (dead ? ' deadly' : '') + '" d="' + edgePath(p, r) +
              '" marker-end="url(#' + (dead ? 'arrowRed' : 'arrowOrange') + ')"></path>';
      labels += edgeLabel(p, r, 'request', 'request' + (dead ? ' deadly' : ''));
    }
  });
  $('edges').innerHTML = html + labels;
  $('rag').setAttribute('class', 'rag' + (dead ? ' dead' : ''));

  ['P1', 'P2', 'R1', 'R2'].forEach(function (n) {
    var cls = 'node ' + (n.charAt(0) === 'P' ? 'proc' : 'res');
    if (n.charAt(0) === 'P' && procs[n].status === 'terminated') cls += ' gone';
    $('node' + n).setAttribute('class', cls);
  });
}

function renderConditions() {
  var anyHeld = owner.R1 !== null || owner.R2 !== null;
  var blocked = false, holdWait = false;
  ['P1', 'P2'].forEach(function (p) {
    if (procs[p].status === 'blocked') {
      blocked = true;
      if (procs[p].holds.length > 0) holdWait = true;
    }
  });
  var circular = findCycle() !== null;
  var on = [anyHeld, holdWait, blocked && holdWait, circular];
  var count = 0;
  on.forEach(function (v, i) {
    $('cond' + (i + 1)).className = 'cond' + (v ? ' on' : '');
    if (v) count++;
  });
  $('condCount').textContent = count + ' / 4 conditions met';
  $('condFill').style.width = (count * 25) + '%';
  $('condCount').parentNode.className = 'cond-meter' + (count === 4 ? ' full' : '');
}

function renderStepper() {
  for (var i = 1; i <= 6; i++) {
    var c = 'step';
    if (phase === 'run') {
      if (i < idx) c += ' done'; else if (i === idx) c += ' active';
    } else if (phase === 'deadlock') {
      if (i <= 4) c += ' done'; else if (i === 5) c += ' bad';
    } else if (phase === 'recover') {
      if (i <= 4) c += ' done'; else if (i === 5) c += ' done bad'; else c += ' active';
    } else if (phase === 'done') {
      c += (i === 5) ? ' done bad' : ' done';
    }
    $('step' + i).className = c;
  }
}

function renderBanner() {
  var b = $('banner'), t = $('bannerTitle'), x = $('bannerText');
  if (phase === 'deadlock') {
    b.className = 'banner banner-deadlock';
    t.textContent = 'DEADLOCK DETECTED';
    x.textContent = 'Express 101 and Freight 202 are stopped nose-to-nose, each waiting for the block the other holds. Choose a recovery method.';
  } else if (phase === 'done') {
    b.className = 'banner banner-ok';
    t.textContent = 'RECOVERED';
    x.textContent = resultText;
  } else if (phase === 'idle') {
    b.className = 'banner banner-ready';
    t.textContent = 'READY';
    x.textContent = 'Press Start to run the simulation.';
  } else if (!running) {
    b.className = 'banner banner-paused';
    t.textContent = 'PAUSED';
    x.textContent = 'Press Start to continue.';
  } else if (phase === 'recover') {
    b.className = 'banner banner-recover';
    t.textContent = 'RECOVERING';
    x.textContent = 'Dispatcher is applying the selected recovery method...';
  } else {
    b.className = 'banner banner-running';
    t.textContent = 'RUNNING';
    x.textContent = 'Trains are requesting and occupying track blocks.';
  }
}

function renderButtons() {
  $('btnStart').disabled = running || !(phase === 'idle' || phase === 'run' || phase === 'recover');
  $('btnPause').disabled = !running;
  $('btnRecover').disabled = (phase !== 'deadlock');
  $('recoverySelect').disabled = (phase === 'recover' || phase === 'done');
}

// ---------- Init ----------
$('btnStart').addEventListener('click', onStart);
$('btnPause').addEventListener('click', onPause);
$('btnRecover').addEventListener('click', onRecover);
$('btnReset').addEventListener('click', onReset);
$('recoverySelect').addEventListener('change', updateNote);

buildStars();
buildSkyline();
buildGlassE();
buildLamps();
buildCatenary();
buildWeather();
buildSignals();
buildTrains();
buildFx();

resetState();
log('System ready. Press Start.', '');
updateNote();
render();
updateClocks();
requestAnimationFrame(frame);
