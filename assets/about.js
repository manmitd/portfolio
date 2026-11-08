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

