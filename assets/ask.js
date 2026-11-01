// "Ask Manmit": a small chat-style panel with preset questions.
// Every answer is written by Manmit. Nothing here calls an AI.
(function () {
  var QA = [
    {
      q: "What are you working on right now?",
      a: "I'm the Lead Product Designer at Sewjo, an app for people who sew. I joined as its first dedicated product designer and now lead design across the mobile apps, the Swatchbook marketplace, and internal tools. I also mentor junior designers.",
      links: [["See the Merchant Dashboard case study", "/sewjo-merchant-dashboard/"]]
    },
    {
      q: "What kind of role are you looking for?",
      a: "A full-time product design role where I can own problems end to end, from research through launch and what happens after. I'm based in Vancouver and open to remote. I'm especially drawn to AI products, fintech, and growth work.",
      links: [["View my resume", "/s/Manmit-Dhindsa-Resume.pdf"]]
    },
    {
      q: "Which project are you proudest of?",
      a: "Wildlight, an AI product I designed with Accenture. The AI needed details about a garden that beginners didn't know how to give, so I replaced the intake form with a guided conversation. In testing, 18 of 20 participants completed the core task without help, and it was showcased at Web Summit Vancouver 2026.",
      links: [["Read the Wildlight case study", "/accenture/"]]
    },
    {
      q: "How do you work with engineers?",
      a: "I bring developers in early, before designs are final, so we work through how something will actually function together. I walk through decisions and trade-offs every week, and I stay close through implementation and QA. At Sewjo, I also led our move to Storybook so design and code share the same components.",
      links: [["See how this played out on Challenges", "/sewjo-challenges/"]]
    },
    {
      q: "How do you use AI in your work?",
      a: "Two ways. I design AI products, like Wildlight, where the whole experience is a conversation. And I use AI to move faster: on Wildlight I used Claude Code for front-end interface work so our developers could focus on the back end, and I built this site the same way.",
      links: []
    },
    {
      q: "How can I reach you?",
      a: "Email is best: dhindsamanmit@gmail.com. You can also find me on LinkedIn.",
      links: [["Email me", "mailto:dhindsamanmit@gmail.com"], ["LinkedIn", "https://www.linkedin.com/in/manmit-dhindsa/"]]
    }
  ];

  // Case study links show as a card with the cover image, like the homepage
  var CASES = {
    "/accenture/": { title: "Assessing a garden the AI can't see", where: "Accenture, Wildlight", img: "/assets/img/wl-cover-v3-1000.webp" },
    "/sewjo-merchant-dashboard/": { title: "Proving value without seeing the sale", where: "Sewjo, Merchant Dashboard", img: "/assets/img/sb-cover-v2-1000.webp" },
    "/sewjo-challenges/": { title: "Turning everyday product interactions into reasons to come back", where: "Sewjo, Challenges", img: "/assets/img/ch-cover-v2-1000.webp" },
    "/sewjo/": { title: "Making project tracking feel effortless", where: "Sewjo, StitchLog", img: "/assets/img/sl-cover-card.webp", top: true }
  };

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nav = document.querySelector(".site-nav ul");
  if (!nav) return;

  // Header button
  var li = document.createElement("li");
  li.className = "ask-li";
  li.innerHTML = '<button type="button" class="ask-open" aria-haspopup="dialog" aria-controls="ask-panel">' +
    '<span class="ask-spark" aria-hidden="true"></span>' +
    'Ask Manmit</button>';
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
      '<div class="ask-log" aria-live="polite">' +
        '<p class="ask-intro">Hi! Pick a question below. Every answer is written by me, not generated.</p>' +
      '</div>' +
      '<div class="ask-chips" role="group" aria-label="Questions"></div>' +
    '</section>';
  document.body.appendChild(panel);

  var dialog = panel.querySelector(".ask-panel");
  var log = panel.querySelector(".ask-log");
  var chips = panel.querySelector(".ask-chips");
  var resetBtn = panel.querySelector(".ask-reset");
  var asked = [];
  var busy = false;

  function renderChips() {
    chips.innerHTML = "";
    QA.forEach(function (item, i) {
      if (asked.indexOf(i) > -1) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "ask-chip";
      b.innerHTML = '<span aria-hidden="true">↳</span> ' + item.q;
      b.addEventListener("click", function () { ask(i); });
      chips.appendChild(b);
    });
    chips.hidden = !chips.children.length;
  }

  function scrollDown() { log.scrollTop = log.scrollHeight; }

  function ask(i) {
    if (busy) return;
    busy = true;
    asked.push(i);
    resetBtn.hidden = false;
    var item = QA[i];
    var q = document.createElement("p");
    q.className = "ask-q";
    q.textContent = item.q;
    log.appendChild(q);
    renderChips();
    if (typeof window.gtag === "function") window.gtag("event", "ask_question", { question: item.q });

    var a = document.createElement("div");
    a.className = "ask-a";
    var p = document.createElement("p");
    a.appendChild(p);
    log.appendChild(a);
    scrollDown();

    function finish() {
      p.textContent = item.a;
      if (item.links.length) {
        var row = document.createElement("p");
        row.className = "ask-links";
        item.links.forEach(function (l) {
          var cs = CASES[l[1]];
          if (cs) {
            var card = document.createElement("a");
            card.className = "ask-case";
            card.href = l[1];
            card.innerHTML = '<img alt="" loading="lazy" src="' + cs.img + '"' + (cs.top ? ' style="object-position:center top"' : '') + '><span><small>' + cs.where + '</small>' + cs.title + '</span>';
            a.appendChild(card);
            if (typeof window.gtag === "function") card.addEventListener("click", function () { window.gtag("event", "ask_case_click", { case_study: cs.where }); });
            return;
          }
          var link = document.createElement("a");
          link.href = l[1];
          link.textContent = l[0];
          if (/^https?:|\.pdf$/.test(l[1])) { link.target = "_blank"; link.rel = "noopener"; }
          row.appendChild(link);
        });
        if (row.children.length) a.appendChild(row);
      }
      busy = false;
      scrollDown();
    }

    if (reduce) { finish(); return; }
    // A short "typing" pause, then the answer writes itself out quickly
    a.classList.add("is-typing");
    setTimeout(function () {
      a.classList.remove("is-typing");
      var words = item.a.split(" "), n = 0;
      var t = setInterval(function () {
        n += 2;
        p.textContent = words.slice(0, n).join(" ");
        scrollDown();
        if (n >= words.length) { clearInterval(t); finish(); }
      }, 35);
    }, 450);
  }

  function reset() {
    asked = [];
    log.innerHTML = '<p class="ask-intro">Hi! Pick a question below. Every answer is written by me, not generated.</p>';
    resetBtn.hidden = true;
    renderChips();
  }

  // Wide screens: the page slides over and the panel docks beside it, and you can keep reading.
  // Smaller screens: the panel sits on top of the page.
  var DOCK_MIN = 1200;
  var root = document.documentElement;
  var lastFocus;
  function docked() { return window.innerWidth >= DOCK_MIN; }
  function nudgeLayout() {
    // Let the badge and text tidy-ups re-measure while the page width changes
    setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 520);
  }
  function setMode() {
    var isOpen = panel.classList.contains("is-open");
    var dock = isOpen && docked();
    root.classList.toggle("ask-docked", dock);
    root.classList.toggle("ask-locked", isOpen && !dock);
    dialog.setAttribute("aria-modal", dock ? "false" : "true");
  }
  function isOpen() { return panel.classList.contains("is-open"); }
  function open() {
    if (isOpen()) { close(); return; }
    lastFocus = document.activeElement;
    panel.classList.add("is-open");
    setMode();
    nudgeLayout();
    openBtn.setAttribute("aria-expanded", "true");
    setTimeout(function () { dialog.focus({ preventScroll: true }); }, 60);
    if (typeof window.gtag === "function") window.gtag("event", "ask_open");
  }
  function close() {
    panel.classList.remove("is-open");
    setMode();
    nudgeLayout();
    openBtn.setAttribute("aria-expanded", "false");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
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
    if (!panel.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "Tab" && !root.classList.contains("ask-docked")) {
      var f = dialog.querySelectorAll("button:not([hidden]), a[href]");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  renderChips();
})();
