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
// Botón "Ver catálogo 🛍️" (texto en español): abre el catálogo nativo de WhatsApp con el link oficial wa.me/c/<número>.
// El mensaje "catalog_message" de Meta no deja cambiar el texto del botón (sale "View catalog"), por eso va como cta_url;
// si falla, se manda igual el catalog_message.
let numeroBot = null;
async function numeroDelBot() {
  if (process.env.WA_NUMERO_BOT) return process.env.WA_NUMERO_BOT.replace(/\D/g, '');
  if (numeroBot) return numeroBot;
  const { data } = await axios.get(`https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}`, { headers: headers(), params: { fields: 'display_phone_number' }, timeout: 20000 });
  numeroBot = String(data.display_phone_number || '').replace(/\D/g, '');
  return numeroBot;
}

// Botón al catálogo web propio de Tecno Riv (/catalogo): fotos grandes, precios con promo y pedido por WhatsApp.
function enviarCatalogoWeb(to, texto) {
  const base = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || 'https://tecnoriv-bot.onrender.com').replace(/\/$/, '');
  return enviar(to, {
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      body: { text: texto },
      action: { name: 'cta_url', parameters: { display_text: 'Ver catálogo 🛍️', url: `${base}/catalogo` } },
    },
  });
}

async function enviarCatalogo(to, texto) {
  try {
    const numero = await numeroDelBot();
    if (!numero) throw new Error('sin número');
    return await enviar(to, {
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        body: { text: texto },
        action: { name: 'cta_url', parameters: { display_text: 'Armar carrito 🛒', url: `https://wa.me/c/${numero}` } },
      },
    });
  } catch (e) {
    console.error('Botón de catálogo en español falló, mando el de Meta:', e.response?.data?.error?.message || e.message);
    return enviar(to, { type: 'interactive', interactive: { type: 'catalog_message', body: { text: texto }, action: { name: 'catalog_message' } } });
  }
}

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

// Activa un número nuevo en la API de WhatsApp (el paso que deja de mostrar "Pendiente" en WhatsApp Manager):
// 1) lo registra con un PIN de 6 dígitos, 2) suscribe la app a la cuenta para recibir mensajes, 3) devuelve su estado.
async function activarNumero({ pin, wabaId }) {
  const base = 'https://graph.facebook.com/v21.0';
  const pasos = [];
  await axios.post(`${base}/${process.env.PHONE_NUMBER_ID}/register`, { messaging_product: 'whatsapp', pin }, { headers: headers(), timeout: 20000 });
  pasos.push('Número registrado en la API');
  if (wabaId) {
    await axios.post(`${base}/${wabaId}/subscribed_apps`, {}, { headers: headers(), timeout: 20000 });
    pasos.push('App suscripta a la cuenta de WhatsApp (recibe los mensajes)');
  }
  const { data } = await axios.get(`${base}/${process.env.PHONE_NUMBER_ID}`, {
    headers: headers(),
    params: { fields: 'display_phone_number,verified_name,name_status,status,quality_rating' },
    timeout: 20000,
  });
  return { pasos, numero: data };
}

// Crea en la cuenta de WhatsApp las plantillas que faltan (src/plantillas.js) y devuelve el estado de cada una.
// Las que ya existen no se tocan. Meta las revisa: quedan PENDING hasta que las aprueba.
async function crearPlantillas(wabaId) {
  const base = `https://graph.facebook.com/v21.0/${wabaId}/message_templates`;
  const idioma = process.env.WA_IDIOMA_PLANTILLAS || 'es_AR';
  const { data } = await axios.get(base, { headers: headers(), params: { fields: 'name,status,language', limit: 200 }, timeout: 20000 });
  const existentes = (data.data || []).filter((t) => t.language === idioma);
  const resultado = [];
  for (const p of require('./plantillas')) {
    const ya = existentes.find((t) => t.name === p.name);
    if (ya) { resultado.push({ nombre: p.name, estado: ya.status, accion: 'ya existía' }); continue; }
    try {
      const { data: r } = await axios.post(base, {
        name: p.name,
        language: idioma,
        category: p.category,
        components: [{ type: 'BODY', text: p.text, example: { body_text: [p.example] } }],
      }, { headers: headers(), timeout: 20000 });
      resultado.push({ nombre: p.name, estado: r.status || 'PENDING', accion: 'creada' });
    } catch (e) {
      const err = e.response?.data?.error || {};
      resultado.push({ nombre: p.name, estado: 'ERROR', accion: err.error_user_msg || err.message || e.message });
    }
  }
  return resultado;
}

// ───────── PERFIL DEL NEGOCIO (lo que ve el cliente al tocar el nombre del chat) ─────────
const GRAPH = 'https://graph.facebook.com/v21.0';
const CAMPOS_PERFIL = 'about,address,description,email,profile_picture_url,websites,vertical';
// Límites de Meta
const LIMITES = { about: 139, description: 512, address: 256, email: 128 };
const RUBROS = ['RETAIL', 'OTHER', 'PROF_SERVICES', 'ENTERTAIN', 'EDU', 'APPAREL', 'BEAUTY', 'AUTO'];

async function leerPerfil() {
  const id = process.env.PHONE_NUMBER_ID;
  const [{ data: p }, { data: n }] = await Promise.all([
    axios.get(`${GRAPH}/${id}/whatsapp_business_profile`, { headers: headers(), params: { fields: CAMPOS_PERFIL }, timeout: 20000 }),
    axios.get(`${GRAPH}/${id}`, { headers: headers(), params: { fields: 'display_phone_number,verified_name,name_status,quality_rating' }, timeout: 20000 }),
  ]);
  return { perfil: p.data?.[0] || {}, numero: n };
}

async function guardarPerfil(c) {
  const body = { messaging_product: 'whatsapp' };
  for (const k of Object.keys(LIMITES)) if (k in c) body[k] = String(c[k] ?? '').trim().slice(0, LIMITES[k]);
  if (body.about === '') delete body.about; // "Info" no puede quedar vacía
  if ('websites' in c) {
    body.websites = (c.websites || []).map((w) => String(w).trim()).filter(Boolean).slice(0, 2)
      .map((w) => (/^https?:\/\//i.test(w) ? w : 'https://' + w));
  }
  if (c.vertical && RUBROS.includes(c.vertical)) body.vertical = c.vertical;
  await axios.post(`${GRAPH}/${process.env.PHONE_NUMBER_ID}/whatsapp_business_profile`, body, { headers: headers(), timeout: 20000 });
  return leerPerfil();
}

// Foto de perfil: se sube con la API de cargas de la app (Resumable Upload) y se asigna el "handle".
async function subirFotoPerfil(jpeg) {
  let appId = process.env.META_APP_ID;
  if (!appId) {
    const { data } = await axios.get(`${GRAPH}/app`, { headers: headers(), timeout: 20000 }).catch(() => ({ data: {} }));
    appId = data.id;
  }
  if (!appId) throw new Error('No pude averiguar el ID de la app de Meta. Cargá META_APP_ID en Render (developers.facebook.com → tu app → Configuración → Básica).');
  const { data: ses } = await axios.post(`${GRAPH}/${appId}/uploads`, null, {
    headers: headers(), params: { file_name: 'perfil-tecnoriv.jpg', file_length: jpeg.length, file_type: 'image/jpeg' }, timeout: 20000,
  });
  const { data: sub } = await axios.post(`${GRAPH}/${ses.id}`, jpeg, {
    headers: { Authorization: `OAuth ${process.env.WHATSAPP_TOKEN}`, file_offset: '0', 'Content-Type': 'application/octet-stream' },
    maxBodyLength: Infinity, timeout: 60000,
  });
  if (!sub.h) throw new Error('Meta no devolvió el código de la imagen subida');
  await axios.post(`${GRAPH}/${process.env.PHONE_NUMBER_ID}/whatsapp_business_profile`, { messaging_product: 'whatsapp', profile_picture_handle: sub.h }, { headers: headers(), timeout: 20000 });
  return leerPerfil();
}

// ───────── CATÁLOGO EN WHATSAPP (ícono de tienda en el perfil + carrito) ─────────
async function estadoCatalogoWA(wabaId) {
  const [com, cats] = await Promise.all([
    axios.get(`${GRAPH}/${process.env.PHONE_NUMBER_ID}/whatsapp_commerce_settings`, { headers: headers(), timeout: 20000 }).then((r) => r.data.data?.[0] || {}),
    wabaId ? axios.get(`${GRAPH}/${wabaId}/product_catalogs`, { headers: headers(), timeout: 20000 }).then((r) => r.data.data || [], () => null) : Promise.resolve(null),
  ]);
  return { visible: Boolean(com.is_catalog_visible), carrito: Boolean(com.is_cart_enabled), catalogos: cats };
}

// Conecta el catálogo de Meta a la cuenta de WhatsApp (si hace falta) y prende el ícono del catálogo y el carrito.
async function conectarCatalogoWA({ wabaId, catalogId, visible = true }) {
  const pasos = [];
  if (wabaId && catalogId) {
    const actuales = await axios.get(`${GRAPH}/${wabaId}/product_catalogs`, { headers: headers(), timeout: 20000 }).then((r) => r.data.data || [], () => []);
    if (!actuales.some((c) => String(c.id) === String(catalogId))) {
      await axios.post(`${GRAPH}/${wabaId}/product_catalogs`, { catalog_id: catalogId }, { headers: headers(), timeout: 20000 });
      pasos.push('Catálogo conectado a la cuenta de WhatsApp');
    } else pasos.push('El catálogo ya estaba conectado');
  }
  await axios.post(`${GRAPH}/${process.env.PHONE_NUMBER_ID}/whatsapp_commerce_settings`, null, {
    headers: headers(), params: { is_catalog_visible: visible, is_cart_enabled: visible }, timeout: 20000,
  });
  pasos.push(visible ? 'Catálogo y carrito visibles en el chat y el perfil' : 'Catálogo oculto');
  return { pasos, ...(await estadoCatalogoWA(wabaId)) };
}

module.exports = {
  enviarCatalogo, enviarCatalogoWeb,
  estadoCatalogoWA, conectarCatalogoWA,
  enviarTexto, enviarImagen, enviarPlantilla, explicarErrorWA, destino, activarNumero, limpiarParam, crearPlantillas,
  leerPerfil, guardarPerfil, subirFotoPerfil, LIMITES, RUBROS,
};
