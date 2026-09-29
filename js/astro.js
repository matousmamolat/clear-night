/* ==========================================================================
   astro.js: small astronomy toolkit (pure functions, no DOM)
   Accuracy is about a fraction of a degree, more than enough for a sky map.
   Formulas: low-precision methods from Jean Meeus, "Astronomical Algorithms".
   ========================================================================== */

const DEG = Math.PI / 180;
const norm360 = (x) => ((x % 360) + 360) % 360;

// Days since 1 Jan 2000 12:00 UTC (the "J2000" epoch astronomers count from)
function daysSinceJ2000(date) {
  return date.getTime() / 86400000 - 10957.5;
}

// Local sidereal time in degrees: which part of the sky is on the meridian right now.
// Stars return to the same place every sidereal day (23 h 56 min), not every 24 h.
function localSiderealTime(date, longitude) {
  const d = daysSinceJ2000(date);
  const gmst = 280.46061837 + 360.98564736629 * d; // Greenwich mean sidereal time
  return norm360(gmst + longitude);
}

// Sky coordinates (right ascension, declination) -> what an observer sees
// (altitude above the horizon, azimuth from north towards east), all in degrees.
function toAltAz(ra, dec, latitude, lst) {
  const hourAngle = (lst - ra) * DEG;
  const phi = latitude * DEG;
  const delta = dec * DEG;
  const sinAlt = Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.cos(hourAngle);
  const alt = Math.asin(sinAlt);
  const az = Math.atan2(
    -Math.cos(delta) * Math.sin(hourAngle),
    Math.sin(delta) * Math.cos(phi) - Math.cos(delta) * Math.sin(phi) * Math.cos(hourAngle)
  );
  return { alt: alt / DEG, az: norm360(az / DEG) };
}

// Position of the Moon (right ascension, declination) at a given time
function moonPosition(date) {
  const T = daysSinceJ2000(date) / 36525; // centuries since J2000
  const s = (a, b) => Math.sin((a + b * T) * DEG);
  // ecliptic longitude and latitude with the biggest periodic corrections
  const lambda = 218.32 + 481267.881 * T
    + 6.29 * s(134.9, 477198.85) - 1.27 * s(259.2, -413335.38) + 0.66 * s(235.7, 890534.23)
    + 0.21 * s(269.9, 954397.70) - 0.19 * s(357.5, 35999.05) - 0.11 * s(186.6, 966404.05);
  const beta = 5.13 * s(93.3, 483202.03) + 0.28 * s(228.2, 960400.87)
    - 0.28 * s(318.3, 6003.18) - 0.17 * s(217.6, -407332.20);
  // ecliptic -> equatorial coordinates (Earth's axis is tilted by 23.44 degrees)
  const eps = 23.44 * DEG, l = lambda * DEG, b = beta * DEG;
  const ra = Math.atan2(Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l));
  return { ra: norm360(ra / DEG), dec: dec / DEG };
}

// How much of the Moon is lit (0 = new moon, 1 = full moon) and its age in days
function moonPhase(date) {
  const SYNODIC_MONTH = 29.530588853;              // new moon to new moon, in days
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14); // 6 Jan 2000, 18:14 UTC
  const age = ((date - knownNewMoon) / 86400000) % SYNODIC_MONTH;
  const ageDays = age < 0 ? age + SYNODIC_MONTH : age;
  const illumination = (1 - Math.cos((2 * Math.PI * ageDays) / SYNODIC_MONTH)) / 2;
  return { illumination, ageDays, waxing: ageDays < SYNODIC_MONTH / 2 };
}

// Everything about the Moon for one place and time
function moonAt(date, latitude, longitude) {
  const { ra, dec } = moonPosition(date);
  const { alt, az } = toAltAz(ra, dec, latitude, localSiderealTime(date, longitude));
  return { alt, az, ...moonPhase(date) };
}

// Forecast times are local to the place ("2026-09-29T23:00") and the API tells us
// the offset from UTC in seconds. This turns them into a real moment in time.
function localTimeToDate(isoLocal, utcOffsetSeconds) {
  const [datePart, timePart] = isoLocal.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - utcOffsetSeconds * 1000);
}

if (typeof module !== "undefined") {
  module.exports = { daysSinceJ2000, localSiderealTime, toAltAz, moonPosition, moonPhase, moonAt, localTimeToDate };
}
