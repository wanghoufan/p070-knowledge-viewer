package com.p070.pocketpresenter;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import androidx.core.app.NotificationCompat;

import java.io.File;

/**
 * Keeps a local video audible while the screen is off.
 *
 * Android WebView pauses and tears down its media pipeline when the window is not
 * visible, so a playing {@code <video>} cannot survive lock on its own. This service
 * therefore decodes the same local mp4 natively (audio only, no surface) and holds a
 * partial wake lock, so sound continues while the screen is off. The page mutes the
 * {@code <video>} during that window and, on unlock, seeks back to
 * {@link #positionMs()} and resumes rendering.
 *
 * Playback can also be paused/resumed from the notification or from a headset/Bluetooth
 * media button ({@link MediaSession.Callback}); the page picks that state up on unlock.
 *
 * No media bytes are copied and no network is involved.
 */
public class PlaybackService extends Service {

    public static final String ACTION_START = "com.p070.pocketpresenter.PLAYBACK_START";
    public static final String ACTION_STOP = "com.p070.pocketpresenter.PLAYBACK_STOP";
    public static final String ACTION_TOGGLE = "com.p070.pocketpresenter.PLAYBACK_TOGGLE";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_TEXT = "text";
    public static final String EXTRA_PATH = "path";
    public static final String EXTRA_POSITION = "position";

    /** v2: IMPORTANCE_LOW hid the card on the lock screen, so the buttons were unreachable. */
    private static final String CHANNEL_ID = "p070_playback_v2";
    private static final int NOTIFICATION_ID = 20261120;

    private static volatile PlaybackService instance;

    private PowerManager.WakeLock wakeLock;
    private MediaSessionCompat mediaSession;
    private MediaPlayer player;
    private final Handler ticker = new Handler(Looper.getMainLooper());
    private String title = "";
    private String text = "";

    /** Starts the audio mirror from the host activity (screen-off handover). */
    public static void startMirror(Context ctx, String path, int position, String title, String text) {
        Intent i = new Intent(ctx, PlaybackService.class);
        i.setAction(ACTION_START);
        i.putExtra(EXTRA_TITLE, title);
        i.putExtra(EXTRA_TEXT, text);
        i.putExtra(EXTRA_PATH, path);
        i.putExtra(EXTRA_POSITION, position);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i);
        else ctx.startService(i);
    }

    /** Stops the mirror; the caller reads {@link #positionMs()} first if it needs the spot. */
    public static void stopMirror(Context ctx) {
        Intent i = new Intent(ctx, PlaybackService.class);
        i.setAction(ACTION_STOP);
        ctx.stopService(i);
    }

    /** Current native playback position in ms, or -1 when nothing is mirrored. */
    public static long positionMs() {
        PlaybackService s = instance;
        MediaPlayer p = s == null ? null : s.player;
        if (p == null) return -1;
        try {
            return p.getCurrentPosition();
        } catch (IllegalStateException e) {
            return -1;
        }
    }

    /** True when the mirror is still actually playing (used to decide whether to resume). */
    public static boolean mirroredPlaying() {
        PlaybackService s = instance;
        MediaPlayer p = s == null ? null : s.player;
        if (p == null) return false;
        try {
            return p.isPlaying();
        } catch (IllegalStateException e) {
            return false;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createChannel();
        initMediaSession();
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, getPackageName() + ":playback");
            wakeLock.setReferenceCounted(false);
            if (!wakeLock.isHeld()) wakeLock.acquire();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (intent == null || ACTION_STOP.equals(action)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (ACTION_TOGGLE.equals(action)) {
            toggle();
            return START_STICKY;
        }

        String t = intent.getStringExtra(EXTRA_TITLE);
        if (t == null || t.isEmpty()) t = getString(R.string.app_name);
        String x = intent.getStringExtra(EXTRA_TEXT);
        if (x == null || x.isEmpty()) x = getString(R.string.playback_notification);
        title = t;
        text = x;

        String path = intent.getStringExtra(EXTRA_PATH);
        int position = intent.getIntExtra(EXTRA_POSITION, 0);

        pushSessionState();
        startForegroundCompat(buildNotification());
        Log.i(TAG, "onStart action=" + action + " path=" + path + " pos=" + position);
        if (path != null && !path.isEmpty()) startAudio(new File(path), position);
        return START_STICKY;
    }

    private static final String TAG = "P070Playback";

    /** Plays the file's audio track natively; video frames are decoded away without a surface. */
    private void startAudio(File file, int position) {
        releasePlayer();
        Log.i(TAG, "startAudio exists=" + file.isFile() + " " + file.getAbsolutePath());
        if (!file.isFile()) return;
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE)
                .build());
            player.setDataSource(file.getAbsolutePath());
            final int seekTo = Math.max(0, position);
            player.setOnPreparedListener(mp -> {
                Log.i(TAG, "prepared duration=" + mp.getDuration() + " seek=" + seekTo);
                if (seekTo > 0) mp.seekTo(seekTo);
                mp.start();
                onPlaybackChanged();
                startTicker();
            });
            player.setOnCompletionListener(mp -> stopSelf());
            player.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "player error what=" + what + " extra=" + extra);
                releasePlayer();
                return true;
            });
            player.prepareAsync();
        } catch (Exception e) {
            Log.e(TAG, "startAudio failed", e);
            releasePlayer();
        }
    }

    private boolean playing() {
        try {
            return player != null && player.isPlaying();
        } catch (IllegalStateException e) {
            return false;
        }
    }

    /** Notification button / headset key: flip between play and pause. */
    private void toggle() {
        Log.i(TAG, "toggle called player=" + (player != null));
        if (player == null) return;
        try {
            if (player.isPlaying()) {
                player.pause();
            } else {
                player.start();
            }
            onPlaybackChanged();
        } catch (IllegalStateException e) {
            Log.e(TAG, "toggle failed", e);
        }
    }

    /** Keeps notification and media session in step after any play/pause. */
    private void onPlaybackChanged() {
        pushSessionState();
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification());
        if (playing()) startTicker();
        else ticker.removeCallbacksAndMessages(null);
    }

    private void pushSessionState() {
        if (mediaSession == null) return;
        try {
            MediaMetadataCompat.Builder md = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, text);
            if (player != null) {
                md.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, player.getDuration());
            }
            mediaSession.setMetadata(md.build());
            mediaSession.setPlaybackState(playbackState());
            mediaSession.setActive(true);
        } catch (IllegalStateException ignored) {
        }
    }

    private PlaybackStateCompat playbackState() {
        long pos = Math.max(0, positionMs());
        return new PlaybackStateCompat.Builder()
            .setActions(PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE
                | PlaybackStateCompat.ACTION_PLAY_PAUSE | PlaybackStateCompat.ACTION_STOP
                | PlaybackStateCompat.ACTION_SEEK_TO)
            .setState(playing() ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                pos, 1f)
            .build();
    }

    private void startTicker() {
        ticker.removeCallbacksAndMessages(null);
        ticker.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (player != null && mediaSession != null) {
                    try {
                        mediaSession.setPlaybackState(playbackState());
                    } catch (IllegalStateException ignored) {
                    }
                    ticker.postDelayed(this, 2000);
                }
            }
        }, 2000);
    }

    private void releasePlayer() {
        ticker.removeCallbacksAndMessages(null);
        if (player != null) {
            try {
                if (player.isPlaying()) player.stop();
            } catch (IllegalStateException ignored) {
            }
            player.release();
            player = null;
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL_ID,
            getString(R.string.playback_channel), NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription(getString(R.string.playback_notification));
        ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        ch.setShowBadge(false);
        ch.setSound(null, null);
        ch.enableVibration(false);
        nm.createNotificationChannel(ch);
    }

    private void initMediaSession() {
        mediaSession = new MediaSessionCompat(this, "p070_playback");
        mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS
            | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                if (player != null && !playing()) toggle();
            }

            @Override
            public void onPause() {
                if (playing()) toggle();
            }

            @Override
            public void onStop() {
                stopSelf();
            }

            @Override
            public void onSeekTo(long pos) {
                if (player == null) return;
                try {
                    player.seekTo((int) Math.max(0, pos));
                    onPlaybackChanged();
                } catch (IllegalStateException ignored) {
                }
            }
        });
    }

    private void startForegroundCompat(Notification notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private Notification buildNotification() {
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
            ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            : PendingIntent.FLAG_UPDATE_CURRENT;
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, open, flag);

        Intent toggle = new Intent(this, PlaybackService.class);
        toggle.setAction(ACTION_TOGGLE);
        PendingIntent toggleIntent = PendingIntent.getService(this, 2, toggle, flag);

        Intent stop = new Intent(this, PlaybackService.class);
        stop.setAction(ACTION_STOP);
        PendingIntent deleteIntent = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? PendingIntent.getForegroundService(this, 1, stop, flag)
            : PendingIntent.getService(this, 1, stop, flag);

        boolean isPlaying = playing();
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_playback)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(contentIntent)
            .setDeleteIntent(deleteIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(isPlaying ? R.drawable.ic_pause : R.drawable.ic_play,
                getString(isPlaying ? R.string.playback_pause : R.string.playback_play), toggleIntent)
            .addAction(R.drawable.ic_stop, getString(R.string.playback_stop), deleteIntent);
        // MediaStyle puts a real media card on the lock screen (with progress and buttons);
        // headset keys route through the same MediaSession.
        if (mediaSession != null) {
            b.setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1));
        }
        return b.build();
    }

    @Override
    public void onDestroy() {
        releasePlayer();
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        wakeLock = null;
        if (mediaSession != null) {
            mediaSession.setCallback(null);
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        if (instance == this) instance = null;
        stopForeground(true);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
