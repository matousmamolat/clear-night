/* ==========================================================================
   app.js: user interface
   Step 1: search a place and load the forecast.
   Step 2: score every hour, find the best window, click an hour for details.
   Step 3: seven nights on a vertical axis, switch between them.
   Step 4: state in the URL (History API): reload, share, back and forward.
   ========================================================================== */

// --- DOM elements we work with ---
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const resultsList = document.getElementById("search-results");
const placeName = document.getElementById("place-name");
const placeCoords = document.getElementById("place-coords");
const statusText = document.getElementById("status");
const scoreEl = document.getElementById("score");
const verdictEl = document.getElementById("verdict");
const timeline = document.getElementById("timeline");
const readout = document.getElementById("readout");
const nightsList = document.getElementById("nights");

// --- Application state: everything the screen is built from ---
const state = {
  place: null,      // the selected place from the geocoding API
  nights: [],       // 7 nights, each { sunset, sunrise, hours, scores, best }
  nightIndex: 0,    // which night is shown (0 = tonight)
};

// ===== 1. Searching =====
form.addEventListener("submit", async (event) => {
  event.preventDefault(); // do not reload the page
  const query = input.value.trim();
  if (!query) return;

  showResults([{ message: "Searching…" }]);
  try {
    const places = await searchPlaces(query);
    if (places.length === 0) {
      showResults([{ message: "Nothing found for “" + query + "”" }]);
    } else {
      showResults(places);
    }
  } catch (error) {
    showResults([{ message: "Search failed. Check your connection." }]);
  }
});

// Render the list of found places (or a single message)
function showResults(items) {
  resultsList.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    if (item.message) {
      li.textContent = item.message;
      li.className = "search__message";
    } else {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = [item.name, item.admin1, item.country].filter(Boolean).join(", ");
      button.addEventListener("click", () => selectPlace(item));
      li.append(button);
    }
    resultsList.append(li);
  });
  resultsList.hidden = false;
}

// Close the results when clicking elsewhere or pressing Escape
document.addEventListener("click", (event) => {
  if (!form.contains(event.target)) resultsList.hidden = true;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") resultsList.hidden = true;
});

// ===== 2. Selecting a place and loading its forecast =====
// Called when the user picks a place from the search results
async function selectPlace(place) {
  resultsList.hidden = true;
  input.value = "";
  const loaded = await loadPlace(place);
  if (loaded) writeUrl(true); // new entry in the browser history
}

// Loads the forecast for a place and shows night `nightIndex`.
// Returns true when it worked. Used by search AND by the URL (reload, back/forward).
async function loadPlace(place, nightIndex = 0) {
  placeName.textContent = place.name + (place.country_code ? ", " + place.country_code : "");
  placeCoords.textContent = formatCoords(place.latitude, place.longitude);
  document.title = place.name + " | Clear Night";
  statusText.textContent = "Loading forecast…";

  try {
    const forecast = await getForecast(place.latitude, place.longitude);
    state.place = place;
    state.nights = [];
    for (let i = 0; i < 7; i++) {
      const night = getNight(forecast, i);
      night.scores = scoreNight(night.hours); // score.js
      night.best = bestWindow(night.scores);
      state.nights.push(night);
    }
    showNights();
    showNight(nightIndex);
    return true;
  } catch (error) {
    statusText.textContent = "Could not load the forecast. Try again.";
    return false;
  }
}

function formatCoords(lat, lon) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return Math.abs(lat).toFixed(2) + "°" + ns + "  " + Math.abs(lon).toFixed(2) + "°" + ew;
}

// ===== 3. Cutting one night out of the hourly data =====
// A night = the hours from sunset on day N to sunrise on day N + 1.
function getNight(forecast, index) {
  const sunset = forecast.daily.sunset[index];       // e.g. "2026-09-29T18:45"
  const sunrise = forecast.daily.sunrise[index + 1]; // next morning
  const h = forecast.hourly;
  const hours = [];

  for (let i = 0; i < h.time.length; i++) {
    // Times are ISO strings in the same format ("2026-09-29T21:00"),
    // so plain text comparison works. We keep hours between sunset and sunrise.
    if (h.time[i] > sunset && h.time[i] < sunrise) {
      hours.push({
        time: h.time[i],
        cloud: h.cloud_cover[i],
        cloudLow: h.cloud_cover_low[i],
        cloudMid: h.cloud_cover_mid[i],
        cloudHigh: h.cloud_cover_high[i],
        humidity: h.relative_humidity_2m[i],
        visibility: h.visibility[i],
        rain: h.precipitation_probability[i],
        wind: h.wind_speed_10m[i],
      });
    }
  }
  return { sunset, sunrise, hours };
}

// ===== 4. The seven nights =====
function showNights() {
  nightsList.innerHTML = "";
  state.nights.forEach((night, i) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML =
      "<span>N0" + (i + 1) + "</span> " + dayName(night.sunset) +
      '<b class="nights__score">' + night.best.score + "</b>";
    button.addEventListener("click", () => {
      if (i === state.nightIndex) return;
      showNight(i);
      writeUrl(true);
    });
    li.append(button);
    nightsList.append(li);
  });
}

// "2026-09-29T18:45" -> "Tue"
function dayName(isoTime) {
  return new Date(isoTime.slice(0, 10) + "T12:00").toLocaleDateString("en-GB", { weekday: "short" });
}

// ===== 5. Showing one night =====
function showNight(index) {
  state.nightIndex = index;
  const night = state.nights[index];
  const scores = night.scores;
  const best = night.best;

  // highlight the active night on the axis
  [...nightsList.children].forEach((li, i) => li.classList.toggle("is-active", i === index));

  statusText.textContent = (index === 0 ? "Tonight" : dayName(night.sunset) + " night") + " / score out of 100";
  scoreEl.textContent = best.score;
  verdictEl.innerHTML =
    verdict(best.score) +
    "<span>Best window " + hourLabel(night.hours[best.start]) + " to " +
    hourLabel(night.hours[best.end], 1) + "</span>";

  timeline.innerHTML = "";
  night.hours.forEach((hour, i) => {
    // Each hour is a button, so it works with mouse, touch and keyboard
    const col = document.createElement("button");
    col.type = "button";
    col.className = "hour";
    if (i >= best.start && i <= best.end) col.classList.add("is-best");
    if (i === 0 || i === night.hours.length - 1) col.classList.add("is-twilight");
    col.setAttribute("aria-label", hourLabel(hour) + ", score " + scores[i]);

    const val = document.createElement("span");
    val.className = "hour__val";
    val.textContent = scores[i];
    const bar = document.createElement("span");
    bar.className = "hour__bar";
    bar.style.height = Math.max(scores[i], 2) + "%";
    const time = document.createElement("span");
    time.className = "hour__t";
    time.textContent = hour.time.slice(11, 13);

    col.append(val, bar, time);
    col.addEventListener("click", () => selectHour(col, hour, scores[i]));
    timeline.append(col);
  });

  // Start with the best hour selected
  const bestCol = timeline.children[best.start];
  selectHour(bestCol, night.hours[best.start], scores[best.start]);
}

// Show the details of one hour in the read-out below the timeline
function selectHour(col, hour, score) {
  timeline.querySelectorAll(".is-selected").forEach((el) => el.classList.remove("is-selected"));
  col.classList.add("is-selected");
  readout.innerHTML =
    item("Hour", hourLabel(hour) + " · score " + score) +
    item("Clouds low / mid / high", hour.cloudLow + " / " + hour.cloudMid + " / " + hour.cloudHigh + " %") +
    item("Humidity", hour.humidity + " %") +
    item("Visibility", (hour.visibility / 1000).toFixed(1) + " km") +
    item("Rain chance", hour.rain + " %") +
    item("Wind", hour.wind + " km/h");
}

// "2026-09-29T23:00" -> "23:00"; with plusHours = 1 -> "00:00" (end of that hour)
function hourLabel(hour, plusHours = 0) {
  const h = (Number(hour.time.slice(11, 13)) + plusHours) % 24;
  return String(h).padStart(2, "0") + ":00";
}

function item(label, value) {
  return "<div><dt>" + label + "</dt><dd>" + value + "</dd></div>";
}

// ===== 6. State in the URL (History API) =====
// Example: ?place=Praha&cc=CZ&lat=50.09&lon=14.42&night=3

// Write the current state into the address bar.
// push = true adds a new history entry (so Back returns to the previous state).
function writeUrl(push) {
  const params = new URLSearchParams({
    place: state.place.name,
    cc: state.place.country_code || "",
    lat: state.place.latitude.toFixed(4),
    lon: state.place.longitude.toFixed(4),
    night: state.nightIndex + 1, // people count nights from 1, code from 0
  });
  const url = "?" + params.toString();
  if (push) history.pushState(null, "", url);
  else history.replaceState(null, "", url);
}

// Read the address bar and show what it describes
async function readUrl() {
  const params = new URLSearchParams(location.search);
  const lat = parseFloat(params.get("lat"));
  const lon = parseFloat(params.get("lon"));
  if (isNaN(lat) || isNaN(lon)) {
    resetScreen(); // no place in the URL: back to the start screen
    return;
  }

  // night 1-7 in the URL -> index 0-6, anything invalid -> tonight
  let nightIndex = parseInt(params.get("night"), 10) - 1;
  if (!(nightIndex >= 0 && nightIndex <= 6)) nightIndex = 0;

  const samePlace = state.place && state.place.latitude.toFixed(4) === lat.toFixed(4) && state.place.longitude.toFixed(4) === lon.toFixed(4);
  if (samePlace) {
    showNight(nightIndex); // only the night changed, no need to download again
  } else {
    await loadPlace({ name: params.get("place") || "Unknown place", country_code: params.get("cc"), latitude: lat, longitude: lon }, nightIndex);
  }
}

// The empty start screen (before any place is chosen)
function resetScreen() {
  state.place = null;
  state.nights = [];
  state.nightIndex = 0;
  document.title = "Clear Night | Stargazing forecast";
  placeName.textContent = "No place selected";
  placeCoords.textContent = "";
  statusText.textContent = "Search for a place to see tonight's sky";
  scoreEl.textContent = "--";
  verdictEl.innerHTML = "";
  nightsList.innerHTML = "";
  timeline.innerHTML = "";
  readout.innerHTML = "";
}

// Back / Forward buttons
window.addEventListener("popstate", readUrl);

// Reload or a shared link: restore the state right away
readUrl();

// ===== 7. Live clock =====
const clock = document.getElementById("clock");
function tick() {
  clock.textContent = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
tick();
setInterval(tick, 10000);
