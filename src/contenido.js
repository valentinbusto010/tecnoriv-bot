// API del estudio de contenido (/contenido): crear, guardar, programar y publicar piezas.
// Instagram se publica solo si están IG_USER_ID e IG_TOKEN; si no, queda todo listo para subir a mano
// y el día programado te llega un recordatorio por WhatsApp. Marketplace siempre es manual
// (Facebook no permite publicar ahí con programas).
const express = require('express');
const axios = require('axios');
const { supabase } = require('./datos');
const { promoVigente, hoyAR } = require('./promo');

const FORMATOS = ['carrusel', 'post', 'historias', 'marketplace'];
const ESTADOS = ['borrador', 'programado', 'publicado'];
const GRAPH = 'https://graph.facebook.com/v21.0';

const igListo = () => Boolean(process.env.IG_USER_ID && process.env.IG_TOKEN);
let ultimaUrl = process.env.PUBLIC_URL || '';
const urlPublica = () => (process.env.PUBLIC_URL || ultimaUrl).replace(/\/$/, '');

const avisoTabla = (e) => (/schema cache|does not exist/i.test(e.message) ? 'Falta correr supabase-contenido.sql en Supabase' : e.message);

// ───────── guardar ─────────

async function guardarPieza(fila, imagenes) {
  const { miniatura, aDataUrl } = require('./estudio');
  const { data: pieza, error } = await supabase
    .from('piezas')
    .insert({ ...fila, miniatura: imagenes[0] ? await miniatura(imagenes[0]) : null })
    .select('id')
    .single();
  if (error) throw new Error(avisoTabla(error));
  await guardarImagenes(pieza.id, imagenes, aDataUrl);
  return pieza.id;
}

async function guardarImagenes(piezaId, imagenes, aDataUrl) {
  await supabase.from('pieza_imagenes').delete().eq('pieza_id', piezaId);
  for (let i = 0; i < imagenes.length; i++) {
    const { error } = await supabase.from('pieza_imagenes').insert({ pieza_id: piezaId, orden: i, imagen: aDataUrl(imagenes[i]) });
    if (error) throw new Error(error.message);
  }
}

// ───────── Instagram ─────────

async function graph(metodo, ruta, params = {}) {
  try {
    const { data } = await axios({ method: metodo, url: `${GRAPH}/${ruta}`, params: { ...params, access_token: process.env.IG_TOKEN }, timeout: 60000 });
    return data;
  } catch (e) {
    throw new Error('Instagram: ' + (e.response?.data?.error?.error_user_msg || e.response?.data?.error?.message || e.message));
  }
}

// Instagram procesa cada imagen antes de dejar publicarla: esperamos a que diga FINISHED.
async function esperarContenedor(id) {
  for (let i = 0; i < 20; i++) {
    const { status_code } = await graph('get', id, { fields: 'status_code' });
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Instagram rechazó la imagen (${status_code})`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Instagram tardó demasiado en procesar las imágenes. Probá de nuevo.');
}

async function publicarEnInstagram(pieza) {
  if (!igListo()) throw new Error('Instagram no está conectado: faltan IG_USER_ID e IG_TOKEN en Render.');
  const base = urlPublica();
  if (!/^https:\/\//.test(base)) throw new Error('Falta PUBLIC_URL en Render (ej: https://tecnoriv-bot.onrender.com). Instagram necesita bajar las imágenes desde ahí.');
  const { data: imgs, error } = await supabase.from('pieza_imagenes').select('clave, orden').eq('pieza_id', pieza.id).order('orden');
  if (error || !imgs?.length) throw new Error('La pieza no tiene imágenes');
  const url = (i) => `${base}/contenido/img/${i.clave}.jpg`;
  const yo = process.env.IG_USER_ID;
  let mediaId;

  if (pieza.formato === 'historias') {
    for (const i of imgs) {
      const c = await graph('post', `${yo}/media`, { image_url: url(i), media_type: 'STORIES' });
      await esperarContenedor(c.id);
      mediaId = (await graph('post', `${yo}/media_publish`, { creation_id: c.id })).id;
    }
  } else if (imgs.length === 1) {
    const c = await graph('post', `${yo}/media`, { image_url: url(imgs[0]), caption: pieza.caption || '' });
    await esperarContenedor(c.id);
    mediaId = (await graph('post', `${yo}/media_publish`, { creation_id: c.id })).id;
  } else {
    const hijos = [];
    for (const i of imgs.slice(0, 10)) {
      const c = await graph('post', `${yo}/media`, { image_url: url(i), is_carousel_item: true });
      hijos.push(c.id);
    }
    for (const h of hijos) await esperarContenedor(h);
    const c = await graph('post', `${yo}/media`, { media_type: 'CAROUSEL', children: hijos.join(','), caption: pieza.caption || '' });
    await esperarContenedor(c.id);
    mediaId = (await graph('post', `${yo}/media_publish`, { creation_id: c.id })).id;
  }
  const { permalink } = await graph('get', mediaId, { fields: 'permalink' }).catch(() => ({}));
  const cambios = { estado: 'publicado', publicado_at: new Date().toISOString(), ig_media_id: mediaId, ig_permalink: permalink || null, error: null };
  await supabase.from('piezas').update(cambios).eq('id', pieza.id);
  return cambios;
}

// ───────── programador ─────────
// Cada 5 minutos: publica lo programado (si Instagram está conectado) o te avisa por WhatsApp.
function iniciarProgramador(avisarDueno) {
  if (!supabase) return;
  const revisar = async () => {
    const { data, error } = await supabase
      .from('piezas')
      .select('id, formato, titulo, caption, programado_para, avisado')
      .eq('estado', 'programado')
      .lte('programado_para', new Date().toISOString())
      .limit(10);
    if (error) return;
    for (const p of data) {
      const automatica = igListo() && p.formato !== 'marketplace';
      if (automatica) {
        try {
          await publicarEnInstagram(p);
          await avisarDueno(`✅ Publicado en Instagram: ${p.titulo}`);
        } catch (e) {
          await supabase.from('piezas').update({ estado: 'borrador', error: e.message }).eq('id', p.id);
          await avisarDueno(`⚠️ No se pudo publicar "${p.titulo}": ${e.message}\nEntrá a /contenido para reintentar.`);
        }
      } else if (!p.avisado) {
        await supabase.from('piezas').update({ avisado: true }).eq('id', p.id);
        const donde = p.formato === 'marketplace' ? 'Marketplace' : 'Instagram';
        await avisarDueno(`📅 Hoy toca publicar en ${donde}: ${p.titulo}\nAbrí /contenido → la pieza → Guardar imágenes y Copiar texto.`);
      }
    }
  };
  setInterval(() => revisar().catch((e) => console.error('Programador de contenido:', e.message)), 5 * 60 * 1000);
  setTimeout(() => revisar().catch(() => {}), 20000);
}

// ───────── API ─────────

function router(chequearClave, explicarError = (e) => e.message) {
  const r = express.Router();
  r.use((req, res, next) => {
    if (!process.env.PUBLIC_URL && req.get('host') && !/localhost|127\.0\.0\.1/.test(req.get('host'))) ultimaUrl = `https://${req.get('host')}`;
    next();
  });
  r.use(chequearClave);
  r.use((req, res, next) => (supabase ? next() : res.status(503).json({ error: 'Faltan SUPABASE_URL o SUPABASE_KEY en Render.' })));
  const fallar = (res, e) => {
    console.error('Contenido:', e.response?.data || e.message);
    res.status(500).json({ error: explicarError(e) });
  };

  r.get('/estado', async (req, res) => {
    const [productos, piezas, promo] = await Promise.all([
      supabase.from('productos').select('id, nombre, categoria, precio, stock, imagen_url, activo').order('nombre'),
      supabase.from('piezas').select('id, formato, plantilla, titulo, estado, programado_para, publicado_at, ig_permalink, error, miniatura, producto_ids, created_at').order('created_at', { ascending: false }).limit(300),
      promoVigente(),
    ]);
    if (productos.error) return res.status(500).json({ error: productos.error.message });
    res.json({
      productos: productos.data,
      piezas: piezas.error ? [] : piezas.data,
      faltaTabla: piezas.error ? avisoTabla(piezas.error) : null,
      promo,
      instagram: igListo(),
      hoy: hoyAR(),
    });
  });

  r.get('/piezas/:id', async (req, res) => {
    const [{ data: pieza, error }, { data: imagenes }] = await Promise.all([
      supabase.from('piezas').select('*').eq('id', req.params.id).single(),
      supabase.from('pieza_imagenes').select('id, orden, imagen').eq('pieza_id', req.params.id).order('orden'),
    ]);
    if (error) return res.status(404).json({ error: 'No existe esa pieza' });
    res.json({ ...pieza, imagenes: imagenes || [] });
  });

  // Crea una pieza nueva: { formato, plantilla, tema, producto_ids, programado_para? }
  r.post('/piezas', async (req, res) => {
    try {
      const { formato, plantilla = 'libre', tema = '', programado_para = null } = req.body;
      if (!FORMATOS.includes(formato)) return res.status(400).json({ error: 'Formato inválido' });
      const ids = (req.body.producto_ids || []).map(Number).filter(Boolean).slice(0, 8);
      const [{ data: productos, error }, promo] = await Promise.all([supabase.from('productos').select('*'), promoVigente()]);
      if (error) throw error;
      const elegidos = ids.map((id) => productos.find((p) => p.id === id)).filter(Boolean);
      const estudio = require('./estudio');
      let fila, imagenes;
      if (formato === 'marketplace') {
        if (!elegidos[0]) return res.status(400).json({ error: 'Elegí el producto para Marketplace' });
        const m = await estudio.crearPiezaMarketplace({ producto: elegidos[0], promo, detalles: tema });
        fila = { formato, plantilla: 'producto', titulo: m.titulo, titulo_mkp: m.titulo_mkp, caption: m.caption };
        imagenes = m.imagenes;
      } else {
        if (['producto', 'coleccion', 'comparativa'].includes(plantilla) && !elegidos.length) return res.status(400).json({ error: 'Elegí al menos un producto para esta plantilla' });
        if (plantilla === 'comparativa' && elegidos.length < 2) return res.status(400).json({ error: 'Para comparar elegí 2 productos' });
        const g = await estudio.crearPiezaInstagram({ formato, plantilla, tema, elegidos, productos, promo });
        fila = { formato, plantilla, titulo: g.titulo, caption: g.caption, guion: { slides: g.slides } };
        imagenes = g.imagenes;
      }
      fila.tema = tema || null;
      fila.producto_ids = elegidos.map((p) => p.id);
      if (programado_para) Object.assign(fila, { estado: 'programado', programado_para });
      res.json({ id: await guardarPieza(fila, imagenes) });
    } catch (e) { fallar(res, e); }
  });

  // Cambios simples: título, caption, estado, fecha
  r.patch('/piezas/:id', async (req, res) => {
    const c = {};
    for (const k of ['titulo', 'caption', 'titulo_mkp']) if (k in req.body) c[k] = String(req.body[k] ?? '');
    if ('estado' in req.body) {
      if (!ESTADOS.includes(req.body.estado)) return res.status(400).json({ error: 'Estado inválido' });
      c.estado = req.body.estado;
      if (c.estado === 'publicado') c.publicado_at = new Date().toISOString();
      if (c.estado !== 'publicado') c.publicado_at = null;
    }
    if ('programado_para' in req.body) {
      c.programado_para = req.body.programado_para || null;
      c.avisado = false;
      c.error = null;
      if (c.programado_para && !c.estado) c.estado = 'programado';
      if (!c.programado_para && !c.estado) c.estado = 'borrador';
    }
    const { data, error } = await supabase.from('piezas').update(c).eq('id', req.params.id).select('id').single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  // Rehace las imágenes con los textos editados: { slides }
  r.post('/piezas/:id/rehacer', async (req, res) => {
    try {
      const { data: pieza, error } = await supabase.from('piezas').select('*').eq('id', req.params.id).single();
      if (error) return res.status(404).json({ error: 'No existe esa pieza' });
      if (pieza.formato === 'marketplace') return res.status(400).json({ error: 'Para Marketplace creá una nueva' });
      const [{ data: productos }, promo] = await Promise.all([supabase.from('productos').select('*'), promoVigente()]);
      const estudio = require('./estudio');
      const elegidos = productos.filter((p) => (pieza.producto_ids || []).map(Number).includes(p.id));
      const slides = estudio.normalizarSlides(req.body.slides || pieza.guion?.slides, pieza.formato, elegidos);
      const imagenes = await estudio.dibujarGuion({ formato: pieza.formato, slides, productos, promo });
      await guardarImagenes(pieza.id, imagenes, estudio.aDataUrl);
      await supabase.from('piezas').update({ guion: { slides }, miniatura: await estudio.miniatura(imagenes[0]) }).eq('id', pieza.id);
      res.json({ ok: true });
    } catch (e) { fallar(res, e); }
  });

  r.post('/piezas/:id/publicar', async (req, res) => {
    try {
      const { data: pieza, error } = await supabase.from('piezas').select('*').eq('id', req.params.id).single();
      if (error) return res.status(404).json({ error: 'No existe esa pieza' });
      if (pieza.formato === 'marketplace') return res.status(400).json({ error: 'Marketplace se publica a mano' });
      res.json(await publicarEnInstagram(pieza));
    } catch (e) {
      await supabase.from('piezas').update({ error: e.message }).eq('id', req.params.id);
      res.status(500).json({ error: e.message });
    }
  });

  r.delete('/piezas/:id', async (req, res) => {
    const { error } = await supabase.from('piezas').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  });

  // Plan de la semana con IA (7 ideas listas para crear)
  r.post('/plan', async (req, res) => {
    try {
      const [{ data: productos }, promo, { data: ultimas }] = await Promise.all([
        supabase.from('productos').select('*'),
        promoVigente(),
        supabase.from('piezas').select('titulo').order('created_at', { ascending: false }).limit(12),
      ]);
      const { planSemanal } = require('./estudio');
      res.json(await planSemanal({ productos, promo, publicadas: (ultimas || []).map((u) => u.titulo), desde: hoyAR() }));
    } catch (e) { fallar(res, e); }
  });

  return r;
}

// Imagen pública (sin contraseña) para que Instagram la descargue. La clave es imposible de adivinar.
async function imagenPublica(req, res) {
  if (!supabase || !/^[a-f0-9]{32}$/.test(req.params.clave)) return res.sendStatus(404);
  const { data } = await supabase.from('pieza_imagenes').select('imagen').eq('clave', req.params.clave).maybeSingle();
  if (!data) return res.sendStatus(404);
  const [cab, b64] = data.imagen.split(',');
  res.set('Content-Type', (cab.match(/data:([^;]+)/) || [])[1] || 'image/jpeg');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(Buffer.from(b64, 'base64'));
}

module.exports = { router, imagenPublica, iniciarProgramador };
