// -- Map setup --
const HOME_COORDS = [51.10286, 17.03006];
const HOME_ZOOM   = 12;
const cityBounds  = L.latLngBounds([50.93, 16.61], [51.27, 17.45]);

const map = L.map('map', {
  zoomControl: false,
  minZoom: HOME_ZOOM,
  maxZoom: 18,
  maxBounds: cityBounds,
  maxBoundsViscosity: 1.0,
  // Tiles fading in keep re-blending for a while after every move — costly without a GPU
  fadeAnimation: false,
}).setView(HOME_COORDS, HOME_ZOOM);

// MapLibre needs WebGL (same check it runs itself). Without it — e.g. graphics
// acceleration turned off in the browser — it throws and nothing below would run.
const hasWebGL = (() => {
  const gl = document.createElement('canvas').getContext('webgl2')
          || document.createElement('canvas').getContext('webgl');
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
  return !!gl;
})();

// L.MaplibreGL is missing if the MapLibre scripts failed to load — use the raster fallback then too
if (hasWebGL && L.MaplibreGL) {
  // The plugin redraws the whole vector map on every 'move' (every 32 ms while dragging),
  // which is what stutters on slower devices. Its canvas already overhangs the view by
  // `padding` and slides along with the map, so only redraw once the view nears that
  // edge — synchronously, so the moved canvas and its new content land in the same frame.
  const BufferedMaplibreGL = L.MaplibreGL.extend({
    _update(e) {
      if (e?.type === 'move' && !this._zooming && this._drawnAt) {
        const drift = this._map.containerPointToLayerPoint([0, 0]).subtract(this._drawnAt);
        const slack = this._map.getSize().multiplyBy(this.options.padding * 0.75);
        if (Math.abs(drift.x) < slack.x && Math.abs(drift.y) < slack.y) return;
      }
      L.MaplibreGL.prototype._update.call(this, e);
      if (this._zooming) return;
      this._drawnAt = this._map.containerPointToLayerPoint([0, 0]);
      if (this._glMap.isStyleLoaded()) this._glMap.redraw();
    },
    // The zoom animation assumes the canvas was drawn at the current position
    _zoomStart(e) {
      this._update();
      L.MaplibreGL.prototype._zoomStart.call(this, e);
    },
  });

  // Positron style from OpenFreeMap — free, no API key (CARTO basemaps now require one)
  new BufferedMaplibreGL({
    style: 'https://tiles.openfreemap.org/styles/positron',
    // Phones report up to 3× density; 2× looks the same and is less than half the pixels
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    // No label fade-in, which otherwise keeps repainting for 300 ms after every move
    fadeDuration: 0,
    // customAttribution, because the plugin otherwise swaps in the style's own credits on load
    attributionControl: {
      customAttribution: '&copy; Kamil Jakubiak &copy; <a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    },
  }).addTo(map);
} else {
  // Fallback: Esri Light Gray Canvas raster tiles (no key either) — closest look to Positron.
  // Esri only draws up to z16; anything closer is a blurry upscale, so stop there.
  map.setMaxZoom(16);
  const esriGray = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_';
  const loadImage = src => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  // Esri serves the base and the labels separately. Without WebGL the browser usually has
  // no GPU compositing either, so every frame of a drag or zoom blends each full-screen
  // layer on the CPU — flatten both into one canvas per tile so there's only one layer.
  const EsriLightGray = L.GridLayer.extend({
    createTile(coords, done) {
      const tile = document.createElement('canvas');
      const size = this.getTileSize();
      tile.width = size.x;
      tile.height = size.y;
      const path = `/MapServer/tile/${coords.z}/${coords.y}/${coords.x}`;
      Promise.allSettled([loadImage(esriGray + 'Base' + path), loadImage(esriGray + 'Reference' + path)])
        .then(([base, labels]) => {
          const ctx = tile.getContext('2d');
          if (base.status === 'fulfilled') ctx.drawImage(base.value, 0, 0);
          if (labels.status === 'fulfilled') ctx.drawImage(labels.value, 0, 0);
          done(base.status === 'fulfilled' ? null : base.reason, tile);
        });
      return tile;
    },
  });

  new EsriLightGray({
    updateWhenZooming: false,
    keepBuffer: 4,
    attribution: '&copy; Kamil Jakubiak &copy; <a href="https://www.esri.com" target="_blank">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
  }).addTo(map);
}

// -- DOM refs --
const popup          = document.getElementById('location-popup');
const mapStatus      = document.getElementById('map-status');
const filterPanel    = document.getElementById('filter-panel');
const filterToggleBtn= document.getElementById('filter-toggle-btn');
const zoomInBtn      = document.getElementById('zoom-in-btn');
const zoomOutBtn     = document.getElementById('zoom-out-btn');
const fullscreenBtn  = document.getElementById('fullscreen-btn');
const fullscreenIcon = document.getElementById('fullscreen-icon').querySelector('path');
const fullscreenLabel= document.getElementById('fullscreen-label');

// -- Popup --

let activeMarker = null;

const repositionPopup = () => {
  if (!activeMarker) return;
  const pw    = popup.offsetWidth  || 244;
  const ph    = popup.offsetHeight || 0;
  const point = map.latLngToContainerPoint(activeMarker.getLatLng());
  popup.style.left = (point.x - pw / 2) + 'px';
  popup.style.top  = (point.y - 21 + 42 * 0.4 - ph) + 'px';
};

// Bumped whenever something else takes over the map, so a "Wylosuj" still in flight
// doesn't open its card on top — see focusRandomLocation
let randomToken = 0;
const cancelPendingRandom = () => { randomToken++; };

// Writes a location into a card: the live popup, or a probe used only to measure it
const fillPopup = (root, location, marker, withImage = true) => {
  const cardColor = marker.markerColor || '#ffffff';
  const cardText  = MARKER_TEXT[cardColor] || '#1e2448';
  const r = parseInt(cardColor.slice(1, 3), 16);
  const g = parseInt(cardColor.slice(3, 5), 16);
  const b = parseInt(cardColor.slice(5, 7), 16);
  root.style.setProperty('--card-color',     cardColor);
  root.style.setProperty('--card-color-rgb', `${r},${g},${b}`);
  root.style.setProperty('--card-text',      cardText);

  if (withImage) {
    const img = root.querySelector('.popup-image');
    img.src = location.image;
    img.alt = location.title;
  }
  root.querySelector('.popup-title').textContent   = nbspify(location.title);
  root.querySelector('.popup-details').textContent = nbspify(location.details);
  const directions = root.querySelector('.popup-directions');
  directions.href = `https://www.google.com/maps/dir/?api=1&destination=${location.coords[0]},${location.coords[1]}`;
  directions.setAttribute('aria-label', `Nawiguj do ${location.title}`);

  const labels = root.querySelector('.popup-labels');
  labels.innerHTML = '';
  (location.labels || []).forEach(label => {
    const span = document.createElement('span');
    span.className   = 'popup-label';
    span.textContent = label;
    labels.appendChild(span);
  });
};

// Height the card will have for this location, measured on an off-screen copy so the
// visible card (possibly still fading out) keeps its content
const measureCard = (location, marker) => {
  const probe = popup.cloneNode(true);
  probe.removeAttribute('id');
  probe.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  probe.setAttribute('aria-hidden', 'true');
  probe.classList.add('open');
  probe.style.cssText = 'left: -9999px; top: 0; transition: none; pointer-events: none;';
  fillPopup(probe, location, marker, false);
  document.body.appendChild(probe);
  const height = probe.offsetHeight;
  probe.remove();
  return height;
};

const openPopup = (location, marker, doPan = true) => {
  cancelPendingRandom();
  activeMarker?.getElement()?.classList.remove('marker-selected');
  activeMarker = marker;
  activeMarker.getElement()?.classList.add('marker-selected');

  fillPopup(popup, location, marker);

  popup.classList.add('open');
  // Block pointer events briefly so the opening click doesn't immediately re-trigger
  popup.style.pointerEvents = 'none';
  setTimeout(() => { popup.style.pointerEvents = ''; }, 500);

  if (doPan) {
    const zoom      = map.getZoom();
    const projected = map.project(marker.getLatLng(), zoom);
    const panTarget = map.unproject(projected.add([0, -((popup.offsetHeight || 350) / 2 + 13)]), zoom);
    map.panTo(panTarget, { animate: true, duration: 0.35 });
  }

  repositionPopup();

  mapStatus.textContent = `Otwarto: ${location.title}`;
  setTimeout(() => { mapStatus.textContent = ''; }, 4000);
  // preventScroll: focusing something off-screen would otherwise scroll the map container
  popup.focus({ preventScroll: true });
};

// Focus goes back to the marker only when the card is dismissed from the keyboard: Leaflet
// pans a focused marker into view, which would cut short the move that closed the card
// (e.g. "Wylosuj" heading elsewhere, leaving the map halfway and no card opened)
const closePopup = (restoreFocus = false) => {
  popup.classList.remove('open');
  const prevEl = activeMarker?.getElement();
  prevEl?.classList.remove('marker-selected');
  activeMarker = null;
  if (restoreFocus) setTimeout(() => prevEl?.focus({ preventScroll: true }), 150);
};

map.on('move',      repositionPopup);
map.on('dragstart', cancelPendingRandom);
map.on('zoomstart', () => { if (activeMarker) closePopup(); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && activeMarker) closePopup(true);
});

// -- Marker colors & shapes --

const CUISINE_COLORS = {
  EU: '#09b8e3', EA: '#e30615', IN: '#ff931e',
  LA: '#30a533', ME: '#fdcd14', AF: '#ab539a',
};

const MARKER_TEXT = {
  '#fdcd14': '#1e2448', '#ff931e': '#1e2448', '#09b8e3': '#1e2448',
  '#30a533': '#fdcd14', '#e30615': '#fdcd14', '#ab539a': '#fdcd14',
};

const SHAPES = [
  { // landscape stadium
    vb: '0 0 206.96 168.25',
    o: '<path fill="#fff" stroke="#8f92a4" stroke-miterlimit="10" d="M103.48,167.75c-29.94,0-59.91-3.45-89.07-10.25l-1.79-.42c-7.1-1.66-12.12-7.99-12.12-15.28V26.45c0-7.29,5.02-13.62,12.12-15.28l1.79-.42C43.57,3.95,73.54.5,103.48.5c29.94,0,59.91,3.45,89.07,10.25l1.79.42c7.1,1.66,12.12,7.99,12.12,15.28v115.36c0,7.29-5.02,13.62-12.12,15.28l-1.79.42c-29.16,6.8-59.13,10.25-89.07,10.25Z"/>',
    f: '<path fill="#1e2448" d="M103.48,158.75c-29.26,0-58.54-3.37-87.03-10.02h0c-4.07-.95-6.96-4.58-6.96-8.76V28.28c0-4.18,2.88-7.81,6.96-8.76h0c28.49-6.65,57.77-10.02,87.03-10.02,29.25,0,58.53,3.37,87.03,10.02h0c4.07.95,6.96,4.58,6.96,8.76v111.69c0,4.18-2.88,7.81-6.96,8.76h0c-28.49,6.65-57.77,10.02-87.03,10.02Z"/>',
    c: col => `<path class="mk-fill" fill="${col}" d="M188.46,139.97c-22.09,5.15-51.01,9.78-84.98,9.78-22.68,0-51.89-2.06-84.98-9.78,0-56.65,0-55.03,0-111.69,22.09-5.15,51.01-9.78,84.98-9.78,22.68,0,51.89,2.06,84.98,9.78,0,56.65,0,55.03,0,111.69Z"/>`,
  },
  { // fan/book
    vb: '0 0 206.66 188.25',
    o: '<path fill="#fff" stroke="#8f92a4" stroke-miterlimit="10" d="M101.28,187.58c-15.82-1.82-31.82-4.01-47.54-6.53-12.89-2.06-25.92-4.39-38.72-6.92l-9.34-1.85c-3-.59-5.17-3.23-5.17-6.29V22.28c0-3.06,2.17-5.7,5.17-6.29l9.34-1.84c14.37-2.84,28.99-5.41,43.43-7.66,14.18-2.21,28.59-4.16,42.82-5.79l1.3-.15c.48-.05.96-.06,1.43,0l1.3.14c15.47,1.7,31.1,3.81,46.46,6.25,13.33,2.12,26.78,4.56,39.98,7.23l9.29,1.88c2.99.61,5.14,3.23,5.14,6.28v143.34c0,2.98-2.06,5.57-4.96,6.24l-8.96,2.08c-13.19,3.07-26.66,5.72-40.05,7.89-15.64,2.53-31.59,4.47-47.4,5.75l-1.13.09c-.42.03-.84.03-1.25-.02l-1.13-.13Z"/>',
    f: '<path fill="#1e2448" d="M102.3,178.64c-15.69-1.8-31.55-3.98-47.15-6.48-12.78-2.05-25.7-4.36-38.4-6.87l-1.24-.25c-3.49-.69-6.01-3.75-6.01-7.32V30.54c0-3.56,2.52-6.63,6.01-7.32l1.24-.25c14.25-2.81,28.75-5.37,43.07-7.6,14.06-2.19,28.35-4.12,42.47-5.75l.18-.02c.55-.06,1.11-.06,1.66,0l.18.02c15.32,1.69,30.81,3.77,46.03,6.2,13.21,2.1,26.53,4.51,39.6,7.16l1.24.25c3.48.7,5.98,3.76,5.98,7.31v127.15c0,3.47-2.39,6.48-5.77,7.26l-1.19.28c-12.99,3.02-26.26,5.63-39.45,7.77-15.41,2.5-31.12,4.4-46.69,5.67l-.88.07-.88-.1Z"/>',
    c: col => `<path class="mk-fill" fill="${col}" d="M18.5,31.8v124.66c12.27,2.43,24.97,4.71,38.08,6.81,16.1,2.58,31.7,4.69,46.75,6.42,14.37-1.17,29.75-2.95,45.98-5.58,13.76-2.23,26.72-4.83,38.85-7.65,0-41.55,0-83.11,0-124.66-12.57-2.55-25.65-4.93-39.23-7.09-15.75-2.51-30.97-4.53-45.6-6.14-13.59,1.56-27.64,3.45-42.12,5.7-14.78,2.3-29.03,4.83-42.71,7.53Z"/>`,
  },
  { // octagon
    vb: '0 0 206.66 206.66',
    o: '<path fill="#fff" stroke="#8f92a4" stroke-miterlimit="10" d="M70.57,204.5L4.89,160.72c-2.74-1.83-4.39-4.9-4.39-8.2V54.14c0-3.29,1.65-6.37,4.39-8.2L70.57,2.15c1.62-1.08,3.52-1.65,5.46-1.65h54.59c1.94,0,3.85.58,5.46,1.65l65.68,43.79c2.74,1.83,4.39,4.9,4.39,8.2v98.38c0,3.29-1.65,6.37-4.39,8.2l-65.68,43.79c-1.62,1.08-3.52,1.65-5.46,1.65h-54.59c-1.94,0-3.85-.58-5.46-1.65Z"/>',
    f: '<path fill="#1e2448" d="M73.24,195.47l-59.26-39.51c-2.8-1.87-4.48-5.01-4.48-8.37V59.07c0-3.36,1.68-6.5,4.48-8.37L73.24,11.19c1.65-1.1,3.59-1.69,5.58-1.69h49.02c1.99,0,3.93.59,5.58,1.69l59.26,39.51c2.8,1.87,4.48,5.01,4.48,8.37v88.53c0,3.36-1.68,6.5-4.48,8.37l-59.26,39.51c-1.65,1.1-3.59,1.69-5.58,1.69h-49.02c-1.99,0-3.93-.59-5.58-1.69Z"/>',
    c: col => `<polygon class="mk-fill" fill="${col}" points="78.5 18.5 18.5 58.5 18.5 148.16 78.5 188.16 128.16 188.16 188.16 148.16 188.16 58.5 128.16 18.5 78.5 18.5"/>`,
  },
  { // circle
    vb: '0 0 206.96 206.96',
    o: '<path fill="#fff" stroke="#8f92a4" stroke-miterlimit="10" d="M103.48,206.46C46.7,206.46.5,160.26.5,103.48S46.7.5,103.48.5s102.98,46.2,102.98,102.98-46.2,102.98-102.98,102.98Z"/>',
    f: '<path fill="#1e2448" d="M103.48,197.46c-51.82,0-93.98-42.16-93.98-93.98S51.66,9.5,103.48,9.5s93.98,42.16,93.98,93.98-42.16,93.98-93.98,93.98Z"/>',
    c: col => `<rect class="mk-fill" fill="${col}" x="18.5" y="18.5" width="169.96" height="169.96" rx="84.98" ry="84.98"/>`,
  },
  { // rounded square
    vb: '0 0 206.96 206.96',
    o: '<path fill="#fff" stroke="#8f92a4" stroke-miterlimit="10" d="M58.52.5h89.92c32.02,0,58.02,26,58.02,58.02v89.93c0,32.02-26,58.02-58.02,58.02H58.52c-32.02,0-58.02-26-58.02-58.02V58.52C.5,26.5,26.5.5,58.52.5Z" transform="translate(206.96 0) rotate(90)"/>',
    f: '<path fill="#1e2448" d="M58.52,9.5h89.92c27.05,0,49.02,21.96,49.02,49.02v89.93c0,27.05-21.96,49.02-49.02,49.02H58.52c-27.05,0-49.02-21.96-49.02-49.02V58.52c0-27.05,21.96-49.02,49.02-49.02Z" transform="translate(206.96 0) rotate(90)"/>',
    c: col => `<rect class="mk-fill" fill="${col}" x="18.5" y="18.5" width="169.96" height="169.96" rx="40.02" ry="40.02"/>`,
  },
];

const mkIcon = (si, col) => {
  const s     = SHAPES[si];
  const inner = s.c(col).replace(/(<(?:path|rect|polygon)\b)/, '$1 stroke="#1e2448" stroke-width="15" stroke-linejoin="round" paint-order="stroke fill"');
  return `<div class="marker-shape"><svg viewBox="${s.vb}" xmlns="http://www.w3.org/2000/svg" width="42" height="42">${s.o}${inner}</svg></div>`;
};

// -- Markers --

const markers = [];
let suppressMapClick = false;

// Shapes are randomised once and persisted; colors are always derived from cuisine
const STORAGE_KEY = 'marker-shapes-v2';
const mkAssign = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length === locations.length)
      return saved.map((si, i) => ({ si, col: CUISINE_COLORS[locations[i].cuisine] }));
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
    el.setAttribute('tabindex',      '0');
    el.setAttribute('role',          'button');
    el.setAttribute('aria-label',    location.title);
    el.setAttribute('aria-disabled', 'false');
    el.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && !el.classList.contains('marker-inactive')) {
        e.preventDefault();
        openPopup(location, marker);
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
  if (!suppressMapClick && activeMarker) closePopup();
});

// -- Filters --

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
  Object.entries(filters).every(([type, values]) => values.includes(location[type]));

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

const positionFilterPanel = () => {
  const r      = filterToggleBtn.getBoundingClientRect();
  const panelW = filterPanel.offsetWidth || 200;
  const cx     = r.left + r.width / 2;
  if (r.top > window.innerHeight / 2) {
    // Near bottom (desktop) — open upward
    filterPanel.style.bottom = (window.innerHeight - r.top + 10) + 'px';
    filterPanel.style.top    = '';
  } else {
    // Near top (mobile) — open downward
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

// -- Random location --

const focusRandomLocation = () => {
  const visible = markers.filter(m => !m.getElement()?.classList.contains('marker-inactive'));
  if (!visible.length) {
    mapStatus.textContent = 'Brak lokalizacji spełniających wybrane filtry.';
    setTimeout(() => { mapStatus.textContent = ''; }, 4000);
    return;
  }
  const picked     = visible[Math.floor(Math.random() * visible.length)];
  const targetZoom = 15;
  // The card opens above the marker, so put the marker below the centre by half the card
  // plus the gap: the whole card is then on screen whatever its height or the viewport's
  const lift       = measureCard(picked.location, picked) / 2 + 13;
  const projected  = map.project(picked.getLatLng(), targetZoom);
  const target     = map.unproject(projected.add([0, -lift]), targetZoom);

  if (activeMarker) closePopup();
  const token = ++randomToken;

  // Leaflet's 'moveend' is unreliable here: an animation cut short by setView fires it
  // at once, and setView itself is dropped while a zoom animation runs. So watch the
  // animation classes on the map pane instead, and open the card once they are gone.
  const pane      = map.getPane('mapPane');
  const zooming   = () => pane.classList.contains('leaflet-zoom-anim');
  const animating = () => zooming() || pane.classList.contains('leaflet-pan-anim');
  const markerInView = () => {
    const p = map.latLngToContainerPoint(picked.getLatLng());
    const s = map.getSize();
    return p.x >= 0 && p.x <= s.x && p.y >= 0 && p.y <= s.y;
  };
  const deadline = Date.now() + 4000;
  let launched = false;

  const tick = () => {
    if (token !== randomToken || Date.now() > deadline) return;
    if (!launched) {
      if (zooming()) { requestAnimationFrame(tick); return; }
      launched = true;
      map.setView(target, targetZoom, { animate: true, duration: 0.8 });
      requestAnimationFrame(tick);
      return;
    }
    if (animating()) { requestAnimationFrame(tick); return; }
    // Not in view means the move was interrupted (e.g. a drag) — then no card
    if (markerInView()) openPopup(picked.location, picked, false);
  };
  tick();
};

document.getElementById('random-btn').addEventListener('click', focusRandomLocation);

// -- Zoom --

const updateZoomButtons = () => {
  zoomInBtn.classList.toggle('zoom-disabled',  map.getZoom() >= map.getMaxZoom());
  zoomOutBtn.classList.toggle('zoom-disabled', map.getZoom() <= map.getMinZoom());
};

zoomInBtn.addEventListener('click',  () => map.zoomIn());
zoomOutBtn.addEventListener('click', () => map.zoomOut());
map.on('zoomend', updateZoomButtons);

// -- Fullscreen --

const ICON_EXPAND   = 'M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4';
const ICON_COLLAPSE = 'M7 3v4H3M17 7h-4V3M13 17v-4h4M3 13h4v4';
const EASING = 'top 0.45s cubic-bezier(0.4,0,0.2,1), left 0.45s cubic-bezier(0.4,0,0.2,1), width 0.45s cubic-bezier(0.4,0,0.2,1), height 0.45s cubic-bezier(0.4,0,0.2,1), border-radius 0.45s cubic-bezier(0.4,0,0.2,1)';

let savedRect = null;

const setFullscreenState = isFullscreen => {
  fullscreenIcon.setAttribute('d', isFullscreen ? ICON_COLLAPSE : ICON_EXPAND);
  fullscreenLabel.textContent = isFullscreen ? 'Minimalizuj' : 'Pełny ekran';
};

fullscreenBtn.addEventListener('click', () => {
  if (window.frameElement) {
    const parentDoc = window.parent.document;
    const container = parentDoc.getElementById('map-embed-container');

    // No map-embed-container in parent (e.g. landing page) — use native iframe fullscreen
    if (!container) {
      const parentFs = parentDoc.fullscreenElement;
      if (!parentFs) {
        window.frameElement.requestFullscreen?.()
          .then(() => setFullscreenState(true))
          .catch(() => {});
      } else {
        parentDoc.exitFullscreen?.()
          .then(() => setFullscreenState(false))
          .catch(() => {});
      }
      return;
    }

    const expanding = !container.classList.contains('fullscreen');

    if (expanding) {
      savedRect = container.getBoundingClientRect();

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
      backdrop.getBoundingClientRect(); // force reflow before transition
      backdrop.style.transition = EASING;
      Object.assign(backdrop.style, { top: '0', left: '0', width: '100vw', height: '100dvh', borderRadius: '0' });

      Object.assign(container.style, {
        position: 'fixed',
        top: savedRect.top + 'px', left: savedRect.left + 'px',
        width: savedRect.width + 'px', height: savedRect.height + 'px',
        borderRadius: '20px', zIndex: '9999', transition: 'none',
      });
      container.getBoundingClientRect(); // force reflow before transition
      container.style.transition = EASING;
      Object.assign(container.style, { top: '0', left: '0', width: '100vw', height: '100dvh', borderRadius: '0' });
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
      document.documentElement.requestFullscreen?.()
        .then(() => setFullscreenState(true))
        .catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }
});

// Handles Escape key exit and any other non-button fullscreen change
document.addEventListener('fullscreenchange', () => {
  setFullscreenState(!!document.fullscreenElement);
});

// -- Button press animation --

document.querySelectorAll('.bar-btn').forEach(btn => {
  let pressedAt = 0;
  btn.addEventListener('pointerdown', () => {
    pressedAt = Date.now();
    btn.classList.add('is-pressed');
  });
  const release = () => {
    const remaining = Math.max(0, 150 - (Date.now() - pressedAt));
    setTimeout(() => btn.classList.remove('is-pressed'), remaining);
  };
  btn.addEventListener('pointerup',     release);
  btn.addEventListener('pointercancel', release);
});

// -- Parent window messages --

window.addEventListener('message', e => {
  if (e.data === 'resetMap') {
    if (activeMarker) closePopup();
    map.setView(HOME_COORDS, HOME_ZOOM, { animate: false });
  }
  if (e.data === 'exitFullscreen') setFullscreenState(false);
});

// -- Init --
applyFilters();
updateZoomButtons();
