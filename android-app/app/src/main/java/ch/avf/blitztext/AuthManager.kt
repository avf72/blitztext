package ch.avf.blitztext

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaType
import org.json.JSONObject
import java.security.MessageDigest
import java.security.SecureRandom
import android.util.Base64

/** Supabase-Login (Google, PKCE) ueber den System-Browser + Token-Verwaltung per REST. */
object AuthManager {

    private const val REDIRECT = "ch.avf.blitztext://auth-callback"
    private val JSON = "application/json".toMediaType()

    private fun base64Url(bytes: ByteArray): String =
        Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)

    /** Login starten: PKCE-Verifier erzeugen, Authorize-URL im Browser oeffnen. */
    fun startLogin(context: Context) {
        val verifierBytes = ByteArray(64).also { SecureRandom().nextBytes(it) }
        val verifier = base64Url(verifierBytes)
        Prefs.codeVerifier = verifier
        val challenge = base64Url(
            MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.US_ASCII))
        )
        val url = Uri.parse("${BuildConfig.SUPABASE_URL}/auth/v1/authorize").buildUpon()
            .appendQueryParameter("provider", "google")
            .appendQueryParameter("redirect_to", REDIRECT)
            .appendQueryParameter("code_challenge", challenge)
            .appendQueryParameter("code_challenge_method", "S256")
            .build()
        CustomTabsIntent.Builder().build().launchUrl(context, url)
    }

    /** OAuth-Code gegen Tokens tauschen (aus dem Deep-Link-Callback). */
    suspend fun exchangeCode(code: String): Boolean = withContext(Dispatchers.IO) {
        val verifier = Prefs.codeVerifier ?: return@withContext false
        val body = JSONObject()
            .put("auth_code", code)
            .put("code_verifier", verifier)
            .toString().toRequestBody(JSON)
        val req = Request.Builder()
            .url("${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=pkce")
            .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
            .post(body)
            .build()
        runCatching {
            Http.client.newCall(req).execute().use { res ->
                if (!res.isSuccessful) return@withContext false
                storeTokens(JSONObject(res.body?.string() ?: return@withContext false))
            }
        }.isSuccess.also { if (it) Prefs.codeVerifier = null }
    }

    /** Gueltigen Access-Token liefern; bei Ablauf via Refresh-Token erneuern. */
    suspend fun getValidAccessToken(): String? = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis() / 1000
        if (Prefs.accessToken != null && Prefs.expiresAt - now > 60) return@withContext Prefs.accessToken
        val rt = Prefs.refreshToken ?: return@withContext null
        val body = JSONObject().put("refresh_token", rt).toString().toRequestBody(JSON)
        val req = Request.Builder()
            .url("${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token")
            .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
            .post(body)
            .build()
        runCatching {
            Http.client.newCall(req).execute().use { res ->
                if (!res.isSuccessful) return@withContext null
                storeTokens(JSONObject(res.body?.string() ?: return@withContext null))
            }
        }
        Prefs.accessToken
    }

    private fun storeTokens(json: JSONObject): Boolean {
        val access = json.optString("access_token", "")
        if (access.isEmpty()) return false
        Prefs.accessToken = access
        Prefs.refreshToken = json.optString("refresh_token", Prefs.refreshToken)
        val now = System.currentTimeMillis() / 1000
        Prefs.expiresAt = json.optLong("expires_at", now + json.optLong("expires_in", 3600))
        return true
    }

    fun logout() = Prefs.clearTokens()
}
