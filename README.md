# HEIC Konverter

Eine kleine Desktop-App (Electron) für macOS, die **HEIC-/HEIF-Fotos in JPG, PNG, WebP, AVIF und TIFF** umwandelt – per Drag & Drop, in Stapeln, ohne Upload und ohne Cloud.

Unter Windows und Linux ebenfalls lauffähig.
![HEIC Konverter](docs/screenshot.png)

---

## Download (macOS)

Fertige DMGs liegen unter **[Releases](https://github.com/StefanR1984/heic-konverter/releases)**:

| Mac | Datei |
| --- | --- |
| Apple Silicon (M1–M4) | `HEIC-Konverter-<Version>-arm64.dmg` |
| Intel | `HEIC-Konverter-<Version>-x64.dmg` |

Die App ist nicht notarisiert, deshalb warnt macOS beim ersten Start. Die nötigen Schritte stehen in **[ANLEITUNG-MAC.txt](ANLEITUNG-MAC.txt)** (liegt auch im DMG bei).

---

## Funktionen

- **Drag & Drop** von Dateien und ganzen Ordnern (Ordner werden rekursiv durchsucht)
- **„Öffnen mit“** aus dem Finder sowie Start mit Dateipfaden als Argument
- **Stapelkonvertierung** mit Fortschrittsanzeige und Abbrechen
- **Zielformate:** JPG, PNG, WebP, AVIF, TIFF
- **Qualitätsregler** für JPG, WebP und AVIF (PNG/TIFF sind verlustfrei)
- **Skalierung** auf max. 4096 / 2048 / 1600 / 1024 px (oder Originalgröße)
- **Zielordner** frei wählbar oder neben dem Original speichern
- **Kollisionsschutz:** vorhandene Dateien werden nie überschrieben (`Foto (1).jpg`)
- **Im Finder zeigen** pro Datei und für das Gesamtergebnis
- Alles läuft lokal auf dem Rechner

## Technik in Kurzform

| Schritt | macOS | Windows / Linux |
| --- | --- | --- |
| HEIC dekodieren | natives `sips` (ImageIO, sehr schnell) | `heic-decode` (libheif als WebAssembly) |
| Bilder kodieren | `sharp` (libvips) | `sharp` (libvips) |

Die Konvertierung läuft in einem **Worker-Thread**, damit die Oberfläche flüssig bleibt. Schlägt `sips` fehl (z. B. bei exotischen HEIF-Varianten), wird automatisch der WASM-Decoder verwendet.

---

## Entwicklung

Voraussetzungen: **Node.js 22.12+** und npm (Electron 45 setzt das für die Installation voraus).

```bash
npm install
npm start          # App starten
npm run dev        # mit DevTools
```

Unter Windows kannst du danach auch einfach **`HEIC Konverter starten.cmd`** doppelklicken – das öffnet die App ohne Terminal.

### Konverter-Logik testen

```bash
npm run test:convert -- /pfad/zu/foto.heic
```

Das Skript wandelt die Testdatei in alle Formate um, prüft die Ergebnisse mit `sharp` und legt sie in `test-output/` ab. (Liegt eine Datei unter `samples/example.heic`, genügt `npm run test:convert`.)

### Kommandozeile (ohne GUI)

```bash
node scripts/cli.js ~/Pictures/Urlaub --format webp --quality 82 --out ~/Desktop/export
```

Optionen: `--format jpg|png|webp|avif|tiff`, `--quality 1-100`, `--max-size <px>`, `--out <ordner>`.

---

### Erster Start (Gatekeeper)

Die App ist **ad-hoc signiert**, aber nicht notarisiert. Beim ersten Start aus dem Internet blockiert Gatekeeper sie deshalb. So lässt sie sich öffnen:

1. App nach **Programme** ziehen und doppelklicken (die Warnung erscheint).
2. **Systemeinstellungen → Datenschutz & Sicherheit** → unten bei „HEIC Konverter wurde blockiert“ auf **Trotzdem öffnen** klicken.

Alternativ einmalig im Terminal:

```bash
xattr -dr com.apple.quarantine "/Applications/HEIC Konverter.app"
```

Diese Anleitung liegt auch als **[ANLEITUNG-MAC.txt](ANLEITUNG-MAC.txt)** im Projekt und direkt im DMG-Fenster bei.

Für Weitergabe an viele Leute: mit Developer-ID signieren und notarizieren (siehe electron-builder-Doku, `CSC_LINK` / `APPLE_ID`).

### Troubleshooting

- **„Electron failed to install correctly“** beim Start: Die Electron-Binary wurde nicht heruntergeladen (passiert mit Node < 22.12). Einmalig nachholen:

  ```bash
  npx -y node@22 node_modules/electron/install.js
  ```

- **„App ist beschädigt“** auf macOS: meist nur die Quarantäne-Markierung, siehe oben (`xattr -dr …`).
- **`sharp`-Fehler nach Architekturwechsel:** `node_modules` löschen und auf der Zielarchitektur neu installieren.

### Windows/Linux (optional)

```bash
npm run dist:win
```

---

## Projektstruktur

```
src/
  main.js                 Electron-Hauptprozess, Dateidialoge, Worker-Steuerung
  preload.js              sichere IPC-Brücke (contextIsolation)
  converter-worker.js     Konvertierungs-Queue im Worker-Thread
  lib/
    heic.js               HEIC-Decoder (sips + libheif-Fallback)
    convert.js            Bildverarbeitung mit sharp
  renderer/
    index.html            Oberfläche
    styles.css            Styling
    app.js                UI-Logik
scripts/
  cli.js                  Kommandozeilen-Variante
  test-convert.js         Automatischer Format-Test
  make-icon.js            App-Icon generieren
samples/                  Testdatei
```

---

## Hinweise & Grenzen

- **Metadaten:** EXIF-/GPS-Daten werden nicht übernommen – die Ausgabe enthält nur die Bilddaten.
- **Live Photos:** Es wird nur das Standbild konvertiert, nicht das Videoteil.
- **Mehrbild-HEIC:** Es wird das primäre Bild verwendet.
- **Alpha-Transparenz** bleibt bei PNG, WebP, AVIF und TIFF erhalten; JPG bekommt einen weißen Hintergrund.
- **AVIF** ist das langsamste Format (einige Sekunden pro Bild), dafür sehr kleine Dateien.
- **HEIC-Ausgabe** ist bewusst nicht enthalten – die App konvertiert nur *von* HEIC *zu* gängigen Formaten.

## Lizenz

MIT
