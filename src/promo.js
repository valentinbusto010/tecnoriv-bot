// Promo vigente (descuento con fecha límite y regalo), configurable desde /gestion → Stock → ⚙️.
// La usan el bot (cotiza el precio promo), el registro de ventas y el contenido de Instagram.
const { supabase } = require('./datos');
const negocio = require('./negocio');

const hoyAR = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

let cache = { t: 0, valor: null };

async function leerAjustes() {
  if (!supabase) return {};
  if (cache.valor && Date.now() - cache.t < 30000) return cache.valor;
  const { data, error } = await supabase.from('ajustes').select('clave, valor').neq('clave', 'logo_marca');
  const valor = error ? {} : Object.fromEntries((data || []).map((a) => [a.clave, a.valor]));
  cache = { t: Date.now(), valor };
  return valor;
}

const invalidarAjustes = () => { cache.t = 0; };

// { descuento, hasta, regaloId, regaloCategoria } o null si no hay promo activa hoy.
function promoDe(aj, hoy = hoyAR()) {
  const descuento = Number(aj.promo_descuento) || 0;
  const hasta = String(aj.promo_hasta || '');
  const regaloId = Number(aj.promo_regalo_id) || null;
  if (!hasta || hoy > hasta || (!descuento && !regaloId)) return null;
  return { descuento, hasta, regaloId, regaloCategoria: aj.promo_regalo_categoria || 'Wearables' };
}

async function promoVigente() {
  return promoDe(await leerAjustes());
}

// Precio con el descuento aplicado (redondeado al peso). Sin promo, el precio de lista.
const precioPromo = (precio, promo) =>
  promo && promo.descuento ? Math.round(Number(precio) * (1 - promo.descuento / 100)) : Number(precio);

// % de descuento en efectivo de un producto (sin mirar la promo): el especial si coincide (ej. fundas), si no el general.
const descuentoEfectivoDe = (producto = null) => {
  const txt = `${producto?.nombre || ''} ${producto?.categoria || ''}`.toLowerCase();
  const esp = producto ? (negocio.efectivoEspecial || []).find((r) => txt.includes(String(r.palabra).toLowerCase())) : null;
  return esp ? Number(esp.descuento) || 0 : Number(negocio.descuentoEfectivo) || 0;
};

// % de descuento en efectivo que corre hoy: si hay promo con % OFF y negocio.efectivoConPromo es false, no se suma (0).
// Con producto devuelve el de ese producto (las fundas tienen el suyo); sin producto, el general.
const efectivoVigente = (promo, producto = null) =>
  promo && promo.descuento && !negocio.efectivoConPromo ? 0 : descuentoEfectivoDe(producto);

// Reglas para mostrar en paneles: { general, especiales: [{ palabra, nombre, descuento }] } o null si hoy no corre.
const reglasEfectivo = (promo) =>
  promo && promo.descuento && !negocio.efectivoConPromo ? null : { general: Number(negocio.descuentoEfectivo) || 0, especiales: negocio.efectivoEspecial || [] };

// Precio pagando en efectivo sobre el precio dado (ya con promo). Pasá la promo vigente y el producto.
const precioEfectivo = (precio, promo = null, producto = null) => {
  const d = efectivoVigente(promo, producto);
  return d > 0 ? Math.round(Number(precio) * (1 - d / 100)) : Number(precio);
};

// "2026-10-31" -> "31/10"
const fechaCorta = (f) => (f ? `${f.slice(8, 10)}/${f.slice(5, 7)}` : '');

module.exports = { hoyAR, leerAjustes, invalidarAjustes, promoDe, promoVigente, precioPromo, precioEfectivo, efectivoVigente, descuentoEfectivoDe, reglasEfectivo, fechaCorta };
