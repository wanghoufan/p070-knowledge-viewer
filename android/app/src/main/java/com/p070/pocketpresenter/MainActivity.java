package com.p070.pocketpresenter;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

/**
 * P070 随身讲解库 — Android host.
 *
 * - Boots the approved web UI from APK-bundled assets (no network, no dev server).
 * - Plays imported videos through Capacitor's local-file URL (measured accurate seeks).
 * - Handles the Android back gesture in the order the product requires:
 *   deck/detail -> list -> (double press) exit.
 */
public class MainActivity extends BridgeActivity {

    private long lastBackAt = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(P070NativePlugin.class);
        super.onCreate(savedInstanceState);

        // Edge-to-edge on Android 15+. The approved UI reads the safe-area insets in CSS
        // (env(safe-area-inset-*)), so the WebView must own the full window.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // The lock-screen playback card (with its play/pause buttons) needs this on Android 13+.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, 9001);
        }

        WebView webView = getBridge().getWebView();
        webView.setBackgroundColor(Color.parseColor("#f7f9f7"));

        // The window is edge-to-edge (Android 15+ enforces it). The status bar stays outside
        // the WebView, but the bottom is NOT padded here: padding the root left a blank strip
        // above the system bar. Instead the nav-bar height is pushed into the page as --sab,
        // so the tab bar paints to the screen edge and its buttons sit above the nav bar.
        final View root = (View) webView.getParent();
        if (root != null) {
            root.setBackgroundColor(Color.parseColor("#f7f9f7"));
            ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
                Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
                v.setPadding(0, bars.top, 0, ime.bottom);
                pushSafeBottom(webView, bars.bottom);
                return insets;
            });
            ViewCompat.requestApplyInsets(root);
            // Page load can finish after the first inset dispatch; push again once ready.
            webView.postDelayed(() -> pushSafeBottom(webView, bottomInsetPx(webView)), 1200);
            webView.postDelayed(() -> pushSafeBottom(webView, bottomInsetPx(webView)), 3000);
        }
    }

    private static int bottomInsetPx(View v) {
        WindowInsetsCompat wi = ViewCompat.getRootWindowInsets(v);
        return wi == null ? 0 : wi.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
    }

    private static void pushSafeBottom(WebView webView, int bottomPx) {
        if (webView == null) return;
        float density = webView.getResources().getDisplayMetrics().density;
        int css = Math.round(bottomPx / density);
        String js = "(function(){document.documentElement.style.setProperty('--sab','" + css + "px');})()";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    /** Keeps the status/navigation bar icons and window background in step with the app theme. */
    static void applySystemBars(Activity activity, boolean dark) {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(activity.getWindow(), activity.getWindow().getDecorView());
        c.setAppearanceLightStatusBars(!dark);
        c.setAppearanceLightNavigationBars(!dark);
        View content = activity.findViewById(android.R.id.content);
        if (content != null) content.setBackgroundColor(Color.parseColor(dark ? "#101713" : "#f7f9f7"));
    }

    /** Screen off: WebView will drop its media pipeline, so start the native audio mirror. */
    @Override
    public void onStop() {
        super.onStop();
        android.os.PowerManager pm = (android.os.PowerManager) getSystemService(POWER_SERVICE);
        boolean screenOff = pm != null && !pm.isInteractive();
        boolean fresh = System.currentTimeMillis() - P070NativePlugin.curSyncedAt < 4000;
        if (screenOff && fresh && P070NativePlugin.curPlaying && P070NativePlugin.curVideoPath != null) {
            PlaybackService.startMirror(this, P070NativePlugin.curVideoPath,
                P070NativePlugin.curPosMs, P070NativePlugin.curTitle, P070NativePlugin.curText);
        }
    }

    /** Back on screen: stop the mirror and let the page resume from the native position. */
    @Override
    public void onResume() {
        super.onResume();
        WebView webView = getBridge() == null ? null : getBridge().getWebView();
        long pos = PlaybackService.positionMs();
        if (pos < 0 || webView == null) return;
        // Read the state before stopping: the user may have paused from the notification
        // or a headset button while the screen was off.
        boolean wasPlaying = PlaybackService.mirroredPlaying();
        PlaybackService.stopMirror(this);
        String js = "(function(){try{window.__p070OnResume&&window.__p070OnResume(" + pos + ","
            + wasPlaying + ");}catch(e){}})()";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    @Override
    public void onConfigurationChanged(android.content.res.Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // Android WebView keeps the old prefers-color-scheme value and fires no change
        // event on uiMode switches, so the page is told to re-evaluate the theme here.
        WebView webView = getBridge() == null ? null : getBridge().getWebView();
        if (webView != null) {
            webView.post(() -> webView.evaluateJavascript(
                "(function(){try{window.__p070ThemeRefresh&&window.__p070ThemeRefresh();}catch(e){}})()", null));
        }
    }

    @Override
    public void onBackPressed() {
        WebView webView = getBridge() == null ? null : getBridge().getWebView();
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        webView.evaluateJavascript(
            "(function(){try{return (window.__p070Back && window.__p070Back()) ? 'true':'false';}catch(e){return 'false';}})()",
            value -> {
                if ("\"true\"".equals(value)) return;
                long now = System.currentTimeMillis();
                if (now - lastBackAt < 2000) {
                    finish();
                } else {
                    lastBackAt = now;
                    Toast.makeText(this, R.string.press_again_to_exit, Toast.LENGTH_SHORT).show();
                }
            });
    }

}
