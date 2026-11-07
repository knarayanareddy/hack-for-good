package org.acaps.groundtruth

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.webkit.CookieManager
import android.webkit.JsPromptResult
import android.webkit.JsResult
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import org.acaps.groundtruth.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: SharedPreferences

    companion object {
        private const val PREFS_NAME = "ground_truth_prefs"
        private const val KEY_SERVER_URL = "server_url"
        private const val DEFAULT_WIFI_URL = "http://10.59.249.65:3000"
        private const val ALT_WIFI_URL = "http://145.94.89.206:3000"
        private const val DEFAULT_EMULATOR_URL = "http://10.0.2.2:3000"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        setupWebView()
        setupSwipeRefresh()
        setupBackNavigation()
        setupButtons()

        val initialUrl = getServerUrl()
        loadUrl(initialUrl)
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()
    }

    private fun isEmulator(): Boolean {
        return (Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
                || "google_sdk" == Build.PRODUCT)
    }

    private fun getServerUrl(): String {
        val fallback = if (isEmulator()) DEFAULT_EMULATOR_URL else DEFAULT_WIFI_URL
        return prefs.getString(KEY_SERVER_URL, fallback) ?: fallback
    }

    private fun saveServerUrl(url: String) {
        val cleanUrl = if (!url.startsWith("http://") && !url.startsWith("https://")) {
            "http://$url"
        } else {
            url
        }
        prefs.edit().putString(KEY_SERVER_URL, cleanUrl).apply()
        loadUrl(cleanUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val webView = binding.webView
        val settings = webView.settings

        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        @Suppress("DEPRECATION")
        settings.databaseEnabled = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.setSupportZoom(true)
        settings.builtInZoomControls = true
        settings.displayZoomControls = false
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.userAgentString = "${settings.userAgentString} GroundTruthMobileApp/1.0"

        // Enable cookie persistence for Next.js HMAC session cookies
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    binding.progressBar.visibility = View.VISIBLE
                    binding.progressBar.progress = newProgress
                } else {
                    binding.progressBar.visibility = View.GONE
                    binding.swipeRefresh.isRefreshing = false
                }
            }

            override fun onJsAlert(
                view: WebView?,
                url: String?,
                message: String?,
                result: JsResult?
            ): Boolean {
                MaterialAlertDialogBuilder(this@MainActivity)
                    .setTitle("Ground Truth Circle")
                    .setMessage(message ?: "")
                    .setPositiveButton(android.R.string.ok) { dialog, _ ->
                        result?.confirm()
                        dialog.dismiss()
                    }
                    .setOnCancelListener {
                        result?.cancel()
                    }
                    .show()
                return true
            }

            override fun onJsConfirm(
                view: WebView?,
                url: String?,
                message: String?,
                result: JsResult?
            ): Boolean {
                MaterialAlertDialogBuilder(this@MainActivity)
                    .setTitle("Confirmation")
                    .setMessage(message ?: "")
                    .setPositiveButton(android.R.string.ok) { dialog, _ ->
                        result?.confirm()
                        dialog.dismiss()
                    }
                    .setNegativeButton(android.R.string.cancel) { dialog, _ ->
                        result?.cancel()
                        dialog.dismiss()
                    }
                    .setOnCancelListener {
                        result?.cancel()
                    }
                    .show()
                return true
            }

            override fun onJsPrompt(
                view: WebView?,
                url: String?,
                message: String?,
                defaultValue: String?,
                result: JsPromptResult?
            ): Boolean {
                val input = EditText(this@MainActivity).apply {
                    setText(defaultValue ?: "")
                }
                MaterialAlertDialogBuilder(this@MainActivity)
                    .setTitle(message ?: "Enter Value")
                    .setView(input)
                    .setPositiveButton(android.R.string.ok) { dialog, _ ->
                        result?.confirm(input.text.toString())
                        dialog.dismiss()
                    }
                    .setNegativeButton(android.R.string.cancel) { dialog, _ ->
                        result?.cancel()
                        dialog.dismiss()
                    }
                    .setOnCancelListener {
                        result?.cancel()
                    }
                    .show()
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                return if (url.startsWith("http://") || url.startsWith("https://")) {
                    false // let WebView handle web navigation internally
                } else {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                    } catch (_: Exception) {}
                    true
                }
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                binding.errorLayout.visibility = View.GONE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                binding.swipeRefresh.isRefreshing = false
                CookieManager.getInstance().flush()
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                // Only show full error layout if main frame failed
                if (request?.isForMainFrame == true) {
                    binding.swipeRefresh.isRefreshing = false
                    val currentTarget = getServerUrl()
                    binding.tvTargetUrl.text = currentTarget
                    binding.errorLayout.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.setColorSchemeResources(
            R.color.acaps_gold,
            R.color.acaps_blue,
            R.color.acaps_navy
        )
        binding.swipeRefresh.setOnRefreshListener {
            binding.webView.reload()
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.webView.canGoBack()) {
                    binding.webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun setupButtons() {
        binding.btnRetry.setOnClickListener {
            binding.errorLayout.visibility = View.GONE
            binding.webView.reload()
        }

        binding.btnConfigureServer.setOnClickListener {
            showServerConfigDialog()
        }

        binding.fabSettings.setOnClickListener {
            showServerConfigDialog()
        }
    }

    private fun loadUrl(url: String) {
        binding.errorLayout.visibility = View.GONE
        binding.progressBar.visibility = View.VISIBLE
        binding.progressBar.progress = 10
        binding.webView.loadUrl(url)
    }

    private fun showServerConfigDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_server_url, null)
        val etUrl = dialogView.findViewById<EditText>(R.id.etServerUrl)
        val btnWifiCurrent = dialogView.findViewById<Button>(R.id.btnPresetWifiCurrent)
        val btnEmulator = dialogView.findViewById<Button>(R.id.btnPresetEmulator)
        val btnWifiAlt = dialogView.findViewById<Button>(R.id.btnPresetWifiAlt)

        val currentUrl = getServerUrl()
        etUrl.setText(currentUrl)

        btnWifiCurrent.setOnClickListener {
            etUrl.setText(DEFAULT_WIFI_URL)
        }

        btnEmulator.setOnClickListener {
            etUrl.setText(DEFAULT_EMULATOR_URL)
        }

        btnWifiAlt.setOnClickListener {
            etUrl.setText(ALT_WIFI_URL)
        }

        MaterialAlertDialogBuilder(this)
            .setView(dialogView)
            .setPositiveButton(R.string.btn_save) { dialog, _ ->
                val input = etUrl.text.toString().trim()
                if (input.isNotEmpty()) {
                    saveServerUrl(input)
                }
                dialog.dismiss()
            }
            .setNegativeButton(R.string.btn_cancel) { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }
}
