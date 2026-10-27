// Sticker Stop: a little sticker vending machine at the bottom of the About page.
// The page only loads this file once someone scrolls near the machine, so it never slows the first load.
// Drop a coin on a slider, push it in, pull it out, then fold open the packet to get a sticker.
(function () {
  var mount = document.querySelector("[data-sticker-stop]");
  if (!mount || mount.dataset.ready) return;
  mount.dataset.ready = "1";

  var BASE = mount.getAttribute("data-src") || "../assets/img/stickers/";
  var SERIES = [
    { name: "Coffee Crew", items: [["pup", "Coffee Pup"], ["raccoon", "Latte Raccoon"]] },
    { name: "Yee Haw", items: [["frog", "Sheriff Ribbit"], ["yeehaw", "Yee Haw Pup"]] },
    { name: "Soft Friends", items: [["cat", "Citrus Hat"], ["disco", "Kitchen Disco"], ["banana", "Sitting Banana"]] }
  ];
  var ALL = [];
  SERIES.forEach(function (s, si) { s.items.forEach(function (it) { ALL.push({ id: it[0], name: it[1], series: si }); }); });
  var TOTAL = ALL.length;
  var TRAVEL = 40;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function src(id) { return BASE + id + ".webp"; }
  function img(id, cls) {
    var a = ALL.filter(function (x) { return x.id === id; })[0];
    return '<img class="' + (cls || "") + '" src="' + src(id) + '" alt="' + (a ? a.name : "") + ' sticker" draggable="false" decoding="async">';
  }

  // ---------- styles (injected here so the rest of the site never downloads them) ----------
  var css = [
    ".ss{--ss-navy:var(--forest,#112E4B);--ss-navy-2:#1C4470;--ss-navy-3:#0B2238;--ss-tint:var(--blue,#E3EAF2);--ss-soft:#EEF2F7;--ss-label:var(--label,#4C6F96);--ss-kraft:#C9A26B;--ss-kraft-2:#A8834F;--ss-ink:var(--ink,#112E4B);",
    "display:grid;grid-template-columns:minmax(0,22rem) minmax(0,1fr);gap:clamp(1.5rem,5vw,3.5rem);align-items:center;margin-top:1.75rem}",
    "@media (max-width:760px){.ss{grid-template-columns:minmax(0,1fr)}}",
    ".ss *{box-sizing:border-box}",
    ".ss [hidden],.ss-overlay[hidden],.ss-overlay [hidden]{display:none!important}",

    /* machine */
    ".ss-machine{width:min(22rem,100%);justify-self:center;display:flex;flex-direction:column;align-items:center}",
    ".ss-head{width:100%;background:var(--ss-navy);border-radius:14px 14px 8px 8px;padding:14px 14px 0;position:relative;box-shadow:inset 0 0 0 3px var(--ss-navy-3),inset 5px 0 0 3px var(--ss-navy-2),0 14px 28px rgba(8,22,38,.22)}",
    ".ss-name{position:absolute;top:-1px;left:50%;transform:translate(-50%,-50%);background:#fff;color:var(--ss-navy);font:700 .6875rem/1 var(--font,Inter,sans-serif);letter-spacing:.14em;text-transform:uppercase;padding:.45rem .8rem;border-radius:999px;box-shadow:0 0 0 2px var(--ss-navy);white-space:nowrap}",
    ".ss-window{background:#fff;border-radius:6px;padding:8px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;position:relative;overflow:hidden;margin-top:6px}",
    ".ss-window::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.6) 38%,transparent 46%);pointer-events:none}",
    ".ss-card{border-radius:4px;padding:6px 3px;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0}",
    ".ss-card:nth-child(1){background:var(--ss-tint)}.ss-card:nth-child(2){background:var(--ss-soft)}.ss-card:nth-child(3){background:#F1EEE8}",
    ".ss-card b{font:700 .625rem/1.1 var(--font,Inter,sans-serif);letter-spacing:.06em;text-transform:uppercase;color:var(--ss-navy);text-align:center}",
    ".ss-card img{width:min(48px,80%);height:42px;object-fit:contain;filter:drop-shadow(0 1px 1px rgba(0,0,0,.15))}",

    ".ss-mechs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;background:#fff;margin-top:8px;padding:8px 8px 0;border-radius:6px 6px 0 0}",
    ".ss-mech{position:relative;height:126px}",
    ".ss-plate{pointer-events:none;position:absolute;top:0;left:5%;right:5%;height:60px;z-index:3;border-radius:6px;background:linear-gradient(180deg,#FBFBFB,#C9CED6 60%,#8E96A2);box-shadow:inset 0 0 0 1.5px #A3ABB6,0 2px 3px rgba(0,0,0,.2);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}",
    ".ss-slit{width:44%;height:6px;border-radius:4px;background:#1F2730;box-shadow:inset 0 2px 2px #000}",
    ".ss-price{font:700 .625rem/1 var(--font,Inter,sans-serif);letter-spacing:.08em;color:var(--ss-navy);background:#fff;border:1.5px solid var(--ss-navy);border-radius:4px;padding:2px 5px}",
    ".ss-handle{--y:0px;--s:1;position:absolute;top:42px;left:12%;right:12%;height:80px;z-index:2;border:0;padding:0;cursor:grab;touch-action:none;border-radius:4px 4px 10px 10px;",
    "background:repeating-linear-gradient(180deg,rgba(0,0,0,.16) 0 2px,transparent 2px 6px) top 16px center/68% 28px no-repeat,linear-gradient(90deg,#8E96A2,#FBFBFB 30%,#C9CED6 60%,#8E96A2);",
    "box-shadow:inset 0 0 0 1.5px #98A1AC,0 6px 8px rgba(8,22,38,.25);transform:translateY(var(--y)) scale(var(--s));transition:transform .28s cubic-bezier(.3,1.4,.5,1)}",
    ".ss-handle.is-dragging{transition:none;cursor:grabbing}",
    ".ss-handle:focus-visible{outline:3px solid var(--ss-label);outline-offset:3px}",
    ".ss-pocket{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);width:30px;height:30px;border-radius:50%;background:radial-gradient(circle,#4D5560,#262C33);box-shadow:inset 0 2px 4px #000}",
    ".ss-pocket .ss-coin{position:absolute;left:2px;top:2px;width:26px;height:26px;font-size:.6875rem;cursor:inherit;box-shadow:none}",
    ".ss-lip{position:absolute;left:-4%;right:-4%;bottom:-5px;height:12px;border-radius:0 0 10px 10px;background:linear-gradient(180deg,#C9CED6,#8E96A2)}",
    ".ss-mech.is-target .ss-handle{box-shadow:inset 0 0 0 1.5px #98A1AC,0 0 0 3px var(--ss-label),0 6px 8px rgba(8,22,38,.25)}",
    ".ss-mech.is-jiggle .ss-handle{animation:ss-jig .35s}",
    "@keyframes ss-jig{25%{transform:translateX(-4px)}50%{transform:translateX(4px)}75%{transform:translateX(-2px)}}",

    ".ss-door{background:#fff;padding:6px 8px 12px;border-radius:0 0 6px 6px}",
    ".ss-chute{height:76px;border-radius:6px;background:linear-gradient(180deg,#0B1622,#1D2A38);box-shadow:inset 0 6px 10px #000;position:relative;display:flex;align-items:flex-end;justify-content:center;gap:6px;padding-bottom:6px;overflow:hidden}",
    ".ss-chute::before{content:'Take sticker here';position:absolute;top:7px;left:0;right:0;text-align:center;font:600 .5625rem/1 var(--font,Inter,sans-serif);letter-spacing:.16em;text-transform:uppercase;color:#5D6B7B}",
    ".ss-mini{width:50px;height:56px;border:0;padding:0;cursor:pointer;border-radius:3px;background:linear-gradient(160deg,var(--ss-kraft),var(--ss-kraft-2));box-shadow:0 3px 6px rgba(0,0,0,.55);position:relative;animation:ss-drop .55s cubic-bezier(.4,1.6,.6,1) both;font:800 .5rem/1.15 var(--font,Inter,sans-serif);letter-spacing:.06em;color:var(--ss-navy)}",
    ".ss-mini::after{content:'';position:absolute;left:0;right:0;top:50%;border-top:1.5px dashed rgba(80,50,20,.45)}",
    ".ss-mini:hover{transform:translateY(-3px)}",
    ".ss-mini:focus-visible{outline:3px solid #fff;outline-offset:2px}",
    "@keyframes ss-drop{from{transform:translateY(-100px) rotate(-8deg)}to{transform:none}}",
    ".ss-pole{width:26px;height:56px;background:linear-gradient(90deg,var(--ss-navy-3),var(--ss-navy-2) 45%,var(--ss-navy-3))}",
    ".ss-base{width:150px;height:20px;border-radius:50%;background:radial-gradient(ellipse at 50% 35%,var(--ss-navy-2),var(--ss-navy-3) 70%);box-shadow:0 8px 12px rgba(8,22,38,.18)}",

    /* side panel */
    ".ss-side{display:flex;flex-direction:column;gap:1.25rem;min-width:0}",
    ".ss-hint{margin:0;font-weight:600;color:var(--ss-navy);min-height:1.65em}",
    ".ss-coins{display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;min-height:52px}",
    ".ss-coin{width:48px;height:48px;border-radius:50%;flex:none;border:0;padding:0;user-select:none;-webkit-user-select:none;touch-action:none;cursor:grab;",
    "background:radial-gradient(circle at 35% 30%,#fff,#D5DBE3 45%,#8E96A2);box-shadow:inset 0 0 0 3px rgba(17,46,75,.25),inset 0 0 0 6px rgba(255,255,255,.7),0 3px 0 #6F7883,0 6px 10px rgba(8,22,38,.15);",
    "display:grid;place-items:center;color:var(--ss-navy);font-size:1.125rem;line-height:1}",
    ".ss-coin.is-picked{transform:translateY(-6px);box-shadow:inset 0 0 0 3px rgba(17,46,75,.25),inset 0 0 0 6px rgba(255,255,255,.7),0 0 0 3px var(--ss-label),0 10px 14px rgba(8,22,38,.2)}",
    ".ss-coin.is-ghost{position:fixed;z-index:50;pointer-events:none;transform:translate(-50%,-50%) scale(1.1)}",
    ".ss-coin.is-spent{visibility:hidden}",
    ".ss-coin:focus-visible{outline:3px solid var(--ss-label);outline-offset:3px}",
    ".ss-refill{font:600 .9375rem var(--font,Inter,sans-serif);background:var(--ss-navy);color:#fff;border:0;border-radius:999px;padding:.7rem 1.2rem;cursor:pointer}",
    ".ss-refill:hover{background:var(--ss-navy-3)}",
    ".ss-got{border-top:1px solid var(--rule,#E3E6EA);padding-top:1rem}",
    ".ss-got p{margin:0 0 .6rem;font-size:.9375rem;color:var(--ink-soft,#3E5168)}",
    ".ss-got p span{font-variant-numeric:tabular-nums}",
    ".ss-list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.5rem;min-height:56px}",
    ".ss-list li{width:56px;height:56px;border-radius:12px;display:grid;place-items:center;position:relative}",
    ".ss-list li.is-empty{border:1.5px dashed #C3CCD7}",
    ".ss-list li img{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 1px 2px rgba(0,0,0,.18))}",
    ".ss-list li.is-new{animation:ss-pulse .6s}",
    "@keyframes ss-pulse{40%{transform:scale(1.15) rotate(-4deg)}}",
    ".ss-dup{position:absolute;top:-5px;right:-5px;background:var(--ss-navy);color:#fff;font:700 .625rem/1 var(--font,Inter,sans-serif);border-radius:999px;padding:3px 5px}",
    ".ss-sound{align-self:flex-start;background:none;border:0;padding:0;font:500 .8125rem var(--font,Inter,sans-serif);color:var(--ss-label);cursor:pointer;text-decoration:underline;text-underline-offset:.2em}",

    /* holo */
    ".ss-holo{position:relative;isolation:isolate}",
    ".ss-holo::after{content:'';position:absolute;inset:0;-webkit-mask:var(--m) center/contain no-repeat;mask:var(--m) center/contain no-repeat;background:conic-gradient(from var(--ss-a,0deg),#ff9ad5,#9ad9ff,#b6ff9a,#fff59a,#ff9ad5);mix-blend-mode:color;opacity:.55;animation:ss-spin 3s linear infinite;pointer-events:none}",
    "@property --ss-a{syntax:'<angle>';inherits:false;initial-value:0deg}",
    "@keyframes ss-spin{to{--ss-a:360deg}}",

    /* packet */
    ".ss-overlay{position:fixed;inset:0;z-index:60;background:rgba(11,34,56,.62);display:flex;align-items:center;justify-content:center;padding:1rem}",
    ".ss-modal{display:flex;flex-direction:column;align-items:center;gap:1rem;max-width:100%}",
    ".ss-say{margin:0;color:#fff;font-weight:600;font-size:1.125rem;text-align:center;min-height:1.6em}",
    ".ss-packet{width:min(320px,84vw);aspect-ratio:2/1.3;position:relative;perspective:1400px}",
    ".ss-page{position:absolute;top:0;bottom:0;width:50%;border-radius:4px}",
    ".ss-right{right:0;background:#FFFEFB;background-image:linear-gradient(#EEF2F6 1px,transparent 1px),linear-gradient(90deg,#EEF2F6 1px,transparent 1px);background-size:12px 12px;box-shadow:0 10px 30px rgba(0,0,0,.35);display:grid;place-items:center;overflow:hidden}",
    ".ss-stk{width:80%;height:84%;display:grid;place-items:center;transform:scale(.6);opacity:0;transition:transform .45s cubic-bezier(.3,1.6,.5,1) .35s,opacity .2s .35s}",
    ".ss-stk img{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(0,0,0,.22))}",
    ".ss-packet.is-open .ss-stk{transform:scale(1) rotate(-4deg);opacity:1}",
    ".ss-cover{right:0;transform-origin:left center;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.5,.05,.2,1);cursor:pointer;border:0;padding:0;background:none}",
    ".ss-packet.is-open .ss-cover{transform:rotateY(-178deg)}",
    ".ss-face{position:absolute;inset:0;border-radius:4px;backface-visibility:hidden;-webkit-backface-visibility:hidden}",
    ".ss-front{background:linear-gradient(160deg,var(--ss-kraft),var(--ss-kraft-2));box-shadow:0 10px 30px rgba(0,0,0,.35),inset 0 0 0 3px rgba(255,255,255,.12);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;padding:.75rem;text-align:center}",
    ".ss-stamp{font:800 .875rem/1.05 var(--font-display,Inter,sans-serif);letter-spacing:.06em;color:var(--ss-navy);border:2.5px solid var(--ss-navy);padding:.35rem .45rem;transform:rotate(-6deg);border-radius:3px}",
    ".ss-ser{font-weight:600;font-size:.8125rem;color:#4B3214}",
    ".ss-tap{font:700 .625rem var(--font,Inter,sans-serif);letter-spacing:.14em;text-transform:uppercase;color:#4B3214}",
    ".ss-back{transform:rotateY(180deg);background:#EAD9BB;display:flex;flex-direction:column;justify-content:center;gap:.3rem;padding:.75rem;color:#4B3214;text-align:left}",
    ".ss-back b{font:700 .9375rem/1.2 var(--font-display,Inter,sans-serif);color:var(--ss-navy)}",
    ".ss-back span{font-size:.8125rem;line-height:1.35}",
    ".ss-stick{font:600 .9375rem var(--font,Inter,sans-serif);background:#fff;color:var(--ss-navy);border:0;border-radius:999px;padding:.75rem 1.3rem;cursor:pointer}",
    ".ss-stick:hover{background:var(--ss-tint)}",
    ".ss-stick:focus-visible,.ss-cover:focus-visible{outline:3px solid #fff;outline-offset:3px}",
    ".ss-flyer{position:fixed;z-index:70;pointer-events:none;display:grid;place-items:center}",
    ".ss-flyer img{max-width:100%;max-height:100%;object-fit:contain}",
    "@media (prefers-reduced-motion:reduce){.ss *,.ss-overlay *{animation-duration:.01ms!important;transition-duration:.01ms!important}}"
  ].join("\n");
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- markup ----------
  mount.innerHTML =
    '<div class="ss">' +
      '<div class="ss-machine">' +
        '<div class="ss-head"><span class="ss-name">Sticker Stop</span>' +
          '<div class="ss-window">' + SERIES.map(function (s) {
            return '<div class="ss-card"><b>' + s.name + '</b>' + s.items.map(function (it) { return img(it[0]); }).join("") + "</div>";
          }).join("") + "</div>" +
          '<div class="ss-mechs">' + SERIES.map(function (s, i) {
            return '<div class="ss-mech" data-i="' + i + '"><div class="ss-plate"><div class="ss-slit"></div><div class="ss-price">1 COIN</div></div>' +
              '<button class="ss-handle" type="button" aria-label="' + s.name + ' slider. Add a coin, push it in, then pull it out."><span class="ss-pocket"></span><span class="ss-lip"></span></button></div>';
          }).join("") + "</div>" +
          '<div class="ss-door"><div class="ss-chute"></div></div>' +
        "</div>" +
        '<div class="ss-pole" aria-hidden="true"></div><div class="ss-base" aria-hidden="true"></div>' +
      "</div>" +
      '<div class="ss-side">' +
        '<p class="ss-hint" role="status">Drag a coin onto a slider</p>' +
        '<div class="ss-coins"></div>' +
        '<div class="ss-got"><p>Your stickers <span class="ss-count"></span></p><ul class="ss-list"></ul></div>' +
        '<button class="ss-sound" type="button" aria-pressed="true">Sound on</button>' +
      "</div>" +
    "</div>";

  var overlay = document.createElement("div");
  overlay.className = "ss-overlay";
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="ss-modal" role="dialog" aria-modal="true" aria-label="Your sticker packet">' +
      '<p class="ss-say">Tap the packet to open it</p>' +
      '<div class="ss-packet">' +
        '<div class="ss-page ss-right"><div class="ss-stk"></div></div>' +
        '<button class="ss-page ss-cover" type="button" aria-label="Open the sticker packet">' +
          '<span class="ss-face ss-front"><span class="ss-stamp">STICKER<br>STOP</span><span class="ss-ser"></span><span class="ss-tap">Fold open</span></span>' +
          '<span class="ss-face ss-back"><b class="ss-pname"></b><span class="ss-pnote"></span></span>' +
        "</button>" +
      "</div>" +
      '<button class="ss-stick" type="button" hidden>Keep it</button>' +
    "</div>";
  document.body.appendChild(overlay);

  var $ = function (s, root) { return (root || mount).querySelector(s); };
  var hint = $(".ss-hint");
  function say(t) { hint.textContent = t; }
  var mechEls = Array.prototype.slice.call(mount.querySelectorAll(".ss-mech"));

  // ---------- state ----------
  var book = {};
  try { book = JSON.parse(localStorage.getItem("sticker-stop") || "{}") || {}; } catch (e) { book = {}; }
  function save() { try { localStorage.setItem("sticker-stop", JSON.stringify(book)); } catch (e) {} }
  var coins = 3, picked = null, pending = [], current = null;
  var mech = SERIES.map(function () { return { s: "idle" }; });

  // ---------- sound (quiet, and only after someone interacts) ----------
  var ac = null, soundOn = true;
  try { soundOn = localStorage.getItem("sticker-stop-sound") !== "off"; } catch (e) {}
  function ctx() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
  function tone(f, d, type, g, when) {
    if (!soundOn) return;
    try { var c = ctx(), t = c.currentTime + (when || 0), o = c.createOscillator(), v = c.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t); v.gain.setValueAtTime(g || 0.08, t); v.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(v).connect(c.destination); o.start(t); o.stop(t + d); } catch (e) {}
  }
  function noise(d, g, lp) {
    if (!soundOn) return;
    try { var c = ctx(), b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), ch = b.getChannelData(0);
      for (var i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
      var s = c.createBufferSource(); s.buffer = b; var f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = lp; var v = c.createGain(); v.gain.value = g;
      s.connect(f).connect(v).connect(c.destination); s.start(); } catch (e) {}
  }
  var sfx = {
    coin: function () { tone(1800, 0.12, "triangle", 0.06); tone(2600, 0.18, "triangle", 0.04, 0.06); },
    clunk: function () { noise(0.18, 0.2, 500); tone(90, 0.18, "square", 0.04); },
    ratchet: function () { for (var i = 0; i < 4; i++) tone(700 + i * 40, 0.03, "square", 0.02, i * 0.04); },
    drop: function () { noise(0.12, 0.14, 1400); tone(160, 0.12, "sine", 0.08, 0.02); },
    paper: function () { noise(0.35, 0.07, 3500); },
    pop: function () { tone(520, 0.08, "sine", 0.08); tone(780, 0.14, "sine", 0.06, 0.07); },
    nope: function () { tone(140, 0.12, "square", 0.03); }
  };
  var soundBtn = $(".ss-sound");
  function paintSound() { soundBtn.textContent = soundOn ? "Sound on" : "Sound off"; soundBtn.setAttribute("aria-pressed", soundOn); }
  soundBtn.addEventListener("click", function () { soundOn = !soundOn; paintSound(); try { localStorage.setItem("sticker-stop-sound", soundOn ? "on" : "off"); } catch (e) {} });
  paintSound();

  // ---------- render ----------
  function renderCoins() {
    var box = $(".ss-coins");
    if (coins === 0) {
      box.innerHTML = '<button class="ss-refill" type="button">Get 3 more coins</button>';
      $(".ss-refill").addEventListener("click", function () { coins = 3; renderCoins(); say("Drag a coin onto a slider"); sfx.coin(); });
      return;
    }
    var h = "";
    for (var i = 0; i < coins; i++) h += '<button class="ss-coin" type="button" aria-label="Coin. Drag it onto a slider, or tap it and then tap a slider.">★</button>';
    box.innerHTML = h;
    Array.prototype.forEach.call(box.querySelectorAll(".ss-coin"), bindCoin);
  }
  function renderChute() {
    var ch = $(".ss-chute");
    ch.innerHTML = pending.map(function (p, i) {
      return '<button class="ss-mini" type="button" data-p="' + i + '" aria-label="Sticker packet. Tap to open.">STICKER<br>STOP</button>';
    }).join("");
    Array.prototype.forEach.call(ch.querySelectorAll(".ss-mini"), function (b) {
      b.addEventListener("click", function () { openPacket(+b.dataset.p); });
    });
  }
  function renderBook(newId) {
    var got = ALL.filter(function (a) { return book[a.id]; });
    $(".ss-count").textContent = "(" + got.length + " of " + TOTAL + ")";
    $(".ss-list").innerHTML = ALL.map(function (a) {
      var b = book[a.id];
      if (!b) return '<li class="is-empty" aria-label="Not collected yet"></li>';
      return '<li data-id="' + a.id + '" class="' + (b.holo ? "ss-holo" : "") + (a.id === newId ? " is-new" : "") + '" style="--m:url(' + src(a.id) + ')">' +
        img(a.id) + (b.n > 1 ? '<span class="ss-dup">x' + b.n + "</span>" : "") + "</li>";
    }).join("");
  }

  // ---------- coins ----------
  function mechAt(x, y) {
    for (var i = 0; i < mechEls.length; i++) {
      var r = mechEls[i].getBoundingClientRect();
      if (x > r.left - 12 && x < r.right + 12 && y > r.top - 12 && y < r.bottom + 12) return i;
    }
    return null;
  }
  function bindCoin(el) {
    el.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      var sx = e.clientX, sy = e.clientY, ghost = null, moved = false;
      el.setPointerCapture(e.pointerId);
      function move(ev) {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
          moved = true; ghost = el.cloneNode(true); ghost.classList.add("is-ghost"); ghost.classList.remove("is-picked");
          document.body.appendChild(ghost); el.classList.add("is-spent");
        }
        if (ghost) {
          ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px";
          var t = mechAt(ev.clientX, ev.clientY);
          mechEls.forEach(function (m, i) { m.classList.toggle("is-target", i === t); });
        }
      }
      function up(ev) {
        el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up);
        mechEls.forEach(function (m) { m.classList.remove("is-target"); });
        if (!moved) { pick(el); return; }
        if (ghost) ghost.remove();
        var t = mechAt(ev.clientX, ev.clientY);
        if (t === null || !insertCoin(t)) el.classList.remove("is-spent");
      }
      el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    });
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(el); } });
  }
  function pick(el) {
    var was = el.classList.contains("is-picked");
    Array.prototype.forEach.call(mount.querySelectorAll(".ss-coin.is-picked"), function (c) { c.classList.remove("is-picked"); });
    picked = was ? null : el;
    if (picked) { el.classList.add("is-picked"); say("Now tap a slider to drop it in"); }
    else say("Drag a coin onto a slider");
  }
  function insertCoin(i) {
    if (mech[i].s !== "idle") { bump(i, mech[i].s === "coined" ? "That slider already has a coin" : "Finish that one first"); return false; }
    if (coins <= 0) return false;
    coins--; picked = null; mech[i].s = "coined";
    mechEls[i].querySelector(".ss-pocket").innerHTML = '<span class="ss-coin" aria-hidden="true">★</span>';
    sfx.coin(); renderCoins(); say("Push the slider in");
    return true;
  }
  function bump(i, msg) {
    var m = mechEls[i]; m.classList.remove("is-jiggle"); void m.offsetWidth; m.classList.add("is-jiggle");
    sfx.nope(); if (msg) say(msg);
  }

  // ---------- sliders ----------
  mechEls.forEach(function (m, i) {
    var h = m.querySelector(".ss-handle");
    function setY(y) { h.style.setProperty("--y", y + "px"); h.style.setProperty("--s", (1 + (y / TRAVEL) * 0.06).toFixed(3)); }
    function push() {
      setY(-TRAVEL); mech[i].s = "pushed"; sfx.ratchet();
      setTimeout(function () { sfx.clunk(); m.querySelector(".ss-pocket").innerHTML = ""; }, 180);
      say("Clunk! Now pull it back out");
    }
    function pull() {
      setY(0); mech[i].s = "busy"; sfx.ratchet();
      setTimeout(function () { dispense(i); mech[i].s = "idle"; }, 260);
    }
    function tap() {
      var st = mech[i].s;
      if (picked && st === "idle") { picked.classList.add("is-spent"); insertCoin(i); return; }
      if (st === "coined") push();
      else if (st === "pushed") pull();
      else if (st === "idle") bump(i, coins ? "Pop a coin in first" : "Out of coins. Grab 3 more");
    }
    h.addEventListener("pointerdown", function (e) {
      var st = mech[i], sy = e.clientY, base = st.s === "pushed" ? -TRAVEL : 0, moved = false, cur = base;
      h.setPointerCapture(e.pointerId);
      function move(ev) {
        var dy = ev.clientY - sy;
        if (Math.abs(dy) > 5) moved = true;
        if (!moved) return;
        h.classList.add("is-dragging");
        cur = st.s === "idle" ? Math.max(-5, Math.min(0, dy)) : Math.max(-TRAVEL, Math.min(0, base + dy));
        setY(cur);
      }
      function up() {
        h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up);
        h.classList.remove("is-dragging");
        if (!moved) { tap(); return; }
        if (st.s === "coined") { if (cur < -TRAVEL * 0.6) push(); else setY(0); }
        else if (st.s === "pushed") { if (cur > -TRAVEL * 0.4) pull(); else setY(-TRAVEL); }
        else { setY(0); bump(i, coins ? "Pop a coin in first" : "Out of coins. Grab 3 more"); }
      }
      h.addEventListener("pointermove", move); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
    });
    h.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(); } });
  });

  function dispense(series) {
    var items = SERIES[series].items, it = items[Math.floor(Math.random() * items.length)];
    pending.push({ id: it[0], name: it[1], series: series, holo: Math.random() < 1 / 7 });
    sfx.drop(); renderChute(); say("A packet dropped. Tap it to open");
  }

  // ---------- packet ----------
  var packet = $(".ss-packet", overlay), stickBtn = $(".ss-stick", overlay), cover = $(".ss-cover", overlay);
  var lastFocus = null;
  function openPacket(idx) {
    current = pending.splice(idx, 1)[0]; renderChute();
    lastFocus = document.activeElement;
    packet.classList.remove("is-open"); stickBtn.hidden = true;
    $(".ss-ser", overlay).textContent = SERIES[current.series].name;
    $(".ss-pname", overlay).textContent = (current.holo ? "Holo " : "") + current.name;
    $(".ss-pnote", overlay).textContent = book[current.id] ? "A double! Keep it anyway." :
      current.holo ? "Shiny! These are rare." : "One of " + TOTAL + " to collect.";
    var stk = $(".ss-stk", overlay);
    stk.className = "ss-stk" + (current.holo ? " ss-holo" : "");
    stk.style.setProperty("--m", "url(" + src(current.id) + ")");
    stk.innerHTML = img(current.id);
    $(".ss-say", overlay).textContent = "Tap the packet to open it";
    overlay.hidden = false;
    setTimeout(function () { cover.focus(); }, 50);
  }
  cover.addEventListener("click", function () {
    if (packet.classList.contains("is-open")) return;
    packet.classList.add("is-open"); sfx.paper();
    setTimeout(function () {
      sfx.pop();
      $(".ss-say", overlay).textContent = "You got " + (current.holo ? "a holo " : "") + current.name + "!";
      stickBtn.hidden = false; stickBtn.focus();
    }, reduce ? 50 : 800);
  });
  function closeOverlay() { overlay.hidden = true; if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus(); }
  overlay.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && current && !packet.classList.contains("is-open")) { pending.unshift(current); current = null; closeOverlay(); renderChute(); }
  });
  stickBtn.addEventListener("click", function () {
    var c = current; if (!c) return;
    var from = $(".ss-stk", overlay).getBoundingClientRect();
    book[c.id] = book[c.id] || { n: 0, holo: false }; book[c.id].n++; if (c.holo) book[c.id].holo = true; save();
    current = null; overlay.hidden = true;
    renderBook(c.id);
    var slot = mount.querySelector('.ss-list li[data-id="' + c.id + '"]');
    var to = slot.getBoundingClientRect();
    var done = function () {
      slot.style.visibility = ""; sfx.pop();
      var got = ALL.filter(function (a) { return book[a.id]; }).length;
      if (got === TOTAL) say("Full set! Thanks for stopping by");
      else if (pending.length) say("Another packet is waiting");
      else say(coins ? "Want another? Drag a coin onto a slider" : "Out of coins. Grab 3 more");
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    };
    if (reduce || !slot.animate) { done(); return; }
    var fly = document.createElement("div");
    fly.className = "ss-flyer" + (c.holo ? " ss-holo" : "");
    fly.style.cssText = "left:" + from.left + "px;top:" + from.top + "px;width:" + from.width + "px;height:" + from.height + "px;--m:url(" + src(c.id) + ")";
    fly.innerHTML = img(c.id);
    document.body.appendChild(fly);
    slot.style.visibility = "hidden";
    var k = to.width / from.width;
    var anim = fly.animate([
      { transform: "translate(0,0) rotate(-4deg) scale(1)" },
      { transform: "translate(" + (to.left - from.left) / 2 + "px," + ((to.top - from.top) / 2 - 60) + "px) rotate(8deg) scale(" + (k + 1) / 2 + ")", offset: 0.5 },
      { transform: "translate(" + (to.left - from.left + (to.width - from.width) / 2) + "px," + (to.top - from.top + (to.height - from.height) / 2) + "px) scale(" + k + ")" }
    ], { duration: 700, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" });
    var fin = function () { fly.remove(); done(); };
    anim.onfinish = fin; anim.oncancel = fin;
  });

  renderCoins(); renderChute(); renderBook();
})();
