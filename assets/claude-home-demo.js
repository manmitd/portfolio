/* Claude at Home: animated device prototype */
(function () {
  var root = document.querySelector('[data-chd]');
  if (!root) return;

  var scenes = Array.prototype.slice.call(root.querySelectorAll('.chd-scene'));
  var caption = root.querySelector('.chd-caption');
  var dotsWrap = root.querySelector('.chd-dots');
  var playBtn = root.querySelector('.chd-play');
  var timerEl = root.querySelector('[data-timer]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var current = -1;
  var playing = !reduce;
  var sceneTimer = null;
  var typeTimers = [];
  var countTimer = null;
  var inView = false;

  // Build step dots
  scenes.forEach(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + s.getAttribute('data-name'));
    b.addEventListener('click', function () { go(i); if (playing) schedule(); });
    dotsWrap.appendChild(b);
  });
  var dots = Array.prototype.slice.call(dotsWrap.children);

  function clearTyping() {
    typeTimers.forEach(clearTimeout);
    typeTimers = [];
  }

  function type(el, delay) {
    var full = el.getAttribute('data-type');
    el.classList.remove('is-done');
    if (reduce) { el.textContent = full; el.classList.add('is-done'); return; }
    el.textContent = '';
    var i = 0;
    function tick() {
      i++;
      el.textContent = full.slice(0, i);
      if (i < full.length) typeTimers.push(setTimeout(tick, 32));
      else el.classList.add('is-done');
    }
    typeTimers.push(setTimeout(tick, delay));
  }

  function startCountdown() {
    clearInterval(countTimer);
    if (!timerEl) return;
    var secs = 6 * 60;
    function render() {
      var m = Math.floor(secs / 60), s = secs % 60;
      timerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    }
    render();
    if (reduce) return;
    countTimer = setInterval(function () { secs = Math.max(0, secs - 1); render(); }, 1000);
  }

  function go(i) {
    current = (i + scenes.length) % scenes.length;
    clearTyping();
    scenes.forEach(function (s, n) {
      var on = n === current;
      s.classList.toggle('is-on', on);
      s.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    dots.forEach(function (d, n) {
      if (n === current) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
    });
    var s = scenes[current];
    root.setAttribute('data-light', s.getAttribute('data-light') || 'off');
    caption.innerHTML = s.querySelector('template').innerHTML;

    var typed = s.querySelectorAll('[data-type]');
    var delay = 350;
    Array.prototype.forEach.call(typed, function (el) {
      type(el, delay);
      delay += el.getAttribute('data-type').length * 32 + 700;
    });
    // Reveal anything marked to appear after typing finishes
    Array.prototype.forEach.call(s.querySelectorAll('[data-after]'), function (el) {
      el.style.visibility = reduce ? 'visible' : 'hidden';
      if (!reduce) typeTimers.push(setTimeout(function () { el.style.visibility = 'visible'; }, Number(el.getAttribute('data-after'))));
    });
    if (s.hasAttribute('data-countdown')) startCountdown();
  }

  function schedule() {
    clearTimeout(sceneTimer);
    if (!playing || !inView) return;
    var ms = Number(scenes[current].getAttribute('data-ms')) || 4000;
    sceneTimer = setTimeout(function () { go(current + 1); schedule(); }, ms);
  }

  function setPlaying(p) {
    playing = p;
    playBtn.textContent = p ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-pressed', p ? 'false' : 'true');
    if (p) schedule(); else clearTimeout(sceneTimer);
  }

  playBtn.addEventListener('click', function () { setPlaying(!playing); });

  // Only run while the prototype is on screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView && current === -1) go(0);
      if (inView) schedule(); else clearTimeout(sceneTimer);
    }, { threshold: 0.35 }).observe(root);
  } else {
    inView = true;
  }

  go(0);
  setPlaying(playing);
})();
