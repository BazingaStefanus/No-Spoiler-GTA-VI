(async function () {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;
  const NSG = globalThis.NSG;

  const $enabled = document.getElementById('enabled');
  const $site = document.getElementById('site');
  const $siteRow = document.getElementById('siteRow');
  const $host = document.getElementById('host');
  const $hint = document.getElementById('hint');

  let settings = await NSG.load();
  let host = '';

  try {
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    if (/^https?:$/.test(url.protocol)) host = NSG.normalizeHost(url.hostname);
  } catch (_) {
    // Kein Zugriff auf die URL (z. B. interne Browserseiten)
  }

  function render() {
    $enabled.checked = settings.enabled;
    if (!host) {
      $host.textContent = 'dieser Seite';
      $site.checked = false;
      $site.disabled = true;
      $siteRow.classList.add('disabled');
      $hint.textContent = 'Für diese Seite nicht verfügbar.';
      return;
    }
    $host.textContent = host;
    $site.disabled = !settings.enabled;
    $siteRow.classList.toggle('disabled', !settings.enabled);
    $site.checked = NSG.isSiteActive(settings, host);
    $hint.textContent = settings.enabled ? 'Änderungen gelten sofort. Neu laden ist nicht nötig.' : 'Spoilerschutz ist global ausgeschaltet.';
  }

  $enabled.addEventListener('change', async () => {
    settings.enabled = $enabled.checked;
    await NSG.save(settings);
    render();
  });

  $site.addEventListener('change', async () => {
    settings.sites = NSG.setSiteActive(settings, host, $site.checked);
    await NSG.save(settings);
    render();
  });

  document.getElementById('options').addEventListener('click', () => {
    api.runtime.openOptionsPage();
    window.close();
  });

  render();
})();
