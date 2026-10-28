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

// Paragraphs sometimes end with two or three lonely words on the last line.
// If the last line is very short, glue the final few words together so more of them move down with it.
(function () {
  var NBSP = " ";
  var saved = [];
  function lines(el) {
    var r = document.createRange(); r.selectNodeContents(el);
    var rows = [];
    Array.prototype.forEach.call(r.getClientRects(), function (x) {
      if (x.width < 1) return;
      var row = rows.find(function (o) { return Math.abs(o.top - x.top) < 6; });
      if (row) { row.left = Math.min(row.left, x.left); row.right = Math.max(row.right, x.right); }
      else rows.push({ top: x.top, left: x.left, right: x.right });
    });
    rows.sort(function (a, b) { return a.top - b.top; });
    return rows;
  }
  function lastText(el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n, last = null;
    while ((n = w.nextNode())) if (n.nodeValue.trim()) last = n;
    return last;
  }
  function fix() {
    saved.forEach(function (s) { s.node.nodeValue = s.text; }); saved = [];
    document.querySelectorAll("main p, main li, .site-footer p").forEach(function (p) {
      if (p.closest(".cs2-stats, .tags, .cs2-toc, .badge, .sticker-mount, .cs2-quote, .cs2-result")) return;
      var rows = lines(p);
      if (rows.length < 2) return;
      var width = Math.max.apply(null, rows.map(function (o) { return o.right - o.left; }));
      var tail = rows[rows.length - 1];
      if ((tail.right - tail.left) / width >= 0.3) return;
      var node = lastText(p); if (!node) return;
      var original = node.nodeValue; saved.push({ node: node, text: original });
      for (var k = 2; k <= 6; k++) {
        var parts = original.replace(/\s+$/, "").split(" ");
        if (parts.length <= k) break;
        node.nodeValue = parts.slice(0, parts.length - k).join(" ") + " " + parts.slice(-k).join(NBSP);
        var r2 = lines(p), t2 = r2[r2.length - 1];
        if ((t2.right - t2.left) / width >= 0.3) break;
      }
    });
  }
  var timer;
  function later() { clearTimeout(timer); timer = setTimeout(fix, 150); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fix); else window.addEventListener("load", fix);
  window.addEventListener("resize", later);
})();

// Analytics: name the clicks that matter for a portfolio so they're easy to find in Google Analytics.
(function () {
  if (typeof window.gtag !== "function") return;
  var projects = { "accenture": "Wildlight", "sewjo-merchant-dashboard": "Merchant Dashboard", "sewjo-challenges": "Challenges", "sewjo": "StitchLog" };
  function where(a) {
    if (a.closest(".site-header")) return "header";
    if (a.closest(".site-footer")) return "footer";
    if (a.closest(".mat")) return "hero";
    if (a.closest(".badge")) return "badge";
    return "page";
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var page = location.pathname;
    if (/Resume\.pdf$/i.test(href)) {
      gtag("event", "resume_click", { link_location: where(a), page_path: page });
    } else if (/linkedin\.com\/in\//i.test(href)) {
      gtag("event", "linkedin_click", { link_location: where(a), page_path: page });
    } else if (/^mailto:/i.test(href)) {
      gtag("event", "email_click", { link_location: where(a), page_path: page });
    } else if (a.classList.contains("project") || a.classList.contains("cs2-next")) {
      var slug = (href.match(/([a-z-]+)\/(index\.html)?$/) || [])[1];
      gtag("event", "case_study_open", {
        project: projects[slug] || slug || href,
        opened_from: a.classList.contains("cs2-next") ? "next_project" : "homepage",
        page_path: page
      });
    }
  });
})();
