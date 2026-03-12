const enabledCheckbox = document.getElementById('enabled');
const toggleSiteButton = document.getElementById('toggleSite');
const siteStatus = document.getElementById('siteStatus');

const DEFAULT_SETTINGS = {
  enabled: true,
  whitelist: []
};

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

async function loadSettings() {
  return await chrome.storage.sync.get(DEFAULT_SETTINGS);
}

async function saveSettings(settings) {
  await chrome.storage.sync.set(settings);
}

async function refreshUI() {
  const tab = await getCurrentTab();
  const host = getHostname(tab?.url || '');
  const settings = await loadSettings();

  enabledCheckbox.checked = settings.enabled ?? true;

  if (!host) {
    siteStatus.textContent = 'Not available on this page.';
    toggleSiteButton.disabled = true;
    return;
  }

  const whitelisted = (settings.whitelist || []).includes(host);
  siteStatus.textContent = whitelisted
    ? `${host} is whitelisted`
    : `${host} is blocked`;
  toggleSiteButton.textContent = whitelisted
    ? 'Remove current site from whitelist'
    : 'Whitelist current site';
}

enabledCheckbox.addEventListener('change', async () => {
  const settings = await loadSettings();
  settings.enabled = enabledCheckbox.checked;
  await saveSettings(settings);
});

toggleSiteButton.addEventListener('click', async () => {
  const tab = await getCurrentTab();
  const host = getHostname(tab?.url || '');
  if (!host) return;

  const settings = await loadSettings();
  const whitelist = new Set(settings.whitelist || []);

  if (whitelist.has(host)) {
    whitelist.delete(host);
  } else {
    whitelist.add(host);
  }

  settings.whitelist = [...whitelist];
  await saveSettings(settings);

  await refreshUI();

  if (tab?.id) {
    await chrome.tabs.reload(tab.id);
  }
});

refreshUI();