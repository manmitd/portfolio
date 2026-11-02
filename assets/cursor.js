// A small tilted square that trails the normal cursor.
// Over a project card it opens into a "View case study" pill, and over the badge it says "Flip me".
// Mouse and trackpad only: phones, tablets and pens keep their normal behaviour.
(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var el = document.createElement("div");
  el.className = "cur";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<span class="cur-label"></span>';
  document.body.appendChild(el);
  var label = el.firstChild;

  var LABELS = [
    [".project, .cs2-next, .ask-case", "View case study"],
    [".badge", "Flip me"]
  ];

  var x = -100, y = -100, tx = -100, ty = -100, shown = false, raf = null;

  function tick() {
    var k = reduce ? 1 : 0.22;
    x += (tx - x) * k;
    y += (ty - y) * k;
    el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
    if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) raf = requestAnimationFrame(tick);
    else raf = null;
  }

  function update(target) {
    var text = "";
    for (var i = 0; i < LABELS.length; i++) {
      if (target.closest(LABELS[i][0])) { text = LABELS[i][1]; break; }
    }
    if (text) label.textContent = text;
    el.classList.toggle("is-label", !!text);
    el.classList.toggle("is-link", !text && !!target.closest("a, button, [role='button'], summary, label, .zoomable"));
    el.classList.toggle("on-blue", !target.closest(".badge") && !!target.closest(".mat, .cs2-stats, .ask-q"));
  }

  document.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    tx = e.clientX; ty = e.clientY;
    if (!shown) { x = tx; y = ty; shown = true; el.classList.add("is-on"); }
    update(e.target);
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });

  document.addEventListener("mouseleave", function () { shown = false; el.classList.remove("is-on"); });
  document.addEventListener("pointerdown", function () { el.classList.add("is-down"); });
  document.addEventListener("pointerup", function () { el.classList.remove("is-down"); });
})();
