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
const bestWaveStart = source.indexOf("function hasBestWaveDirection(");
const bestWaveEnd = source.indexOf("\n// 5.5.0:", bestWaveStart);
const hasBestWaveDirection = vm.runInNewContext(`${source.slice(bestWaveStart, bestWaveEnd)}; hasBestWaveDirection`, { angleInRange });
const validationStart = source.indexOf("function safeHttpsUrl(");
const validationEnd = source.indexOf("\nconst MAIN_DIR_KEY", validationStart);
const validation = vm.runInNewContext(`${source.slice(validationStart, validationEnd)}; ({safeWindfinderUrl,safeDailyDoseUrl,validWave})`, { URL });
const scoreRowsStart = source.indexOf("function medianModelEntry(");
const scoreRowsEnd = source.indexOf("\nconst pad =", scoreRowsStart);
const scoreRows = vm.runInNewContext(`${source.slice(scoreRowsStart, scoreRowsEnd)}; scoreRows`, {
  getActiveModels: () => new Set(["ICON","GFS","ECMWF"]),
  WAVE_EWAM: "DWD EWAM (~5 km)",
  WAVE_BM: "Best Match",
  waveSrcOf: () => "ewam",
  compass: dir => String(dir)
});
const waveStarArcStart = source.lastIndexOf("let pendingWaveStarSelection = null;", source.indexOf("function waveStarArc("));
const waveStarFunctionsEnd = source.indexOf("\nfunction setSpotPos(", waveStarArcStart);
const makeWaveStarEditor = spot => {
  const elements = new Map();
  const dialog = { open: false, showModal(){ this.open = true; }, close(){ this.open = false; } };
  elements.set("wave-star-dialog", dialog);
  for(const id of ["wave-star-dialog-min","wave-star-dialog-max","wave-star-dialog-title","wave-star-dialog-error"]) elements.set(id,{value:"",textContent:""});
  const starMode = new Set([spot.name]);
  const context = {
    SPOTS: [spot],
    DIR16: ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
    document: { getElementById: id => elements.get(id) || null },
    applySpotEdit: (target, dirs, mainDir, waveStar, weakDirs) => Object.assign(target,{dirs:[...dirs],mainDir,waveStar,weakDirs:[...weakDirs]}),
    repaintSoft: () => {},
    starMode,
    toast: message => { throw new Error(message); }
  };
  const api = vm.runInNewContext(`${source.slice(waveStarArcStart,waveStarFunctionsEnd)}; ({waveStarArc,waveStarForRange,setWaveStarDegrees,openWaveStarDialog,saveWaveStarDialog,clearWaveStar})`,context);
  return {api,context,elements,dialog,starMode};
};

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

test("uses a statistical median for an even number of active wind models", () => {
  const result = scoreRows([{
    hour: 12,
    time: "2026-11-20T12:00:00",
    dl: true,
    models: {
      ICON: {wind:15,dir:270},
      GFS: {wind:25,dir:270}
    }
  }], {date:"2026-11-20",startHour:null,minwind:0,maxwind:100,minwave:0,maxwave:10,usedir:false}, {name:"Test",dirs:[]});

  assert.equal(result.day[0].wind,20);
  assert.equal(result.day[0].medLabel,"Median");
  assert.equal(result.day[0].dir,270);
});

test("keeps the middle wind model as median for an odd number of active models", () => {
  const result = scoreRows([{
    hour: 12,
    time: "2026-11-20T12:00:00",
    dl: true,
    models: {
      ICON: {wind:15,dir:240},
      GFS: {wind:20,dir:270},
      ECMWF: {wind:30,dir:300}
    }
  }], {date:"2026-11-20",startHour:null,minwind:0,maxwind:100,minwave:0,maxwave:10,usedir:false}, {name:"Test",dirs:[]});

  assert.equal(result.day[0].wind,20);
  assert.equal(result.day[0].medLabel,"GFS");
});

test("rejects unsafe external spot URLs and invalid wave-star widths", () => {
  assert.equal(validation.safeWindfinderUrl("https://www.windfinder.com/forecast/kaegsdorf"), "https://www.windfinder.com/forecast/kaegsdorf");
  assert.equal(validation.safeWindfinderUrl('https://www.windfinder.com/forecast/kaegsdorf" onmouseover="alert(1)'), null);
  assert.equal(validation.safeWindfinderUrl("https://windfinder.com.evil.example/forecast/kaegsdorf"), null);
  assert.equal(validation.safeWindfinderUrl("javascript:alert(1)"), null);
  assert.equal(validation.safeDailyDoseUrl("https://www.dailydose.de/spotguide/spotguide.php?spot_id=176"), "https://www.dailydose.de/spotguide/spotguide.php?spot_id=176");
  assert.equal(validation.safeDailyDoseUrl('https://www.dailydose.de/spotguide/"><img src=x>'), null);
  assert.equal(validation.validWave({label:"Beste Welle",display:"W",min:258.75,max:281.25}), true);
  assert.equal(validation.validWave({label:"Beste Welle",display:"WNW–WSW",min:281.25,max:258.75}), false);
  assert.equal(validation.validWave({label:"Beste Welle",display:"N–O",min:0,max:90}), false);
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
  assert.deepEqual(Array.from(starDirsOf({ waveStar: { min: 10, max: 50 } })), ["NNO"]);
  assert.equal(angleInRange(294.99, 295, 300), false);
  assert.equal(angleInRange(295, 295, 300), true);
  assert.equal(angleInRange(300, 295, 300), true);
  assert.equal(angleInRange(300.01, 295, 300), false);
});

test("accepts narrow clockwise ranges across north and rejects ranges of 45 degrees or more", () => {
  const { api } = makeWaveStarEditor({name:"Test",dirs:[],mainDir:"-",weakDirs:[]});

  assert.deepEqual({ ...api.waveStarArc(355,5) }, {min:355,max:5,width:10});
  assert.deepEqual({ ...api.waveStarArc(280,290) }, {min:280,max:290,width:10});
  assert.equal(api.waveStarArc(5,360), null);
  assert.equal(api.waveStarArc(0,45), null);
  assert.equal(api.waveStarArc(5,5), null);
});

test("sets a precise range from fields and normalizes 360 degrees to north", () => {
  const spot = { name: "Kühlungsborn", dirs: ["WNW"], mainDir: "WNW", weakDirs: [], waveStar: null };
  const editor = makeWaveStarEditor(spot);
  const { api,elements } = editor;
  elements.set("min",{value:"350"});
  elements.set("max",{value:"360"});
  api.setWaveStarDegrees("Kühlungsborn","min","max");

  assert.equal(spot.waveStar.min,350);
  assert.equal(spot.waveStar.max,0);
  assert.equal(spot.waveStar.display,"350–0°");
});

test("displays exact compass sectors by name and narrow custom sectors in degrees", () => {
  const {api} = makeWaveStarEditor({name:"Test",dirs:[],mainDir:"-",weakDirs:[],waveStar:null});

  assert.equal(api.waveStarForRange({waveStar:null},{min:213.75,max:236.25}).display,"SW");
  assert.equal(api.waveStarForRange({waveStar:null},{min:280,max:290}).display,"280–290°");
});

test("shows the best-wave badge only for an eligible hour inside the exact range", () => {
  const spot = { waveStar: { min: 295, max: 300 } };

  assert.equal(hasBestWaveDirection(spot, { good: [{ dir: 294.99 }, { dir: 300.01 }] }), false);
  assert.equal(hasBestWaveDirection(spot, { good: [{ dir: 295 }] }), true);
});

test("clicking the selected star direction removes it instead of creating another star", () => {
  const spot = {name:"Kägsdorf",dirs:["SW"],mainDir:"SW",weakDirs:[],waveStar:{min:213.75,max:236.25}};
  const editor = makeWaveStarEditor(spot);
  const start = source.indexOf("function cycleDir(");
  const end = source.indexOf("\nfunction markSpotDirty(",start);
  const cycleDir = vm.runInNewContext(`${source.slice(start,end)}; cycleDir`,{
    SPOTS:editor.context.SPOTS,DIR16:editor.context.DIR16,starMode:editor.starMode,
    starDirsOf,starFromDirs:()=>null,clearWaveStar:editor.api.clearWaveStar,
    openWaveStarDialog:editor.api.openWaveStarDialog,applySpotEdit:editor.context.applySpotEdit,
    repaintSoft:()=>{},alert:()=>{}
  });

  cycleDir("Kägsdorf","SW");
  assert.equal(spot.waveStar,null);
  assert.equal(editor.starMode.has("Kägsdorf"),false);
  assert.equal(editor.dialog.open,false);
});

test("star-mode direction selection opens the angle dialog and applies only one narrow range", () => {
  const spot = {name:"Kühlungsborn",dirs:["W"],mainDir:"W",weakDirs:[],waveStar:null};
  const editor = makeWaveStarEditor(spot);
  const start = source.indexOf("function cycleDir(");
  const end = source.indexOf("\nfunction markSpotDirty(",start);
  const cycleDir = vm.runInNewContext(`${source.slice(start,end)}; cycleDir`,{
    SPOTS:editor.context.SPOTS,DIR16:editor.context.DIR16,starMode:editor.starMode,
    starDirsOf,starFromDirs:()=>null,clearWaveStar:editor.api.clearWaveStar,
    openWaveStarDialog:editor.api.openWaveStarDialog,applySpotEdit:editor.context.applySpotEdit,
    repaintSoft:()=>{},alert:()=>{}
  });

  cycleDir("Kühlungsborn","WNW");
  assert.equal(spot.waveStar,null);
  assert.equal(editor.dialog.open,true);
  assert.equal(editor.elements.get("wave-star-dialog-min").value,"281.25");
  editor.elements.get("wave-star-dialog-min").value="5";
  editor.elements.get("wave-star-dialog-max").value="360";
  editor.api.saveWaveStarDialog({preventDefault(){}});
  assert.ok(editor.elements.get("wave-star-dialog-error").textContent);
  assert.equal(spot.waveStar,null);
  assert.equal(editor.dialog.open,true);
  editor.elements.get("wave-star-dialog-min").value="295";
  editor.elements.get("wave-star-dialog-max").value="300";
  editor.api.saveWaveStarDialog({preventDefault(){}});

  assert.deepEqual(spot.dirs,["W","WNW"]);
  assert.equal(spot.waveStar.min,295);
  assert.equal(spot.waveStar.max,300);
  assert.equal(editor.starMode.has("Kühlungsborn"),true);
  assert.equal(editor.dialog.open,false);

  cycleDir("Kühlungsborn","WNW");
  assert.equal(spot.waveStar,null);
  assert.equal(editor.starMode.has("Kühlungsborn"),false);
});
