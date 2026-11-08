// About page: sections ease in as they arrive, and a doodle plane flies from Toronto to Vancouver
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  if (!reduce && "IntersectionObserver" in window) root.classList.add("ab-js");

  var pair = document.querySelector("[data-route]");
  var line = pair && pair.querySelector(".ab-route-line");
  var reveal = pair && pair.querySelector(".ab-route-reveal");
  var plane = pair && pair.querySelector(".ab-plane");

  function place(t) {
    var L = line.getTotalLength(), d = Math.min(L, t * L);
    var p = line.getPointAtLength(d), q = line.getPointAtLength(Math.min(L, d + 1)), o = line.getPointAtLength(Math.max(0, d - 1));
    var a = Math.atan2(q.y - o.y, q.x - o.x) * 180 / Math.PI;
    plane.setAttribute("transform", "translate(" + p.x.toFixed(1) + " " + p.y.toFixed(1) + ") rotate(" + (a + 20).toFixed(1) + ") translate(-14 -13)");
    reveal.style.strokeDashoffset = (1 - t).toFixed(4);
  }
  var flying = false;
  function landed() { flying = false; document.dispatchEvent(new CustomEvent("abflown")); }
  function fly(again) {
    if (!line || flying) return;
    flying = true;
    plane.style.opacity = 1;
    if (reduce) {   // no flight: hop back to Toronto, then appear in Vancouver
      if (again) { place(0); setTimeout(function () { place(1); landed(); }, 350); }
      else { place(1); landed(); }
      return;
    }
    var start = null, DUR = 2600;
    function step(now) {
      if (start === null) start = now;
      var x = Math.min(1, (now - start) / DUR);
      var t = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;   // ease in and out
      place(t);
      if (x < 1) requestAnimationFrame(step); else landed();
    }
    place(0);
    setTimeout(function () { requestAnimationFrame(step); }, again ? 150 : 450);
  }
  window.__abFly = function () { fly(true); };

  var targets = [].slice.call(document.querySelectorAll(".ab-sec, .ab-pair"));
  if (!("IntersectionObserver" in window)) { targets.forEach(function (el) { el.classList.add("is-in"); }); fly(); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      if (e.target === pair) fly();
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -20% 0px" });
  targets.forEach(function (el) { io.observe(el); });
})();

// Photo viewer: every print on the page can be clicked (or tapped) to bring it forward, with arrows to flip through
(function () {
  var prints = [].slice.call(document.querySelectorAll("main .ab-print"));
  if (!prints.length) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function info(fig) {
    var img = fig.querySelector("img"), li = fig.closest("li"), title = "", text = "";
    var h3 = li && li.querySelector("h3"), p = li && li.querySelector("h3 + p");
    var cap = fig.querySelector("figcaption");
    if (h3) { title = h3.textContent; text = p ? p.textContent : ""; }
    else if (cap) { var c = cap.cloneNode(true), n = c.querySelector("span"); if (n) n.remove(); text = c.textContent.trim(); }
    else if (fig.classList.contains("ab-bye-photo")) text = "Thanks for stopping by.";
    var src = img.getAttribute("src").replace("-640.webp", "-1200.webp");
    return { src: src, alt: img.alt, title: title, text: text };
  }

  var box = document.createElement("div");
  box.className = "ab-viewer"; box.hidden = true;
  box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Photo");
  box.innerHTML =
    '<button type="button" class="ab-viewer-btn ab-viewer-close">Close <span aria-hidden="true">✕</span></button>' +
    '<button type="button" class="ab-viewer-btn ab-viewer-prev" aria-label="Previous photo">←</button>' +
    '<figure class="ab-viewer-card"><img alt=""><figcaption><p class="ab-viewer-text"></p><span class="ab-viewer-count"></span></figcaption></figure>' +
    '<button type="button" class="ab-viewer-btn ab-viewer-next" aria-label="Next photo">→</button>';
  document.body.appendChild(box);
  var card = box.querySelector(".ab-viewer-card"), big = card.querySelector("img"),
      text = card.querySelector(".ab-viewer-text"), count = card.querySelector(".ab-viewer-count"),
      closeBtn = box.querySelector(".ab-viewer-close");
  var at = 0, opener = null;

  function show(i) {
    at = (i + prints.length) % prints.length;
    var d = info(prints[at]);
    big.src = d.src; big.alt = d.alt;
    text.innerHTML = "";
    if (d.title) { var s = document.createElement("strong"); s.textContent = d.title; text.appendChild(s); }
    text.appendChild(document.createTextNode(d.text));
    count.textContent = String(at + 1).padStart(2, "0") + " / " + String(prints.length).padStart(2, "0");
  }
  function open(i) {
    opener = document.activeElement;
    show(i);
    box.hidden = false;
    document.documentElement.classList.add("ab-viewing");
    requestAnimationFrame(function () { box.classList.add("is-on"); });
    closeBtn.focus();
  }
  function close() {
    box.classList.remove("is-on");
    document.documentElement.classList.remove("ab-viewing");
    setTimeout(function () { box.hidden = true; }, reduce ? 0 : 300);
    if (opener && opener.focus) opener.focus();
  }
  function step(dir) {
    if (reduce) { show(at + dir); return; }
    card.style.transition = "transform 0.18s ease, opacity 0.18s ease";
    card.style.transform = "translateX(" + (-dir * 24) + "px)"; card.style.opacity = "0";
    setTimeout(function () {
      show(at + dir);
      card.style.transition = "none"; card.style.transform = "translateX(" + (dir * 24) + "px)";
      requestAnimationFrame(function () {
        card.style.transition = "transform 0.3s cubic-bezier(.32,.72,0,1), opacity 0.25s ease";
        card.style.transform = ""; card.style.opacity = "";
      });
    }, 180);
  }

  prints.forEach(function (fig, i) {
    if (fig.classList.contains("ab-flip")) {   // hobby prints flip on click; their corner button opens the viewer
      var ex = fig.parentNode.querySelector(".ab-expand");
      if (ex) ex.addEventListener("click", function (e) { e.stopPropagation(); open(i); });
      return;
    }
    var d = info(fig);
    fig.setAttribute("role", "button"); fig.setAttribute("tabindex", "0");
    fig.setAttribute("aria-label", "Open photo: " + (d.title || d.text || d.alt));
    fig.setAttribute("data-cur", "Take a look");
    fig.addEventListener("click", function () { open(i); });
    fig.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); } });
  });
  closeBtn.addEventListener("click", close);
  box.querySelector(".ab-viewer-prev").addEventListener("click", function () { step(-1); });
  box.querySelector(".ab-viewer-next").addEventListener("click", function () { step(1); });
  box.addEventListener("click", function (e) { if (e.target === box) close(); });
  document.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "Tab") {   // keep focus inside the viewer
      var f = [].slice.call(box.querySelectorAll("button")), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  var sx = null;
  card.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
  card.addEventListener("touchend", function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
  });
})();

// Hobby prints: click or tap to turn one over and read the note on the back. Only one is turned over at a time.
(function () {
  var flips = [].slice.call(document.querySelectorAll(".ab-flip"));
  function set(fig, on) {
    fig.classList.toggle("is-flipped", on);
    fig.parentNode.classList.toggle("is-flipped", on);
    fig.setAttribute("aria-pressed", on ? "true" : "false");
    var back = fig.querySelector(".ab-back"), front = fig.querySelector(".ab-front");
    back.setAttribute("aria-hidden", on ? "false" : "true");
    front.setAttribute("aria-hidden", on ? "true" : "false");
    fig.setAttribute("data-cur", on ? "Flip back" : "Flip me");
  }
  function toggle(fig) {
    var on = !fig.classList.contains("is-flipped");
    flips.forEach(function (f) { if (f !== fig && f.classList.contains("is-flipped")) set(f, false); });
    set(fig, on);
  }
  flips.forEach(function (fig) {
    fig.setAttribute("data-cur", "Flip me");
    fig.addEventListener("click", function () { toggle(fig); });
    fig.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(fig); } });
  });
})();

// Plane: click it (or "One more trip?") to fly Toronto to Vancouver again
(function () {
  var pair = document.querySelector("[data-route]"); if (!pair) return;
  var plane = pair.querySelector(".ab-plane"), btn = pair.querySelector(".ab-replay");
  function placeBtn() {
    var route = pair.querySelector(".ab-route").getBoundingClientRect(), pr = pair.getBoundingClientRect();
    btn.style.left = (route.left - pr.left + route.width / 2 - btn.offsetWidth / 2) + "px";   // tucked under the top of the arc
    btn.style.top = (route.top - pr.top + route.height * 0.22) + "px";
  }
  function replay() { if (window.__abFly) window.__abFly(); }
  plane.addEventListener("click", replay);
  btn.addEventListener("click", replay);
  document.addEventListener("abflown", function () {
    btn.hidden = false; placeBtn();
    requestAnimationFrame(function () { btn.classList.add("is-shown"); });
  });
  window.addEventListener("resize", function () { if (!btn.hidden) placeBtn(); });
})();

// Toolkit: hover, click or tap an icon for a one-line note. Click elsewhere, press Escape or pick the icon again to close.
(function () {
  var wrap = document.querySelector(".ab-toolkit"); if (!wrap) return;
  var note = wrap.querySelector(".ab-tool-note"), nameEl = note.querySelector(".ab-tool-name"), textEl = note.querySelector(".ab-tool-text");
  var tools = [].slice.call(wrap.querySelectorAll(".ab-tool")), current = null, pinned = false, hideT = null;
  var hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  function show(btn, pin) {
    clearTimeout(hideT);
    if (current && current !== btn) { current.setAttribute("aria-expanded", "false"); current.parentNode.classList.remove("is-open"); }
    current = btn; pinned = pin;
    btn.setAttribute("aria-expanded", "true"); btn.parentNode.classList.add("is-open");
    nameEl.textContent = btn.querySelector(".sr-only").textContent;
    textEl.textContent = btn.getAttribute("data-note");
    note.hidden = false;
    var wr = wrap.getBoundingClientRect(), br = btn.getBoundingClientRect();
    var w = note.offsetWidth, centre = br.left - wr.left + br.width / 2;
    var left = Math.max(0, Math.min(centre - 28, wr.width - w));
    note.style.left = left + "px";
    note.style.top = (br.bottom - wr.top + 12) + "px";
    note.style.setProperty("--notch", (centre - left) + "px");
    requestAnimationFrame(function () { note.classList.add("is-on"); });
  }
  function hide() {
    if (!current) return;
    current.setAttribute("aria-expanded", "false"); current.parentNode.classList.remove("is-open");
    current = null; pinned = false;
    note.classList.remove("is-on");
    hideT = setTimeout(function () { if (!current) note.hidden = true; }, 180);
  }
  tools.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (current === btn && pinned) hide(); else show(btn, true);
    });
    if (hover) {
      btn.addEventListener("mouseenter", function () { if (!pinned) show(btn, false); });
      btn.addEventListener("mouseleave", function () { if (!pinned) hideT = setTimeout(hide, 120); });
    }
  });
  document.addEventListener("click", function (e) { if (current && !note.contains(e.target)) hide(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && current) { var b = current; hide(); b.focus(); }
  });
})();
