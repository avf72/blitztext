package ch.avf.blitztext

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import org.json.JSONObject

/** Schickt Audio + Workflow ans Vercel-Backend, gibt den fertigen Text zurueck. */
object DictateClient {

    suspend fun dictate(
        rec: Recording,
        workflow: String,
        language: String,
        model: String,
        token: String
    ): Result<String> = withContext(Dispatchers.IO) {
        val body = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart(
                "file", "audio.m4a",
                rec.file.asRequestBody("audio/m4a".toMediaType())
            )
            .addFormDataPart("duration", rec.durationSec.toString())
            .addFormDataPart("workflow", workflow)
            .addFormDataPart("language", language)
            .addFormDataPart("model", model)
            .build()

        val req = Request.Builder()
            .url("${BuildConfig.BACKEND_URL}/api/dictate")
            .addHeader("Authorization", "Bearer $token")
            .post(body)
            .build()

        try {
            Http.client.newCall(req).execute().use { res ->
                val raw = res.body?.string() ?: ""
                val json = runCatching { JSONObject(raw) }.getOrNull()
                if (res.isSuccessful) {
                    val text = json?.optString("text") ?: ""
                    if (text.isEmpty()) Result.failure(Exception("Leere Antwort"))
                    else Result.success(text)
                } else {
                    Result.failure(Exception(json?.optString("error") ?: "Fehler ${res.code}"))
                }
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
