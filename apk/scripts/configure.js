// Bereitet die App-Hülle vor dem Bau vor.
// Aufruf: node scripts/configure.js <App-Adresse> <online|eingebaut>
//  online:    Die App lädt die Oberfläche von der gehosteten Seite (Updates ohne neuen APK).
//  eingebaut: Die Oberfläche aus ../docs wird in die App gepackt (Standard; für IzzyOnDroid, F-Droid, App-Stores).
const fs = require("fs"), path = require("path");
const [url, mode = "online"] = process.argv.slice(2);
const root = path.join(__dirname, "..");
const cfgPath = path.join(root, "capacitor.config.json");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const www = path.join(root, "www");
if (!/^https:\/\/[^/]+\/(.*\/)?$/.test(url || "")) throw new Error("App-Adresse fehlt oder ungültig: " + url);
if (mode === "eingebaut") {
  delete cfg.server.url;
  delete cfg.server.errorPath;
  // Gleicher Hostname wie die Web-Adresse: Die eingebaute Oberfläche läuft unter derselben Herkunft,
  // gespeicherte Spots und Einstellungen aus der bisherigen Online-Fassung bleiben erhalten.
  cfg.server.hostname = new URL(url).hostname;
  const docs = path.join(root, "..", "docs");
  fs.cpSync(docs, www, {recursive: true});
  fs.rmSync(path.join(www, "sw.js"), {force: true}); // in der App nicht nötig
  console.log("Modus eingebaut: Oberfläche aus docs/ übernommen");
} else {
  cfg.server.url = url;
  const off = path.join(www, "offline.html");
  fs.writeFileSync(off, fs.readFileSync(off, "utf8").replace("__APP_URL__", url));
  console.log("Modus online: " + url);
}
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
