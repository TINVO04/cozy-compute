import OpenAI from 'openai';

async function run() {
  const gatewayUrl = process.env.PUBLIC_GATEWAY_URL ?? 'http://127.0.0.1:4000/v1';
  const apiKey = process.env.UPSTREAM_KEY_MOCK ?? 'mock-upstream-secret';

  console.log(`Connecting to AI Gateway at ${gatewayUrl}...`);
  const openai = new OpenAI({
    baseURL: gatewayUrl,
    apiKey,
  });

  try {
    const res = await openai.chat.completions.create({
      model: 'mock-gpt-4o-mini',
      messages: [{ role: 'user', content: 'Testing Cozy Compute AI Gateway' }],
    });
    console.log('Gateway response successfully received:');
    console.log(res.choices[0]?.message.content);
    console.log('e2e-gateway test PASSED.');
  } catch (err) {
    console.error('Failed to communicate with gateway:', err);
    process.exit(1);
  }
}

run();
