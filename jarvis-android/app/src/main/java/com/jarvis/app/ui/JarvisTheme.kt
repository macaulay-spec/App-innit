package com.jarvis.app.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Night = darkColorScheme(
    primary = Color(0xFF35E0FF),
    onPrimary = Color(0xFF001A22),
    secondary = Color(0xFF6BFFE1),
    background = Color(0xFF05070D),
    onBackground = Color(0xFFD8F4FF),
    surface = Color(0xFF0A1322),
    onSurface = Color(0xFFD8F4FF),
    error = Color(0xFFFF4D6D)
)

@Composable
fun JarvisTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Night, content = content)
}
