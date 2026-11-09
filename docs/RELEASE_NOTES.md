## HEIC Konverter für macOS

Wandelt HEIC-/HEIF-Fotos in **JPG, PNG, WebP, AVIF und TIFF** um – per Drag & Drop, im Stapel, komplett lokal und ohne Upload.

### Download

| Mac | Datei |
| --- | --- |
| Apple Silicon (M1–M4) | `HEIC-Konverter-<Version>-arm64.dmg` |
| Intel | `HEIC-Konverter-<Version>-x64.dmg` |

Welcher Mac? **Apfel-Menü → „Über diesen Mac“**: „Chip“ = Apple Silicon, „Prozessor“ = Intel.

### Erster Start (wichtig)

Die App ist **nicht mit einem Apple-Entwicklerzertifikat signiert**. macOS warnt deshalb beim ersten Start – das ist normal und kein Fehler.

1. DMG öffnen und **HEIC Konverter** nach **Programme** ziehen.
2. App doppelklicken → Warnung mit **OK** bestätigen (nicht in den Papierkorb legen).
3. **Systemeinstellungen → Datenschutz & Sicherheit** öffnen, nach unten scrollen und bei „HEIC Konverter“ auf **Trotzdem öffnen** klicken.
4. Mit Passwort oder Touch ID bestätigen.

Erscheint der Knopf nicht, hilft einmalig im Terminal:

```bash
xattr -dr com.apple.quarantine "/Applications/HEIC Konverter.app"
```

Ausführliche Anleitung: [ANLEITUNG-MAC.txt](https://github.com/StefanR1984/heic-konverter/blob/main/ANLEITUNG-MAC.txt) – liegt auch direkt im DMG bei.

### Voraussetzungen

macOS 13 (Ventura) oder neuer, Apple Silicon oder Intel.
