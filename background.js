let enabled = true;

chrome.storage.local.get(['enabled'], (result) => {
  enabled = result.enabled !== false;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes.enabled) {
    enabled = changes.enabled.newValue;
  }
  if (changes.targetUrl || changes.targetSelector) {
    checkAllTabs();
  }
});

function checkAllTabs() {
  chrome.tabs.query({ url: '<all_urls>' }, (tabs) => {
    chrome.storage.local.get(['targetUrl', 'targetSelector', 'enabled'], (result) => {
      if (!enabled || !result.targetUrl || !result.targetSelector) return;

      tabs.forEach((tab) => {
        if (tab.url && tab.url.includes(result.targetUrl)) {
          setTimeout(() => doClick(tab.id, result.targetSelector), 1500);
        }
      });
    });
  });
}

function doClick(tabId, selector) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      }
    },
    args: [selector]
  }).catch((err) => {
    console.log('Clicker error:', err.message);
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab?.url && tab.url.startsWith('http')) {
    chrome.storage.local.get(['targetUrl', 'targetSelector', 'enabled'], (result) => {
      if (!enabled || !result.targetUrl || !result.targetSelector) return;
      if (tab.url.includes(result.targetUrl)) {
        setTimeout(() => doClick(tabId, result.targetSelector), 1500);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'setEnabled') {
    enabled = message.value;
    chrome.storage.local.set({ enabled: enabled });
  } else if (message.type === 'getEnabled') {
    sendResponse({ enabled: enabled });
  }
  return true;
});