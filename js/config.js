/* =============================================================
   STUDY CONFIG — the one file to edit for Google Forms & settings
   ============================================================= */
window.HECIS_CONFIG = {
  // Suggested (not required) number of tries
  suggestedRounds: 3,

  // Shown in the "can't reach Google Forms" fallback (email / WeChat / IG …)
  researcherContact: '',

  // LocalStorage key. Change it to start a clean study wave.
  storageKey: 'hecis-v1',

  googleForm: {
    // Your form's public link (…/viewform). Keep as-is unless the form changes.
    viewUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSdtXr-cIzkrN_f3-PilrN__Q5gaf3plN0E9wxq-y7Bq-yAjJQ/viewform',

    // 'direct'  = one-click: answers are posted to the form in the background.
    // 'prefill' = opens the Google Form in a new tab with everything filled in;
    //             the participant just presses Google's Submit button.
    mode: 'direct',

    // Number of sections (pages) in the form. Only matters for 'direct' mode.
    pageCount: 1,

    // How many rounds get their own per-round columns (r1_…, r2_…).
    // Extra rounds are still included in summary_text and full_json.
    maxRounds: 3,

    /* Map each data key → the form question's entry ID ("entry.123456789").
       Leave '' for anything your form doesn't have — it will be skipped.
       Easiest way to fill this in: open setup.html (see README). */
    fields: {
      pid: 'entry.2106337975',            // participant ID, e.g. P261026-1432-K7QX
      device_id: 'entry.2032192006',      // random ID of this browser (links repeat sessions)
      session_no: 'entry.1305907608',     // 1, 2, 3… sessions started in this browser
      lang: 'entry.290571998',           // en / zh
      started_at: 'entry.162799398',
      submitted_at: 'entry.801677186',
      story: 'entry.1323787354',          // the original everyday story
      story_read_aloud: 'entry.398737556', // recorded (12s) / yes / no
      rounds_count: 'entry.1525383373',
      favorite: 'entry.830758102',       // e.g. "Round 2 · Irony"
      favorite_why: 'entry.1844728852',
      summary_text: 'entry.1236015460',   // everything as readable text
      full_json: 'entry.1259583410',      // everything as JSON

      r1_technique: 'entry.1127898045', r1_perspective: 'entry.350507951', r1_version: 'entry.494785610',
      r1_ease: 'entry.604144752', r1_funny: 'entry.1854255065', r1_pref: 'entry.896026116', r1_accuracy: 'entry.582206194', r1_comfort: 'entry.797190806',
      r1_reflection: 'entry.1155036571', r1_read_aloud: 'entry.1413798815', r1_rerolls: 'entry.517979572',

      r2_technique: 'entry.1173142401', r2_perspective: 'entry.1193385476', r2_version: 'entry.1305240743',
      r2_ease: 'entry.1570196446', r2_funny: 'entry.843563066', r2_pref: 'entry.1419036015', r2_accuracy: 'entry.781422204', r2_comfort: 'entry.1587102375',
      r2_reflection: 'entry.22862533', r2_read_aloud: 'entry.1095076546', r2_rerolls: 'entry.787051800',

      r3_technique: 'entry.455989362', r3_perspective: 'entry.1859660642', r3_version: 'entry.665687723',
      r3_ease: 'entry.387521614', r3_funny: 'entry.733863946', r3_pref: 'entry.1889672647', r3_accuracy: 'entry.1974749923', r3_comfort: 'entry.476631307',
      r3_reflection: 'entry.535535209', r3_read_aloud: 'entry.1959074156', r3_rerolls: 'entry.1236038295',
    },
  },
};

// Every key the app can send (used by setup.html). r{n}_ keys repeat per round.
window.HECIS_FIELD_KEYS = {
  base: ['pid', 'device_id', 'session_no', 'lang', 'started_at', 'submitted_at', 'story', 'story_read_aloud',
    'rounds_count', 'favorite', 'favorite_why', 'summary_text', 'full_json'],
  round: ['technique', 'perspective', 'version', 'ease', 'funny', 'pref', 'accuracy',
    'comfort', 'reflection', 'read_aloud', 'rerolls'],
};
