const urlInput = document.getElementById('urlInput');
const selectorInput = document.getElementById('selectorInput');
const saveBtn = document.getElementById('saveBtn');
const toggleBtn = document.getElementById('toggleBtn');
const clickBtn = document.getElementById('clickBtn');
const statusEl = document.getElementById('status');

let enabled = true;
let currentTabId = null;

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#f44336' : '#4CAF50';
}

function saveValues() {
  chrome.storage.local.set({
    targetUrl: urlInput.value.trim(),
    targetSelector: selectorInput.value.trim()
  });
}

function updateToggleButton() {
  if (enabled) {
    toggleBtn.textContent = 'Disable';
    toggleBtn.classList.remove('disabled');
  } else {
    toggleBtn.textContent = 'Enable';
    toggleBtn.classList.add('disabled');
  }
}

function checkTargetPage() {
  chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    currentTabId = tabs[0]?.id || null;
    const currentUrl = tabs[0]?.url || '';
    chrome.storage.local.get(['targetUrl'], (result) => {
      if (result.targetUrl && currentUrl.includes(result.targetUrl)) {
        showStatus(enabled ? 'Target page detected' : 'Target page detected (disabled)');
      } else {
        showStatus('Monitoring for target page...');
      }
    });
  });
}

chrome.storage.local.get(['targetUrl', 'targetSelector', 'enabled'], (result) => {
  urlInput.value = result.targetUrl || '';
  selectorInput.value = result.targetSelector || '';
  enabled = result.enabled !== false;
  updateToggleButton();
  checkTargetPage();
});

chrome.runtime.sendMessage({ type: 'getEnabled' }, (response) => {
  if (response) {
    enabled = response.enabled;
    updateToggleButton();
    checkTargetPage();
  }
});

urlInput.addEventListener('input', saveValues);
selectorInput.addEventListener('input', saveValues);

saveBtn.addEventListener('click', () => {
  if (urlInput.value.trim() && selectorInput.value.trim()) {
    showStatus('Saved!');
    checkTargetPage();
  } else {
    showStatus('Please fill in both fields', true);
  }
});

toggleBtn.addEventListener('click', () => {
  enabled = !enabled;
  chrome.storage.local.set({ enabled: enabled });
  chrome.runtime.sendMessage({ type: 'setEnabled', value: enabled });
  updateToggleButton();
  showStatus(enabled ? 'Enabled' : 'Disabled');
});

function performClick(tabId, selector, callback) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (sel) => {
      function findAndClick(selector) {
        const el = document.querySelector(selector);
        if (!el) return 'not_found';

        el.scrollIntoView({ behavior: 'instant', block: 'center' });

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return 'not_visible';

        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        el.click();

        return 'clicked';
      }

      return findAndClick(sel);
    },
    args: [selector]
  }, (results) => {
    callback(results[0]?.result);
  });
}

clickBtn.addEventListener('click', () => {
  if (!currentTabId) {
    showStatus('No active tab', true);
    return;
  }

  chrome.storage.local.get(['targetSelector'], (result) => {
    if (!result.targetSelector) {
      showStatus('No selector saved', true);
      return;
    }

    performClick(currentTabId, result.targetSelector, (result) => {
      if (result === 'clicked') {
        showStatus('Clicked!');
      } else if (result === 'not_found') {
        showStatus('Element not found - check selector', true);
      } else if (result === 'not_visible') {
        showStatus('Element not visible', true);
      } else {
        showStatus('Error: ' + result, true);
      }
    });
  });
});