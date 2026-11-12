(async function () {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;
  const NSG = globalThis.NSG;
  const $ = (id) => document.getElementById(id);
  const radio = (name) => document.querySelector('input[name="' + name + '"]:checked');
  let statusTimer = 0;

  function fill(s) {
    $('keywords').value = s.keywords.join('\n');
    $('sites').value = s.sites.join('\n');
    $('hideMedia').checked = s.hideMedia;
    for (const name of ['mode', 'granularity', 'siteMode']) {
      document.querySelector('input[name="' + name + '"][value="' + s[name] + '"]').checked = true;
    }
  }

  function setStatus(text) {
    $('status').textContent = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => ($('status').textContent = ''), 3000);
  }

  $('version').textContent = 'v' + api.runtime.getManifest().version;

  const current = await NSG.load();
  fill(current);

  $('resetKeywords').addEventListener('click', () => {
    $('keywords').value = NSG.DEFAULT_KEYWORDS.join('\n');
  });

  $('save').addEventListener('click', async () => {
    const keywords = NSG.parseLines($('keywords').value);
    const sites = NSG.parseLines($('sites').value, NSG.normalizeDomain);
    const latest = await NSG.load(); // do not overwrite the enabled state set in the popup
    await NSG.save({
      ...latest,
      keywords,
      sites,
      hideMedia: $('hideMedia').checked,
      mode: radio('mode').value,
      granularity: radio('granularity').value,
      siteMode: radio('siteMode').value
    });
    $('sites').value = sites.join('\n');
    setStatus(keywords.length ? 'Saved.' : 'Saved – without keywords nothing will be hidden.');
  });
})();
