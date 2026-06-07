// background/background.js

// Enable native side panel trigger behavior (if clicked outside of popup context)
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch((error) => console.error("Error setting panel behavior:", error));

// Listen for messages from content scripts, popup, or sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_SIDE_PANEL') {
    const tabId = request.tabId || sender?.tab?.id;
    if (tabId) {
      chrome.sidePanel.open({ tabId })
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
    } else {
      // Query active tab if not specified
      chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
        if (activeTab) {
          chrome.sidePanel.open({ tabId: activeTab.id })
            .then(() => sendResponse({ success: true }))
            .catch((err) => sendResponse({ success: false, error: err.message }));
        } else {
          sendResponse({ success: false, error: 'No active tab found' });
        }
      });
    }
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'ANALYZE_PROFILE') {
    analyzeProfile(request.payload)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open
  }

  if (request.action === 'FORWARD_TO_CONTENT') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
      if (activeTab) {
        chrome.tabs.sendMessage(activeTab.id, request.payload, (res) => {
          sendResponse(res);
        });
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true;
  }
});

async function analyzeProfile(payload) {
  // Get API endpoint from storage or default to localhost:3001
  const storageData = await chrome.storage.local.get('userSettings');
  const apiEndpoint = storageData.userSettings?.apiEndpoint || 'http://localhost:3001';
  const cleanEndpoint = apiEndpoint.replace(/\/$/, ''); // Remove trailing slash

  const response = await fetch(`${cleanEndpoint}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errMsg = `API error: ${response.status}`;
    try {
      const errData = await response.json();
      if (errData.error) errMsg = errData.error;
    } catch (_) {}
    throw new Error(errMsg);
  }

  return response.json();
}
