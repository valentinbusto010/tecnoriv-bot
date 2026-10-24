// Contenido de Instagram para el regreso: 3 historias, un carrusel y el caption.
// Se arma en el servidor con las fotos reales de los productos y el estilo de @tecno_riv.
const axios = require('axios');
const sharp = require('sharp');
const negocio = require('./negocio');
const { texto, fuenteTitular, fuenteBold, fuenteMedia, COLORES } = require('./publicacion');
const { precioPromo, fechaCorta } = require('./promo');

const fmt = (n) => '$' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const M = 64; // margen

// ───────── piezas de dibujo ─────────

// Corta un texto en líneas que entren en el ancho.
function envolver(fuente, str, tam, anchoMax, maxLineas = 3) {
  const palabras = String(str).split(/\s+/);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? actual + ' ' + p : p;
    if (fuente.getAdvanceWidth(prueba, tam) <= anchoMax || !actual) actual = prueba;
    else { lineas.push(actual); actual = p; }
  }
  if (actual) lineas.push(actual);
  return lineas.slice(0, maxLineas);
}

const svg = (W, H, contenido) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${contenido}</svg>`);

// Rótulo con punto celeste y letras espaciadas
const rotulo = (str, x, y, color = COLORES.blanco) =>
  `<circle cx="${x + 9}" cy="${y - 10}" r="9" fill="${COLORES.acento}"/>` +
  texto(fuenteBold, str.toUpperCase(), { x: x + 32, y, tam: 28, anchoMax: 800, color, espaciado: 0.15 }).svg;

// Pastilla de color con texto adentro
function pastilla(str, { x, y, alto = 64, tam = 30, fondo = COLORES.rojo, color = COLORES.blanco, alinear = 'izq', fuente = fuenteBold }) {
  const t = texto(fuente, str, { x: 0, y: 0, tam, anchoMax: 900, color });
  const ancho = t.ancho + alto * 0.8;
  const x0 = alinear === 'der' ? x - ancho : alinear === 'centro' ? x - ancho / 2 : x;
  const base = y + alto / 2 + t.tam * 0.36;
  return {
    svg: `<rect x="${x0}" y="${y}" width="${ancho}" height="${alto}" rx="${alto / 2}" fill="${fondo}"/>` +
      texto(fuente, str, { x: x0 + alto * 0.4, y: base, tam: t.tam, anchoMax: 900, color }).svg,
    ancho,
  };
}

function pie(W, H) {
  return texto(fuenteBold, negocio.nombre.toUpperCase(), { x: M, y: H - 58, tam: 26, anchoMax: 400, color: COLORES.acento, espaciado: 0.15 }).svg +
    texto(fuenteMedia, negocio.instagram, { x: W - M, y: H - 58, tam: 26, anchoMax: 400, color: COLORES.gris, alinear: 'der' }).svg;
}

// Foto a pantalla completa con degradé oscuro para que se lea el texto.
async function fondoFoto(foto, W, H, intensidad = 0.92) {
  const sombra = svg(W, H, `
    <defs>
      <linearGradient id="a" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.2" stop-color="#000" stop-opacity="0"/>
        <stop offset="0.55" stop-color="#000" stop-opacity="${intensidad * 0.6}"/>
        <stop offset="1" stop-color="#000" stop-opacity="${intensidad}"/>
      </linearGradient>
      <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity="0.5"/>
        <stop offset="0.16" stop-color="#000" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#a)"/><rect width="100%" height="100%" fill="url(#b)"/>`);
  return sharp(foto).rotate().resize(W, H, { fit: 'cover', position: 'centre' }).modulate({ saturation: 1.08 })
    .composite([{ input: sombra }]).png().toBuffer();
}

// Fondo oscuro de la marca
const lienzo = (W, H) => sharp(svg(W, H, `
  <defs><radialGradient id="g" cx="0.5" cy="0.25" r="0.9">
    <stop offset="0" stop-color="#0d2a5c"/><stop offset="0.55" stop-color="#070d1f"/><stop offset="1" stop-color="#04060c"/>
  </radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>`)).png().toBuffer();

async function fotoRedonda(foto, w, h, r = 36) {
  return sharp(foto).rotate().resize(w, h, { fit: 'cover' })
    .composite([{ input: svg(w, h, `<rect width="${w}" height="${h}" rx="${r}" fill="#fff"/>`), blend: 'dest-in' }])
    .png().toBuffer();
}

const aJpg = (base, capas) => sharp(base).composite(capas).jpeg({ quality: 88 }).toBuffer();

// ───────── bloques de contenido ─────────

// "10% OFF / EN TODO / hasta el 31/10" + regalo. Devuelve svg desde y (arriba) hacia abajo.
function bloquePromo(W, y, promo, regalo, escala = 1) {
  let s = '';
  if (promo.descuento) {
    const grande = texto(fuenteTitular, `${promo.descuento}% OFF`, { x: W / 2, y: y + 250 * escala, tam: 270 * escala, anchoMax: W - M * 2, color: COLORES.acento, alinear: 'centro' });
    s += grande.svg;
    y += 250 * escala;
    s += texto(fuenteTitular, 'EN TODO', { x: W / 2, y: y + 150 * escala, tam: 140 * escala, anchoMax: W - M * 2, color: COLORES.blanco, alinear: 'centro' }).svg;
    y += 150 * escala;
  }
  s += texto(fuenteMedia, `Hasta el ${fechaCorta(promo.hasta)}`, { x: W / 2, y: y + 70 * escala, tam: 46 * escala, anchoMax: W - M * 2, color: COLORES.gris, alinear: 'centro' }).svg;
  y += 70 * escala;
  if (regalo) {
    const alto = 150 * escala;
    const y0 = y + 50 * escala;
    s += `<rect x="${M}" y="${y0}" width="${W - M * 2}" height="${alto}" rx="${28 * escala}" fill="${COLORES.rojo}"/>`;
    s += texto(fuenteTitular, `+ ${nombreCorto(regalo.nombre).toUpperCase()} DE REGALO`, { x: W / 2, y: y0 + 72 * escala, tam: 48 * escala, anchoMax: W - M * 2 - 60, color: COLORES.blanco, alinear: 'centro' }).svg;
    s += texto(fuenteMedia, `con cada ${etiqueta(promo.regaloCategoria).toLowerCase()}`, { x: W / 2, y: y0 + 122 * escala, tam: 34 * escala, anchoMax: W - M * 2 - 60, color: COLORES.blanco, alinear: 'centro' }).svg;
    y = y0 + alto;
  }
  return { svg: s, y };
}

// "Hidrogel para smartwatch" -> "Hidrogel"
const nombreCorto = (n) => String(n).split(/\s+(para|de|con)\s+/i)[0];

const ETIQUETAS = { Wearables: 'Smartwatch', Audio: 'Auriculares', Cargadores: 'Cargador', Cables: 'Cable', Accesorios: 'Accesorio' };
const etiqueta = (cat, nombre = '') => (/funda/i.test(nombre) ? 'Funda' : ETIQUETAS[cat] || 'Tecno Riv');

function pasos(W, y, tam = 44, sep = 130) {
  const items = ['Escribinos por WhatsApp', 'Elegís envío gratis o retiro', 'Pagás como quieras'];
  return items.map((t, i) => {
    const yy = y + i * sep;
    return `<circle cx="${M + 38}" cy="${yy - tam * 0.36}" r="38" fill="${COLORES.acento}"/>` +
      texto(fuenteTitular, String(i + 1), { x: M + 38, y: yy, tam: 44, anchoMax: 60, color: '#04060c', alinear: 'centro' }).svg +
      texto(fuenteBold, t, { x: M + 104, y: yy, tam, anchoMax: W - M * 2 - 110, color: COLORES.blanco }).svg;
  }).join('');
}

function cajaWhatsapp(W, y, tam = 54) {
  const alto = tam * 2.1;
  return `<rect x="${M}" y="${y}" width="${W - M * 2}" height="${alto}" rx="${alto / 2}" fill="none" stroke="${COLORES.acento}" stroke-width="4"/>` +
    texto(fuenteTitular, `WhatsApp ${negocio.whatsapp}`, { x: W / 2, y: y + alto / 2 + tam * 0.36, tam, anchoMax: W - M * 2 - 80, color: COLORES.blanco, alinear: 'centro' }).svg;
}

// ───────── piezas ─────────

async function historiaRegreso(foto) {
  const W = 1080, H = 1920;
  const base = await fondoFoto(foto, W, H);
  const s = rotulo(`${negocio.nombre} · Río Cuarto`, M, 170) +
    texto(fuenteTitular, 'VOLVIMOS', { x: M, y: 1270, tam: 210, anchoMax: W - M * 2, color: COLORES.blanco }).svg +
    texto(fuenteTitular, 'CON TODO.', { x: M, y: 1460, tam: 190, anchoMax: W - M * 2, color: COLORES.acento }).svg +
    envolver(fuenteMedia, 'Smartwatches · Auriculares · Cargadores · Fundas', 40, W - M * 2, 2)
      .map((l, i) => texto(fuenteMedia, l, { x: M, y: 1560 + i * 54, tam: 40, anchoMax: W - M * 2, color: COLORES.blanco }).svg).join('') +
    pastilla('Mirá la próxima  »', { x: W / 2, y: 1730, alto: 84, tam: 36, fondo: COLORES.acento, color: '#04060c', alinear: 'centro' }).svg;
  return aJpg(base, [{ input: svg(W, H, s) }]);
}

async function historiaPromo(foto, promo, regalo) {
  const W = 1080, H = 1920;
  const base = await lienzo(W, H);
  const fw = W - M * 2, fh = 760;
  const capaFoto = await fotoRedonda(foto, fw, fh, 44);
  const b = bloquePromo(W, 1000, promo, regalo, 1);
  const s = rotulo('Promo de regreso', M, 150) + b.svg +
    texto(fuenteMedia, 'Envío gratis en Río Cuarto · 30 días de garantía', { x: W / 2, y: Math.min(b.y + 110, H - 120), tam: 34, anchoMax: W - M * 2, color: COLORES.gris, alinear: 'centro' }).svg;
  return aJpg(base, [{ input: capaFoto, left: M, top: 210 }, { input: svg(W, H, s) }]);
}

async function historiaComoComprar(foto) {
  const W = 1080, H = 1920;
  const base = await fondoFoto(foto, W, H, 0.97);
  const oscuro = svg(W, H, `<rect width="100%" height="100%" fill="#000" fill-opacity="0.35"/>`);
  const s = rotulo(negocio.nombre, M, 170) +
    texto(fuenteTitular, '¿CÓMO', { x: M, y: 720, tam: 190, anchoMax: W - M * 2, color: COLORES.blanco }).svg +
    texto(fuenteTitular, 'COMPRO?', { x: M, y: 900, tam: 190, anchoMax: W - M * 2, color: COLORES.acento }).svg +
    pasos(W, 1090, 46, 140) +
    cajaWhatsapp(W, 1520, 56) +
    texto(fuenteMedia, 'Envío gratis en Río Cuarto · 30 días de garantía', { x: W / 2, y: 1760, tam: 34, anchoMax: W - M * 2, color: COLORES.gris, alinear: 'centro' }).svg;
  return aJpg(base, [{ input: oscuro }, { input: svg(W, H, s) }]);
}

async function portada(foto, promo) {
  const W = 1080, H = 1350;
  const base = await fondoFoto(foto, W, H);
  const lineas = [['VOLVIMOS', COLORES.blanco], ['CON', COLORES.blanco], ['TODO.', COLORES.acento]];
  let s = rotulo(`${negocio.nombre} · Río Cuarto`, M, 120);
  lineas.forEach(([l, c], i) => { s += texto(fuenteTitular, l, { x: M, y: 790 + i * 170, tam: 180, anchoMax: W - M * 2, color: c }).svg; });
  s += texto(fuenteMedia, `${promo.descuento ? promo.descuento + '% OFF ' : 'Promo '}hasta el ${fechaCorta(promo.hasta)} · Deslizá  »`, { x: M, y: 1228, tam: 38, anchoMax: W - M * 2, color: COLORES.blanco }).svg;
  s += pie(W, H);
  return aJpg(base, [{ input: svg(W, H, s) }]);
}

async function slidePromo(foto, promo, regalo) {
  const W = 1080, H = 1350;
  const base = await lienzo(W, H);
  const capaFoto = await fotoRedonda(foto, W - M * 2, 440, 40);
  const b = bloquePromo(W, 560, promo, regalo, 0.82);
  return aJpg(base, [{ input: capaFoto, left: M, top: 110 }, { input: svg(W, H, b.svg + pie(W, H)) }]);
}

async function slideProducto(foto, p, promo, regalo) {
  const W = 1080, H = 1350;
  const base = await fondoFoto(foto, W, H);
  let s = rotulo(etiqueta(p.categoria, p.nombre), M, 120);
  if (promo.descuento) s += pastilla(`${promo.descuento}% OFF`, { x: W - M, y: 76, alto: 66, tam: 32, alinear: 'der' }).svg;

  // De abajo hacia arriba: precio, regalo, nombre
  let y = 1215;
  const conPromo = promo.descuento ? precioPromo(p.precio, promo) : Number(p.precio);
  const grande = texto(fuenteTitular, fmt(conPromo), { x: M, y, tam: 118, anchoMax: 640, color: COLORES.blanco });
  s += grande.svg;
  if (promo.descuento) {
    const viejo = texto(fuenteMedia, fmt(p.precio), { x: M + grande.ancho + 28, y: y - 14, tam: 44, anchoMax: 300, color: COLORES.gris });
    s += viejo.svg + `<line x1="${M + grande.ancho + 24}" y1="${y - 30}" x2="${M + grande.ancho + 32 + viejo.ancho}" y2="${y - 30}" stroke="${COLORES.gris}" stroke-width="4"/>`;
  }
  y -= 150;
  if (regalo && p.categoria === promo.regaloCategoria) {
    s += pastilla(`+ ${nombreCorto(regalo.nombre).toUpperCase()} DE REGALO`, { x: M, y: y - 30, alto: 66, tam: 30 }).svg;
    y -= 96;
  }
  const lineas = envolver(fuenteTitular, p.nombre.toUpperCase(), 92, W - M * 2, 3);
  const tam = lineas.length > 2 ? 78 : 92;
  lineas.slice().reverse().forEach((l, i) => {
    s += texto(fuenteTitular, l, { x: M, y: y - i * tam * 1.02, tam, anchoMax: W - M * 2, color: i === lineas.length - 1 ? COLORES.acento : COLORES.blanco }).svg;
  });
  s += pie(W, H);
  return aJpg(base, [{ input: svg(W, H, s) }]);
}

async function slideComoComprar() {
  const W = 1080, H = 1350;
  const base = await lienzo(W, H);
  const s = rotulo(negocio.nombre, M, 120) +
    texto(fuenteTitular, '¿CÓMO', { x: M, y: 360, tam: 170, anchoMax: W - M * 2, color: COLORES.blanco }).svg +
    texto(fuenteTitular, 'COMPRO?', { x: M, y: 520, tam: 170, anchoMax: W - M * 2, color: COLORES.acento }).svg +
    pasos(W, 700, 44, 125) +
    cajaWhatsapp(W, 1010, 50) +
    texto(fuenteMedia, 'Envío gratis en Río Cuarto · 30 días de garantía', { x: W / 2, y: 1205, tam: 32, anchoMax: W - M * 2, color: COLORES.gris, alinear: 'centro' }).svg +
    pie(W, H);
  return aJpg(base, [{ input: svg(W, H, s) }]);
}

function caption(promo, regalo) {
  const lineas = ['🔥 ¡VOLVIMOS! Y arrancamos con todo 🔥', ''];
  if (promo.descuento) lineas.push(`Hasta el ${fechaCorta(promo.hasta)} tenés ${promo.descuento}% OFF en toda la tienda 🙌`);
  if (regalo) lineas.push(`⌚ Y si te llevás un ${etiqueta(promo.regaloCategoria).toLowerCase()}, el ${nombreCorto(regalo.nombre).toLowerCase()} va de REGALO (hasta agotar stock).`);
  lineas.push('',
    '✅ Smartwatches, auriculares, cargadores y fundas',
    '✅ Envío gratis en Río Cuarto o retiro a coordinar',
    `✅ ${negocio.garantia}`,
    '✅ Pagás como quieras: efectivo, transferencia, Mercado Pago o tarjeta',
    '',
    `📲 Escribinos al WhatsApp ${negocio.whatsapp} o por DM y te respondemos al toque.`,
    '',
    '#RioCuarto #TecnoRiv #Smartwatch #AuricularesBluetooth #AccesoriosCelular #FundasIphone #CargadorIphone #Cordoba');
  return lineas.join('\n');
}

// ───────── selección y armado ─────────

// Productos para el carrusel: 2 smartwatches, 2 auriculares, 1 cargador y 1 funda, con foto y stock.
function elegirProductos(productos, promo) {
  const disponibles = productos.filter((p) => p.activo !== false && p.imagen_url && p.stock > 0 && p.id !== promo.regaloId);
  const orden = (a, b) => b.stock - a.stock || b.precio - a.precio;
  const de = (filtro, n) => disponibles.filter(filtro).sort(orden).slice(0, n);
  return [
    ...de((p) => p.categoria === 'Wearables', 2),
    ...de((p) => p.categoria === 'Audio', 2),
    ...de((p) => p.categoria === 'Cargadores', 1),
    ...de((p) => /funda/i.test(p.nombre) && /iphone/i.test(p.nombre), 1),
  ];
}

async function bajarFoto(url) {
  const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(data);
}

// Devuelve [{ formato, orden, nombre, imagen(Buffer)|null, texto|null }]
async function generarPackRegreso({ productos, promo, regalo, ids }) {
  const elegidos = ids?.length ? ids.map((id) => productos.find((p) => p.id === Number(id))).filter(Boolean) : elegirProductos(productos, promo);
  if (!elegidos.length) throw new Error('No hay productos con foto y stock para armar el contenido');
  const fotos = await Promise.all(elegidos.map((p) => bajarFoto(p.imagen_url)));
  const heroe = fotos[0];
  const otra = fotos[2] || fotos[1] || heroe;

  const piezas = [];
  piezas.push({ formato: 'historia', orden: 1, nombre: 'historia-1-volvimos', imagen: await historiaRegreso(heroe) });
  piezas.push({ formato: 'historia', orden: 2, nombre: 'historia-2-promo', imagen: await historiaPromo(heroe, promo, regalo) });
  piezas.push({ formato: 'historia', orden: 3, nombre: 'historia-3-como-comprar', imagen: await historiaComoComprar(otra) });

  let n = 1;
  piezas.push({ formato: 'carrusel', orden: n++, nombre: 'carrusel-01-portada', imagen: await portada(heroe, promo) });
  piezas.push({ formato: 'carrusel', orden: n++, nombre: 'carrusel-02-promo', imagen: await slidePromo(heroe, promo, regalo) });
  for (let i = 0; i < elegidos.length; i++) {
    const nro = String(n).padStart(2, '0');
    piezas.push({ formato: 'carrusel', orden: n++, nombre: `carrusel-${nro}-${elegidos[i].nombre}`, imagen: await slideProducto(fotos[i], elegidos[i], promo, regalo) });
  }
  piezas.push({ formato: 'carrusel', orden: n++, nombre: `carrusel-${String(n - 1).padStart(2, '0')}-como-comprar`, imagen: await slideComoComprar() });
  piezas.push({ formato: 'caption', orden: 1, nombre: 'caption', imagen: null, texto: caption(promo, regalo) });
  return piezas;
}

module.exports = { generarPackRegreso, elegirProductos };
