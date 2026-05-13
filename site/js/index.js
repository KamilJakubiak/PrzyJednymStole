
const mapOverlay   = document.getElementById('map-overlay');
const mapContainer = document.getElementById('map-embed-container');
const mapIframe    = mapContainer.querySelector('.map-embed');

// ── Map activation overlay ────────────────────────────────────────────────────

const activateMap = () => mapContainer.classList.add('active');

const deactivateMap = () => {
  if (!mapContainer.classList.contains('active')) return;
  mapContainer.classList.remove('active');
  mapIframe.contentWindow?.postMessage('resetMap', '*');
};

mapOverlay.addEventListener('click', activateMap);
mapOverlay.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateMap(); }
});

new IntersectionObserver((entries) => {
  if (entries[0].intersectionRatio < 0.2) deactivateMap();
}, { threshold: [0, 0.2] }).observe(mapContainer);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && mapContainer.classList.contains('fullscreen')) {
    collapseFullscreen(mapContainer, mapContainer._savedRect);
    mapIframe.contentWindow?.postMessage('exitFullscreen', '*');
  }
});

// Exposed so map.js can trigger the collapse animation cross-frame if needed
window.collapseFullscreen = (container, r) => {
  const EASING = 'top 0.45s cubic-bezier(0.4,0,0.2,1), left 0.45s cubic-bezier(0.4,0,0.2,1), width 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1), border-radius 0.45s cubic-bezier(0.4,0,0.2,1)';

  // Pin current fullscreen position as inline styles so we can remove the class
  Object.assign(container.style, {
    position: 'fixed', top: '0', left: '0',
    width: '100vw', height: '100dvh',
    borderRadius: '0', zIndex: '9999', transition: 'none',
  });
  container.classList.remove('fullscreen');
  document.body.style.overflow = '';

  container.getBoundingClientRect(); // force reflow

  // Animate map and backdrop back to original position
  container.style.transition = EASING;
  Object.assign(container.style, {
    top: r.top + 'px', left: r.left + 'px',
    width: r.width + 'px', height: r.height + 'px',
    borderRadius: '20px',
  });

  const backdrop = document.getElementById('map-anim-backdrop');
  if (backdrop) {
    backdrop.style.transition = EASING;
    Object.assign(backdrop.style, {
      top: r.top + 'px', left: r.left + 'px',
      width: r.width + 'px', height: r.height + 'px',
      borderRadius: '20px',
    });
  }

  const onDone = (e) => {
    if (e.propertyName !== 'width') return;
    container.removeEventListener('transitionend', onDone);
    container.style.cssText = '';
    delete container._savedRect;
    document.getElementById('map-anim-placeholder')?.remove();
    document.getElementById('map-anim-backdrop')?.remove();
  };
  container.addEventListener('transitionend', onDone);
};
