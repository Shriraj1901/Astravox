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
const generateFeedback = async ({ company, role, difficulty, qaPairs }) => {
  const transcript = qaPairs
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`)
    .join('\n\n');

  const systemPrompt = `You are an expert interview coach reviewing a completed mock interview
for a ${role} position at ${company} (difficulty: ${difficulty}).
Analyze the candidate's answers and respond with ONLY valid JSON, no markdown, no extra text,
in exactly this shape:
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

module.exports = { generateNextQuestion , generateFeedback};