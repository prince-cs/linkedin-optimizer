// utils/extractor.js

(function() {
  const SELECTORS = {
    name: [
      'h1.text-heading-xlarge',
      '.pv-text-details__left-panel h1',
      'h1',
      'h2.text-heading-xlarge',
      '.pv-text-details__left-panel h2'
    ],
    headline: [
      'div.text-body-medium.break-words',
      '[data-generated-suggestion-target]',
      '.pv-text-details__left-panel .text-body-medium',
      '.text-body-medium'
    ],
    location: [
      '.pv-text-details__left-panel span.text-body-small',
      '.text-body-small'
    ]
  };

  function querySelector(selectors) {
    if (typeof selectors === 'string') return document.querySelector(selectors);
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function getTextContent(selectors) {
    return querySelector(selectors)?.innerText?.trim() ?? '';
  }

  // Dual-layer section finder: Resolves by ID or H2 text match
  function getSection(id, title) {
    // 1. Try by ID
    const el = document.getElementById(id);
    if (el) {
      const sec = el.closest('section') || el.closest('.pv-profile-card');
      if (sec) return sec;
    }
    // 2. Try by matching H2 headers
    const h2s = document.querySelectorAll('h2');
    for (const h2 of h2s) {
      const text = h2.innerText.trim().toLowerCase();
      if (text === title.toLowerCase() || text.startsWith(title.toLowerCase())) {
        return h2.closest('section') || h2.closest('.pv-profile-card') || h2.parentElement;
      }
    }
    return null;
  }

  function extractName() {
    if (document.title) {
      const parts = document.title.split('|');
      if (parts.length > 0) {
        const cleaned = parts[0]
          .replace(/\(\d+\)/, '') // Remove notifications like (5)
          .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '') // Remove emojis
          .trim();
        if (cleaned && cleaned.toLowerCase() !== 'linkedin') {
          return cleaned;
        }
      }
    }
    
    let name = getTextContent(SELECTORS.name);
    if (!name && document.title) {
      const parts = document.title.split('|');
      if (parts.length > 0) {
        name = parts[0].replace(/\(\d+\)/, '').trim();
      }
    }
    return name || 'Anonymous User';
  }

  function extractHeadline() {
    window.extractorTraceLogs = [];
    function logTrace(msg) {
      window.extractorTraceLogs.push(msg);
      console.log('[LinkedIn Optimizer]', msg);
    }

    const name = extractName();
    logTrace(`extractHeadline: Parsed name: "${name}"`);
    if (!name) {
      logTrace('extractHeadline: No name, falling back to selectors.');
      return getTextContent(SELECTORS.headline);
    }

    // Find the H1 or H2 containing the name
    let nameEl = null;
    const headings = [...document.querySelectorAll('h1, h2')];
    logTrace(`extractHeadline: Found headings count: ${headings.length}`);
    for (const h of headings) {
      const txt = h.innerText?.trim() || '';
      logTrace(`extractHeadline: Heading checked: "${txt}"`);
      if (txt.toLowerCase().includes(name.toLowerCase())) {
        nameEl = h;
        logTrace(`extractHeadline: Matched name heading element: ${h.tagName} with text: "${txt}"`);
        break;
      }
    }

    if (!nameEl) {
      logTrace('extractHeadline: Heading matching name not found. Falling back.');
      return getTextContent(SELECTORS.headline);
    }

    let current = nameEl;
    let headlineText = '';

    // Search up to 15 levels of parent containers to escape deep React trees
    for (let i = 0; i < 15; i++) {
      if (!current) break;
      logTrace(`extractHeadline: Ancestor level ${i}: <${current.tagName} class="${current.className}">`);
      
      // Find text blocks inside the current ancestor
      const elements = [...current.querySelectorAll('p, div, span, a')];
      logTrace(`extractHeadline: Ancestor level ${i} has ${elements.length} descendants.`);
      for (const el of elements) {
        const txt = el.innerText?.trim() || '';
        logTrace(`extractHeadline: Descendant: <${el.tagName} class="${el.className}"> | len: ${txt.length} | text: "${txt.slice(0, 50).replace(/\n/g, ' ')}"`);
        if (!txt) continue;
        
        // We look for a text block between 40 and 250 characters that is NOT the name itself
        if (txt.length >= 40 && txt.length < 250) {
          const hasName = txt.includes(name);
          const lower = txt.toLowerCase();
          const skipList = ['contact info', 'connections', 'followers', 'talks about', 'enhance profile', 'add section', 'open to', 'india', 'united states', 'united kingdom', 'canada'];
          const hasSkipWord = skipList.some(skip => lower.includes(skip));
          const hasNewline = txt.includes('\n');
          
          logTrace(`extractHeadline: Candidate check: hasName: ${hasName} | hasSkipWord: ${hasSkipWord} | hasNewline: ${hasNewline}`);
          
          if (!hasName && !hasSkipWord && !hasNewline) {
            headlineText = txt;
            logTrace(`extractHeadline: FOUND HEADLINE! -> "${txt}"`);
            break;
          }
        }
      }
      if (headlineText) break;
      current = current.parentElement;
    }

    logTrace(`extractHeadline: Final returned headline: "${headlineText || 'none (using fallback)'}"`);
    return headlineText || getTextContent(SELECTORS.headline);
  }

  function extractAbout() {
    const section = getSection('about', 'About');
    if (!section) return '';
    
    const spans = [...section.querySelectorAll('span')].map(s => s.innerText.trim()).filter(Boolean);
    const cleanSpans = [...new Set(spans)];
    
    const aboutText = cleanSpans.find(txt => txt.length > 100) || 
                      cleanSpans.find(txt => txt.length > 40) ||
                      section.innerText;
                      
    return aboutText.replace(/about/gi, '').replace(/see more/gi, '').trim();
  }

  function extractExperiences() {
    const section = getSection('experience', 'Experience');
    if (!section) return [];

    const uls = [...section.querySelectorAll('ul')];
    let outerList = null;
    let maxLiCount = 0;
    
    for (const ul of uls) {
      const liCount = ul.querySelectorAll('li').length;
      if (liCount > maxLiCount) {
        maxLiCount = liCount;
        outerList = ul;
      }
    }

    if (!outerList) return [];
    
    const results = [];
    const listItems = [...outerList.children].filter(el => el.tagName === 'LI');

    listItems.forEach(el => {
      const nestedList = el.querySelector('ul');
      if (nestedList) {
        // Case: Multiple roles under same company
        const clone = el.cloneNode(true);
        const nestedInClone = clone.querySelector('ul');
        if (nestedInClone) nestedInClone.remove();
        
        const parentLines = clone.innerText.split('\n')
          .map(s => s.trim())
          .filter(Boolean)
          .filter(line => !line.toLowerCase().includes('logo'));
          
        const companyName = parentLines[0] ?? '';

        const subRoles = [...nestedList.children].filter(sub => sub.tagName === 'LI');
        subRoles.forEach(subEl => {
          const lines = subEl.innerText.split('\n')
            .map(s => s.trim())
            .filter(Boolean)
            .filter(line => !line.toLowerCase().includes('logo'));

          if (lines.length > 0) {
            const title = lines[0] ?? '';
            const duration = lines.find(line => line.includes('Present') || line.match(/\d{4}/)) ?? (lines[1] ?? '');
            const description = lines.find(txt => txt.length > 30 && txt !== title && txt !== duration) ?? '';
            
            results.push({ title, company: companyName, duration, description });
          }
        });
      } else {
        // Case: Single role card
        const lines = el.innerText.split('\n')
          .map(s => s.trim())
          .filter(Boolean)
          .filter(line => !line.toLowerCase().includes('logo'));

        if (lines.length > 0) {
          const title = lines[0] ?? '';
          const companyFull = lines[1] ?? '';
          const company = companyFull.split('·')[0]?.trim() ?? companyFull;
          const duration = lines.find(line => line.includes('Present') || line.match(/\d{4}/)) ?? (lines[2] ?? '');
          const description = lines.find(txt => txt.length > 30 && txt !== title && txt !== duration && !txt.includes(company)) ?? '';
          
          results.push({ title, company, duration, description });
        }
      }
    });

    return results.filter(e => e.title && e.title.toLowerCase() !== 'experience');
  }

  function extractSkills() {
    const section = getSection('skills', 'Skills');
    if (!section) return [];
    
    const items = section.querySelectorAll('ul li');
    const skills = [];
    
    if (items.length > 0) {
      items.forEach(el => {
        const span = el.querySelector('span');
        if (span) {
          const name = span.innerText.split('\n')[0].trim();
          if (name) skills.push(name);
        }
      });
    } else {
      const lines = section.innerText.split('\n').map(s => s.trim()).filter(Boolean);
      lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes('skills') || 
            lower.includes('show all') || 
            lower.includes('endorse') || 
            lower.includes('experience') || 
            lower.includes(' at ') || 
            line.length > 40) {
          return;
        }
        skills.push(line);
      });
    }

    const filtered = [...new Set(skills)].filter(name => {
      const lower = name.toLowerCase();
      return !lower.includes('show all') && 
             !lower.includes('endorse') && 
             !lower.includes('skills') && 
             name.length < 50;
    });

    return filtered.slice(0, 50);
  }

  function extractEducation() {
    const section = getSection('education', 'Education');
    if (!section) return [];

    const outerList = section.querySelector('ul');
    if (!outerList) return [];
    
    const results = [];
    const listItems = [...outerList.children].filter(el => el.tagName === 'LI');

    listItems.forEach(el => {
      const lines = el.innerText.split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .filter(line => !line.toLowerCase().includes('logo'));

      if (lines.length > 0) {
        results.push({
          school: lines[0] ?? '',
          degree: lines[1] ?? '',
          years:  lines[2] ?? '',
        });
      }
    });

    return results.filter(e => e.school && e.school.toLowerCase() !== 'education');
  }

  function extractProfile() {
    const name = extractName();
    const headline = extractHeadline();
    const location = getTextContent(SELECTORS.location);
    const about = extractAbout();
    const experiences = extractExperiences();
    const skills = extractSkills();
    const education = extractEducation();

    console.log('[LinkedIn Optimizer Extractor] Successfully parsed profile details:', {
      name,
      headline,
      aboutLength: about.length,
      experiencesCount: experiences.length,
      skillsCount: skills.length,
      educationCount: education.length
    });

    return {
      name: name || 'Anonymous User',
      headline: headline || 'Software Engineering Professional',
      location: location || 'Global Professional',
      about,
      experiences,
      skills,
      education,
      extractedAt: new Date().toISOString(),
      profileUrl: window.location.href,
    };
  }

  if (typeof self !== 'undefined') {
    self.LinkedInExtractor = { extractProfile, SELECTORS };
  }
})();
