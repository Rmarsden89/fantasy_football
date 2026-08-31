import http from 'node:http';

const PORT = Number(process.env.RERANKER_PORT || 8787);
const MODEL = process.env.OPENAI_RERANKER_MODEL || 'gpt-5.6-sol';
const REASONING_EFFORT = process.env.OPENAI_RERANKER_REASONING || 'none';
const API_KEY = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error('Missing OPENAI_API_KEY. Set it in this shell before starting the reranker.');
  process.exit(1);
}

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    pairRankings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          pairId: { type: 'string' },
          reason: { type: 'string', maxLength: 140 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['pairId', 'reason', 'confidence'],
      },
    },
    rankings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          playerId: { type: 'string' },
          reason: { type: 'string', maxLength: 100 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['playerId', 'reason', 'confidence'],
      },
    },
    summary: { type: 'string', maxLength: 180 },
  },
  required: ['pairRankings', 'rankings', 'summary'],
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
  const normalized = {
    ...payload,
    candidates: (payload.candidates || []).map((candidate) => ({ ...candidate, playerId: String(candidate.playerId) })),
    turnPairs: (payload.turnPairs || []).map((pair) => ({
      ...pair,
      firstPlayerId: String(pair.firstPlayerId),
      secondPlayerId: String(pair.secondPlayerId),
    })),
  };

  return [
    'You are a fast fantasy-football snake-draft turn planner.',
    'This is a small ranking decision, not a deep analysis task.',
    'When turnPairs are supplied, they are the primary decision. Rank every supplied pair exactly once.',
    'You may ONLY reorder supplied pairs and supplied candidates. Never invent a player or pair.',
    'Treat the deterministic engine as authoritative for eligibility and roster caps.',
    'Choose the best TWO-PICK plan for the roster, not merely the best first player.',
    'Return pairId exactly as supplied. Return playerId exactly as supplied.',
    'Also rank the supplied individual candidates as a supporting board.',
    'Keep reasons short. The summary must name both recommended picks when turnPairs exist.',
    '',
    `Payload:\n${JSON.stringify(normalized)}`,
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
  const startedAt = Date.now();
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: REASONING_EFFORT },
      input: buildInstructions(payload),
      max_output_tokens: 750,
      text: {
        verbosity: 'low',
        format: { type: 'json_schema', name: 'fantasy_draft_turn_plan', strict: true, schema: responseSchema },
      },
    }),
  });

  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = null; }
  if (!response.ok) {
    const message = data?.error?.message || raw || `OpenAI returned HTTP ${response.status}`;
    console.error(`OpenAI ${response.status} after ${Date.now() - startedAt}ms: ${message}`);
    throw new Error(message);
  }

  const text = extractOutputText(data);
  if (!text) {
    console.error('OpenAI response missing output text:', JSON.stringify(data, null, 2));
    throw new Error('OpenAI response did not contain output text.');
  }

  const parsed = JSON.parse(text);
  console.log(
    `Reranked ${(payload.turnPairs || []).length} turn pairs / ${payload.candidates.length} candidates with ${MODEL} in ${Date.now() - startedAt}ms` +
    (data?.usage ? ` (${data.usage.input_tokens ?? '?'} in / ${data.usage.output_tokens ?? '?'} out)` : ''),
  );
  return parsed;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }
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
    const message = error instanceof Error ? error.message : String(error);
    console.error('Rerank failed:', message);
    sendJson(res, 500, { error: message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Fantasy reranker listening on http://127.0.0.1:${PORT}`);
  console.log(`Model: ${MODEL}; reasoning: ${REASONING_EFFORT}`);
});
