package com.justplay.music;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.webkit.WebView;
import androidx.core.app.NotificationCompat;
import java.lang.ref.WeakReference;

public class PlaybackService extends Service {

    public static final String ACTION_START = "com.justplay.music.action.START";
    public static final String ACTION_STOP = "com.justplay.music.action.STOP";
    public static final String ACTION_PLAY = "com.justplay.music.action.PLAY";
    public static final String ACTION_PAUSE = "com.justplay.music.action.PAUSE";
    public static final String ACTION_NEXT = "com.justplay.music.action.NEXT";
    public static final String ACTION_PREV = "com.justplay.music.action.PREV";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";

    private static final String CHANNEL_ID = "justplay_playback";
    private static final int NOTIFICATION_ID = 4102;

    private static WeakReference<WebView> webViewRef;

    private MediaSessionCompat mediaSession;
    private PowerManager.WakeLock wakeLock;
    private long ignoreTransportUntil = 0;

    public static void setWebView(WebView webView) {
        webViewRef = new WeakReference<>(webView);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();

        mediaSession = new MediaSessionCompat(this, "JustPlay");
        mediaSession.setActive(true);
        mediaSession.setCallback(
            new MediaSessionCompat.Callback() {
                @Override
                public void onPlay() {
                    if (transportLocked()) return;
                    dispatch("play");
                }

                @Override
                public void onPause() {
                    if (transportLocked()) return;
                    dispatch("pause");
                }

                @Override
                public void onSkipToNext() {
                    dispatch("next");
                }

                @Override
                public void onSkipToPrevious() {
                    dispatch("prev");
                }
            }
        );
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;
        if (ACTION_STOP.equals(action)) {
            BackgroundWebView.keepAudible = false;
            releaseWakeLock();
            try {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } catch (RuntimeException ignored) {
                // Service was not in the foreground yet.
            }
            stopSelf();
            return START_NOT_STICKY;
        }
        if (ACTION_PLAY.equals(action)) {
            dispatch("play");
            return START_STICKY;
        }
        if (ACTION_PAUSE.equals(action)) {
            dispatch("pause");
            return START_STICKY;
        }
        if (ACTION_NEXT.equals(action)) {
            dispatch("next");
            return START_STICKY;
        }
        if (ACTION_PREV.equals(action)) {
            dispatch("prev");
            return START_STICKY;
        }

        String title = intent != null ? intent.getStringExtra(EXTRA_TITLE) : null;
        String artist = intent != null ? intent.getStringExtra(EXTRA_ARTIST) : null;
        if (title == null || title.trim().isEmpty()) {
            title = "JustPlay";
        }
        if (artist == null) {
            artist = "";
        }

        BackgroundWebView.keepAudible = true;
        ignoreTransportUntil = SystemClock.uptimeMillis() + 1500;
        acquireWakeLock();
        updateSession(title, artist, true);
        Notification notification = buildNotification(title, artist);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        BackgroundWebView.keepAudible = false;
        releaseWakeLock();
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void updateSession(String title, String artist, boolean playing) {
        if (mediaSession == null) return;
        mediaSession.setMetadata(
            new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                .build()
        );
        long actions =
            PlaybackStateCompat.ACTION_PLAY |
            PlaybackStateCompat.ACTION_PAUSE |
            PlaybackStateCompat.ACTION_PLAY_PAUSE |
            PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
            PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS;
        int state = playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        mediaSession.setPlaybackState(
            new PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, playing ? 1f : 0f)
                .build()
        );
    }

    private Notification buildNotification(String title, String artist) {
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_music)
            .setContentTitle(title)
            .setContentText(artist)
            .setContentIntent(content)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .addAction(android.R.drawable.ic_media_previous, "Previous", servicePending(ACTION_PREV, 1))
            .addAction(android.R.drawable.ic_media_pause, "Pause", servicePending(ACTION_PAUSE, 2))
            .addAction(android.R.drawable.ic_media_next, "Next", servicePending(ACTION_NEXT, 3))
            .setStyle(
                new androidx.media.app.NotificationCompat.MediaStyle()
                    .setMediaSession(mediaSession.getSessionToken())
                    .setShowActionsInCompactView(0, 1, 2)
            )
            .build();
    }

    private PendingIntent servicePending(String action, int requestCode) {
        Intent intent = new Intent(this, PlaybackService.class);
        intent.setAction(action);
        return PendingIntent.getService(this, requestCode, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Playback",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Shows the song that is playing in the background");
        channel.setSound(null, null);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }

    private boolean transportLocked() {
        return SystemClock.uptimeMillis() < ignoreTransportUntil;
    }

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager == null) return;
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "justplay:playback");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire();
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        wakeLock = null;
    }

    private void dispatch(String command) {
        WebView webView = webViewRef != null ? webViewRef.get() : null;
        if (webView == null) return;
        String js =
            "window.dispatchEvent(new CustomEvent('justplay-command',{detail:'" + command + "'}))";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }
}
