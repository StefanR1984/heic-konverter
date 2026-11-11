## HEIC Konverter für macOS und Windows

Wandelt HEIC-/HEIF-Fotos in **JPG, PNG, WebP, AVIF und TIFF** um – per Drag & Drop, im Stapel, komplett lokal und ohne Upload.

### Download (macOS)

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

---

### Download (Windows)

| Variante | Datei |
| --- | --- |
| Installer (Startmenü, Desktop-Verknüpfung, „Öffnen mit“) | `HEIC-Konverter-Setup-<Version>-x64.exe` |
| Portable (eine Datei, keine Installation) | `HEIC-Konverter-Portable-<Version>-x64.exe` |

Voraussetzung: Windows 10 oder 11, 64 Bit. Es werden keine Administratorrechte und keine zusätzlichen HEIF-Erweiterungen benötigt.

### Erster Start unter Windows

Die App ist **nicht signiert**. Windows zeigt deshalb beim ersten Start die SmartScreen-Warnung „Der Computer wurde durch Windows geschützt“ – das ist normal und kein Fehler.

1. Auf **Weitere Informationen** klicken.
2. Auf **Trotzdem ausführen** klicken.

Ausführliche Anleitung: [ANLEITUNG-WINDOWS.txt](https://github.com/StefanR1984/heic-konverter/blob/main/ANLEITUNG-WINDOWS.txt) – liegt auch im Installationsordner bei.
