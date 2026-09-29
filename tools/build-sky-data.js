/* Builds app/data/sky.json from the d3-celestial package (BSD-3-Clause, (c) Olaf Frohn).
   Star positions come from the ESA Hipparcos catalogue.
   Run once:  npm pack d3-celestial  ->  unpack  ->  node tools/build-sky-data.js path/to/package/data
   Output: { stars: [[ra, dec, mag], ...], lines: [[[ra, dec], [ra, dec], ...], ...] } in degrees. */
const fs = require("fs");
const dir = process.argv[2];
const ra = (lon) => +(lon < 0 ? lon + 360 : lon).toFixed(2); // d3-celestial stores RA as -180..180
const r2 = (x) => +x.toFixed(2);

const stars = JSON.parse(fs.readFileSync(dir + "/stars.6.json")).features
  .map((f) => [ra(f.geometry.coordinates[0]), r2(f.geometry.coordinates[1]), +f.properties.mag])
  .filter((s) => s[2] <= 6)
  .sort((a, b) => a[2] - b[2]); // brightest first

const lines = [];
JSON.parse(fs.readFileSync(dir + "/constellations.lines.json")).features.forEach((f) => {
  f.geometry.coordinates.forEach((line) => lines.push(line.map(([lon, lat]) => [ra(lon), r2(lat)])));
});

fs.writeFileSync(__dirname + "/../app/data/sky.json", JSON.stringify({
  source: "Star positions: ESA Hipparcos catalogue. Data prepared by d3-celestial (BSD-3-Clause, Olaf Frohn).",
  stars,
  lines,
}));
console.log(stars.length + " stars, " + lines.length + " constellation lines");
