package com.p070.pocketpresenter;

import android.content.Context;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Locates imported media inside the app's private files directory.
 *
 * Playback goes through Capacitor's own local-file URL (Capacitor.convertFileSrc), which
 * was measured on device to seek accurately in a 610 MB MP4 (5 s and 80% in well under a
 * second). A hand-written byte-range handler was tried first and rejected by this
 * WebView's media stack (every range request retried and stalled), so it is gone.
 *
 * Only files named <sanitized-id>.<known-video-extension> in the private media directory
 * are ever handed out.
 */
final class MediaFiles {

    static final String HOST = "localhost";
    static final String PREFIX = "/_p070media/";

    private static final String[] EXTS = { "mp4", "webm", "mov", "m4v", "3gp" };

    private MediaFiles() {}

    static File mediaDir(Context ctx) {
        File dir = new File(ctx.getFilesDir(), "p070/media");
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    static File slidesDir(Context ctx) {
        File dir = new File(ctx.getFilesDir(), "p070/slides");
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    static boolean isSafeId(String id) {
        return id != null && id.matches("[A-Za-z0-9_-]{1,100}");
    }

    static boolean isSafeExt(String ext) {
        if (ext == null) return false;
        String e = ext.toLowerCase(Locale.US);
        for (String ok : EXTS) if (ok.equals(e)) return true;
        return false;
    }

    static String extOf(String mime, String name) {
        String m = mime == null ? "" : mime.toLowerCase(Locale.US);
        if (m.contains("webm")) return "webm";
        if (m.contains("quicktime")) return "mov";
        if (m.contains("3gpp")) return "3gp";
        if (m.contains("mp4")) return "mp4";
        String n = name == null ? "" : name.toLowerCase(Locale.US);
        for (String ok : EXTS) if (n.endsWith("." + ok)) return ok;
        return "mp4";
    }

    static String mimeOf(String ext) {
        String e = ext == null ? "mp4" : ext.toLowerCase(Locale.US);
        switch (e) {
            case "webm": return "video/webm";
            case "mov": return "video/quicktime";
            case "m4v": return "video/x-m4v";
            case "3gp": return "video/3gpp";
            default: return "video/mp4";
        }
    }

    /** Finds the stored video for an id, or null. */
    static File findVideo(Context ctx, String id) {
        if (!isSafeId(id)) return null;
        for (String ext : EXTS) {
            File f = new File(mediaDir(ctx), id + "." + ext);
            if (f.isFile()) return f;
        }
        return null;
    }

    /** Reads at most {@code max} bytes of a text file, tolerating UTF-8 (with/without BOM). */
    static String readText(File file, long max) throws IOException {
        try (InputStream in = new FileInputStream(file)) {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[64 * 1024];
            long read = 0;
            int n;
            while (read < max && (n = in.read(buf)) > 0) {
                int take = (int) Math.min(n, max - read);
                out.write(buf, 0, take);
                read += take;
            }
            byte[] bytes = out.toByteArray();
            String s = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
            if (!s.isEmpty() && s.charAt(0) == '\uFEFF') s = s.substring(1);
            return s;
        }
    }
}
