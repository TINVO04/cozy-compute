// Minimal OpenAI-compatible upstream used for local development and end-to-end tests.
// It supports /v1/models and /v1/chat/completions (streaming and non-streaming) and reports usage.
import http from 'node:http';

const KEY = process.env.MOCK_UPSTREAM_KEY || 'mock-upstream-secret';
const PORT = Number(process.env.PORT || 4010);

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function reply(messages) {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  const text = typeof last?.content === 'string' ? last.content : 'something';
  return `Mock upstream heard: "${text.slice(0, 200)}". The duck says hello.`;
}

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') return send(res, 200, { ok: true });
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${KEY}`) {
    return send(res, 401, { error: { message: 'invalid upstream key', type: 'invalid_request_error' } });
  }
  if (req.method === 'GET' && req.url === '/v1/models') {
    return send(res, 200, {
      object: 'list',
      data: [{ id: 'mock-small', object: 'model', owned_by: 'mock' }],
    });
  }
  if (req.method === 'POST' && req.url === '/v1/chat/completions') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return send(res, 400, { error: { message: 'bad json' } });
      }
      const content = reply(body.messages || []);
      const promptTokens = Math.max(1, Math.ceil(JSON.stringify(body.messages || []).length / 4));
      const completionTokens = Math.max(1, Math.ceil(content.length / 4));
      const id = 'chatcmpl-mock-' + Date.now();
      const created = Math.floor(Date.now() / 1000);
      const usage = {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      };
      if (body.stream) {
        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        });
        const words = content.split(' ');
        words.forEach((w, i) => {
          const chunk = {
            id,
            object: 'chat.completion.chunk',
            created,
            model: body.model,
            choices: [
              {
                index: 0,
                delta: { ...(i === 0 ? { role: 'assistant' } : {}), content: (i ? ' ' : '') + w },
                finish_reason: null,
              },
            ],
          };
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        });
        const done = {
          id,
          object: 'chat.completion.chunk',
          created,
          model: body.model,
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          usage,
        };
        res.write(`data: ${JSON.stringify(done)}\n\n`);
        res.end('data: [DONE]\n\n');
        return;
      }
      send(res, 200, {
        id,
        object: 'chat.completion',
        created,
        model: body.model,
        choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
        usage,
      });
    });
    return;
  }
  send(res, 404, { error: { message: 'not found' } });
});

server.listen(PORT, '0.0.0.0', () => console.log(`mock upstream on :${PORT}`));
