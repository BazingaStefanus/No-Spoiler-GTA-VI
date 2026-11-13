(function (root) {
  'use strict';

  const DEFAULT_KEYWORDS = [
    'GTA 6',
    'GTA VI',
    'GTA6',
    'GTAVI',
    'Grand Theft Auto VI',
    'Grand Theft Auto 6',
    'Grand Theft Auto: VI',
    'Grand Theft Auto: 6',
    'Vice City',
    'GTA VI Spoilers',
    'GTA 6 Spoilers',
    'GTA VI Leaks',
    'GTA 6 Leaks',
    'GTA VI Rumors',
    'GTA 6 Rumors',
    'Leonida',
    'Leonidas',
    'Lucia Caminos',
    'Jason Duval',
    'Jason and Lucia',
    'Lucia and Jason',
    'Jason und Lucia',
    'Lucia und Jason',
    'Jason & Lucia',
    'Lucia & Jason',
    'Jason y Lucia',
    'Lucia y Jason',
    'Jason y Lucía',
    'Lucía y Jason',
    'Lucía Caminos',
    'Jason et Lucia',
    'Lucia et Jason',
    'Jason e Lucia',
    'Lucia e Jason',
    'Jason en Lucia',
    'Lucia en Jason',
    'Jason i Lucia',
    'Lucia i Jason',
    // Places
    'Port Gellhorn',
    'Leonida Keys',
    'Grassrivers',
    'Mount Kalaga',
    // Side characters (full names only, to avoid false positives)
    'Cal Hampton',
    'Boobie Ike',
    "Dre'Quan Priest",
    'Dre’Quan Priest',
    'Real Dimez',
    'Raul Bautista',
    'Brian Heder'
  ];

  const DEFAULTS = {
    enabled: true,
    keywords: DEFAULT_KEYWORDS,
    mode: 'blackout', // blackout | blur | hide
    granularity: 'container', // container | paragraph
    hideMedia: true,
    siteMode: 'blacklist', // blacklist: active everywhere except listed sites | whitelist: active only on listed sites
    sites: []
  };

  const getApi = () => root.browser ?? root.chrome;

  function normalizeHost(host) {
    return String(host || '').trim().toLowerCase().replace(/^www\./, '');
  }

  // Also accepts full URLs and reduces them to the host name.
  function normalizeDomain(input) {
    let s = String(input || '').trim().toLowerCase();
    if (!s) return '';
    s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').split(/[/?#]/)[0].split(':')[0];
    return normalizeHost(s);
  }

  function hostMatches(host, domain) {
    const h = normalizeHost(host);
    const d = normalizeHost(domain);
    return !!d && (h === d || h.endsWith('.' + d));
  }

  function isSiteActive(settings, host) {
    const listed = settings.sites.some((d) => hostMatches(host, d));
    return settings.siteMode === 'whitelist' ? listed : !listed;
  }

  function setSiteActive(settings, host, active) {
    const h = normalizeHost(host);
    const rest = settings.sites.filter((d) => !hostMatches(h, d));
    const shouldBeListed = settings.siteMode === 'whitelist' ? active : !active;
    return shouldBeListed ? [...rest, h] : rest;
  }

  function parseLines(text, mapper) {
    const seen = new Set();
    const out = [];
    for (const line of String(text || '').split(/\r?\n/)) {
      const v = mapper ? mapper(line) : line.trim();
      if (v && !seen.has(v.toLowerCase())) {
        seen.add(v.toLowerCase());
        out.push(v);
      }
    }
    return out;
  }

  function normalize(stored) {
    const s = { ...DEFAULTS, ...(stored || {}) };
    if (!Array.isArray(s.keywords)) s.keywords = DEFAULT_KEYWORDS;
    if (!Array.isArray(s.sites)) s.sites = [];
    if (!['blackout', 'blur', 'hide'].includes(s.mode)) s.mode = DEFAULTS.mode;
    if (!['container', 'paragraph'].includes(s.granularity)) s.granularity = DEFAULTS.granularity;
    if (!['blacklist', 'whitelist'].includes(s.siteMode)) s.siteMode = DEFAULTS.siteMode;
    return s;
  }

  async function load() {
    const res = await getApi().storage.local.get('settings');
    return normalize(res.settings);
  }

  async function save(settings) {
    await getApi().storage.local.set({ settings: normalize(settings) });
  }

  const NSG = (root.NSG = root.NSG || {});
  Object.assign(NSG, {
    DEFAULTS,
    DEFAULT_KEYWORDS,
    normalizeHost,
    normalizeDomain,
    hostMatches,
    isSiteActive,
    setSiteActive,
    parseLines,
    normalize,
    load,
    save
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = NSG;
})(globalThis);
