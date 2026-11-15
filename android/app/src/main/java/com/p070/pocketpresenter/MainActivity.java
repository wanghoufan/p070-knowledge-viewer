package com.p070.pocketpresenter;

import android.app.Activity;
import android.graphics.Color;
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

        WebView webView = getBridge().getWebView();
        webView.setBackgroundColor(Color.parseColor("#f7f9f7"));

        // The window is edge-to-edge (Android 15+ enforces it), so the safe area is applied
        // to the WebView container instead of relying on CSS env() support in the WebView.
        final View root = (View) webView.getParent();
        if (root != null) {
            root.setBackgroundColor(Color.parseColor("#f7f9f7"));
            ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
                Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
                v.setPadding(0, bars.top, 0, Math.max(bars.bottom, ime.bottom));
                return insets;
            });
            ViewCompat.requestApplyInsets(root);
        }
    }

    /** Keeps the status/navigation bar icons and window background in step with the app theme. */
    static void applySystemBars(Activity activity, boolean dark) {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(activity.getWindow(), activity.getWindow().getDecorView());
        c.setAppearanceLightStatusBars(!dark);
        c.setAppearanceLightNavigationBars(!dark);
        View content = activity.findViewById(android.R.id.content);
        if (content != null) content.setBackgroundColor(Color.parseColor(dark ? "#101713" : "#f7f9f7"));
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
