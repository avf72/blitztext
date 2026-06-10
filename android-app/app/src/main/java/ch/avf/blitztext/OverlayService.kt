package ch.avf.blitztext

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.content.pm.ServiceInfo
import android.content.res.ColorStateList
import android.graphics.PixelFormat
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.WindowManager
import android.widget.Toast
import androidx.core.app.NotificationCompat
import ch.avf.blitztext.databinding.OverlayButtonBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlin.math.abs

/** Foreground-Service mit schwebendem Knopf: Tippen -> aufnehmen -> Text einfuegen. */
class OverlayService : Service() {

    private enum class State { IDLE, RECORDING, PROCESSING }

    private lateinit var wm: WindowManager
    private lateinit var binding: OverlayButtonBinding
    private lateinit var params: WindowManager.LayoutParams
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var recorder: AudioRecorder? = null
    private var state = State.IDLE

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        startAsForeground()
        wm = getSystemService(WindowManager::class.java)
        binding = OverlayButtonBinding.inflate(LayoutInflater.from(this))

        @Suppress("DEPRECATION")
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else WindowManager.LayoutParams.TYPE_PHONE

        params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 24
            y = 400
        }

        setupTouch()
        wm.addView(binding.root, params)
    }

    private fun setupTouch() {
        var downX = 0f
        var downY = 0f
        var startX = 0
        var startY = 0
        var moved = false
        binding.root.setOnTouchListener { _, e ->
            when (e.action) {
                MotionEvent.ACTION_DOWN -> {
                    downX = e.rawX; downY = e.rawY
                    startX = params.x; startY = params.y
                    moved = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = e.rawX - downX
                    val dy = e.rawY - downY
                    if (abs(dx) > 12 || abs(dy) > 12) moved = true
                    params.x = startX + dx.toInt()
                    params.y = startY + dy.toInt()
                    wm.updateViewLayout(binding.root, params)
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!moved) onTap()
                    true
                }
                else -> false
            }
        }
    }

    private fun onTap() {
        when (state) {
            State.IDLE -> startRecording()
            State.RECORDING -> stopAndProcess()
            State.PROCESSING -> {}
        }
    }

    private fun startRecording() {
        val rec = AudioRecorder(this)
        try {
            rec.start()
        } catch (e: Exception) {
            toast("Mikrofon nicht verfuegbar")
            return
        }
        recorder = rec
        state = State.RECORDING
        setColor(R.color.recording)
    }

    private fun stopAndProcess() {
        val rec = recorder?.stop()
        recorder = null
        state = State.PROCESSING
        setColor(R.color.processing)

        if (rec == null || rec.durationSec < 0.3) {
            toast("Keine Aufnahme erkannt")
            reset()
            return
        }

        scope.launch {
            val token = AuthManager.getValidAccessToken()
            if (token == null) {
                toast("Bitte in der Blitztext-App einloggen")
                reset()
                return@launch
            }
            DictateClient.dictate(rec, Prefs.workflow, Prefs.language, Prefs.transcriptionModel, token)
                .onSuccess { text -> deliver(text) }
                .onFailure { err ->
                    val m = err.message ?: "Fehler bei der Verarbeitung"
                    if (isQuotaError(m)) showQuotaNotification() else toast(m)
                }
            reset()
        }
    }

    private fun deliver(text: String) {
        val svc = BlitztextAccessibilityService.instance
        if (svc != null && svc.insertText(text)) return
        // Fallback: Zwischenablage
        getSystemService(ClipboardManager::class.java)
            ?.setPrimaryClip(ClipData.newPlainText("blitztext", text))
        toast("Text in Zwischenablage (Bedienungshilfe aktivieren zum direkten Einfuegen)")
    }

    private fun reset() {
        state = State.IDLE
        setColor(R.color.accent)
    }

    private fun setColor(colorRes: Int) {
        binding.overlayRoot.backgroundTintList =
            ColorStateList.valueOf(getColor(colorRes))
    }

    private fun toast(msg: String) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
    }

    private fun isQuotaError(m: String): Boolean {
        val l = m.lowercase()
        return l.contains("quota") || l.contains("billing") || l.contains("insufficient")
    }

    /** Bei aufgebrauchtem OpenAI-Guthaben: Hinweis + Direktlink zum Aufladen. */
    private fun showQuotaNotification() {
        val channelId = "blitztext_alerts"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(
                channelId, "Blitztext Hinweise", NotificationManager.IMPORTANCE_HIGH
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
        }
        val pi = PendingIntent.getActivity(
            this, 0,
            Intent(Intent.ACTION_VIEW, Uri.parse(Links.OPENAI_BILLING))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val notif = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_mic)
            .setContentTitle("Kein OpenAI-Guthaben")
            .setContentText("Guthaben aufgebraucht. Tippen, um Guthaben zu laden.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .addAction(0, "Guthaben laden", pi)
            .build()
        getSystemService(NotificationManager::class.java).notify(2, notif)
        toast("Kein OpenAI-Guthaben - siehe Benachrichtigung")
    }

    private fun startAsForeground() {
        val channelId = "blitztext_overlay"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(
                channelId, "Blitztext", NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
        }
        val notif = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_mic)
            .setContentTitle("Blitztext aktiv")
            .setContentText("Tippe den Knopf zum Diktieren")
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(1, notif)
        }
    }

    override fun onDestroy() {
        isRunning = false
        runCatching { recorder?.stop() }
        runCatching { if (::binding.isInitialized) wm.removeView(binding.root) }
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        const val ACTION_STOP = "ch.avf.blitztext.STOP_OVERLAY"

        @Volatile
        var isRunning = false
    }
}
