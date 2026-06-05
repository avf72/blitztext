package ch.avf.blitztext

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.File

/** In-App-Update: prueft Version, laedt die APK aus dem GitHub-Release, startet die Installation. */
object UpdateManager {

    private const val BASE = "https://github.com/avf72/blitztext/releases/download/latest"
    private const val VERSION_URL = "$BASE/version.txt"
    private const val APK_URL = "$BASE/app-debug.apk"

    /** Neueste verfuegbare versionCode-Nummer (oder null bei Fehler). */
    suspend fun latestVersionCode(): Int? = withContext(Dispatchers.IO) {
        runCatching {
            Http.client.newCall(Request.Builder().url(VERSION_URL).build()).execute()
                .use { res -> if (res.isSuccessful) res.body?.string()?.trim()?.toIntOrNull() else null }
        }.getOrNull()
    }

    /** Laedt die APK in den Cache, gibt die Datei zurueck (oder null). */
    suspend fun downloadApk(context: Context): File? = withContext(Dispatchers.IO) {
        runCatching {
            Http.client.newCall(Request.Builder().url(APK_URL).build()).execute().use { res ->
                if (!res.isSuccessful) return@withContext null
                val file = File(context.cacheDir, "blitztext-update.apk")
                res.body?.byteStream()?.use { input ->
                    file.outputStream().use { out -> input.copyTo(out) }
                }
                file
            }
        }.getOrNull()
    }

    /** Startet den System-Installer fuer die heruntergeladene APK. */
    fun install(context: Context, apk: File) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", apk)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }
}
