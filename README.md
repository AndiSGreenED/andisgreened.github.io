# ANDIsGREENed

Wind- und Wellen-Reviercheck für Windsurfer und Wingfoiler.

- **Web-App:** https://andisgreened.github.io/ (im Browser „App installieren“ bzw. „Zum Home-Bildschirm“)
- **Android-App:** [ANDIsGREENed.apk](https://github.com/andisgreened/andisgreened.github.io/releases/download/apk-latest/ANDIsGREENed.apk)

## Aufbau
- `docs/` – die App (wird über GitHub Pages ausgeliefert). Updates: Dateien hier ersetzen.
- `apk/` – Android-Hülle (Capacitor 8). Wird von `.github/workflows/build-apk.yml` gebaut, Ergebnis unter Releases → `apk-latest`.
- `ANLEITUNG.md` – Einrichtung, Updates, Signatur.

Wetterdaten: [Open-Meteo](https://open-meteo.com) (CC BY 4.0), DWD über [Bright Sky](https://brightsky.dev). Ortssuche: Open-Meteo Geocoding, © OpenStreetMap-Mitwirkende (Nominatim).
