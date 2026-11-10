# ANDIsGREENed 5.5.0 – Betrieb, Updates, Android-App

Konto: GitHub-Benutzer **andisgreened**, Repository **andisgreened.github.io** (öffentlich).
- Web-App: **https://andisgreened.github.io/**
- Android-App: **https://github.com/andisgreened/andisgreened.github.io/releases/download/apk-latest/ANDIsGREENed.apk**

Deine Kumpels brauchen kein Konto. Der Text zum Weiterschicken steht in `TEXT_FUER_KUMPELS.md`.

## Einmalige Einrichtung (Stand: erledigt bzw. siehe Häkchen)
1. Repository `andisgreened.github.io` anlegen, öffentlich.
2. Inhalt dieses Pakets hochladen (Ordner `docs`, `apk`, `.github` und die Dateien).
3. **Settings → Pages:** Source „Deploy from a branch“, Branch `main`, Ordner `/docs`, Save. Nach 1 bis 2 Minuten ist die App unter https://andisgreened.github.io/ erreichbar.
4. **Signaturschlüssel hinterlegen** (damit sich spätere APK-Versionen über die alte installieren und Einstellungen erhalten bleiben):
   Settings → Secrets and variables → Actions → „New repository secret“, zwei Einträge:
   - Name `ANDROID_KEYSTORE_BASE64`, Inhalt: kompletter Text aus `keystore_base64.txt`
   - Name `ANDROID_KEYSTORE_PASSWORD`, Inhalt: Text aus `keystore_passwort.txt`
   **Die Datei `andisgreened-release.jks` und das Passwort sicher aufbewahren** (z. B. Passwortmanager + USB-Stick). Ohne sie lässt sich die App nie wieder als Update ausliefern, auch nicht im Play Store. Nie ins Repository hochladen.
5. **Actions → „APK bauen“ → Run workflow.** Nach 5 bis 10 Minuten liegt die App unter Releases → `apk-latest`.

## Wie die Kumpels die App bekommen
**Weg 1 (empfohlen): Web-App installieren.** Link öffnen → Chrome: „App installieren“, iPhone/Safari: „Zum Home-Bildschirm“. Läuft auf Android und iPhone, startet auch offline, Updates automatisch.

**Weg 2: Android-App (APK).** Download-Link oben, Datei öffnen, „Installation aus dieser Quelle“ einmalig erlauben. Die App lädt ihre Oberfläche bei jedem Start von der Web-App-Adresse. Updates der Oberfläche kommen deshalb ohne neue APK. Ohne Internet zeigt sie eine Seite „Keine Internetverbindung“ und macht weiter, sobald das Netz zurück ist.
In der Android-App funktionieren: Standort (GPS, Android fragt einmal nach), Windfinder-App-Knopf, „Als Datei speichern“ (Speicherort wählbar) und „Teilen“.

## Updates einspielen
**Web-App (betrifft beide Wege):**
1. Neue Dateien bekommst du als `ANDIsGREENed_Update_x.y.z.zip`.
2. Im Repository in den Ordner `docs` → „Add file → Upload files“ → Dateien hineinziehen → „Commit changes“.
3. Nach 1 bis 2 Minuten online. Beim nächsten Öffnen erscheint „Neue Version verfügbar – tippen zum Neuladen“.

Ab 5.5.0 genügt es, wenn sich `index.html` ändert. Der Hinweis erscheint, sobald dort die Versionsnummer (`APP_VERSION`) anders ist. Änderst du selbst etwas in `index.html` (z. B. Spotliste), kommt die Änderung beim nächsten Start auch ohne neue Nummer an, nur ohne Hinweis.

**Android-Hülle (selten nötig):** Nur wenn sich etwas im Ordner `apk/` ändert. Dann baut GitHub die APK automatisch neu. Mit hinterlegtem Schlüssel installiert sie sich über die alte Version, Einstellungen bleiben erhalten.

## Was bei Updates erhalten bleibt
Eigene Spots, Webcam-Links, Wellensterne, Modellwahl, Standort und Einstellungen liegen auf dem jeweiligen Gerät und bleiben bei Updates erhalten. Web-App und Android-App speichern getrennt. Sicherung und Weitergabe: Dev-Modus → „Spots sichern und übertragen“ → „Als Datei speichern“ oder „Teilen“.

## Gut zu wissen
- **Öffentlich:** Code und Spotliste sind im öffentlichen Repository sichtbar. Persönliche Daten und Schlüssel stecken nicht drin. Ein eingetragener Google-Weather-Schlüssel bleibt nur auf dem eigenen Gerät.
- **Kosten:** GitHub Pages und der APK-Bau sind für öffentliche Repositories kostenlos.
- **Modus „eingebaut“:** Unter Actions → „APK bauen“ → Run workflow lässt sich `eingebaut` wählen. Dann steckt die Oberfläche in der App selbst (nötig für Play Store/App Store). Updates erfordern dann eine neue App-Version.
- **Eigene Domain später:** Repository-Variable `APP_URL` (Settings → Secrets and variables → Actions → Variables) auf z. B. `https://andisgreened.de/` setzen, dann zeigt die App dorthin.
