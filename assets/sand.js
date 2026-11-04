// Sand: grains pour in when the page opens, settle into a shape in the middle of the hero,
// drift a little, scatter away from the cursor, and slowly re-form into the next shape.
// The canvas covers the whole hero so loose grains and the pour can use all of it;
// the shape itself sits where the .sand-stage placeholder is.
(function () {
  var canvas = document.querySelector("[data-sand]");
  var hero = document.querySelector(".hero");
  var stage = document.querySelector(".sand-stage");
  if (!canvas || !hero || !stage) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = window.matchMedia("(max-width: 760px)").matches;
  var N = small ? 1900 : 4200;
  var DRIFT = small ? 40 : 90;
  var W = 0, H = 0, dpr = 1;

  // ---- shapes, drawn as thick strokes on a 400 x 400 sheet, then sampled into points ----
  var SHAPES = [
    function cursor(g) {
      g.beginPath();
      g.moveTo(132, 56); g.lineTo(132, 318); g.lineTo(190, 262); g.lineTo(232, 350);
      g.lineTo(270, 332); g.lineTo(228, 246); g.lineTo(308, 246); g.closePath(); g.stroke();
    },
    function folder(g) {             // a classic desktop folder: tab on the back, front panel on top
      g.beginPath(); g.moveTo(96, 150); g.lineTo(96, 104); g.lineTo(112, 88); g.lineTo(196, 88); g.lineTo(212, 104); g.lineTo(220, 118);
      g.lineTo(300, 118); g.lineTo(314, 132); g.lineTo(314, 296); g.stroke();
      g.beginPath(); g.moveTo(72, 150); g.lineTo(298, 150); g.lineTo(298, 314); g.lineTo(88, 314); g.lineTo(72, 298); g.closePath(); g.stroke();
    },
    function smiley(g) {
      g.beginPath(); g.arc(200, 200, 142, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(150, 166, 15, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(250, 166, 15, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(200, 200, 84, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
    }
  ];
  function sample(draw) {
    var s = document.createElement("canvas"); s.width = s.height = 400;
    var g = s.getContext("2d");
    g.lineWidth = 22; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = g.fillStyle = "#000";
    draw(g);
    var d = g.getImageData(0, 0, 400, 400).data, hits = [];
    for (var y = 0; y < 400; y += 2) for (var x = 0; x < 400; x += 2) if (d[(y * 400 + x) * 4 + 3] > 128) hits.push(x, y);
    var out = new Float32Array(N * 2);
    for (var i = 0; i < N; i++) {
      var k = (Math.random() * (hits.length / 2)) | 0;
      out[i * 2] = hits[k * 2] + Math.random() * 2;
      out[i * 2 + 1] = hits[k * 2 + 1] + Math.random() * 2;
    }
    return out;
  }
  var shapes = [], names = SHAPES.map(function (f) { return f.name; }), ready = false;
  function announce() { window.dispatchEvent(new CustomEvent("sandshape", { detail: names[current] })); }
  // The fourth shape is Manmit's own hand-drawn sparkle, joined in once the image has loaded
  var spark = new Image();
  function addSpark() { shapes.push(sample(function (g) { g.drawImage(spark, 30, 30, 340, 340); })); names.push("sparkle"); }
  spark.onload = function () { if (ready) addSpark(); };
  spark.src = "assets/img/sparkle-shape.png";

  // ---- grains ----
  var x = new Float32Array(N), y = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
  var tx = new Float32Array(N), ty = new Float32Array(N), ntx = new Float32Array(N), nty = new Float32Array(N);
  var wait = new Float32Array(N), falling = new Uint8Array(N), tone = new Uint8Array(N);
  var drift = [], current = 0, scale = 1, ox = 0, oy = 0;

  function place(idx) {
    var s = shapes[idx];
    for (var i = 0; i < N; i++) { tx[i] = ntx[i] = ox + s[i * 2] * scale; ty[i] = nty[i] = oy + s[i * 2 + 1] * scale; wait[i] = 0; }
  }
  function measure() {
    var r = hero.getBoundingClientRect(), st = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(st.width, st.height) * 0.86 / 400;
    ox = st.left - r.left + (st.width - 400 * scale) / 2;
    oy = st.top - r.top + (st.height - 400 * scale) / 2;
  }

  // Grains start above the hero and pour down into the first shape, a few at a time
  function init() {
    current = Math.max(0, names.indexOf("smiley"));   // open on the smiley: "made simple."
    measure(); place(current);
    for (var i = 0; i < N; i++) {
      var t = Math.random();
      tone[i] = t < 0.12 ? 2 : t < 0.24 ? 1 : 0;           // a few darker grains and some lighter ones, for depth
      if (reduce) { x[i] = tx[i]; y[i] = ty[i]; continue; }
      x[i] = tx[i] + (Math.random() - 0.5) * 60;
      y[i] = -10 - Math.random() * 80;
      vx[i] = 0; vy[i] = 0;
      falling[i] = 1;
      wait[i] = Math.random() * 70 + (1 - ty[i] / H) * 20;  // a staggered pour, lower parts of the shape fill first
    }
    drift = [];
    for (var j = 0; j < DRIFT; j++) drift.push({ x: Math.random() * W, y: Math.random() * H, a: Math.random() * 6.28, s: 0.12 + Math.random() * 0.25, r: Math.random() < 0.3 ? 2.2 : 1.6 });
  }

  function morph(next) {
    current = next == null ? (current + 1) % shapes.length : next;
    announce();
    var s = shapes[current];
    if (reduce) { place(current); for (var k = 0; k < N; k++) { x[k] = tx[k]; y[k] = ty[k]; } draw(); return; }
    for (var i = 0; i < N; i++) {
      ntx[i] = ox + s[i * 2] * scale; nty[i] = oy + s[i * 2 + 1] * scale;
      if (!falling[i]) wait[i] = ((x[i] - ox) / (400 * scale)) * 50 + Math.random() * 40;   // a slow sweep, left to right
    }
  }

  // ---- cursor, anywhere on the hero ----
  var px = -9999, py = -9999, lastHoverMorph = 0;
  hero.addEventListener("pointermove", function (e) {
    var r = hero.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top;
  });
  hero.addEventListener("pointerleave", function () { px = py = -9999; });
  stage.addEventListener("pointerenter", function () {
    var now = performance.now();
    if (now - lastHoverMorph > 4500 && now > 4000) { lastHoverMorph = now; morph(); restartTimer(); }
  });

  // ---- loop ----
  function step() {
    var R = Math.min(W, H) * 0.12, R2 = R * R;
    for (var i = 0; i < N; i++) {
      if (falling[i]) {
        if (wait[i] > 0) { wait[i] -= 1; continue; }
        vy[i] += 0.32;                                       // gravity while pouring
        vx[i] += (tx[i] - x[i]) * 0.01; vx[i] *= 0.94;
        x[i] += vx[i]; y[i] += vy[i];
        if (y[i] >= ty[i]) { y[i] = ty[i]; vy[i] *= -0.18; vx[i] += (Math.random() - 0.5) * 1.2; falling[i] = 0; }
        continue;
      }
      if (wait[i] > 0) {
        wait[i] -= 1;
        if (wait[i] <= 0) {
          tx[i] = ntx[i]; ty[i] = nty[i];
          var a = Math.random() * 6.283; vx[i] += Math.cos(a) * 0.9; vy[i] += Math.sin(a) * 0.9 - 0.6;
        }
      }
      var ax = (tx[i] - x[i]) * 0.012, ay = (ty[i] - y[i]) * 0.012;
      var ddx = x[i] - px, ddy = y[i] - py, d2 = ddx * ddx + ddy * ddy;
      if (d2 < R2) { var f = (1 - d2 / R2) * 1.6, d = Math.sqrt(d2) || 1; ax += ddx / d * f; ay += ddy / d * f; }
      vx[i] = (vx[i] + ax + (Math.random() - 0.5) * 0.16) * 0.9;
      vy[i] = (vy[i] + ay + (Math.random() - 0.5) * 0.16) * 0.9;
      x[i] += vx[i]; y[i] += vy[i];
    }
    for (var j = 0; j < drift.length; j++) {
      var p = drift[j]; p.a += (Math.random() - 0.5) * 0.2;
      p.x += Math.cos(p.a) * p.s; p.y += Math.sin(p.a) * p.s;
      var ex = p.x - px, ey = p.y - py, e2 = ex * ex + ey * ey;
      if (e2 < R2) { var e = Math.sqrt(e2) || 1; p.x += ex / e * 1.5; p.y += ey / e * 1.5; }
      if (p.x < 0) p.x += W; if (p.x > W) p.x -= W; if (p.y < 0) p.y += H; if (p.y > H) p.y -= H;
    }
  }
  var TONES = [["rgba(82,119,160,0.95)", 1.7], ["rgba(82,119,160,0.55)", 1.3], ["rgba(17,46,75,0.85)", 1.8]];
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (var t = 0; t < 3; t++) {
      ctx.fillStyle = TONES[t][0]; var sz = TONES[t][1];
      for (var i = 0; i < N; i++) if (tone[i] === t && !(falling[i] && wait[i] > 0)) ctx.fillRect(x[i], y[i], sz, sz);
    }
    ctx.fillStyle = "rgba(82,119,160,0.3)";
    for (var j = 0; j < drift.length; j++) ctx.fillRect(drift[j].x, drift[j].y, drift[j].r, drift[j].r);
  }

  var running = false, onScreen = true, covered = false;
  function frame() { if (!running) return; step(); draw(); requestAnimationFrame(frame); }
  function update() {
    if (!ready) return;
    var should = onScreen && !covered && !document.hidden && !reduce;
    if (should && !running) { running = true; requestAnimationFrame(frame); }
    if (!should) running = false;
  }
  var timer;
  function restartTimer() { clearInterval(timer); if (!reduce) timer = setInterval(function () { if (running) morph(); }, 9000); }

  new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; update(); }).observe(hero);
  document.addEventListener("visibilitychange", update);
  window.sandCovered = function (v) { if (covered !== v) { covered = v; update(); } };
  var rt; window.addEventListener("resize", function () {
    clearTimeout(rt); rt = setTimeout(function () {
      if (!ready) return;
      measure(); var s = shapes[current];
      for (var i = 0; i < N; i++) { tx[i] = ntx[i] = ox + s[i * 2] * scale; ty[i] = nty[i] = oy + s[i * 2 + 1] * scale; if (reduce) { x[i] = tx[i]; y[i] = ty[i]; } }
      if (reduce) draw();
    }, 150);
  });

  function start() {
    shapes = SHAPES.map(sample); ready = true;
    if (spark.complete && spark.naturalWidth) addSpark();
    init(); draw(); update(); restartTimer(); }
  // Start once the page has drawn, so the sand never delays the headline
  function later() { if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 600 }); else setTimeout(start, 200); }
  if (document.readyState === "complete") later(); else window.addEventListener("load", later);
})();
