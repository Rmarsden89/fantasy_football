import http from 'node:http';

const PORT = Number(process.env.RERANKER_PORT || 8787);
const MODEL = process.env.OPENAI_RERANKER_MODEL || 'gpt-5.6-sol';
const REASONING_EFFORT = process.env.OPENAI_RERANKER_REASONING || 'low';
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error('Missing OPENAI_API_KEY. Set it in this shell before starting the reranker.');
  process.exit(1);
}

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    rankings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          playerId: { type: ['number', 'string'] },
          reason: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['playerId', 'reason', 'confidence'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['rankings', 'summary'],
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

function sendJson(res, status, body) {
  cors(res);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function buildInstructions(payload) {
  return [
    'You are a fantasy-football draft reranker.',
    'You may ONLY reorder the supplied candidates. Never add a player outside candidates.',
    'Treat the deterministic engine as authoritative for eligibility and roster caps.',
    'Return every supplied candidate exactly once, in preferred order.',
    'Use the supplied league scoring, roster state, draft context, deterministic metrics, and policy rules.',
    'For close decisions, prioritize roster construction over tiny deterministic score differences.',
    'Keep each reason concise and specific to the roster role being filled.',
    '',
    `Payload:\n${JSON.stringify(payload)}`,
  ].join('\n');
}

function extractOutputText(data) {
  if (typeof data?.output_text === 'string' && data.output_text) return data.output_text;
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return null;
}

async function callOpenAI(payload) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: REASONING_EFFORT },
      input: buildInstructions(payload),
      text: {
        format: {
          type: 'json_schema',
          name: 'fantasy_draft_rerank',
          strict: true,
          schema: responseSchema,
        },
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || `OpenAI returned HTTP ${response.status}`;
    throw new Error(message);
  }

  const text = extractOutputText(data);
  if (!text) throw new Error('OpenAI response did not contain output text.');
  return JSON.parse(text);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true, model: MODEL, reasoningEffort: REASONING_EFFORT });
    return;
  }

  if (req.method !== 'POST' || req.url !== '/rerank') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  try {
    const payload = await readJson(req);
    if (!Array.isArray(payload?.candidates) || payload.candidates.length === 0) {
      sendJson(res, 400, { error: 'Payload must include candidates.' });
      return;
    }
    const result = await callOpenAI(payload);
    sendJson(res, 200, result);
  } catch (error) {
    console.error('Rerank failed:', error);
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Fantasy reranker listening on http://127.0.0.1:${PORT}`);
  console.log(`Model: ${MODEL}; reasoning: ${REASONING_EFFORT}`);
});
