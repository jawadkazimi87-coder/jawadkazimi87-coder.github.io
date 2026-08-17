# Assets und Marke

## Arbeitsname ändern

Die Agentur heißt derzeit **„Digital Marketing"** — ein Platzhalter, bis Sie sich
entschieden haben. Der Name steht in jeder HTML-Datei an drei Stellen: in der Wortmarke
(`wordmark__text`), im Seitentitel und in der Fußzeile. Ein Suchen-und-Ersetzen über alle
`.html`-Dateien genügt:

```bash
grep -rl "Digital<span" *.html   # Wortmarke
grep -rl "Digital Marketing" *.html
```

Die Wortmarke ist zweiteilig aufgebaut — fetter erster Teil, feiner zweiter Teil:
`<span class="wordmark__text">Digital<span class="wordmark__thin">Marketing</span></span>`

---

# Assets — was Sie hier ablegen müssen

Die Website erwartet die folgenden Dateien. **Alle Pfade sind bereits im Code verdrahtet** —
Sie müssen nur die Dateien mit exakt diesen Namen ablegen. Es wurden bewusst keine
Ersatzbilder generiert.

Solange eine Datei fehlt, greift ein sauberer Fallback (Farbverlauf statt Bild, statische
Story statt Video-Scrubbing). Die Seite bleibt also jederzeit funktionsfähig.

---

## 1. Hero-Video — **vorhanden**

Das gelieferte Video ist encodiert und eingebaut. Quelle: 1280 × 720, 10,08 s.

| Pfad | Zweck | Größe |
|---|---|---|
| `public/videos/hero-story.webm` | VP9, wird von Chrome/Firefox/Edge bevorzugt | 3,5 MB |
| `public/videos/hero-story.mp4` | H.264, für Safari und ältere Browser | 3,9 MB |
| `public/videos/hero-story-mobile.mp4` | 720 px breit, für Mobilgeräte | 1,4 MB |
| `public/images/hero-poster.jpg` | erstes Bild, vor dem Laden sichtbar | 70 KB |

Der Browser wählt selbst: Desktop nimmt WebM, wenn er VP9 kann, sonst MP4;
Mobilgeräte laden die kleine MP4. Fällt eine Datei aus, rückt die nächste nach.

**Zum Austauschen** genügt es, die Dateien mit denselben Namen zu ersetzen —
mit den Befehlen weiter unten, damit die Keyframe-Dichte erhalten bleibt.

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

### Timing der Texte — bereits auf dieses Video abgestimmt

Die Texte sitzen auf den tatsächlichen Bildwechseln der gelieferten Aufnahme:

| Fortschritt | Videozeit | Bild | Text |
|---|---|---|---|
| 0 – 0,19 | 0 – 1,9 s | Ladenlokal bei Nacht | „Ihr Betrieb ist real." |
| 0,19 – 0,31 | 1,9 – 3,1 s | Lichtraster entsteht | „Jeden Tag sucht jemand …" |
| 0,31 – 0,475 | 3,1 – 4,8 s | Browserfenster erscheint | „Webdesign" |
| 0,475 – 0,595 | 4,8 – 6,0 s | Verbindungen breiten sich aus | „Digital Marketing" |
| 0,595 – 0,745 | 6,0 – 7,5 s | Kunden erscheinen | „Mehr Sichtbarkeit. Mehr Anfragen." |
| 0,745 – 0,855 | 7,5 – 8,6 s | Verdichtung, Kamera fährt zurück | „Aus Klicks werden Kunden." |
| 0,855 – 1,0 | 8,6 – 10,08 s | Wachstums-Ökosystem | Handlungsaufruf |

Wird das Video ausgetauscht, müssen diese Werte neu gesetzt werden — jeder Textblock
trägt sie direkt am Element:

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
