const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const generateNextQuestion = async ({ company, role, difficulty, qaPairs }) => {
  const conversationSoFar = qaPairs
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`)
    .join('\n\n');

  const systemPrompt = `You are a professional technical interviewer conducting a mock interview
for a ${role} position at ${company}. Difficulty level: ${difficulty}.
Ask one interview question at a time. Base each new question naturally on the candidate's
previous answers where relevant. Keep questions realistic, concise, and role-appropriate.
Respond with ONLY the question text, nothing else — no numbering, no preamble.`;

  const userPrompt = qaPairs.length === 0
    ? 'Ask the first interview question.'
    : `Here is the conversation so far:\n\n${conversationSoFar}\n\nAsk the next interview question.`;

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

const generateFeedback = async ({ company, role, difficulty, qaPairs }) => {
  const transcript = qaPairs
    .map((qa, i) => {
      const metrics = formatMetrics(qa.speechMetrics);
      return `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}${metrics}`;
    })
    .join('\n\n');

  const systemPrompt = `You are an expert interview coach reviewing a completed mock interview
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
  confidence — weigh these more heavily than the visual signals.

Weigh all delivery signals alongside the content and correctness of the answers themselves,
with content/correctness as the primary driver of the score.

Score strictly and realistically, the way a real hiring interviewer would — do not default to a
middling "40-60" score out of politeness. Use this rubric:
- 0-20: Answers are missing, one-line, off-topic, or show no real understanding of the question.
- 21-40: Answers are extremely shallow, vague, or generic, with little to no technical substance,
  even if a relevant keyword or two is mentioned.
- 41-60: Answers show some basic understanding but lack depth, specifics, or concrete examples.
- 61-80: Answers are solid, reasonably detailed, and demonstrate real understanding with minor gaps.
- 81-100: Answers are thorough, specific, well-structured, and demonstrate strong expertise.
A one-sentence or single-phrase answer to a technical question should almost always score in the
0-20 range regardless of any single correct keyword it contains, since it demonstrates no depth,
reasoning, or communication skill.

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