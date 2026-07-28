const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const typeGuidance = {
  Technical: 'Focus primarily on technical, role-specific questions — coding concepts, system design, tools, and problem-solving relevant to the role.',
  Behavioral: 'Focus primarily on behavioral questions — past experiences, teamwork, conflict resolution, leadership, and how the candidate handled real situations. Use a format similar to "Tell me about a time when..." but push for specifics, not generalities.',
  HR: 'Focus primarily on HR-style questions — motivation, career goals, salary expectations framing, culture fit, strengths/weaknesses, and why they want this role/company.',
  Mixed: 'Blend technical, behavioral, and HR-style questions across the interview, similar to how a real multi-round interview loop would combine different question types.',
};

const generateNextQuestion = async ({ company, role, difficulty, interviewType, qaPairs }) => {
  const conversationSoFar = qaPairs
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`)
    .join('\n\n');

  const guidance = typeGuidance[interviewType] || typeGuidance.Technical;

  const systemPrompt = `You are a professional interviewer conducting a mock interview
for a ${role} position at ${company}. Base difficulty level: ${difficulty}.
Interview type: ${interviewType || 'Technical'}. ${guidance}

Ask one interview question at a time. Base each new question naturally on the candidate's
previous answers where relevant.

Behave like a real interviewer, not a quiz generator:
- If the candidate's most recent answer was vague, generic, one-line, or lacked concrete detail,
  do NOT simply move to an unrelated new topic. Instead, ask a pointed follow-up that challenges
  them to be specific — e.g. "Can you walk me through a concrete example of that?", "What
  specifically would you do differently?", "Can you go deeper on how that actually works?"
- If the candidate's most recent answer was detailed, correct, and showed strong understanding,
  you may raise the bar slightly — ask a somewhat harder or more nuanced question than the base
  difficulty would suggest, the way a real interviewer probes a strong candidate further.
- If the candidate is clearly struggling across multiple answers, ease off slightly rather than
  piling on maximum difficulty — a real interviewer adapts to keep the conversation productive,
  not punishing.
- Never ask two vague-sounding "tell me about a time" questions in a row without a specific
  follow-up in between.

Keep questions realistic, concise, and role-appropriate. Respond with ONLY the question text,
nothing else — no numbering, no preamble.`;

  const userPrompt = qaPairs.length === 0
    ? 'Ask the first interview question.'
    : `Here is the conversation so far:\n\n${conversationSoFar}\n\nAsk the next interview question, following the behavior rules above.`;

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
};

const formatMetrics = (metrics) => {
  if (!metrics) return '';
  const parts = [];
  if (metrics.wordsPerMinute != null) parts.push(`pace: ${metrics.wordsPerMinute} words/min`);
  if (metrics.fillerWordCount != null) parts.push(`filler words used: ${metrics.fillerWordCount}`);
  if (metrics.pauseCount != null) parts.push(`long pauses: ${metrics.pauseCount}`);
  if (metrics.durationSeconds != null) parts.push(`answer duration: ${metrics.durationSeconds}s`);
  if (metrics.facePresentPercent != null) parts.push(`face visible: ${metrics.facePresentPercent}% of the time`);
  if (metrics.multipleFacesCount) parts.push(`multiple people detected ${metrics.multipleFacesCount} time(s)`);
  if (metrics.noFaceCount) parts.push(`no face detected ${metrics.noFaceCount} time(s)`);
  if (metrics.dominantExpression) parts.push(`predominant facial expression: ${metrics.dominantExpression}`);
  return parts.length ? ` [Delivery metrics — ${parts.join(', ')}]` : '';
};

const generateFeedback = async ({ company, role, difficulty, interviewType, qaPairs, focusLossCount }) => {
  const transcript = qaPairs
    .map((qa, i) => {
      const metrics = formatMetrics(qa.speechMetrics);
      return `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}${metrics}`;
    })
    .join('\n\n');

  const focusNote =
    focusLossCount > 0
      ? `\n\nDuring the interview, the candidate switched away from the browser tab ${focusLossCount} time(s). This alone is not proof of dishonesty (people get notifications, glance at notes, etc.), but if it happened frequently (3+ times), factually note it in the summary as something the candidate should be mindful of for realistic practice conditions — without being accusatory.`
      : '';

  const systemPrompt = `You are an expert interview coach reviewing a completed ${interviewType || 'Technical'} mock interview
for a ${role} position at ${company} (difficulty: ${difficulty}).
Some answers include delivery metrics in brackets: speaking pace, filler word count, pauses,
duration, and camera-based signals (percent of time a face was visible, whether multiple people
were detected, whether no face was detected, and the predominant facial expression during the
answer, when a face was present).

Use these signals thoughtfully:
- Low face-visible percentage or repeated "no face detected" may indicate the candidate looked
  away frequently or was not fully present — mention this gently as a presence/focus observation,
  not an accusation.
- "Multiple people detected" is a notable integrity signal — if it happened more than once or
  twice, note it factually in the summary as something to be aware of, without being accusatory,
  since camera-based detection can have false positives (e.g., a poster or reflection).
- Facial expression is a rough, imperfect signal — use it only as a soft indicator of engagement
  or apparent ease, not as a definitive measure of confidence, and don't over-emphasize it.
- Speaking pace, filler words, and pauses are more reliable indicators of verbal delivery and
  confidence — weigh these more heavily than the visual signals.${focusNote}

Weigh all delivery signals alongside the content and correctness of the answers themselves,
with content/correctness as the primary driver of the score. For Behavioral or HR-style
questions, weigh communication quality, specificity of examples, and self-awareness more heavily
than technical depth, since that is what those question types are actually assessing.

Score strictly and realistically, the way a real hiring interviewer would — do not default to a
middling "40-60" score out of politeness. Use this rubric:
- 0-20: Answers are missing, one-line, off-topic, or show no real understanding of the question.
- 21-40: Answers are extremely shallow, vague, or generic, with little to no substance,
  even if a relevant keyword or two is mentioned.
- 41-60: Answers show some basic understanding but lack depth, specifics, or concrete examples.
- 61-80: Answers are solid, reasonably detailed, and demonstrate real understanding with minor gaps.
- 81-100: Answers are thorough, specific, well-structured, and demonstrate strong expertise.
A one-sentence or single-phrase answer should almost always score in the 0-20 range regardless of
any single correct keyword it contains, since it demonstrates no depth, reasoning, or
communication skill.

Respond with ONLY valid JSON, no markdown, no extra text, in exactly this shape:
{
  "score": <number 0-100>,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "suggestedTopics": ["...", "..."],
  "summary": "..."
}`;

  const userPrompt = `Here is the full interview transcript:\n\n${transcript}\n\nProvide the evaluation.`;

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
  });

  const raw = response.choices[0].message.content.trim();
  const cleaned = raw.replace(/```json|```/g, '').trim();

  return JSON.parse(cleaned);
};

module.exports = { generateNextQuestion, generateFeedback };