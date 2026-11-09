// CATÁLOGO PÚBLICO (/catalogo): productos y precios para clientes, sin contraseña.
// Lee la misma tabla "productos" que usan el bot y /gestion, así que se actualiza solo.
// Solo expone lo que el cliente necesita: nunca costos, márgenes ni el stock exacto.
const { supabase } = require('./datos');
const negocio = require('./negocio');
const { promoVigente, precioPromo, precioEfectivo, fechaCorta } = require('./promo');

// "358 576-4330" -> "5493585764330" (formato de wa.me para celulares de Argentina)
function waInternacional(numero) {
  let d = String(numero || '').replace(/\D/g, '');
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('9')) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);
  return d ? '549' + d.replace(/^(\d{2,4})15/, '$1') : '';
}

let cache = { t: 0, datos: null };

async function armarCatalogo() {
  if (cache.datos && Date.now() - cache.t < 30 * 1000) return cache.datos;
  const [{ data, error }, promo] = await Promise.all([
    supabase.from('productos').select('id, nombre, categoria, precio, stock, alerta, descripcion, cuotas_sin_interes, imagen_url, activo').eq('activo', true),
    promoVigente(),
  ]);
  if (error) throw new Error(error.message);
  const productos = (data || [])
    .filter((p) => Number(p.precio) > 0)
    .map((p) => {
      const precio = Number(p.precio);
      const final = promo?.descuento ? precioPromo(precio, promo) : precio;
      const stock = Number(p.stock) || 0;
      return {
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria || 'Otros',
        precio: final,
        precio_anterior: final < precio ? precio : null,
        precio_efectivo: precioEfectivo(final),
        cuotas: Number(p.cuotas_sin_interes) || 0,
        descripcion: p.descripcion || '',
        imagen: p.imagen_url || null,
        estado: stock <= 0 ? 'agotado' : stock <= (Number(p.alerta) || 1) ? 'ultimas' : 'disponible',
        regalo: Boolean(promo?.regaloId && (p.categoria || '') === promo.regaloCategoria && stock > 0),
      };
    })
    // Primero lo disponible, después "últimas unidades" y al final lo agotado; dentro, por nombre.
    .sort((a, b) => ({ disponible: 0, ultimas: 1, agotado: 2 }[a.estado] - { disponible: 0, ultimas: 1, agotado: 2 }[b.estado]) || a.nombre.localeCompare(b.nombre, 'es'));

  let regalo = null;
  if (promo?.regaloId) {
    const { data: r } = await supabase.from('productos').select('nombre, stock').eq('id', promo.regaloId).maybeSingle();
    if (r?.stock > 0) regalo = { nombre: r.nombre, categoria: promo.regaloCategoria };
  }
  const datos = {
    actualizado: new Date().toISOString(),
    negocio: {
      nombre: negocio.nombre,
      instagram: negocio.instagram,
      ciudad: negocio.ciudad,
      whatsapp: negocio.whatsapp,
      wa: waInternacional(process.env.WHATSAPP_PEDIDOS || negocio.whatsapp),
      envios: negocio.envios,
      garantia: negocio.garantia,
      pagos: negocio.mediosDePago,
      horario: negocio.horario,
      descuento_efectivo: Number(negocio.descuentoEfectivo) || 0,
    },
    promo: promo ? { descuento: promo.descuento, hasta: fechaCorta(promo.hasta), regalo } : null,
    productos,
  };
  cache = { t: Date.now(), datos };
  return datos;
}

async function api(req, res) {
  if (!supabase) return res.status(503).json({ error: 'Catálogo no disponible' });
  try {
    res.set('Cache-Control', 'public, max-age=30');
    res.json(await armarCatalogo());
  } catch (e) {
    console.error('Catálogo:', e.message);
    res.status(500).json({ error: 'No se pudo cargar el catálogo. Probá en un rato.' });
  }
}

// ───────── FEED PARA META (catálogo de WhatsApp / Instagram) ─────────
// Meta lo lee cada hora desde /catalogo/meta.csv: precios, promo y disponibilidad salen de Supabase.
// Solo van los productos con foto (Meta los rechaza sin imagen). Nunca expone costos ni stock exacto.
const idMeta = (id) => `TR-${id}`;
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ')}"`;

async function feedMeta(req, res) {
  if (!supabase) return res.status(503).send('Catálogo no disponible');
  try {
    const datos = await armarCatalogo();
    const base = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `https://${req.get('host')}`).replace(/\/$/, '');
    const d = datos.negocio.descuento_efectivo;
    const cols = ['id', 'title', 'description', 'availability', 'condition', 'price', 'sale_price', 'link', 'image_link', 'brand', 'product_type'];
    const filas = datos.productos.filter((p) => p.imagen).map((p) => {
      const extra = [d ? `${d}% OFF pagando en efectivo` : '', 'Envío gratis en Río Cuarto', negocio.garantia].filter(Boolean).join(' · ');
      const desc = `${String(p.descripcion || p.nombre).trim().replace(/[.\s]+$/, '')}. ${extra}.`.slice(0, 5000);
      const lista = p.precio_anterior || p.precio;
      return [
        idMeta(p.id), p.nombre.slice(0, 150), desc,
        p.estado === 'agotado' ? 'out of stock' : 'in stock', 'new',
        `${Number(lista).toFixed(2)} ARS`, p.precio_anterior ? `${Number(p.precio).toFixed(2)} ARS` : '',
        `${base}/catalogo?p=${p.id}`, p.imagen, negocio.nombre, p.categoria,
      ].map(csv).join(',');
    });
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.send([cols.join(','), ...filas].join('\n'));
  } catch (e) {
    console.error('Feed Meta:', e.message);
    res.status(500).send('Error armando el feed');
  }
}

// "TR-42" -> 42 (lo que manda WhatsApp cuando el cliente pide desde el catálogo)
const idDesdeMeta = (rid) => Number(String(rid || '').replace(/^TR-/i, '')) || null;

module.exports = { api, waInternacional, feedMeta, idDesdeMeta };
