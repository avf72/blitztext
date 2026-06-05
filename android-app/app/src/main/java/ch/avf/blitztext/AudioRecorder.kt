package ch.avf.blitztext

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import android.os.SystemClock
import java.io.File

data class Recording(val file: File, val durationSec: Double)

/** Mikrofon-Aufnahme nach m4a (AAC), misst die Dauer. Whisper akzeptiert m4a. */
class AudioRecorder(private val context: Context) {
    private var recorder: MediaRecorder? = null
    private var file: File? = null
    private var startMs = 0L

    fun start() {
        val f = File(context.cacheDir, "blitztext_rec.m4a")
        @Suppress("DEPRECATION")
        val r = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)
        } else {
            MediaRecorder()
        }
        r.setAudioSource(MediaRecorder.AudioSource.MIC)
        r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
        r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
        r.setAudioSamplingRate(16000)
        r.setAudioEncodingBitRate(48000)
        r.setOutputFile(f.absolutePath)
        r.prepare()
        r.start()
        recorder = r
        file = f
        startMs = SystemClock.elapsedRealtime()
    }

    /** Stoppt und liefert Datei + Dauer, oder null bei Fehler / zu kurz. */
    fun stop(): Recording? {
        val r = recorder ?: return null
        val durSec = (SystemClock.elapsedRealtime() - startMs) / 1000.0
        return try {
            r.stop()
            file?.let { Recording(it, durSec) }
        } catch (e: Exception) {
            null
        } finally {
            r.release()
            recorder = null
        }
    }

    val isRecording: Boolean get() = recorder != null
}
