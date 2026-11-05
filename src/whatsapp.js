// Envío de mensajes por WhatsApp Cloud API.
// Regla de Meta: texto libre solo si la persona te escribió en las últimas 24 h.
// Fuera de esa ventana hay que usar una PLANTILLA aprobada en WhatsApp Manager.
const axios = require('axios');

const URL = () => `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;
const headers = () => ({ Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' });
// Argentina: Meta manda los celulares como 549XXXXXXXXXX, pero para enviar hay que sacar el 9
const destino = (to) => String(to).replace(/\D/g, '').replace(/^549/, '54');

async function enviar(to, cuerpo) {
  const { data } = await axios.post(URL(), { messaging_product: 'whatsapp', to: destino(to), ...cuerpo }, { headers: headers(), timeout: 20000 });
  return data.messages?.[0]?.id || null;
}

const enviarTexto = (to, body) => enviar(to, { type: 'text', text: { body } });
const enviarImagen = (to, link, caption) => enviar(to, { type: 'image', image: { link, caption } });

// Las variables de una plantilla no pueden tener saltos de línea, tabs ni más de 4 espacios seguidos.
const limpiarParam = (t) => String(t ?? '').replace(/[\n\t\r]+/g, ' · ').replace(/ {2,}/g, ' ').trim().slice(0, 900) || '-';

function enviarPlantilla(to, nombre, params = []) {
  return enviar(to, {
    type: 'template',
    template: {
      name: nombre,
      language: { code: process.env.WA_IDIOMA_PLANTILLAS || 'es_AR' },
      components: params.length ? [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: limpiarParam(p) })) }] : [],
    },
  });
}

// Explica en criollo los errores más comunes de WhatsApp.
function explicarErrorWA(e) {
  const err = e.response?.data?.error || e;
  const msg = err.error_data?.details || err.message || String(e);
  if (err.code === 132001 || /template name does not exist|does not exist in/i.test(msg)) return 'La plantilla no existe o no está aprobada en WhatsApp Manager (revisá nombre e idioma Español (ARG)).';
  if (err.code === 132000) return 'La plantilla tiene otra cantidad de variables {{ }} que las esperadas.';
  if (err.code === 131026) return 'El número no tiene WhatsApp o no puede recibir el mensaje.';
  if (err.code === 131047) return 'Pasaron más de 24 h desde el último mensaje de esta persona: hace falta la plantilla.';
  if (err.code === 131049) return 'Meta no lo entregó para no saturar al cliente con marketing (límite de Meta). Se reintenta otro día.';
  if (err.code === 190) return 'El WHATSAPP_TOKEN venció o es inválido.';
  return msg;
}

module.exports = { enviarTexto, enviarImagen, enviarPlantilla, explicarErrorWA, destino };
