// ─── HOW TO ADD A NEW LOCATION ───────────────────────────────────────────────
// 1. Drop the new form-data-YYYYMMDD-xxxx.js file into this folder (form/form-data/)
// 2. Add a <script> tag for it in map/index.html  (search for "Location data")
// ─────────────────────────────────────────────────────────────────────────────

const locations = [];

function upsertLocation(entry) {
  const idx = locations.findIndex(l => l.title === entry.title);
  if (idx !== -1) locations[idx] = entry;
  else locations.push(entry);
}
