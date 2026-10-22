const axios = require('axios');

const MODELO_CHAT = 'claude-haiku-5-5'; // rápido y barato para responder clientes
const MODELO_TEXTOS = 'claude-sonnet-5-5'; // mejor redacción para publicaciones

async function llamarClaude(body) {
  const res = await axios.post('https://api.anthropic.com/v1/messages', body, {
    headers: {
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    timeout: 60000,
  });
  return res.data;
}

function textoDe(data) {
  if (data.stop_reason === 'refusal') throw new Error('Claude no quiso responder ese mensaje');
  return data.content.find((b) => b.type === 'text')?.text.trim() || '';
}

async function responderChat(system, mensajes) {
  const data = await llamarClaude({
    model: MODELO_CHAT,
    max_tokens: 2000, // incluye el razonamiento interno del modelo
    output_config: { effort: 'low' }, // respuestas rápidas y baratas
    system,
    messages: mensajes,
  });
  return textoDe(data);
}

// Obliga a Claude a devolver un JSON con un formato fijo (structured outputs).
async function generarEstructurado(system, prompt, schema) {
  const data = await llamarClaude({
    model: MODELO_TEXTOS,
    max_tokens: 6000,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: { ...schema, additionalProperties: false } },
    },
    system,
    messages: [{ role: 'user', content: prompt }],
  });
  return JSON.parse(textoDe(data));
}

module.exports = { responderChat, generarEstructurado };
