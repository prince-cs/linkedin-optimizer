(function() {
  function scoreProfile(profile, jobKeywords = []) {
    let score = 0;
    const issues = [];
    const wins   = [];

    // ── Headline (20pts) ──────────────────────────────────────────
    const headlineLen = profile.headline?.length ?? 0;
    if (headlineLen >= 80) {
      score += 20;
      wins.push('Headline length is strong (80+ characters).');
    } else if (headlineLen >= 40) {
      score += 12;
      issues.push({
        section: 'Headline',
        severity: 'medium',
        message: 'Headline is short. Expand to 80-120 characters — include your role, industry, and one value prop.',
        points_lost: 8,
      });
    } else {
      score += 3;
      issues.push({
        section: 'Headline',
        severity: 'high',
        message: 'Headline is too short. This is the first thing recruiters see — make it count.',
        points_lost: 17,
      });
    }

    // ── About Section (25pts) ─────────────────────────────────────
    const aboutLen = profile.about?.length ?? 0;
    if (aboutLen >= 1500) {
      score += 25;
      wins.push('About section is comprehensive (1500+ characters).');
    } else if (aboutLen >= 600) {
      score += 16;
      issues.push({
        section: 'About',
        severity: 'medium',
        message: `About section is ${aboutLen} characters. Aim for 1,500-2,000 — each extra word is a keyword LinkedIn can index.`,
        points_lost: 9,
      });
    } else if (aboutLen > 0) {
      score += 6;
      issues.push({
        section: 'About',
        severity: 'high',
        message: 'About section is nearly empty. This is the most keyword-rich section you control.',
        points_lost: 19,
      });
    } else {
      issues.push({
        section: 'About',
        severity: 'critical',
        message: 'No About section found. Add one immediately — profiles without it rank lower in recruiter search.',
        points_lost: 25,
      });
    }

    // ── Experience (30pts) ────────────────────────────────────────
    const expCount = profile.experiences?.length ?? 0;
    if (expCount >= 3)      { score += 10; wins.push('3+ experience entries — good.'); }
    else if (expCount >= 1) { score += 5; issues.push({ section: 'Experience', severity: 'medium', message: 'Add more experience entries if possible. 3+ is ideal.', points_lost: 5 }); }
    else                    { issues.push({ section: 'Experience', severity: 'high', message: 'No experience entries found.', points_lost: 10 }); }

    if (expCount > 0) {
      const richExp = (profile.experiences ?? []).filter(e => e.description?.length > 150);
      if (richExp.length >= 2) {
        score += 20;
        wins.push('Experience descriptions have good detail.');
      } else {
        const lost = 20 - (richExp.length * 10);
        score += richExp.length * 10;
        issues.push({
          section: 'Experience',
          severity: 'high',
          message: 'Add detailed bullet descriptions (150+ chars) to at least 2 roles. Use metrics: %, $, numbers.',
          points_lost: lost,
        });
      }
    }

    // ── Skills (15pts) ────────────────────────────────────────────
    const skillCount = profile.skills?.length ?? 0;
    if (skillCount >= 10) {
      score += 15;
      wins.push(`${skillCount} skills listed — well done.`);
    } else {
      const earned = Math.floor((skillCount / 10) * 15);
      score += earned;
      issues.push({
        section: 'Skills',
        severity: skillCount < 5 ? 'high' : 'medium',
        message: `Only ${skillCount} skills listed. Add ${Math.max(0, 10 - skillCount)} more — recruiters filter by exact skill names.`,
        points_lost: 15 - earned,
      });
    }

    // ── Keyword Match (bonus, up to +10) ─────────────────────────
    let keywordResult = null;
    if (jobKeywords.length > 0) {
      const profileText = [
        profile.headline,
        profile.about,
        ...(profile.experiences ?? []).map(e => `${e.title} ${e.description}`),
        ...(profile.skills ?? []),
      ].join(' ').toLowerCase();

      const matched = jobKeywords.filter(kw => profileText.includes(kw.toLowerCase()));
      const missing = jobKeywords.filter(kw => !profileText.includes(kw.toLowerCase()));
      const matchRate = matched.length / jobKeywords.length;
      const bonus = Math.round(matchRate * 10);
      score += bonus;

      keywordResult = { matched, missing, matchRate: Math.round(matchRate * 100) };
    }

    return {
      score: Math.min(Math.round(score), 100),
      grade: getGrade(score),
      issues: issues.sort((a, b) => severityOrder(b.severity) - severityOrder(a.severity)),
      wins,
      keywordResult,
    };
  }

  function getGrade(score) {
    if (score >= 85) return { label: 'Excellent', color: '#10b981' }; // Emerald green
    if (score >= 70) return { label: 'Good',      color: '#3b82f6' }; // Premium Blue
    if (score >= 50) return { label: 'Fair',       color: '#f59e0b' }; // Amber
    return                  { label: 'Needs Work', color: '#ef4444' }; // Red
  }

  function severityOrder(s) {
    return { critical: 4, high: 3, medium: 2, low: 1 }[s] ?? 0;
  }

  if (typeof self !== 'undefined') {
    self.LinkedInScorer = { scoreProfile, getGrade };
  }
})();
