# ANDIsGREENed

Wind- und Wellencheck für Windsurfer und Wingfoiler: Welche Spots passen heute?
*Wind & wave check for windsurfers: which spots work today? (UI in German)*

- **Web-App:** https://andisgreened.github.io/ (im Browser „App installieren“ / „Zum Home-Bildschirm“)
- **Android-App:** [Releases](https://github.com/AndiSGreenED/andisgreened.github.io/releases) – fester Link: [ANDIsGREENed.apk](https://github.com/AndiSGreenED/andisgreened.github.io/releases/download/apk-latest/ANDIsGREENed.apk)
- **Datenschutz / Privacy:** https://andisgreened.github.io/datenschutz.html – keine Konten, keine Werbung, kein Tracking.

## Aufbau / Structure
- `docs/` – die App (HTML/JS, GitHub Pages). Version = `APP_VERSION` in `docs/index.html`.
- `apk/` – Android-Hülle (Capacitor 8). Die Oberfläche aus `docs/` wird in die APK eingebaut.
- `.github/workflows/build-apk.yml` – baut bei jeder neuen `APP_VERSION` eine signierte APK und legt das Release `v<Version>` an.
- `fastlane/metadata/android/` – Texte und Bilder für IzzyOnDroid / F-Droid.

## Build
```
cd apk && node scripts/configure.js https://andisgreened.github.io/ eingebaut
npm install && npx cap add android && node scripts/patch-android.js <versionName> <versionCode> && npx cap sync android
cd android && ./gradlew assembleRelease
```

## Daten / Data
Wetterdaten: [Open-Meteo](https://open-meteo.com) (CC BY 4.0), DWD über [Bright Sky](https://brightsky.dev). Ortssuche: Open-Meteo Geocoding, © OpenStreetMap-Mitwirkende (Nominatim).

## Lizenz / License
MIT, siehe [LICENSE](LICENSE).
