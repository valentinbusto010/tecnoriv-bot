// ESTUDIO IA de /contenido: crear y editar imágenes con Nano Banana (Google Gemini).
// Usa la misma API que la skill "imagen" (generativelanguage.googleapis.com) con GEMINI_API_KEY.
// Modelo: Nano Banana Pro (gemini-3-pro-image-preview). Si la cuenta no tiene cuota para Pro,
// prueba solo con Nano Banana (gemini-2.5-flash-image), que es más barato.
const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const { supabase } = require('./datos');

const MODELOS = () => [...new Set([process.env.GEMINI_MODELO_IMAGEN || 'gemini-3-pro-image-preview', 'gemini-2.5-flash-image'])];
const NOMBRE = { 'gemini-3-pro-image-preview': 'Nano Banana Pro', 'gemini-2.5-flash-image': 'Nano Banana' };
const FORMATOS = { '4:5': 'post', '9:16': 'historia/reel', '1:1': 'cuadrada', '16:9': 'horizontal' };

// Estilo de la marca, opcional, para que todo se vea de la misma familia.
const ESTILO = 'Estilo Tecno Riv: fotografía de producto profesional y realista, iluminación de estudio, fondo oscuro elegante con acentos de luz azul (#1EB6FF), estética tecnológica premium, nítida, sin texto agregado ni marcas de agua.';

async function bajarComoParte(url) {
  let buf;
  if (/^data:image\//.test(url)) buf = Buffer.from(url.split(',')[1], 'base64');
  else buf = Buffer.from((await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })).data);
  const jpg = await sharp(buf).rotate().resize(1536, 1536, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  return { inlineData: { mimeType: 'image/jpeg', data: jpg.toString('base64') } };
}

function explicarErrorGemini(e) {
  const err = e.response?.data?.error || {};
  const msg = err.message || e.message || '';
  if (e.response?.status === 400 && /API key/i.test(msg)) return 'La GEMINI_API_KEY es inválida. Revisala en Render.';
  if (e.response?.status === 403) return 'La clave de Gemini no tiene permiso para generar imágenes (¿facturación activa en Google AI Studio?).';
  if (e.response?.status === 429 || /quota|exhausted|billing/i.test(msg)) return 'Sin cuota en Gemini para imágenes: activá la facturación en Google AI Studio o esperá a que se renueve la cuota gratis.';
  if (/safety|blocked|prohibited/i.test(msg)) return 'Google bloqueó el pedido por sus políticas. Probá describirlo de otra forma.';
  return `Gemini: ${msg || 'error desconocido'}`;
}
const esCuota = (e) => [403, 429].includes(e.response?.status) || /quota|exhausted|billing|not found|not supported/i.test(e.response?.data?.error?.message || '');

// Genera una imagen. referencias: URLs o dataURLs (fotos de producto o la imagen a editar, la primera es la base).
async function generar({ prompt, referencias = [], formato = '4:5', tamano = '2K', estilo = true, editar = false }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Object.assign(new Error('Falta GEMINI_API_KEY en Render.'), { status: 400 });
  const partesImg = [];
  for (const r of referencias.slice(0, 6)) partesImg.push(await bajarComoParte(r));
  const instrucciones = editar
    ? `Editá la primera imagen siguiendo este pedido, manteniendo el producto idéntico (forma, colores, logos y detalles reales): ${prompt}`
    : `${prompt}${partesImg.length ? '\nUsá las imágenes adjuntas como referencia exacta del producto real (forma, colores, logos y detalles): no inventes un producto distinto.' : ''}`;
  const texto = `${instrucciones}\n${estilo && !editar ? ESTILO : ''}\nFormato ${formato}.`.trim();
  const body = {
    contents: [{ role: 'user', parts: [{ text: texto }, ...partesImg] }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'], imageConfig: { aspectRatio: formato } },
  };
  let ultimoError;
  for (const modelo of MODELOS()) {
    try {
      const cfg = modelo.includes('pro') ? { ...body, generationConfig: { ...body.generationConfig, imageConfig: { ...body.generationConfig.imageConfig, imageSize: tamano } } } : body;
      const { data } = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, cfg, {
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, timeout: 180000, maxBodyLength: Infinity,
      });
      const partes = data.candidates?.[0]?.content?.parts || [];
      const img = partes.find((p) => p.inlineData?.data);
      if (!img) {
        const motivo = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || partes.map((p) => p.text).filter(Boolean).join(' ');
        throw Object.assign(new Error(`No devolvió imagen${motivo ? ': ' + motivo : ''}`), { sinImagen: true });
      }
      return { buffer: Buffer.from(img.inlineData.data, 'base64'), modelo, nota: partes.map((p) => p.text).filter(Boolean).join(' ').slice(0, 300) };
    } catch (e) {
      ultimoError = e;
      console.error(`Gemini ${modelo}:`, e.response?.data?.error?.message || e.message);
      if (!esCuota(e)) break; // si el problema no es de cuota/modelo, no tiene sentido probar otro
    }
  }
  throw Object.assign(new Error(ultimoError?.sinImagen ? ultimoError.message : explicarErrorGemini(ultimoError || {})), { status: 400 });
}

async function guardarEnHistorial({ buffer, tipo, prompt, modelo, formato, producto_id }) {
  const jpg = await sharp(buffer).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  const ruta = `ia/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error: eSt } = await supabase.storage.from('productos').upload(ruta, jpg, { contentType: 'image/jpeg' });
  if (eSt) throw new Error(`No se pudo guardar la imagen: ${eSt.message}`);
  const url = supabase.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
  const { data, error } = await supabase.from('ia_imagenes').insert({ tipo, prompt, url, modelo, formato, producto_id: producto_id || null }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

function router() {
  const r = express.Router();

  r.get('/estado', (req, res) => res.json({ gemini: Boolean(process.env.GEMINI_API_KEY), modelos: MODELOS().map((m) => ({ id: m, nombre: NOMBRE[m] || m })), formatos: FORMATOS }));

  r.get('/historial', async (req, res) => {
    const { data, error } = await supabase.from('ia_imagenes').select('*').order('created_at', { ascending: false }).limit(60);
    if (error) return res.status(500).json({ error: /does not exist|schema cache/i.test(error.message) ? 'Falta correr supabase-ia.sql en Supabase' : error.message });
    res.json(data);
  });

  // { prompt, referencias: [url|dataURL], formato, tamano, estilo, editar, producto_id }
  r.post('/imagen', async (req, res) => {
    const { prompt = '', referencias = [], formato = '4:5', tamano = '2K', estilo = true, editar = false, producto_id = null } = req.body || {};
    if (!String(prompt).trim()) return res.status(400).json({ error: 'Escribí qué querés generar' });
    if (editar && !referencias.length) return res.status(400).json({ error: 'Elegí la imagen a editar' });
    if (!FORMATOS[formato]) return res.status(400).json({ error: 'Formato inválido' });
    try {
      const g = await generar({ prompt: String(prompt).slice(0, 2000), referencias, formato, tamano: ['1K', '2K', '4K'].includes(tamano) ? tamano : '2K', estilo, editar });
      const fila = await guardarEnHistorial({ buffer: g.buffer, tipo: editar ? 'editar' : 'crear', prompt, modelo: g.modelo, formato, producto_id });
      res.json({ ...fila, modelo_nombre: NOMBRE[g.modelo] || g.modelo, nota: g.nota });
    } catch (e) {
      res.status(e.status || 500).json({ error: e.message });
    }
  });

  // Pasa una imagen del historial a la galería de un producto (para usarla en piezas, catálogo, etc.)
  r.post('/historial/:id/galeria', async (req, res) => {
    const pid = Number(req.body.producto_id);
    if (!pid) return res.status(400).json({ error: 'Elegí el producto' });
    const { data: im } = await supabase.from('ia_imagenes').select('url').eq('id', req.params.id).maybeSingle();
    if (!im) return res.status(404).json({ error: 'No existe esa imagen' });
    const { data, error } = await supabase.from('producto_fotos').upsert({ producto_id: pid, url: im.url, origen: 'ia' }, { onConflict: 'producto_id,url' }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    await supabase.from('ia_imagenes').update({ producto_id: pid }).eq('id', req.params.id);
    res.json(data);
  });

  r.delete('/historial/:id', async (req, res) => {
    const { data: im } = await supabase.from('ia_imagenes').select('url').eq('id', req.params.id).maybeSingle();
    await supabase.from('ia_imagenes').delete().eq('id', req.params.id);
    const ruta = im?.url.split('/object/public/productos/')[1];
    // Solo se borra el archivo si no quedó en ninguna galería.
    if (ruta) {
      const { data: usada } = await supabase.from('producto_fotos').select('id').eq('url', im.url).limit(1);
      if (!usada?.length) await supabase.storage.from('productos').remove([ruta]);
    }
    res.json({ ok: true });
  });
  return r;
}

module.exports = { router, generar };
