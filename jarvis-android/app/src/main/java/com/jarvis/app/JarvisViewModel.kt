package com.jarvis.app

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.jarvis.app.assistant.AssistantEngine
import com.jarvis.app.assistant.EngineResult
import com.jarvis.app.memory.MemoryEntity
import com.jarvis.app.memory.MemoryRepository
import com.jarvis.app.ui.JarvisState
import com.jarvis.app.voice.SpeechOutput
import com.jarvis.app.voice.VoiceBus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ChatLine(val role: String, val text: String)

class JarvisViewModel(app: Application) : AndroidViewModel(app) {

    val engine = AssistantEngine(app)
    private val memoryRepo = MemoryRepository(com.jarvis.app.memory.AppDatabase.get(app))
    private val speech = SpeechOutput(app)

    private val _state = MutableStateFlow<JarvisState>(JarvisState.IDLE)
    val state = _state.asStateFlow()

    private val _lines = MutableStateFlow<List<ChatLine>>(emptyList())
    val lines = _lines.asStateFlow()

    private val _input = MutableStateFlow("")
    val input = _input.asStateFlow()

    private val _memories = MutableStateFlow<List<MemoryEntity>>(emptyList())
    val memories = _memories.asStateFlow()

    init {
        viewModelScope.launch {
            VoiceBus.command.collect { cmd -> handle(cmd) }
        }
        viewModelScope.launch {
            memoryRepo.all().collect { _memories.value = it }
        }
    }

    fun setInput(v: String) { _input.value = v }

    fun send() {
        val t = _input.value.trim()
        if (t.isEmpty()) return
        _input.value = ""
        viewModelScope.launch { handle(t) }
    }

    fun toggleListening() {
        viewModelScope.launch {
            val ctx = getApplication<Application>()
            val svc = android.content.Intent(ctx, com.jarvis.app.voice.WakeWordForegroundService::class.java)
            if (com.jarvis.app.voice.WakeWordForegroundService.running) {
                svc.action = "stop"
                ctx.startForegroundService(svc)
                _state.value = JarvisState.IDLE
            } else {
                if (android.content.ContextCompat.checkSelfPermission(
                        ctx, android.Manifest.permission.POST_NOTIFICATIONS
                    ) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    ctx.startForegroundService(svc)
                    _state.value = JarvisState.LISTENING
                }
            }
        }
    }

    private suspend fun handle(text: String) {
        _lines.value = _lines.value + ChatLine("user", text)
        _state.value = JarvisState.PROCESSING
        val result: EngineResult = engine.respond(text)
        _lines.value = _lines.value + ChatLine("jarvis", result.reply)
        _state.value = result.state
        speech.speak(result.reply)
    }

    fun speak(text: String) { speech.speak(text) }
    fun stopSpeaking() { speech.stop() }

    fun wipeMemory() {
        viewModelScope.launch { engine.clearNow() }
    }

    private val _runtimeRequestTrigger = MutableStateFlow(0L)
    val runtimeRequestTrigger = _runtimeRequestTrigger.asStateFlow()

    fun requestAllRuntime() {
        _runtimeRequestTrigger.value = System.currentTimeMillis()
    }

    override fun onCleared() {
        speech.shutdown()
        super.onCleared()
    }
}
