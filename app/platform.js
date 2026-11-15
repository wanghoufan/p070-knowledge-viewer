/* P070 platform adapter.
 *
 * The same UI runs in two hosts:
 *   - Android APK (Capacitor): native SAF picker, streaming copy into the app's
 *     private persistent files directory, native media URL with byte ranges,
 *     isolated native WebView for imported HTML decks, Android share sheet.
 *   - Desktop browser (development/regression only): file inputs, OPFS.
 *
 * Nothing here talks to a network. In the APK there is no INTERNET permission at
 * all, so "offline" is enforced by the OS, not by a convention.
 */

const Cap = typeof window !== 'undefined' ? window.Capacitor : null;
export const isNative = !!(Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform());

function plugin() {
  if (!isNative) return null;
  if (Cap.Plugins && Cap.Plugins.P070Native) return Cap.Plugins.P070Native;
  if (typeof Cap.registerPlugin === 'function') return Cap.registerPlugin('P070Native');
  return null;
}

const P = plugin();

function call(method, args) {
  if (!P || typeof P[method] !== 'function') return Promise.reject(new Error('native plugin unavailable: ' + method));
  return P[method](args || {});
}

export const platform = {
  isNative,

  /** Android version metadata; used for the in-app version row (never a dev hash). */
  async info() {
    if (!isNative) return { version: '', webView: '', android: '' };
    try { return await call('appInfo'); } catch { return { version: '', webView: '', android: '' }; }
  },

  /** Text of a user-picked manifest.json. Returns { canceled } when dismissed. */
  async importManifest() { return call('importManifest'); },

  /** Streams a picked video into private storage. onProgress(loaded,total) is best effort. */
  async importVideo(id, onProgress) {
    let handle = null;
    if (onProgress && P && typeof P.addListener === 'function') {
      handle = await P.addListener('importProgress', e => {
        if (!e || e.id !== id) return;
        onProgress(e.loaded || 0, e.total || 0);
      });
    }
    try { return await call('importVideo', { id }); }
    finally { if (handle) { try { await handle.remove(); } catch {} } }
  },

  async cancelImport() { try { return await call('cancelImport'); } catch { return null; } },

  /** Copies a picked self-contained HTML deck into private storage; returns bounded text for scanning. */
  async importSlides(id) { return call('importSlides', { id }); },

  async mediaInfo(id) {
    try { return await call('mediaInfo', { id }); }
    catch { return { video: { exists: false, bytes: 0 }, slides: { exists: false, bytes: 0 } }; }
  },

  /** kind: 'video' | 'slides' | 'all' */
  async deleteMedia(id, kind) { try { return await call('deleteMedia', { id, kind: kind || 'all' }); } catch { return null; } },

  async mediaUrl(id) {
    const r = await call('mediaUrl', { id });
    if (!r || !r.path) return null;
    const cached = Cap && typeof Cap.convertFileSrc === 'function' ? Cap.convertFileSrc(r.path) : r.path;
    // Bust the WebView cache when the file was replaced (same id, new bytes).
    return r.modified ? cached + '?v=' + r.modified : cached;
  },

  async storage() {
    try { return await call('storage'); } catch { return { appBytes: 0, freeBytes: 0 }; }
  },

  async openSlides(id, title, theme, labels) {
    const l = labels || {};
    return call('openSlides', {
      id,
      title: title || '',
      theme: theme || 'light',
      labelBack: l.back || '',
      labelFull: l.full || '',
      labelExitFull: l.exitFull || '',
      labelError: l.error || '',
      labelErrorBody: l.errorBody || '',
      labelBackShort: l.backShort || ''
    });
  },

  /** Status/navigation bar appearance + window background follow the in-app theme. */
  async setSystemBars(dark) { return call('setSystemBars', { dark: !!dark }); },

  async shareText(text, title) { return call('shareText', { text, title: title || '' }); },

  async copyText(text) { return call('copyText', { text }); },

  async openExternal(url) { return call('openExternal', { url }); },

  /** Android hardware/gesture back. handler() returns true when it consumed the event. */
  onBack(handler) {
    if (!isNative || !P || typeof P.addListener !== 'function') return;
    P.addListener('backButton', () => { handler(); }).catch(() => {});
  }
};

export default platform;
