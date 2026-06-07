// content/content.js

// Listen for messages from popup, background, or the sidebar iframe
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXTRACT_PROFILE') {
    (async () => {
      try {
        if (typeof LinkedInExtractor === 'undefined') {
          throw new Error('LinkedInExtractor utility is not loaded.');
        }
        
        // Let the DOM paint by scrolling to critical sections
        await triggerLazyLoad();
        
        // Wait 2.5 seconds for lazy elements to settle and finish loading
        console.log('[LinkedIn Optimizer] Waiting 2.5s for AJAX and rendering to settle...');
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Try to navigate and sync all skills from the details page
        let extraSkills = [];
        
        // Find the skills section
        const h2s = document.querySelectorAll('h2');
        let skillsSec = null;
        for (const h2 of h2s) {
          const text = h2.innerText.trim().toLowerCase();
          if (text === 'skills' || text.startsWith('skills (')) {
            skillsSec = h2.closest('section') || h2.closest('.pv-profile-card') || h2.parentElement;
            break;
          }
        }

        if (skillsSec) {
          console.log('[LinkedIn Optimizer] Skills section card resolved.');
          
          // Find any link or button containing 'show all' in the skills section, prioritizing /details/skills/
          const showAllEl = [...skillsSec.querySelectorAll('a')].find(el => {
            const href = el.getAttribute('href') || '';
            return href.includes('/details/skills/');
          }) || [...skillsSec.querySelectorAll('a, button, span')].find(el => {
            const txt = el.innerText?.trim()?.toLowerCase() || '';
            return txt.includes('show all') || txt.includes('see all');
          });

          if (showAllEl) {
            console.log('[LinkedIn Optimizer] Found Show all skills trigger element:', {
              tagName: showAllEl.tagName,
              id: showAllEl.id,
              className: showAllEl.className,
              href: showAllEl.getAttribute('href') || 'none',
              innerText: showAllEl.innerText
            });

            // Dispatch bubbling click MouseEvent to mimic actual user action
            const clickEvent = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            showAllEl.dispatchEvent(clickEvent);
            
            // Wait for skills details page to load
            console.log('[LinkedIn Optimizer] Dispatched click event. Waiting 2.5s for navigation...');
            await new Promise(resolve => setTimeout(resolve, 2500));
            
            // Scroll details page to trigger lazy loading of all skills
            const workspace = document.getElementById('workspace');
            const mainEl = document.querySelector('main');
            function scrollDetails(y) {
              window.scrollTo(0, y);
              if (document.documentElement) document.documentElement.scrollTop = y;
              if (document.body) document.body.scrollTop = y;
              if (workspace) workspace.scrollTop = y;
              if (mainEl) mainEl.scrollTop = y;
            }

            console.log('[LinkedIn Optimizer] Scrolling details page to lazy load all skills...');
            for (let i = 0; i < 6; i++) {
              const h = Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                workspace?.scrollHeight || 0,
                mainEl?.scrollHeight || 0
              );
              scrollDetails(h);
              await new Promise(resolve => setTimeout(resolve, 800));
            }
            
            // Grab the correct skills list (the largest ul outside of header/nav blocks)
            const uls = [...document.querySelectorAll('ul')];
            let detailsList = null;
            let maxItems = 0;
            
            for (const ul of uls) {
              if (ul.closest('header') || ul.closest('nav') || ul.closest('#global-nav')) {
                continue;
              }
              const count = ul.querySelectorAll('li').length;
              if (count > maxItems) {
                maxItems = count;
                detailsList = ul;
              }
            }
            
            let detailSkills = [];
            if (detailsList) {
              console.log(`[LinkedIn Optimizer] Found skills list with ${maxItems} items on details page.`);
              const items = [...detailsList.querySelectorAll('li')];
              items.forEach(li => {
                const text = li.innerText.split('\n')[0].trim();
                if (text && text.length < 50 && !text.toLowerCase().includes('skills') && !text.toLowerCase().includes('show all')) {
                  detailSkills.push(text);
                }
              });
            }
            
            if (detailSkills.length === 0) {
              console.log('[LinkedIn Optimizer] Details list fallback: parsing text blocks...');
              const allSpans = [...document.querySelectorAll('span, div, a')];
              allSpans.forEach(el => {
                if (el.children.length === 0) {
                  const text = el.innerText?.trim();
                  if (text && text.length > 2 && text.length < 50) {
                    const lower = text.toLowerCase();
                    const skipWords = ['skills', 'show all', 'agree', 'endorse', 'profile', 'add', 'edit', 'delete', 'learn more'];
                    if (!skipWords.some(w => lower.includes(w))) {
                      detailSkills.push(text);
                    }
                  }
                }
              });
            }
            
            if (detailSkills.length > 0) {
              detailSkills = [...new Set(detailSkills)];
              extraSkills.push(...detailSkills);
              console.log(`[LinkedIn Optimizer] Extracted ${detailSkills.length} skills from details page.`);
            } else {
              console.log('[LinkedIn Optimizer] Could not locate any skills on details page.');
            }
            
            // Return back to main page
            console.log('[LinkedIn Optimizer] Returning to profile page...');
            window.history.back();
            // Wait for main profile page to restore and settle
            await new Promise(resolve => setTimeout(resolve, 2500));
          } else {
            console.log('[LinkedIn Optimizer] Show all skills trigger element not found inside skills card.');
          }
        }

        // Helper to find nodes containing specific text
        function findElementByText(text) {
          const iterator = document.createNodeIterator(
            document.body,
            NodeFilter.SHOW_ELEMENT,
            null
          );
          let node;
          const matches = [];
          while ((node = iterator.nextNode())) {
            if (node.children && node.children.length === 0 && node.innerText && node.innerText.trim().toLowerCase() === text.toLowerCase()) {
              matches.push({
                tag: node.tagName,
                class: node.className,
                parentTag: node.parentElement?.tagName,
                parentClass: node.parentElement?.className,
                closestSection: !!node.closest('section')
              });
            }
          }
          return matches.slice(0, 10);
        }

        // Search for user's real headline elements in the DOM
        const allElements = [...document.querySelectorAll('*')];
        const realHeadlineMatches = [];
        for (const el of allElements) {
          const txt = el.innerText?.trim() || '';
          if ((txt.includes('@CLOUDSUFI') || txt.includes('Microservices')) && txt.length < 200) {
            realHeadlineMatches.push({
              tag: el.tagName,
              id: el.id,
              class: el.className,
              parentTag: el.parentElement?.tagName,
              parentClass: el.parentElement?.className,
              innerText: txt
            });
          }
        }

        function debugGetSection(id, title) {
          const el = document.getElementById(id);
          if (el) {
            const sec = el.closest('section') || el.closest('.pv-profile-card');
            if (sec) return sec;
          }
          const h2s = document.querySelectorAll('h2');
          for (const h2 of h2s) {
            const text = h2.innerText.trim().toLowerCase();
            if (text === title.toLowerCase() || text.startsWith(title.toLowerCase())) {
              return h2.closest('section') || h2.closest('.pv-profile-card') || h2.parentElement;
            }
          }
          return null;
        }

        const debugExpSec = debugGetSection('experience', 'Experience');
        const debugSkillsSec = debugGetSection('skills', 'Skills');

        const profile = LinkedInExtractor.extractProfile();
        
        // Merge detail page skills if they exist
        if (extraSkills.length > 0) {
          profile.skills = [...new Set([...profile.skills, ...extraSkills])];
          console.log('[LinkedIn Optimizer] Synced all skills from details page:', profile.skills);
        }

        // Compile diagnostic report of the active DOM
        const diagnostics = {
          url: window.location.href,
          extractedProfile: {
            name: profile.name,
            headline: profile.headline,
            skillsCount: profile.skills ? profile.skills.length : 0,
            experienceCount: profile.experience ? profile.experience.length : 0
          },
          traceLogs: window.extractorTraceLogs || [],
          sectionsFound: {
            about: !!debugGetSection('about', 'About'),
            experience: !!debugExpSec,
            skills: !!debugSkillsSec,
            education: !!debugGetSection('education', 'Education')
          },
          h2s: [...document.querySelectorAll('h2')].map(el => el.innerText.trim()).filter(Boolean),
          experienceListStats: debugExpSec ? {
            ulCount: debugExpSec.querySelectorAll('ul').length,
            liCount: debugExpSec.querySelectorAll('li').length,
            liTexts: [...debugExpSec.querySelectorAll('li')].slice(0, 3).map(li => li.innerText.replace(/\n+/g, ' | ').slice(0, 300))
          } : 'Experience section not resolved',
          skillsListStats: debugSkillsSec ? {
            text: debugSkillsSec.innerText,
            ulCount: debugSkillsSec.querySelectorAll('ul').length,
            liCount: debugSkillsSec.querySelectorAll('li').length
          } : 'Skills section not resolved',
          experienceHTML: debugExpSec ? debugExpSec.innerHTML.slice(0, 1000) : 'Not found',
          skillsHTML: debugSkillsSec ? debugSkillsSec.innerHTML.slice(0, 1000) : 'Not found',
          experienceMatches: findElementByText('Experience'),
          skillsMatches: findElementByText('Skills'),
          ids: [...document.querySelectorAll('[id]')].map(el => el.id).filter(id => id && id.length < 40),
          realHeadlineMatches
        };
        
        // Send diagnostics to local server
        fetch('http://localhost:3001/api/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(diagnostics)
        }).catch(() => {});

        sendResponse({ success: true, profile });
      } catch (err) {
        console.error('[LinkedIn Optimizer] Extraction failed:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open
  }

  if (request.action === 'INJECT_SIDEBAR') {
    injectSidebar();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'CLOSE_SIDEBAR') {
    removeSidebar();
    sendResponse({ success: true });
    return true;
  }
});

function injectSidebar() {
  const existing = document.getElementById('lpo-sidebar-container');
  if (existing) {
    existing.style.display = 'block';
    return;
  }

  const container = document.createElement('div');
  container.id = 'lpo-sidebar-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    z-index: 2147483647;
    border: none;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.25);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    transform: translateX(100%);
  `;

  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('sidebar/sidebar.html');
  iframe.allow = 'clipboard-write;';
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
  `;

  container.appendChild(iframe);
  document.body.appendChild(container);

  requestAnimationFrame(() => {
    container.style.transform = 'translateX(0)';
  });
}

function removeSidebar() {
  const container = document.getElementById('lpo-sidebar-container');
  if (container) {
    container.style.transform = 'translateX(100%)';
    setTimeout(() => {
      container.remove();
    }, 300);
  }
}

function checkExtractorHealth() {
  if (typeof LinkedInExtractor !== 'undefined') {
    const headline = document.querySelector(LinkedInExtractor.SELECTORS.headline[0]);
    if (!headline) {
      console.log('[LinkedIn Optimizer] Target headline selector not found. This is normal if not on a profile page.');
    }
  }
}

async function triggerLazyLoad() {
  const originalScrollY = window.scrollY;
  const workspace = document.getElementById('workspace');
  const originalWorkspaceY = workspace ? workspace.scrollTop : 0;
  const mainEl = document.querySelector('main');
  const originalMainY = mainEl ? mainEl.scrollTop : 0;

  console.log('[LinkedIn Optimizer] Triggering nested scroll container lazy load...');
  
  function scrollAll(y) {
    window.scrollTo(0, y);
    if (document.documentElement) document.documentElement.scrollTop = y;
    if (document.body) document.body.scrollTop = y;
    if (workspace) workspace.scrollTop = y;
    if (mainEl) mainEl.scrollTop = y;
  }

  function getScrollHeight() {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      workspace ? workspace.scrollHeight : 0,
      mainEl ? mainEl.scrollHeight : 0
    );
  }

  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const currentHeight = getScrollHeight();
    scrollAll((currentHeight / steps) * i);
    await new Promise(resolve => setTimeout(resolve, 350));
  }

  // Click all visible 'see more' / 'show more' elements to expand descriptions and about text
  const seeMoreButtons = [...document.querySelectorAll('button, a')].filter(el => {
    const text = el.innerText?.toLowerCase() || '';
    return text.includes('see more') || text.includes('show more') || el.classList.contains('inline-show-more-text__button');
  });
  console.log(`[LinkedIn Optimizer] Clicking ${seeMoreButtons.length} 'see more' buttons...`);
  for (const btn of seeMoreButtons) {
    try {
      btn.click();
    } catch (e) {}
  }

  window.scrollTo(0, originalScrollY);
  if (workspace) workspace.scrollTop = originalWorkspaceY;
  if (mainEl) mainEl.scrollTop = originalMainY;
  
  await new Promise(resolve => setTimeout(resolve, 200));
  console.log('[LinkedIn Optimizer] Lazy load scrolling completed.');
}

checkExtractorHealth();
