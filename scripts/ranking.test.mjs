import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const styles = readFileSync(new URL("../docs/styles.css", import.meta.url), "utf8");
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
test("weekly bars ignore minimum wind and wave but retain the other filters", () => {
  const weekStart = source.indexOf("const WEEK_SCALE =");
  const weekEnd = source.indexOf("\nfunction distLabel(", weekStart);
  const NativeDate = Date;
  const seenFilters = [];
  const seenModels = [];
  const FakeDate = class extends NativeDate {
    constructor(...args){ super(...(args.length ? args : ["2030-06-01T08:00:00Z"])); }
    static now(){ return NativeDate.UTC(2030,5,1,8); }
  };
  const weekModel = vm.runInNewContext(
    `${source.slice(weekStart,weekEnd)}; weekModel`,
    {
      MAX_DAYS:0,
      Date:FakeDate,
      MS_TO_KN:1.943844,
      lastFilters:{date:"2030-05-31",startHour:6,usedir:false,minwind:15,maxwind:25,minwave:0.5,maxwave:2},
      lastRaw:[
        {spot:{name:"Gold",dirs:["W"]},rows:[{models:{ICON:{wind:22},DMI:{wind:12}},hour:12}]},
        {spot:{name:"Treff",dirs:["W"]},rows:[{models:{ICON:{wind:22},DMI:{wind:21}},hour:12}]}
      ],
      todayNoon:() => new FakeDate("2030-06-01T12:00:00Z"),
      addDays:(date,count) => { const d = new FakeDate(date); d.setUTCDate(d.getUTCDate()+count); return d; },
      dateISO:date => date.toISOString().slice(0,10),
      scoreRows:(rows,f,spot) => {
        seenFilters.push({name:spot.name,...f});
        seenModels.push(Object.keys(rows[0].models));
        const three = [12,13,14].map((hour,index) => ({hour,wind:22,wave:[1.1,1.4,0.8][index],time:"2030-06-01T12:00:00",dir:270}));
        return {
          day:three,
          good:spot.name==="Treff" ? three : [three[0]]
        };
      },
      CORE_WIND_MODELS:new Set(["ICON","GFS","ECMWF"])
    }
  );

  const result = weekModel();
  assert.deepEqual(
    seenFilters.map(f => ({name:f.name,startHour:f.startHour,usedir:f.usedir,minwind:f.minwind,maxwind:f.maxwind,minwave:f.minwave,maxwave:f.maxwave})),
    [
      {name:"Gold",startHour:6,usedir:false,minwind:0,maxwind:25,minwave:0,maxwave:2},
      {name:"Treff",startHour:6,usedir:false,minwind:0,maxwind:25,minwave:0,maxwave:2}
    ]
  );
  assert.deepEqual(seenModels, [["ICON","DMI"],["ICON","DMI"]]);
  assert.equal(result.days[0].name,"Treff");
  assert.equal(result.days[0].kn,22);
  assert.equal(result.days[0].wave,1.4);
});
test("card wind median uses the same active models as ranking", () => {
  const helperStart = source.indexOf("function getActiveModels(");
  const helperEnd = source.indexOf("\nfunction renderModelControls()", helperStart);
  for(const [label,spotName] of [["DMI","DmiOnly"],["Google","GoogleOnly"]]){
    const context = vm.createContext({
      spotModels:{[spotName]:[label]},
      localStorage:{getItem:()=>null},
      DEFAULT_ACTIVE_MODELS:["ICON","GFS","ECMWF","DMI","DWD","Google"]
    });
    vm.runInContext(`${source.slice(helperStart,helperEnd)}; this.api={getActiveModels,getActiveWindEntries}`,context);
    assert.deepEqual(Array.from(context.api.getActiveWindEntries({
      ICON:{wind:30},
      DMI:{wind:18},
      Google:{wind:12}
    },spotName), ([name])=>name),[label]);
  }
});
test("weekly bar renders the largest three-hour wave above the bar in a blue label", () => {
  const start = source.indexOf("function weekRender(");
  const end = source.indexOf("\nfunction paintWeek(", start);
  const NativeDate = Date;
  const FakeDate = class extends NativeDate {
    constructor(...args){ super(...(args.length ? args : ["2030-06-01T08:00:00Z"])); }
  };
  const box = {hidden:true,innerHTML:""};
  const weekRender = vm.runInNewContext(`(${source.slice(start,end)}\n)`, {
    $: id => id === "week" ? box : {value:"2030-06-01"},
    todayNoon:() => new FakeDate("2030-06-01T12:00:00Z"),
    Date:FakeDate,
    dateISO:date => date.toISOString().slice(0,10),
    weekColor:() => "#3182bd",
    WEEK_SCALE:[[Infinity,"#66007a"]],
    MS_TO_KN:1.943844,
    esc:value => String(value),
    pad:value => String(value).padStart(2,"0")
  });

  weekRender({days:[{date:"2030-06-01",n:1,kn:22,wave:1.4,name:"Test",start:12}]});

  assert.match(box.innerHTML,/<em class="wk-wave">1,4<\/em><i/);
  assert.match(styles,/#week \.wk \.wk-wave\{[^}]*color:#59bfff/);
});
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
  assert.equal(result.peak.wind,25);
  assert.equal(result.peak.modelLabel,"GFS");
});

test("renders imported spot names as data attributes without inline JavaScript", () => {
  const start = source.indexOf("function dirEditorHtml(");
  const end = source.indexOf("\nfunction toggleStarMode(",start);
  const maliciousName = "x');document.body.dataset.owned='1';//";
  const render = vm.runInNewContext(`(${source.slice(start,end)})`, {
    DIR16: ["W"],
    starDirsOf: () => [],
    starMode: new Set(),
    needToken: new Set(),
    dirtySpots: new Set(),
    esc: value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]))
  });

  const html = render({name:maliciousName,dirs:["W"],mainDir:"W",weakDirs:[],waveStar:null,lat:54,lon:11});

  assert.match(html,/data-spot="x&#39;\);document\.body\.dataset\.owned=&#39;1&#39;;\/\//);
  assert.doesNotMatch(html,/\son(?:click|change)=/i);
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
