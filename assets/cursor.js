// A small label that types itself out just to the right of the cursor over things worth clicking.
// Mouse and trackpad only.
(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LABELS = [
    [".project, .cs2-next, .ask-case", "View case study"],
    [".badge", "Flip me"]
  ];
  var el = document.createElement("div");
  el.className = "cur-label";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);

  var current = "", timer = null;
  function typeOut(text) {
    clearInterval(timer);
    current = text;
    if (reduce) { el.textContent = text; return; }
    var n = 0;
    el.textContent = "";
    timer = setInterval(function () {
      n++;
      el.textContent = text.slice(0, n);
      if (n >= text.length) clearInterval(timer);
    }, 22);
  }

  document.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    var text = "";
    for (var i = 0; i < LABELS.length; i++) if (e.target.closest(LABELS[i][0])) { text = LABELS[i][1]; break; }
    // Sits to the right of the square, lined up with its middle
    el.style.transform = "translate(" + (e.clientX + 20) + "px," + (e.clientY - 14) + "px)";
    if (text && text !== current) typeOut(text);
    if (!text && current) { clearInterval(timer); current = ""; el.textContent = ""; }
    el.classList.toggle("is-on", !!text);
  }, { passive: true });
  document.addEventListener("mouseleave", function () { clearInterval(timer); current = ""; el.textContent = ""; el.classList.remove("is-on"); });
})();
