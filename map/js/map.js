// -- Map setup ------------------------------------------------

const HOME_COORDS = [51.10286, 17.03006];
const HOME_ZOOM   = 12;
const cityBounds  = L.latLngBounds([50.93, 16.61], [51.27, 17.45]);

const map = L.map('map', {
  zoomControl: false,
  minZoom: HOME_ZOOM,
  maxBounds: cityBounds,
  maxBoundsViscosity: 1.0,
}).setView(HOME_COORDS, HOME_ZOOM);

// ── Tile layer ────────────────────────────────────────────────────────────────

const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  minZoom: HOME_ZOOM,
  maxZoom: 18,
  attribution: '&copy; Kamil Jakubiak &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
  subdomains: 'abcd',
  updateWhenZooming: false,
  keepBuffer: 4,
});

streetLayer.addTo(map);


// -- DOM refs -------------------------------------------------

const popup          = document.getElementById('location-popup');
const popupImage     = document.getElementById('popup-image');
const popupTitle     = document.getElementById('popup-title');
const popupDetails   = document.getElementById('popup-details');
const popupLabels    = document.getElementById('popup-labels');
const popupDirection = document.getElementById('popup-directions');
const mapStatus      = document.getElementById('map-status');


// -- Popup ----------------------------------------------------

let activeMarker = null;

const repositionPopup = () => {
  if (!activeMarker) return;
  const pw    = popup.offsetWidth  || 244;
  const ph    = popup.offsetHeight || 0;
  const point = map.latLngToContainerPoint(activeMarker.getLatLng());
  popup.style.left = (point.x - pw / 2) + 'px';
  popup.style.top  = (point.y - 21 - 10 - ph) + 'px';
};

const openPopup = (location, marker, doPan = true) => {
  activeMarker?.getElement()?.classList.remove('marker-selected');
  activeMarker = marker;
  activeMarker.getElement()?.classList.add('marker-selected');

  const cardColor = marker.markerColor || '#ffffff';
  const cardText  = MARKER_TEXT[cardColor] || '#1e2448';
  const r = parseInt(cardColor.slice(1, 3), 16);
  const g = parseInt(cardColor.slice(3, 5), 16);
  const b = parseInt(cardColor.slice(5, 7), 16);
  popup.style.setProperty('--card-color',     cardColor);
  popup.style.setProperty('--card-color-rgb', `${r},${g},${b}`);
  popup.style.setProperty('--card-text',      cardText);

  popupImage.src            = location.image;
  popupImage.alt            = location.title;
  popupTitle.textContent    = nbspify(location.title);
  popupDetails.textContent  = nbspify(location.details);
  popupDirection.href       = `https://www.google.com/maps/dir/?api=1&destination=${location.coords[0]},${location.coords[1]}`;
  popupDirection.setAttribute('aria-label', `Nawiguj do ${location.title}`);

  popupLabels.innerHTML = '';
  (location.labels || []).forEach(label => {
    const span = document.createElement('span');
    span.className   = 'popup-label';
    span.textContent = label;
    popupLabels.appendChild(span);
  });

  popup.classList.add('open');
  popup.style.pointerEvents = 'none';
  setTimeout(() => { popup.style.pointerEvents = ''; }, 500);

  if (doPan) {
    const zoom       = map.getZoom();
    const projected  = map.project(marker.getLatLng(), zoom);
    const ph         = popup.offsetHeight || 350;
    const panTarget  = map.unproject(projected.add([0, -(ph / 2 + 40)]), zoom);
    map.panTo(panTarget, { animate: true, duration: 0.35 });
  }

  repositionPopup();

  mapStatus.textContent = `Otwarto: ${location.title}`;
  setTimeout(() => { mapStatus.textContent = ''; }, 4000);

  popup.focus();
};

const closePopup = () => {
  popup.classList.remove('open');
  const prevElement = activeMarker?.getElement();
  prevElement?.classList.remove('marker-selected');
  activeMarker = null;
  setTimeout(() => prevElement?.focus(), 150);
};

map.on('move',      repositionPopup);
map.on('zoomstart', () => { if (activeMarker) closePopup(); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && activeMarker) closePopup();
});


// -- Marker colors & shapes -----------------------------------

// cuisine code -> marker fill color (matches data.js)
const CUISINE_COLORS = {
  EU: '#09b8e3',
  EA: '#e30615',
  IN: '#ff931e',
  LA: '#30a533',
  ME: '#fdcd14',
  AF: '#ab539a',
};

// popup card text color per marker fill
const MARKER_TEXT = {
  '#fdcd14': '#1e2448',
  '#ff931e': '#1e2448',
  '#09b8e3': '#1e2448',
  '#30a533': '#fdcd14',
  '#e30615': '#fdcd14',
  '#ab539a': '#fdcd14',
};

const SHAPES = [
  { // Asset 13 - landscape stadium
    vb: '0 0 206.96 168.25',
    o: '<path fill="#fff" stroke="#8f92a4" stroke-miterlimit="10" d="M103.48,167.75c-29.94,0-59.91-3.45-89.07-10.25l-1.79-.42c-7.1-1.66-12.12-7.99-12.12-15.28V26.45c0-7.29,5.02-13.62,12.12-15.28l1.79-.42C43.57,3.95,73.54.5,103.48.5c29.94,0,59.91,3.45,89.07,10.25l1.79.42c7.1,1.66,12.12,7.99,12.12,15.28v115.36c0,7.29-5.02,13.62-12.12,15.28l-1.79.42c-29.16,6.8-59.13,10.25-89.07,10.25Z"/>',
    f: '<path fill="#1e2448" d="M103.48,158.75c-29.26,0-58.54-3.37-87.03-10.02h0c-4.07-.95-6.96-4.58-6.96-8.76V28.28c0-4.18,2.88-7.81,6.96-8.76h0c28.49-6.65,57.77-10.02,87.03-10.02,29.25,0,58.53,3.37,87.03,10.02h0c4.07.95,6.96,4.58,6.96,8.76v111.69c0,4.18-2.88,7.81-6.96,8.76h0c-28.49,6.65-57.77,10.02-87.03,10.02Z"/>',
    c: col => `<path class="mk-fill" fill="${col}" d="M188.46,139.97c-22.09,5.15-51.01,9.78-84.98,9.78-22.68,0-51.89-2.06-84.98-9.78,0-56.65,0-55.03,0-111.69,22.09-5.15,51.01-9.78,84.98-9.78,22.68,0,51.89,2.06,84.98,9.78,0,56.65,0,55.03,0,111.69Z"/>`,
  },
  { // Asset 14 - fan/book shape
    vb: '0 0 206.66 188.25',
    o: '<path fill="#fff" stroke="#8f92a4" stroke-miterlimit="10" d="M101.28,187.58c-15.82-1.82-31.82-4.01-47.54-6.53-12.89-2.06-25.92-4.39-38.72-6.92l-9.34-1.85c-3-.59-5.17-3.23-5.17-6.29V22.28c0-3.06,2.17-5.7,5.17-6.29l9.34-1.84c14.37-2.84,28.99-5.41,43.43-7.66,14.18-2.21,28.59-4.16,42.82-5.79l1.3-.15c.48-.05.96-.06,1.43,0l1.3.14c15.47,1.7,31.1,3.81,46.46,6.25,13.33,2.12,26.78,4.56,39.98,7.23l9.29,1.88c2.99.61,5.14,3.23,5.14,6.28v143.34c0,2.98-2.06,5.57-4.96,6.24l-8.96,2.08c-13.19,3.07-26.66,5.72-40.05,7.89-15.64,2.53-31.59,4.47-47.4,5.75l-1.13.09c-.42.03-.84.03-1.25-.02l-1.13-.13Z"/>',
    f: '<path fill="#1e2448" d="M102.3,178.64c-15.69-1.8-31.55-3.98-47.15-6.48-12.78-2.05-25.7-4.36-38.4-6.87l-1.24-.25c-3.49-.69-6.01-3.75-6.01-7.32V30.54c0-3.56,2.52-6.63,6.01-7.32l1.24-.25c14.25-2.81,28.75-5.37,43.07-7.6,14.06-2.19,28.35-4.12,42.47-5.75l.18-.02c.55-.06,1.11-.06,1.66,0l.18.02c15.32,1.69,30.81,3.77,46.03,6.2,13.21,2.1,26.53,4.51,39.6,7.16l1.24.25c3.48.7,5.98,3.76,5.98,7.31v127.15c0,3.47-2.39,6.48-5.77,7.26l-1.19.28c-12.99,3.02-26.26,5.63-39.45,7.77-15.41,2.5-31.12,4.4-46.69,5.67l-.88.07-.88-.1Z"/>',
    c: col => `<path class="mk-fill" fill="${col}" d="M18.5,31.8v124.66c12.27,2.43,24.97,4.71,38.08,6.81,16.1,2.58,31.7,4.69,46.75,6.42,14.37-1.17,29.75-2.95,45.98-5.58,13.76-2.23,26.72-4.83,38.85-7.65,0-41.55,0-83.11,0-124.66-12.57-2.55-25.65-4.93-39.23-7.09-15.75-2.51-30.97-4.53-45.6-6.14-13.59,1.56-27.64,3.45-42.12,5.7-14.78,2.3-29.03,4.83-42.71,7.53Z"/>`,
  },
  { // Asset 15 - octagon
    vb: '0 0 206.66 206.66',
    o: '<path fill="#fff" stroke="#8f92a4" stroke-miterlimit="10" d="M70.57,204.5L4.89,160.72c-2.74-1.83-4.39-4.9-4.39-8.2V54.14c0-3.29,1.65-6.37,4.39-8.2L70.57,2.15c1.62-1.08,3.52-1.65,5.46-1.65h54.59c1.94,0,3.85.58,5.46,1.65l65.68,43.79c2.74,1.83,4.39,4.9,4.39,8.2v98.38c0,3.29-1.65,6.37-4.39,8.2l-65.68,43.79c-1.62,1.08-3.52,1.65-5.46,1.65h-54.59c-1.94,0-3.85-.58-5.46-1.65Z"/>',
    f: '<path fill="#1e2448" d="M73.24,195.47l-59.26-39.51c-2.8-1.87-4.48-5.01-4.48-8.37V59.07c0-3.36,1.68-6.5,4.48-8.37L73.24,11.19c1.65-1.1,3.59-1.69,5.58-1.69h49.02c1.99,0,3.93.59,5.58,1.69l59.26,39.51c2.8,1.87,4.48,5.01,4.48,8.37v88.53c0,3.36-1.68,6.5-4.48,8.37l-59.26,39.51c-1.65,1.1-3.59,1.69-5.58,1.69h-49.02c-1.99,0-3.93-.59-5.58-1.69Z"/>',
    c: col => `<polygon class="mk-fill" fill="${col}" points="78.5 18.5 18.5 58.5 18.5 148.16 78.5 188.16 128.16 188.16 188.16 148.16 188.16 58.5 128.16 18.5 78.5 18.5"/>`,
  },
  { // Asset 16 - circle
    vb: '0 0 206.96 206.96',
    o: '<path fill="#fff" stroke="#8f92a4" stroke-miterlimit="10" d="M103.48,206.46C46.7,206.46.5,160.26.5,103.48S46.7.5,103.48.5s102.98,46.2,102.98,102.98-46.2,102.98-102.98,102.98Z"/>',
    f: '<path fill="#1e2448" d="M103.48,197.46c-51.82,0-93.98-42.16-93.98-93.98S51.66,9.5,103.48,9.5s93.98,42.16,93.98,93.98-42.16,93.98-93.98,93.98Z"/>',
    c: col => `<rect class="mk-fill" fill="${col}" x="18.5" y="18.5" width="169.96" height="169.96" rx="84.98" ry="84.98"/>`,
  },
  { // Asset 17 - rounded square
    vb: '0 0 206.96 206.96',
    o: '<path fill="#fff" stroke="#8f92a4" stroke-miterlimit="10" d="M58.52.5h89.92c32.02,0,58.02,26,58.02,58.02v89.93c0,32.02-26,58.02-58.02,58.02H58.52c-32.02,0-58.02-26-58.02-58.02V58.52C.5,26.5,26.5.5,58.52.5Z" transform="translate(206.96 0) rotate(90)"/>',
    f: '<path fill="#1e2448" d="M58.52,9.5h89.92c27.05,0,49.02,21.96,49.02,49.02v89.93c0,27.05-21.96,49.02-49.02,49.02H58.52c-27.05,0-49.02-21.96-49.02-49.02V58.52c0-27.05,21.96-49.02,49.02-49.02Z" transform="translate(206.96 0) rotate(90)"/>',
    c: col => `<rect class="mk-fill" fill="${col}" x="18.5" y="18.5" width="169.96" height="169.96" rx="40.02" ry="40.02"/>`,
  },
];

const mkIcon = (si, col) => {
  const s = SHAPES[si];
  return `<div class="marker-shape"><svg viewBox="${s.vb}" xmlns="http://www.w3.org/2000/svg" width="42" height="42">${s.o}${s.f}${s.c(col)}</svg></div>`;
};


// -- Markers --------------------------------------------------

const markers = [];
let suppressMapClick = false;

// Colors are fixed per cuisine code; only shapes are randomised and cached
const STORAGE_KEY = 'marker-shapes-v2';
const mkAssign = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length === locations.length) {
      return saved.map((si, i) => ({ si, col: CUISINE_COLORS[locations[i].cuisine] }));
    }
  } catch (e) {}
  const shapes = locations.map(() => Math.floor(Math.random() * SHAPES.length));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(shapes)); } catch (e) {}
  return shapes.map((si, i) => ({ si, col: CUISINE_COLORS[locations[i].cuisine] }));
})();

locations.forEach((location, i) => {
  const { si, col } = mkAssign[i];
  const marker = L.marker(location.coords, {
    icon: L.divIcon({
      className: 'custom-div-icon',
      html: mkIcon(si, col),
      iconSize:   [42, 42],
      iconAnchor: [21, 21],
    }),
  }).addTo(map);

  marker.location    = location;
  marker.markerColor = col;

  const el = marker.getElement();
  if (el) {
    el.setAttribute('tabindex',     '0');
    el.setAttribute('role',         'button');
    el.setAttribute('aria-label',   location.title);
    el.setAttribute('aria-disabled','false');
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!el.classList.contains('marker-inactive')) openPopup(location, marker);
      }
    });
  }

  marker.on('click', () => {
    if (marker.getElement()?.classList.contains('marker-inactive')) return;
    suppressMapClick = true;
    setTimeout(() => { suppressMapClick = false; }, 0);
    openPopup(location, marker);
  });

  markers.push(marker);
});

map.on('click', () => {
  if (suppressMapClick || !activeMarker) return;
  closePopup();
});


// -- Filters --------------------------------------------------

const getActiveFilters = () => {
  const filters = {};
  document.querySelectorAll('#filter-checkboxes input[type="checkbox"]:checked').forEach(cb => {
    const type = cb.dataset.filterType;
    if (!filters[type]) filters[type] = [];
    filters[type].push(cb.value);
  });
  return filters;
};

const matchesFilters = (location, filters) =>
  Object.entries(filters).every(([type, values]) => !values.length || values.includes(location[type]));

const applyFilters = () => {
  const filters = getActiveFilters();
  markers.forEach(marker => {
    const inactive = !matchesFilters(marker.location, filters);
    const el = marker.getElement();
    el?.classList.toggle('marker-inactive', inactive);
    el?.setAttribute('aria-disabled', inactive ? 'true' : 'false');
  });
};

document.querySelectorAll('#filter-checkboxes input[type="checkbox"]').forEach(cb => {
  cb.addEventListener('change', applyFilters);
});

const filterPanel     = document.getElementById('filter-panel');
const filterToggleBtn = document.getElementById('filter-toggle-btn');

const positionFilterPanel = () => {
  const r      = filterToggleBtn.getBoundingClientRect();
  const panelW = filterPanel.offsetWidth || 200;
  const cx     = r.left + r.width / 2;

  if (r.top > window.innerHeight / 2) {
    // Button is near the bottom (desktop) — open upward
    filterPanel.style.bottom = (window.innerHeight - r.top + 10) + 'px';
    filterPanel.style.top    = '';
  } else {
    // Button is near the top (mobile) — open downward
    filterPanel.style.top    = (r.bottom + 10) + 'px';
    filterPanel.style.bottom = '';
  }

  filterPanel.style.left      = Math.max(8, Math.min(cx - panelW / 2, window.innerWidth - panelW - 8)) + 'px';
  filterPanel.style.right     = '';
  filterPanel.style.transform = 'none';
};

filterToggleBtn.addEventListener('click', () => {
  const isOpen = filterPanel.classList.toggle('open');
  filterToggleBtn.classList.toggle('open', isOpen);
  filterToggleBtn.setAttribute('aria-expanded', isOpen);
  if (isOpen) positionFilterPanel();
});

window.addEventListener('resize', () => {
  if (filterPanel.classList.contains('open')) positionFilterPanel();
});


// -- Random location ------------------------------------------

const focusRandomLocation = () => {
  const visible = markers.filter(m => !m.getElement()?.classList.contains('marker-inactive'));

  if (!visible.length) {
    mapStatus.textContent = 'Brak lokalizacji spełniających wybrane filtry.';
    setTimeout(() => { mapStatus.textContent = ''; }, 4000);
    return;
  }

  if (activeMarker) closePopup();

  const picked      = visible[Math.floor(Math.random() * visible.length)];
  const targetZoom  = 15;
  const projected   = map.project(picked.getLatLng(), targetZoom);
  const targetLatLng = map.unproject(projected.add([0, -85]), targetZoom);

  map.once('moveend', () => openPopup(picked.location, picked, false));
  map.setView(targetLatLng, targetZoom, { animate: true, duration: 0.8 });
};

document.getElementById('random-btn').addEventListener('click', focusRandomLocation);


// -- Zoom buttons ---------------------------------------------

const zoomInBtn  = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');

const updateZoomButtons = () => {
  const z = map.getZoom();
  zoomInBtn.classList.toggle('zoom-disabled',  z >= map.getMaxZoom());
  zoomOutBtn.classList.toggle('zoom-disabled', z <= map.getMinZoom());
};

zoomInBtn.addEventListener('click',  () => map.zoomIn());
zoomOutBtn.addEventListener('click', () => map.zoomOut());
map.on('zoomend', updateZoomButtons);


// -- Fullscreen -----------------------------------------------

const ICON_EXPAND   = 'M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4';
const ICON_COLLAPSE = 'M7 3v4H3M17 7h-4V3M13 17v-4h4M3 13h4v4';

const fullscreenBtn   = document.getElementById('fullscreen-btn');
const fullscreenIcon  = document.getElementById('fullscreen-icon').querySelector('path');
const fullscreenLabel = document.getElementById('fullscreen-label');

const setFullscreenState = isFullscreen => {
  fullscreenIcon.setAttribute('d', isFullscreen ? ICON_COLLAPSE : ICON_EXPAND);
  fullscreenLabel.textContent = isFullscreen ? 'Minimalizuj' : 'Pełny ekran';
};

const EASING = 'top 0.45s cubic-bezier(0.4,0,0.2,1), left 0.45s cubic-bezier(0.4,0,0.2,1), width 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1), border-radius 0.45s cubic-bezier(0.4,0,0.2,1)';

let savedRect = null;

fullscreenBtn.addEventListener('click', () => {
  if (window.frameElement) {
    const parentDoc  = window.parent.document;
    const container  = parentDoc.getElementById('map-embed-container');
    const expanding  = !container.classList.contains('fullscreen');

    if (expanding) {
      savedRect = container.getBoundingClientRect();
      container._savedRect = savedRect;

      const placeholder = parentDoc.createElement('div');
      placeholder.id = 'map-anim-placeholder';
      placeholder.style.height = savedRect.height + 'px';
      container.insertAdjacentElement('afterend', placeholder);

      const backdrop = parentDoc.createElement('div');
      backdrop.id = 'map-anim-backdrop';
      Object.assign(backdrop.style, {
        position: 'fixed',
        top: savedRect.top + 'px', left: savedRect.left + 'px',
        width: savedRect.width + 'px', height: savedRect.height + 'px',
        background: '#1E2448', borderRadius: '20px',
        zIndex: '9998', transition: 'none',
      });
      parentDoc.body.appendChild(backdrop);
      backdrop.getBoundingClientRect();
      backdrop.style.transition = EASING;
      Object.assign(backdrop.style, {
        top: '0', left: '0', width: '100vw', height: '100dvh', borderRadius: '0',
      });

      Object.assign(container.style, {
        position: 'fixed', top: savedRect.top + 'px', left: savedRect.left + 'px',
        width: savedRect.width + 'px', height: savedRect.height + 'px',
        borderRadius: '20px', zIndex: '9999', transition: 'none',
      });
      container.getBoundingClientRect();
      container.style.transition = EASING;
      Object.assign(container.style, {
        top: '0', left: '0', width: '100vw', height: '100dvh', borderRadius: '0',
      });
      parentDoc.body.style.overflow = 'hidden';

      const onDone = e => {
        if (e.propertyName !== 'width') return;
        container.removeEventListener('transitionend', onDone);
        container.classList.add('fullscreen');
        container.style.cssText = '';
      };
      container.addEventListener('transitionend', onDone);

    } else {
      window.parent.collapseFullscreen(container, savedRect);
      savedRect = null;
    }

    setFullscreenState(expanding);
  } else {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }
});

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) setFullscreenState(false);
});


// -- Button press animation -----------------------------------

const MIN_PRESS_MS = 150;

document.querySelectorAll('.bar-btn').forEach(btn => {
  let pressedAt = 0;

  btn.addEventListener('pointerdown', () => {
    pressedAt = Date.now();
    btn.classList.add('is-pressed');
  });

  const release = () => {
    const remaining = Math.max(0, MIN_PRESS_MS - (Date.now() - pressedAt));
    setTimeout(() => btn.classList.remove('is-pressed'), remaining);
  };

  btn.addEventListener('pointerup',     release);
  btn.addEventListener('pointercancel', release);
});


// -- Parent page messages -------------------------------------

window.addEventListener('message', e => {
  if (e.data === 'resetMap') {
    if (activeMarker) closePopup();
    map.setView(HOME_COORDS, HOME_ZOOM, { animate: false });
  }
  if (e.data === 'exitFullscreen') {
    setFullscreenState(false);
  }
});


// -- Init -----------------------------------------------------

applyFilters();
updateZoomButtons();
