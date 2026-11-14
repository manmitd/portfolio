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
  // Each side panel item can cover several sections (data-sections), so any of them lights it up
  links.forEach(function (a) {
    var ids = (a.getAttribute("data-sections") || a.getAttribute("href").slice(1)).split(" ");
    ids.forEach(function (id) { if (document.getElementById(id)) map[id] = a; });
  });
  var current = links[0]; current.classList.add("is-active");   // start on the first item at the top of the page
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        if (current) current.classList.remove("is-active");
        if (current) current.classList.remove("is-active"); current = map[e.target.id]; current.classList.add("is-active");
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
  // Phones warm the small cover; larger screens the medium one. Data-saver or slow connections skip it.
  var conn = navigator.connection || {};
  if (conn.saveData || /2g/.test(conn.effectiveType || "")) return;
  var sz = window.innerWidth <= 760 ? "-1000" : "-1600";
  var covers = { "accenture": "img/wl-cover-v3" + sz + ".webp", "sewjo-challenges": "img/ch-cover-v2" + sz + ".webp", "sewjo-merchant-dashboard": "img/sb-cover-v2" + sz + ".webp", "sewjo/": "img/sl-cover.webp" };
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
    if (window.innerWidth <= 760) return;   // phones: CSS text-wrap handles short last lines, saving a lot of layout work
    saved.forEach(function (s) { s.node.nodeValue = s.text; }); saved = [];
    document.querySelectorAll("main p, main li, .site-footer p").forEach(function (p) {
      if (p.closest(".cs2-highlight, .cs2-stats, .tags, .cs2-toc, .badge, .sticker-mount, .cs2-quote, .cs2-result")) return;
      var rows = lines(p);
      if (rows.length < 2) return;
      var width = Math.max.apply(null, rows.map(function (o) { return o.right - o.left; }));
      var cs = getComputedStyle(p), box = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var tail = rows[rows.length - 1];
      if ((tail.right - tail.left) / width >= 0.3) return;
      var node = lastText(p); if (!node) return;
      var original = node.nodeValue; saved.push({ node: node, text: original });
      // Glue at most 3 words, and never so many that the line above ends up visibly short
      var parts = original.replace(/\s+$/, "").split(" "), good = original;
      for (var k = 2; k <= 3; k++) {
        if (parts.length <= k + 3) break;
        var tryText = parts.slice(0, parts.length - k).join(" ") + " " + parts.slice(-k).join(NBSP);
        node.nodeValue = tryText;
        var r2 = lines(p), t2 = r2[r2.length - 1], above = r2[r2.length - 2];
        if (above && (above.right - above.left) / box < 0.8) break;
        good = tryText;
        if ((t2.right - t2.left) / width >= 0.25) break;
      }
      node.nodeValue = good;
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
  var clientBar = document.querySelector(".client-bar");
  (clientBar || document.body).appendChild(bar);
  var head = document.querySelector(".cs2-head");
  var root = document.documentElement, ticking = false;
  function update() {
    ticking = false;
    var r = body.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
    root.style.setProperty("--read", p.toFixed(4));
    if (clientBar && head) clientBar.classList.toggle("is-on", head.getBoundingClientRect().bottom < 0);
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
    if (typeof window.gtag === "function") {
      gtag("event", "image_zoom", { case_study: (document.title.split(" | ")[0] || "").slice(0, 100), image: img.alt.slice(0, 100) });
    }
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

// "Jump to section" for case studies on screens where the side contents list is hidden.
(function () {
  var toc = document.querySelector(".cs2-toc ol");
  var meta = document.querySelector(".cs2-head .cs2-meta");
  if (!toc || !meta) return;
  var d = document.createElement("details");
  d.className = "cs2-jump";
  d.innerHTML = "<summary>Jump to section</summary>";
  var list = toc.cloneNode(true);
  list.querySelectorAll("a").forEach(function (a) { a.classList.remove("is-active"); });
  d.appendChild(list);
  meta.insertAdjacentElement("afterend", d);
  d.addEventListener("click", function (e) { if (e.target.closest("a")) d.open = false; });
  document.addEventListener("click", function (e) { if (d.open && !d.contains(e.target)) d.open = false; });
})();

// Analytics: how far people read. Which case study sections they reach, how far down each page they get,
// and whether they use the reading shortcuts. Each is logged once per page view.
(function () {
  if (typeof window.gtag !== "function") return;
  var page = (document.title.split(" | ")[0] || location.pathname).slice(0, 100);

  // Scroll milestones
  var marks = [25, 50, 75], sent = {}, ticking = false;
  function checkScroll() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    var pct = (window.scrollY / max) * 100;
    marks.forEach(function (m) {
      if (pct >= m && !sent[m]) { sent[m] = true; gtag("event", "scroll_depth", { percent: m, page_title_short: page }); }
    });
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(checkScroll); } }, { passive: true });

  // Case study sections reached (labels come from the contents list)
  var toc = document.querySelectorAll(".cs2-toc a[href^='#']");
  if (toc.length && "IntersectionObserver" in window) {
    var labels = {};
    toc.forEach(function (a) { labels[a.getAttribute("href").slice(1)] = a.textContent.trim(); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        gtag("event", "section_reached", { case_study: page, section: labels[e.target.id] || e.target.id });
      });
    }, { rootMargin: "0px 0px -40% 0px" });
    Object.keys(labels).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  // Reading shortcuts
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href^='#']");
    if (!a) return;
    if (a.closest(".cs2-meta")) gtag("event", "skip_to_results", { case_study: page });   // event name kept so past data stays comparable
    else if (a.closest(".cs2-jump")) gtag("event", "jump_to_section", { case_study: page, section: a.textContent.trim().slice(0, 100) });
  });
})();

// Homepage: the hero eases back as the work list slides over it, the sand pauses once covered,
// and the phone dock's Ask button opens Ask Manmit.
(function () {
  var hero = document.querySelector(".hero"), panel = document.querySelector(".work-panel");
  var askBtn = document.querySelector("[data-ask-open]");
  if (askBtn) askBtn.addEventListener("click", function () { var b = document.querySelector(".ask-open"); if (b) b.click(); });
  if (!hero || !panel) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches, phone = window.matchMedia("(max-width: 760px)");
  var ticking = false;
  function update() {
    ticking = false;
    if (window.sandCovered) window.sandCovered(panel.getBoundingClientRect().top <= 0);
    if (phone.matches || reduce) { hero.style.transform = ""; return; }
    var p = Math.min(1, Math.max(0, window.scrollY / hero.offsetHeight));
    hero.style.transform = p ? "scale(" + (1 - p * 0.05).toFixed(4) + ")" : "";
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();

// Homepage: the word after "made" follows the sand shape, erasing and retyping like the cursor labels
(function () {
  var em = document.querySelector(".sand-right .sand-big em");
  if (!em) return;
  var WORDS = { cursor: "intuitive.", folder: "scalable.", smiley: "simple.", sparkle: "smarter." };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var timer;
  window.addEventListener("sandshape", function (e) {
    var word = WORDS[e.detail];
    if (!word || word === em.textContent) return;
    clearInterval(timer);
    if (reduce) { em.textContent = word; return; }
    var phase = "erase";
    timer = setInterval(function () {
      var t = em.textContent;
      if (phase === "erase") { em.textContent = t.slice(0, -1); if (!em.textContent) phase = "type"; }
      else { em.textContent = word.slice(0, t.length + 1); if (em.textContent === word) clearInterval(timer); }
    }, 55);
  });
})();

// Micro-interactions: the SHIPPED dot pulses once, and the marker draws in under a word, the first time each scrolls into view
(function () {
  var items = [].slice.call(document.querySelectorAll(".project, .ink-mark"));
  if (!items.length) return;
  function on(el) { el.classList.add(el.classList.contains("project") ? "is-live" : "is-in"); }
  if (!("IntersectionObserver" in window)) { items.forEach(on); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { on(e.target); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -18% 0px" });
  items.forEach(function (el) { io.observe(el); });
})();

// Before / after slider: drag the handle (or anywhere on the image), or use the arrow keys on the handle
(function () {
  [].forEach.call(document.querySelectorAll("[data-ba]"), function (ba) {
    var handle = ba.querySelector(".ba-handle"), dragging = false;
    function set(p) {
      p = Math.max(0, Math.min(100, p));
      ba.style.setProperty("--split", p + "%");
      handle.setAttribute("aria-valuenow", Math.round(p));
    }
    function fromEvent(e) { var r = ba.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); }
    ba.addEventListener("pointerdown", function (e) {
      dragging = true; fromEvent(e);
      try { ba.setPointerCapture(e.pointerId); } catch (err) {}
    });
    ba.addEventListener("pointermove", function (e) { if (dragging) fromEvent(e); });
    ["pointerup", "pointercancel"].forEach(function (t) { ba.addEventListener(t, function () { dragging = false; }); });
    handle.addEventListener("keydown", function (e) {
      var now = +handle.getAttribute("aria-valuenow"), step = e.shiftKey ? 10 : 4;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") { set(now - step); e.preventDefault(); }
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") { set(now + step); e.preventDefault(); }
      else if (e.key === "Home") { set(0); e.preventDefault(); }
      else if (e.key === "End") { set(100); e.preventDefault(); }
    });
    set(50);
  });
})();

// Footer matcha: each hover takes a sip, so the drink level drops a little. It refills on reload.
(function () {
  var imgs = document.querySelectorAll("img.footer-doodle");
  if (!imgs.length) return;
  var CUP = "M14 22.5 L19.2 72.5 C27 74.6 37 74.4 44.8 72.3 L50.3 22.8";
  var SVG = '<svg class="footer-doodle is-svg" viewBox="0 0 64 80" width="64" height="80" fill="none" stroke="#112E4B" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<defs><clipPath id="mt-cup"><path d="' + CUP + ' Z"/></clipPath></defs>' +
    '<g class="mt-straw"><path d="M40 4.5 L35.5 22"/><path d="M42.5 6 L38.2 22.5"/></g>' +
    '<path d="M12.5 21.5 C25 19.8 39 20.2 51.8 21.8"/>' +
    '<path d="' + CUP + '"/>' +
    '<g clip-path="url(#mt-cup)"><path class="mt-level" d="M16.4 42 C22 39.6 26.5 44.4 32 42 C37.5 39.6 42 44.2 47.8 41.6"/></g>' +
    '<g class="mt-level mt-ice"><path d="M22 28.5 l6.5 -1.2 1.2 6.4 -6.4 1.3 z"/><path d="M33.5 30 l6 1.4 -1.3 6.2 -6.1 -1.3 z"/></g>' +
    '<path d="M21.5 55 C25 56.5 26 59.5 24.5 62"/><path d="M38 52.5 C41 54.5 41.6 57.5 40 60.5"/><path d="M30 61 C32 62.5 32.6 65 31.6 67"/></svg>';
  var MAX = 4, DROP = 2.5;
  [].forEach.call(imgs, function (img, i) {
    var wrap = document.createElement("span");
    wrap.innerHTML = SVG.replace(/mt-cup/g, "mt-cup-" + i);
    var svg = wrap.firstChild;
    img.parentNode.replaceChild(svg, img);
    var levels = svg.querySelectorAll(".mt-level"), sips = 0, busy = false;
    svg.addEventListener("pointerenter", function () {
      if (busy || sips >= MAX) return;
      busy = true; sips++;
      svg.classList.remove("is-sipping"); void svg.getBoundingClientRect(); svg.classList.add("is-sipping");
      [].forEach.call(levels, function (l) { l.style.transform = "translateY(" + sips * DROP + "px)"; });
      setTimeout(function () { busy = false; svg.classList.remove("is-sipping"); }, 650);
    });
  });
})();

// Email links everywhere (header, footer, About, case studies, Ask): clicking copies the address instead of opening a mail app,
// and "copied!" types out under the link. If copying isn't possible, the link opens the mail app as a fallback.
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var live = document.createElement("span");
  live.className = "sr-only"; live.setAttribute("aria-live", "polite");
  live.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap";
  document.body.appendChild(live);

  function legacyCopy(text) {
    try {
      var t = document.createElement("textarea");
      t.value = text; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;top:-100px;opacity:0";
      document.body.appendChild(t); t.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(t);
      return ok;
    } catch (e) { return false; }
  }
  function copy(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
        return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
      }
    } catch (e) {}
    return Promise.resolve(legacyCopy(text));
  }
  function show(a) {
    var note = a.querySelector(".copy-note");
    if (!note) {
      note = document.createElement("span");
      note.className = "copy-note"; note.setAttribute("aria-hidden", "true");
      a.appendChild(note);
      a.classList.add("has-copy-note");
    }
    clearInterval(note._t); clearTimeout(note._h);
    var text = "copied!", n = 0;
    if (reduce) note.textContent = text;
    else { note.textContent = ""; note._t = setInterval(function () { note.textContent = text.slice(0, ++n); if (n >= text.length) clearInterval(note._t); }, 45); }
    live.textContent = ""; setTimeout(function () { live.textContent = "Email address copied"; }, 30);
    note._h = setTimeout(function () {
      if (reduce) { note.textContent = ""; return; }
      note._t = setInterval(function () { note.textContent = note.textContent.slice(0, -1); if (!note.textContent) clearInterval(note._t); }, 30);
    }, 2200);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href^='mailto:']");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    var href = a.getAttribute("href"), addr = href.replace(/^mailto:/i, "").split("?")[0];
    copy(addr).then(function (ok) { if (ok) show(a); else location.href = href; });
  });
  [].forEach.call(document.querySelectorAll("a[href^='mailto:']"), function (a) {
    if (!a.getAttribute("title")) a.setAttribute("title", "Copy email address");
  });
})();

// Floating nav pill (desktop): once the page header scrolls away, a pill with the same links slides in and stays at the top
(function () {
  var header = document.querySelector(".site-header"), nav = header && header.querySelector(".site-nav ul");
  if (!nav || document.querySelector("main.cs2")) return;   // not on case studies
  function build() {
    var pill = document.createElement("nav");
    pill.className = "nav-pill"; pill.setAttribute("aria-label", "Main");
    var word = header.querySelector(".wordmark");
    var home = document.createElement("a");
    home.className = "wordmark"; home.href = word ? word.getAttribute("href") : "/"; home.textContent = "Manmit Dhindsa";
    var ul = document.createElement("ul");
    [].forEach.call(nav.children, function (li) {
      var a = li.querySelector("a"), ask = li.querySelector(".ask-open"), item = document.createElement("li");
      if (a) {
        var c = a.cloneNode(true); c.removeAttribute("id"); item.appendChild(c);
      } else if (ask) {
        var b = document.createElement("button"); b.type = "button"; b.innerHTML = ask.innerHTML;
        b.addEventListener("click", function () { ask.click(); });
        item.appendChild(b);
      } else return;
      ul.appendChild(item);
    });
    pill.appendChild(home); pill.appendChild(ul);
    pill.inert = true; pill.setAttribute("aria-hidden", "true");
    document.body.appendChild(pill);
    var on = false, ticking = false;
    var workHead = document.querySelector(".work-panel .work h2, .work-panel h2");
    function check() {
      ticking = false;
      var past;
      if (workHead) past = workHead.getBoundingClientRect().bottom < 72;   // homepage: only once "Selected projects" has scrolled up under the pill's spot
      else past = header.getBoundingClientRect().bottom < -10 || window.scrollY > Math.max(120, header.offsetHeight + 40);
      if (past === on) return;
      on = past;
      pill.classList.toggle("is-on", on);
      pill.inert = !on;
      if (on) pill.removeAttribute("aria-hidden"); else pill.setAttribute("aria-hidden", "true");
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
    check();
  }
  // wait a beat so the Ask button has been added to the nav first
  if (document.readyState === "complete") setTimeout(build, 0);
  else window.addEventListener("load", function () { setTimeout(build, 0); });
})();

// Arriving on the homepage at #work (from the phone dock): jump straight there instead of scrolling down from the top,
// then turn smooth scrolling back on for in-page links.
(function () {
  if (!location.hash || !document.documentElement.style.scrollBehavior) return;
  var t = document.getElementById(location.hash.slice(1));
  if (t) t.scrollIntoView({ behavior: "instant", block: "start" });
  window.addEventListener("load", function () {
    if (t) t.scrollIntoView({ behavior: "instant", block: "start" });
    setTimeout(function () { document.documentElement.style.scrollBehavior = ""; }, 50);
  });
})();
