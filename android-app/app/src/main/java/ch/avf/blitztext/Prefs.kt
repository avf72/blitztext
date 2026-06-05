package ch.avf.blitztext

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/** Verschluesselter lokaler Speicher: OAuth-Tokens + Einstellungen. */
object Prefs {
    private lateinit var sp: SharedPreferences

    fun init(context: Context) {
        val master = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        sp = EncryptedSharedPreferences.create(
            context,
            "blitztext_secure",
            master,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    // --- Tokens ---
    var accessToken: String?
        get() = sp.getString("access_token", null)
        set(v) = sp.edit().putString("access_token", v).apply()

    var refreshToken: String?
        get() = sp.getString("refresh_token", null)
        set(v) = sp.edit().putString("refresh_token", v).apply()

    /** Ablaufzeitpunkt in Epoch-Sekunden. */
    var expiresAt: Long
        get() = sp.getLong("expires_at", 0L)
        set(v) = sp.edit().putLong("expires_at", v).apply()

    /** Temporaerer PKCE-Code-Verifier waehrend des Login-Flows. */
    var codeVerifier: String?
        get() = sp.getString("code_verifier", null)
        set(v) = sp.edit().putString("code_verifier", v).apply()

    val isLoggedIn: Boolean get() = refreshToken != null

    fun clearTokens() {
        sp.edit().remove("access_token").remove("refresh_token")
            .remove("expires_at").remove("code_verifier").apply()
    }

    // --- Einstellungen ---
    var workflow: String
        get() = sp.getString("workflow", "transcription") ?: "transcription"
        set(v) = sp.edit().putString("workflow", v).apply()

    var language: String
        get() = sp.getString("language", "de") ?: "de"
        set(v) = sp.edit().putString("language", v).apply()
}
