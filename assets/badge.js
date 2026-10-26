// The work badge on the homepage.
// A lanyard (a light rope) hangs from a fixed point, and the badge hangs off the end of it.
// The badge drops in on load, sways a little, can be dragged and thrown, and flips on tap or Enter.
(function () {
  var stage = document.querySelector("[data-badge-stage]");
  if (!stage) return;

  var mat = stage.parentElement;
  var slot = mat.querySelector(".badge-slot");
  var canvas = stage.querySelector(".lanyard");
  var ctx = canvas.getContext("2d");
  var badge = stage.querySelector(".badge");
  var tilt = badge.querySelector(".badge-tilt");

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- sizes ----
  var W, H, CLIP, CARD;        // badge width, card height, clip height, clip-top to card-bottom
  var SEGMENTS = 14, ropeLen, seg;
  var anchor = { x: 0, y: 0 };
  var showPin = false;

  function measure() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = stage.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    W = badge.offsetWidth;
    CLIP = parseFloat(getComputedStyle(badge).getPropertyValue("--clip")) || 34;
    CARD = badge.offsetHeight;          // clip + card, measured from where the strap attaches
    var s = slot.getBoundingClientRect();
    var stacked = window.innerWidth <= 820;

    anchor.x = s.left - r.left + s.width / 2;
    if (stacked) {
      // On phones the badge hangs from a pin under the intro text.
      anchor.y = s.top - r.top + 18;
      ropeLen = 70;
      showPin = true;
    } else {
      // On desktop the lanyard comes down from above the top edge of the mat.
      anchor.y = -20;
      ropeLen = Math.max(120, Math.min(200, (s.top - r.top) + s.height / 2 - CARD / 2 + 20));
      showPin = false;
    }
    seg = ropeLen / SEGMENTS;
  }

  // ---- simulation state (verlet points) ----
  var pts = [];          // rope points; pts[0] is pinned, last one is the clip
  var bottom;            // bottom centre of the card
  function P(x, y, inv) { return { x: x, y: y, px: x, py: y, inv: inv }; }

  function restPose() {
    pts = [];
    for (var i = 0; i <= SEGMENTS; i++) pts.push(P(anchor.x, anchor.y + i * seg, i === 0 ? 0 : 1));
    pts[SEGMENTS].inv = 0.25;
    var top = pts[SEGMENTS];
    bottom = P(top.x, top.y + CARD, 0.25);
  }

  function dropPose() {
    // Start with the badge hanging straight, just above where it will rest, then let it fall.
    // The lanyard is a little elastic, so it catches the badge with a soft bounce.
    pts = [];
    var lift = Math.max(ropeLen + CARD * 0.6, anchor.y + CARD + 40);
    for (var i = 0; i <= SEGMENTS; i++) pts.push(P(anchor.x, anchor.y + i * seg * 0.3 - lift, i === 0 ? 0 : 1));
    pts[0].x = pts[0].px = anchor.x; pts[0].y = pts[0].py = anchor.y;
    var top = pts[SEGMENTS];
    top.inv = 0.25;
    top.x += 10; top.px = top.x;
    bottom = P(top.x, top.y + CARD, 0.25);
  }

  // ---- dragging ----
  var drag = null;
  var hovering = false;
  badge.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hovering = true; });
  badge.addEventListener("pointerleave", function () { hovering = false; });       // { id, lx, ly, x, y, startX, startY, moved, t }
  var justDragged = false;

  function cardAngle() {
    var top = pts[SEGMENTS];
    return Math.atan2(-(bottom.x - top.x), bottom.y - top.y);
  }
  function localToWorld(lx, ly) {
    var top = pts[SEGMENTS], a = cardAngle(), c = Math.cos(a), s = Math.sin(a);
    return { x: top.x + lx * c - ly * s, y: top.y + lx * s + ly * c };
  }
  function stagePoint(e) {
    var r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  badge.addEventListener("pointerdown", function (e) {
    if (!pts.length) return;
    if (reduce || e.button > 0 || e.target.closest("a")) return;
    var p = stagePoint(e);
    var top = pts[SEGMENTS], a = -cardAngle(), c = Math.cos(a), s = Math.sin(a);
    var dx = p.x - top.x, dy = p.y - top.y;
    drag = { id: e.pointerId, lx: dx * c - dy * s, ly: dx * s + dy * c, x: p.x, y: p.y, startX: p.x, startY: p.y, moved: false };
    try { badge.setPointerCapture(e.pointerId); } catch (err) {}
    wake();
  });
  badge.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var p = stagePoint(e);
    drag.x = p.x; drag.y = p.y;
    if (!drag.moved && Math.hypot(p.x - drag.startX, p.y - drag.startY) > 10) {
      drag.moved = true;
      badge.classList.add("is-dragging");
    }
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    justDragged = drag.moved;
    drag = null;
    pts.concat([bottom]).forEach(function (p) {
      var vx = p.x - p.px, vy = p.y - p.py, v = Math.hypot(vx, vy), cap = 6;
      if (v > cap) { p.px = p.x - vx / v * cap; p.py = p.y - vy / v * cap; }
    });
    badge.classList.remove("is-dragging");
  }
  badge.addEventListener("pointerup", endDrag);
  badge.addEventListener("pointercancel", endDrag);

  // Tap, click, Enter or Space flips the card. A drag doesn't.
  var backLinks = badge.querySelectorAll(".badge-links a");
  function flip() {
    var flipped = badge.getAttribute("aria-pressed") === "true";
    badge.setAttribute("aria-pressed", flipped ? "false" : "true");
    // links on the back are only reachable by keyboard while the back is showing
    backLinks.forEach(function (a) { a.tabIndex = flipped ? -1 : 0; });
    // a little kick so the flip feels physical
    if (!reduce) { bottom.px += flipped ? 1.2 : -1.2; wake(); }
  }
  badge.addEventListener("click", function (e) {
    if (e.target.closest("a")) return;          // let the LinkedIn and Email links work
    if (justDragged) { justDragged = false; return; }
    flip();
  });
  badge.addEventListener("keydown", function (e) {
    if (e.target !== badge) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
  });

  // ---- physics step ----
  var GRAVITY = 2200, DAMP = 0.978, t = 0;

  function constrain(a, b, len, stiff, slack) {
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    if (slack && d < len) return;            // rope can go slack, it just can't stretch
    var w = a.inv + b.inv; if (!w) return;
    var diff = (d - len) / d * stiff;
    a.x += dx * diff * (a.inv / w); a.y += dy * diff * (a.inv / w);
    b.x -= dx * diff * (b.inv / w); b.y -= dy * diff * (b.inv / w);
  }

  function step(dt) {
    if (!pts.length) return;
    t += dt;
    var all = pts.concat([bottom]);
    for (var i = 0; i < all.length; i++) {
      var p = all[i]; if (!p.inv) continue;
      var vx = (p.x - p.px) * DAMP, vy = (p.y - p.py) * DAMP;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + GRAVITY * dt * dt;
    }
    // a soft breeze so it keeps gently swaying
    if (hovering && !drag) {
      // settle quickly and stop the breeze while someone is pointing at the card
      all.forEach(function (p) { if (p.inv) { p.px += (p.x - p.px) * 0.12; p.py += (p.y - p.py) * 0.12; } });
    } else {
      bottom.x += Math.sin(t * 1.1) * 0.012 + Math.sin(t * 0.37) * 0.008;
    }

    if (drag && drag.moved) {
      var g = localToWorld(drag.lx, drag.ly);
      var mx = (drag.x - g.x) * 0.12, my = (drag.y - g.y) * 0.12;
      var top = pts[SEGMENTS];
      // weight the pull toward whichever end of the card was grabbed, so it pivots naturally
      var f = Math.max(0, Math.min(1, drag.ly / CARD));
      top.x += mx * (1 - f) * 1.6; top.y += my * (1 - f) * 1.6;
      bottom.x += mx * f * 1.6; bottom.y += my * f * 1.6;
    }

    // The lanyard is slightly elastic (it stretches more while you pull it); the card itself is rigid.
    var ropeStiff = drag && drag.moved ? 0.15 : 0.35;
    for (var k = 0; k < 12; k++) {
      pts[0].x = anchor.x; pts[0].y = anchor.y;
      if (k < 4) for (var j = 0; j < SEGMENTS; j++) constrain(pts[j], pts[j + 1], seg, ropeStiff, true);
      else for (var j2 = 0; j2 < SEGMENTS - 1; j2++) constrain(pts[j2], pts[j2 + 1], seg, 1, true);
      constrain(pts[SEGMENTS], bottom, CARD, 1, false);
    }
    // keep the clip end inside the mat so the badge can't be thrown away
    var top = pts[SEGMENTS];
    top.y = Math.min(top.y, stage.clientHeight - 40);
    top.x = Math.max(20, Math.min(stage.clientWidth - 20, top.x));
  }

  // ---- drawing ----
  function strapPath(offset) {
    ctx.beginPath();
    for (var i = 0; i <= SEGMENTS; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(SEGMENTS, i + 1)];
      var nx = -(b.y - a.y), ny = b.x - a.x, l = Math.hypot(nx, ny) || 1;
      var x = pts[i].x + nx / l * offset, y = pts[i].y + ny / l * offset;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }

  function draw() {
    if (!pts.length) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round"; ctx.lineCap = "round";

    // shadow, strap, then stitching down both edges
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
    strapPath(0); ctx.strokeStyle = "#0B2238"; ctx.lineWidth = 18; ctx.stroke();
    ctx.restore();
    strapPath(0); ctx.strokeStyle = "#112E4B"; ctx.lineWidth = 12; ctx.stroke();
    ctx.setLineDash([5, 5]); ctx.strokeStyle = "rgba(253,253,251,0.7)"; ctx.lineWidth = 1.4;
    strapPath(6.5); ctx.stroke(); strapPath(-6.5); ctx.stroke();
    ctx.setLineDash([]);

    if (showPin) {
      ctx.beginPath(); ctx.arc(anchor.x, anchor.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF"; ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.beginPath(); ctx.arc(anchor.x - 2.5, anchor.y - 2.5, 3, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    }

    // place the badge so its clip sits on the end of the strap
    var top = pts[SEGMENTS], a = cardAngle();
    badge.style.transform = "translate(" + (top.x - W / 2).toFixed(2) + "px," + top.y.toFixed(2) + "px) rotate(" + a.toFixed(4) + "rad)";
    // a slight turn in 3D when it moves sideways, so it reads as a real card
    var vx = bottom.x - bottom.px;
    var turn = Math.max(-14, Math.min(14, vx * 1.4));
    tilt.style.transform = "perspective(900px) rotateY(" + turn.toFixed(2) + "deg)";
  }

  // ---- loop ----
  var running = false, last = 0, acc = 0, visible = true, still = 0;
  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    acc += dt;
    var h = 1 / 120;
    while (acc >= h) { step(h); acc -= h; }
    draw();
    requestAnimationFrame(frame);
  }
  function wake() {
    if (running || reduce || !visible) return;
    running = true; last = performance.now(); requestAnimationFrame(frame);
  }
  function sleep() { running = false; }

  function start() {
    measure();
    if (reduce) { restPose(); draw(); badge.classList.add("is-ready"); return; }
    dropPose(); draw(); badge.classList.add("is-ready"); wake();
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) wake(); else sleep();
    }).observe(stage);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      measure();
      if (reduce) { restPose(); draw(); }
      else if (pts.length) { pts.forEach(function (p) {}); wake(); }
    }, 120);
  });

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
})();
