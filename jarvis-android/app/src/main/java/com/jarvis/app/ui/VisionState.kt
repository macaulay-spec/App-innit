package com.jarvis.app.ui

import androidx.compose.ui.graphics.Color

enum class JarvisState(val label: String) {
    IDLE("Idle"),
    WAKING("Waking"),
    LISTENING("Listening"),
    PROCESSING("Processing"),
    SPEAKING("Speaking"),
    EXECUTING("Executing"),
    SUCCESS("Success"),
    ERROR("Error"),
    OFFLINE("Offline");

    fun accent(): Color = when (this) {
        IDLE -> Color(0xFF35E0FF)
        WAKING -> Color(0xFF5CEBFF)
        LISTENING -> Color(0xFF4FFFB0)
        PROCESSING -> Color(0xFF7A8CFF)
        SPEAKING -> Color(0xFF6BFFE1)
        EXECUTING -> Color(0xFFFFB13B)
        SUCCESS -> Color(0xFF50FF9C)
        ERROR -> Color(0xFFFF4D6D)
        OFFLINE -> Color(0xFFFFB13B)
    }
}
