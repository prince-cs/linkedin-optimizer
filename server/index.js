// server/index.js

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildAnalysisPrompt } from './prompts.js';

// Resolve environment file (.env) manually to avoid dependencies
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join('=').trim();
      // Remove enclosing quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

const PORT = process.env.PORT || 3001;

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS Preflight OPTIONS Request
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle Post route for API optimization
  if (req.method === 'POST' && req.url === '/api/analyze') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { profile, jobDescription } = payload;

        if (!profile || !profile.headline) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid profile data provided.' }));
          return;
        }

        const prompt = buildAnalysisPrompt(profile, jobDescription);
        const resultText = await callAiProvider(prompt);

        // Sanitize response to extract JSON only
        let jsonResponse;
        try {
          const clean = resultText.replace(/```json|```/g, '').trim();
          jsonResponse = JSON.parse(clean);
          
          if (jsonResponse.aboutRewrite) {
            // Convert list-style asterisks at start of lines to standard bullets, then strip formatting asterisks
            let text = jsonResponse.aboutRewrite.replace(/^\s*\*\s+/gm, '• ');
            text = text.replace(/\*/g, '');
            jsonResponse.aboutRewrite = text;
          }
        } catch (parseErr) {
          console.error('Failed to parse AI output as JSON. Output was:', resultText);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'AI provider returned invalid JSON format. Please try again.' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(jsonResponse));

      } catch (err) {
        console.error('Analysis execution error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Internal analysis error.' }));
      }
    });
    return;
  }

  // Debug logger route
  if (req.method === 'POST' && req.url === '/api/debug') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        console.log('\n===== EXTRACTOR DIAGNOSTIC REPORT =====');
        console.log(JSON.stringify(payload, null, 2));
        console.log('========================================\n');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`[LinkedIn Optimizer Server] Running on http://localhost:${PORT}`);
});

async function callAiProvider(prompt) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;

  if (!geminiKey && !claudeKey) {
    throw new Error('No API keys found. Please set GEMINI_API_KEY or ANTHROPIC_API_KEY in server/.env');
  }

  if (geminiKey) {
    console.log('[AI] Routing request to Gemini API...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Gemini API returned an empty response.');
    }
    return text;
  } else {
    console.log('[AI] Routing request to Anthropic Claude API...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) {
      throw new Error('Claude API returned an empty response.');
    }
    return text;
  }
}
