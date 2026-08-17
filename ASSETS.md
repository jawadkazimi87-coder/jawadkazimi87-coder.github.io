# Assets — was Sie hier ablegen müssen

Die Website erwartet die folgenden Dateien. **Alle Pfade sind bereits im Code verdrahtet** —
Sie müssen nur die Dateien mit exakt diesen Namen ablegen. Es wurden bewusst keine
Ersatzbilder generiert.

Solange eine Datei fehlt, greift ein sauberer Fallback (Farbverlauf statt Bild, statische
Story statt Video-Scrubbing). Die Seite bleibt also jederzeit funktionsfähig.

---

## 1. Hero-Video (zentrales Storytelling-Asset)

| Pfad | Zweck | Pflicht |
|---|---|---|
| `public/videos/hero-story.mp4` | Desktop/Laptop, H.264 | **ja** |
| `public/videos/hero-story-mobile.mp4` | Portrait/Mobile, kleinere Auflösung | empfohlen |
| `public/videos/hero-story.webm` | VP9-Alternative für Chrome/Firefox | optional |
| `public/images/hero-poster.jpg` | Erstes Frame, wird vor dem Laden gezeigt | **ja** |

### Wichtig: Encoding für flüssiges Scroll-Scrubbing

Ein normal encodiertes Video ruckelt beim Scrubben, weil der Browser bei jedem Sprung zum
nächsten Keyframe zurückspringen muss. Das Video braucht daher **sehr dichte Keyframes**.

```bash
# Desktop-Version (1920x1080, dichte Keyframes, ohne Ton)
ffmpeg -i original.mp4 \
  -an -vf "scale=1920:-2,fps=30" \
  -c:v libx264 -profile:v high -crf 23 \
  -g 6 -keyint_min 6 -sc_threshold 0 \
  -pix_fmt yuv420p -movflags +faststart \
  public/videos/hero-story.mp4

# Mobile-Version (720px breit, deutlich kleinere Datei)
ffmpeg -i original.mp4 \
  -an -vf "scale=720:-2,fps=30" \
  -c:v libx264 -profile:v main -crf 26 \
  -g 6 -keyint_min 6 -sc_threshold 0 \
  -pix_fmt yuv420p -movflags +faststart \
  public/videos/hero-story-mobile.mp4

# Poster aus dem ersten Frame
ffmpeg -i original.mp4 -vframes 1 -q:v 3 public/images/hero-poster.jpg
```

- `-g 6` = alle 6 Frames ein Keyframe. Das ist der entscheidende Parameter.
- `-an` entfernt die Tonspur (das Video läuft stumm, spart Größe).
- `-movflags +faststart` verschiebt den Index an den Dateianfang → schnellerer Start.
- **Zielgröße:** Desktop < 12 MB, Mobile < 4 MB. GitHub Pages hat ein weiches Limit von
  100 MB pro Datei, aber alles über ~15 MB kostet spürbar Ladezeit.

### Timing der Texte an das Video anpassen

Die Story-Texte sind an Fortschrittswerte von 0 bis 1 gekoppelt. Nach dem Einsetzen des
echten Videos die Werte in `index.html` justieren — jeder Textblock trägt sie direkt am
Element:

```html
<div class="beat" data-start="0.28" data-end="0.44"> … </div>
```

`data-start` = Fortschritt, ab dem der Text erscheint, `data-end` = ab dem er verschwindet.
Zum Kalibrieren `?debug=1` an die URL hängen: unten links wird dann der aktuelle
Fortschritt und die Videozeit live angezeigt.

---

## 2. Referenzbilder (Sektion „Arbeiten")

| Pfad | Empfohlen |
|---|---|
| `public/images/work/projekt-01.jpg` | 1600 × 1100 px, JPG oder WebP |
| `public/images/work/projekt-02.jpg` | 1600 × 1100 px |
| `public/images/work/projekt-03.jpg` | 1600 × 1100 px |

Die Projekt-Texte in `index.html` enthalten Platzhalter in eckigen Klammern
(z. B. `[Kundenname]`, `[Kennzahl]`). Diese bitte durch echte Angaben ersetzen —
es wurden bewusst keine erfundenen Fallzahlen eingetragen.

## 3. Porträt (Sektion „Über")

| Pfad | Empfohlen |
|---|---|
| `public/images/portrait-jawad.jpg` | 1200 × 1500 px, Hochformat |

## 4. Social-Media-Vorschaubild

| Pfad | Empfohlen |
|---|---|
| `public/images/og-cover.jpg` | 1200 × 630 px — erscheint beim Teilen des Links |

## 5. Icons

| Pfad | Hinweis |
|---|---|
| `public/icons/favicon.svg` | einfache Wortmarke, jederzeit austauschbar |
| `public/icons/favicon.png` | 180 × 180 px, für iOS-Homescreen |

---

## Noch auszufüllen (rechtlich relevant)

`impressum.html` und `datenschutz.html` enthalten Platzhalter für Anschrift,
Umsatzsteuer-ID und Hosting-Angaben. Diese müssen vor dem Livegang durch echte Daten
ersetzt werden — ein unvollständiges Impressum ist in Deutschland abmahnfähig.
