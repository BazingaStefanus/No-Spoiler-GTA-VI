(function (root) {
  'use strict';

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // "GTA 6" erkennt auch "GTA6", "gta-6", "GTA_6". Satzzeichen wie ":" bleiben Pflichtzeichen.
  function keywordToPattern(keyword) {
    return keyword
      .trim()
      .split(/[\s\-_]+/)
      .filter(Boolean)
      .map(escapeRegExp)
      .join('[\\s\\u00a0\\-_]*');
  }

  // Liefert ein RegExp (ohne g-Flag, daher zustandslos mit .test) oder null.
  function buildMatcher(keywords) {
    const patterns = (keywords || [])
      .map((k) => String(k || '').trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map(keywordToPattern)
      .filter(Boolean);
    if (!patterns.length) return null;
    return new RegExp(
      '(?<![\\p{L}\\p{N}])(?:' + patterns.join('|') + ')(?![\\p{L}\\p{N}])',
      'iu'
    );
  }

  const NSG = (root.NSG = root.NSG || {});
  Object.assign(NSG, { buildMatcher, keywordToPattern });

  if (typeof module !== 'undefined' && module.exports) module.exports = NSG;
})(globalThis);
