// A small label that sits beside the cursor over things worth clicking.
// Mouse and trackpad only.
(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var LABELS = [
    [".project, .cs2-next, .ask-case", "View case study"],
    [".badge", "Flip me"]
  ];
  var el = document.createElement("div");
  el.className = "cur-label";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);

  document.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    var text = "";
    for (var i = 0; i < LABELS.length; i++) if (e.target.closest(LABELS[i][0])) { text = LABELS[i][1]; break; }
    if (text) { el.textContent = text; el.style.transform = "translate(" + (e.clientX + 18) + "px," + (e.clientY + 18) + "px) rotate(-4deg)"; }
    el.classList.toggle("is-on", !!text);
  }, { passive: true });
  document.addEventListener("mouseleave", function () { el.classList.remove("is-on"); });
})();
