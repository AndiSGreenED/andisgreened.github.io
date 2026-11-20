import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const start = source.indexOf("const API_CACHE =");
const end = source.indexOf("\n// ---- Modelllauf-Anzeige", start);
const load = fetch => vm.runInNewContext(`${source.slice(start,end)}; ({fetchJSONRaw,fetchJSON})`, {
  fetch,
  setTimeout,
  clearTimeout,
  Promise,
  Date,
  Number,
  Map
});

test("turns a failed weather request into an actionable network error", async () => {
  const {fetchJSONRaw} = load(async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(fetchJSONRaw("https://api.open-meteo.com/test"), /Netzwerkfehler.*Verbindung/);
});

test("reports malformed and non-successful weather responses", async () => {
  const malformed = load(async () => ({status:502,ok:false,headers:{get:() => null},json:async () => { throw new Error("invalid"); }}));
  await assert.rejects(malformed.fetchJSONRaw("https://api.open-meteo.com/test"), /Ungültige API-Antwort \(HTTP 502\)/);

  const unavailable = load(async () => ({status:503,ok:false,headers:{get:() => null},json:async () => ({error:true,reason:"Service unavailable"})}));
  await assert.rejects(unavailable.fetchJSONRaw("https://api.open-meteo.com/test"), /Service unavailable/);
});

test("does not cache failed weather requests", async () => {
  let attempts = 0;
  const {fetchJSON} = load(async () => {
    attempts++;
    throw new TypeError("offline");
  });

  await assert.rejects(fetchJSON("https://example.test/forecast"), /Netzwerkfehler/);
  await assert.rejects(fetchJSON("https://example.test/forecast"), /Netzwerkfehler/);
  assert.equal(attempts,2);
});
