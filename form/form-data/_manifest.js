// ─── HOW TO ADD A NEW LOCATION ───────────────────────────────────────────────
// 1. Drop the new form-data-YYYYMMDD-xxxx.js file into this folder (form/form-data/)
// 2. Add one line to DATA_SOURCES below
// ─────────────────────────────────────────────────────────────────────────────

const DATA_SOURCES = [
  '../form/form-data/form-data-20260513-0dac.js',
  '../form/form-data/form-data-20260513-7742.js',
];

const locations = [];

function upsertLocation(entry) {
  const idx = locations.findIndex(l => l.title === entry.title);
  if (idx !== -1) locations[idx] = entry;
  else locations.push(entry);
}
