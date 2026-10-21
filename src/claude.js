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

async function responderChat(system, mensajes) {
  const data = await llamarClaude({
    model: MODELO_CHAT,
    max_tokens: 400,
    system,
    messages: mensajes,
  });
  return data.content.find((b) => b.type === 'text')?.text.trim() || '';
}

// Obliga a Claude a devolver datos con un formato fijo (via tool use).
async function generarEstructurado(system, prompt, nombreTool, schema) {
  const data = await llamarClaude({
    model: MODELO_TEXTOS,
    max_tokens: 1500,
    system,
    tools: [{ name: nombreTool, description: 'Devuelve el resultado', input_schema: schema }],
    tool_choice: { type: 'tool', name: nombreTool },
    messages: [{ role: 'user', content: prompt }],
  });
  return data.content.find((b) => b.type === 'tool_use').input;
}

module.exports = { responderChat, generarEstructurado };
