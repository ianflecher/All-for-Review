# IDF Reviewer

A student app that runs entirely on the phone. Everything except fetching a
web link works offline, with no account and no server.

**From your documents** — a ranked summary, flashcards, a multiple-choice quiz
and a step-by-step learning path, generated from whatever you upload.

The learning path orders the document's main ideas foundations-first, using
where each first appears, how often it recurs, whether the text defines it, how
many earlier ideas it is explained with, and how specialised the term is. Every
step shows the reasons for its placement, because this reflects the document's
own build-up rather than any syllabus.

**Accepts:** PDF, Word (`.docx`), PowerPoint (`.pptx`), text (`.txt`, `.md`,
`.csv`), captions (`.srt`, `.vtt`), photos (`.jpg`, `.png`, `.webp`) and web
article links.

Photographed handouts and whiteboards are read with on-device OCR, in English
and Filipino together — modules here are routinely Taglish, so asking which
language a photo is in would be a question with no good answer. Nothing is
uploaded; the engine ships inside the app.

Tagalog material is handled throughout: Filipino function words are excluded
from topics, and "Ang X ay Y" counts as a definition, so a Tagalog term is
asked about in Tagalog.

**Standalone tools** — these need no document and keep their own data:

| Tool | What it does |
|---|---|
| **Planner** | Assignments grouped as overdue / today / this week / later, tick off when done |
| **Allowance** | Log money received and spent, with a running balance, weekly total and per-category breakdown |
| **Schedule** | Weekly class timetable with a day picker and the next class of the day up front |
| **File Organizer** | Sort uploaded documents into subject folders, with search |

All four store their data locally — AsyncStorage on the phone (SQLite under the
hood), `localStorage` on web. Nothing is uploaded anywhere.

The app is an Expo / React Native project in `PDFReviewerApp/`, and runs on
Android, iOS, web and as an Electron desktop app from the same source.

## Running it on Android

From `PDFReviewerApp/`:

```bash
npm install
npx expo start          # then scan the QR code with Expo Go
```

Every native module this app uses ships inside Expo Go, so the QR-code route
works without building anything.

To produce an installable APK:

```bash
npm run build:android   # EAS cloud build, needs a free Expo account
```

or build locally, which needs JDK 17–21 and the Android SDK:

```bash
npx expo prebuild -p android
cd android && ./gradlew assembleRelease
```

Double-clickable Windows wrappers for both routes are in `installers/`.

## How PDF text extraction works

pdf.js needs a DOM and a Worker, neither of which React Native provides, so on
Android and iOS it runs inside a hidden WebView built from the pdf.js library
and worker bundled as app assets (`assets/pdfjs/`). The picked file is sent in
64KB chunks — Android's `evaluateJavascript` bridge silently drops payloads in
the megabytes. On web, pdf.js runs directly against the worker in `public/`.

A scanned PDF with no embedded text layer still cannot be read directly — the
app says so rather than returning an empty reviewer. Photographing the pages
and adding those images works, since that path goes through OCR.

## OCR assets

The engine is about 11 MB — tesseract's wasm core plus the English and Filipino
models. Committing that would bloat the repository permanently for something
npm already hosts, so `scripts/prepare-ocr-assets.js` stages it into
`assets/ocr/` from the dev dependencies on every install, and that folder is
git-ignored. The APK still ships it; the repository stays lean.

They are staged under a single `.ocrasset` extension because Metro would
otherwise try to bundle the `.js` parts as modules and would ignore the `.wasm`
and `.gz` entirely. Real filenames are restored on the device, where tesseract
fetches them by name.

## Checks

```bash
npm run typecheck
npm test                            # 112 tests over the pure logic
npx expo export --platform android  # verify the bundle builds
```

Pushing to `main` runs `.github/workflows/android-apk.yml`, which typechecks,
runs the tests, then builds a real APK on a GitHub runner and attaches it to the
`android-latest` release. `versionCode` is stamped from the run number so each
build installs over the last without losing data.
