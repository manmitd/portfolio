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

// Reading progress for case studies: fills the contents rail (desktop) or a thin top bar (smaller screens).
(function () {
  var body = document.querySelector(".cs2-body");
  if (!body) return;
  var bar = document.createElement("div");
  bar.className = "cs2-progress"; bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  var root = document.documentElement, ticking = false;
  function update() {
    ticking = false;
    var r = body.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
    root.style.setProperty("--read", p.toFixed(4));
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();

// Gentle reveal as sections scroll into view, and numbers that count up once.
// Skipped entirely for people who prefer reduced motion.
(function () {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var targets = document.querySelectorAll(
    ".cs2-section > *:not(.cs2-label), .cs2-fix-body, .cs2-fix-media, .cs2-band, .cs2-statement, .cs2-intro-row, .cs2-facts, .cs2-after-facts, .cs2-next, .project, .about-intro > div, .experience .role"
  );
  if (targets.length) {
    document.documentElement.classList.add("reveal-on");
    var vh = window.innerHeight;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach(function (el) {
      el.classList.add("rv");
      if (el.getBoundingClientRect().top < vh) el.classList.add("is-in"); // already on screen: show right away
      else io.observe(el);
    });
  }

  // Count-up: animate the leading number in stat tiles, the 18/20 callout and homepage results.
  var nums = document.querySelectorAll(".cs2-stats b, .cs2-highlight-n");
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      var node = e.target.firstChild;
      if (!node || node.nodeType !== 3) return;
      var m = node.nodeValue.match(/^([^\d]*)([\d,]+)(.*)$/);
      if (!m) return;
      var prefix = m[1], target = parseInt(m[2].replace(/,/g, ""), 10), suffix = m[3], comma = m[2].indexOf(",") > -1;
      if (!target || target < 3) return;
      var start = null, dur = 900;
      function fmt(n) { return comma ? n.toLocaleString("en-CA") : String(n); }
      function step(t) {
        if (!start) start = t;
        var k = Math.min(1, (t - start) / dur), eased = 1 - Math.pow(1 - k, 3);
        node.nodeValue = prefix + fmt(Math.round(target * eased)) + suffix;
        if (k < 1) requestAnimationFrame(step);
      }
      node.nodeValue = prefix + fmt(0) + suffix;
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  nums.forEach(function (n) { cio.observe(n); });
})();

// Tap or click a case study image to see it larger. The full-size file only loads when someone opens it.
(function () {
  var imgs = Array.prototype.filter.call(
    document.querySelectorAll(".cs2-body .cs2-media img, .cs2-body .cs2-pair img"),
    function (img) { return img.alt && !img.closest("a"); }
  );
  if (!imgs.length) return;

  function biggest(img) {
    var best = img.currentSrc || img.src, bw = 0;
    (img.getAttribute("srcset") || "").split(",").forEach(function (part) {
      var bits = part.trim().split(/\s+/), w = parseInt(bits[1], 10);
      if (bits[0] && w > bw) { bw = w; best = new URL(bits[0], location.href).href; }
    });
    return best;
  }

  var box = document.createElement("div");
  box.className = "lightbox"; box.hidden = true;
  box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Enlarged image");
  box.innerHTML = '<button type="button" class="lightbox-close">Close <span aria-hidden="true">✕</span></button>' +
    '<div class="lightbox-stage"><img class="lightbox-img" alt=""></div>' +
    '<p class="lightbox-hint"><span class="hint-mouse">Click the image to see it at full size</span><span class="hint-touch">Tap the image for full size, or pinch to zoom</span></p>';
  document.body.appendChild(box);
  var big = box.querySelector(".lightbox-img"), closeBtn = box.querySelector(".lightbox-close"), stage = box.querySelector(".lightbox-stage");
  var opener = null;

  function open(img) {
    opener = img;
    big.src = biggest(img); big.alt = img.alt;
    box.classList.remove("is-full");
    box.hidden = false;
    document.documentElement.classList.add("lightbox-open");
    requestAnimationFrame(function () { box.classList.add("is-on"); });
    closeBtn.focus();
  }
  function close() {
    box.classList.remove("is-on", "is-full");
    box.hidden = true;
    document.documentElement.classList.remove("lightbox-open");
    big.removeAttribute("src");
    if (opener) opener.focus();
  }

  imgs.forEach(function (img) {
    img.classList.add("zoomable");
    img.setAttribute("tabindex", "0");
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", "Enlarge image: " + img.alt);
    img.addEventListener("click", function () { open(img); });
    img.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(img); }
    });
  });

  closeBtn.addEventListener("click", close);
  box.addEventListener("click", function (e) { if (e.target === box || e.target === stage) close(); });
  big.addEventListener("click", function () {
    var full = box.classList.toggle("is-full");
    if (full) stage.scrollTop = stage.scrollLeft = 0;
  });
  document.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "Tab") { e.preventDefault(); closeBtn.focus(); }
  });
})();
