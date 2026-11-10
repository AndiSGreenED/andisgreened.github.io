// Ergänzt das von „npx cap add android“ erzeugte Projekt: eigenes Plugin, Berechtigungen, Icons, Startbild,
// Versionsnummer und feste Signatur (falls Schlüssel vorhanden).
// Aufruf: node scripts/patch-android.js <versionName> <versionCode>
const fs = require("fs"), path = require("path");
const [versionName, versionCode] = process.argv.slice(2);
const root = path.join(__dirname, "..");
const app = path.join(root, "android", "app");
const main = path.join(app, "src", "main");
const pkgDir = path.join(main, "java", "de", "andisgreened", "app");
const must = (cond, msg) => { if (!cond) throw new Error("patch-android: " + msg); };

// 1. Java: Plugin und MainActivity
must(fs.existsSync(path.join(pkgDir, "MainActivity.java")), "MainActivity.java nicht gefunden in " + pkgDir);
for (const f of ["AndisNativePlugin.java", "MainActivity.java"]) fs.copyFileSync(path.join(root, "native", "java", f), path.join(pkgDir, f));

// 2. Berechtigungen (Standort für „Meinen Standort verwenden“)
const manPath = path.join(main, "AndroidManifest.xml");
let man = fs.readFileSync(manPath, "utf8");
const perms = ["android.permission.ACCESS_COARSE_LOCATION", "android.permission.ACCESS_FINE_LOCATION"];
for (const p of perms) if (!man.includes(p)) man = man.replace("</manifest>", `    <uses-permission android:name="${p}" />\n</manifest>`);
fs.writeFileSync(manPath, man);

// 3. Icons und Startbilder
fs.cpSync(path.join(root, "native", "res"), path.join(main, "res"), {recursive: true});
const bgPath = path.join(main, "res", "values", "ic_launcher_background.xml");
fs.writeFileSync(bgPath, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#13303F</color>\n</resources>\n');
const stylesPath = path.join(main, "res", "values", "styles.xml");
let styles = fs.readFileSync(stylesPath, "utf8");
must(styles.includes('name="AppTheme.NoActionBarLaunch"'), "Launch-Theme nicht gefunden");
if (!styles.includes("windowSplashScreenBackground"))
  styles = styles.replace(/(<style name="AppTheme\.NoActionBarLaunch"[^>]*>)/, '$1\n        <item name="windowSplashScreenBackground">#0B1720</item>');
fs.writeFileSync(stylesPath, styles);

// 4. Version und Signatur
const gradlePath = path.join(app, "build.gradle");
let g = fs.readFileSync(gradlePath, "utf8");
must(/versionCode \d+/.test(g) && /versionName "[^"]*"/.test(g), "versionCode/versionName nicht gefunden");
g = g.replace(/versionCode \d+/, `versionCode ${Number(versionCode)}`).replace(/versionName "[^"]*"/, `versionName "${versionName}"`);
g += `
// ANDIsGREENed: feste Signatur aus Umgebungsvariablen (GitHub-Secrets), sonst Debug-Signatur
android {
    signingConfigs {
        release {
            if (System.getenv("ANDROID_KEYSTORE_FILE")) {
                storeFile file(System.getenv("ANDROID_KEYSTORE_FILE"))
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS") ?: "andisgreened"
                keyPassword System.getenv("ANDROID_KEY_PASSWORD") ?: System.getenv("ANDROID_KEYSTORE_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            if (System.getenv("ANDROID_KEYSTORE_FILE")) signingConfig signingConfigs.release
        }
    }
}
`;
fs.writeFileSync(gradlePath, g);
console.log(`Android-Projekt ergänzt: Version ${versionName} (${versionCode})`);
