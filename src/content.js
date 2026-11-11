(function () {
  'use strict';

  const NSG = globalThis.NSG;
  const api = globalThis.browser ?? globalThis.chrome;

  const HIDDEN = 'nsg-hidden';
  const BLOCK = 'nsg-block';
  const MEDIA = 'nsg-media';
  const MEDIA_HOST = 'nsg-media-host';
  const REVEALED = 'nsg-revealed';
  const WRAP = 'nsg-wrap';

  const MAX_CONTAINER_TEXT = 2500; // größere Container (z. B. ganze Artikelseiten) → Absatzebene
  const MAX_BLOCK_TEXT = 5000;
  const MAX_DEPTH = 15;

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'TEMPLATE', 'HEAD', 'TITLE']);
  const CONTAINER_TAGS = new Set(['ARTICLE', 'LI', 'TR', 'BLOCKQUOTE', 'FIGURE']);
  const CONTAINER_ROLES = new Set(['article', 'listitem', 'row', 'option', 'gridcell']);
  const CUSTOM_RE = /-(renderer|post|comment|card|item|tile|teaser|article)$/i;
  const CLASS_RE = /^(card|comment|teaser|story|post|entry|tile|thread|tweet|result|item)s?$|(^|[-_])(card|teaser|comment|tile|item)$/i;
  const MEDIA_SELECTOR = 'img, video, picture, canvas, svg, iframe, [role="img"]';
  const MEDIA_ATTRS = ['alt', 'title', 'src', 'srcset', 'data-src', 'data-srcset', 'data-original', 'poster', 'aria-label'];

  let re = null;
  let reAll = null; // globale Variante zum Finden aller Treffer in einem Textknoten
  let cfg = null;
  let observer = null;
  let rafId = 0;
  const pendingNodes = new Set();
  const pendingMedia = new Set();

  // Schwärzen: Text bekommt per CSS Custom Highlight API schwarze Balken (keine DOM-Änderung, Layout bleibt).
  // Auf dunklen Hintergründen werden die Balken stattdessen weiß (zweite Highlight).
  const HIGHLIGHT = 'nsg-redact';
  const HIGHLIGHT_LIGHT = 'nsg-redact-light';
  const SWEEP_INTERVAL = 5000;
  const THEME_DEBOUNCE = 200;
  let highlight = null;
  let highlightLight = null;
  let rangesByTarget = new Map(); // Container → { ranges: Set<Range>, white: boolean }
  let themeTimer = 0;
  let themeObserver = null;
  let themeQuery = null;
  let rangeOfNode = new WeakMap(); // Textknoten → { ranges, target }
  let lastSweep = 0;

  // ---------- Hilfsfunktionen ----------

  function safeDecode(s) {
    try {
      return decodeURIComponent(s);
    } catch (_) {
      return s;
    }
  }

  function isContainer(el) {
    if (CONTAINER_TAGS.has(el.tagName)) return true;
    const role = el.getAttribute('role');
    if (role && CONTAINER_ROLES.has(role)) return true;
    if (el.localName.includes('-') && CUSTOM_RE.test(el.localName)) return true;
    for (const c of el.classList) if (CLASS_RE.test(c)) return true;
    return false;
  }

  function nearestBlock(el) {
    let cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      const d = getComputedStyle(cur).display;
      if (d !== 'inline' && d !== 'contents') return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  function textLength(el) {
    return (el.textContent || '').length;
  }

  function findTarget(textNode) {
    const el = textNode.parentElement;
    if (!el) return null;

    if (cfg.granularity === 'container') {
      let cur = el;
      for (let i = 0; cur && i < MAX_DEPTH; i++, cur = cur.parentElement) {
        if (cur === document.body || cur === document.documentElement) break;
        if (isContainer(cur)) {
          if (textLength(cur) <= MAX_CONTAINER_TEXT) return cur;
          break;
        }
      }
    }
    const block = nearestBlock(el);
    if (block && textLength(block) <= MAX_BLOCK_TEXT) return block;
    return null;
  }

  // Medien in offenen Shadow-Roots (z. B. Reddit: shreddit-player-2) sind für Selektoren und CSS von außen unsichtbar.
  function deepQueryAll(root, selector, out = []) {
    if (root.querySelectorAll) {
      root.querySelectorAll(selector).forEach((n) => out.push(n));
      root.querySelectorAll('*').forEach((n) => n.shadowRoot && deepQueryAll(n.shadowRoot, selector, out));
    }
    return out;
  }

  function pauseVideos(el) {
    if (el.localName === 'video') el.pause();
    deepQueryAll(el, 'video').forEach((v) => v.pause());
  }

  // Markiert die äußersten Shadow-Hosts im Container, die Medien enthalten; CSS unscharf-stellt dann den Host.
  function markShadowMedia(target) {
    if (!cfg || !cfg.hideMedia || !target.isConnected) return;
    const hosts = [];
    const collect = (root) => {
      root.querySelectorAll('*').forEach((n) => {
        if (n.shadowRoot) hosts.push(n);
      });
    };
    collect(target);
    for (const host of hosts) {
      if (host.classList.contains(MEDIA_HOST)) continue;
      if (deepQueryAll(host.shadowRoot, MEDIA_SELECTOR).length) host.classList.add(MEDIA_HOST);
    }
    pauseVideos(target);
  }

  // Player werden oft verzögert gerendert → mehrfach nachprüfen.
  function markShadowMediaLater(target) {
    for (const delay of [400, 1500, 4000]) {
      setTimeout(() => cfg && target.classList.contains(BLOCK) && markShadowMedia(target), delay);
    }
  }

  // ---------- Schwärzen (Balken hinter dem Text) ----------

  function hlFor(white) {
    return white ? highlightLight : highlight;
  }

  function parseColor(str) {
    const m = /^rgba?\(([^)]+)\)$/.exec(str);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    if (p.length < 3 || p.slice(0, 3).some(isNaN)) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }

  function luminance(c) {
    return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
  }

  // Dunkel = erster deckender Hintergrund eines Vorfahren ist dunkel; ohne Hintergrund entscheidet die Textfarbe.
  function isDarkContext(el) {
    for (let cur = el; cur; cur = cur.parentElement) {
      const bg = parseColor(getComputedStyle(cur).backgroundColor);
      if (bg && bg.a > 0.5) return luminance(bg) < 0.5;
    }
    const fg = parseColor(getComputedStyle(el).color);
    return fg ? luminance(fg) > 0.5 : false;
  }

  function entryFor(target) {
    let entry = rangesByTarget.get(target);
    if (!entry) {
      entry = { ranges: new Set(), white: isDarkContext(target) };
      rangesByTarget.set(target, entry);
    }
    return entry;
  }

  function unredactText(node) {
    const rec = rangeOfNode.get(node);
    if (!rec) return;
    const entry = rangesByTarget.get(rec.target);
    for (const r of rec.ranges) {
      hlFor(entry ? entry.white : false).delete(r);
      if (entry) entry.ranges.delete(r);
    }
    rangeOfNode.delete(node);
  }

  // Schwärzt den Text, spart aber die Keyword-Treffer aus (Segmente zwischen den Treffern).
  function redactText(node) {
    const target = node.parentElement && node.parentElement.closest('.' + BLOCK);
    if (!target) return;
    unredactText(node); // Ranges müssen nach geänderten Textdaten neu aufgebaut werden

    const text = node.nodeValue;
    const ranges = [];
    const addSegment = (from, to) => {
      if (to <= from) return;
      const r = document.createRange();
      r.setStart(node, from);
      r.setEnd(node, to);
      ranges.push(r);
    };
    let pos = 0;
    reAll.lastIndex = 0;
    for (let m; (m = reAll.exec(text)); ) {
      if (!m[0]) {
        reAll.lastIndex++;
        continue;
      }
      addSegment(pos, m.index);
      pos = m.index + m[0].length;
    }
    addSegment(pos, text.length);

    const entry = entryFor(target);
    const hl = hlFor(entry.white);
    for (const r of ranges) {
      hl.add(r);
      entry.ranges.add(r);
    }
    rangeOfNode.set(node, { ranges, target });
  }

  // Prüft alle verborgenen Container erneut (Theme-Wechsel, Stylesheets nachgeladen) und verschiebt die Balken.
  function reclassify() {
    themeTimer = 0;
    if (!highlight) return;
    for (const [target, entry] of rangesByTarget) {
      if (!target.isConnected) continue;
      const white = isDarkContext(target);
      if (white === entry.white) continue;
      const from = hlFor(entry.white);
      const to = hlFor(white);
      for (const r of entry.ranges) {
        from.delete(r);
        to.add(r);
      }
      entry.white = white;
    }
  }

  function scheduleReclassify() {
    clearTimeout(themeTimer);
    themeTimer = setTimeout(reclassify, THEME_DEBOUNCE);
  }

  function redactWithin(root) {
    if (!highlight) return;
    if (root.nodeType === 3) {
      if (root.nodeValue.trim() && !SKIP_TAGS.has(root.parentElement && root.parentElement.tagName)) redactText(root);
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.nodeValue.trim() && n.parentElement && !SKIP_TAGS.has(n.parentElement.tagName)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(redactText);
  }

  function unredactTarget(target) {
    const entry = rangesByTarget.get(target);
    if (!entry || !highlight) return;
    const hl = hlFor(entry.white);
    for (const r of entry.ranges) {
      hl.delete(r);
      rangeOfNode.delete(r.startContainer);
    }
    rangesByTarget.delete(target);
  }

  // Entfernt Ranges von Knoten, die aus dem DOM verschwunden sind.
  function sweep() {
    lastSweep = Date.now();
    for (const [target, entry] of rangesByTarget) {
      const gone = !target.isConnected;
      const hl = hlFor(entry.white);
      for (const r of entry.ranges) {
        if (gone || !r.startContainer.isConnected) {
          hl.delete(r);
          entry.ranges.delete(r);
        }
      }
      if (!entry.ranges.size) rangesByTarget.delete(target);
    }
  }

  function hiddenAncestor(n) {
    const el = n.nodeType === 1 ? n : n.parentElement;
    return el && el.closest('.' + BLOCK + ':not(.' + REVEALED + ')');
  }

  // ---------- Verbergen ----------

  function hideText(textNode) {
    const parent = textNode.parentElement;
    if (!parent || parent.closest('.' + HIDDEN)) return;
    if (SKIP_TAGS.has(parent.tagName) || parent.closest('[contenteditable=""], [contenteditable="true"]')) return;

    let target = findTarget(textNode);
    if (!target) {
      // Kein sinnvoller Container: Textknoten einzeln umhüllen.
      target = document.createElement('span');
      target.className = WRAP;
      textNode.parentNode.replaceChild(target, textNode);
      target.appendChild(textNode);
    }
    target.classList.add(HIDDEN, BLOCK);
    if (cfg.mode === 'blackout') redactWithin(target);
    if (cfg.hideMedia) {
      markShadowMedia(target);
      markShadowMediaLater(target);
    }
  }

  function mediaText(el) {
    const parts = [];
    for (const a of MEDIA_ATTRS) {
      const v = el.getAttribute(a);
      if (v) parts.push(safeDecode(v));
    }
    if (el.currentSrc) parts.push(safeDecode(el.currentSrc));
    const link = el.closest('a[href]');
    if (link) {
      parts.push(safeDecode(link.getAttribute('href')));
      for (const a of ['title', 'aria-label']) {
        const v = link.getAttribute(a);
        if (v) parts.push(v);
      }
    }
    const figure = el.closest('figure');
    if (figure) {
      const cap = figure.querySelector('figcaption');
      if (cap && cap.textContent.length < 500) parts.push(cap.textContent);
    }
    return parts.join('\n');
  }

  function checkMedia(el) {
    if (!cfg.hideMedia || el.nodeType !== 1 || el.closest('.' + HIDDEN)) return;
    if (!el.matches(MEDIA_SELECTOR)) return;
    if (re.test(mediaText(el))) {
      el.classList.add(HIDDEN, MEDIA);
      pauseVideos(el);
    }
  }

  // ---------- Scannen ----------

  function acceptText(n) {
    const p = n.parentElement;
    if (!p || SKIP_TAGS.has(p.tagName)) return false;
    return n.nodeValue.length >= 3 && re.test(n.nodeValue);
  }

  function scan(root) {
    if (root.nodeType === 1 && root.closest('.' + HIDDEN)) return;

    const found = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (acceptText(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
    });
    while (walker.nextNode()) found.push(walker.currentNode);
    found.forEach(hideText);

    if (cfg.hideMedia && root.nodeType === 1) {
      checkMedia(root);
      root.querySelectorAll(MEDIA_SELECTOR).forEach(checkMedia);
    }
  }

  function processNode(n) {
    if (!n.isConnected) return;
    // Neuer Text in einem bereits verborgenen Container wird ebenfalls geschwärzt.
    const hidden = hiddenAncestor(n);
    if (hidden) {
      if (cfg.mode === 'blackout') redactWithin(n);
      markShadowMedia(hidden);
      return;
    }
    if (n.nodeType === 3) {
      if (acceptText(n)) hideText(n);
    } else if (n.nodeType === 1) {
      scan(n);
    }
  }

  function flush() {
    rafId = 0;
    const nodes = [...pendingNodes];
    const media = [...pendingMedia];
    pendingNodes.clear();
    pendingMedia.clear();
    nodes.forEach(processNode);
    media.forEach((m) => m.isConnected && checkMedia(m));
    if (highlight && rangesByTarget.size && Date.now() - lastSweep > SWEEP_INTERVAL) sweep();
  }

  function schedule() {
    if (!rafId) rafId = requestAnimationFrame(flush);
  }

  function onMutations(mutations) {
    for (const m of mutations) {
      if (m.type === 'childList') m.addedNodes.forEach((n) => pendingNodes.add(n));
      else if (m.type === 'characterData') pendingNodes.add(m.target);
      else if (m.type === 'attributes') pendingMedia.add(m.target);
    }
    schedule();
  }

  // ---------- Lebenszyklus ----------

  function teardown() {
    if (observer) observer.disconnect();
    observer = null;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    pendingNodes.clear();
    pendingMedia.clear();

    if (highlight) {
      highlight.clear();
      highlightLight.clear();
      CSS.highlights.delete(HIGHLIGHT);
      CSS.highlights.delete(HIGHLIGHT_LIGHT);
    }
    highlight = null;
    highlightLight = null;
    clearTimeout(themeTimer);
    themeTimer = 0;
    if (themeObserver) themeObserver.disconnect();
    themeObserver = null;
    if (themeQuery) themeQuery.removeEventListener('change', scheduleReclassify);
    themeQuery = null;
    rangesByTarget = new Map();
    rangeOfNode = new WeakMap();
    document.querySelectorAll('.' + WRAP).forEach((w) => w.replaceWith(...w.childNodes));
    document.querySelectorAll('.' + HIDDEN).forEach((el) => el.classList.remove(HIDDEN, BLOCK, MEDIA, REVEALED));
    document.querySelectorAll('.' + MEDIA_HOST).forEach((el) => el.classList.remove(MEDIA_HOST));
    const root = document.documentElement;
    if (root) {
      root.removeAttribute('data-nsg-mode');
      root.removeAttribute('data-nsg-media');
    }
    re = null;
    reAll = null;
    cfg = null;
  }

  function apply(settings) {
    teardown();
    const root = document.documentElement;
    if (!root || !settings.enabled || !NSG.isSiteActive(settings, location.hostname)) return;
    re = NSG.buildMatcher(settings.keywords);
    if (!re) return;
    reAll = new RegExp(re.source, 'giu');
    cfg = settings;

    // Ohne Highlight-API (alte Browser) wird auf Unscharf zurückgefallen.
    if (settings.mode === 'blackout') {
      if (globalThis.CSS && CSS.highlights && globalThis.Highlight) {
        highlight = new Highlight();
        highlightLight = new Highlight();
        CSS.highlights.set(HIGHLIGHT, highlight);
        CSS.highlights.set(HIGHLIGHT_LIGHT, highlightLight);
      } else {
        cfg = { ...settings, mode: 'blur' };
      }
    }
    root.setAttribute('data-nsg-mode', cfg.mode);
    root.setAttribute('data-nsg-media', settings.hideMedia ? 'on' : 'off');

    observer = new MutationObserver(onMutations);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['src', 'srcset', 'alt', 'title', 'data-src', 'data-srcset', 'poster']
    });

    if (highlight) {
      // Theme-Wechsel: System-Einstellung, Klassen/Attribute an <html>/<body> sowie fertig geladene Stylesheets
      themeQuery = matchMedia('(prefers-color-scheme: dark)');
      themeQuery.addEventListener('change', scheduleReclassify);
      themeObserver = new MutationObserver(scheduleReclassify);
      const opts = { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-bs-theme', 'data-mode', 'data-color-mode', 'data-color-scheme', 'theme'] };
      themeObserver.observe(root, opts);
      if (document.body) themeObserver.observe(document.body, opts);
      else document.addEventListener('DOMContentLoaded', () => themeObserver && themeObserver.observe(document.body, opts), { once: true });
    }

    const initial = () => cfg && scan(document.documentElement);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initial, { once: true });
    }
    initial();
  }

  // Klick deckt verborgene Bereiche auf (und verhindert, dass dabei Links geöffnet werden).
  document.addEventListener(
    'click',
    (e) => {
      if (!cfg || cfg.mode === 'hide' || !(e.target instanceof Element)) return;
      const el = e.target.closest('.' + HIDDEN + ':not(.' + REVEALED + ')');
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      el.classList.add(REVEALED);
      unredactTarget(el);
    },
    true
  );

  window.addEventListener('load', () => highlight && scheduleReclassify());

  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) apply(NSG.normalize(changes.settings.newValue));
  });

  NSG.load().then(apply).catch(() => {});
})();
