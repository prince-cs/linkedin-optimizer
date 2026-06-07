// popup/popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const btnAnalyze    = document.getElementById('btn-analyze');
  const btnOpenSidebar = document.getElementById('btn-open-sidebar');
  const statusCard     = document.getElementById('status-card');
  const statusDot      = document.getElementById('status-dot');
  const statusMessage  = document.getElementById('status-message');
  
  const scoreContainer = document.getElementById('score-container');
  const scoreValue     = document.getElementById('score-value');
  const scoreGrade     = document.getElementById('score-grade');
  const scoreRing      = document.getElementById('score-ring');

  const inputApi       = document.getElementById('input-api');
  const btnSaveSettings = document.getElementById('btn-save-settings');

  // Load Settings
  const settings = await StorageHelper.getSettings();
  inputApi.value = settings.apiEndpoint;

  // Check if we are on a valid page (LinkedIn /in/ profiles or the local mock profile page)
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isLinkedIn = tab?.url?.includes('linkedin.com/in/') || tab?.url?.includes('mock_profile.html');

  if (!isLinkedIn) {
    statusDot.className = 'dot error';
    statusMessage.textContent = 'Navigate to a LinkedIn profile to begin.';
    btnAnalyze.disabled = true;
  } else {
    statusDot.className = 'dot active';
    statusMessage.textContent = 'LinkedIn Profile detected';
    btnAnalyze.disabled = false;
  }

  // Load cached score if available
  const cached = await StorageHelper.getAnalysis();
  if (cached.lastScore !== undefined) {
    showCachedScore(cached.lastScore);
  }

  // Save Settings
  btnSaveSettings.addEventListener('click', async () => {
    const endpoint = inputApi.value.trim() || 'http://localhost:3001';
    await StorageHelper.saveSettings({ apiEndpoint: endpoint });
    btnSaveSettings.textContent = 'Saved!';
    btnSaveSettings.style.borderColor = '#10b981';
    btnSaveSettings.style.color = '#10b981';
    setTimeout(() => {
      btnSaveSettings.textContent = 'Save Settings';
      btnSaveSettings.style.borderColor = '';
      btnSaveSettings.style.color = '';
    }, 1500);
  });

  // Action: Analyze Profile
  btnAnalyze.addEventListener('click', async () => {
    btnAnalyze.disabled = true;
    btnAnalyze.querySelector('.btn-text').textContent = 'Extracting...';

    // Send extraction command to content script
    chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_PROFILE' }, async (response) => {
      if (!response || !response.success) {
        statusDot.className = 'dot error';
        statusMessage.textContent = 'Extraction failed. Refresh page & try again.';
        btnAnalyze.disabled = false;
        btnAnalyze.querySelector('.btn-text').textContent = '✨ Analyze Profile';
        return;
      }

      // Save extracted profile to local storage
      await StorageHelper.saveProfile(response.profile);

      // Inject Sidebar Overlay into page
      chrome.tabs.sendMessage(tab.id, { action: 'INJECT_SIDEBAR' }, () => {
        // Close the popup so user can see the sidebar slide-in
        window.close();
      });
    });
  });

  // Action: Open SidePanel / Full Console
  btnOpenSidebar.addEventListener('click', () => {
    if (isLinkedIn) {
      // First inject the sidebar in-page overlay
      chrome.tabs.sendMessage(tab.id, { action: 'INJECT_SIDEBAR' }, () => {
        // Also trigger native side panel if preferred
        chrome.runtime.sendMessage({ action: 'OPEN_SIDE_PANEL', tabId: tab.id });
        window.close();
      });
    } else {
      // Just open sidepanel (general dashboard view)
      chrome.runtime.sendMessage({ action: 'OPEN_SIDE_PANEL', tabId: tab.id });
      window.close();
    }
  });

  function showCachedScore(score) {
    scoreValue.textContent = score;
    
    // Calculate grade
    let grade = 'Needs Work';
    let color = '#ef4444'; // Red
    if (score >= 85) {
      grade = 'Excellent';
      color = '#10b981'; // Green
    } else if (score >= 70) {
      grade = 'Good';
      color = '#3b82f6'; // Blue
    } else if (score >= 50) {
      grade = 'Fair';
      color = '#f59e0b'; // Amber
    }
    
    scoreGrade.textContent = grade;
    scoreGrade.style.color = color;

    // Circle circumference is 150.79
    const circumference = 150.79;
    const offset = circumference - (score / 100) * circumference;
    scoreRing.style.stroke = color;
    scoreRing.style.strokeDashoffset = offset;
    
    scoreContainer.classList.remove('hidden');
  }
});
