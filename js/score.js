/* ==========================================================================
   score.js: how good is an hour (and a night) for stargazing?
   Pure functions, no DOM: easy to test and to explain.
   ========================================================================== */

// Keep a number between min and max
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Straight line between two points: below `from` -> 1, above `to` -> `worst`
// e.g. fade(humidity, 70, 100, 0.6): 70 % and less = 1, 100 % = 0.6
function fade(value, from, to, worst) {
  const t = clamp((value - from) / (to - from), 0, 1);
  return 1 - t * (1 - worst);
}

// Score of one hour, 0 to 100
function scoreHour(hour, isTwilight) {
  // 1) Clouds: the thickest layer decides. High thin clouds (cirrus)
  //    let some stars through, so they count only 70 %.
  const clouds = Math.max(hour.cloudLow, hour.cloudMid, hour.cloudHigh * 0.7);
  let score = 100 - clouds;

  // 2) Everything else multiplies the score by a factor from 0 to 1
  score *= fade(hour.humidity, 70, 100, 0.6);             // haze and dew
  score *= fade(-hour.visibility, -20000, -5000, 0.5);    // less than 20 km visibility
  score *= 1 - (hour.rain / 100) * 0.8;                   // chance of rain
  score *= fade(hour.wind, 20, 50, 0.7);                  // wind shakes the telescope
  if (isTwilight) score *= 0.6;                           // sky not fully dark yet

  return Math.round(clamp(score, 0, 100));
}

// Scores for all hours of a night. The first and the last hour
// (right after sunset and right before sunrise) count as twilight.
function scoreNight(hours) {
  return hours.map((hour, i) => scoreHour(hour, i === 0 || i === hours.length - 1));
}

// Best window: the `size` consecutive hours with the highest average
function bestWindow(scores, size = 3) {
  let best = { start: 0, average: -1 };
  for (let i = 0; i + size <= scores.length; i++) {
    const slice = scores.slice(i, i + size);
    const average = slice.reduce((sum, x) => sum + x, 0) / size;
    if (average > best.average) best = { start: i, average };
  }
  return { start: best.start, end: best.start + size - 1, score: Math.round(best.average) };
}

// Words for a score
function verdict(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Poor";
  return "Clouded out";
}

// Lets Node.js load this file for testing; ignored in the browser
if (typeof module !== "undefined") {
  module.exports = { clamp, fade, scoreHour, scoreNight, bestWindow, verdict };
}
