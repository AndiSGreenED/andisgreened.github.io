#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SPOTS_FILE = resolve(ROOT, "docs/index.html");
const STATE_FILE = resolve(process.env.BENCHMARK_STATE_FILE || resolve(ROOT, ".benchmark/forecast-benchmark-pending.json"));
const METRICS_FILE = resolve(ROOT, "docs/data/forecast-benchmark.json");
const BRIGHTSKY_URL = "https://api.brightsky.dev/weather";
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const MODEL_IDS = [
  "icon_seamless",
  "gfs_seamless",
  "ecmwf_ifs025",
  "icon_d2",
  "dmi_harmonie_arome_europe"
];
const MAX_STATION_DISTANCE_KM = 25;
const STATION_TIERS = { near: 10, extended: MAX_STATION_DISTANCE_KM };
const MAX_SPOTS = 60;
const MAX_PENDING_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_LEAD_HOURS = 7 * 24;
const MIN_REGION_SPOTS = 3;
const MIN_OBSERVATION_COVERAGE = 0.8;
const REQUEST_INTERVAL_MS = 1100;

let lastRequestAt = 0;

const sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms));

export function parseSpots(html) {
  const marker = "const SPOTS_RAW = ";
  const declarationStart = html.indexOf(marker);
  if (declarationStart < 0) throw new Error("SPOTS_RAW not found in docs/index.html");
  const arrayStart = declarationStart + marker.length;
  const arrayEnd = html.indexOf("\n];", arrayStart);
  if (arrayEnd < 0) throw new Error("SPOTS_RAW array terminator not found");

  const literal = html.slice(arrayStart, arrayEnd + 2);
  const spots = runInNewContext(`(${literal})`, Object.create(null), {
    timeout: 500,
    contextCodeGeneration: { strings: false, wasm: false }
  });
  if (!Array.isArray(spots)) throw new Error("SPOTS_RAW is not an array");
  return spots;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/g, "ss")
    .toLowerCase();
}

export function regionForSpot(spot) {
  const label = normalizeText(`${spot.name ?? ""} ${spot.area ?? ""}`);
  if (/nordsee|nordfries|ostfries|dithmarschen|eiderstedt|helgoland|sylt|buesum|busum/.test(label))
    return "north_sea";
  if (/ostsee|baltic|fehmarn|kiel|lubeck|mecklenburg|rugen|darss|schlei|eckernford|hohwacht|holstein|flensburg/.test(label))
    return "baltic";
  return "inland";
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function spotKey(spot) {
  return `${Number(spot.lat).toFixed(5)},${Number(spot.lon).toFixed(5)}`;
}

function sampleEvenly(items, count) {
  if (count >= items.length) return items;
  return Array.from({ length: count }, (_, index) =>
    items[Math.floor((index + 0.5) * items.length / count)]
  );
}

export function selectCandidateSpots(rawSpots, limit = MAX_SPOTS) {
  const unique = new Map();
  for (const spot of rawSpots) {
    const lat = Number(spot?.lat), lon = Number(spot?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
        lat < 47 || lat > 55.2 || lon < 5.5 || lon > 15.5) continue;
    const key = spotKey({ lat, lon });
    if (!unique.has(key)) unique.set(key, { key, lat, lon, region: regionForSpot(spot) });
  }

  const groups = new Map();
  for (const spot of unique.values()) {
    if (!groups.has(spot.region)) groups.set(spot.region, []);
    groups.get(spot.region).push(spot);
  }
  for (const spots of groups.values())
    spots.sort((a, b) => a.lat - b.lat || a.lon - b.lon);

  const total = [...groups.values()].reduce((sum, group) => sum + group.length, 0);
  const target = Math.min(Math.max(0, Math.floor(limit)), total);
  if (!target) return [];

  const quotas = [...groups.entries()].map(([region, spots]) => {
    const ideal = target * spots.length / total;
    return { region, spots, quota: Math.floor(ideal), remainder: ideal % 1 };
  });
  let remaining = target - quotas.reduce((sum, item) => sum + item.quota, 0);
  quotas.sort((a, b) => b.remainder - a.remainder || a.region.localeCompare(b.region));
  for (let index = 0; remaining > 0; index = (index + 1) % quotas.length) {
    if (quotas[index].quota < quotas[index].spots.length) {
      quotas[index].quota++;
      remaining--;
    }
  }

  return quotas
    .flatMap(item => sampleEvenly(item.spots, item.quota))
    .sort((a, b) => a.region.localeCompare(b.region) || a.lat - b.lat || a.lon - b.lon);
}

function parseUtcTime(value) {
  const text = String(value);
  const utcText = /(?:Z|[+-]\d\d:\d\d)$/.test(text) ? text : `${text}Z`;
  const time = new Date(utcText).getTime();
  return Number.isFinite(time) ? time : null;
}

function meanDirection(directions) {
  const valid = directions.filter(Number.isFinite);
  if (!valid.length) return null;
  const x = valid.reduce((sum, direction) => sum + Math.cos(direction * Math.PI / 180), 0);
  const y = valid.reduce((sum, direction) => sum + Math.sin(direction * Math.PI / 180), 0);
  if (Math.hypot(x, y) < 1e-8) return null;
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function meanWind(values) {
  const readings = values.map(value => ({
    speed: Number.isFinite(value.speed) ? value.speed : value.meanWindKnots,
    direction: Number.isFinite(value.direction) ? value.direction : value.meanDirectionDeg
  }));
  const speeds = readings.map(value => value.speed).filter(Number.isFinite);
  if (!speeds.length) return null;
  const directions = readings
    .filter(value => Number.isFinite(value.speed) && value.speed >= 2 && Number.isFinite(value.direction))
    .map(value => value.direction);
  return {
    meanWindKnots: speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length,
    meanDirectionDeg: meanDirection(directions)
  };
}

export function aggregateObservationRows(rows) {
  const byHour = new Map();
  for (const row of rows ?? []) {
    const timestamp = parseUtcTime(row?.timestamp);
    const speedKmh = finiteNumber(row?.wind_speed);
    if (timestamp === null || speedKmh === null || speedKmh < 0) continue;
    const hour = new Date(timestamp);
    hour.setUTCMinutes(0, 0, 0);
    const key = hour.toISOString();
    if (!byHour.has(key)) byHour.set(key, []);
    byHour.get(key).push({
      speed: speedKmh / 1.852,
      direction: finiteNumber(row?.wind_direction)
    });
  }
  return new Map([...byHour.entries()].flatMap(([hour, values]) => {
    const average = meanWind(values);
    return average ? [[hour, average]] : [];
  }));
}

export function buildCohorts(spots, stationData) {
  const cohorts = new Map();
  for (const region of ["north_sea", "baltic", "inland"]) {
    for (const tier of Object.keys(STATION_TIERS)) {
      const members = spots.filter(spot =>
        spot.region === region &&
        Number.isFinite(stationData.get(spot.key)?.distanceKm) &&
        stationData.get(spot.key).distanceKm <= STATION_TIERS[tier]
      );
      if (members.length >= MIN_REGION_SPOTS)
        cohorts.set(`${region}|${tier}`, members);
    }
  }
  return cohorts;
}

export function aggregateCohort(cohort, valuesBySpot, timeKey) {
  const values = cohort.flatMap(spot => {
    const value = valuesBySpot.get(spot.key)?.get(timeKey);
    return value ? [value] : [];
  });
  const coverage = cohort.length ? values.length / cohort.length : 0;
  if (values.length < MIN_REGION_SPOTS || coverage < MIN_OBSERVATION_COVERAGE) return null;
  const average = meanWind(values);
  return average ? {
    ...average,
    sampleCount: values.length,
    expectedCount: cohort.length,
    coverage
  } : null;
}

export function pendingStatus(row, nowMs) {
  const issuedAt = Date.parse(row.issuedAt);
  const targetTime = Date.parse(row.targetTime);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(targetTime) ||
      nowMs - issuedAt > MAX_PENDING_AGE_MS) return "expired";
  return targetTime >= nowMs ? "future" : "ready";
}

async function fetchJson(url) {
  const wait = REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (lastRequestAt && wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    const retryAfter = response.headers.get("Retry-After");
    const error = new Error(`HTTP ${response.status} for ${new URL(url).hostname}${retryAfter ? ` (Retry-After: ${retryAfter})` : ""}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function urlForBrightSky(spot, date) {
  const url = new URL(BRIGHTSKY_URL);
  url.searchParams.set("lat", String(spot.lat));
  url.searchParams.set("lon", String(spot.lon));
  url.searchParams.set("date", date);
  url.searchParams.set("tz", "UTC");
  url.searchParams.set("units", "dwd");
  return url;
}

export function normalizeBrightSkyResponse(response) {
  const sources = new Map();
  for (const source of response?.sources ?? []) {
    const id = finiteNumber(source?.id);
    const distance = finiteNumber(source?.distance);
    if (id === null || distance === null || distance < 0 ||
        !["historical", "current"].includes(source?.observation_type)) continue;
    sources.set(id, { distanceKm: distance / 1000 });
  }
  const distances = [...sources.values()].map(source => source.distanceKm);
  const distanceKm = distances.length ? Math.min(...distances) : null;
  const weather = (response?.weather ?? []).filter(row => {
    const sourceId = finiteNumber(row?.source_id);
    const source = sourceId === null ? null : sources.get(sourceId);
    return source && source.distanceKm <= MAX_STATION_DISTANCE_KM;
  });
  return { distanceKm, hourly: aggregateObservationRows(weather) };
}

async function loadObservationDay(spots, date) {
  const stationData = new Map();
  let completed = 0;
  let noObservation = 0;
  for (const spot of spots) {
    let response;
    try {
      response = await fetchJson(urlForBrightSky(spot, date));
    } catch (error) {
      if (error.status !== 404) throw error;
      console.warn(`[DWD] ${date}: HTTP 404 for one location; retrying once`);
      try {
        response = await fetchJson(urlForBrightSky(spot, date));
      } catch (retryError) {
        if (retryError.status !== 404) throw retryError;
        noObservation++;
        stationData.set(spot.key, { distanceKm: null, hourly: new Map() });
        completed++;
        continue;
      }
    }
    stationData.set(spot.key, normalizeBrightSkyResponse(response));
    completed++;
    if (completed % 10 === 0 || completed === spots.length)
      console.log(`[DWD] ${date}: ${completed}/${spots.length} spots`);
  }
  if (noObservation)
    console.warn(`[DWD] ${date}: ${noObservation} locations had no observation records`);
  return stationData;
}

function utcDate(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function addMetric(metrics, pending, actual, verifiedAt) {
  const month = pending.targetTime.slice(0, 7);
  const key = [month, pending.model, pending.region, pending.stationTier, pending.leadDay].join("|");
  let metric = metrics.get(key);
  if (!metric) {
    metric = {
      month,
      model: pending.model,
      region: pending.region,
      stationTier: pending.stationTier,
      leadDay: pending.leadDay,
      samples: 0,
      stationSamples: 0,
      expectedStationSamples: 0,
      sumCoverage: 0,
      sumAbsErrorKnots: 0,
      sumSquaredErrorKnots: 0,
      sumBiasKnots: 0,
      directionSamples: 0,
      sumAbsDirectionErrorDeg: 0,
      lastVerifiedAt: verifiedAt
    };
    metrics.set(key, metric);
  }

  const error = pending.meanWindKnots - actual.meanWindKnots;
  metric.samples++;
  metric.stationSamples += actual.sampleCount;
  metric.expectedStationSamples += actual.expectedCount;
  metric.sumCoverage += actual.coverage;
  metric.sumAbsErrorKnots += Math.abs(error);
  metric.sumSquaredErrorKnots += error * error;
  metric.sumBiasKnots += error;
  metric.lastVerifiedAt = verifiedAt;

  if (Number.isFinite(pending.meanDirectionDeg) && Number.isFinite(actual.meanDirectionDeg)) {
    const difference = Math.abs(((pending.meanDirectionDeg - actual.meanDirectionDeg + 540) % 360) - 180);
    metric.directionSamples++;
    metric.sumAbsDirectionErrorDeg += difference;
  }
}

function readState(raw) {
  if (!raw) return { schemaVersion: 1, updatedAt: null, pending: [] };
  const state = JSON.parse(raw);
  if (state.schemaVersion !== 1 || !Array.isArray(state.pending))
    throw new Error("Unexpected forecast benchmark state schema");
  return state;
}

function readMetrics(raw) {
  if (!raw) return { schemaVersion: 1, updatedAt: null, metrics: [] };
  const data = JSON.parse(raw);
  if (data.schemaVersion !== 1 || !Array.isArray(data.metrics))
    throw new Error("Unexpected forecast benchmark metrics schema");
  return data;
}

function pendingKey(row) {
  return [row.issuedAt, row.targetTime, row.model, row.region, row.stationTier].join("|");
}

async function fetchModelForecasts(region, cohort, model) {
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", cohort.map(spot => spot.lat).join(","));
  url.searchParams.set("longitude", cohort.map(spot => spot.lon).join(","));
  url.searchParams.set("hourly", "wind_speed_10m,wind_direction_10m");
  url.searchParams.set("models", model);
  url.searchParams.set("wind_speed_unit", "kn");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("forecast_days", "8");
  url.searchParams.set("cell_selection", region === "inland" ? "land" : "sea");

  const data = await fetchJson(url);
  const locations = Array.isArray(data) ? data : [data];
  if (locations.length !== cohort.length)
    throw new Error(`${model}/${region}: expected ${cohort.length} locations, received ${locations.length}`);
  return new Map(locations.map((location, index) => {
    const hourly = location?.hourly;
    if (!Array.isArray(hourly?.time) || !Array.isArray(hourly?.wind_speed_10m))
      return [cohort[index].key, new Map()];
    const byTime = new Map();
    hourly.time.forEach((time, hourIndex) => {
      const timestamp = parseUtcTime(time);
      const speed = finiteNumber(hourly.wind_speed_10m[hourIndex]);
      if (timestamp === null || speed === null || speed < 0) return;
      byTime.set(new Date(timestamp).toISOString(), {
        speed,
        direction: finiteNumber(hourly.wind_direction_10m?.[hourIndex])
      });
    });
    return [cohort[index].key, byTime];
  }));
}

async function buildPendingForecasts(spots, stationData, issuedAtMs) {
  const cohorts = buildCohorts(spots, stationData);
  const regions = ["north_sea", "baltic", "inland"];
  const pending = [];
  let successfulRequests = 0;

  for (const region of regions) {
    const extended = cohorts.get(`${region}|extended`);
    if (!extended) {
      console.log(`[Open-Meteo] ${region}: fewer than ${MIN_REGION_SPOTS} nearby DWD stations; skipped`);
      continue;
    }
    for (const model of MODEL_IDS) {
      let forecasts;
      try {
        forecasts = await fetchModelForecasts(region, extended, model);
      } catch (error) {
        console.error(`[Open-Meteo] ${model}/${region} failed: ${error.message}`);
        continue;
      }
      successfulRequests++;

      const timeKeys = [...forecasts.values()].find(values => values.size > 0)?.keys() ?? [];
      for (const targetTime of timeKeys) {
        const targetMs = Date.parse(targetTime);
        const leadHours = Math.ceil((targetMs - issuedAtMs) / 3600000);
        if (leadHours <= 0 || leadHours > MAX_LEAD_HOURS) continue;
        const leadDay = Math.ceil(leadHours / 24);
        for (const stationTier of Object.keys(STATION_TIERS)) {
          const cohort = cohorts.get(`${region}|${stationTier}`);
          if (!cohort) continue;
          const aggregate = aggregateCohort(cohort, forecasts, targetTime);
          if (!aggregate || aggregate.sampleCount !== aggregate.expectedCount) continue;
          pending.push({
            issuedAt: new Date(issuedAtMs).toISOString(),
            targetTime,
            model,
            region,
            stationTier,
            leadHours,
            leadDay,
            meanWindKnots: aggregate.meanWindKnots,
            meanDirectionDeg: aggregate.meanDirectionDeg,
            expectedCount: aggregate.expectedCount
          });
        }
      }
      console.log(`[Open-Meteo] ${model}/${region}: completed`);
    }
  }
  if (!successfulRequests) throw new Error("No Open-Meteo model request succeeded");
  return pending;
}

async function run() {
  const html = await readFile(SPOTS_FILE, "utf8");
  const spots = selectCandidateSpots(parseSpots(html));
  if (spots.length < MIN_REGION_SPOTS)
    throw new Error(`Only ${spots.length} candidate spots found`);
  console.log(`[Benchmark] ${spots.length} deterministic German-region spots selected`);

  const rawState = await readFile(STATE_FILE, "utf8").catch(error => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  const state = readState(rawState);
  const rawMetrics = await readFile(METRICS_FILE, "utf8").catch(error => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  const publicMetrics = readMetrics(rawMetrics);
  const now = Date.now();
  const today = utcDate(now);
  const yesterday = utcDate(now - 24 * 60 * 60 * 1000);
  const pending = state.pending.filter(row => pendingStatus(row, now) !== "expired");

  const neededDates = new Set([yesterday]);
  for (const row of pending) {
    const targetDate = utcDate(Date.parse(row.targetTime));
    if (Date.parse(row.targetTime) < now) neededDates.add(targetDate);
  }
  const orderedDates = [...neededDates].sort((a, b) => b.localeCompare(a));
  const observationsByDate = new Map();
  for (const date of orderedDates) {
    observationsByDate.set(date, await loadObservationDay(spots, date));
  }

  const metrics = new Map(publicMetrics.metrics.map(metric => [
    [metric.month, metric.model, metric.region, metric.stationTier, metric.leadDay].join("|"),
    metric
  ]));
  const remainingPending = [];
  const todayStart = Date.parse(`${today}T00:00:00Z`);
  for (const row of pending) {
    const targetMs = Date.parse(row.targetTime);
    const targetDate = utcDate(targetMs);
    const status = pendingStatus(row, now);
    if (status === "future") {
      remainingPending.push(row);
      continue;
    }
    if (status === "expired" || targetMs < todayStart - 7 * 24 * 60 * 60 * 1000) continue;
    const stationData = observationsByDate.get(targetDate);
    if (!stationData) {
      remainingPending.push(row);
      continue;
    }
    const cohort = buildCohorts(spots, stationData).get(`${row.region}|${row.stationTier}`);
    if (!cohort || cohort.length !== row.expectedCount) {
      remainingPending.push(row);
      continue;
    }
    const valuesBySpot = new Map([...stationData.entries()].map(([key, data]) => [key, data.hourly]));
    const actual = aggregateCohort(cohort, valuesBySpot, row.targetTime);
    if (!actual) {
      remainingPending.push(row);
      continue;
    }
    addMetric(metrics, row, actual, new Date(now).toISOString());
  }

  const yesterdayData = observationsByDate.get(yesterday);
  const newPending = await buildPendingForecasts(spots, yesterdayData, now);
  const deduplicated = new Map();
  for (const row of [...remainingPending, ...newPending]) deduplicated.set(pendingKey(row), row);

  const updatedAt = new Date(now).toISOString();
  const outputState = {
    schemaVersion: 1,
    updatedAt,
    pending: [...deduplicated.values()]
  };
  const outputMetrics = {
    schemaVersion: 1,
    updatedAt,
    observationSource: "DWD via Bright Sky",
    forecastSource: "Open-Meteo",
    metrics: [...metrics.values()].sort((a, b) =>
      a.month.localeCompare(b.month) ||
      a.region.localeCompare(b.region) ||
      a.model.localeCompare(b.model) ||
      a.stationTier.localeCompare(b.stationTier) ||
      a.leadDay - b.leadDay
    )
  };

  await mkdir(dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, `${JSON.stringify(outputState, null, 2)}\n`);
  await writeFile(METRICS_FILE, `${JSON.stringify(outputMetrics, null, 2)}\n`);
  console.log(`[Benchmark] ${outputState.pending.length} pending aggregates; ${outputMetrics.metrics.length} metric buckets`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  run().catch(error => {
    console.error(`[Benchmark] ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}
