const DEFAULT_SETTINGS = {
  enabled: true,
  whitelist: []
};

const COMMENT_SELECTORS = [
  '#comments',
  '.comments',
  '.comment-thread',
  '.comment-section',
  '.comments-area',
  '.comments-wrapper',
  '#disqus_thread',
  '.disqus-thread',
  '[data-testid*="comment"]',
  '[aria-label*="comment" i]',
  'ytd-comments',
  'shreddit-comment',
  'faceplate-comment',
  '.comment-tree',
  '.reply-list',
  '.comtr'
];

function getHostname() {
  return window.location.hostname.replace(/^www\./, '');
}

function hideElement(el) {
  if (!el || el.dataset.commentBlockerHidden === 'true') return;
  el.style.setProperty('display', 'none', 'important');
  el.dataset.commentBlockerHidden = 'true';
}

function looksLikeCommentContainer(el) {
  if (!(el instanceof HTMLElement)) return false;

  const text = [
    el.id || '',
    el.className || '',
    el.getAttribute('aria-label') || '',
    el.getAttribute('data-testid') || '',
    el.getAttribute('role') || ''
  ]
    .join(' ')
    .toLowerCase();

  const keywords = [
    'comment',
    'comments',
    'reply',
    'replies',
    'discussion',
    'disqus',
    'conversation'
  ];

  return keywords.some(k => text.includes(k));
}

function hideKnownSelectors(root = document) {
  for (const selector of COMMENT_SELECTORS) {
    try {
      root.querySelectorAll(selector).forEach(hideElement);
    } catch (err) {
      // Ignore bad selectors
    }
  }
}

function hideHeuristicMatches(root = document) {
  const all = root.querySelectorAll('*');
  for (const el of all) {
    if (looksLikeCommentContainer(el)) {
      hideElement(el);
    }
  }
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return {
    enabled: stored.enabled ?? true,
    whitelist: Array.isArray(stored.whitelist) ? stored.whitelist : []
  };
}

function shouldRun(settings) {
  if (!settings.enabled) return false;
  const host = getHostname();
  return !settings.whitelist.includes(host);
}

async function applyBlocking() {
  const settings = await loadSettings();
  if (!shouldRun(settings)) return;

  hideKnownSelectors(document);
  hideHeuristicMatches(document);
}

let observerStarted = false;

async function start() {
  const settings = await loadSettings();
  if (!shouldRun(settings)) return;

  await applyBlocking();

  if (observerStarted) return;
  observerStarted = true;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;

        hideKnownSelectors(node);
        if (looksLikeCommentContainer(node)) {
          hideElement(node);
        }
        hideHeuristicMatches(node);
      }
    }
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  });
}

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'sync') return;

  if (changes.enabled || changes.whitelist) {
    window.location.reload();
  }
});

start();