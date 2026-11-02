// Custom cursor: a crisp dusty blue square that sits exactly where the mouse is.
// Over anything clickable it shrinks with a little bounce. Over case study images and the badge, a label types out beside it.
// Mouse and trackpad only: phones, tablets and pens keep their normal behaviour.
(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LABELS = [
    [".project-media, .cs2-next img, .ask-case img", "View case study"],
    [".badge", "Flip me"]
  ];
  var CLICKABLE = "a, button, [role='button'], summary, label, .zoomable, .badge";

  var cur = document.createElement("div");
  cur.className = "cur";
  cur.setAttribute("aria-hidden", "true");
  cur.innerHTML = '<span class="cur-sq"></span><span class="cur-label"></span>';
  document.body.appendChild(cur);
  var label = cur.querySelector(".cur-label");
  document.documentElement.classList.add("has-cur");

  var current = "", timer = null;
  function typeOut(text) {
    clearInterval(timer);
    current = text;
    if (reduce) { label.textContent = text; return; }
    var n = 0;
    label.textContent = "";
    timer = setInterval(function () {
      n++;
      label.textContent = text.slice(0, n);
      if (n >= text.length) clearInterval(timer);
    }, 22);
  }
  function clearLabel() { clearInterval(timer); current = ""; label.textContent = ""; }

  document.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    cur.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";
    cur.classList.add("is-on");
    var t = e.target, text = "";
    for (var i = 0; i < LABELS.length; i++) if (t.closest(LABELS[i][0])) { text = LABELS[i][1]; break; }
    if (text && text !== current) typeOut(text);
    if (!text && current) clearLabel();
    cur.classList.toggle("is-link", !!t.closest(CLICKABLE));
    cur.classList.toggle("on-blue", !t.closest(".badge") && !!t.closest(".mat, .cs2-stats, .ask-q"));
  }, { passive: true });

  document.documentElement.addEventListener("mouseleave", function () { cur.classList.remove("is-on"); clearLabel(); });
  document.addEventListener("pointerdown", function () { cur.classList.add("is-down"); });
  document.addEventListener("pointerup", function () { cur.classList.remove("is-down"); });
})();
