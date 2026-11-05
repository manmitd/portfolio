// "Ask Manmit": a small chat-style panel with preset questions and answers.
(function () {
  // The first five show up front; the rest sit behind "See more questions"
  var QA = [
    {
      q: "What are you working on right now?",
      a: ["I'm currently the Lead Product Designer at Sewjo, where I've been involved in building and shaping the product from the ground up. I lead design across our mobile apps, web platform, and internal tools, working closely with product and engineering throughout the process. I also mentor junior designers, which has been one of the more rewarding parts of my role!"],
      links: []
    },
    {
      q: "What kind of opportunities interest you?",
      a: ["I'm really drawn to product design roles where I can take ownership, tackle interesting problems, and work with people who genuinely care about what they're building. I love being involved from the early ideas all the way through to launch and beyond. I'm based in Vancouver, but I'm always open to connecting with teams doing interesting work!"],
      links: [["View my resume", "/s/Manmit-Dhindsa-Resume.pdf"]]
    },
    {
      q: "Which project are you proudest of?",
      a: [
        "It's hard to pick just one! Sewjo will always be special to me because I've had the opportunity to help shape the product from the beginning and watch it grow.",
        "I'm also really proud of Wildlight, an AI-powered experience I worked on with Accenture. We took something that felt complicated and made it much easier for people to navigate, which was really rewarding to see!"
      ],
      links: [["Explore StitchLog", "/sewjo/"], ["Explore Wildlight", "/accenture/"]]
    },
    {
      q: "How do you use AI in your work?",
      a: [
        "A little bit of everything! I've worked on designing AI-powered experiences, but I also use tools like Claude and Cursor to explore ideas, build prototypes, and experiment with interactions.",
        "I love being able to actually try something out instead of just imagining how it might work. Of course, AI doesn't replace the research, testing, or design decisions that go into making something genuinely useful!"
      ],
      links: []
    },
    {
      q: "How can I reach you?",
      a: [
        "Email is probably the easiest! You can reach me at dhindsamanmit@gmail.com or connect with me on LinkedIn.",
        "I'm always happy to chat about product design, interesting ideas, or potential opportunities!"
      ],
      links: [["Email me", "mailto:dhindsamanmit@gmail.com"], ["Connect on LinkedIn", "https://www.linkedin.com/in/manmit-dhindsa/"]]
    },
    {
      q: "How do you work with engineers?",
      a: ["I like bringing engineers into the process early so we can work through ideas, technical constraints, and trade-offs together. I try to make things easier by thinking through edge cases, building prototypes, and making sure designs are clear. I also stay involved during development because I think the best results come from working together, not just handing things off."],
      links: []
    },
    {
      q: "How do you approach a new design problem?",
      a: [
        "I usually start by asking a lot of questions. What problem are we actually trying to solve? Who's experiencing it? And how do we know it's a problem in the first place?",
        "From there, I like exploring ideas quickly, testing assumptions, and getting feedback early. I don't think design ends when something ships either. Some of the most interesting improvements happen once real people start using it."
      ],
      links: []
    },
    {
      q: "What do you do when you're not designing?",
      a: [
        "I'm usually finding some new little hobby to get obsessed with! I love playing pickleball, collecting blind boxes, and finding fun places to explore.",
        "I also really enjoy making things just for fun, whether that's experimenting with a new tool or working on a random creative idea that popped into my head."
      ],
      links: [["More about me", "/about-me/"]]
    }
  ];
  var VISIBLE = 5;

  // Case study links show as a card with the cover image, like the homepage
  var CASES = {
    "/accenture/": { title: "Assessing a garden the AI can't see", where: "Accenture — Wildlight", img: "/assets/img/wl-cover-v3-1000.webp" },
    "/sewjo-merchant-dashboard/": { title: "Proving value without seeing the sale", where: "Sewjo — Merchant Dashboard", img: "/assets/img/sb-cover-v2-1000.webp" },
    "/sewjo-challenges/": { title: "Turning a launch campaign into reasons to come back", where: "Sewjo — Challenges", img: "/assets/img/ch-cover-v2-1000.webp" },
    "/sewjo/": { title: "Making project tracking feel effortless", where: "Sewjo — StitchLog", img: "/assets/img/sl-cover-card.webp", top: true }
  };

  var INTRO = '<div class="ask-intro"><p><strong>Hey, I\'m Manmit! <span class="ask-thought" aria-hidden="true"></span></strong></p>' +
    '<p>Curious about my work or what I\'m like beyond the pixels? Pick a question below!</p></div>';

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nav = document.querySelector(".site-nav ul");
  if (!nav) return;

  function track(name, params) { if (typeof window.gtag === "function") window.gtag("event", name, params || {}); }

  // Header button
  var li = document.createElement("li");
  li.className = "ask-li";
  li.innerHTML = '<button type="button" class="ask-open" aria-haspopup="dialog" aria-controls="ask-panel" aria-expanded="false">' +
    '<span class="ask-spark" aria-hidden="true"></span>Ask Manmit</button>';
  nav.appendChild(li);
  var openBtn = li.querySelector("button");

  // Panel
  var panel = document.createElement("div");
  panel.className = "ask";
  panel.innerHTML =
    '<div class="ask-scrim" data-close></div>' +
    '<section class="ask-panel" id="ask-panel" role="dialog" aria-modal="true" aria-labelledby="ask-title" tabindex="-1">' +
      '<header class="ask-head">' +
        '<h2 id="ask-title">Ask Manmit</h2>' +
        '<button type="button" class="ask-reset" aria-label="Start over" hidden><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4 10a6 6 0 1 0 1.8-4.3M4 3.5v3.2h3.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<button type="button" class="ask-close" data-close aria-label="Close"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>' +
      '</header>' +
      '<div class="ask-log">' + INTRO + '</div>' +
      '<p class="ask-sr" aria-live="polite"></p>' +
      '<div class="ask-chips" role="group" aria-label="Questions you can ask"></div>' +
    '</section>';
  document.body.appendChild(panel);

  var dialog = panel.querySelector(".ask-panel");
  var log = panel.querySelector(".ask-log");
  var chips = panel.querySelector(".ask-chips");
  var live = panel.querySelector(".ask-sr");
  var resetBtn = panel.querySelector(".ask-reset");
  var asked = [];
  var expanded = false;
  var busy = false;
  dialog.inert = true;

  function remaining() { return QA.map(function (_, i) { return i; }).filter(function (i) { return asked.indexOf(i) < 0; }); }

  function renderChips(focusIndex) {
    chips.innerHTML = "";
    var left = remaining();
    var collapsible = left.length > VISIBLE;
    var shown = collapsible && !expanded ? left.slice(0, VISIBLE) : left;
    shown.forEach(function (i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ask-chip";
      b.dataset.i = i;
      b.innerHTML = '<span aria-hidden="true">↳</span> ' + QA[i].q;
      b.addEventListener("click", function (e) { ask(i, e.detail === 0); });
      chips.appendChild(b);
    });
    if (collapsible) {
      var t = document.createElement("button");
      t.type = "button";
      t.className = "ask-more";
      t.setAttribute("aria-expanded", expanded ? "true" : "false");
      t.textContent = expanded ? "Show fewer questions" : "See more questions";
      t.addEventListener("click", function () {
        expanded = !expanded;
        // Opening: land on the first newly shown question. Closing: stay on the toggle.
        renderChips(expanded ? left[VISIBLE] : "more");
      });
      chips.appendChild(t);
    }
    chips.hidden = !left.length;
    if (focusIndex === "more") { var m = chips.querySelector(".ask-more"); if (m) m.focus({ preventScroll: true }); }
    else if (typeof focusIndex === "number") { var c = chips.querySelector('[data-i="' + focusIndex + '"]'); if (c) c.focus({ preventScroll: true }); }
  }

  function scrollDown() { log.scrollTop = log.scrollHeight; }

  function addLinks(a, item) {
    var cards = item.links.filter(function (l) { return CASES[l[1]]; });
    var plain = item.links.filter(function (l) { return !CASES[l[1]]; });
    if (cards.length) {
      var grid = document.createElement("div");
      grid.className = "ask-cases" + (cards.length > 1 ? " is-pair" : "");
      cards.forEach(function (l) {
        var cs = CASES[l[1]];
        var card = document.createElement("a");
        card.className = "ask-case";
        card.href = l[1];
        card.innerHTML = '<img alt="" loading="lazy" src="' + cs.img + '"' + (cs.top ? ' style="object-position:center top"' : '') + '>' +
          '<span class="ask-case-title">' + cs.title + '</span><span class="ask-case-cta">' + l[0] + ' <span aria-hidden="true">→</span></span>';
        card.addEventListener("click", function () { track("ask_case_click", { case_study: cs.where }); });
        grid.appendChild(card);
      });
      a.appendChild(grid);
    }
    if (plain.length) {
      var row = document.createElement("p");
      row.className = "ask-links";
      plain.forEach(function (l) {
        var link = document.createElement("a");
        link.href = l[1];
        link.textContent = l[0];
        if (/^https?:|\.pdf$/.test(l[1])) { link.target = "_blank"; link.rel = "noopener"; }
        row.appendChild(link);
      });
      a.appendChild(row);
    }
  }

  function ask(i, viaKeys) {
    if (busy) return;
    busy = true;
    asked.push(i);
    resetBtn.hidden = false;
    var item = QA[i];
    track("ask_question", { question: item.q });

    var q = document.createElement("p");
    q.className = "ask-q";
    q.textContent = item.q;
    log.appendChild(q);

    var a = document.createElement("div");
    a.className = "ask-a";
    log.appendChild(a);

    // Keep keyboard focus in the question list: move to the next question in line
    var left = remaining();
    // Keyboard users land on the next question; mouse users don't get a focus ring
    renderChips(viaKeys && left.length ? left[0] : undefined);
    if (viaKeys && !left.length) dialog.focus({ preventScroll: true });
    scrollDown();

    var paras = item.a.map(function () { var p = document.createElement("p"); return p; });

    function finish() {
      a.classList.remove("is-typing");
      a.innerHTML = "";
      item.a.forEach(function (text, k) { paras[k].textContent = text; a.appendChild(paras[k]); });
      addLinks(a, item);
      // Screen readers hear the whole answer once, not word by word
      live.textContent = item.q + " " + item.a.join(" ");
      busy = false;
      scrollDown();
    }

    if (reduce) { finish(); return; }

    // A short "typing" pause, then the answer writes itself out.
    // Longer answers reveal more words per step, so every answer takes about the same time.
    a.classList.add("is-typing");
    setTimeout(function () {
      a.classList.remove("is-typing");
      var all = item.a.join(" \n ").split(" ");
      var step = Math.max(2, Math.ceil(all.length / 40));
      var n = 0;
      var t = setInterval(function () {
        n += step;
        var shown = all.slice(0, n).join(" ").split(" \n ");
        a.innerHTML = "";
        shown.forEach(function (text, k) { paras[k].textContent = text.replace(/\n/g, ""); a.appendChild(paras[k]); });
        scrollDown();
        if (n >= all.length) { clearInterval(t); finish(); }
      }, 35);
    }, 450);
  }

  function reset() {
    asked = [];
    expanded = false;
    log.innerHTML = INTRO;
    live.textContent = "";
    resetBtn.hidden = true;
    renderChips(0);
  }

  // Wide screens: the page slides over and the panel docks beside it, and you can keep reading.
  // Smaller screens: the panel sits on top of the page.
  var DOCK_MIN = 1200;
  var root = document.documentElement;
  function docked() { return window.innerWidth >= DOCK_MIN; }
  function nudgeLayout() {
    // Let the badge and text tidy-ups re-measure once the page width settles
    setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 520);
  }
  function setMode() {
    var open = isOpen();
    var dock = open && docked();
    root.classList.toggle("ask-docked", dock);
    root.classList.toggle("ask-locked", open && !dock);
    dialog.setAttribute("aria-modal", dock ? "false" : "true");
  }
  function isOpen() { return panel.classList.contains("is-open"); }
  function open() {
    if (isOpen()) { close(); return; }
    dialog.inert = false;
    panel.classList.add("is-open");
    setMode();
    nudgeLayout();
    openBtn.setAttribute("aria-expanded", "true");
    setTimeout(function () { dialog.focus({ preventScroll: true }); }, 60);
    track("ask_open");
  }
  function close() {
    panel.classList.remove("is-open");
    dialog.inert = true;
    setMode();
    nudgeLayout();
    openBtn.setAttribute("aria-expanded", "false");
    openBtn.focus({ preventScroll: true });
  }
  var rt;
  window.addEventListener("resize", function (e) {
    if (!e.isTrusted || !isOpen()) return;
    clearTimeout(rt); rt = setTimeout(setMode, 100);
  });

  openBtn.addEventListener("click", open);
  resetBtn.addEventListener("click", reset);
  panel.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", function (e) {
    if (!isOpen()) return;
    if (e.key === "Escape") close();
    if (e.key === "Tab" && !root.classList.contains("ask-docked")) {
      var f = dialog.querySelectorAll("button:not([hidden]), a[href]");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  renderChips();
})();
