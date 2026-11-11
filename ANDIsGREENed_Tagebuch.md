# ANDIsGREENed – Tagebuch

Änderungsprotokoll der App. Versionierung: **Major.Minor.Patch**
(Patch = Fehlerbehebung/Kleinigkeit, Minor = neue Funktion, Major = größerer Umbau).
Aktuelle Version: **5.9.0** (Verteilpaket `ANDIsGREENed_Verteilpaket_5.5.0.zip`, Repository `andisgreened/andisgreened.github.io`)

---

## 5.9.0
- **Spotkarte:** „Bester Wind“ entfällt (steht in der Stundenleiste). Kästen: Wind (Farbverlauf wie die Stundenleiste, von schwächster zu stärkster Stunde) · **Bestes Fenster** (gleiches Fenster wie in der Stundenleiste hervorgehoben, weitere Fenster klein „auch …“) · Welle · Ø Wind und Welle. Die separate Zeile mit Zeitfenstern entfällt.
- **Windrose unter den Punkten:** 16 Sektoren, passende Richtungen hellgrün, beste kräftig grün, Wellenstern gelb, Wind im besten Fenster als roter Strich bzw. rotes Tortenstück, wenn er dreht.
- **Region einzeilig:** abgekürzt (z. B. „Meckl. Ostseeküste“, Länderzusätze als „(NL)“, „(DK)“), sonst mit „…“.
- **Stern mit Freitext:** Im Richtungs-Editor erscheint bei gesetztem Stern ein Textfeld (z. B. „beste Welle bei WNW“).
- **Suchen:** Knopf heißt „Suchen“, „Hinweise & Datenquellen“ klappt beim Suchen zu, Hinweis „Bedingungen einstellen und vergleichen“ entfällt.
- **Hinweise & Datenquellen aufgeräumt:** einklappbar: Relevante Windmodelle (mit Google-Schlüssel, nur wenn Google angehakt), Windfinder-App, Eigene Spots, Webcam, Spots sichern, Änderungen verteilen, Datenquellen und Infos. Bereich „Wellenstern einem Spot hinzufügen“ entfällt (auf der Karte bearbeitbar). Google wird nur abgefragt, wenn als relevantes Modell angehakt. Ganz unten eine Zeile: Version · Datenschutz · Wetterdaten Open-Meteo (CC BY 4.0, Namensnennung nötig), DWD/Bright Sky.

## 5.8.1
- Zählzeile kurz und einzeilig: „36 von 76 Spots passen“.
- Eingeklappter Datenstand zeigt nur noch „▸ Datenstand 12:20 ⚠“; die Warnungen stehen beim Aufklappen.
- Google-Limit (HTTP 429) wurde fälschlich als „Open-Meteo-Limit“ gemeldet, jetzt „Google-Abfragelimit erreicht“.

## 5.8.0
- **Richtungen direkt auf der Karte bearbeiten (Dev-Modus):** „Bearbeiten“ zeigt alle 16 Richtungen. Tippen schaltet reihum: möglich → beste → aus → möglich. Es gibt genau eine beste Richtung (Hauptwindrichtung); wird eine andere „beste“, wird die bisherige „möglich“. Mindestens eine Richtung bleibt.
- **Stern:** Knopf „★ Stern setzen“, dann tippen setzt/entfernt den Stern auf zusammenhängenden Richtungen (wird als Wellenstern gespeichert). Sternrichtungen stehen in der Anzeige vorne (★ONO, …).
- **Ranking:** Stunden mit Windrichtung im Stern-Bereich zählen zusätzlich ×2 (zusätzlich zur Hauptwindrichtung).
- **Verteilen:** Dev-Bereich „Spot-Änderungen an alle verteilen“: GitHub-Schlüssel (fine-grained, nur Contents dieses Repositorys) eintragen, „Änderungen ins Repository speichern“ schreibt `docs/spot-updates.json`. Alle anderen sehen beim Öffnen „Neue Spot-Änderungen (n) … Übernehmen / Ablehnen“. Abgelehnte Änderungen werden nicht erneut gefragt; eigene unveröffentlichte Änderungen werden nicht überschrieben.
- Service Worker lädt `spot-updates.json` immer frisch.
- Getestet im Browser (simulierte Wetterdaten und simulierte GitHub-Schnittstelle): Bearbeiten, Stern, Speichern mit Schlüssel, Nachfrage bei einem zweiten Nutzer, Übernehmen, keine erneute Nachfrage.

## 5.7.2
- Fehler behoben: Der Service Worker lieferte für jede Seite unter der Adresse die App aus, auch für `datenschutz.html` und `robots.txt`. Jetzt nur noch für die Startseite; andere Seiten kommen aus dem Netz (offline aus dem Speicher).

## 5.7.1
- **Kein Store, nur Weitergabe per Link an Bekannte** (Entscheidung 11.11.2026). Store-Anmeldungen entfallen.
- **Android-App wieder im Modus „online“:** lädt die Oberfläche von https://andisgreened.github.io/, Updates ohne neue APK. Gespeicherte Daten bleiben erhalten (gleiche Herkunft wie 5.7.0). Versionsnummer online = eingebaut + 1 (5.7.1 → 60507011), installiert sich über 5.7.0. APK-Bau nur noch bei Änderungen in `apk/`.
- **Nicht in Suchmaschinen:** `robots.txt` (alles gesperrt) und `noindex` in App- und Datenschutzseite; Quellcode-Link aus der App entfernt. Hinweis: Das Repository ist für GitHub Pages öffentlich; wer die Adresse kennt, kann die App öffnen.
- Bleibt bestehen: MIT-Lizenz, Datenschutzseite, neutrale Spotliste, Store-Texte in `fastlane/` (ungenutzt, für später).

## 5.7.0
- **Weg in freie App-Kataloge (kostenlos):** IzzyOnDroid (Android, F-Droid-kompatibel) und Murena App Lounge (PWA-Katalog). Google Play (25 $) und Apple vorerst nicht.
- **MIT-Lizenz** (`LICENSE`), Quellcode- und Datenschutz-Link in „Hinweise & Datenquellen“, neue Seite `datenschutz.html` (keine Konten, keine Werbung, kein Tracking).
- **Android-App enthält die Oberfläche jetzt selbst** (Modus „eingebaut“, Vorgabe von IzzyOnDroid: keine reine Webseiten-Hülle). Gleicher Hostname wie die Web-Adresse, daher bleiben gespeicherte Spots und Einstellungen beim Wechsel erhalten. Folge: Änderungen an der Oberfläche brauchen jetzt eine neue APK. Das passiert automatisch: Jede neue `APP_VERSION` erzeugt ein Release `v<Version>` mit `ANDIsGREENed-<Version>.apk` (für IzzyOnDroid) und aktualisiert `apk-latest`. Versionsnummer der APK: 60000000 + Version (5.7.0 → 60507000).
- APK ohne verschlüsselte Google-Abhängigkeitsdaten im Signaturblock (IzzyOnDroid-Vorgabe).
- **Spotliste neutral:** Hinweis „anhand der Daily-Dose-Spotcharakter-Angabe geprüft“ entfernt („Richtungen geprüft/vorläufig“), Link heißt „Spotguide ↗“. Alle Spots, Richtungen, Links und Angaben bleiben erhalten.
- **Store-Texte und Bilder** unter `fastlane/metadata/android/` (Deutsch, Englisch): Titel, Kurz- und Langbeschreibung, Icon, Grafik 1024×500, Änderungstext. Bildschirmfotos fehlen noch.

## 5.6.2
- Kopfzeile: Logo ohne weißen Hintergrund (transparent, `icons/logo.png`).
- Tag-Anzeige („Heute · Mi 11.11.“) immer einzeilig, Schrift passt sich der Breite an.

## 5.6.1
- **Neues Icon (Variante B):** SurfsApp-Logo umgefärbt, Segel grün, Board orange, Welle türkis wie bei der SurfsApp. Weißer Hintergrund mit Rand, damit Android nichts abschneidet und das Logo nicht zu groß wirkt. Gilt für Web-App (Startbildschirm, Kopfzeile, Maskable) und Android-App (Symbol rund/eckig/adaptiv, Startbild). Android-App wird neu gebaut (Version 5.6.1).
- Statuszeile: leeres „Tageslicht“ wird ausgeblendet.

## 5.6.0
- **Kopfzeile kompakt:** App-Symbol statt 🌊, Name einzeilig und kleiner (auf dem Handy brach „ANDIsGREENed 🌊“ in zwei Zeilen um).
- **Texte:** „Uhrzeit“ ohne Zusatz; „Zwischenspeicher“ heißt jetzt „Speicher“ (Knopf „Neu laden (Speicher leeren)“, Status „aus Speicher“).
- **Datenstand eingeklappt:** Sichtbar ist nur „▸ Datenstand hh:mm“. Gibt es Warnungen (⚠), stehen sie gelb direkt dahinter. Antippen zeigt Modellläufe, Tageslicht usw.
- **Warnungen konkret statt „Zusatzquellen teils nicht verfügbar“:** z. B. „⚠ Google ohne Daten für 69 Spots (HTTP 403: …)“ mit der Fehlermeldung von Google. Ohne Google-Schlüssel erscheint Google gar nicht mehr in der Statuszeile.
- Getestet im Browser (Handy-Ansicht, simulierte Daten und simulierter Google-Fehler 403): keine Skriptfehler, Kopfzeile einzeilig, Ein-/Ausklappen funktioniert.

## 5.5.0
- **Prüfung von 5.4.0** (Befunde, Grundlage dieser Version): Update-Hinweis beim Start der geschlossenen App nur in etwa der Hälfte der Fälle (8 von 16); Updates kamen nur bei geänderter `sw.js` an; APK-Hülle: Windfinder-Knopf, „Meinen Standort verwenden“ und „Als Datei speichern“ ohne Funktion, Standard-Symbol von Capacitor, Debug-Signatur.
- **Update-Hinweis zuverlässig:** Die Seite fragt den Service Worker, welche Version er zwischengespeichert hat. Bei jedem Start wird `index.html` im Hintergrund neu geladen. Getestet: offene App, Kaltstart nur mit neuer `index.html` (6/6) und Kaltstart mit neuem Service Worker (12/12), jeweils Hinweis und danach neue Version; kein Fehlalarm ohne Update.
- **Updates ohne `sw.js`:** Eine neue `index.html` genügt. Der Hinweis erscheint, wenn sich `APP_VERSION` ändert.
- **Härtung Service Worker:** WLAN-Anmeldeseiten (Hotel, Bahn) überschreiben die gespeicherte App nicht mehr (getestet); fehlgeschlagene Installation lässt die alte Version aktiv; Maskable-Icon wird mitgespeichert; nur der eigene Zwischenspeicher wird verwendet.
- **Android-App neu (Capacitor 8.5, Android 16 / API 36, Play-Store-tauglich):** eigenes Plugin für Windfinder-App (intent-Links), „Als Datei speichern“ (Speicherort wählbar) und „Teilen“; Standortberechtigung; ANDIsGREENed-Symbol und dunkles Startbild; Seite „Keine Internetverbindung“ mit automatischem Neustart; Versionsanzeige mit Build-Nummer; feste Signatur über GitHub-Secrets (Updates installieren sich über die alte Version); zusätzlich AAB für den Play Store; Modus „eingebaut“ (Oberfläche in der App) für App-Stores.
- **Neu in der Web-App:** Knopf „Teilen (z. B. per Messenger)“ für Spotlisten (Datei, sonst Text); genauere Standort-Fehlermeldungen (verweigert / kein Signal / App-Einstellungen); Favicon, iPhone-Startbildschirm-Titel.
- **Verteilung:** GitHub-Konto `andisgreened`, Repository `andisgreened.github.io`, App unter https://andisgreened.github.io/ (ohne Unterordner).
- **Live seit 10.11.2026:** https://andisgreened.github.io/ (GitHub-Konto `AndiSGreenED`). Live-Test mit echten Daten: 10 passende Spots in 5,5 s, alle Modellläufe erkannt (ICON, ICON-D2, GFS, ECMWF, DMI), Service Worker aktiv.
- **APK gebaut** (GitHub Actions, erster Lauf erfolgreich, Build 50500001): fest signiert mit dem eigenen Schlüssel (Zertifikat im Signaturblock geprüft), Standortberechtigungen, Plugin `AndisNative` enthalten, Adresse https://andisgreened.github.io/ und Offline-Seite korrekt eingetragen. Download: Releases → `apk-latest` (`ANDIsGREENed.apk`, zusätzlich `ANDIsGREENed.aab`). Noch nicht auf einem echten Handy getestet.
- Getestet im Browser (Chromium, Handy-Ansicht, simulierte Wetterdaten): Start, 31 Karten, Installierbarkeit, Offline-Start, Updates, Datenerhalt, App-Modus mit nachgebildeten nativen Funktionen. Nicht lokal testbar: APK-Bau (läuft auf GitHub) und echtes Android-Gerät.

## 5.4.0
- **Verteilung an Freunde ohne Anmeldung:** Verteilpaket mit Hosting-Ordner `docs/` (GitHub Pages: ein Konto nur für den Betreiber, die Freunde brauchen keins), APK-Hülle `apk/` und GitHub-Workflow, der den APK baut und als Download (Release `apk-latest`) bereitstellt. Die APK-App lädt ihre Oberfläche von der gehosteten Seite, Updates kommen dadurch automatisch.
- **Updates:** Der Service Worker erkennt eine neue Version (Versionsnummer in `sw.js`), lädt sie im Hintergrund und zeigt „Neue Version verfügbar – tippen zum Neuladen“. Einstellungen, eigene Spots, Webcams, Wellensterne und Modellwahl bleiben erhalten. Zukünftige Updates kommen als `ANDIsGREENed_Update_x.y.z.zip` (Dateien in `docs/` ersetzen).
- **Versionsanzeige** unter „Hinweise & Datenquellen“ („Version 5.4.0 · als App installiert“).
- Getestet im Browser: Installation, Offline-Start, Update von 5.4.0 auf 5.4.1 mit Hinweis und erhaltenen Einstellungen. Nicht getestet: GitHub-Einrichtung, APK-Bau, Geräte der Freunde.
- Die Einzeldateien für PWA und APK-Bauset aus 5.3.0 sind im Verteilpaket aufgegangen.

## 5.3.0
- **Modellauswahl je Spot (Dev-Modus):** Die Modell-Schalter auf der Karte wirken jetzt nur noch für den jeweiligen Spot (vorher für alle Spots). Mindestens ein Modell muss aktiv bleiben. Weicht die Wahl von der Standardauswahl ab, erscheint auf der Karte „↺ Standardmodelle“. Die globale Standardauswahl (Einstellungen) bleibt bestehen und gilt für alle Spots ohne eigene Wahl. Die Sortierung berücksichtigt die Modellwahl je Spot.
- **Export/Import:** Die Modellwahl je Spot (`models`) ist im Export enthalten und wird beim Import (mit Häkchen „Vorhandene Spots aktualisieren“) übernommen, auch für neu angelegte Spots. Rückmeldung z. B. „Modellwahl für 1 Spot übernommen“.
- **Wellenstern im Dev-Modus einem Spot hinzufügen:** Neuer Bereich „Wellenstern einem Spot hinzufügen“: Spot wählen, Bezeichnung (Standard „Beste Welle“), Himmelsrichtung wählen (setzt Von/Bis automatisch ±11,25°) oder Von-/Bis-Grad von Hand eintragen, speichern oder entfernen. Die Karte zeigt danach „★ Beste Welle · <Richtung>“, wenn eine Stunde passt. Gilt für Standard- und eigene Spots, bleibt nach Neuladen erhalten und ist im Export/Import enthalten.
- Installierbare App (PWA) und APK-Bauset auf 5.3.0 aktualisiert.

## 5.2.0
- **Export/Import erweitert (Format 2):** Zusätzlich zu Name, Region, Koordinaten, Richtungen, Hauptrichtung, Windfinder-/Daily-Dose-Link und Webcam jetzt auch **Wellenstern** (Richtungsbereich „Beste Welle“), **Typ** und die **aktive Modellauswahl** (ICON, GFS, ECMWF, … als Gesamteinstellung). Beim Import mit Häkchen „Vorhandene Spots aktualisieren“ werden sie übernommen, bei Standard-Spots als gespeicherte Änderung (bleibt nach Neuladen), bei neuen Spots direkt. Ungültige Wellensterne werden ignoriert. Ältere Exporte (Format 1) bleiben importierbar.
- Hinweis: Eine Modellauswahl je einzelnem Spot gibt es in der App nicht, die Auswahl gilt gesamt. Als „spezielle Modelle je Spot“ wurden daher Wellenstern und Typ behandelt.
- **Auslieferung:** installierbare App (PWA, mit Service Worker, Icons, Offline-Oberfläche) und APK-Bauset (Capacitor + GitHub-Workflow). Ein fertiger APK konnte nicht kompiliert werden (kein Android-SDK, kein Netzwerk in der Entwicklungsumgebung).

## 5.1.0 (Basis: hochgeladene 5.0.4)
- **Webcam-Anbindung ersetzt:** Der alte Link `windy.com/webcams/<Breite>/<Länge>` war ungültig. Windy-Webcam-Seiten werden über eine Kamera-ID angesprochen, nicht über Koordinaten. Das Webcam-Symbol auf der Karte führt jetzt zu einem eigenen Webcam-Link des Spots, sonst zu einer Google-Suche „<Spot> <Region> Webcam live“ (ergibt nie einen toten Link).
- **Eigene Webcam je Spot (Dev-Modus):** Im Bereich „Eigene Spots“ gibt es „Webcam-Link einem Spot zuordnen“ (Spot aus der Liste wählen, https-Link eintragen, speichern oder entfernen). Spots mit eigenem Link zeigen das Symbol grün. Nur https-Links werden akzeptiert.
- Webcam-Links sind in Export/Import (Feld `cam`) enthalten und bleiben nach Neuladen erhalten.
- Hinweis: Die Versionen 4.x bis 5.0.4 wurden nicht von mir erstellt und hier nicht im Einzelnen dokumentiert.

## 3.6.3
- **Alle Spots zugelassen:** Die Schutzregel aus 3.6.2 ist entfernt. Auch Spots mit nicht unabhängig geprüften Richtungen (und eigene Spots) erscheinen bei aktivem Richtungsfilter, sofern ihre eingetragene Richtung passt. Texte und Banner entsprechend angepasst („vorläufig, aber berücksichtigt“). Abweichungen werden vom Nutzer selbst korrigiert (Dev-Modus).
- Titel zeigt die richtige Version.
- Statuszeile meldet ausgefallene Modelle („⚠ Modelle fehlen: ECMWF“).
- Leerhinweis bei Totalausfall lautet „Keine Daten geladen …“ statt der Filter-Meldung.
- Modelllauf-Anzeige: Zeiten in der Zukunft (falsche Geräteuhr) werden ignoriert, Wartezeit auf 10 min begrenzt.
- Netzwerkfehler und Zeitüberschreitungen werden einmal nach 2 s wiederholt (429 weiter bis zu drei Versuche).
- Ortssuche: Bei genau einem Treffer wird der Standort direkt gesetzt.
- Nachtest im echten Browser plus unabhängige Zweitprüfung: 1.644 Karten, 0 harte Abweichungen (siehe Prüfbericht).

## 3.6.2 (Richtungen abgesichert, vom Nutzer geliefert)
- Schutzregel: Spots ohne geprüfte Richtungen werden bei aktivem Richtungsfilter ausgeschlossen (nie eine Empfehlung auf Basis unbekannter Richtungen). Nur 5 Spots gelten als geprüft (Altenteil, Bojendorf, Gold, Heiligenhafen, Grömitz), vorher 253.
- Hinweisbanner zur Richtungsprüfung, angepasste Texte auf der Karte („Richtungen nicht unabhängig geprüft“).
- **Prüfung durchgeführt** (Details: `ANDIsGREENed_3.6.2_Pruefbericht.md`): keine JS-Fehler, Tageslicht inkl. Zeitumstellung korrekt, Zwischenspeicher, Rate-Limit-Wiederholung, Export/Import in Ordnung.
- Befunde: eigene Spots erscheinen bei aktivem Richtungsfilter nie; Titel meldet noch „3.6.1“; ausgefallene Einzelmodelle werden nicht gemeldet; irreführender Leerhinweis bei Totalausfall; Modelllauf-Anzeige bei falscher Geräteuhr.

## 3.6.1
- **Rückmeldung sichtbar:** Die Meldung der Spot-Suche stand weit unten im Formular, deshalb wirkte es, als passiere nichts. Sie steht jetzt direkt unter dem Suchbutton, größer und farbig.
- **Link einfügen startet die Suche sofort:** Beim Einfügen eines Google-Maps-Links oder von Koordinaten läuft die Auswertung automatisch, ohne Button. Adressen werden weiter erst per Button gesucht.
- Kurzlink-Hinweis nennt drei konkrete Auswege.
- Befund zu Kurzlinks: Ob ein aufgelöster Link Koordinaten enthält, hängt vom Link ab. Beispiel „Strand Brodau“ enthält sie (54.10256, 10.89990), eine Straßenadresse nicht. Automatisches Auflösen im Browser ist weiterhin nicht möglich.

## 3.6.0
- **Eigene Spots: eigenes Suchfeld für Adresse, Ort, Google-Maps-Link oder Koordinaten** (vorher nur im Namensfeld versteckt). Darunter ein großer Button „Suchen und Koordinaten eintragen“; auch die Enter-Taste startet die Suche.
- **Treffer zur Auswahl:** OpenStreetMap (Straßen, Adressen) und Open-Meteo (Orte) werden parallel abgefragt, doppelte Treffer zusammengefasst, bis zu sechs Treffer zum Antippen. Bei genau einem Treffer wird direkt übernommen. Region und, wenn leer, Name werden mitgefüllt.
- Fehler je Quelle werden angezeigt statt stillschweigend zu scheitern.
- Behoben: Das Link-Feld löste beim Verlassen von selbst aus und leerte sich, bevor der Button greifen konnte.
- Reihenfolge im Formular: Name, Region, Suche, Koordinaten, Richtungen.

## 3.5.0
- **Namenssuche mit Rückfall auf OpenStreetMap (Nominatim):** Findet die Open-Meteo-Ortssuche nichts (z. B. bei Straßen oder Adressen wie „Brodauer Str., Schashagen-Bliesdorf“), fragt „Koordinaten suchen“ OpenStreetMap ab. Ergebnis mit Hinweis, dass der Punkt bei Straßen einige hundert Meter abweichen kann.
- **Google-Kurzlinks (`maps.app.goo.gl/…`) bleiben technisch nicht auswertbar:** Der Browser darf sie nicht auflösen. Zusätzlich enthält die aufgelöste Seite oft keine Koordinaten, nur den Ortsnamen (am Beispiel eines Kurzlinks geprüft: Ergebnis war nur „Brodauer Str., Schashagen-Bliesdorf“). Die Hinweistexte erklären jetzt den Ausweg: Adresse ins Namensfeld oder Koordinaten per langem Tippen in Google Maps kopieren.

## 3.4.1
- **Button „Koordinaten suchen (Link oder Name)“:** Prüft zuerst das Feld für den Google-Maps-Link, dann ein im Namensfeld eingefügtes Link/Koordinaten, erst danach wird der Name gesucht. Gefundene Werte landen in den Feldern Breite, Länge und (wenn leer) Name.
- Windfinder-Weblinks im Feld „Windfinder-Name“ werden automatisch auf den Namen gekürzt (z. B. `…/forecast/kaegsdorf` → `kaegsdorf`).
- Hinweis, wenn nach dem Link noch der Name fehlt.

## 3.4.0
- **Google-Maps-Link wird unterstützt (neue Funktion):** Beim Anlegen eigener Spots (Dev-Modus) gibt es ein Feld „Google-Maps-Link oder Koordinaten einfügen“. Es füllt Breite und Länge und, wenn leer, den Namen aus dem Link.
- Dasselbe funktioniert im Feld „Ort suchen“ für den Standort: Link oder Koordinaten einfügen, der Standort wird sofort gesetzt.
- Erkannt werden `…/@lat,lon,15z`, `…/place/Name/@…!3d…!4d…` (genauer Ortspunkt), `?q=`, `?ll=`, `?query=`, `geo:` und reine Koordinaten.
- Grenze: Kurzlinks (`maps.app.goo.gl`, `goo.gl/maps`) lassen sich im Browser nicht auflösen. Dann die lange Adresse aus Google Maps kopieren oder lange auf den Punkt tippen und die Koordinaten übernehmen.

## 3.3.0
- **Gesamt-Export und -Import aller Spots (neue Funktion, Dev-Modus):** Unter *Hinweise & Datenquellen* → „Spots sichern und übertragen“. Export wahlweise „Alle Spots (inkl. deiner Änderungen)“ oder „Nur eigene Spots“, als Text oder als Datei (`ANDIsGREENed_Spots_<Datum>.json`). Import als Text oder per „Datei laden“.
- Enthalten sind Name, Region, Koordinaten, passende Richtungen, Hauptwindrichtung, Windfinder- und Daily-Dose-Link, Typ, Prüfstatus.
- **Zusammenführen statt Überschreiben:** Unbekannte Spots werden als eigene Spots angelegt. Bei vorhandenen Spots (Name als Schlüssel) werden mit dem Häkchen „Vorhandene Spots aktualisieren“ Richtungen, Hauptrichtung, Region, Koordinaten und Windfinder-Link übernommen. Änderungen an Standard-Spots werden getrennt gespeichert und bleiben erhalten. Rückmeldung z. B. „1 neu, 1 aktualisiert, 1 unverändert“.
- Grenze: Es gibt keinen automatischen Abgleich zwischen Geräten. Der Austausch läuft über Datei oder Text. Gelöschte Spots werden beim Import nicht entfernt.

## 3.2.0
- **Tageslicht selbst berechnet (Fehlerbehebung):** Sonnenauf- und -untergang werden aus Breite, Länge und Datum berechnet (Genauigkeit etwa ±2 Minuten) und gegen die tatsächliche Uhrzeit jeder Stunde geprüft. Dadurch stimmt das Tageslichtfenster auch am Tag der Zeitumstellung (25.10.: 07:01–17:00 MEZ statt Sommerzeitwerte). Eine Stunde zählt ab 15 Minuten Tageslicht. Polartag und Polarnacht werden berücksichtigt.
- **Eigene Spots im Dev-Modus (neue Funktion):** Unter *Hinweise & Datenquellen* erscheint bei aktivem Dev-Kästchen der Bereich „Eigene Spots hinzufügen“: Name, Region, Koordinaten (optional per Namenssuche), passende Windrichtungen zum Antippen, Hauptwindrichtung, optionaler Windfinder-Name.
- Eigene Spots werden im Browser gespeichert, lassen sich einzeln löschen und über ein Textfeld exportieren bzw. importieren (JSON), z. B. zum Sichern oder für ein anderes Gerät.
- Eigene Spots erscheinen als „vorläufig“ (nicht von Daily Dose geprüft).

## 3.1.3
- **Windfinder-App (Android):** Intent ohne Browser-Rückfall. Startet die App nicht, bleibt ANDIsGREENed unverändert offen (vorher wurde der Tab durch die Webseite überschrieben).
- Neue Auswahl „Windfinder-App (Android)“ unter *Hinweise & Datenquellen*: Play-Store-Version, alte Pro-Version, Automatisch. Wahl wird gemerkt.

## 3.1.2
- Windfinder-Paketname auf die Play-Store-Version (`com.studioeleven.windfinder`) geändert, Link ohne neuen Tab.
- „Spot-Windrichtungen berücksichtigen“ und „Ort suchen“ nach *Hinweise & Datenquellen* verschoben (unter das Dev-Kästchen).
- Legende „Stündlich · wischen ↔ · grün = passt“ unter die Stundenanzeige verschoben.
- „ab Standort“ aus der Karte entfernt (nur noch z. B. „46 km“).

## 3.1.1
- „Stärkster passender Wind“ umbenannt in „Bester Wind“.
- Dev-Kästchen nach *Hinweise & Datenquellen* verschoben.
- Waagerechten Balken auf der Karte entfernt.
- Link „Web-Forecast“ entfernt.
- Android-Erkennung für den Windfinder-Button funktioniert jetzt auch bei „Desktop-Website“ im Browser.

## 3.1.0
- **Neu:** Ortssuche über die Open-Meteo-Geocoding-API als Ersatz für GPS (funktioniert bei lokal geöffneter Datei). Auswahl wird mit Ortsname gemerkt.
- Fehlermeldung beim GPS-Button verweist auf die Ortssuche.
- Hintergrund: Browser erlauben GPS nur auf HTTPS-Seiten, nicht bei lokal geöffneten Dateien.

## 3.0.8
- „Faktor ×2 bei Treffer“ nur noch im Dev-Modus sichtbar.

## 3.0.7
- Button „Bearbeiten“ (Hauptwindrichtung) nur noch im Dev-Modus sichtbar.

## 3.0.6
- Windfinder-App-Button: Android-Intent wiederhergestellt, öffnet in neuem Fenster, ANDIsGREENed bleibt offen.

## 3.0.5
- **Zwischenspeicher repariert:** Er wurde bei jedem Lauf geleert und arbeitete je Abruf-Adresse. Jetzt je Standort und Modell, 10 Minuten gültig.
- Button „Neu laden (Zwischenspeicher leeren)“.
- Statuszeile zeigt „aus Zwischenspeicher“ bzw. „frisch geladen“ und den **Datenstand** (Alter der ältesten verwendeten Daten).
- Grenze: Speicher nur im Arbeitsspeicher, nach Neuladen der Seite leer.

## 3.0.4
- Karte oben rechts: nur noch Ranking-Punkte („12,3 Pkt“) statt „X von y h“.
- Zeile „Ranking-Score … gewichtete Stunden“ in die Details verschoben, doppelte Angaben entfernt.
- Windfinder-Link als normaler Link (später in 3.0.6 wieder als Intent).

## 3.0.3
- **Modelllauf-Anzeige repariert:** alte Abfrage `/v1/model-runs` ersetzt durch `meta.json` je Modell (Adresse nicht belegt, mehrere übliche Varianten werden probiert).
- Abfrage läuft parallel zum Wetterabruf und blockiert nie; Fehlschläge werden 30 Minuten nicht wiederholt, Erfolge 5 Minuten gemerkt.
- Statuszeile zeigt Läufe („ICON 12Z · GFS 06Z …“), markiert frische (< 10 min) und überfällige Läufe.
- Statt Wartezeit jetzt Hinweis „in ca. x min erneut laden“.

## 3.0.2
- Mehrere Wettermodelle (ICON, GFS, ECMWF) plus Zusatzquellen (ICON-D2, DMI-Harmonie, DWD/Bright Sky), Wellen über Open-Meteo Marine.
- Diagnose „Verbindungen prüfen“ mit Messzeiten.
- Ranking mit Wind-, Wellen- und Richtungsfaktor, Hauptwindrichtung ×2 bei mindestens 3 zusammenhängenden Stunden im selben Modell.

## 3.0.1
- Aktualität: Modelllauf ermitteln und Verteilungszeit von 10 Minuten berücksichtigen; Metadatenabfragen parallel mit Zeitlimit.
- Befund: Alle fünf Modelllaufprüfungen schlugen fehl (behoben in 3.0.3).

## 3.0.0
- API-Optimierung nach HTTP-429-Fehlern bei Open-Meteo: Anfragen bündeln, Daten zwischenspeichern, bei Rate-Limit mit Wartezeit erneut versuchen, verfügbare Modelle bei Teilausfällen erhalten.

---

## Vorgeschichte (vor 3.0.0, ohne Versionsnummer)
- Erste Datei gesichtet und geprüft: Wellendaten optional gemacht (Bewertung nur nach Wind, wenn keine Wellendaten), Zeitfenster statt Einzelstunde, Datum auf 8 Vorhersagetage begrenzt.
- Periode, Böen und Uhrzeitfilter entfernt, Bewertung nur bei Tageslicht (Sonnenauf-/untergang von Open-Meteo).
- Netzwerkfehler behoben: Abrufe gebündelt, `AbortSignal` entfernt (in eingebetteten Ansichten nicht übertragbar), Timeout per `Promise.race`.
- Spotliste erweitert: 85 Orte (Ostsee, Nordsee, Binnenseen, Dänemark) als Zusammenfassung der Daily-Dose-Liste mit geschätzten Koordinaten.
- Später eigene Spotliste mit 475 Einträgen geprüft: englische Richtungskürzel (E, NE, SE …) auf deutsche vereinheitlicht, Abruf in Blöcken zu 40, Zeitzone pro Spot, Entfernungsauswahl „Alle Spots“ korrigiert.
- Standard-Umkreis 100 km, Standort-Button und Ortseingabe, Stundenleiste und Diagnosezeile auf der Karte, Richtungsfilter abschaltbar.

---

## Offene Punkte
1. **„Passend“ = irgendein Modell reicht:** Bewertung optimistisch. Vorschlag: mindestens zwei Modelle oder Median, Anzeige „x von 7 Modellen“.
2. **Richtungslisten der Spots** (z. B. Kägsdorf nur SW, WSW, W): nicht verifiziert, bei Stammspots gegen Erfahrung prüfen.
3. **Windfinder-App im Opera-Browser (Android):** Übergabe per Intent noch nicht bestätigt; Test mit anderer App-Variante bzw. Chrome steht aus.
4. **Metadaten-Adresse (`meta.json`)** für Modelläufe nicht belegt, Funktion bei Fehlschlag nur eingeschränkt.

## Hinweis zur Prüfung
Geprüft wurden jeweils Syntax und Logik, teils mit simulierten Wetterdaten. Live-Abrufe gegen Open-Meteo, Windfinder-Übergabe und Standortfunktionen konnten im Entwicklungsumfeld nicht getestet werden.
