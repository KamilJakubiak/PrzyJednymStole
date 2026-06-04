// ── Hero logo — two-layer crossfade, steady interval ─────────
const heroLogo = document.getElementById('hero-logo');
if (heroLogo && window.LandingLogo) {
  const layers = [document.createElement('div'), document.createElement('div')];
  layers.forEach(l => { l.className = 'logo-layer'; heroLogo.appendChild(l); });

  layers[0].style.opacity = '1';
  layers[1].style.opacity = '0';
  layers[0].innerHTML = LandingLogo.cloud(Math.ceil(Math.random() * 6), { mode: 'brand', outline: true });

  let active = 0;

  function swap() {
    const next = 1 - active;
    layers[next].innerHTML = LandingLogo.cloud(Math.ceil(Math.random() * 6), { mode: 'brand', outline: true });
    layers[next].style.opacity = '1';
    layers[active].style.opacity = '0';
    active = next;
  }

  setInterval(swap, 1800);
}


// ── Scroll reveal ─────────────────────────────────────────────
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('is-visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

document.querySelectorAll('[data-reveal]').forEach(el => revealObs.observe(el));


// ── Map activation ────────────────────────────────────────────
const mapWrap    = document.getElementById('map-wrap');
const mapOverlay = document.getElementById('map-overlay');
if (mapOverlay && mapWrap) {
  const activate   = () => mapWrap.classList.add('active');
  const deactivate = () => mapWrap.classList.remove('active');

  mapOverlay.addEventListener('click', activate);
  mapOverlay.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
  });

  const mapaSection = document.getElementById('mapa');
  if (mapaSection) {
    new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) deactivate();
    }, { threshold: 0 }).observe(mapaSection);
  }
}
