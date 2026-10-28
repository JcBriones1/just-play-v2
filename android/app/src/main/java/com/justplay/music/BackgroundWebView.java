package com.justplay.music;

import android.content.Context;
import android.util.AttributeSet;
import android.view.View;
import com.getcapacitor.CapacitorWebView;

/**
 * Keeps the WebView audible after the user leaves the app.
 * Android otherwise tells Chromium the window is gone, and the YouTube player pauses.
 */
public class BackgroundWebView extends CapacitorWebView {

    public static volatile boolean keepAudible = false;

    public BackgroundWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    protected void onWindowVisibilityChanged(int visibility) {
        if (keepAudible && visibility != View.VISIBLE) {
            super.onWindowVisibilityChanged(View.VISIBLE);
            return;
        }
        super.onWindowVisibilityChanged(visibility);
    }
}
