/* P070 local storage layer.
   Metadata: IndexedDB (survives app restarts and same-signature upgrades).
   Media:
     - Android APK: native streaming copy into the app's private persistent files
       directory (SAF picker -> plugin -> filesDir/p070). Nothing is buffered in JS.
     - Desktop browser (development only): OPFS first, IndexedDB Blob fallback.
   No network, no external service. */

import { platform, isNative } from './platform.js';

const DB_NAME = 'p070';
const DB_VERSION = 1;
const OPFS_DIR = 'p070-media';

let dbPromise = null;

export class QuotaError extends Error {
  constructor(message, detail) {
    super(message);
    this.name = 'QuotaError';
    this.detail = detail || null;
  }
}

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('数据库被其他页面占用，请关闭其他标签后重试'));
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    try { result = fn(s); } catch (e) { reject(e); return; }
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('事务已中止'));
  }));
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const noNative = () => { throw new Error('native import path is used on Android'); };

export const db = {
  async allItems() {
    const dbh = await openDB();
    return request(dbh.transaction('items', 'readonly').objectStore('items').getAll());
  },
  async putItem(item) {
    await tx('items', 'readwrite', s => s.put(item));
    return item;
  },
  async putItems(items) {
    await tx('items', 'readwrite', s => { items.forEach(it => s.put(it)); });
    return items;
  },
  async deleteItem(id) {
    await tx('items', 'readwrite', s => s.delete(id));
    await this.removeVideo(id);
    await this.removeSlides(id);
    await tx('media', 'readwrite', s => s.delete(id));
  },
  async allMedia() {
    const dbh = await openDB();
    const rows = await request(dbh.transaction('media', 'readonly').objectStore('media').getAll());
    const map = {};
    rows.forEach(r => { map[r.id] = r; });
    return map;
  },
  async putMedia(rec) {
    await tx('media', 'readwrite', s => s.put(rec));
    return rec;
  },
  async deleteMedia(id) {
    await tx('media', 'readwrite', s => s.delete(id));
  },

  async estimate() {
    if (isNative) {
      const s = await platform.storage();
      return { quota: s.freeBytes || 0, usage: s.appBytes || 0, usageDetails: null };
    }
    try {
      const e = await navigator.storage.estimate();
      return { quota: e.quota || 0, usage: e.usage || 0, usageDetails: e.usageDetails || null };
    } catch { return { quota: 0, usage: 0, usageDetails: null }; }
  },

  async persist() {
    try { return await navigator.storage.persist(); } catch { return false; }
  },

  async getDirectory() {
    if (!navigator.storage || !navigator.storage.getDirectory) return null;
    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle(OPFS_DIR, { create: true });
  },

  /* Browser-only: on Android the native plugin streams the picked file instead. */
  async saveVideo(id, file, onProgress) {
    if (isNative) return noNative();
    if (!file) throw new Error('没有选择视频文件');
    if (!/^video\//.test(file.type) && !/\.(mp4|m4v|webm|mov)$/i.test(file.name)) {
      throw new Error('请选择 MP4 / WebM / MOV 视频文件');
    }
    const estimate = await this.estimate();
    if (estimate.quota && estimate.quota - estimate.usage < file.size * 1.15) {
      throw new QuotaError('手机存储空间不足', {
        need: file.size, quota: estimate.quota, usage: estimate.usage
      });
    }
    const rec = await this.getMedia(id);
    if (rec && rec.video) await this.removeVideo(id);

    if (navigator.storage && navigator.storage.getDirectory) {
      try {
        const dir = await this.getDirectory();
        if (!dir) throw new Error('no opfs');
        const name = `${id}.mp4`;
        const fh = await dir.getFileHandle(name, { create: true });
        const writable = await fh.createWritable();
        const reader = file.stream().getReader();
        let loaded = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writable.write(value);
            loaded += value.length;
            if (onProgress) onProgress(loaded, file.size);
          }
          await writable.close();
        } catch (e) {
          try { await writable.abort(); } catch {}
          try { await dir.removeEntry(name); } catch {}
          if (e && (e.name === 'QuotaExceededError' || /quota/i.test(e.message || ''))) {
            throw new QuotaError('手机存储空间不足', { need: file.size });
          }
          throw e;
        }
        const f = await (await dir.getFileHandle(name)).getFile();
        if (f.size !== file.size) {
          await dir.removeEntry(name).catch(() => {});
          throw new Error('写入后文件大小不一致，已停止保存');
        }
        return { mode: 'opfs', opfsName: name, bytes: f.size, mime: file.type || 'video/mp4', name: file.name };
      } catch (e) {
        if (e instanceof QuotaError) throw e;
        if (!/no opfs|NotSupported|SecurityError/i.test(e.message || e.name || '')) throw e;
      }
    }

    const buffer = file; // Blob stored directly; never arrayBuffer() the whole video.
    await tx('blobs', 'readwrite', s => s.put({ key: `${id}|video`, value: buffer }));
    return { mode: 'idb', bytes: file.size, mime: file.type || 'video/mp4', name: file.name };
  },

  async getMedia(id) {
    const dbh = await openDB();
    return request(dbh.transaction('media', 'readonly').objectStore('media').get(id));
  },

  async getVideoURL(id, rec) {
    if (!rec || !rec.video) return null;
    if (isNative) return platform.mediaUrl(id);
    if (rec.mode === 'opfs' && rec.opfsName) {
      const dir = await this.getDirectory();
      if (!dir) return null;
      const f = await (await dir.getFileHandle(rec.opfsName)).getFile();
      if (rec.bytes && f.size !== rec.bytes) throw new Error('本地视频大小不一致');
      return URL.createObjectURL(f);
    }
    const dbh = await openDB();
    const row = await request(dbh.transaction('blobs', 'readonly').objectStore('blobs').get(`${id}|video`));
    if (!row || !row.value) return null;
    return URL.createObjectURL(row.value);
  },

  async checkVideo(id, rec) {
    if (!rec || !rec.video) return false;
    if (isNative) {
      try {
        const info = await platform.mediaInfo(id);
        if (!info || !info.video || !info.video.exists) return false;
        return !rec.bytes || info.video.bytes === rec.bytes;
      } catch { return false; }
    }
    try {
      if (rec.mode === 'opfs' && rec.opfsName) {
        const dir = await this.getDirectory();
        if (!dir) return false;
        const f = await (await dir.getFileHandle(rec.opfsName)).getFile();
        return !rec.bytes || f.size === rec.bytes;
      }
      const dbh = await openDB();
      const row = await request(dbh.transaction('blobs', 'readonly').objectStore('blobs').get(`${id}|video`));
      return !!(row && row.value && (!rec.bytes || row.value.size === rec.bytes));
    } catch { return false; }
  },

  async removeVideo(id) {
    if (isNative) {
      await platform.deleteMedia(id, 'video');
      return;
    }
    try {
      const dir = await this.getDirectory();
      if (dir) {
        const rec = await this.getMedia(id);
        if (rec && rec.opfsName) await dir.removeEntry(rec.opfsName).catch(() => {});
      }
    } catch {}
    await tx('blobs', 'readwrite', s => s.delete(`${id}|video`)).catch(() => {});
  },

  async saveSlides(id, text, mime) {
    const bytes = new Blob([text]).size;
    // On Android the deck already lives in private storage; only its size is recorded.
    if (isNative) return { bytes, mime: mime || 'text/html' };
    await tx('blobs', 'readwrite', s => s.put({ key: `${id}|slides`, value: text }));
    return { bytes, mime: mime || 'text/html' };
  },

  async getSlides(id) {
    if (isNative) return null;
    const dbh = await openDB();
    const row = await request(dbh.transaction('blobs', 'readonly').objectStore('blobs').get(`${id}|slides`));
    return row && typeof row.value === 'string' ? row.value : null;
  },

  async hasSlides(id) {
    if (isNative) {
      try { const info = await platform.mediaInfo(id); return !!(info && info.slides && info.slides.exists); }
      catch { return false; }
    }
    return (await this.getSlides(id)) != null;
  },

  async removeSlides(id) {
    if (isNative) {
      await platform.deleteMedia(id, 'slides');
      return;
    }
    await tx('blobs', 'readwrite', s => s.delete(`${id}|slides`)).catch(() => {});
  },

  async totalCachedBytes() {
    const media = await this.allMedia();
    return Object.values(media).reduce((n, m) => n + (m.bytes || 0), 0);
  }
};
