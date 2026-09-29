/* ==========================================================================
   app.js: user interface
   Step 1: search a place, load the forecast, show tonight hour by hour.
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
async function selectPlace(place) {
  resultsList.hidden = true;
  input.value = "";
  placeName.textContent = place.name + (place.country_code ? ", " + place.country_code : "");
  placeCoords.textContent = formatCoords(place.latitude, place.longitude);
  statusText.textContent = "Loading forecast…";

  try {
    const forecast = await getForecast(place.latitude, place.longitude);
    const night = getNight(forecast, 0); // 0 = tonight
    showNight(night);
  } catch (error) {
    statusText.textContent = "Could not load the forecast. Try again.";
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

// ===== 4. Showing the night =====
// Step 1 shows how clear each hour is (100 - cloud cover).
// Step 2 will replace this with a real observing score.
function showNight(night) {
  const clear = night.hours.map((hour) => 100 - hour.cloud);
  const average = Math.round(clear.reduce((sum, x) => sum + x, 0) / clear.length);

  statusText.textContent = "Tonight: clear sky / 100";
  scoreEl.textContent = average;
  verdictEl.innerHTML = "Sunset " + night.sunset.slice(11) + "<span>Sunrise " + night.sunrise.slice(11) + "</span>";

  timeline.innerHTML = "";
  night.hours.forEach((hour, i) => {
    const col = document.createElement("div");
    col.className = "hour";
    col.innerHTML =
      '<span class="hour__val">' + clear[i] + "</span>" +
      '<div class="hour__bar" style="height:' + Math.max(clear[i], 2) + '%"></div>' +
      '<span class="hour__t">' + hour.time.slice(11, 13) + "</span>";
    timeline.append(col);
  });

  // Read-out for the first dark hour (later: the hour the user clicks)
  const first = night.hours[0];
  readout.innerHTML =
    item("Clouds low / mid / high", first.cloudLow + " / " + first.cloudMid + " / " + first.cloudHigh + " %") +
    item("Humidity", first.humidity + " %") +
    item("Visibility", (first.visibility / 1000).toFixed(1) + " km") +
    item("Rain chance", first.rain + " %") +
    item("Wind", first.wind + " km/h") +
    item("Hours of night", night.hours.length);
}

function item(label, value) {
  return "<div><dt>" + label + "</dt><dd>" + value + "</dd></div>";
}

// ===== 5. Live clock =====
const clock = document.getElementById("clock");
function tick() {
  clock.textContent = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
tick();
setInterval(tick, 10000);
