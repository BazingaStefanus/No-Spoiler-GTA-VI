const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('../tools/make_firefox_manifest.js');
const base = require('../manifest.json');
const overrides = require('../tools/firefox-overrides.json');

test('Firefox manifest is manifest.json plus the Firefox overrides', () => {
  const ff = build();
  assert.deepEqual(ff, { ...base, ...overrides });
  assert.ok(ff.browser_specific_settings.gecko.id);
  assert.equal(base.browser_specific_settings, undefined);
});
