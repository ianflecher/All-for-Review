# IDF Reviewer — Installers

Everything here is meant to be **double-clicked**. Pick the one you need.

---

## 💻 PC / Desktop (Windows)

**`PDF Quiz Reviewer Setup.exe`**

Double-click it, follow the installer, and the app appears in your Start Menu.
Nothing else to install — Node, npm and the browser are all bundled inside.

Everything works **offline** except pasting a web link, which obviously needs
internet.

> Windows may show a blue *"Windows protected your PC"* box, because the
> installer isn't code-signed (signing costs money per year).
> Click **More info → Run anyway**.

---

## 📱 Android phone

There are two ways. The second one is instant.

### Option A — Build a real APK you can install

**`Build-Android-APK.bat`**

Double-click it. It signs you in to Expo and builds the APK in their cloud,
then gives you a download link.

- Needs a **free** Expo account → https://expo.dev/signup
- Takes roughly 10–20 minutes
- Result: a real `.apk` you copy to your phone and tap to install

*Why the cloud?* Building an APK on this PC needs Java 17–21. This PC has
Java 26, which the Android build tools refuse to work with. Installing an
older JDK would also work, but the cloud build avoids touching your setup.

### Option B — Run it on your phone right now (no APK)

**`Run-On-Phone-Now.bat`**

Double-click it, then:

1. Install **Expo Go** on your phone (Play Store / App Store)
2. Put the phone on the **same Wi-Fi** as this PC
3. Scan the QR code that appears

The app runs immediately. Good for testing before you commit to a full APK
build. The catch: the PC must stay on and running this script.

---

## What the app does

Feed it study material and it generates four things, all on-device:

| Tool | What it makes |
|---|---|
| **Reviewer** | Ranked summary, key topics, and the full text |
| **Flashcards** | Q&A cards from definitions and key facts |
| **Quiz** | Multiple choice with scoring and answer review |
| **Learning Map** | Concept graph showing how ideas connect, plus gaps |

**Accepts:** PDF, Word (`.docx`), PowerPoint (`.pptx`), text (`.txt`, `.md`,
`.csv`), captions (`.srt`, `.vtt`), and web article links.

**Not supported:** YouTube / Facebook / TikTok links. Those sites block
automated access to their transcripts. Download the video's captions and
upload the `.srt`/`.vtt` file instead — that works fine.

If a document is too short or unstructured to summarise, the app shows you the
plain extracted text rather than an empty screen.
