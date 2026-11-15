package com.p070.pocketpresenter;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.StatFs;
import android.provider.OpenableColumns;
import android.webkit.WebSettings;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.Locale;

/**
 * P070 native capabilities: SAF import with streaming copy into private persistent
 * storage, media URL for the app WebView, isolated deck viewer, share sheet, clipboard,
 * external link handoff, and storage facts.
 *
 * No video byte ever crosses the JS bridge. No INTERNET permission is declared.
 */
@CapacitorPlugin(name = "P070Native")
public class P070NativePlugin extends Plugin {

    private static final long MAX_TEXT_BYTES = 8L * 1024 * 1024;
    private static final long MAX_HTML_BYTES = 40L * 1024 * 1024;
    private static final int COPY_BUFFER = 256 * 1024;

    private static volatile boolean cancelRequested = false;

    @Override
    public void load() {
        // Any leftover .partial file is an interrupted import; it was never announced
        // as cached, so removing it is safe and keeps the storage numbers honest.
        File[] leftovers = MediaFiles.mediaDir(getContext()).listFiles();
        if (leftovers != null) {
            for (File f : leftovers) {
                if (f.getName().endsWith(".partial")) f.delete();
            }
        }
    }

    /* ------------------------------------------------------------------ pickers */

    @PluginMethod
    public void importManifest(final PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            i.putExtra(Intent.EXTRA_MIME_TYPES, new String[] {
                "application/json", "text/plain", "application/octet-stream", "text/*"
            });
            startActivityForResult(call, i, "onManifestPicked");
        });
    }

    @ActivityCallback
    private void onManifestPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null
            || result.getData().getData() == null) {
            resolveCanceled(call);
            return;
        }
        Uri uri = result.getData().getData();
        try {
            String name = displayName(uri);
            File tmp = new File(getContext().getCacheDir(), "manifest-import.json");
            copyToFile(uri, tmp, null);
            String text = MediaFiles.readText(tmp, MAX_TEXT_BYTES);
            tmp.delete();
            JSObject out = new JSObject();
            out.put("canceled", false);
            out.put("name", name);
            out.put("text", text);
            call.resolve(out);
        } catch (Exception e) {
            call.reject("无法读取该 JSON 文件：" + msg(e), "P070_READ_FAILED");
        }
    }

    @PluginMethod
    public void importVideo(final PluginCall call) {
        final String id = call.getString("id");
        if (!MediaFiles.isSafeId(id)) {
            call.reject("资料标识无效", "P070_BAD_ID");
            return;
        }
        getActivity().runOnUiThread(() -> {
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("video/*");
            startActivityForResult(call, i, "onVideoPicked");
        });
    }

    @ActivityCallback
    private void onVideoPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null
            || result.getData().getData() == null) {
            resolveCanceled(call);
            return;
        }
        final Uri uri = result.getData().getData();
        final String id = call.getString("id");
        cancelRequested = false;

        new Thread(() -> {
            File partial = null;
            try {
                String name = displayName(uri);
                String mime = getContext().getContentResolver().getType(uri);
                String ext = MediaFiles.extOf(mime, name);
                long total = sizeOf(uri);
                if (total > 0) {
                    StatFs stat = new StatFs(getContext().getFilesDir().getAbsolutePath());
                    long free = stat.getAvailableBytes();
                    if (free < total + 32L * 1024 * 1024) {
                        JSObject d = new JSObject();
                        d.put("need", total);
                        d.put("free", free);
                        call.reject("手机可用空间不足", "P070_NO_SPACE", d);
                        return;
                    }
                }

                File target = new File(MediaFiles.mediaDir(getContext()), id + "." + ext);
                partial = new File(target.getPath() + ".partial");
                long copied = copyToFile(uri, partial, id);

                if (cancelRequested) {
                    partial.delete();
                    resolveCanceled(call);
                    return;
                }
                if (copied <= 0) {
                    partial.delete();
                    call.reject("文件为空或无法读取", "P070_EMPTY_FILE");
                    return;
                }
                if (total > 0 && copied != total) {
                    partial.delete();
                    call.reject("写入字节数与源文件不一致（" + copied + " / " + total + "）", "P070_SIZE_MISMATCH");
                    return;
                }
                // Replace any previous file of this id (all extensions) only after a verified copy.
                if (!partial.renameTo(target)) {
                    partial.delete();
                    call.reject("保存失败", "P070_RENAME_FAILED");
                    return;
                }
                removeOtherVideoFiles(id, target.getName());
                JSObject out = new JSObject();
                out.put("canceled", false);
                out.put("bytes", target.length());
                out.put("name", name);
                out.put("ext", ext);
                out.put("mime", MediaFiles.mimeOf(ext));
                call.resolve(out);
            } catch (Exception e) {
                if (partial != null) partial.delete();
                call.reject("保存视频失败：" + msg(e), "P070_COPY_FAILED");
            }
        }, "p070-import-video").start();
    }

    @PluginMethod
    public void cancelImport(PluginCall call) {
        cancelRequested = true;
        call.resolve(new JSObject().put("ok", true));
    }

    @PluginMethod
    public void importSlides(final PluginCall call) {
        final String id = call.getString("id");
        if (!MediaFiles.isSafeId(id)) {
            call.reject("资料标识无效", "P070_BAD_ID");
            return;
        }
        getActivity().runOnUiThread(() -> {
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            i.putExtra(Intent.EXTRA_MIME_TYPES, new String[] {
                "text/html", "application/xhtml+xml", "text/plain", "application/octet-stream"
            });
            startActivityForResult(call, i, "onSlidesPicked");
        });
    }

    @ActivityCallback
    private void onSlidesPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null
            || result.getData().getData() == null) {
            resolveCanceled(call);
            return;
        }
        final Uri uri = result.getData().getData();
        final String id = call.getString("id");
        new Thread(() -> {
            File partial = null;
            try {
                String name = displayName(uri);
                String lower = name == null ? "" : name.toLowerCase(Locale.US);
                if (!lower.endsWith(".html") && !lower.endsWith(".htm")) {
                    call.reject("请选择单文件 HTML 课件", "P070_HTML_EXT");
                    return;
                }
                long total = sizeOf(uri);
                if (total > MAX_HTML_BYTES) {
                    call.reject("课件超过 40MB，请先精简为单文件 HTML", "P070_HTML_TOO_BIG");
                    return;
                }
                File target = new File(MediaFiles.slidesDir(getContext()), id + ".html");
                partial = new File(target.getPath() + ".partial");
                long copied = copyToFile(uri, partial, null);
                if (copied <= 0) {
                    partial.delete();
                    call.reject("课件文件为空", "P070_EMPTY_FILE");
                    return;
                }
                if (total > 0 && copied != total) {
                    partial.delete();
                    call.reject("写入字节数与源文件不一致（" + copied + " / " + total + "）", "P070_SIZE_MISMATCH");
                    return;
                }
                if (target.exists()) target.delete();
                if (!partial.renameTo(target)) {
                    partial.delete();
                    call.reject("保存课件失败", "P070_RENAME_FAILED");
                    return;
                }
                String text = "";
                boolean truncated = false;
                if (target.length() <= MAX_TEXT_BYTES) {
                    text = MediaFiles.readText(target, MAX_TEXT_BYTES);
                } else {
                    truncated = true;
                }
                JSObject out = new JSObject();
                out.put("canceled", false);
                out.put("bytes", target.length());
                out.put("name", name);
                out.put("text", text);
                out.put("truncated", truncated);
                call.resolve(out);
            } catch (Exception e) {
                if (partial != null) partial.delete();
                call.reject("保存课件失败：" + msg(e), "P070_COPY_FAILED");
            }
        }, "p070-import-slides").start();
    }

    /* ------------------------------------------------------------- media facts */

    @PluginMethod
    public void mediaInfo(PluginCall call) {
        String id = call.getString("id");
        JSObject out = new JSObject();
        File video = MediaFiles.findVideo(getContext(), id);
        File slides = new File(MediaFiles.slidesDir(getContext()), id + ".html");
        JSObject v = new JSObject();
        v.put("exists", video != null && video.isFile());
        v.put("bytes", video != null && video.isFile() ? video.length() : 0);
        if (video != null) {
            v.put("ext", video.getName().substring(video.getName().lastIndexOf('.') + 1));
        } else {
            v.put("ext", "");
        }
        JSObject s = new JSObject();
        s.put("exists", slides.isFile());
        s.put("bytes", slides.isFile() ? slides.length() : 0);
        out.put("video", v);
        out.put("slides", s);
        call.resolve(out);
    }

    @PluginMethod
    public void mediaUrl(PluginCall call) {
        String id = call.getString("id");
        File video = MediaFiles.findVideo(getContext(), id);
        if (video == null) {
            call.reject("本地视频不存在", "P070_NO_VIDEO");
            return;
        }
        JSObject out = new JSObject();
        out.put("path", "file://" + video.getAbsolutePath());
        out.put("bytes", video.length());
        out.put("modified", video.lastModified());
        call.resolve(out);
    }

    @PluginMethod
    public void deleteMedia(PluginCall call) {
        String id = call.getString("id");
        String kind = call.getString("kind", "all");
        if (!MediaFiles.isSafeId(id)) {
            call.reject("资料标识无效", "P070_BAD_ID");
            return;
        }
        if ("video".equals(kind) || "all".equals(kind)) removeVideoFiles(id);
        if ("slides".equals(kind) || "all".equals(kind)) {
            new File(MediaFiles.slidesDir(getContext()), id + ".html").delete();
        }
        call.resolve(new JSObject().put("ok", true));
    }

    @PluginMethod
    public void storage(PluginCall call) {
        StatFs stat = new StatFs(getContext().getFilesDir().getAbsolutePath());
        JSObject out = new JSObject();
        out.put("appBytes", dirSize(new File(getContext().getFilesDir(), "p070")));
        out.put("freeBytes", stat.getAvailableBytes());
        out.put("totalBytes", stat.getTotalBytes());
        call.resolve(out);
    }

    /* ------------------------------------------------------------- deck viewer */

    @PluginMethod
    public void openSlides(PluginCall call) {
        String id = call.getString("id");
        File deck = new File(MediaFiles.slidesDir(getContext()), id + ".html");
        if (!MediaFiles.isSafeId(id) || !deck.isFile()) {
            call.reject("课件不存在", "P070_NO_DECK");
            return;
        }
        Intent i = new Intent(getContext(), SlideActivity.class);
        i.putExtra("id", id);
        i.putExtra("title", call.getString("title", ""));
        i.putExtra("theme", call.getString("theme", "light"));
        i.putExtra("labelBack", call.getString("labelBack", ""));
        i.putExtra("labelFull", call.getString("labelFull", ""));
        i.putExtra("labelExitFull", call.getString("labelExitFull", ""));
        i.putExtra("labelError", call.getString("labelError", ""));
        i.putExtra("labelErrorBody", call.getString("labelErrorBody", ""));
        i.putExtra("labelBackShort", call.getString("labelBackShort", ""));
        getActivity().startActivity(i);
        call.resolve(new JSObject().put("opened", true));
    }

    /* ------------------------------------------------------- system boundaries */

    /** Status/navigation bar appearance + window background follow the in-app theme. */
    @PluginMethod
    public void setSystemBars(final PluginCall call) {
        final boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
        getActivity().runOnUiThread(() -> MainActivity.applySystemBars(getActivity(), dark));
        call.resolve(new JSObject().put("ok", true));
    }


    @PluginMethod
    public void shareText(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.trim().isEmpty()) {
            call.reject("没有可分享的内容", "P070_EMPTY_SHARE");
            return;
        }
        String title = call.getString("title", "");
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_TEXT, text);
        if (title != null && !title.isEmpty()) send.putExtra(Intent.EXTRA_SUBJECT, title);
        Intent chooser = Intent.createChooser(send, title);
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(chooser);
        call.resolve(new JSObject().put("ok", true));
    }

    @PluginMethod
    public void copyText(PluginCall call) {
        String text = call.getString("text", "");
        ClipboardManager cm = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm == null) {
            call.reject("剪贴板不可用", "P070_NO_CLIPBOARD");
            return;
        }
        cm.setPrimaryClip(ClipData.newPlainText("Pocket Presenter", text == null ? "" : text));
        call.resolve(new JSObject().put("ok", true));
    }

    @PluginMethod
    public void openExternal(PluginCall call) {
        String url = call.getString("url", "");
        if (url == null || !(url.toLowerCase(Locale.US).startsWith("http://") || url.toLowerCase(Locale.US).startsWith("https://"))) {
            call.reject("只能是 http(s) 链接", "P070_BAD_URL");
            return;
        }
        try {
            Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            view.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(view);
            call.resolve(new JSObject().put("ok", true));
        } catch (Exception e) {
            call.reject("没有可以打开链接的应用", "P070_NO_BROWSER");
        }
    }

    @PluginMethod
    public void appInfo(PluginCall call) {
        JSObject out = new JSObject();
        try {
            android.content.pm.PackageInfo pi = getContext().getPackageManager()
                .getPackageInfo(getContext().getPackageName(), 0);
            out.put("version", pi.versionName);
            out.put("versionCode", Build.VERSION.SDK_INT >= 28 ? (int) pi.getLongVersionCode() : pi.versionCode);
        } catch (Exception e) {
            out.put("version", "");
        }
        out.put("android", Build.VERSION.RELEASE);
        out.put("sdkInt", Build.VERSION.SDK_INT);
        out.put("model", Build.MODEL);
        out.put("webView", webViewVersion());
        out.put("packageName", getContext().getPackageName());
        call.resolve(out);
    }

    /* ------------------------------------------------------------------ helpers */

    private String webViewVersion() {
        try {
            android.content.pm.PackageManager pm = getContext().getPackageManager();
            for (String pkg : new String[] { "com.google.android.webview", "com.android.webview" }) {
                try {
                    android.content.pm.PackageInfo pi = pm.getPackageInfo(pkg, 0);
                    if (pi.versionName != null) return pi.versionName;
                } catch (Exception ignored) {}
            }
            String ua = WebSettings.getDefaultUserAgent(getContext());
            int idx = ua.indexOf("Chrome/");
            return idx >= 0 ? ua.substring(idx + 7).split(" ")[0] : ua;
        } catch (Exception e) {
            return "";
        }
    }

    private void resolveCanceled(PluginCall call) {
        JSObject out = new JSObject();
        out.put("canceled", true);
        call.resolve(out);
    }

    private void removeVideoFiles(String id) {
        File[] files = MediaFiles.mediaDir(getContext()).listFiles();
        if (files == null) return;
        for (File f : files) {
            String n = f.getName();
            if (n.startsWith(id + ".")) f.delete();
        }
    }

    private void removeOtherVideoFiles(String id, String keepName) {
        File[] files = MediaFiles.mediaDir(getContext()).listFiles();
        if (files == null) return;
        for (File f : files) {
            String n = f.getName();
            if (n.startsWith(id + ".") && !n.equals(keepName)) f.delete();
        }
    }

    private String displayName(Uri uri) {
        String name = null;
        try (Cursor c = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) name = c.getString(idx);
            }
        } catch (Exception ignored) {}
        if (name == null) {
            String last = uri.getLastPathSegment();
            name = last == null ? "import" : last;
        }
        return name;
    }

    private long sizeOf(Uri uri) {
        try (Cursor c = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int idx = c.getColumnIndex(OpenableColumns.SIZE);
                if (idx >= 0 && !c.isNull(idx)) return c.getLong(idx);
            }
        } catch (Exception ignored) {}
        try (android.os.ParcelFileDescriptor pfd = getContext().getContentResolver().openFileDescriptor(uri, "r")) {
            if (pfd != null) return pfd.getStatSize();
        } catch (Exception ignored) {}
        return -1;
    }

    /**
     * Streams the picked document into {@code dest}. Never buffers the file in memory.
     * Reports throttled progress to JS when {@code progressId} is provided.
     */
    private long copyToFile(Uri uri, File dest, String progressId) throws Exception {
        dest.getParentFile().mkdirs();
        long copied = 0;
        long lastReport = 0;
        long total = progressId != null ? sizeOf(uri) : -1;

        try (InputStream in = getContext().getContentResolver().openInputStream(uri);
             FileOutputStream out = new FileOutputStream(dest)) {
            if (in == null) throw new Exception("无法打开所选文件");
            byte[] buf = new byte[COPY_BUFFER];
            int n;
            while ((n = in.read(buf)) > 0) {
                if (cancelRequested) break;
                out.write(buf, 0, n);
                copied += n;
                long now = System.currentTimeMillis();
                if (progressId != null && now - lastReport > 120) {
                    lastReport = now;
                    JSObject p = new JSObject();
                    p.put("id", progressId);
                    p.put("loaded", copied);
                    p.put("total", total > 0 ? total : 0);
                    notifyListeners("importProgress", p);
                }
            }
            out.flush();
            out.getFD().sync();
        }
        if (cancelRequested) {
            dest.delete();
            return 0;
        }
        return copied;
    }

    private long dirSize(File dir) {
        if (dir == null || !dir.exists()) return 0;
        long n = 0;
        File[] kids = dir.listFiles();
        if (kids == null) return 0;
        for (File f : kids) {
            n += f.isDirectory() ? dirSize(f) : f.length();
        }
        return n;
    }

    private static String msg(Exception e) {
        return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
    }
}
