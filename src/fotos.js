// GALERÍA DE FOTOS POR PRODUCTO (tabla producto_fotos + bucket público "productos" de Supabase Storage).
// /contenido elige la foto menos usada de cada producto para no repetir la misma en el feed.
const axios = require('axios');
const sharp = require('sharp');
const { supabase } = require('./datos');

const BUCKET = 'productos';

// Achica a 1600 px (lo que usa Instagram), corrige la rotación del celu y guarda en JPG.
async function preparar(buffer) {
  return sharp(buffer).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}

async function subir(productoId, buffer) {
  const jpg = await preparar(buffer);
  const ruta = `galeria/${productoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, jpg, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`No se pudo guardar la foto: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
}

// Agrega una foto a la galería. Si viene de Drive y ya estaba importada, no la duplica.
async function agregar({ producto_id, buffer, origen = 'panel', origen_id = null }) {
  if (origen_id) {
    const { data: ya } = await supabase.from('producto_fotos').select('id, url').eq('origen_id', origen_id).maybeSingle();
    if (ya) return { ...ya, repetida: true };
  }
  const url = await subir(producto_id, buffer);
  const { data, error } = await supabase.from('producto_fotos').insert({ producto_id, url, origen, origen_id }).select().single();
  if (error) throw new Error(error.message);
  // Si el producto no tenía foto principal, esta pasa a serlo (catálogo, WhatsApp y Marketplace).
  const { data: p } = await supabase.from('productos').select('imagen_url').eq('id', producto_id).single();
  if (p && !p.imagen_url) await supabase.from('productos').update({ imagen_url: url }).eq('id', producto_id);
  return data;
}

// Importa fotos desde links (ej. Google Drive compartido). items: [{ producto_id, url, origen_id }]
async function importar(items) {
  const resultado = { nuevas: 0, repetidas: 0, errores: [] };
  for (const it of items.slice(0, 60)) {
    try {
      if (it.origen_id) {
        const { data: ya } = await supabase.from('producto_fotos').select('id').eq('origen_id', it.origen_id).maybeSingle();
        if (ya) { resultado.repetidas++; continue; }
      }
      const { data, headers } = await axios.get(it.url, { responseType: 'arraybuffer', timeout: 60000, maxContentLength: 40 * 1024 * 1024 });
      if (!/^image\//.test(headers['content-type'] || '')) throw new Error('el link no devuelve una imagen (¿la carpeta está compartida?)');
      await agregar({ producto_id: Number(it.producto_id), buffer: Buffer.from(data), origen: 'drive', origen_id: it.origen_id || null });
      resultado.nuevas++;
    } catch (e) {
      resultado.errores.push(`${it.nombre || it.origen_id || it.url}: ${e.message}`);
    }
  }
  return resultado;
}

// Para cada producto, la foto menos usada (y la que hace más que no se usa). Devuelve { producto_id: url }.
async function elegir(productoIds) {
  const ids = [...new Set(productoIds.map(Number).filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabase.from('producto_fotos').select('id, producto_id, url, usos, ultimo_uso').in('producto_id', ids);
  if (error) return {}; // sin tabla: se usa la foto principal como siempre
  const elegidas = {};
  for (const id of ids) {
    const fotos = (data || []).filter((f) => f.producto_id === id);
    if (!fotos.length) continue;
    fotos.sort((a, b) => (a.usos || 0) - (b.usos || 0) || String(a.ultimo_uso || '').localeCompare(String(b.ultimo_uso || '')) || Math.random() - 0.5);
    elegidas[id] = fotos[0].url;
  }
  return elegidas;
}

async function marcarUso(urls) {
  const lista = [...new Set(Object.values(urls || {}))];
  if (!lista.length) return;
  const { data } = await supabase.from('producto_fotos').select('id, usos').in('url', lista);
  const ahora = new Date().toISOString();
  for (const f of data || []) await supabase.from('producto_fotos').update({ usos: (f.usos || 0) + 1, ultimo_uso: ahora }).eq('id', f.id);
}

// Productos con la foto elegida en vez de la principal (para dibujar una pieza).
const conFotos = (productos, fotos) => productos.map((p) => (fotos?.[p.id] ? { ...p, imagen_url: fotos[p.id] } : p));

module.exports = { agregar, importar, elegir, marcarUso, conFotos, preparar };
