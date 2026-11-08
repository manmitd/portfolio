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
  function fly() {
    if (!line) return;
    plane.style.opacity = 1;
    if (reduce) { place(1); return; }
    var start = null, DUR = 2600;
    function step(now) {
      if (start === null) start = now;
      var x = Math.min(1, (now - start) / DUR);
      var t = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;   // ease in and out
      place(t);
      if (x < 1) requestAnimationFrame(step);
    }
    place(0);
    setTimeout(function () { requestAnimationFrame(step); }, 450);
  }

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
