# LinkedIn Profile Optimizer Chrome Extension

An AI-powered LinkedIn profile analyzer and ATS optimization dashboard. Instantly grade any LinkedIn profile, discover visual formatting and keyword issues, and generate tailormade, recruiter-ready suggestions using Gemini 2.5 Flash or Anthropic Claude.

---

## Key Features

- **Real-Time Profile Scraper**: Auto-extracts profile details (Name, Headline, About, Work History, Skills, and Education) dynamically.
- **ATS scoring engine**: Locally evaluates profile strength and generates categorized checklists (Wins vs. Improvement Opportunities).
- **AI-Powered Copywriting & Rewriter**:
  - Generates multiple premium, recruiter-ready **headlines**.
  - Rewrites the **About summary** to follow standard professional bio guidelines.
  - Suggests action-oriented, ATS-tailored **experience bullet points**.
- **Keyword Gap Analysis**: Highlights missing core skills and offers strategic keyword suggestions.
- **Multi-AI Provider Support**: Seamlessly routes requests to Google Gemini or Anthropic Claude.
- **Mock Sandbox**: Includes a pre-configured mock profile page for instant sandbox testing without needing active LinkedIn logins.

---

## Repository Structure

```text
├── background/         # Chrome extension background service worker
├── content/            # Content scripts injected into the web pages (CSS & Scrapers)
├── icons/              # Extension icons (16px, 48px, 128px)
├── mock/               # Mock profile HTML page for local testing
├── popup/              # Action popup interface and local settings
├── sidebar/            # Main sidebar console dashboard (HTML, JS, CSS)
├── utils/              # Helper utilities (Scorer, Extractor, Storage)
├── server/             # Node.js backend AI proxy server
│   ├── .env.example    # Environment variable template
│   ├── index.js        # Main server entrypoint
│   └── prompts.js      # System prompt generator for LLM analysis
├── run_server.sh       # Script to launch the backend server
└── README.md           # Documentation
```

---

## Installation & Setup

### 1. Run the Backend AI Server

To use the AI optimizer, you need to spin up the Node.js backend server and configure an API Key.

1. Navigate to the `server/` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the template environment file:
   ```bash
   cp .env.example .env
   ```
4. Edit `server/.env` and insert your API key:
   - **Google Gemini (Recommended)**: Get a free key at [Google AI Studio](https://aistudio.google.com). Set `GEMINI_API_KEY=your_key_here`.
   - **Anthropic Claude**: Set `ANTHROPIC_API_KEY=your_key_here`.
5. Run the server:
   - From the repository root, run the bash script:
     ```bash
     ./run_server.sh
     ```
   - Alternatively, start it directly using Node.js:
     ```bash
     npm start
     ```
   The backend proxy will start running at `http://localhost:3001`.

### 2. Load the Chrome Extension

1. Open Google Chrome.
2. Go to the Extensions management page: **`chrome://extensions/`**.
3. Enable **Developer mode** using the toggle switch in the upper-right corner.
4. Click the **Load unpacked** button in the upper-left corner.
5. Select the root folder of this repository (the folder containing `manifest.json`).
6. The *LinkedIn Profile Optimizer* extension icon will appear in your Chrome toolbar!

---

## How to Use

### Using with LinkedIn Profiles
1. Go to any LinkedIn profile page (e.g., `https://www.linkedin.com/in/username`).
2. Click the extension icon in your toolbar.
3. Click **✨ Analyze Profile** to get a quick local ATS audit score.
4. Click **Open Full Console** to toggle the sidebar.
5. In the sidebar, click **Optimize Profile with AI** to view advanced suggestions for Headlines, About summary, Experiences, and missing keywords.

### Using the Testing Sandbox (Recommended for Development)
To test the extension's capabilities without logging into LinkedIn:
1. Open the file [mock/mock_profile.html](mock/mock_profile.html) in your Google Chrome browser.
2. Click the extension icon and run the analysis.
3. Observe how the content scraper extracts information from the mock page and presents optimization diagnostics.

---

## Customizing Settings

If your backend server is running on a custom port, you can change the proxy url:
1. Open the extension popup.
2. Enter the new URL in the **Backend Proxy** field (default: `http://localhost:3001`).
3. Click **Save Settings**.
