package com.justplay.music;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.os.Handler;
import android.os.Looper;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int NOTIFICATION_PERMISSION_REQUEST = 4101;

    @Override
    public void setContentView(int layoutResID) {
        super.setContentView(layoutResID);
        if (layoutResID != com.getcapacitor.android.R.layout.capacitor_bridge_layout_main) {
            return;
        }

        WebView original = findViewById(com.getcapacitor.android.R.id.webview);
        if (original == null || original instanceof BackgroundWebView) {
            return;
        }

        ViewGroup parent = (ViewGroup) original.getParent();
        int index = parent.indexOfChild(original);
        ViewGroup.LayoutParams params = original.getLayoutParams();
        parent.removeView(original);
        original.destroy();

        BackgroundWebView replacement = new BackgroundWebView(this, null);
        replacement.setId(com.getcapacitor.android.R.id.webview);
        parent.addView(replacement, index, params);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        webView.addJavascriptInterface(new PlaybackJs(), "JustPlayNative");
        PlaybackService.setWebView(webView);
    }

    @Override
    public void onPause() {
        super.onPause();
        nudgePlayback();
    }

    @Override
    public void onStop() {
        super.onStop();
        nudgePlayback();
    }

    private void nudgePlayback() {
        if (!BackgroundWebView.keepAudible || getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        if (webView == null) return;
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            if (!BackgroundWebView.keepAudible) return;
            webView.onResume();
            webView.resumeTimers();
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('justplay-command',{detail:'ensure-playing'}))",
                null
            );
        }, 300);
    }

    public class PlaybackJs {
        @JavascriptInterface
        public void setPlaying(boolean playing, String title, String artist) {
            BackgroundWebView.keepAudible = playing;
            runOnUiThread(() -> {
                if (playing) {
                    requestNotificationPermission();
                    Intent intent = new Intent(MainActivity.this, PlaybackService.class);
                    intent.setAction(PlaybackService.ACTION_START);
                    intent.putExtra(PlaybackService.EXTRA_TITLE, title == null ? "" : title);
                    intent.putExtra(PlaybackService.EXTRA_ARTIST, artist == null ? "" : artist);
                    ContextCompat.startForegroundService(MainActivity.this, intent);
                } else {
                    Intent intent = new Intent(MainActivity.this, PlaybackService.class);
                    intent.setAction(PlaybackService.ACTION_STOP);
                    startService(intent);
                }
            });
        }
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            return;
        }
        ActivityCompat.requestPermissions(
            this,
            new String[] { Manifest.permission.POST_NOTIFICATIONS },
            NOTIFICATION_PERMISSION_REQUEST
        );
    }
}
