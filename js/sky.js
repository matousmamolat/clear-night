/* ==========================================================================
   sky.js: the real night sky in the background
   Stars and constellation lines come from data/sky.json (loaded with AJAX),
   positions are computed in astro.js for the chosen place and hour.
   ========================================================================== */

const skyCanvas = document.getElementById("sky");
const skyCtx = skyCanvas.getContext("2d");
let skyData = null;  // { stars: [[ra, dec, mag]], lines: [[[ra, dec], ...]] }
let skyView = null;  // what we drew last: { date, latitude, longitude }

// Load the star catalogue once; if it fails, the app still works without the sky
async function loadSky() {
  try {
    skyData = await getJSON("data/sky.json"); // getJSON() is in api.js
    if (skyView) drawSky(skyView.date, skyView.latitude, skyView.longitude);
  } catch (error) {
    skyData = null;
  }
}

// Sky position (altitude, azimuth) -> point on the screen.
// Stereographic projection centred on the zenith (the point straight above you):
// zenith in the middle of the screen, horizon near the corners, north at the top.
function project(alt, az, cx, cy, radius) {
  const r = radius * Math.tan(((90 - alt) * DEG) / 2); // DEG is defined in astro.js
  return {
    x: cx - r * Math.sin(az * DEG), // east is on the left when you look up
    y: cy - r * Math.cos(az * DEG),
  };
}

function drawSky(date, latitude, longitude) {
  skyView = { date, latitude, longitude };
  const dpr = window.devicePixelRatio || 1;
  const w = (skyCanvas.width = innerWidth * dpr);
  const h = (skyCanvas.height = innerHeight * dpr);
  skyCtx.clearRect(0, 0, w, h);
  if (!skyData) return;

  const cx = w / 2, cy = h / 2;
  const radius = Math.hypot(w, h) / 2; // horizon just outside the corners
  const lst = localSiderealTime(date, longitude);
  const toScreen = (ra, dec) => {
    const { alt, az } = toAltAz(ra, dec, latitude, lst);
    return alt < -2 ? null : project(alt, az, cx, cy, radius); // null = below the horizon
  };

  // 1) constellation lines, very faint
  skyCtx.strokeStyle = "rgba(200, 214, 230, 0.09)";
  skyCtx.lineWidth = dpr;
  skyData.lines.forEach((line) => {
    skyCtx.beginPath();
    let penDown = false;
    line.forEach(([ra, dec]) => {
      const p = toScreen(ra, dec);
      if (!p) { penDown = false; return; }
      if (penDown) skyCtx.lineTo(p.x, p.y); else skyCtx.moveTo(p.x, p.y);
      penDown = true;
    });
    skyCtx.stroke();
  });

  // 2) stars: brighter star (lower magnitude) = bigger and less transparent
  skyCtx.fillStyle = "rgb(222, 232, 245)";
  skyData.stars.forEach(([ra, dec, mag]) => {
    const p = toScreen(ra, dec);
    if (!p) return;
    const size = Math.max(0.5, (6.5 - mag) * 0.45) * dpr;
    skyCtx.globalAlpha = Math.min(1, 0.2 + (6 - mag) * 0.15);
    skyCtx.beginPath();
    skyCtx.arc(p.x, p.y, size, 0, Math.PI * 2);
    skyCtx.fill();
  });

  // 3) the Moon, if it is up: brightness follows its phase
  const moon = moonAt(date, latitude, longitude);
  if (moon.alt > -1) {
    const p = project(moon.alt, moon.az, cx, cy, radius);
    const glow = skyCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 60 * dpr);
    glow.addColorStop(0, "rgba(230, 238, 248, " + 0.25 * moon.illumination + ")");
    glow.addColorStop(1, "rgba(230, 238, 248, 0)");
    skyCtx.globalAlpha = 1;
    skyCtx.fillStyle = glow;
    skyCtx.fillRect(p.x - 60 * dpr, p.y - 60 * dpr, 120 * dpr, 120 * dpr);
    skyCtx.globalAlpha = 0.35 + 0.65 * moon.illumination;
    skyCtx.fillStyle = "rgb(236, 242, 250)";
    skyCtx.beginPath();
    skyCtx.arc(p.x, p.y, 6 * dpr, 0, Math.PI * 2);
    skyCtx.fill();
  }
  skyCtx.globalAlpha = 1;
}

// Redraw at the new size when the window changes
window.addEventListener("resize", () => {
  if (skyView) drawSky(skyView.date, skyView.latitude, skyView.longitude);
});
