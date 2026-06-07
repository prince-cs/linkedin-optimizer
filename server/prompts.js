// server/prompts.js

export function buildAnalysisPrompt(profile, jobDescription) {
  const jdSection = jobDescription && jobDescription.trim()
    ? `Analyze the profile against the target job description:
"${jobDescription}"`
    : `A target job description was NOT provided.
Analyze this profile against general, high-impact industry standards for the candidate's field (inferred from their current headline, experience, and skills).
Suggest recruiter-ready headline alternatives, a professional first-person summary with high-value technical keywords, and actionable tips to enrich their experience bullet points.`;

  return `
You are a world-class LinkedIn profile coach and ATS optimization expert.
Your task is to analyze the LinkedIn profile data and provide tailored optimization recommendations.

${jdSection}

Your response MUST be a valid JSON object ONLY. Do NOT wrap the JSON in markdown code blocks, do not include any backticks (e.g. \`\`\`json), and do not include any preamble or postscript. Return only the raw JSON string.

The JSON response must conform to this schema:
{
  "headlineSuggestions": [
    "Headline option 1 (max 220 chars, structure: Current/Target Role | Specialization | Core Value Metric or Key Skill)",
    "Headline option 2",
    "Headline option 3"
  ],
  "aboutRewrite": "Full rewritten About section. Approximately 1200-1800 characters. Written in first-person. Use an engaging layout: (1) an impactful hook summarizing value and passions, (2) bulleted core areas of expertise with evidence, (3) a brief concluding call-to-action indicating what you seek. Crucially, do NOT use asterisks (*) or any other markdown symbols of any kind. Output pure, clean plain text ready for copy-pasting.",
  "missingKeywords": ["keyword1", "keyword2", "keyword3"],
  "experienceTips": [
    {
      "role": "Title of the first experience role",
      "tip": "Provide 2 specific bullet point recommendations. Focus on incorporating action verbs, technical skills, and placeholder metric structures (e.g. 'Increased speed by [X]%', 'Led a team of [Y]')."
    }
  ],
  "skillsToAdd": ["skill1", "skill2"],
  "overallInsight": "A concise 2-sentence summary of the biggest gap between this profile and industry standards, and how to position the profile to get interviewed."
}

Here is the profile data:
${JSON.stringify(profile, null, 2)}
`;
}
