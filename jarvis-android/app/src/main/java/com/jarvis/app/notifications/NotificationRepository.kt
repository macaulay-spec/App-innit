package com.jarvis.app.notifications

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

data class JarvisNotification(
    val packageName: String,
    val appLabel: String,
    val title: String,
    val text: String,
    val key: String,
    val timestamp: Long
)

object NotificationRepository {
    private val _all = MutableStateFlow<List<JarvisNotification>>(emptyList())
    val all: StateFlow<List<JarvisNotification>> = _all

    fun update(items: List<JarvisNotification>) = _all.value = items
    fun clear() = _all.value = emptyList()

    fun byApp(label: String): List<JarvisNotification> =
        _all.value.filter { it.appLabel.equals(label, ignoreCase = true) || it.packageName.contains(label, true) }

    fun latest(): JarvisNotification? = _all.value.maxByOrNull { it.timestamp }
}
