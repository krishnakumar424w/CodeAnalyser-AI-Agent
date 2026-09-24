export interface GroqRequestOptions {
  code: string;
  language: string;
  systemPrompt: string;
  userPrompt: string;
  apiKey?: string;
  model?: string;
}

export async function executeGroqAnalysis(options: GroqRequestOptions): Promise<any> {
  const apiKey = options.apiKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in environment or request.');
  }

  const model = options.model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Groq returned empty response content.');
  }

  let clean = rawContent.trim();
  if (clean.startsWith('```')) {
    const lines = clean.split('\n');
    if (lines[0].startsWith('```')) lines.shift();
    if (lines.length && lines[lines.length - 1].startsWith('```')) lines.pop();
    clean = lines.join('\n').trim();
  }

  return JSON.parse(clean);
}
