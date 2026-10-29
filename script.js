// Deadlock Simulation - Automated Factory Resource Management
// Created by Nishad Patil | Int. B.Tech TY CSE B | Roll No. 41 | PRN 1262241550 | Subject: Operating System
// Plain JavaScript, no libraries. Open index.html directly in Chrome.

var STEP_DELAY = 2000; // milliseconds between simulation steps

// ---------- System state ----------
var procs, owner, phase, running, queue, idx, timer, clock, resultText;
// phase: 'idle' | 'run' | 'deadlock' | 'recover' | 'done'

// Resource Allocation Graph node centres (match the SVG in index.html)
var POS = {
  P1: { x: 100, y: 92 },
  R2: { x: 360, y: 92 },
  P2: { x: 360, y: 248 },
  R1: { x: 100, y: 248 }
};

// Text shown for each recovery method
var NOTES = {
  auto: 'Auto: the system picks the cheapest victim (the process that has done less work; if equal, P2) and terminates it. This breaks <b>Circular Wait</b>.',
  killP1: 'Terminate P1: P1 is killed and releases R1. P2 then gets R1 and finishes. This breaks <b>Circular Wait</b>.',
  killP2: 'Terminate P2: P2 is killed and releases R2. P1 then gets R2 and finishes. This breaks <b>Circular Wait</b>.',
  preemptP1: 'Preempt R1 from P1: R1 is forcibly taken from P1 (P1 is rolled back) and given to P2. P2 finishes, then P1 restarts and also finishes. This breaks <b>No Preemption</b>.',
  preemptP2: 'Preempt R2 from P2: R2 is forcibly taken from P2 (P2 is rolled back) and given to P1. P1 finishes, then P2 restarts and also finishes. This breaks <b>No Preemption</b>.'
};

function other(p) { return p === 'P1' ? 'P2' : 'P1'; }

function resetState() {
  procs = {
    P1: { status: 'idle', holds: [], waiting: null, progress: 0, text: 'IDLE' },
    P2: { status: 'idle', holds: [], waiting: null, progress: 0, text: 'IDLE' }
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
    owner[r] = p;                 // grant resource
    proc.holds.push(r);
    proc.waiting = null;
    proc.status = 'running';
    proc.text = 'RUNNING (holds ' + proc.holds.join(', ') + ')';
    log(p + ' acquired ' + r + '.', 'act');
  } else {
    proc.status = 'blocked';      // resource busy -> block
    proc.text = 'BLOCKED (waiting for ' + r + ')';
    log(p + ' requested ' + r + ' but it is held by ' + owner[r] + '. ' + p + ' is BLOCKED.', '');
  }
}

function release(p, r) {
  if (owner[r] === p) owner[r] = null;
  var i = procs[p].holds.indexOf(r);
  if (i >= 0) procs[p].holds.splice(i, 1);
  log(p + ' released ' + r + '.', 'ok');
}

// Deadlock detection: build wait-for graph (P -> Q if P waits for a resource held by Q)
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
    log('Simulation started. P1 requests R1, P2 requests R2.', '');
    procs.P1.waiting = 'R1'; procs.P1.status = 'requesting'; procs.P1.text = 'REQUESTING R1';
    procs.P2.waiting = 'R2'; procs.P2.status = 'requesting'; procs.P2.text = 'REQUESTING R2';
  },
  function () {
    tryAcquire('P1');
    tryAcquire('P2');
  },
  function () {
    log('Both robots are working with the tool they hold.', '');
    procs.P1.progress = 50;
    procs.P2.progress = 50;
  },
  function () {
    log('P1 now requests R2. P2 now requests R1.', '');
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
      log('Both processes are blocked forever. Choose a recovery method and press Recover.', 'warn');
    }
  }
];

// ---------- Recovery methods ----------

// Method 1: terminate victim v, release its resource, let the other process finish.
function buildTerminate(v) {
  var o = other(v);
  var res = procs[v].holds[0];   // the resource the victim holds
  return [
    function () {
      log('Recovery: terminate ' + v + ' (victim).', 'act');
      procs[v].status = 'terminated';
      procs[v].text = 'TERMINATED';
      procs[v].waiting = null;   // its pending request is cancelled
      procs[v].progress = 0;
    },
    function () {
      release(v, res);           // victim releases its resource
    },
    function () {
      log(res + ' is free now. ' + o + ' can get it.', '');
      tryAcquire(o);
      procs[o].progress = 75;
    },
    function () {
      log(o + ' holds R1 and R2 and finishes its job.', '');
      procs[o].progress = 100;
    },
    function () {
      release(o, 'R1');
      release(o, 'R2');
      procs[o].status = 'done';
      procs[o].text = 'COMPLETED';
      phase = 'done';
      resultText = v + ' was terminated, ' + res + ' was released, and ' + o + ' completed its work.';
      log('System recovered. ' + o + ' completed. ' + v + ' can be restarted later.', 'ok');
    }
  ];
}

// Method 2: preempt the resource held by v (roll v back), give it to the other process.
function buildPreempt(v) {
  var o = other(v);
  var held = procs[v].holds[0];  // taken away from v
  var want = procs[v].waiting;   // what v was waiting for (held by o)
  return [
    function () {
      log('Recovery: preempt ' + held + ' from ' + v + ' (forced release). ' + v + ' is rolled back.', 'act');
      owner[held] = null;
      procs[v].holds = [];
      procs[v].status = 'requesting';
      procs[v].text = 'ROLLED BACK';
      procs[v].progress = 0;
    },
    function () {
      log(held + ' is free now. ' + o + ' can get it.', '');
      tryAcquire(o);
      procs[o].progress = 75;
    },
    function () {
      log(o + ' holds R1 and R2 and finishes its job.', '');
      procs[o].progress = 100;
    },
    function () {
      release(o, 'R1');
      release(o, 'R2');
      procs[o].status = 'done';
      procs[o].text = 'COMPLETED';
      log(o + ' completed. ' + v + ' can restart now.', 'ok');
    },
    function () {
      log(v + ' restarts and requests ' + held + ' again.', '');
      procs[v].waiting = held;
      procs[v].progress = 25;
      tryAcquire(v);
    },
    function () {
      log(v + ' now requests ' + want + '.', '');
      procs[v].waiting = want;
      tryAcquire(v);
      procs[v].progress = 75;
    },
    function () {
      log(v + ' holds R1 and R2 and finishes its job.', '');
      procs[v].progress = 100;
    },
    function () {
      release(v, 'R1');
      release(v, 'R2');
      procs[v].status = 'done';
      procs[v].text = 'COMPLETED';
      phase = 'done';
      resultText = held + ' was preempted from ' + v + ', so ' + o + ' finished first; then ' + v + ' restarted and completed too.';
      log('System recovered. Both processes completed.', 'ok');
    }
  ];
}

// Pick the method from the dropdown (Auto chooses a victim by cost).
function chooseMethod() {
  var m = $('recoverySelect').value;
  if (m !== 'auto') return m;
  if (procs.P1.progress < procs.P2.progress) {
    log('Auto: P1 has done less work, so P1 is the cheapest victim.', 'act');
    return 'killP1';
  }
  if (procs.P1.progress === procs.P2.progress) {
    log('Auto: both have done equal work, so P2 is chosen as victim.', 'act');
  } else {
    log('Auto: P2 has done less work, so P2 is the cheapest victim.', 'act');
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
//  FACTORY SCENE  (animated robot arms, cables, tool effects)
// =====================================================================
var SVGNS = 'http://www.w3.org/2000/svg';
var L1 = 170, L2 = 170;                 // arm segment lengths
var animT = 0, lastFrame = 0;           // animation clock

var ROBOT = {
  P1: { bx: 200, sy: 218, dir: 1,  cur: { x: 380, y: 76 }, open: 0.3, el: {} },
  P2: { bx: 700, sy: 218, dir: -1, cur: { x: 520, y: 76 }, open: 0.3, el: {} }
};
var TOOL = {
  R1: { x: 395, grip: { x: 395, y: 164 } },
  R2: { x: 505, grip: { x: 505, y: 160 } }
};

function se(name, attrs, parent) {
  var e = document.createElementNS(SVGNS, name);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function buildScene() {
  // robots
  ['P1', 'P2'].forEach(function (p) {
    var R = ROBOT[p], g = $('robot' + p), bx = R.bx, E = R.el;
    se('ellipse', { cx: bx, cy: 264, rx: 54, ry: 6, fill: 'rgba(0,0,0,.45)' }, g);
    se('rect', { x: bx - 32, y: 232, width: 64, height: 30, rx: 4, 'class': 'col' }, g);
    se('rect', { x: bx - 32, y: 232, width: 64, height: 4, fill: '#7a8aa0', opacity: 0.5 }, g);
    var t = se('text', { x: bx - 6, y: 256, 'text-anchor': 'middle', 'class': 'col-t' }, g);
    t.textContent = p;
    se('circle', { cx: bx + 21, cy: 244, r: 4, 'class': 'col-led' }, g);

    E.dark1 = se('line', { 'class': 'arm-dark' }, g);
    E.dark2 = se('line', { 'class': 'arm-dark' }, g);
    E.arm1 = se('line', { 'class': 'arm' }, g);
    E.arm2 = se('line', { 'class': 'arm' }, g);
    E.shine1 = se('line', { 'class': 'shine' }, g);
    E.shine2 = se('line', { 'class': 'shine' }, g);

    se('circle', { cx: bx, cy: R.sy, r: 18, 'class': 'joint' }, g);
    se('circle', { cx: bx, cy: R.sy, r: 6, 'class': 'bolt' }, g);
    E.elbow = se('circle', { r: 12, 'class': 'joint' }, g);
    E.elbolt = se('circle', { r: 4, 'class': 'bolt' }, g);
    E.claw = se('path', { 'class': 'claw' }, g);
    E.wrist = se('circle', { r: 8, 'class': 'joint' }, g);

    // "terminated" marks
    var x = se('g', { 'class': 'xmark' }, g);
    se('line', { x1: bx - 24, y1: 196, x2: bx + 24, y2: 248 }, x);
    se('line', { x1: bx + 24, y1: 196, x2: bx - 24, y2: 248 }, x);
    var s = se('g', { 'class': 'smoke' }, g);
    se('circle', { cx: bx - 14, cy: 214, r: 9 }, s);
    se('circle', { cx: bx + 4, cy: 214, r: 11 }, s);
    se('circle', { cx: bx + 18, cy: 214, r: 8 }, s);

    R.cur.x = bx + R.dir * 180;
    R.cur.y = R.sy - 150;
  });

  // cables: one per (process, resource) pair, shown when that process owns that resource
  var cg = $('cables');
  ['P1', 'P2'].forEach(function (p) {
    ['R1', 'R2'].forEach(function (r) {
      var bx = ROBOT[p].bx, tx = TOOL[r].x;
      var d = 'M' + bx + ',270 Q' + ((bx + tx) / 2) + ',294 ' + tx + ',270';
      var g = se('g', { id: 'cab_' + p + '_' + r, 'class': 'cable-g' }, cg);
      se('path', { 'class': 'cable', d: d }, g);
      se('path', { 'class': 'cable-flow', d: d }, g);
      se('circle', { 'class': 'plug', cx: bx, cy: 270, r: 4 }, g);
      se('circle', { 'class': 'plug', cx: tx, cy: 270, r: 4 }, g);
    });
  });
}

// where should a robot's gripper be right now?
function armTarget(p, t) {
  var R = ROBOT[p], pr = procs[p];
  var rest = { x: R.bx + R.dir * 180, y: R.sy - 150, open: 0.3 };

  if (pr.status === 'terminated') {
    return { x: R.bx + R.dir * 150, y: R.sy - 40, open: 0.1 };
  }
  if (pr.waiting) {
    var g = TOOL[pr.waiting].grip;
    if (pr.status === 'blocked') {
      // stretches towards the tool but cannot get it: trembles in place
      return {
        x: g.x - R.dir * 45 + Math.sin(t / 70) * 3,
        y: g.y - 8 + Math.cos(t / 90) * 3,
        open: 0.65
      };
    }
    return { x: g.x, y: g.y, open: 0.65 };
  }
  if (pr.holds.length && pr.status === 'running') {
    var h = TOOL[pr.holds[pr.holds.length - 1]].grip;
    return { x: h.x + Math.sin(t / 260) * 9, y: h.y + 10 + Math.sin(t / 130) * 5, open: 0.25 };
  }
  return rest;
}

// two-link inverse kinematics (elbow always bends upwards)
function solveArm(sx, sy, tx, ty, dir) {
  var dx = tx - sx, dy = ty - sy;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d < 0.001) { dx = dir * 60; dy = -1; d = Math.sqrt(dx * dx + dy * dy); }
  var max = (L1 + L2) * 0.995;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  if (d < 60) { dx *= 60 / d; dy *= 60 / d; d = 60; }
  var a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  var h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  var mx = sx + dx * a / d, my = sy + dy * a / d;
  var e1x = mx + h * dy / d, e1y = my - h * dx / d;
  var e2x = mx - h * dy / d, e2y = my + h * dx / d;
  var up = (e1y < e2y) ? { x: e1x, y: e1y } : { x: e2x, y: e2y };
  return { ex: up.x, ey: up.y, wx: sx + dx, wy: sy + dy };
}

function setLine(el, x1, y1, x2, y2) {
  el.setAttribute('x1', x1.toFixed(1)); el.setAttribute('y1', y1.toFixed(1));
  el.setAttribute('x2', x2.toFixed(1)); el.setAttribute('y2', y2.toFixed(1));
}

function drawArm(R) {
  var E = R.el;
  var a = solveArm(R.bx, R.sy, R.cur.x, R.cur.y, R.dir);
  setLine(E.dark1, R.bx, R.sy, a.ex, a.ey);
  setLine(E.dark2, a.ex, a.ey, a.wx, a.wy);
  setLine(E.arm1, R.bx, R.sy, a.ex, a.ey);
  setLine(E.arm2, a.ex, a.ey, a.wx, a.wy);
  setLine(E.shine1, R.bx, R.sy - 3, a.ex, a.ey - 3);
  setLine(E.shine2, a.ex, a.ey - 3, a.wx, a.wy - 3);
  E.elbow.setAttribute('cx', a.ex.toFixed(1)); E.elbow.setAttribute('cy', a.ey.toFixed(1));
  E.elbolt.setAttribute('cx', a.ex.toFixed(1)); E.elbolt.setAttribute('cy', a.ey.toFixed(1));
  E.wrist.setAttribute('cx', a.wx.toFixed(1)); E.wrist.setAttribute('cy', a.wy.toFixed(1));
  // claw: two prongs pointing along the forearm
  var th = Math.atan2(a.wy - a.ey, a.wx - a.ex);
  var a1 = th - R.open, a2 = th + R.open, len = 26;
  E.claw.setAttribute('d',
    'M' + a.wx.toFixed(1) + ',' + a.wy.toFixed(1) +
    ' l' + (len * Math.cos(a1)).toFixed(1) + ',' + (len * Math.sin(a1)).toFixed(1) +
    ' M' + a.wx.toFixed(1) + ',' + a.wy.toFixed(1) +
    ' l' + (len * Math.cos(a2)).toFixed(1) + ',' + (len * Math.sin(a2)).toFixed(1));
}

function frame(now) {
  var dt = lastFrame ? Math.min(now - lastFrame, 50) : 16;
  lastFrame = now;
  if (running || phase === 'deadlock') animT += dt;   // arms keep trembling while deadlocked
  var k = 1 - Math.exp(-dt / 170);                    // easing factor
  ['P1', 'P2'].forEach(function (p) {
    var R = ROBOT[p], tg = armTarget(p, animT);
    R.cur.x += (tg.x - R.cur.x) * k;
    R.cur.y += (tg.y - R.cur.y) * k;
    R.open += (tg.open - R.open) * k;
    drawArm(R);
  });
  requestAnimationFrame(frame);
}

var CAB_TEXT = { idle: 'STANDBY', run: 'RUNNING', deadlock: 'HALTED', recover: 'RECOVERY', done: 'ALL CLEAR' };

function renderScene() {
  var flow = running && phase !== 'deadlock';
  $('scene').setAttribute('class', 'scene ph-' + phase + (flow ? ' flow' : ''));
  $('cabText').textContent = (phase === 'run' && !running) ? 'PAUSED' : CAB_TEXT[phase];

  ['P1', 'P2'].forEach(function (p) {
    $('robot' + p).setAttribute('class', 'robot ' + procs[p].status);
  });
  ['R1', 'R2'].forEach(function (r) {
    var o = owner[r];
    var cls = 'tool' + (o ? ' held' : '') + ((o && procs[o].status === 'running') ? ' active' : '');
    $('tool' + r).setAttribute('class', cls);
    var st = $('plate' + r);
    st.textContent = o ? 'HELD BY ' + o : 'FREE';
    st.setAttribute('class', 'plate-stat ' + (o ? 'held' : 'free'));
  });
  ['P1', 'P2'].forEach(function (p) {
    ['R1', 'R2'].forEach(function (r) {
      $('cab_' + p + '_' + r).setAttribute('class', 'cable-g' + (owner[r] === p ? ' on' : ''));
    });
  });
}

// ---------- Rendering ----------
function $(id) { return document.getElementById(id); }

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
function cutFor(n, dx, dy) {
  if (n.charAt(0) === 'R') return Math.abs(dx) > Math.abs(dy) ? 38 : 34;
  return 38;
}

function edgePath(a, b) {
  var dx = POS[b].x - POS[a].x, dy = POS[b].y - POS[a].y;
  var len = Math.sqrt(dx * dx + dy * dy);
  var c1 = cutFor(a, dx, dy), c2 = cutFor(b, dx, dy) + 4;
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
    x.textContent = 'P1 and P2 are both blocked, each waiting for a resource the other holds. Choose a recovery method.';
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
    x.textContent = 'Applying the selected recovery method...';
  } else {
    b.className = 'banner banner-running';
    t.textContent = 'RUNNING';
    x.textContent = 'Robots are requesting and using factory tools.';
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

resetState();
buildScene();
log('System ready. Press Start.', '');
updateNote();
render();
requestAnimationFrame(frame);
