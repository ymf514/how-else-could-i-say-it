/* =============================================================
   How Else Could I Say It? — game flow
   welcome → story → draw → rewrite → next → (draw…) → journey
   ============================================================= */
(() => {
  const CFG = window.HECIS_CONFIG;
  const CARDS = window.HECIS_CARDS;
  const I18N = window.HECIS_I18N;
  const Store = window.HECIS_Storage;
  const Audio = window.HECIS_Audio;

  const RATING_KEYS = ['ease', 'funny', 'pref', 'accuracy', 'comfort'];
  const PROGRESS = ['story', 'draw', 'rewrite', 'journey'];
  const MAX_REC_SECONDS = 180;

  const app = document.getElementById('app');
  const modal = document.getElementById('modal');
  const deviceId = Store.deviceId();
  let state; // set at the bottom, once all helpers exist
  let animateFlip = false; // true right after a draw, so the card flips in
  let rec = null; // active recording { key, mr, stream, start, timer }
  let player = null; // active playback { key, audio, url }
  let lastIdea = -1; // index of the last story prompt shown

  /* ---------- helpers ---------- */
  function defaultLang() {
    return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }
  function t(key, vars = {}) {
    const s = (I18N[state.lang] && I18N[state.lang][key]) ?? I18N.en[key] ?? key;
    return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nowISO = () => new Date().toISOString();
  const tech = (id) => CARDS.techniques.find((c) => c.id === id);
  const persp = (id) => CARDS.perspectives.find((p) => p.id === id);
  const pad = (n) => String(n).padStart(2, '0');
  const fmtTime = (s) => `${Math.floor(s / 60)}:${pad(s % 60)}`;
  const dayKey = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const isToday = (iso) => dayKey(iso) === dayKey(nowISO());
  const fmtDay = (iso) => new Date(iso).toLocaleDateString(state.lang === 'zh' ? 'zh-CN' : 'en', { month: 'short', day: 'numeric', weekday: 'short' });
  const hasContent = (s) => !!(s && (s.story.trim() || s.rounds.length));

  function makePid() {
    const d = new Date();
    return `P${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}-${Store.randomCode(4)}`;
  }
  function newState(lang) {
    return {
      schema: 'hecis-2',
      pid: makePid(),
      deviceId,
      sessionNo: Store.nextSessionNo(),
      startedAt: nowISO(),
      lang,
      step: 'welcome',
      story: '',
      storyReadAloud: false,
      audio: {}, // recording metadata by key ('story' or a round id); blobs live in IndexedDB
      rounds: [],
      current: null,
      favoriteRoundId: null,
      favoriteWhy: '',
      submissions: [],
    };
  }
  function blankRound() {
    return {
      id: 'r' + (state.rounds.length + 1) + '-' + Store.randomCode(3),
      techniqueId: null, perspectiveId: null, rerolls: 0, drawHistory: [],
      version: '', ratings: {}, reflection: '', readAloud: false,
      startedAt: nowISO(),
    };
  }

  /* ---------- saving ---------- */
  let saveTimer = null;
  function persist(now = false) {
    clearTimeout(saveTimer);
    const run = () => { if (Store.save(state)) flashSaved(); };
    if (now) run(); else saveTimer = setTimeout(run, 350);
  }
  let flashTimer = null;
  function flashSaved() {
    const el = document.getElementById('autosave');
    el.textContent = t('autosaved');
    el.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => el.classList.remove('show'), 1200);
  }

  /* ---------- history (earlier sessions on this browser) ---------- */
  let history = Store.loadHistory();
  let lookup = ''; // text typed in the records search box
  // Move the current session into history (nothing is deleted)
  function archiveCurrent() {
    if (!hasContent(state)) return;
    stopRecording();
    stopPlayback();
    const { step, ...rest } = state;
    history = [rest, ...history.filter((s) => s.pid !== state.pid)];
    Store.saveHistory(history);
  }
  function allRecords() {
    const list = history.slice();
    if (hasContent(state)) list.unshift({ ...state, isCurrent: true });
    return list.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
  }
  const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  /* ---------- UI bits ---------- */
  function toast(msg, type = 'ok', ms = 2600) {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
  }
  function openModal(html) {
    modal.innerHTML = `<div class="modal-box">${html}</div>`;
    modal.classList.add('open');
  }
  function closeModal() { modal.classList.remove('open'); modal.innerHTML = ''; }
  function shake(el) {
    if (!el) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  }

  function cardBack() {
    return `<div class="card-back"><span>How Else<br>Could I Say It?</span></div>`;
  }
  // Green technique card. The example stays hidden until "?" is tapped.
  function techCard(c, extra = '') {
    const other = state.lang === 'zh' ? 'en' : 'zh';
    return `<div class="tcard ${extra}">
      <div class="tc-top">
        <span class="tc-cat">${esc(CARDS.categories[c.category][state.lang])}</span>
        <button class="q-btn" data-action="example" aria-label="${esc(t('example'))}">?</button>
      </div>
      <p class="tc-ins">${esc(c.instruction[state.lang])}</p>
      <p class="tc-name">${esc(c.name[state.lang])}<span>${esc(c.name[other])}</span></p>
      <div class="tc-ex" data-action="example"><b>${t('example')}</b> ${esc(c.example[state.lang])}</div>
    </div>`;
  }
  function backBtn(to) {
    return `<button class="link-btn" data-action="goto" data-to="${to}">${t('back')}</button>`;
  }

  /* ---------- recorder ---------- */
  function recBlock(key, prompt, checked) {
    return `<div class="read-aloud">
      <p class="ra-prompt">${prompt}</p>
      <div class="ra-row">
        <div class="rec" data-rec="${key}">${recInner(key)}</div>
        <button class="check ${checked ? 'on' : ''}" data-action="readAloud" data-key="${key}" aria-pressed="${checked}"><span class="box">✓</span>${t('readNoRec')}</button>
      </div>
      <p class="ra-note">${t('recOptional')}</p>
    </div>`;
  }
  function recInner(key) {
    if (rec && rec.key === key) {
      return `<button class="rec-btn on" data-action="recStop" data-key="${key}"><span class="rdot"></span>${t('recStop')}</button>
        <span class="rec-time">${fmtTime(Math.round((Date.now() - rec.start) / 1000))}</span>`;
    }
    const a = state.audio[key];
    if (a) {
      const playing = player && player.key === key;
      return `<button class="rec-btn play" data-action="play" data-key="${key}">${playing ? '■' : '▶'} ${fmtTime(a.duration)}</button>
        <button class="link-btn" data-action="recStart" data-key="${key}">${t('recAgain')}</button>
        <button class="link-btn" data-action="recDelete" data-key="${key}">${t('recDelete')}</button>`;
    }
    return `<button class="rec-btn" data-action="recStart" data-key="${key}"><span class="rdot"></span>${t('recStart')}</button>`;
  }
  function paintRec(key) {
    document.querySelectorAll(`[data-rec="${key}"]`).forEach((el) => { el.innerHTML = recInner(key); });
    document.querySelectorAll(`[data-play="${key}"]`).forEach((el) => {
      const a = state.audio[key];
      el.textContent = `${player && player.key === key ? '■' : '▶'} ${a ? fmtTime(a.duration) : ''}`;
    });
  }

  async function startRecording(key) {
    if (!Audio.supported()) return toast(t('recUnsupported'), 'warn', 3500);
    if (rec) stopRecording();
    stopPlayback();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return toast(t('recDenied'), 'warn', 3500);
    }
    const mime = Audio.pickMime();
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks = [];
    const session = { key, mr, stream, start: Date.now() };
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach((tr) => tr.stop());
      clearInterval(session.timer);
      const type = mr.mimeType || mime || 'audio/webm';
      const blob = new Blob(chunks, { type });
      const duration = Math.max(1, Math.round((Date.now() - session.start) / 1000));
      try {
        await Audio.put(state.pid + ':' + key, blob);
        state.audio[key] = { duration, mime: type, size: blob.size, at: nowISO() };
        persist(true);
        toast(t('recSaved'));
      } catch {
        toast(t('recUnsupported'), 'warn');
      }
      if (rec === session) rec = null;
      paintRec(key);
    };
    rec = session;
    mr.start();
    session.timer = setInterval(() => {
      const s = Math.round((Date.now() - session.start) / 1000);
      document.querySelectorAll(`[data-rec="${key}"] .rec-time`).forEach((el) => { el.textContent = fmtTime(s); });
      if (s >= MAX_REC_SECONDS) stopRecording();
    }, 250);
    paintRec(key);
  }
  function stopRecording() {
    if (rec && rec.mr.state !== 'inactive') rec.mr.stop();
  }
  function stopPlayback() {
    if (!player) return;
    const key = player.key;
    player.audio.pause();
    URL.revokeObjectURL(player.url);
    player = null;
    paintRec(key);
  }
  async function togglePlay(key) {
    if (player && player.key === key) return stopPlayback();
    stopPlayback();
    const blob = await Audio.get(state.pid + ':' + key).catch(() => null);
    if (!blob) {
      delete state.audio[key];
      persist(true);
      return paintRec(key);
    }
    const url = URL.createObjectURL(blob);
    const audio = new window.Audio(url);
    player = { key, audio, url };
    audio.onended = stopPlayback;
    audio.play().catch(stopPlayback);
    paintRec(key);
  }
  function audioLabel(key) {
    if (key === 'story') return 'story';
    const i = state.rounds.findIndex((r) => r.id === key);
    return i >= 0 ? `round${i + 1}` : key;
  }
  function readAloudValue(key, checked) {
    const a = state.audio[key];
    return a ? `recorded (${a.duration}s)` : checked ? 'yes' : 'no';
  }

  function recordList() {
    const q = norm(lookup);
    const list = allRecords().filter((s) => !q || norm(s.pid).includes(q));
    const rows = list.map((s, i) => {
      const fav = s.rounds.find((r) => r.id === s.favoriteRoundId) || s.rounds[s.rounds.length - 1];
      return `<article class="rec-row" style="--i:${i}">
        <button class="rec-open" data-action="openRecord" data-pid="${esc(s.pid)}">
          <span class="rec-day">${esc(fmtDay(s.startedAt))}
            ${s.isCurrent ? `<em class="badge cur">${t('current')}</em>` : ''}
            ${s.submissions && s.submissions.length ? `<em class="badge ok">${t('submittedBadge')}</em>` : ''}</span>
          <code>${esc(s.pid)}</code>
          <span class="rec-story">${esc(s.story || '—')}</span>
          <span class="rec-meta">${t('versionsCount', { n: s.rounds.length })}${fav && tech(fav.techniqueId) ? ` · ${esc(tech(fav.techniqueId).name[state.lang])}` : ''}</span>
        </button>
        <button class="link-btn rec-del" data-action="deleteRecord" data-pid="${esc(s.pid)}">${t('recDelete')}</button>
      </article>`;
    }).join('');
    return rows || `<p class="empty">${q ? t('lookupNone') : t('noRecords')}</p>`;
  }

  /* ---------- screens ---------- */
  const screens = {
    welcome() {
      const words = 'How Else Could I Say It?'.split(' ');
      let i = 0;
      const title = words.map((w, wi) => `<span class="w ${wi === 1 ? 'accent' : ''}">${[...w].map((l) => `<span class="l" style="--i:${i++}">${esc(l)}</span>`).join('')}</span>`).join(' ');
      // One session a day: today's work can be continued, an older one is set aside
      let buttons, status = '';
      if (!hasContent(state)) {
        buttons = `<button class="btn big" data-action="start">${t('start')} →</button>`;
      } else if (!isToday(state.startedAt)) {
        buttons = `<button class="btn big" data-action="newDay">${t('startToday')} →</button>
          <button class="btn ghost" data-action="continue">${t('continueLast', { d: fmtDay(state.startedAt) })}</button>`;
      } else if (state.submissions.length) {
        status = `<p class="today-done">${t('todayDone')}</p>`;
        buttons = `<button class="btn big" data-action="continue">${t('viewToday')}</button>
          <button class="btn ghost" data-action="reset">${t('startNew')}</button>`;
      } else {
        buttons = `<button class="btn big" data-action="continue">${t('continue')}</button>
          <button class="btn ghost" data-action="reset">${t('startNew')}</button>`;
      }
      const days = new Set(allRecords().map((s) => dayKey(s.startedAt))).size;
      return `<section class="screen welcome">
        <div class="hero-cards" aria-hidden="true">
          <div class="hc hc-1"></div><div class="hc hc-2"></div><div class="hc hc-3"></div>
        </div>
        <h1 class="big-title">${title}</h1>
        <p class="tagline">${t('tagline')}</p>
        <p class="intro">${t('intro')}</p>
        ${status}
        <div class="row center">${buttons}</div>
        <button class="records-link" data-action="records">${t('myRecords')}${days ? ` <span>${t('daysCount', { n: days })}</span>` : ''}</button>
        <p class="fineprint">${t('fineprint')}</p>
      </section>`;
    },

    records() {
      return `<section class="screen">
        <h2 class="screen-title">${t('myRecords')}</h2>
        <p class="hint">${t('recordsHint')}</p>
        <input class="search" type="search" data-bind="lookup" value="${esc(lookup)}" placeholder="${esc(t('lookupPh'))}" autocomplete="off" spellcheck="false">
        <div class="rec-list">${recordList()}</div>
        <div class="row spread">${backBtn('welcome')}</div>
      </section>`;
    },

    story() {
      return `<section class="screen">
        <h2 class="screen-title">${t('storyTitle')}</h2>
        <div class="story-hint">
          <p class="hint">${t('storyHint')}</p>
          <button class="idea-btn" data-action="idea"><span aria-hidden="true">?</span>${t('ideaBtn')}</button>
        </div>
        <p class="idea" id="idea" aria-live="polite" hidden></p>
        <div class="story-box"><textarea data-bind="story" placeholder="${esc(t('storyPh'))}" maxlength="2000">${esc(state.story)}</textarea></div>
        ${recBlock('story', t('readStory'), state.storyReadAloud)}
        <div class="row spread">${backBtn('welcome')}<button class="btn big" data-action="storyNext">${t('next')}</button></div>
      </section>`;
    },

    draw() {
      const cur = state.current;
      const c = cur.techniqueId && tech(cur.techniqueId);
      const stage = c
        ? `<div class="flip card-size ${animateFlip ? '' : 'is-flipped'}" id="flip">
             <div class="flip-inner"><div class="face back">${cardBack()}</div><div class="face front" id="front">${techCard(c)}</div></div>
           </div>`
        : `<button class="deck card-size" data-action="draw" aria-label="${esc(t('drawBtn'))}">
             <div class="layer">${cardBack()}</div><div class="layer">${cardBack()}</div><div class="layer">${cardBack()}</div>
             <span class="tap-hint">${t('drawHint')}</span>
           </button>`;
      return `<section class="screen">
        <h2 class="screen-title">${t('drawTitle')}</h2>
        <div class="draw-stage">${stage}</div>
        ${c ? `
        <div class="row center"><button class="btn ghost" data-action="reroll">${t('reroll')}</button></div>
        <div class="persp">
          <div class="row spread">
            <h3>${t('perspTitle')} <small>${t('perspOptional')}</small></h3>
            <button class="link-btn" data-action="perspRandom">${t('perspRandom')}</button>
          </div>
          <div class="persp-grid">
            ${CARDS.perspectives.map((p) => `<button class="pcard ${cur.perspectiveId === p.id ? 'is-on' : ''}" data-action="persp" data-id="${p.id}">${esc(p.name[state.lang])}</button>`).join('')}
          </div>
        </div>` : ''}
        <div class="row spread">
          ${backBtn(state.rounds.length ? 'journey' : 'story')}
          ${c ? `<button class="btn big" data-action="toRewrite">${t('toRewrite')}</button>` : ''}
        </div>
      </section>`;
    },

    rewrite() {
      const cur = state.current;
      const c = tech(cur.techniqueId);
      const p = cur.perspectiveId && persp(cur.perspectiveId);
      return `<section class="screen">
        <h2 class="screen-title">${t('rewriteTitle')}</h2>
        <p class="original">“${esc(state.story)}”</p>
        <div class="context">
          ${techCard(c, 'compact')}
          ${p ? `<div class="pcard is-static">${esc(p.name[state.lang])}</div>` : ''}
        </div>
        <div>
          <label class="field-label" for="version">${t('myVersion')}</label>
          <textarea id="version" data-bind="version" placeholder="${esc(t('myVersionPh'))}" maxlength="3000">${esc(cur.version)}</textarea>
        </div>
        ${recBlock(cur.id, t('readVersion'), cur.readAloud)}
        <div class="ratings">
          <h3>${t('ratingsTitle')}</h3>
          ${RATING_KEYS.map((k) => `
            <div class="rating" data-key="${k}">
              <div class="rating-label">${t(k)}</div>
              <div class="rating-scale">
                <span class="lo">${t(k + '_lo')}</span>
                <div class="dots" role="radiogroup" aria-label="${esc(t(k))}">
                  ${[1, 2, 3, 4, 5].map((v) => `<button class="dot ${cur.ratings[k] === v ? 'on' : ''}" data-action="rate" data-key="${k}" data-v="${v}" role="radio" aria-checked="${cur.ratings[k] === v}">${v}</button>`).join('')}
                </div>
                <span class="hi">${t(k + '_hi')}</span>
              </div>
            </div>`).join('')}
        </div>
        <div>
          <label class="field-label" for="reflection">${t('reflectTitle')}</label>
          <textarea id="reflection" class="small" data-bind="reflection" placeholder="${esc(t('reflectPh'))}" maxlength="3000">${esc(cur.reflection)}</textarea>
        </div>
        <div class="row spread">${backBtn('draw')}<button class="btn big" data-action="finishRound">${t('finishRound')}</button></div>
      </section>`;
    },

    next() {
      const n = state.rounds.length, s = CFG.suggestedRounds;
      const dots = Array.from({ length: Math.max(n, s) }, (_, i) => `<span class="${i < n ? 'on' : ''}" style="--i:${i}"></span>`).join('');
      return `<section class="screen center">
        <h2 class="screen-title">${t('roundDone', { n })}</h2>
        <div class="tries">${dots}</div>
        <p class="hint">${t('roundDoneSub', { s })}</p>
        <div class="row center">
          <button class="btn big ${n < s ? '' : 'ghost'}" data-action="another">${t('another')}</button>
          <button class="btn big ${n < s ? 'ghost' : ''}" data-action="finish">${t('finish')}</button>
        </div>
      </section>`;
    },

    journey() {
      const n = state.rounds.length;
      const last = state.submissions[state.submissions.length - 1];
      const playBtn = (key) => state.audio[key]
        ? `<button class="play-sm" data-action="play" data-key="${key}" data-play="${key}">${player && player.key === key ? '■' : '▶'} ${fmtTime(state.audio[key].duration)}</button>` : '';
      const cards = state.rounds.map((r, i) => {
        const c = tech(r.techniqueId), p = r.perspectiveId && persp(r.perspectiveId);
        const fav = state.favoriteRoundId === r.id;
        return `<article class="jcard ${fav ? 'is-fav' : ''}" style="--i:${i}">
          <header><span class="round-no">${t('round', { n: i + 1 })}</span>${playBtn(r.id)}</header>
          <div class="jtags"><span class="jt-tech">${esc(c.name[state.lang])}</span>${p ? `<span class="jt-persp">${esc(p.name[state.lang])}</span>` : ''}</div>
          <p class="version">${esc(r.version)}</p>
          <div class="bars">${RATING_KEYS.map((k) => `<span>${t('short_' + k)}</span><span class="bar"><i style="--v:${r.ratings[k] || 0}"></i></span>`).join('')}</div>
          <button class="fav-btn" data-action="fav" data-id="${r.id}">${fav ? t('isFav') : t('pickFav')}</button>
        </article>`;
      }).join('');
      const hasAudio = Object.keys(state.audio).length > 0;
      return `<section class="screen">
        <div class="center">
          <h2 class="screen-title">${t('journeyTitle')}</h2>
          <p class="hint">${n ? t('journeySub') : t('noRounds')}</p>
        </div>
        <div class="origin"><div class="origin-top"><span class="tag-label">${t('startedHere')}</span>${playBtn('story')}</div>${esc(state.story)}</div>
        <div class="journey-grid">${cards}</div>
        ${state.favoriteRoundId ? `
          <div class="fav-why"><label class="field-label" for="favwhy">${t('favWhy')}</label>
          <textarea id="favwhy" class="small" data-bind="favoriteWhy" maxlength="2000">${esc(state.favoriteWhy)}</textarea></div>` : ''}
        <div class="final-actions">
          <div class="row center">
            <button class="btn big ghost" data-action="saveCard">${t('saveCard')}</button>
            <button class="btn big" data-action="submit" ${n ? '' : 'disabled'}>${last ? t('submitAgain') : t('submit')}</button>
          </div>
          ${last ? `<p class="submitted">${t('submittedAt', { time: new Date(last.at).toLocaleString() })}</p>` : ''}
          <div class="row center links">
            <button class="link-btn" data-action="copy">${t('copyText')}</button>
            ${hasAudio ? `<button class="link-btn" data-action="dlAudio">${t('dlAudio')}</button>` : ''}
            <button class="link-btn" data-action="another">${t('drawMore')}</button>
            <button class="link-btn" data-action="reset">${t('startNew')}</button>
          </div>
          <p class="meta">${t('yourId')}: <code>${esc(state.pid)}</code></p>
        </div>
      </section>`;
    },
  };

  /* ---------- render ---------- */
  function render() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('.lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === state.lang));
    renderProgress();
    app.className = state.step === 'journey' ? 'wide' : '';
    app.innerHTML = (screens[state.step] || screens.welcome)();

    if (state.step === 'draw' && animateFlip) {
      animateFlip = false;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const f = document.getElementById('flip');
        if (f) f.classList.add('is-flipped');
      }));
    }
  }
  function renderProgress() {
    const nav = document.getElementById('progress');
    if (state.step === 'welcome' || state.step === 'records') { nav.innerHTML = ''; return; }
    const at = PROGRESS.indexOf(state.step === 'next' ? 'rewrite' : state.step);
    const labels = { story: 'stepStory', draw: 'stepDraw', rewrite: 'stepRewrite', journey: 'stepJourney' };
    nav.innerHTML = PROGRESS.map((s, i) =>
      `${i ? '<span class="pline"></span>' : ''}<span class="pstep ${i < at || (state.step === 'next' && i === at) ? 'done' : ''} ${i === at && state.step !== 'next' ? 'on' : ''}"><span class="pdot"></span><span class="plabel">${t(labels[s])}</span></span>`
    ).join('');
  }
  function go(step) {
    stopRecording();
    stopPlayback();
    state.step = step;
    if (step !== 'welcome' && step !== 'records') state.lastStep = step;
    persist(true);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- drawing ---------- */
  function pickTechnique() {
    const used = new Set(state.rounds.map((r) => r.techniqueId));
    const cur = state.current.techniqueId;
    let pool = CARDS.techniques.filter((c) => !used.has(c.id) && c.id !== cur);
    if (!pool.length) pool = CARDS.techniques.filter((c) => c.id !== cur);
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  /* ---------- data out ---------- */
  function techName(id, lang = 'en') { const c = tech(id); return c ? c.name[lang] : id; }
  function perspName(id, lang = 'en') { const p = persp(id); return p ? p.name[lang] : ''; }
  function favoriteLabel() {
    const i = state.rounds.findIndex((r) => r.id === state.favoriteRoundId);
    return i < 0 ? '' : `Round ${i + 1} · ${techName(state.rounds[i].techniqueId)}`;
  }

  function exportObject() {
    return {
      app: 'How Else Could I Say It?',
      schema: state.schema,
      exportedAt: nowISO(),
      participant: { pid: state.pid, deviceId: state.deviceId, sessionNo: state.sessionNo, lang: state.lang, startedAt: state.startedAt },
      story: { text: state.story, readAloud: readAloudValue('story', state.storyReadAloud) },
      rounds: state.rounds.map((r, i) => ({
        round: i + 1,
        id: r.id,
        technique: { id: r.techniqueId, en: techName(r.techniqueId, 'en'), zh: techName(r.techniqueId, 'zh') },
        perspective: r.perspectiveId ? { id: r.perspectiveId, en: perspName(r.perspectiveId, 'en'), zh: perspName(r.perspectiveId, 'zh') } : null,
        rerolls: r.rerolls,
        drawHistory: r.drawHistory,
        version: r.version,
        ratings: r.ratings,
        readAloud: readAloudValue(r.id, r.readAloud),
        reflection: r.reflection,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
      })),
      recordings: Object.entries(state.audio).map(([key, a]) => ({
        of: audioLabel(key), seconds: a.duration, file: `how-else-${state.pid}-${audioLabel(key)}.${Audio.extFor(a.mime)}`,
      })),
      favorite: state.favoriteRoundId ? { roundId: state.favoriteRoundId, label: favoriteLabel(), why: state.favoriteWhy } : null,
      submissions: state.submissions,
    };
  }

  function summaryText() {
    const L = [];
    L.push('How Else Could I Say It?');
    L.push(`ID: ${state.pid} · session ${state.sessionNo} · ${state.deviceId}`);
    L.push('');
    L.push(`Story: ${state.story}`);
    L.push(`Read aloud: ${readAloudValue('story', state.storyReadAloud)}`);
    state.rounds.forEach((r, i) => {
      L.push('');
      L.push(`— Round ${i + 1}: ${techName(r.techniqueId)}${r.perspectiveId ? ` · ${perspName(r.perspectiveId)}` : ''}${state.favoriteRoundId === r.id ? '  ♥ FAVORITE' : ''}`);
      L.push(`My version: ${r.version}`);
      L.push(`Ease ${r.ratings.ease ?? '-'} · Funniness ${r.ratings.funny ?? '-'} · Preference ${r.ratings.pref ?? '-'} · Accuracy ${r.ratings.accuracy ?? '-'} · Comfort ${r.ratings.comfort ?? '-'}`);
      L.push(`Read aloud: ${readAloudValue(r.id, r.readAloud)} · Rerolls: ${r.rerolls}`);
      if (r.reflection) L.push(`Reflection: ${r.reflection}`);
    });
    if (state.favoriteRoundId) {
      L.push('');
      L.push(`Favorite: ${favoriteLabel()}${state.favoriteWhy ? ` — ${state.favoriteWhy}` : ''}`);
    }
    return L.join('\n');
  }

  function formPayload() {
    const p = {
      pid: state.pid,
      device_id: state.deviceId,
      session_no: String(state.sessionNo),
      lang: state.lang,
      started_at: state.startedAt,
      submitted_at: nowISO(),
      story: state.story,
      story_read_aloud: readAloudValue('story', state.storyReadAloud),
      rounds_count: String(state.rounds.length),
      favorite: favoriteLabel(),
      favorite_why: state.favoriteWhy,
      summary_text: summaryText(),
      full_json: JSON.stringify(exportObject()),
    };
    state.rounds.slice(0, CFG.googleForm.maxRounds).forEach((r, i) => {
      const k = `r${i + 1}_`;
      p[k + 'technique'] = techName(r.techniqueId);
      p[k + 'perspective'] = r.perspectiveId ? perspName(r.perspectiveId) : 'none';
      p[k + 'version'] = r.version;
      RATING_KEYS.forEach((rk) => { if (r.ratings[rk]) p[k + rk] = String(r.ratings[rk]); });
      p[k + 'reflection'] = r.reflection;
      p[k + 'read_aloud'] = readAloudValue(r.id, r.readAloud);
      p[k + 'rerolls'] = String(r.rerolls);
    });
    // Map data keys → entry IDs, skipping anything not configured
    const out = [];
    Object.entries(CFG.googleForm.fields).forEach(([key, entry]) => {
      if (entry && /^entry\.\d+$/.test(entry.trim()) && p[key] != null && p[key] !== '') out.push([entry.trim(), p[key]]);
    });
    return out;
  }
  const formConfigured = () => Object.values(CFG.googleForm.fields).some((v) => /^entry\.\d+$/.test((v || '').trim()));

  function prefillUrl(pairs) {
    const base = CFG.googleForm.viewUrl.split('?')[0];
    const build = (ps) => base + '?usp=pp_url&' + ps.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    let url = build(pairs);
    // Very long URLs can fail; drop the bulky full_json first if needed
    if (url.length > 7500) {
      const jsonEntry = (CFG.googleForm.fields.full_json || '').trim();
      url = build(pairs.filter(([k]) => k !== jsonEntry));
    }
    return url;
  }

  // One-click submit: POST into a hidden iframe. Google's reply can't be read
  // cross-origin, so "loaded" counts as success and a timeout counts as failure.
  function postToForm(pairs) {
    return new Promise((resolve) => {
      if (navigator.onLine === false) return resolve(false);
      const name = 'gf-' + Date.now();
      const iframe = document.createElement('iframe');
      iframe.name = name;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = CFG.googleForm.viewUrl.split('?')[0].replace(/\/viewform$/, '/formResponse');
      form.target = name;
      form.style.display = 'none';
      const add = (k, v) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; form.appendChild(i); };
      pairs.forEach(([k, v]) => add(k, v));
      add('fvv', '1');
      add('pageHistory', Array.from({ length: CFG.googleForm.pageCount || 1 }, (_, i) => i).join(','));
      document.body.appendChild(form);
      let done = false;
      const finish = (ok) => {
        if (done) return; done = true;
        setTimeout(() => { form.remove(); iframe.remove(); }, 1000);
        resolve(ok);
      };
      form.submit();
      setTimeout(() => { iframe.addEventListener('load', () => finish(true)); }, 0);
      setTimeout(() => finish(false), 12000);
    });
  }

  /* ---------- result card image ---------- */
  let cardBlob = null;
  function cardData() {
    const L = state.lang;
    const rounds = state.rounds.map((r, i) => ({
      label: t('round', { n: i + 1 }),
      tech: techName(r.techniqueId, L),
      persp: r.perspectiveId ? perspName(r.perspectiveId, L) : '',
      version: r.version,
      reflection: r.reflection,
      fav: state.favoriteRoundId === r.id,
      ratings: RATING_KEYS.map((k) => ({ label: t(k), v: r.ratings[k] || 0 })),
    }));
    return {
      meta: `${fmtDay(state.startedAt)} · ${t('yourId')} ${state.pid}`,
      storyLabel: t('startedHere'),
      story: state.story,
      rounds,
      labels: {
        title: t('rcTitle'), fav: t('isFav').replace('♥', '').trim(), technique: t('rcTech'), perspective: t('rcPersp'),
        version: t('myVersion'), readNote: t('rcRead'), rate: t('rcRate'), bad: t('rcBad'), good: t('rcGood'), reflect: t('reflectTitle'),
      },
      favWhyLabel: t('favWhy').replace(/[（(].*[)）]/, '').trim(),
      favWhy: state.favoriteRoundId ? state.favoriteWhy.trim() : '',
      footer: t('cardFooter', { n: rounds.length }),
    };
  }
  function showResultCard() {
    let canvas;
    try { canvas = window.HECIS_ResultCard.draw(cardData()); } catch { return toast(t('cardFailed'), 'warn'); }
    const dataUrl = canvas.toDataURL('image/png');
    canvas.toBlob((b) => { cardBlob = b; });
    openModal(`
      <h3>${t('cardTitle')}</h3>
      <p class="hint">${t('cardHint')}</p>
      <img class="result-img" src="${dataUrl}" alt="${esc(t('cardTitle'))}">
      <div class="row" style="justify-content:flex-end">
        <button class="btn ghost" data-action="closeModal">${t('close')}</button>
        <button class="btn" data-action="dlCard">${t('cardDownload')}</button>
      </div>`);
  }

  function fallbackModal(kind) {
    const pairs = formConfigured() ? formPayload() : null;
    const hasAudio = Object.keys(state.audio).length > 0;
    openModal(`
      <h3>${kind === 'config' ? t('fbTitleConfig') : t('fbTitleTimeout')}</h3>
      <p>${t('fbBody')}</p>
      ${CFG.researcherContact ? `<p><b>${esc(t('fbContact', { c: CFG.researcherContact }))}</b></p>` : ''}
      <p class="hint">${t('yourId')}: <b>${esc(state.pid)}</b></p>
      <div class="row">
        <button class="btn" data-action="saveCard">${t('saveCard')}</button>
        <button class="btn ghost" data-action="copy">${t('copyText')}</button>
        ${hasAudio ? `<button class="btn ghost" data-action="dlAudio">${t('dlAudio')}</button>` : ''}
      </div>
      ${pairs && kind !== 'config' ? `<p><a class="link-btn" href="${esc(prefillUrl(pairs))}" target="_blank" rel="noopener">${t('fbOpenForm')} ↗</a></p>` : ''}
      <p class="hint">${t('manualCopy')}</p>
      <textarea readonly onclick="this.select()">${esc(summaryText())}</textarea>
      <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-action="closeModal">${t('close')}</button></div>
    `);
  }

  /* ---------- actions ---------- */
  const actions = {
    lang(el) {
      state.lang = el.dataset.lang;
      persist(true);
      stopRecording();
      render();
    },
    home() { go('welcome'); },
    start() { go('story'); },
    continue() {
      let to = state.lastStep || 'story';
      if (['draw', 'rewrite'].includes(to) && !state.current) to = state.rounds.length ? 'journey' : 'story';
      go(to);
    },
    reset() {
      openModal(`<h3>${t('startNew')}</h3><p>${t('confirmReset')}</p>
        <div class="row" style="justify-content:flex-end">
          <button class="btn ghost" data-action="closeModal">${t('cancel')}</button>
          <button class="btn" data-action="confirmReset">${t('startNew')}</button>
        </div>`);
    },
    // Earlier work is never deleted here: it moves to "My records"
    confirmReset() {
      closeModal();
      archiveCurrent();
      state = newState(state.lang);
      go('story');
    },
    newDay() { actions.confirmReset(); },
    records() { lookup = ''; go('records'); },
    openRecord(el) {
      const pid = el.dataset.pid;
      if (pid !== state.pid) {
        const target = history.find((s) => s.pid === pid);
        if (!target) return;
        archiveCurrent();
        history = history.filter((s) => s.pid !== pid);
        Store.saveHistory(history);
        state = { ...target, lang: state.lang, step: 'welcome' };
      }
      actions.continue();
    },
    deleteRecord(el) {
      openModal(`<h3>${t('deleteTitle')}</h3><p>${t('confirmDelete', { id: esc(el.dataset.pid) })}</p>
        <div class="row" style="justify-content:flex-end">
          <button class="btn ghost" data-action="closeModal">${t('cancel')}</button>
          <button class="btn danger" data-action="confirmDelete" data-pid="${esc(el.dataset.pid)}">${t('recDelete')}</button>
        </div>`);
    },
    confirmDelete(el) {
      const pid = el.dataset.pid;
      closeModal();
      const s = pid === state.pid ? state : history.find((h) => h.pid === pid);
      if (!s) return;
      Object.keys(s.audio || {}).forEach((key) => Audio.del(pid + ':' + key).catch(() => {}));
      if (pid === state.pid) {
        stopRecording();
        stopPlayback();
        state = newState(state.lang);
        state.step = 'records';
      } else {
        history = history.filter((h) => h.pid !== pid);
        Store.saveHistory(history);
      }
      persist(true);
      render();
      toast(t('toastDeleted'));
    },
    goto(el) {
      const to = el.dataset.to;
      if (to === 'draw' && !state.current) state.current = blankRound();
      go(to);
    },
    storyNext() {
      if (state.story.trim().length < 3) {
        toast(t('needStory'), 'warn');
        shake(document.querySelector('.story-box'));
        return;
      }
      if (!state.current) state.current = blankRound();
      go('draw');
    },
    draw() {
      const deck = document.querySelector('.deck');
      if (deck) deck.classList.add('shuffle');
      setTimeout(() => {
        const id = pickTechnique();
        state.current.techniqueId = id;
        state.current.drawHistory.push(id);
        animateFlip = true;
        persist(true);
        render();
      }, deck ? 450 : 0);
    },
    reroll() {
      const flip = document.getElementById('flip');
      flip.classList.remove('is-flipped');
      setTimeout(() => {
        const id = pickTechnique();
        state.current.techniqueId = id;
        state.current.rerolls++;
        state.current.drawHistory.push(id);
        persist(true);
        document.getElementById('front').innerHTML = techCard(tech(id));
        flip.classList.add('is-flipped');
      }, 380);
    },
    // Random writing prompt, never the same one twice in a row
    idea(el) {
      const list = I18N[state.lang].storyPrompts;
      let i;
      do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === lastIdea);
      lastIdea = i;
      const box = document.getElementById('idea');
      box.hidden = false;
      box.textContent = list[i];
      box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
      el.lastChild.textContent = t('ideaAgain');
    },
    example(el, e) {
      e.stopPropagation();
      el.closest('.tcard').classList.toggle('show-ex');
    },
    persp(el) {
      const id = el.dataset.id;
      state.current.perspectiveId = state.current.perspectiveId === id ? null : id;
      syncPersp();
    },
    perspRandom() {
      const pool = CARDS.perspectives.filter((p) => p.id !== state.current.perspectiveId);
      state.current.perspectiveId = pool[Math.floor(Math.random() * pool.length)].id;
      syncPersp();
      const on = document.querySelector('.pcard.is-on');
      if (on) on.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
    },
    toRewrite() { go('rewrite'); },
    rate(el) {
      const k = el.dataset.key, v = Number(el.dataset.v);
      state.current.ratings[k] = v;
      const row = el.closest('.rating');
      row.classList.remove('missing');
      row.querySelectorAll('.dot').forEach((d) => {
        const on = Number(d.dataset.v) === v;
        d.classList.toggle('on', on);
        d.setAttribute('aria-checked', on);
      });
      persist();
    },
    readAloud(el) {
      const isStory = el.dataset.key === 'story';
      const val = isStory ? (state.storyReadAloud = !state.storyReadAloud) : (state.current.readAloud = !state.current.readAloud);
      el.classList.toggle('on', val);
      el.setAttribute('aria-pressed', val);
      persist();
    },
    recStart(el) { startRecording(el.dataset.key); },
    recStop() { stopRecording(); },
    recDelete(el) {
      const key = el.dataset.key;
      stopPlayback();
      Audio.del(state.pid + ':' + key).catch(() => {});
      delete state.audio[key];
      persist(true);
      paintRec(key);
    },
    play(el) { togglePlay(el.dataset.key); },
    async dlAudio() {
      const keys = Object.keys(state.audio);
      toast(t('toastAudio', { n: keys.length }));
      for (const key of keys) {
        const blob = await Audio.get(state.pid + ':' + key).catch(() => null);
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `how-else-${state.pid}-${audioLabel(key)}.${Audio.extFor(state.audio[key].mime)}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        await new Promise((r) => setTimeout(r, 400)); // browsers dislike rapid-fire downloads
      }
    },
    finishRound() {
      const cur = state.current;
      if (!cur.version.trim()) {
        toast(t('needVersion'), 'warn');
        const ta = document.getElementById('version');
        shake(ta); ta.focus();
        return;
      }
      const missing = RATING_KEYS.filter((k) => !cur.ratings[k]);
      if (missing.length) {
        toast(t('needRatings'), 'warn');
        missing.forEach((k) => {
          const row = document.querySelector(`.rating[data-key="${k}"]`);
          row.classList.remove('missing'); void row.offsetWidth; row.classList.add('missing');
        });
        document.querySelector(`.rating[data-key="${missing[0]}"]`).scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      cur.completedAt = nowISO();
      state.rounds.push(cur);
      state.current = null;
      go('next');
      setTimeout(() => window.Deco.burst(window.innerWidth / 2, window.innerHeight * 0.3, 40), 150);
    },
    another() {
      state.current = blankRound();
      go('draw');
    },
    finish() { go('journey'); },
    fav(el) {
      const id = el.dataset.id;
      state.favoriteRoundId = state.favoriteRoundId === id ? null : id;
      persist(true);
      stopPlayback();
      render();
    },
    saveCard() { showResultCard(); },
    dlCard() {
      if (!cardBlob) return;
      Store.downloadBlob(cardBlob, `how-else-${state.pid}.png`);
      toast(t('toastCard'));
    },
    async copy() {
      if (await Store.copyText(summaryText())) toast(t('toastCopied'));
      else fallbackModal('timeout');
    },
    async submit(el) {
      if (!formConfigured()) return fallbackModal('config');
      const pairs = formPayload();
      if (CFG.googleForm.mode === 'prefill') {
        window.open(prefillUrl(pairs), '_blank', 'noopener');
        state.submissions.push({ at: nowISO(), mode: 'prefill' });
        persist(true);
        toast(t('toastPrefill'), 'ok', 4000);
        render();
        return;
      }
      el.disabled = true;
      el.textContent = t('submitting');
      const ok = await postToForm(pairs);
      if (ok) {
        state.submissions.push({ at: nowISO(), mode: 'direct' });
        persist(true);
        render();
        toast(t('toastSubmitted'), 'ok', 3500);
        window.Deco.burst(window.innerWidth / 2, window.innerHeight * 0.6, 60);
      } else {
        render();
        fallbackModal('timeout');
      }
    },
    closeModal() { closeModal(); },
  };

  function syncPersp() {
    document.querySelectorAll('.pcard[data-id]').forEach((b) => b.classList.toggle('is-on', b.dataset.id === state.current.perspectiveId));
    persist();
  }

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || !actions[el.dataset.action]) return;
    actions[el.dataset.action](el, e);
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  app.addEventListener('input', (e) => {
    const key = e.target.dataset.bind;
    if (!key) return;
    if (key === 'lookup') {
      lookup = e.target.value;
      document.querySelector('.rec-list').innerHTML = recordList();
      return;
    }
    if (key === 'story' || key === 'favoriteWhy') state[key] = e.target.value;
    else if (state.current) state.current[key] = e.target.value;
    persist();
  });
  window.addEventListener('beforeunload', () => Store.save(state));
  Store.requestPersist();

  state = Store.load() || newState(defaultLang());
  // Fill in fields added after a participant's progress was first saved
  state.audio = state.audio || {};
  if (state.storyReadAloud == null) state.storyReadAloud = false;
  // Guard against a saved state that points at a screen it can't show,
  // or at a card that no longer exists in the deck
  if (state.current && state.current.techniqueId && !tech(state.current.techniqueId)) state.current.techniqueId = null;
  state.rounds = state.rounds.filter((r) => tech(r.techniqueId));
  if (!state.rounds.some((r) => r.id === state.favoriteRoundId)) state.favoriteRoundId = null;
  if (['draw', 'rewrite'].includes(state.step) && !state.current) state.step = state.rounds.length ? 'journey' : 'story';
  if (state.step === 'rewrite' && !state.current.techniqueId) state.step = 'draw';
  render();
})();
