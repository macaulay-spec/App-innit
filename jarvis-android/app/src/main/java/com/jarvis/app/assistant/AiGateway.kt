package com.jarvis.app.assistant

import com.jarvis.app.config.ApiConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Optional cloud AI gateway.
 *
 * If not configured (default), returns null and JARVIS uses its built-in
 * local engine. Nothing requires a key to run.
 */
class AiGateway {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .build()

    suspend fun chat(system: String, history: List<Pair<String, String>>, user: String): String? =
        withContext(Dispatchers.IO) {
            when {
                ApiConfig.hasGemini -> gemini(system, history, user)
                ApiConfig.hasOpenAI -> openAi(system, history, user)
                ApiConfig.hasAnthropic -> anthropic(system, history, user)
                else -> null
            }
        }

    private fun gemini(system: String, history: List<Pair<String, String>>, user: String): String? {
        val contents = JSONArray()
        history.forEach { (role, text) ->
            contents.put(JSONObject().put("role", if (role == "jarvis") "model" else "user")
                .put("parts", JSONArray().put(JSONObject().put("text", text))))
        }
        contents.put(JSONObject().put("role", "user")
            .put("parts", JSONArray().put(JSONObject().put("text", user))))

        val body = JSONObject()
            .put("systemInstruction", JSONObject().put("parts", JSONArray().put(JSONObject().put("text", system))))
            .put("contents", contents)

        val request = Request.Builder()
            .url("https://generativelanguage.googleapis.com/v1beta/models/${ApiConfig.GEMINI_MODEL}:generateContent?key=${ApiConfig.GEMINI_API_KEY}")
            .post(body.toString().toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            client.newCall(request).execute().use { resp ->
                val outer = JSONObject(resp.body?.string() ?: return null)
                outer.getJSONArray("candidates").getJSONObject(0)
                    .getJSONObject("content").getJSONArray("parts").getJSONObject(0)
                    .getString("text")
            }
        } catch (_: Exception) { null }
    }

    private fun openAi(system: String, history: List<Pair<String, String>>, user: String): String? {
        val messages = JSONArray()
        messages.put(JSONObject().put("role", "system").put("content", system))
        history.forEach { (role, text) ->
            messages.put(JSONObject().put("role", if (role == "jarvis") "assistant" else "user").put("content", text))
        }
        messages.put(JSONObject().put("role", "user").put("content", user))

        val body = JSONObject().put("model", ApiConfig.OPENAI_MODEL).put("messages", messages)

        val request = Request.Builder()
            .url("https://api.openai.com/v1/chat/completions")
            .header("Authorization", "Bearer ${ApiConfig.OPENAI_API_KEY}")
            .post(body.toString().toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            client.newCall(request).execute().use { resp ->
                JSONObject(resp.body?.string() ?: return null)
                    .getJSONArray("choices").getJSONObject(0)
                    .getJSONObject("message").getString("content")
            }
        } catch (_: Exception) { null }
    }

    private fun anthropic(system: String, history: List<Pair<String, String>>, user: String): String? {
        val messages = JSONArray()
        history.forEach { (role, text) ->
            messages.put(JSONObject().put("role", if (role == "jarvis") "assistant" else "user").put("content", text))
        }
        messages.put(JSONObject().put("role", "user").put("content", user))

        val body = JSONObject()
            .put("model", ApiConfig.ANTHROPIC_MODEL)
            .put("system", system)
            .put("max_tokens", 1024)
            .put("messages", messages)

        val request = Request.Builder()
            .url("https://api.anthropic.com/v1/messages")
            .header("x-api-key", ApiConfig.ANTHROPIC_API_KEY)
            .header("anthropic-version", "2023-06-01")
            .post(body.toString().toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            client.newCall(request).execute().use { resp ->
                JSONObject(resp.body?.string() ?: return null)
                    .getJSONArray("content").getJSONObject(0).getString("text")
            }
        } catch (_: Exception) { null }
    }
}
