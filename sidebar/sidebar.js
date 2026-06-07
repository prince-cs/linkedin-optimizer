// sidebar/sidebar.js

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const btnRefresh       = document.getElementById('btn-refresh');
  const btnClose         = document.getElementById('btn-close');
  const profileName      = document.getElementById('profile-name');
  const profileHeadline  = document.getElementById('profile-headline-text');
  
  const gaugeRing        = document.getElementById('gauge-ring');
  const gaugeVal         = document.getElementById('gauge-val');
  const gaugeGrade       = document.getElementById('gauge-grade');
  
  const issuesList       = document.getElementById('issues-list');
  const winsList         = document.getElementById('wins-list');
  const badgeIssuesCount = document.getElementById('badge-issues-count');
  const badgeWinsCount   = document.getElementById('badge-wins-count');
  

  const btnAiOptimize    = document.getElementById('btn-ai-optimize');
  
  const aiSuggestionsCard = document.getElementById('ai-suggestions');
  const headlineOptions   = document.getElementById('headline-options');
  const aboutRewriteText  = document.getElementById('about-rewrite-text');
  const btnCopyAbout      = document.getElementById('btn-copy-about');
  const experienceTips    = document.getElementById('experience-tips');
  const missingKeywords   = document.getElementById('missing-keywords-list');
  const skillsAddList     = document.getElementById('skills-add-list');
  const insightText       = document.getElementById('insight-text');
  
  const toast            = document.getElementById('toast-notification');

  // Circ circumference for 40px radius = 251.2
  const CIRCUMFERENCE = 251.2;

  // Detect context: If we are not inside an iframe, hide close button (since we are in native Side Panel)
  if (window.top === window.self) {
    btnClose.style.display = 'none';
  } else {
    btnClose.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'FORWARD_TO_CONTENT', payload: { action: 'CLOSE_SIDEBAR' } });
    });
  }

  // Load Initial State
  await initializeUI();

  // Automatically trigger a fresh profile sync on load
  setTimeout(() => {
    btnRefresh.click();
  }, 300);

  // Tab switching logic
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active from all tabs
      tabButtons.forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
      
      // Add active to clicked tab
      button.classList.add('active');
      const targetId = button.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Refresh profile details
  btnRefresh.addEventListener('click', () => {
    btnRefresh.classList.add('spinning');
    chrome.runtime.sendMessage({ action: 'FORWARD_TO_CONTENT', payload: { action: 'EXTRACT_PROFILE' } }, async (response) => {
      btnRefresh.classList.remove('spinning');
      if (response && response.success) {
        await StorageHelper.saveProfile(response.profile);
        await initializeUI();
        showToast('Profile data refreshed!');
      } else {
        showToast('Could not refresh profile. Are you on a profile page?');
      }
    });
  });

  // Optimize with AI
  btnAiOptimize.addEventListener('click', async () => {
    const profile = await StorageHelper.getProfile();
    if (!profile || !profile.headline) {
      showToast('No profile data found. Please navigate to a profile page first.');
      return;
    }

    // Disable button, show spinner
    btnAiOptimize.disabled = true;
    btnAiOptimize.querySelector('.btn-spinner').classList.remove('hidden');
    btnAiOptimize.querySelector('.btn-ai-text').textContent = 'Generating Optimization Suggestions...';

    chrome.runtime.sendMessage({
      action: 'ANALYZE_PROFILE',
      payload: { profile, jobDescription: '' }
    }, async (response) => {
      btnAiOptimize.disabled = false;
      btnAiOptimize.querySelector('.btn-spinner').classList.add('hidden');
      btnAiOptimize.querySelector('.btn-ai-text').textContent = 'Optimize Profile with AI';

      if (response && response.success) {
        const aiResult = response.result;
        
        // Compute new score using target keywords
        const targetKeywords = (aiResult.missingKeywords || []).concat(aiResult.skillsToAdd || []);
        const scoreReport = LinkedInScorer.scoreProfile(profile, targetKeywords);
        
        // Save analysis and updated score
        await StorageHelper.saveAnalysis({
          score: scoreReport.score,
          aiResult
        });

        // Re-render UI
        await initializeUI();
        showToast('AI suggestions updated!');
      } else {
        const errorMsg = response?.error || 'Analysis failed. Make sure your backend server is running.';
        showToast(errorMsg);
      }
    });
  });

  // Copy About rewrite
  btnCopyAbout.addEventListener('click', () => {
    copyToClipboard(aboutRewriteText.textContent);
  });

  // Initialization function
  async function initializeUI() {
    const profile = await StorageHelper.getProfile();


    if (!profile) {
      profileName.textContent = 'Extracting Profile...';
      profileHeadline.textContent = 'Auto-syncing sections (skills & experiences). Please wait...';
      updateGauge(0);
      
      // Automatically trigger the refresh/extraction flow
      setTimeout(() => {
        btnRefresh.click();
      }, 150);
      return;
    }

    // Render profile header info
    profileName.textContent = profile.name || 'Anonymous User';
    profileHeadline.textContent = profile.headline || 'No Headline';
    if (profile.name) {
      document.querySelector('.avatar-placeholder').textContent = profile.name.charAt(0).toUpperCase();
    }

    // Check for cached AI analysis
    const cache = await StorageHelper.getAnalysis();
    let currentKeywords = [];
    if (cache && cache.lastAnalysis && cache.lastAnalysis.aiResult) {
      const ai = cache.lastAnalysis.aiResult;
      currentKeywords = (ai.missingKeywords || []).concat(ai.skillsToAdd || []);
      renderAiSuggestions(ai);
    }

    // Calculate score (with keywords if we have them)
    const scoreReport = LinkedInScorer.scoreProfile(profile, currentKeywords);
    updateGauge(scoreReport.score);

    // Render Wins & Issues List
    renderScoreBreakdown(scoreReport);
  }

  function updateGauge(score) {
    gaugeVal.textContent = score;
    
    // Get grade properties
    const grade = LinkedInScorer.getGrade(score);
    gaugeGrade.textContent = grade.label;
    gaugeGrade.style.backgroundColor = grade.color;
    gaugeGrade.style.boxShadow = `0 4px 12px ${grade.color}4d`;

    // Radial dashoffset
    const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
    gaugeRing.style.stroke = grade.color;
    gaugeRing.style.strokeDashoffset = offset;
  }

  function renderScoreBreakdown(report) {
    // Render Issues
    issuesList.innerHTML = '';
    badgeIssuesCount.textContent = report.issues.length;
    if (report.issues.length === 0) {
      issuesList.innerHTML = '<div class="win-card">No issues detected! Perfect core score.</div>';
    } else {
      report.issues.forEach(issue => {
        const div = document.createElement('div');
        div.className = `issue-card ${issue.severity}`;
        div.innerHTML = `
          <div class="issue-meta">
            <span class="issue-section">${issue.section}</span>
            <span class="points-lost">-${issue.points_lost} pts</span>
          </div>
          <p class="issue-msg">${issue.message}</p>
        `;
        issuesList.appendChild(div);
      });
    }

    // Render Wins
    winsList.innerHTML = '';
    badgeWinsCount.textContent = report.wins.length;
    if (report.wins.length === 0) {
      winsList.innerHTML = '<div class="issue-card low">No positive wins noted yet. Keep optimizing!</div>';
    } else {
      report.wins.forEach(win => {
        const div = document.createElement('div');
        div.className = 'win-card';
        div.textContent = win;
        winsList.appendChild(div);
      });
    }
  }

  function renderAiSuggestions(ai) {
    // Show container
    aiSuggestionsCard.classList.remove('hidden');

    // 1. Headline suggestions
    headlineOptions.innerHTML = '';
    if (ai.headlineSuggestions && ai.headlineSuggestions.length > 0) {
      ai.headlineSuggestions.forEach(opt => {
        const card = document.createElement('div');
        card.className = 'headline-suggestion-card';
        card.textContent = opt;
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-copy-floating';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', () => copyToClipboard(opt));
        
        card.appendChild(copyBtn);
        headlineOptions.appendChild(card);
      });
    } else {
      headlineOptions.innerHTML = '<p class="tab-panel-intro">No suggestions generated.</p>';
    }

    // 2. About section summary
    aboutRewriteText.textContent = ai.aboutRewrite || 'No About summary suggested.';

    // 3. Experience tips
    experienceTips.innerHTML = '';
    if (ai.experienceTips && ai.experienceTips.length > 0) {
      ai.experienceTips.forEach(tip => {
        const card = document.createElement('div');
        card.className = 'exp-tip-card';
        card.innerHTML = `
          <div class="exp-tip-role">${tip.role}</div>
          <div class="exp-tip-body">${tip.tip}</div>
        `;
        experienceTips.appendChild(card);
      });
    } else {
      experienceTips.innerHTML = '<p class="tab-panel-intro">No experience recommendations.</p>';
    }

    // 4. Keywords & Skills
    missingKeywords.innerHTML = '';
    if (ai.missingKeywords && ai.missingKeywords.length > 0) {
      ai.missingKeywords.forEach(kw => {
        const pill = document.createElement('span');
        pill.className = 'pill danger';
        pill.textContent = kw;
        missingKeywords.appendChild(pill);
      });
    } else {
      missingKeywords.innerHTML = '<p class="tab-panel-intro">No missing keywords detected.</p>';
    }

    skillsAddList.innerHTML = '';
    if (ai.skillsToAdd && ai.skillsToAdd.length > 0) {
      ai.skillsToAdd.forEach(skill => {
        const pill = document.createElement('span');
        pill.className = 'pill success';
        pill.textContent = skill;
        skillsAddList.appendChild(pill);
      });
    } else {
      skillsAddList.innerHTML = '<p class="tab-panel-intro">No additional skills suggested.</p>';
    }

    // Insight
    insightText.textContent = ai.overallInsight || 'No strategic observations.';
  }

  function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard!');
    }).catch(err => {
      console.error('Copy failed:', err);
      showToast('Failed to copy.');
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 1800);
  }
});
