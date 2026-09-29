/* ==========================================================================
   api.js: all communication with Open-Meteo (AJAX via fetch)
   No API key is needed for non-commercial use.
   ========================================================================== */

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// Hourly values we need to judge the night
const HOURLY_VARS = [
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "relative_humidity_2m",
  "visibility",
  "precipitation_probability",
  "wind_speed_10m",
];

// Small helper: fetch a URL and return JSON, or throw a readable error
async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Server answered " + response.status);
  }
  return response.json();
}

// Find places by name, e.g. "Praha" -> [{ name, country, latitude, longitude, ... }]
async function searchPlaces(name) {
  const params = new URLSearchParams({ name, count: 6, language: "en", format: "json" });
  const data = await getJSON(GEOCODING_URL + "?" + params);
  return data.results || []; // the API leaves out "results" when nothing is found
}

// 7-day hourly forecast plus sunrise and sunset for one place
async function getForecast(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    hourly: HOURLY_VARS.join(","),
    daily: "sunrise,sunset",
    timezone: "auto", // times come back in the place's own local time
    forecast_days: 8,  // 8 days so the 7th night still has its morning
  });
  return getJSON(FORECAST_URL + "?" + params);
}
