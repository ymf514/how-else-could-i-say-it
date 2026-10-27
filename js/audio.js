/* Voice recordings live in IndexedDB (LocalStorage is too small for audio).
   They never leave the browser unless the participant downloads them. */
window.HECIS_Audio = (() => {
  const DB = 'hecis-audio';
  const STORE = 'clips';
  let dbPromise = null;

  function db() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  async function run(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  const supported = () =>
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && window.indexedDB);

  // Pick a format the browser can record (Safari → mp4, others → webm)
  function pickMime() {
    const list = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    return list.find((m) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
  }
  function extFor(mime) {
    if (/mp4|aac|m4a/.test(mime)) return 'm4a';
    if (/ogg/.test(mime)) return 'ogg';
    return 'webm';
  }

  return {
    supported,
    pickMime,
    extFor,
    put: (key, blob) => run('readwrite', (s) => s.put(blob, key)),
    get: (key) => run('readonly', (s) => s.get(key)),
    del: (key) => run('readwrite', (s) => s.delete(key)),
    clear: () => run('readwrite', (s) => s.clear()),
  };
})();
