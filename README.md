# IDF Reviewer

A student app that runs entirely on the phone. Everything except fetching a
web link works offline, with no account and no server.

**From your documents** — a ranked summary, flashcards, a multiple-choice quiz
and a concept map, generated from whatever you upload.

**Accepts:** PDF, Word (`.docx`), PowerPoint (`.pptx`), text (`.txt`, `.md`,
`.csv`), captions (`.srt`, `.vtt`) and web article links.

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

Scanned PDFs with no embedded text layer are not supported; the app says so
rather than returning an empty reviewer.

## Checks

```bash
npx tsc --noEmit                    # typecheck
npx expo export --platform android  # verify the bundle builds
```

Pushing to the Android branch also runs `.github/workflows/android-apk.yml`,
which builds a real APK on a GitHub runner and attaches it to the
`android-latest` release.
