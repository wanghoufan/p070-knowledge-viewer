package com.p070.pocketpresenter;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Isolated viewer for an imported single-file HTML deck.
 *
 * Security contract (AC-08 / AC-09 / FR-04):
 *  - The deck runs in its own Activity and its own WebView.
 *  - No Capacitor bridge, no addJavascriptInterface, no file/content access.
 *  - Its origin (p070slides.local) is distinct from the app origin, so it cannot read
 *    the app's IndexedDB or localStorage.
 *  - Every request other than the one deck file is refused, so a deck referencing the
 *    network, local files or app storage cannot load anything.
 *  - The app declares no INTERNET permission, so even a bypass has no network path.
 */
public class SlideActivity extends Activity {

    private static final String HOST = "p070slides.local";
    private static final String DECK_PREFIX = "/deck/";
    private static final long FAIL_TIMEOUT_MS = 12000;

    private WebView web;
    private String deckId;
    private boolean dark;
    private boolean immersive;
    private boolean pageLoaded;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable deckVideoPoll = new Runnable() {
        @Override
        public void run() {
            if (web == null) return;
            web.evaluateJavascript(
                "(function(){var v=document.querySelector('video');return !!(v&&!v.paused&&!v.ended&&!v.error);})()",
                value -> {
                    if (getWindow() == null) return;
                    if ("true".equals(value)) {
                        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    } else {
                        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    }
                });
            handler.postDelayed(this, 1000);
        }
    };

    private LinearLayout topBar;
    private LinearLayout bottomBar;
    private LinearLayout errorBox;
    private TextView count;
    private Button fullBtn;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        deckId = getIntent().getStringExtra("id");
        String title = getIntent().getStringExtra("title");
        dark = "dark".equals(getIntent().getStringExtra("theme"));
        String labelBack = getIntent().getStringExtra("labelBack");
        String labelFull = getIntent().getStringExtra("labelFull");
        String labelExitFull = getIntent().getStringExtra("labelExitFull");
        String labelError = getIntent().getStringExtra("labelError");
        String labelErrorBody = getIntent().getStringExtra("labelErrorBody");
        String labelBackShort = getIntent().getStringExtra("labelBackShort");

        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        setContentView(R.layout.activity_slide);

        topBar = findViewById(R.id.slide_topbar);
        bottomBar = findViewById(R.id.slide_bottombar);
        errorBox = findViewById(R.id.slide_error);
        count = findViewById(R.id.slide_count);
        fullBtn = findViewById(R.id.slide_full);

        Button back = findViewById(R.id.slide_back);
        back.setText(labelBack == null ? "‹" : labelBack);
        fullBtn.setText(labelFull == null ? "" : labelFull);
        ((TextView) findViewById(R.id.slide_title)).setText(title == null ? "" : title);
        ((TextView) findViewById(R.id.slide_error_title)).setText(labelError == null ? "" : labelError);
        ((TextView) findViewById(R.id.slide_error_body)).setText(labelErrorBody == null ? "" : labelErrorBody);
        Button errBack = findViewById(R.id.slide_error_back);
        errBack.setText(labelBackShort == null ? "" : labelBackShort);

        final String exitFullLabel = labelExitFull == null ? "" : labelExitFull;
        final String fullLabel = labelFull == null ? "" : labelFull;

        back.setOnClickListener(v -> finish());
        errBack.setOnClickListener(v -> finish());
        fullBtn.setOnClickListener(v -> setImmersive(!immersive, fullLabel, exitFullLabel));
        findViewById(R.id.slide_prev).setOnClickListener(v -> step("prev"));
        findViewById(R.id.slide_next).setOnClickListener(v -> step("next"));

        applyPalette();
        applyInsets();

        web = findViewById(R.id.slide_web);
        configureWebView();
        web.loadUrl("https://" + HOST + DECK_PREFIX + deckId + "?v=" + System.currentTimeMillis());

        handler.postDelayed(() -> {
            if (!pageLoaded) showError();
        }, FAIL_TIMEOUT_MS);
    }

    private void configureWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setBlockNetworkLoads(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setGeolocationEnabled(false);
        s.setSaveFormData(false);
        // No addJavascriptInterface() call anywhere in this Activity, by design.

        web.setBackgroundColor(dark ? Color.parseColor("#101713") : Color.parseColor("#ffffff"));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                try {
                    android.net.Uri uri = request.getUrl();
                    if (uri != null
                        && HOST.equals(uri.getHost())
                        && uri.getPath() != null
                        && uri.getPath().equals(DECK_PREFIX + deckId)) {
                        File deck = new File(MediaFiles.slidesDir(SlideActivity.this), deckId + ".html");
                        if (deck.isFile()) {
                            InputStream in = new FileInputStream(deck);
                            Map<String, String> headers = new HashMap<>();
                            headers.put("Cache-Control", "no-store");
                            headers.put("X-Content-Type-Options", "nosniff");
                            return new WebResourceResponse("text/html", "utf-8", 200, "OK", headers, in);
                        }
                    }
                } catch (Exception ignored) {
                }
                // Everything else (network, file:, app origin, other decks) is refused.
                return new WebResourceResponse("text/plain", "utf-8", 403, "Blocked", new HashMap<>(),
                    new java.io.ByteArrayInputStream(new byte[0]));
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                blockedNavigation();
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageLoaded = true;
                handler.postDelayed(() -> refreshPageCount(), 350);
                handler.removeCallbacks(deckVideoPoll);
                handler.post(deckVideoPoll);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request != null && request.isForMainFrame()) showError();
            }
        });
    }

    private void blockedNavigation() {
        Toast.makeText(this, dark ? "Links inside the deck are blocked" : "课件内的外部跳转已被阻止", Toast.LENGTH_SHORT).show();
    }

    private void step(String dir) {
        String key = "next".equals(dir) ? "ArrowRight" : "ArrowLeft";
        String js = "(function(){var e=new KeyboardEvent('keydown',{key:'" + key + "',code:'" + key
            + "',keyCode:" + ("next".equals(dir) ? 39 : 37) + ",which:" + ("next".equals(dir) ? 39 : 37)
            + ",bubbles:true,cancelable:true});document.dispatchEvent(e);"
            + "try{if(window.Reveal){Reveal.'" + ("next".equals(dir) ? "next" : "prev") + "();}}catch(_){ }"
            + "})()";
        web.evaluateJavascript(js, v -> handler.postDelayed(this::refreshPageCount, 320));
    }

    private void refreshPageCount() {
        String js = "(function(){try{"
            + "if(window.Reveal&&Reveal.getTotalSlides){var i=Reveal.getIndices();return JSON.stringify({i:(i.h||0)+1,n:Reveal.getTotalSlides()});}"
            + "var s=document.querySelectorAll('section.slide, .slide, [data-page]');"
            + "return JSON.stringify({i:0,n:s.length});"
            + "}catch(e){return JSON.stringify({i:0,n:0});}})()";
        web.evaluateJavascript(js, value -> {
            if (count == null) return;
            try {
                String json = value;
                if (json != null && json.startsWith("\"") && json.endsWith("\"")) {
                    json = json.substring(1, json.length() - 1).replace("\\\"", "\"").replace("\\\\", "\\");
                }
                JSONObject o = new JSONObject(json);
                int n = o.optInt("n", 0);
                int i = o.optInt("i", 0);
                if (n <= 0) {
                    count.setText("");
                } else if (i > 0) {
                    count.setText(i + " / " + n);
                } else {
                    count.setText(String.valueOf(n));
                }
            } catch (Exception ignored) {
                count.setText("");
            }
        });
    }

    private void showError() {
        pageLoaded = true;
        if (errorBox == null) return;
        errorBox.setVisibility(View.VISIBLE);
        if (web != null) web.setVisibility(View.GONE);
        if (topBar != null) topBar.setVisibility(View.GONE);
        if (bottomBar != null) bottomBar.setVisibility(View.GONE);
    }

    private void setImmersive(boolean on, String fullLabel, String exitFullLabel) {
        immersive = on;
        topBar.setVisibility(on ? View.GONE : View.VISIBLE);
        bottomBar.setVisibility(on ? View.GONE : View.VISIBLE);
        fullBtn.setText(on ? exitFullLabel : fullLabel);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (on) {
            c.hide(WindowInsetsCompat.Type.systemBars());
            c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        } else {
            c.show(WindowInsetsCompat.Type.systemBars());
        }
    }

    private void applyInsets() {
        View root = findViewById(R.id.slide_root);
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            topBar.setPaddingRelative(topBar.getPaddingStart(), 8 + bars.top, topBar.getPaddingEnd(), 8);
            bottomBar.setPaddingRelative(bottomBar.getPaddingStart(), 8, bottomBar.getPaddingEnd(), 8 + bars.bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(root);
    }

    private void applyPalette() {
        int bg = Color.parseColor(dark ? "#101713" : "#f7f9f7");
        int paper = Color.parseColor(dark ? "#1a2520" : "#ffffff");
        int ink = Color.parseColor(dark ? "#eef5ef" : "#10231c");
        int text = Color.parseColor(dark ? "#d2e0d5" : "#23362e");

        findViewById(R.id.slide_root).setBackgroundColor(bg);
        topBar.setBackgroundColor(paper);
        bottomBar.setBackgroundColor(paper);
        errorBox.setBackgroundColor(bg);

        int btnBg = Color.parseColor(dark ? "#23372c" : "#ecf5ef");
        ((Button) findViewById(R.id.slide_back)).setTextColor(ink);
        ((Button) findViewById(R.id.slide_prev)).setTextColor(ink);
        ((Button) findViewById(R.id.slide_next)).setTextColor(ink);
        fullBtn.setTextColor(ink);
        ((TextView) findViewById(R.id.slide_title)).setTextColor(ink);
        count.setTextColor(text);
        ((TextView) findViewById(R.id.slide_error_title)).setTextColor(ink);
        ((TextView) findViewById(R.id.slide_error_body)).setTextColor(Color.parseColor(dark ? "#9cb2a4" : "#718278"));
        findViewById(R.id.slide_topbar).setBackgroundColor(paper);
        findViewById(R.id.slide_bottombar).setBackgroundColor(paper);
        for (int id : new int[] { R.id.slide_back, R.id.slide_full, R.id.slide_prev, R.id.slide_next }) {
            Button b = findViewById(id);
            b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(btnBg));
        }
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
    }

    @Override
    public void onBackPressed() {
        if (immersive) {
            setImmersive(false, "", "");
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (web != null) {
            web.stopLoading();
            web.loadUrl("about:blank");
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
