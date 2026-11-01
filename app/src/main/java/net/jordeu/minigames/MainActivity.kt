package net.jordeu.minigames

import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import android.os.Bundle
import android.view.KeyEvent
import android.view.WindowManager
import android.webkit.*
import androidx.webkit.WebViewAssetLoader

class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private var ready = false
    private var active = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (!ready) { finish(); return }
                web.evaluateJavascript("window.miniGames?.isMenu()") { result ->
                    if (result == "true") finish() else send("window.miniGames?.input('back')")
                }
            }
        })
        web = WebView(this)
        web.setOnKeyListener { _, _, event -> handleRemoteKey(event) }
        web.setBackgroundColor(0xff0b1220.toInt())
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.allowFileAccess = false
        web.settings.allowContentAccess = false
        web.settings.mediaPlaybackRequiresUserGesture = false
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                return loader.shouldInterceptRequest(request.url)
                    ?: WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", emptyMap(), null)
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val uri = request.url
                return uri.scheme != "https" || uri.host != "appassets.androidplatform.net" || !uri.path.orEmpty().startsWith("/assets/")
            }
            override fun onPageFinished(view: WebView, url: String) {
                ready = true
                if (!active) send("window.miniGames?.suspend()")
            }
        }
        web.webChromeClient = WebChromeClient()
        WebView.setWebContentsDebuggingEnabled(applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0)
        setContentView(web)
        web.requestFocus()
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }
    private fun send(script: String) {
        if (ready) web.evaluateJavascript(script, null)
    }
    private fun handleRemoteKey(event: KeyEvent): Boolean {
        val key = when(event.keyCode) {
            KeyEvent.KEYCODE_DPAD_UP -> "up"
            KeyEvent.KEYCODE_DPAD_DOWN -> "down"
            KeyEvent.KEYCODE_DPAD_LEFT -> "left"
            KeyEvent.KEYCODE_DPAD_RIGHT -> "right"
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> "select"
            else -> return false
        }
        if (event.action == KeyEvent.ACTION_DOWN) {
            if (event.repeatCount == 0) send("window.miniGames?.input('$key')")
            else if (key != "select") send("window.miniGames?.repeatInput('$key')")
        }
        return true
    }
    override fun onResume() {
        super.onResume()
        active = true
        web.onResume()
    }
    override fun onPause() {
        active = false
        send("window.miniGames?.suspend()")
        web.onPause()
        super.onPause()
    }
    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }
}
