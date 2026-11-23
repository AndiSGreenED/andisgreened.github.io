import test from "node:test";
import assert from "node:assert/strict";
import {
  aggregateCohort,
  aggregateObservationRows,
  buildCohorts,
  buildPendingForecasts,
  normalizeBrightSkyResponse,
  parseSpots,
  pendingStatus,
  regionForSpot,
  retryForecastRequest,
  selectCandidateSpots
} from "./forecast-benchmark.mjs";

test("retries transient forecast failures but not rate limits", async () => {
  let attempts = 0;
  const waits = [];
  const result = await retryForecastRequest(async () => {
    attempts++;
    if (attempts < 3) throw new Error("connection failed", { cause: new TypeError("fetch failed") });
    return "ok";
  }, async delay => waits.push(delay));
  assert.equal(result, "ok");
  assert.equal(attempts, 3);
  assert.deepEqual(waits, [5000, 10000]);

  const rateLimit = Object.assign(new Error("HTTP 429"), { status: 429 });
  await assert.rejects(retryForecastRequest(async () => { throw rateLimit; }, async () => {
    assert.fail("rate limit must not be retried");
  }), /HTTP 429/);

  let failures = 0;
  await assert.rejects(retryForecastRequest(async () => {
    failures++;
    throw new Error("server error", { cause: new TypeError("fetch failed") });
  }, async () => {}), /server error/);
  assert.equal(failures, 3);
});

test("requires usable forecasts for every region and model", async () => {
  const spots = ["north_sea", "baltic", "inland"].flatMap(region =>
    [1, 2, 3].map(id => ({ key: `${region}-${id}`, region }))
  );
  const stations = new Map(spots.map(spot => [spot.key, { distanceKm: 5 }]));
  const now = Date.parse("2026-11-18T03:00:00Z");
  const target = "2026-11-18T04:00:00.000Z";
  const valid = async (_region, cohort) => new Map(cohort.map(spot => [
    spot.key, new Map([[target, { speed: 10, direction: 270 }]])
  ]));
  assert.equal((await buildPendingForecasts(spots, stations, now, valid)).length, 30);
  await assert.rejects(buildPendingForecasts(spots, stations, now, async (region, cohort, model) => {
    if (region === "baltic" && model === "gfs_seamless") throw new Error("network down");
    return valid(region, cohort);
  }), /gfs_seamless\/baltic failed: network down/);
  await assert.rejects(buildPendingForecasts(spots, stations, now, async () => new Map()),
    /no usable forecast aggregates/);
  await assert.rejects(buildPendingForecasts(spots.filter(spot => spot.region !== "baltic"), stations, now, valid),
    /baltic: fewer than 3/);
});

test("parses the checked-in SPOTS_RAW literal including nested spot metadata", () => {
  const spots = parseSpots(`const SPOTS_RAW = [
{name:"Nordstrand",area:"Nordsee",lat:54.3,lon:8.6,dirs:["NW"],waveStar:{min:1,max:2}},
{name:"Binnensee",area:"Bayern",lat:48.2,lon:11.5}
];`);
  assert.equal(spots.length, 2);
  assert.equal(spots[0].waveStar.max, 2);
});

test("classifies broad regions without treating inland-water names as coastline", () => {
  assert.equal(regionForSpot({ name: "Büsum", area: "Dithmarschen" }), "north_sea");
  assert.equal(regionForSpot({ name: "Fehmarn", area: "Ostsee" }), "baltic");
  assert.equal(regionForSpot({ name: "Chiemsee", area: "Bayern" }), "inland");
});

test("candidate selection de-duplicates coordinates and samples deterministically", () => {
  const spots = [
    { name: "A", area: "Nordsee", lat: 54, lon: 8 },
    { name: "A duplicate", area: "Nordsee", lat: 54, lon: 8 },
    { name: "B", area: "Fehmarn", lat: 54, lon: 11 },
    { name: "C", area: "Bayern", lat: 48, lon: 11 },
    { name: "Outside", area: "Spain", lat: 40, lon: -4 }
  ];
  assert.deepEqual(selectCandidateSpots(spots, 2), selectCandidateSpots(spots, 2));
  assert.equal(selectCandidateSpots(spots, 10).length, 3);
});

test("aggregates Bright Sky km/h readings into UTC hourly knots", () => {
  const hourly = aggregateObservationRows([
    { timestamp: "2026-11-18T10:05:00+00:00", wind_speed: 18.52, wind_direction: 350 },
    { timestamp: "2026-11-18T10:45:00+00:00", wind_speed: 18.52, wind_direction: 10 },
    { timestamp: "2026-11-18T11:00:00+00:00", wind_speed: null, wind_direction: null }
  ]);
  const value = hourly.get("2026-11-18T10:00:00.000Z");
  assert.equal(value.meanWindKnots, 10);
  assert.ok(value.meanDirectionDeg < 1 || value.meanDirectionDeg > 359);
  assert.equal(hourly.size, 1);
});

test("uses only nearby historical/current station rows, never forecast rows", () => {
  const data = normalizeBrightSkyResponse({
    sources: [
      { id: 1, observation_type: "historical", distance: 10000 },
      { id: 2, observation_type: "forecast", distance: 100 },
      { id: 3, observation_type: "current", distance: 30000 }
    ],
    weather: [
      { timestamp: "2026-11-18T10:00:00Z", source_id: 1, wind_speed: 18.52, wind_direction: 270 },
      { timestamp: "2026-11-18T10:00:00Z", source_id: 2, wind_speed: 100, wind_direction: 90 },
      { timestamp: "2026-11-18T10:00:00Z", source_id: 3, wind_speed: 36, wind_direction: 180 }
    ]
  });
  assert.equal(data.distanceKm, 10);
  assert.equal(data.hourly.get("2026-11-18T10:00:00.000Z").meanWindKnots, 10);
});

test("requires matching, sufficiently complete station cohorts", () => {
  const spots = [
    { key: "a", region: "baltic" },
    { key: "b", region: "baltic" },
    { key: "c", region: "baltic" },
    { key: "d", region: "baltic" }
  ];
  const stations = new Map(spots.map(spot => [spot.key, { distanceKm: 8 }]));
  const cohorts = buildCohorts(spots, stations);
  const cohort = cohorts.get("baltic|near");
  const values = new Map(spots.slice(0, 3).map(spot => [
    spot.key,
    new Map([["2026-11-18T10:00:00.000Z", { speed: 12, direction: 270 }]])
  ]));
  const aggregate = aggregateCohort(cohort, values, "2026-11-18T10:00:00.000Z");
  assert.equal(aggregate, null);
  values.set(spots[3].key, new Map([["2026-11-18T10:00:00.000Z", { speed: 16, direction: 270 }]]));
  const complete = aggregateCohort(cohort, values, "2026-11-18T10:00:00.000Z");
  assert.equal(complete.sampleCount, 4);
  assert.equal(complete.expectedCount, 4);
  assert.equal(complete.meanWindKnots, 13);

  const observations = new Map(spots.map(spot => [
    spot.key,
    new Map([["2026-11-18T10:00:00.000Z", {
      meanWindKnots: 15,
      meanDirectionDeg: 270
    }]])
  ]));
  const observedAggregate = aggregateCohort(cohort, observations, "2026-11-18T10:00:00.000Z");
  assert.equal(observedAggregate.meanWindKnots, 15);
  assert.equal(observedAggregate.meanDirectionDeg, 270);
});

test("keeps future regional means pending and expires them after seven days", () => {
  const issuedAt = "2026-11-18T03:00:00.000Z";
  assert.equal(pendingStatus({
    issuedAt,
    targetTime: "2026-11-20T03:00:00.000Z"
  }, Date.parse("2026-11-19T03:00:00.000Z")), "future");
  assert.equal(pendingStatus({
    issuedAt,
    targetTime: "2026-11-19T03:00:00.000Z"
  }, Date.parse("2026-11-19T04:00:00.000Z")), "ready");
  assert.equal(pendingStatus({
    issuedAt,
    targetTime: "2026-11-25T03:00:00.000Z"
  }, Date.parse("2026-11-26T03:00:00.000Z")), "expired");
});
