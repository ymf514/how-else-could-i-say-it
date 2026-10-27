/**
 * Builds the research Google Form for "How Else Could I Say It?".
 *
 * How to run (one time):
 *   1. Open your Google Form in edit mode → ⋮ (top right) → Apps Script.
 *   2. Delete the sample code, paste this whole file, click Save, then Run ▶ `setupForm`.
 *   3. Approve the permission prompt (it only edits this form).
 *   4. Open View → Logs (or "Execution log"): it prints the `fields: { … }` block
 *      for js/config.js. Or just tell Claude the form is ready and it can read it.
 *
 * Every question is optional short/paragraph text, so the website can fill it in
 * one click. Each title ends with its data key in brackets, e.g. "Participant ID [pid]".
 * Running it again skips questions that already exist.
 */

var MAX_ROUNDS = 3; // keep in sync with googleForm.maxRounds in js/config.js

var BASE = [
  ['pid', 'Participant ID', 'short'],
  ['device_id', 'Device ID', 'short'],
  ['session_no', 'Session number on this device', 'short'],
  ['lang', 'Language', 'short'],
  ['started_at', 'Started at', 'short'],
  ['submitted_at', 'Submitted at', 'short'],
  ['story', 'Original story', 'long'],
  ['story_read_aloud', 'Original story read aloud', 'short'],
  ['rounds_count', 'Number of rounds', 'short'],
  ['favorite', 'Favorite version', 'short'],
  ['favorite_why', 'Why this favorite', 'long'],
];

var ROUND = [
  ['technique', 'Technique card', 'short'],
  ['perspective', 'Perspective card', 'short'],
  ['version', 'My version of the story', 'long'],
  ['ease', 'Ease of use (1-5)', 'short'],
  ['funny', 'Perceived funniness (1-5)', 'short'],
  ['pref', 'Personal preference (1-5)', 'short'],
  ['accuracy', 'Expressive accuracy (1-5)', 'short'],
  ['comfort', 'Comfort (1-5)', 'short'],
  ['reflection', 'What changed / difficult / surprising', 'long'],
  ['read_aloud', 'Read aloud', 'short'],
  ['rerolls', 'Rerolls', 'short'],
];

var TAIL = [
  ['summary_text', 'Full record (text)', 'long'],
  ['full_json', 'Full record (JSON)', 'long'],
];

function setupForm() {
  var form = FormApp.getActiveForm();
  if (!form) throw new Error('Open this script from the form: Form editor → ⋮ → Apps Script.');

  // Remove the empty starter question if it is still there
  form.getItems().forEach(function (item) {
    if (item.getTitle() === 'Untitled Question' || item.getTitle() === '无标题问题') form.deleteItem(item);
  });

  if (!form.getTitle() || form.getTitle() === 'Untitled form') form.setTitle('How Else Could I Say It? — responses');
  form.setDescription('Responses are submitted automatically by the How Else Could I Say It? website. No need to fill this in by hand.');

  // Settings that let the website submit without a sign-in
  try { form.setCollectEmail(false); } catch (e) {}
  try { form.setLimitOneResponsePerUser(false); } catch (e) {}
  try { form.setRequireLogin(false); } catch (e) {} // Workspace accounts only
  try { form.setAllowResponseEdits(false); } catch (e) {}

  var specs = BASE.slice();
  for (var n = 1; n <= MAX_ROUNDS; n++) {
    ROUND.forEach(function (r) { specs.push(['r' + n + '_' + r[0], 'Round ' + n + ' · ' + r[1], r[2]]); });
  }
  specs = specs.concat(TAIL);

  var existing = {};
  form.getItems().forEach(function (item) {
    var m = item.getTitle().match(/\[([a-z0-9_]+)\]\s*$/);
    if (m) existing[m[1]] = item;
  });

  specs.forEach(function (s) {
    if (existing[s[0]]) return;
    var title = s[1] + ' [' + s[0] + ']';
    var item = s[2] === 'long' ? form.addParagraphTextItem() : form.addTextItem();
    item.setTitle(title).setRequired(false);
    existing[s[0]] = item;
  });

  // Build a pre-filled link to read the entry IDs from, then print the config block
  var resp = form.createResponse();
  Object.keys(existing).forEach(function (key) {
    var item = existing[key];
    var typed = item.getType() === FormApp.ItemType.PARAGRAPH_TEXT ? item.asParagraphTextItem() : item.asTextItem();
    resp = resp.withItemResponse(typed.createResponse(key));
  });
  var url = resp.toPrefilledUrl();
  var map = {};
  url.split('?')[1].split('&').forEach(function (pair) {
    var kv = pair.split('=');
    if (kv[0].indexOf('entry.') === 0) map[decodeURIComponent(kv[1].replace(/\+/g, ' '))] = kv[0];
  });

  var lines = specs.map(function (s) { return '      ' + s[0] + ": '" + (map[s[0]] || '') + "',"; });
  Logger.log('Public link (viewUrl): ' + form.getPublishedUrl());
  Logger.log('Paste into js/config.js:\n    fields: {\n' + lines.join('\n') + '\n    },');
}
