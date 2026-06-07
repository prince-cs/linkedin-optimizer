(function() {
  const KEYS = {
    PROFILE:    'currentProfile',
    ANALYSIS:   'lastAnalysis',
    SCORE:      'lastScore',
    SETTINGS:   'userSettings',
    JOB_DESC:   'lastJobDescription',
  };

  const StorageHelper = {
    async saveProfile(profile) {
      await chrome.storage.local.set({ [KEYS.PROFILE]: profile });
    },

    async getProfile() {
      const data = await chrome.storage.local.get(KEYS.PROFILE);
      return data[KEYS.PROFILE] ?? null;
    },

    async saveAnalysis(analysis) {
      await chrome.storage.local.set({
        [KEYS.ANALYSIS]: analysis,
        [KEYS.SCORE]: analysis.score,
      });
    },

    async getAnalysis() {
      const data = await chrome.storage.local.get([KEYS.ANALYSIS, KEYS.SCORE]);
      return data;
    },

    async saveSettings(settings) {
      await chrome.storage.local.set({ [KEYS.SETTINGS]: settings });
    },

    async getSettings() {
      const data = await chrome.storage.local.get(KEYS.SETTINGS);
      return data[KEYS.SETTINGS] ?? { apiEndpoint: 'http://localhost:3001', theme: 'dark' };
    },

    async saveJobDesc(jobDesc) {
      await chrome.storage.local.set({ [KEYS.JOB_DESC]: jobDesc });
    },

    async getJobDesc() {
      const data = await chrome.storage.local.get(KEYS.JOB_DESC);
      return data[KEYS.JOB_DESC] ?? '';
    },

    async clearAll() {
      await chrome.storage.local.clear();
    },
  };

  if (typeof self !== 'undefined') {
    self.StorageHelper = StorageHelper;
  }
})();
