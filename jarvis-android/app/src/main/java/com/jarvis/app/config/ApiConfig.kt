package com.jarvis.app.config

/**
 * CENTRAL API CONFIG.
 *
 * Everything here is OPTIONAL. JARVIS runs fully with no keys:
 *   - STT  -> Android SpeechRecognizer (on-device / offline)
 *   - TTS  -> Android TextToSpeech (device, free)
 *   - AI   -> built-in local rule engine (no network)
 *   - Memory -> local Room database
 *
 * Fill these in LATER (see README "What you'll need to add") to unlock:
 *   - smarter conversational AI
 *   - cloud STT / TTS voices
 *   - web research
 *
 * Add real values only when you are ready. Empty values are safe.
 */
object ApiConfig {

    // ===== AI / LLM =====
    // Google AI Studio -> https://aistudio.google.com/apikey
    const val GEMINI_API_KEY = ""
    const val GEMINI_MODEL = "gemini-2.0-flash"
    val hasGemini get() = GEMINI_API_KEY.isNotBlank()

    // OpenAI (fallback) -> https://platform.openai.com/api-keys
    const val OPENAI_API_KEY = ""
    const val OPENAI_MODEL = "gpt-4o-mini"
    val hasOpenAI get() = OPENAI_API_KEY.isNotBlank()

    // Anthropic (fallback) -> https://console.anthropic.com/
    const val ANTHROPIC_API_KEY = ""
    const val ANTHROPIC_MODEL = "claude-3-5-sonnet-latest"
    val hasAnthropic get() = ANTHROPIC_API_KEY.isNotBlank()

    // ===== Cloud STT (optional) =====
    // Google Cloud Speech -> https://console.cloud.google.com/apis/library/speech.googleapis.com
    const val GOOGLE_STT_API_KEY = ""
    val hasCloudSTT get() = GOOGLE_STT_API_KEY.isNotBlank()

    // ===== Cloud TTS (optional) =====
    // Google Cloud TTS -> https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
    const val GOOGLE_TTS_API_KEY = ""
    val hasCloudTTS get() = GOOGLE_TTS_API_KEY.isNotBlank()

    // ElevenLabs (optional) -> https://elevenlabs.io/api
    const val ELEVENLABS_API_KEY = ""
    val hasElevenLabs get() = ELEVENLABS_API_KEY.isNotBlank()

    // ===== Connectors (optional, later) =====
    const val HOME_ASSISTANT_URL = ""
    const val HOME_ASSISTANT_TOKEN = ""
    val hasHomeAssistant get() = HOME_ASSISTANT_URL.isNotBlank() && HOME_ASSISTANT_TOKEN.isNotBlank()
}
