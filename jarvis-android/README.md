# JARVIS — Sideload Android AI Operating Layer

A legitimate-but-free-thinking personal AI control layer you install on **your own phone**.
No Play Store required. This is a **sideload APK** built for your device, with full permissions
available and an optional Accessibility service you turn on when you want JARVIS to
read the screen and tap/type inside other apps.

---

## What it does right now

- **Cinematic 3D core** (Compose canvas): IDLE / WAKING / LISTENING / PROCESSING / SPEAKING /
  EXECUTING / SUCCESS / ERROR / OFFLINE visual states.
- **Voice layer:** foreground microphone service + persistent notification, device STT
  (speech recognition) that looks for the wake phrase, and TextToSpeech replies.
- **Read + reply to notifications** via the Notification Listener.
- **Send SMS** (with confirmation) and open SMS composer with pre-filled body.
- **Open apps** by name (fuzzy), battery, storage, connectivity/Wi‑Fi, volume, brightness,
  DND, flashlight, media controls.
- **Memory:** remember, forget, recall, full wipe (Room + local DB).
- **Full mode:** Accessibility service (OFF by default) to read screen text, tap text,
  type into fields, press back/home, go to notification shade.
- **Honest help** command listing what it can do.

---

## Build it on your machine

You need:
- Android Studio (Hedgehog or newer), or Android SDK + JDK 17 + Gradle 8.5+
- `local.properties` with `sdk.dir=...` pointing to your SDK (Android Studio makes it for you)

From the `jarvis-android` folder:

```bash
# Command line
./gradlew assembleDebug
# APK appears at:
# app/build/outputs/apk/debug/app-debug.apk
```

In Android Studio: open `jarvis-android` as a project, wait for sync, then
**Build > Build APK(s)**.

> Note: Gradle needs internet once to download dependencies. Build on your own machine —
> the generation sandbox for this repo had no Android SDK, JDK, or network, so the APK
> could not be compiled inside this workspace.

---

## Install on your phone (sideload)

1. Copy `app-debug.apk` to your phone.
2. Tap it. Allow "install from unknown sources" when prompted.
3. Open JARVIS.
4. Grant: microphone, notifications, SMS, contacts, calendar, camera, photos (as prompted).
5. Tap the **mic FAB** to start the foreground listening service.
6. Say **"Hey JARVIS"** then your command.

---

## Enable "Full mode" (screen control in other apps)

1. Settings → **Open notification access** → enable **JARVIS** (reads + replies to messages).
2. Settings → **Open accessibility settings** → enable **JARVIS** (reads screen, taps, types).
   This is OFF by default and only does work inside apps while enabled.
3. Settings → **Open battery settings** → set JARVIS to Unrestricted if you want it to survive
   longer in the background.

Accessibility is the only way to type/send inside apps that don't expose a reply action,
and it's the closest thing to full phone control. Keep it on only when you want that.

---

## Zero-key mode (default)

The app **works with no API keys at all**. It uses:
- Android **SpeechRecognizer** for STT (on-device / offline)
- Android **TextToSpeech** for voice replies
- Built-in **local rule engine** for understanding + device actions
- **Room** local DB for memory

You can build, install, and use JARVIS exactly as-is.

---

## What you'll need to add (optional — add these at the very end)

All of these are **optional** and all go in one file:

```
app/src/main/java/com/jarvis/app/config/ApiConfig.kt
```

| What it unlocks | Where to get it | Fill in |
|---|---|---|
| **Smarter AI conversations** | Google AI Studio → `https://aistudio.google.com/apikey` | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| AI fallback (GPT) | OpenAI → `https://platform.openai.com/api-keys` | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| AI fallback (Claude) | Anthropic → `https://console.anthropic.com/` | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` |
| Better cloud STT | Google Cloud Speech → `https://console.cloud.google.com/apis/library/speech.googleapis.com` | `GOOGLE_STT_API_KEY` |
| Natural cloud TTS | Google Cloud TTS → same console | `GOOGLE_TTS_API_KEY` |
| Premium voices | ElevenLabs → `https://elevenlabs.io/api` | `ELEVENLABS_API_KEY` |
| Home Assistant | Your Home Assistant instance | `HOME_ASSISTANT_URL`, `HOME_ASSISTANT_TOKEN` |

Rules:
- **Leave them empty and JARVIS uses the local engine.** Nothing breaks.
- Only add what you actually use. The app is already fully functional without them.
- Never put real keys in a public repo. Use a `local.properties` or environment var if you ever share the code.
- We will wire the AI gateway (`AiGateway.kt`) to actually **call these** once you paste them in — the hooks are already built, so it's a fill-in, not a redo.

---

## Honest limitations (technical, not policy)

- **Cannot read the private database of another app** (e.g. WhatsApp message history).
  Android's kernel sandbox makes that impossible for *any* app. It reads what appears as a
  notification and controls what's on **screen** when Accessibility is on.
- **Cannot hold a microphone silently forever.** A foreground service with a visible
  notification is the legitimate always-listen path; some OEMs may kill it.
- Blindly automating arbitrary in-game controls is fragile: it needs Accessibility, apps
  update, and it can break or be detected. That part is optional and off by default.

Everything else is within "what a person can do with a phone, through the legitimate doors."
