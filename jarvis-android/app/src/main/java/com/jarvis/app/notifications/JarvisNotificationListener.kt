package com.jarvis.app.notifications

import android.app.PendingIntent
import android.app.RemoteInput
import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationManagerCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class JarvisNotificationListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        refresh()
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        refresh()
    }

    override fun onListenerConnected() {
        refresh()
    }

    private fun refresh() {
        try {
            val sbns = activeNotifications ?: return
            val apps = packageManager.getInstalledApplications(0)
            val items = sbns.mapNotNull { sbn ->
                val notif = sbn.notification ?: return@mapNotNull null
                val extras = notif.extras ?: return@mapNotNull null
                val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
                    ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                    ?: ""
                val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
                if (text.isBlank() && title.isBlank()) return@mapNotNull null
                val label = apps.firstOrNull { it.packageName == sbn.packageName }?.loadLabel(packageManager)?.toString()
                    ?: sbn.packageName
                JarvisNotification(
                    packageName = sbn.packageName,
                    appLabel = label,
                    title = title,
                    text = text,
                    key = sbn.key,
                    timestamp = sbn.postTime
                )
            }
            NotificationRepository.update(items)
        } catch (_: Exception) { }
    }

    /** Best-effort: find a notification with a reply RemoteInput action for the given package. */
    fun getReplyAction(packageName: String): Notification.Action? {
        val sbns = activeNotifications ?: return null
        for (sbn in sbns) {
            if (sbn.packageName != packageName) continue
            sbn.notification.actions?.forEach { action ->
                val inputs = action.getRemoteInputs()
                if (inputs != null && inputs.isNotEmpty()) return action
            }
        }
        return null
    }

    /** Sends a reply through the notification's RemoteInput action (works for some messaging apps). */
    fun replyToNotification(packageName: String, text: String): Boolean {
        val action = getReplyAction(packageName) ?: return false
        val input = action.getRemoteInputs()?.firstOrNull() ?: return false
        val intent = action.actionIntent
        val results = RemoteInput.Builder(input.resultKey)
            .addExtras(android.os.Bundle().apply { putCharSequence(input.resultKey, text) })
            .build()
        return try {
            val wrapped = PendingIntent.getActivity(
                this, input.resultKey.hashCode(),
                intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            wrapped.send()
            true
        } catch (_: Exception) {
            false
        }
    }
}
