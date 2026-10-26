// Screen recordings play only while they're on screen, to save battery and data.
// If someone has reduced motion turned on, recordings don't autoplay and show controls instead.
(function () {
  var videos = document.querySelectorAll("video[data-loop]");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  videos.forEach(function (v) {
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    if (reduce) { v.controls = true; }
  });

  if (reduce || !("IntersectionObserver" in window)) {
    if (!reduce) videos.forEach(function (v) { v.play().catch(function () {}); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.play().catch(function () {}); }
      else { e.target.pause(); }
    });
  }, { threshold: 0.25 });

  videos.forEach(function (v) { io.observe(v); });
})();

// Highlight the current section in the case study contents list.
(function () {
  var links = document.querySelectorAll(".cs2-toc a[href^='#']");
  if (!links.length || !("IntersectionObserver" in window)) return;
  var map = {};
  links.forEach(function (a) { var el = document.getElementById(a.getAttribute("href").slice(1)); if (el) map[el.id] = a; });
  var current = null;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        if (current) current.classList.remove("is-active");
        current = map[e.target.id]; current.classList.add("is-active");
      }
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
})();

// Open every page at the top (unless the link points to a section).
// window.scrollTo covers the real site. When the site is shown inside a frame (like the preview),
// the frame's parent keeps its scroll position, so we also scroll the header into view, and check once
// the page has drawn that the header really is on screen.
(function () {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (location.hash) return;
  var header = document.querySelector(".site-header") || document.body;
  function toTop() {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (header.scrollIntoView) header.scrollIntoView({ block: "start", behavior: "instant" });
  }
  toTop();
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      var e = entries[0];
      if (!e.isIntersecting || e.boundingClientRect.top < 0) toTop();
      io.disconnect();
    });
    io.observe(header);
  }
  window.addEventListener("pageshow", function (e) { if (e.persisted) toTop(); });
})();

// Warm up the case studies before they're clicked: fetch each linked case study page and its
// cover image in the background. Without this, the first visit opened before the cover had
// loaded, so the opening animation stuttered; the second visit was smooth because it was cached.
(function () {
  var css = document.querySelector('link[rel="stylesheet"][href*="site.css"]');
  if (!css) return;
  var base = css.getAttribute("href").replace("site.css", "");           // "assets/" or "../assets/"
  var covers = { "accenture": "img/wl-cover.webp", "sewjo-challenges": "img/ch-cover.webp", "sewjo-merchant-dashboard": "img/sb-cover.webp", "sewjo/": "img/sl-cover.webp" };
  var done = {};
  function warm(href) {
    if (!href || done[href]) return; done[href] = true;
    var l = document.createElement("link"); l.rel = "prefetch"; l.href = href; document.head.appendChild(l);
    for (var key in covers) {
      if (href.indexOf(key) !== -1 && !(key === "sewjo/" && href.indexOf("merchant") !== -1)) {
        var img = new Image(); img.decoding = "async"; img.src = base + covers[key];
      }
    }
  }
  function run() {
    document.querySelectorAll("a.project, a.cs2-next").forEach(function (a) {
      warm(a.getAttribute("href"));
      a.addEventListener("pointerenter", function () { warm(a.getAttribute("href")); });
    });
  }
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 2000 }); else setTimeout(run, 800);
})();
