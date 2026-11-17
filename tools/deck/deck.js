/* Deck engine. Reads window.DECK (set by the company's slides.js) and renders it.
   Audience view by default; ?presenter opens the presenter view (current, next, notes, timer).
   Both windows stay in step over BroadcastChannel. No content lives in this file. */
(function () {
  "use strict";
  var DECK = window.DECK;
  if (!DECK || !DECK.slides || !DECK.slides.length) { document.body.textContent = "No slides found."; return; }

  var slides = DECK.slides;
  var total = slides.length;
  var params = new URLSearchParams(location.search);
  var isPresenter = params.has("presenter");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var channel = "BroadcastChannel" in window ? new BroadcastChannel("deck-" + String(DECK.company || "deck").toLowerCase()) : null;
  var current = 0;

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function marked(text, word) {
    var t = esc(text);
    if (!word) return t;
    var w = esc(word), i = t.indexOf(w);
    return i < 0 ? t : t.slice(0, i) + "<em>" + w + "</em>" + t.slice(i + w.length);
  }
  function slideTitle(s) { return s.headline || s.kicker || ("Slide"); }
  function mediaHtml(m, extra) {
    if (!m) return "";
    var cls = "media" + (extra ? " " + extra : "");
    if (m.type === "video") {
      return '<figure class="' + cls + '"><video muted loop playsinline preload="metadata"' + (m.poster ? ' poster="' + esc(m.poster) + '"' : "") +
        ' aria-label="' + esc(m.alt || "") + '"><source src="' + esc(m.src) + '" type="video/mp4"></video></figure>';
    }
    return '<figure class="' + cls + '"><img src="' + esc(m.src) + '" alt="' + esc(m.alt || "") + '" decoding="async"></figure>';
  }
  function list(items, cls) {
    if (!items || !items.length) return "";
    return '<ul class="' + cls + '">' + items.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>";
  }
  function kicker(s) { return s.kicker ? '<p class="kicker">' + esc(s.kicker) + "</p>" : ""; }

  /* ---------- layouts ---------- */
  var layouts = {
    title: function (s) {
      return '<div><p class="kicker">' + esc(s.kicker || "") + '</p><h1 class="headline">' + marked(s.headline, s.mark) + "</h1>" +
        (s.byline ? '<p class="byline">' + esc(s.byline) + "</p>" : "") + "</div>" + mediaHtml(s.media);
    },
    facts: function (s) {
      var facts = (s.facts || []).map(function (f) {
        var v = /^shipped$/i.test(f[1]) ? '<span class="status">' + esc(f[1]) + "</span>" : esc(f[1]);
        return "<div><dt>" + esc(f[0]) + "</dt><dd>" + v + "</dd></div>";
      }).join("");
      var scope = s.scope || "", m = scope.match(/^([^:]+:)\s*(.*)$/);
      var scopeHtml = scope ? '<p class="scope">' + (m ? "<b>" + esc(m[1]) + "</b> " + esc(m[2]) : esc(scope)) + "</p>" : "";
      return '<h2 class="headline">' + esc(s.headline) + '</h2><dl class="facts">' + facts + "</dl>" + scopeHtml;
    },
    points: function (s) {
      return "<div>" + kicker(s) + '<h2 class="headline">' + marked(s.headline, s.mark) + "</h2>" + list(s.points, "points") + "</div>" + mediaHtml(s.media);
    },
    quote: function (s) {
      return kicker(s) + '<h2 class="headline">' + marked(s.headline, s.mark) + "</h2>" +
        (s.points && s.points.length ? '<p class="sub">' + esc(s.points.join(" ")) + "</p>" : "");
    },
    steps: function (s) {
      return kicker(s) + '<h2 class="headline">' + marked(s.headline, s.mark) + "</h2>" + list(s.points, "steps") + mediaHtml(s.media);
    },
    stats: function (s) {
      var stats = (s.stats || []).map(function (x) { return "<div><b>" + esc(x[0]) + "</b><span>" + esc(x[1]) + "</span></div>"; }).join("");
      return kicker(s) + '<div class="stats">' + stats + '</div><h2 class="headline">' + marked(s.headline, s.mark) + "</h2>";
    },
    fix: function (s) {
      var extra = s.media && /map/.test(s.media.src) ? "r-map" : "";
      return "<div>" + kicker(s) + '<h2 class="headline">' + marked(s.headline, s.mark) + '</h2><dl class="pair">' +
        "<div><dt>Problem</dt><dd>" + esc(s.problem) + '</dd></div><div class="sol"><dt>Solution</dt><dd>' + esc(s.solution) + "</dd></div></dl></div>" +
        mediaHtml(s.media, extra);
    },
    loop: function (s) {
      var c = (s.cycle || []).slice(0, 4);
      var nodes = c.map(function (t, i) { return '<li class="n' + i + '"><span>0' + (i + 1) + "</span>" + esc(t) + "</li>"; }).join("");
      return "<div>" + kicker(s) + '<h2 class="headline">' + marked(s.headline, s.mark) + "</h2>" + list(s.points, "points") + "</div>" +
        '<div class="cycle" role="img" aria-label="' + esc(c.join(", then ") + ", then repeat") + '"><ol aria-hidden="true">' + nodes + "</ol>" +
        '<svg viewBox="0 0 560 560" aria-hidden="true"><defs><marker id="ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#5277A0"/></marker></defs>' +
        '' + ['M228 120H332','M440 228V332','M332 440H228','M120 332V228'].map(function (d) { return '<path d="' + d + '" stroke="#5277A0" stroke-width="3" fill="none" marker-end="url(#ah)"/>'; }).join('') + '</svg>' +
        '<p class="again">and again</p></div>';
    },
    bigstat: function (s) {
      var big = esc(s.stat).replace(/ of /, " <em>of</em> ");
      return kicker(s) + '<p class="big">' + big + '</p><h2 class="headline">' + esc(s.headline) + "</h2>";
    },
    end: function (s) {
      return '<h2 class="headline">' + esc(s.headline) + "</h2>" + (s.sub ? '<p class="sub">' + esc(s.sub) + "</p>" : "") +
        (DECK.author ? '<p class="byline">' + esc(DECK.author) + "</p>" : "");
    }
  };

  function slideHtml(s, i) {
    var layout = layouts[s.layout] ? s.layout : "points";
    var cls = "slide l-" + layout;
    if (s.media) cls += " has-media";
    if (s.media && s.media.portrait) cls += " portrait";
    if (s.points && s.points.length > 4) cls += " dense";
    return '<section class="' + cls + '" data-index="' + i + '" aria-roledescription="slide" aria-label="' + (i + 1) + " of " + total + '">' + layouts[layout](s) + "</section>";
  }

  function stageHtml(only) {
    var inner = only == null ? slides.map(slideHtml).join("") : (only < total ? slideHtml(slides[only], only) : "");
    return '<div class="stage">' + inner +
      '<div class="chrome" aria-hidden="true"><span class="who">' + esc(DECK.author || "") + "</span><span>" + esc(DECK.title || "") + "</span></div>" +
      '<div class="progress" aria-hidden="true"><span></span></div></div>';
  }

  /* ---------- video ---------- */
  function syncVideos(root, activeSlide, allowPlay) {
    root.querySelectorAll("video").forEach(function (v) {
      var on = activeSlide && activeSlide.contains(v);
      if (reduce) v.controls = true;
      if (on && allowPlay && !reduce) { try { v.currentTime = 0; } catch (e) {} var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else if (!on) v.pause();
    });
  }

  /* ---------- navigation (shared) ---------- */
  function clamp(n) { return Math.max(0, Math.min(total - 1, n)); }
  function setHash(n) {
    var h = "#slide-" + (n + 1);
    if (location.hash !== h) history.replaceState(null, "", location.pathname + location.search + h);
  }
  function fromHash() { var m = /slide-(\d+)/.exec(location.hash); return m ? clamp(parseInt(m[1], 10) - 1) : 0; }

  var render; // set by the active view
  function go(n, opts) {
    n = clamp(n);
    var changed = n !== current;
    current = n;
    setHash(n);
    render(n);
    if (channel && !(opts && opts.silent)) channel.postMessage({ type: "go", n: n });
    return changed;
  }
  if (channel) channel.onmessage = function (e) {
    var d = e.data || {};
    if (d.type === "go" && typeof d.n === "number" && d.n !== current) go(d.n, { silent: true });
    if (d.type === "hello" && !isPresenter) channel.postMessage({ type: "go", n: current });
  };
  window.addEventListener("hashchange", function () { var n = fromHash(); if (n !== current) go(n); });

  /* digits: buffer briefly, then jump */
  var digitBuf = "", digitTimer = null, jumpEl;
  function pushDigit(d) {
    digitBuf = (digitBuf + d).slice(-2);
    if (jumpEl) { jumpEl.textContent = "Go to " + digitBuf; jumpEl.classList.add("show"); }
    clearTimeout(digitTimer);
    digitTimer = setTimeout(function () {
      var n = parseInt(digitBuf, 10); digitBuf = "";
      if (jumpEl) jumpEl.classList.remove("show");
      if (n >= 1) go(n - 1);
    }, 800);
  }

  function commonKeys(e, extra) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (extra && extra(e)) return;
    if (k === "ArrowRight" || k === "ArrowDown" || k === " " || k === "PageDown" || k === "Enter") { e.preventDefault(); go(current + 1); }
    else if (k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp" || k === "Backspace") { e.preventDefault(); go(current - 1); }
    else if (k === "Home" || k === "Escape") { e.preventDefault(); go(0); }
    else if (k === "End") { e.preventDefault(); go(total - 1); }
    else if (/^[0-9]$/.test(k)) { e.preventDefault(); pushDigit(k); }
  }

  /* ================= Audience view ================= */
  function audience() {
    document.title = DECK.title || "Slides";
    document.body.innerHTML =
      '<main class="viewport" id="viewport">' + stageHtml() + "</main>" +
      '<p class="visually-hidden" id="live" aria-live="polite" aria-atomic="true"></p>' +
      '<div class="jump" id="jump" aria-hidden="true"></div>' +
      '<div class="menu" id="menu" role="dialog" aria-modal="true" aria-labelledby="menu-h"><div class="menu-panel"><h2 id="menu-h">Slides</h2><ol>' +
      slides.map(function (s, i) { return '<li><button type="button" data-go="' + i + '"><span>' + (i + 1) + "</span>" + esc(slideTitle(s)) + "</button></li>"; }).join("") +
      "</ol></div></div>";

    var stage = document.querySelector(".stage");
    var els = Array.prototype.slice.call(stage.querySelectorAll(".slide"));
    var bar = stage.querySelector(".progress span");
    var live = document.getElementById("live");
    var menu = document.getElementById("menu");
    jumpEl = document.getElementById("jump");
    var announced = false;

    function fit() {
      var s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
      stage.style.transform = "translate(-50%, -50%) scale(" + s + ")";
    }
    window.addEventListener("resize", fit); fit();

    render = function (n) {
      els.forEach(function (el, i) {
        var on = i === n;
        el.classList.toggle("is-current", on);
        el.setAttribute("aria-hidden", on ? "false" : "true");
        if (on) el.removeAttribute("inert"); else el.setAttribute("inert", "");
      });
      bar.style.width = ((n + 1) / total * 100) + "%";
      syncVideos(stage, els[n], true);
      var msg = "Slide " + (n + 1) + " of " + total + ": " + slideTitle(slides[n]);
      if (announced) live.textContent = msg; else announced = true; // no announcement on first paint
      menu.querySelectorAll("button").forEach(function (b, i) { b.setAttribute("aria-current", i === n ? "true" : "false"); });
    };

    /* menu */
    var lastFocus = null;
    function openMenu() { lastFocus = document.activeElement; menu.classList.add("open"); var b = menu.querySelector('[aria-current="true"]') || menu.querySelector("button"); b.focus(); }
    function closeMenu() { menu.classList.remove("open"); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    menu.addEventListener("click", function (e) {
      var b = e.target.closest("[data-go]");
      if (b) { closeMenu(); go(parseInt(b.getAttribute("data-go"), 10)); }
      else if (e.target === menu) closeMenu();
    });

    /* presenter window */
    var pvWin = null;
    function openPresenter() {
      var url = location.pathname + "?presenter" + location.hash;
      // Not noopener: the new window needs this tab's session so it opens unlocked.
      pvWin = window.open(url, "deck-presenter", "width=1280,height=800");
      if (pvWin) pvWin.focus();
    }

    function fullscreen() {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
    }

    document.addEventListener("keydown", function (e) {
      if (menu.classList.contains("open")) {
        if (e.key === "Escape" || e.key === "g" || e.key === "m") { e.preventDefault(); closeMenu(); }
        else if (e.key === "Tab") { // keep focus in the menu
          var bs = menu.querySelectorAll("button"), first = bs[0], last = bs[bs.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
        return;
      }
      commonKeys(e, function (ev) {
        var k = ev.key.toLowerCase();
        if (k === "g" || k === "m") { ev.preventDefault(); openMenu(); return true; }
        if (k === "p") { ev.preventDefault(); openPresenter(); return true; }
        if (k === "f") { ev.preventDefault(); fullscreen(); return true; }
        return false;
      });
    });

    document.getElementById("viewport").addEventListener("click", function (e) {
      if (e.target.closest("button, a, video[controls]")) return;
      go(current + 1);
    });

    /* hide the cursor when idle so it doesn't sit on the share */
    var idleT;
    function wake() { document.body.classList.remove("idle"); clearTimeout(idleT); idleT = setTimeout(function () { document.body.classList.add("idle"); }, 2000); }
    document.addEventListener("mousemove", wake); wake();

    current = fromHash();
    go(current, { silent: true });
  }

  /* ================= Presenter view ================= */
  function presenter() {
    document.title = "Presenter · " + (DECK.title || "Slides");
    document.body.classList.add("presenter");
    document.body.innerHTML =
      '<div class="pv">' +
      '<div class="pv-bar"><span class="timer" id="timer" role="timer" aria-label="Elapsed time">00:00</span><button type="button" id="reset">Reset (R)</button>' +
      '<span class="count" id="count"></span><span id="clock"></span>' +
      '<span class="hint">→ / Space next · ← back · Home first · type a number to jump · R reset timer</span></div>' +
      '<section class="pv-main"><p class="pv-label">Now showing</p><div class="pv-frame" id="cur"></div>' +
      '<p class="pv-label">Notes</p><div class="pv-notes" id="notes" aria-live="polite"></div></section>' +
      '<aside class="pv-side"><p class="pv-label">Up next</p><div class="pv-frame next" id="next"></div><p class="pv-label" id="next-title"></p></aside>' +
      "</div>" +
      '<div class="jump" id="jump" aria-hidden="true"></div>';
    jumpEl = document.getElementById("jump");

    var cur = document.getElementById("cur"), nxt = document.getElementById("next");
    var notes = document.getElementById("notes"), count = document.getElementById("count"), nextTitle = document.getElementById("next-title");

    function scaleFrame(frame) {
      var st = frame.querySelector(".stage");
      if (st) st.style.transform = "scale(" + frame.clientWidth / 1600 + ")";
    }
    if ("ResizeObserver" in window) new ResizeObserver(function () { scaleFrame(cur); scaleFrame(nxt); }).observe(document.body);
    else window.addEventListener("resize", function () { scaleFrame(cur); scaleFrame(nxt); });

    function paint(frame, n, play) {
      if (n >= total) { frame.innerHTML = '<div class="pv-end" style="position:absolute;inset:0">End of deck</div>'; return; }
      frame.innerHTML = stageHtml(n);
      var sl = frame.querySelector(".slide");
      sl.classList.add("is-current");
      frame.querySelector(".progress span").style.width = ((n + 1) / total * 100) + "%";
      scaleFrame(frame);
      syncVideos(frame, play ? sl : null, play);
    }

    render = function (n) {
      paint(cur, n, true);
      paint(nxt, n + 1, false);
      var note = slides[n].notes || "";
      notes.textContent = note || "No notes for this slide.";
      notes.classList.toggle("empty", !note);
      count.textContent = (n + 1) + " / " + total;
      nextTitle.textContent = n + 1 < total ? (n + 2) + ". " + slideTitle(slides[n + 1]) : "";
    };

    /* timer */
    var start = Date.now();
    function pad(x) { return (x < 10 ? "0" : "") + x; }
    function tick() {
      var s = Math.floor((Date.now() - start) / 1000);
      var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
      document.getElementById("timer").textContent = (h ? h + ":" + pad(m) : pad(m)) + ":" + pad(s % 60);
      var d = new Date();
      document.getElementById("clock").textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    setInterval(tick, 500); tick();
    function reset() { start = Date.now(); tick(); }
    document.getElementById("reset").addEventListener("click", reset);

    document.addEventListener("keydown", function (e) {
      commonKeys(e, function (ev) {
        if (ev.key.toLowerCase() === "r") { ev.preventDefault(); reset(); return true; }
        if (ev.key === "Enter" && ev.target.closest && ev.target.closest("button")) return true;
        return false;
      });
    });

    current = fromHash();
    go(current, { silent: true });
    if (channel) channel.postMessage({ type: "hello" });
  }

  if (isPresenter) presenter(); else audience();
})();
