import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const updates = JSON.parse(readFileSync(new URL("../docs/spot-updates.json", import.meta.url), "utf8"));
const validationStart = source.indexOf("function safeHttpsUrl(");
const validationEnd = source.indexOf("\nconst MAIN_DIR_KEY", validationStart);
const validation = vm.runInNewContext(`${source.slice(validationStart, validationEnd)}; ({safeWindfinderUrl,safeDailyDoseUrl,validWave})`, { URL });

test("title and visible app version use the same release number", () => {
  const titleVersion = source.match(/<title>ANDIsGREENed ([0-9.]+)<\/title>/)?.[1];
  const appVersion = source.match(/const APP_VERSION = "([0-9.]+)"/)?.[1];
  assert.ok(titleVersion);
  assert.equal(titleVersion, appVersion);
  const manifest = JSON.parse(readFileSync(new URL("../docs/manifest.webmanifest", import.meta.url), "utf8"));
  const apkPackage = JSON.parse(readFileSync(new URL("../apk/package.json", import.meta.url), "utf8"));
  assert.equal(manifest.version, appVersion);
  assert.equal(apkPackage.version, appVersion);
});

test("all published spot changes contain valid wave-star ranges and URLs", () => {
  for(const [name, change] of Object.entries(updates.changes || {})){
    if(change.waveStar) assert.equal(validation.validWave(change.waveStar), true, `${name}: invalid wave star`);
    if(change.wf) assert.ok(validation.safeWindfinderUrl(change.wf), `${name}: invalid Windfinder URL`);
    if(change.dd) assert.ok(validation.safeDailyDoseUrl(change.dd), `${name}: invalid DailyDose URL`);
  }
});

test("Kägsdorf wave star represents only the narrow west sector", () => {
  const wave = updates.changes.Kägsdorf.waveStar;
  assert.deepEqual({ ...wave }, {label:"Beste Welle",min:258.75,max:281.25,display:"W"});
  assert.equal(((wave.max-wave.min)%360+360)%360,22.5);
});

test("publishes spot changes to GitHub and retains the token for reuse", async () => {
  const start = source.indexOf("const b64enc =");
  const end = source.indexOf("\n// Veröffentlichte Änderungen prüfen", start);
  const elements = new Map([
    ["gh-token",{value:"github_pat_test"}],
    ["gh-note",{textContent:""}]
  ]);
  const requests = [];
  const fetch = async (url, options = {}) => {
    requests.push({url,options});
    if(options.method === "PUT"){
      return {ok:true,status:200,json:async () => ({})};
    }
    return {ok:false,status:404,json:async () => ({})};
  };
  const dirtySpots = new Set(["Kägsdorf"]);
  let savedToken = "";
  const localStorage = {setItem() {},getItem(){ return null; },removeItem(){}};
  const context = {
    $: id => elements.get(id),
    ghToken: () => elements.get("gh-token").value.trim(),
    SPOTS: [{name:"Kägsdorf",dirs:["W"],weakDirs:[],mainDir:"W",waveStar:{label:"Beste Welle",display:"W",min:258.75,max:281.25},lat:54.1435,lon:11.6656}],
    spotModels:{},
    spotWave:{},
    dirtySpots,
    seenUpdates:{},
    localStorage,
    fetch,
    btoa,
    atob,
    unescape,
    escape,
    updatePublishButton() {},
    saveGhToken(token) { savedToken = token; elements.get("gh-token").value = ""; },
    GH_REPO:"AndiSGreenED/andisgreened.github.io",
    UPD_PATH:"docs/spot-updates.json",
    SEEN_KEY:"seen",
    DIRTY_KEY:"dirty"
  };
  const publish = vm.runInNewContext(`${source.slice(start,end)}; publishSpotEdits`, context);

  await publish();

  assert.equal(requests.length,2);
  assert.equal(requests[1].options.headers.Authorization,"Bearer github_pat_test");
  const body = JSON.parse(requests[1].options.body);
  const stored = JSON.parse(Buffer.from(body.content,"base64").toString("utf8"));
  assert.equal(stored.changes.Kägsdorf.waveStar.display,"W");
  assert.equal(dirtySpots.size,0);
  assert.equal(savedToken,"github_pat_test");
  assert.equal(elements.get("gh-token").value,"");
  assert.match(elements.get("gh-note").textContent,/Gespeichert/);
});

test("stores a GitHub token for one hour and hides the input only while valid", () => {
  const start = source.indexOf("const GH_TOKEN_KEY =");
  const end = source.indexOf("\nfunction toast(", start);
  let now = 1_000_000;
  let scheduled = null;
  const stored = new Map();
  const elements = new Map([
    ["gh-token",{value:"github_pat_test"}],
    ["gh-token-entry",{hidden:false}]
  ]);
  const helpers = vm.runInNewContext(
    `${source.slice(start,end)}; ({saveGhToken,restoreGhToken,hasCachedGhToken,ghToken,forgetMemory:() => { ghTokenCache = null; }})`,
    {
      Date:{now:() => now},
      localStorage:{
        getItem:key => stored.get(key) ?? null,
        setItem:(key,value) => stored.set(key,value),
        removeItem:key => stored.delete(key)
      },
      $:id => elements.get(id),
      setTimeout(fn,delay){ scheduled = {fn,delay}; return 1; },
      clearTimeout() {},
      repaintSoft() {}
    }
  );

  helpers.saveGhToken(elements.get("gh-token").value);
  const saved = JSON.parse(stored.get("andisgreened-gh-token"));
  assert.equal(saved.expiresAt, now + 60 * 60 * 1000);
  assert.equal(elements.get("gh-token").value,"");
  assert.equal(elements.get("gh-token-entry").hidden,true);

  helpers.forgetMemory();
  helpers.restoreGhToken();
  assert.equal(helpers.ghToken(),"github_pat_test");
  assert.equal(elements.get("gh-token-entry").hidden,true);

  now = saved.expiresAt;
  scheduled.fn();
  assert.equal(helpers.hasCachedGhToken(),false);
  assert.equal(elements.get("gh-token-entry").hidden,false);
  assert.equal(stored.has("andisgreened-gh-token"),false);
});
