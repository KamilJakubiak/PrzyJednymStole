// ─── HOW TO ADD A NEW LOCATION ───────────────────────────────────────────────
// 1. Drop the new form-data-YYYYMMDD-xxxx.js file into this folder (form/form-data/)
// 2. Copy the template line below and paste it at the end of the list
// 3. Replace YYYYMMDD-xxxx with the actual filename (without .js)
//
// Template:
//   document.write('<script src="../form/form-data/form-data-YYYYMMDD-xxxx.js"><\/script>');
// ─────────────────────────────────────────────────────────────────────────────

const locations = [];

function upsertLocation(entry) {
  const idx = locations.findIndex(l => l.title === entry.title);
  if (idx !== -1) locations[idx] = entry;
  else locations.push(entry);
}

document.write('<script src="../form/form-data/form-data-20260513-0dac.js"><\/script>');
document.write('<script src="../form/form-data/form-data-20260513-7742.js"><\/script>');

