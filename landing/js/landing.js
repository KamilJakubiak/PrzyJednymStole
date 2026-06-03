// ── Hero intro — 3 logos pop in tempo, then scroll to about ──────────────────
(function () {
  const slots   = [0, 1, 2].map(i => document.getElementById('intro-' + i));
  const about   = document.getElementById('o-kampanii');
  if (!slots[0] || !window.LandingLogo) return;

  // Pre-render 3 different logo shapes with spread colour phases
  slots.forEach((el, i) => {
    el.innerHTML = LandingLogo.single({ index: i * 2, colorIndex: i });
  });

  // Pop in: 0 ms, 320 ms, 640 ms
  let autoScrollBlocked = false;
  window.addEventListener('wheel',      () => { autoScrollBlocked = true; }, { once: true, passive: true });
  window.addEventListener('touchstart', () => { autoScrollBlocked = true; }, { once: true, passive: true });
  window.addEventListener('keydown',    () => { autoScrollBlocked = true; }, { once: true });

  slots.forEach((el, i) => {
    setTimeout(() => el.classList.add('pop'), i * 320);
  });

  // After last pop + short hold, scroll to about
  setTimeout(() => {
    if (!autoScrollBlocked && about) {
      about.scrollIntoView({ behavior: 'smooth' });
    }
  }, 640 + 320 + 500); // last logo + 500ms pause
})();

// ── Footer logo ───────────────────────────────────────────────────────────────
const footerLogo = document.getElementById('footer-logo');
if (footerLogo && window.LandingLogo) {
  footerLogo.innerHTML = LandingLogo.cloud(2, { mode: 'brand', outline: true });
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────
const reveals = document.querySelectorAll('[data-reveal]');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('is-visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });
reveals.forEach(el => revealObs.observe(el));

// ── Map activation ────────────────────────────────────────────────────────────
const mapWrap    = document.getElementById('map-wrap');
const mapOverlay = document.getElementById('map-overlay');
if (mapOverlay && mapWrap) {
  const activate = () => mapWrap.classList.add('active');
  mapOverlay.addEventListener('click', activate);
  mapOverlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
  });
}
