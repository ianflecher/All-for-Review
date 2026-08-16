# IDF Reviewer

Turn a document or a web article into study material — a ranked summary,
flashcards, a multiple-choice quiz and a concept map. Everything except
fetching a web link runs on-device, with no account and no network.

**Accepts:** PDF, Word (`.docx`), PowerPoint (`.pptx`), text (`.txt`, `.md`,
`.csv`), captions (`.srt`, `.vtt`) and web article links.

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
npx tsc --noEmit                  # typecheck
npx expo export --platform android  # verify the bundle builds
```
