package com.jarvis.app.assistant

import android.content.Context
import com.jarvis.app.accessibility.JarvisAccessibilityService
import com.jarvis.app.memory.MemoryRepository
import com.jarvis.app.messaging.MessagingSender
import com.jarvis.app.notifications.NotificationRepository
import com.jarvis.app.tools.CalendarToolkit
import com.jarvis.app.tools.ContactsToolkit
import com.jarvis.app.tools.DeviceToolkit
import com.jarvis.app.tools.FileAndCameraToolkit
import com.jarvis.app.tools.LocationToolkit
import com.jarvis.app.ui.JarvisState
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicReference

data class EngineResult(
    val reply: String,
    val state: JarvisState = JarvisState.SUCCESS
)

data class PendingSms(val phone: String?, val body: String)

data class PendingAppMessage(val target: String?, val body: String, val phone: String? = null)

class AssistantEngine(context: Context) {

    private val tools = DeviceToolkit(context)
    private val location = LocationToolkit(context)
    private val contacts = ContactsToolkit(context)
    private val calendar = CalendarToolkit(context)
    private val filesCam = FileAndCameraToolkit(context)
    private val sender = MessagingSender(context)
    private val memory = MemoryRepository(com.jarvis.app.memory.AppDatabase.get(context))
    private val ai = AiGateway()
    val pendingSms = AtomicReference<PendingSms?>(null)
    val pendingAppMsg = AtomicReference<PendingAppMessage?>(null)

    suspend fun respond(raw: String): EngineResult {
        val result = process(raw)
        memory.addConversation("jarvis", result.reply)
        return result
    }

    private suspend fun process(raw: String): EngineResult = withContext(Dispatchers.Default) {
        val text = raw.trim()
        memory.addConversation("user", text)

        val lower = text.lowercase()

        // ---- Memory ----
        if (lower.startsWith("remember that ")) {
            val value = text.substringAfter("remember that ").trim()
            memory.remember(value)
            return@withContext EngineResult("Got it. I'll remember: $value")
        }
        if (lower.startsWith("remember ")) {
            val value = text.substringAfter("remember ").trim()
            memory.remember(value)
            return@withContext EngineResult("Got it. I'll remember: $value")
        }
        if (lower.startsWith("forget everything about ") || lower.startsWith("forget everything about any memory of ")) {
            val q = text.substringAfter("about ").trim()
            memory.forget(q)
            return@withContext EngineResult("Forgot everything I had about $q.")
        }
        if (lower.startsWith("forget") && (lower.contains("everything") || lower.trim() == "forget")) {
            memory.wipe()
            return@withContext EngineResult("Memory cleared.")
        }
        if (lower.startsWith("forget ")) {
            val q = text.substringAfter("forget ").trim()
            memory.forget(q)
            return@withContext EngineResult("Forgot: $q")
        }
        if (lower.contains("what do you remember") || lower.startsWith("recall")) {
            val q = if (lower.contains("about ")) text.substringAfter("about ").trim() else ""
            val hits = if (q.isBlank()) emptyList() else memory.recall(q)
            return@withContext EngineResult(
                if (hits.isEmpty()) "I don't have anything relevant yet."
                else "I remember: " + hits.take(5).joinToString("; ") { it.content }
            )
        }

        // ---- Device / system ----
        if (lower.startsWith("open ") || lower.startsWith("launch ")) {
            val q = text.substringAfter(" ").trim()
            val ok = tools.fuzzyLaunch(q)
            return@withContext EngineResult(
                if (ok) "Opening $q." else "I couldn't find an app named $q.",
                if (ok) JarvisState.EXECUTING else JarvisState.ERROR
            )
        }
        if (lower.contains("battery")) return@withContext EngineResult(tools.batteryStatus())
        if (lower.contains("storage") || lower.contains("space")) return@withContext EngineResult(tools.storage())
        if (lower.contains("connectivity") || lower.contains("network") || lower.contains("wifi")) {
            return@withContext when {
                lower.contains("wifi on") -> EngineResult(tools.toggleWifi(true), JarvisState.EXECUTING)
                lower.contains("wifi off") -> EngineResult(tools.toggleWifi(false), JarvisState.EXECUTING)
                else -> EngineResult(tools.connectivity())
            }
        }
        if (lower.contains("time")) return@withContext EngineResult(tools.timeNow())

        if (lower.contains("media")) {
            val action = when {
                lower.contains("next") || lower.contains("skip") -> "next"
                lower.contains("previous") || lower.contains("prev") || lower.contains("back") -> "previous"
                else -> "toggle"
            }
            return@withContext EngineResult(tools.media(action), JarvisState.EXECUTING)
        }
        if (lower.contains("volume") || lower.contains("louder") || lower.contains("quieter")) {
            val m = Regex("(\\d+)").find(text)?.groupValues?.get(1)?.toIntOrNull() ?: 50
            return@withContext EngineResult(tools.volume("music", m), JarvisState.EXECUTING)
        }
        if (lower.contains("brightness")) {
            val p = Regex("(\\d+)").find(text)?.groupValues?.get(1)?.toIntOrNull() ?: 50
            return@withContext EngineResult(tools.brightness(p), JarvisState.EXECUTING)
        }
        if (lower.contains("dnd") || lower.contains("do not disturb")) {
            val on = lower.contains("on") && !lower.contains("off")
            return@withContext EngineResult(tools.dnd(on), JarvisState.EXECUTING)
        }
        if (lower.contains("flashlight") || lower.contains("torch")) {
            val on = lower.contains("on") && !lower.contains("off")
            return@withContext EngineResult(tools.flashlight(on), JarvisState.EXECUTING)
        }

        // ---- Notifications / messages ----
        if (lower.contains("read notifications") || lower.contains("any messages") ||
            lower.contains("any notification") || lower.contains("read my messages")
        ) {
            val all = NotificationRepository.all.value
            if (all.isEmpty()) return@withContext EngineResult("No active notifications right now.")
            val txt = all.take(6).joinToString("\n") { "${it.appLabel}: ${it.title} - ${it.text}" }
            return@withContext EngineResult("Here's what I see:\n$txt")
        }
        if (lower.contains("what did") || lower.contains("did he say") || lower.contains("did she say") ||
            lower.contains("what did he say") || lower.contains("what did she say") ||
            lower.contains("latest message") || lower.contains("last message")
        ) {
            val latest = NotificationRepository.latest()
            return@withContext EngineResult(
                if (latest == null) "I don't see a recent message."
                else "From ${latest.appLabel} (${latest.title}): ${latest.text}"
            )
        }

        // ---- Location / contacts / calendar / files / camera ----
        if (lower.contains("where am i") || lower.contains("location") || lower.contains("where are we")) {
            return@withContext EngineResult(location.lastKnown())
        }
        if (lower.startsWith("call ") || lower.contains("call john") || lower.contains("call adam") ||
            lower.contains("phone ") && lower.contains("contact") ||
            lower.contains("number") && (lower.contains("john") || lower.contains("mom") || lower.contains("dad"))
        ) {
            val name = Regex("(?:call|number for|look up|find) ([a-z]+)").find(lower)?.groupValues?.get(1)
                ?: if (lower.contains("john")) "john" else "the contact"
            val contact = contacts.search(name)
            return@withContext if (contact == null) {
                EngineResult("I couldn't find a contact for $name.")
            } else {
                contacts.dial(contact.phone)
                EngineResult("Calling ${contact.name} (${contact.phone}).", JarvisState.EXECUTING)
            }
        }
        if (lower.startsWith("add event ") || lower.startsWith("add to calendar ") || lower.startsWith("create event ") ||
            lower.startsWith("schedule ") || lower.startsWith("remind me to ")
        ) {
            val title = text.substringAfter("event ").substringAfter("calendar ").substringAfter("to ").trim()
            return@withContext EngineResult(calendar.createEvent(title.ifBlank { "New event" }), JarvisState.EXECUTING)
        }
        if (lower.contains("open file") || lower.contains("open a file") || lower.contains("open files") ||
            lower.contains("my files") || lower.contains("show files")
        ) {
            filesCam.openFilePicker()
            return@withContext EngineResult("Opened the file picker. Choose a file and I can work with it.", JarvisState.EXECUTING)
        }
        if (lower.contains("take a picture") || lower.contains("take a photo") || lower.contains("open camera") ||
            lower.contains("take photo")
        ) {
            filesCam.openCamera()
            return@withContext EngineResult("Opened the camera.", JarvisState.EXECUTING)
        }

        // ---- Reply draft + send ----
        if (lower.startsWith("reply") || lower.contains("tell ") || lower.contains("message ") || lower.contains("send to ")) {
            val body = extractReplyBody(text) ?: return@withContext EngineResult("What should I send?")
            val target = findTarget(text)
            val notif = if (target != null) NotificationRepository.byApp(target).firstOrNull()
            else NotificationRepository.latest()
            val phone = notif?.title?.takeIf { it.contains(Regex("\\d")) }
            pendingSms.set(PendingSms(phone, body))
            pendingAppMsg.set(PendingAppMessage(target, body, phone))
            return@withContext EngineResult(
                "Draft ready for ${target ?: notif?.appLabel ?: "the app"}: \"$body\". Say 'send' to confirm."
            )
        }
        if (lower.trim() == "send" || lower.trim() == "send it" || lower.trim() == "send now" ||
            lower.contains("yes send")
        ) {
            val appDraft = pendingAppMsg.getAndSet(null)
            val smsDraft = pendingSms.getAndSet(null)
            if (appDraft != null && appDraft.target != null) {
                val ok = sender.sendReply(appDraft.target, appDraft.body)
                return@withContext EngineResult(ok, if (ok.startsWith("Sent") || ok.contains("Opened")) JarvisState.EXECUTING else JarvisState.SUCCESS)
            }
            val draft = smsDraft ?: return@withContext EngineResult("There's no draft ready yet.")
            if (draft.phone.isNullOrBlank()) {
                tools.openSmsApp(null, draft.body)
                return@withContext EngineResult("Opened SMS composer with your message. Tap send there.", JarvisState.EXECUTING)
            }
            val ok = tools.sendSms(draft.phone, draft.body)
            return@withContext EngineResult(ok, if (ok.startsWith("Sent")) JarvisState.SUCCESS else JarvisState.ERROR)
        }
        if (lower == "cancel" || lower.contains("cancel the draft") || lower.contains("cancel draft")) {
            pendingSms.set(null)
            pendingAppMsg.set(null)
            return@withContext EngineResult("Draft cancelled.")
        }

        // ---- Accessibility screen read ----
        if (lower.contains("what's on screen") || lower.contains("read the screen") || lower.contains("what is on my screen")) {
            val service = JarvisAccessibilityService.instance
            val txt = service?.getScreenText() ?: ""
            return@withContext EngineResult(
                if (txt.isBlank()) "I can't see the screen yet. Turn on the JARVIS Accessibility toggle in Settings."
                else "Screen:\n${txt.take(400)}"
            )
        }

        // ---- Back/home ----
        if (lower.contains("go back") || lower == "back") {
            JarvisAccessibilityService.instance?.back()
            return@withContext EngineResult("Pressed back.", JarvisState.EXECUTING)
        }
        if (lower.contains("go home")) {
            JarvisAccessibilityService.instance?.home()
            return@withContext EngineResult("Went home.", JarvisState.EXECUTING)
        }

        if (lower.contains("help") || lower.contains("what can you do")) {
            return@withContext EngineResult(
                "I can open apps, check battery/storage/network, find your location, look up contacts, call people, " +
                    "add calendar events, control media/volume/brightness/DND/flashlight, read & reply to notifications, " +
                    "send in WhatsApp/Telegram/SMS, open files, take photos, and remember/forget things. Try: " +
                    "\"open WhatsApp\", \"any messages?\", \"reply to John, say hi\", \"where am I\", \"add event gym\", " +
                    "\"call john\", \"remember my mom's number\", \"what do you remember about me?\"."
            )
        }

        // ---- Default conversational fallback ----
        val history = memory.recentConversation().takeLast(10)
            .map { it.role to it.text }
        val system = """
            You are JARVIS, a fast, friendly personal AI operating layer on Android.
            You are direct, concise, and helpful. You can do device actions, memory,
            messaging and notifications. If the user asks for an action, say exactly
            what you will do, keep it short, and confirm before sensitive sends.
            Use the user's tone. Keep replies under 3 sentences unless asked for detail.
        """.trimIndent()
        val cloud = ai.chat(system, history, text)
        if (cloud != null) return@withContext EngineResult(cloud.trim(), JarvisState.SUCCESS)

        val previous = memory.recentConversation().dropLast(1).takeLast(2).joinToString(" ") { it.text }
        val reply = "Got it. You said: \"$text\". " +
            if (previous.isNotBlank()) "I also remember our last exchange." else ""
        return@withContext EngineResult(reply.trim(), JarvisState.SUCCESS)
    }

    private fun extractReplyBody(text: String): String? {
        val stopWords = listOf("reply to", "reply", "tell", "message", "send him", "send her", "send them", "send")
        var body = text
        stopWords.forEach { w ->
            val idx = body.lowercase().indexOf(w)
            if (idx >= 0) body = body.substring(idx + w.length).trim()
        }
        // strip leading "that " and trailing confirm words
        body = body.removePrefix("to ").removePrefix("that ").removePrefix("him ").removePrefix("her ").removePrefix("them ")
        return body.ifBlank { null }
    }

    private fun findTarget(text: String): String? {
        val lower = text.lowercase()
        if (lower.contains("whatsapp")) return "WhatsApp"
        if (lower.contains("telegram")) return "Telegram"
        if (lower.contains("sms") || lower.contains("message")) return "Messages"
        return null
    }

    suspend fun clearNow() = memory.wipe()
}
