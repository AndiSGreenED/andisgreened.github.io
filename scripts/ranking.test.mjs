import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const start = source.indexOf("function calculateRank(");
const end = source.indexOf("\nfunction rankScore(", start);
const angleInRange = (deg, min, max) => {
  deg = ((deg % 360) + 360) % 360;
  min = ((min % 360) + 360) % 360;
  max = ((max % 360) + 360) % 360;
  return min <= max ? deg >= min && deg <= max : deg >= min || deg <= max;
};
const calculateRank = vm.runInNewContext(`(${source.slice(start, end)})`, {
  angleInRange,
  compass: () => "WNW",
  fmt: value => String(value),
  windFactor: () => 1
});
const starDirsStart = source.indexOf("const starDirsOf =");
const starDirsEnd = source.indexOf("\nconst WIND_LEVEL_COLORS", starDirsStart);
const starDirsOf = vm.runInNewContext(`${source.slice(starDirsStart, starDirsEnd)}; starDirsOf`, {
  DIR16: ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  angleInRange
});

const spot = { mainDir: "WNW", dirs: ["WNW"], weakDirs: [], waveStar: null };
const filters = { minwind: 10, maxwind: 30, minwave: 0, maxwave: 3, usedir: true };
const row = (hour, wind = 20, dir = 270) => ({
  hour,
  medLabel: "ICON",
  models: { ICON: { wind, dir } },
  wave: 0
});
const rank = rows => calculateRank(spot, { day: rows }, filters);

test("a zero-point hour breaks the three-hour scoring window", () => {
  const result = rank([row(8), row(9, 5), row(10)]);

  assert.equal(result.score, 0);
  assert.deepEqual(Array.from(result.hourly, hour => hour.points), [0, 0, 0]);
  assert.equal(result.hourly[0].chosen.mainQualified, false);
  assert.equal(result.hourly[2].chosen.mainQualified, false);
});

test("scores a continuous three-hour window and applies the main-direction bonus", () => {
  const result = rank([row(8), row(9), row(10)]);

  assert.equal(result.score, 6);
  assert.deepEqual(Array.from(result.hourly, hour => hour.points), [2, 2, 2]);
  assert.equal(result.hourly.every(hour => hour.scored && hour.chosen.mainQualified), true);
});

test("does not apply a qualifying hour's bonus to a duplicate row", () => {
  const result = rank([row(8), row(8), row(9), row(10)]);

  assert.equal(result.hourly[0].chosen.mainQualified, false);
  assert.equal(result.hourly[1].chosen.mainQualified, true);
  assert.deepEqual(Array.from(result.hourly, hour => hour.points), [0, 2, 2, 2]);
});

test("keeps a qualifying window but excludes a later two-hour fragment", () => {
  const result = rank([row(8), row(9), row(10), row(11, 5), row(12), row(13)]);

  assert.equal(result.score, 6);
  assert.deepEqual(Array.from(result.hourly, hour => hour.points), [2, 2, 2, 0, 0, 0]);
  assert.equal(result.hourly[4].scored, false);
});

test("applies the exact wave-star degree range to a single hour, without a star-direction run", () => {
  const waveSpot = { ...spot, mainDir: "O", waveStar: { min: 295, max: 300 } };
  const result = calculateRank(waveSpot, { day: [row(8, 20, 294), row(9, 20, 297), row(10, 20, 301)] }, filters);

  assert.equal(result.score, 4);
  assert.deepEqual(Array.from(result.hourly, hour => hour.chosen.starHit), [false, true, false]);
  assert.deepEqual(Array.from(result.hourly, hour => hour.chosen.directionFactor), [1, 2, 1]);
});

test("maps a narrow degree-based wave star to its compass sector without widening the scoring range", () => {
  const dirs = starDirsOf({ waveStar: { min: 295, max: 300 } });

  assert.deepEqual(Array.from(dirs), ["WNW"]);
  assert.deepEqual(Array.from(starDirsOf({ waveStar: { min: 213.75, max: 236.25 } })), ["SW"]);
  assert.deepEqual(Array.from(starDirsOf({ waveStar: { min: 350, max: 10 } })), ["N"]);
  assert.equal(angleInRange(294.99, 295, 300), false);
  assert.equal(angleInRange(295, 295, 300), true);
  assert.equal(angleInRange(300, 295, 300), true);
  assert.equal(angleInRange(300.01, 295, 300), false);
});
