/* LocalStorage autosave, past-session history and clipboard helpers. */
window.HECIS_Storage = (() => {
  const KEY = window.HECIS_CONFIG.storageKey;
  const DEVICE_KEY = KEY + ':device';
  const COUNT_KEY = KEY + ':sessions';
  const HISTORY_KEY = KEY + ':history';

  function safeGet(k) {
    try { return localStorage.getItem(k); } catch { return null; }
  }
  function safeSet(k, v) {
    try { localStorage.setItem(k, v); return true; } catch { return false; }
  }

  function load() {
    const raw = safeGet(KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
  const save = (state) => safeSet(KEY, JSON.stringify(state));
  const clear = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } };

  // Earlier sessions on this browser, kept so participants can look them up by ID.
  function loadHistory() {
    try { return JSON.parse(safeGet(HISTORY_KEY)) || []; } catch { return []; }
  }
  const saveHistory = (list) => safeSet(HISTORY_KEY, JSON.stringify(list));

  // Ask the browser not to evict our data under storage pressure (best effort).
  function requestPersist() {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch { /* ignore */ }
  }

  // Random, persistent per-browser ID so repeat sessions can be linked.
  function deviceId() {
    let id = safeGet(DEVICE_KEY);
    if (!id) {
      id = 'D-' + randomCode(8);
      safeSet(DEVICE_KEY, id);
    }
    return id;
  }

  // 1, 2, 3… how many sessions were started in this browser.
  function nextSessionNo() {
    const n = (parseInt(safeGet(COUNT_KEY), 10) || 0) + 1;
    safeSet(COUNT_KEY, String(n));
    return n;
  }

  function randomCode(len) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
    const buf = new Uint32Array(len);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    return Array.from(buf, (x) => chars[x % chars.length]).join('');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  }

  return { load, save, clear, loadHistory, saveHistory, requestPersist, deviceId, nextSessionNo, randomCode, downloadBlob, copyText };
})();
