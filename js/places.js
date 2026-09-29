/* ==========================================================================
   places.js: favourite places saved in the browser (localStorage)
   Only data functions here; the buttons and lists live in app.js.
   ========================================================================== */

const STORAGE_KEY = "clearNight.places";

// A place is identified by its coordinates (rounded, so tiny differences don't matter)
function placeId(place) {
  return Number(place.latitude).toFixed(4) + "," + Number(place.longitude).toFixed(4);
}

// Read the saved list. localStorage stores only text, so we keep JSON there.
// If storage is blocked (private mode) or the data is broken, start with an empty list.
function loadPlaces() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function storePlaces(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (error) {
    return false; // storage full or blocked: the app keeps working, just without saving
  }
}

function isSaved(place) {
  return loadPlaces().some((p) => p.id === placeId(place));
}

// Add a place (only the fields we need later)
function addPlace(place) {
  const list = loadPlaces();
  if (list.some((p) => p.id === placeId(place))) return list;
  list.push({
    id: placeId(place),
    label: place.name,               // what the user sees, can be renamed
    name: place.name,                // original name from the API
    country_code: place.country_code || "",
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
  });
  storePlaces(list);
  return list;
}

function removePlace(id) {
  const list = loadPlaces().filter((p) => p.id !== id);
  storePlaces(list);
  return list;
}

function renamePlace(id, label) {
  const list = loadPlaces();
  const place = list.find((p) => p.id === id);
  if (place && label.trim()) place.label = label.trim();
  storePlaces(list);
  return list;
}
