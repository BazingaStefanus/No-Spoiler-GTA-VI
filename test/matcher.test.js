const test = require('node:test');
const assert = require('node:assert/strict');
const NSG = require('../src/storage.js');
require('../src/matcher.js');

const re = NSG.buildMatcher(NSG.DEFAULT_KEYWORDS);

test('Default keywords are detected', () => {
  for (const t of [
    'GTA 6',
    'gta vi',
    'GTA VI Trailer 3',
    'GTA6',
    'GTA-6',
    '#GTA6',
    'Grand Theft Auto VI',
    'grand theft auto 6',
    'Grand  Theft\u00a0Auto VI',
    'Grand Theft Auto: VI',
    'Neuer Leak zu GTA VI!',
    'https://example.com/news/gta-vi-trailer.jpg',
    'GTA-VI-Trailer',
    'gta_6_screenshot.png'
  ]) {
    assert.ok(re.test(t), t);
  }
});

test('Default keywords contain no duplicates', () => {
  const lower = NSG.DEFAULT_KEYWORDS.map((k) => k.toLowerCase());
  assert.equal(new Set(lower).size, lower.length);
});

test('Similar terms are not detected', () => {
  for (const t of ['GTA V', 'GTA 5', 'GTA 60', 'Grand Theft Auto V', 'GTAVIP', 'AGTA 6', 'Grand Theft Auto 5']) {
    assert.ok(!re.test(t), t);
  }
});

test('Empty keyword list yields null, special characters are escaped', () => {
  assert.equal(NSG.buildMatcher([]), null);
  assert.equal(NSG.buildMatcher(['  ', '']), null);
  const r = NSG.buildMatcher(['C++ (new)']);
  assert.ok(r.test('This is C++ (new) here'));
  assert.ok(!r.test('C (new)'));
});

test('Site logic for blacklist/whitelist including subdomains', () => {
  const black = NSG.normalize({ siteMode: 'blacklist', sites: ['example.com'] });
  assert.equal(NSG.isSiteActive(black, 'www.example.com'), false);
  assert.equal(NSG.isSiteActive(black, 'news.example.com'), false);
  assert.equal(NSG.isSiteActive(black, 'notexample.com'), true);

  const white = NSG.normalize({ siteMode: 'whitelist', sites: ['example.com'] });
  assert.equal(NSG.isSiteActive(white, 'a.example.com'), true);
  assert.equal(NSG.isSiteActive(white, 'other.org'), false);
});

test('setSiteActive toggles entries correctly', () => {
  const black = NSG.normalize({ siteMode: 'blacklist', sites: [] });
  assert.deepEqual(NSG.setSiteActive(black, 'www.a.com', false), ['a.com']);
  assert.deepEqual(NSG.setSiteActive({ ...black, sites: ['a.com'] }, 'a.com', true), []);
  const white = NSG.normalize({ siteMode: 'whitelist', sites: [] });
  assert.deepEqual(NSG.setSiteActive(white, 'a.com', true), ['a.com']);
  assert.deepEqual(NSG.setSiteActive({ ...white, sites: ['a.com'] }, 'a.com', false), []);
});

test('normalizeDomain and parseLines', () => {
  assert.equal(NSG.normalizeDomain('https://www.Reddit.com/r/gaming?x=1'), 'reddit.com');
  assert.equal(NSG.normalizeDomain('  '), '');
  assert.deepEqual(NSG.parseLines('a\n\nA\n b \n'), ['a', 'b']);
});
