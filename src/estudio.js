// ESTUDIO DE CONTENIDO: arma carruseles, posts, historias y publicaciones de Marketplace
// con el estilo de @tecno_riv (foto real, titular enorme blanco + celeste, fondo azul noche).
// Claude escribe los textos de cada slide; las imágenes se dibujan acá con las fuentes de la marca.
const sharp = require('sharp');
const negocio = require('./negocio');
const { generarEstructurado } = require('./claude');
const { texto, fuenteTitular, fuenteBold, fuenteMedia, COLORES } = require('./publicacion');
const { precioPromo, fechaCorta } = require('./promo');
const { dibujo } = require('./instagram');

const { M, svg, envolver, rotulo, pastilla, pie, fondoFoto, lienzo, fotoRedonda, aJpg, pasos, cajaWhatsapp, etiqueta, bajarFoto, fmt } = dibujo;

const W = 1080;
const ALTO = { carrusel: 1350, post: 1350, historias: 1920 };
const MAX_SLIDES = { carrusel: 10, post: 1, historias: 5 }; // Instagram publica hasta 10 por carrusel
const TIPOS = ['portada', 'texto', 'lista', 'producto', 'comparativa', 'cta'];

// Las fuentes de la marca no tienen emojis: se sacan de los textos que van en la imagen.
const sinEmoji = (t) => String(t || '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s{2,}/g, ' ').trim();

// ───────── bloques ─────────

// Titular en varias líneas, achicando la letra hasta que todas entren. Una línea va en celeste.
function titular(lineas, destacada, { x = M, y, tamMax, anchoMax = W - M * 2, desdeAbajo = false, alinear = 'izq' }) {
  lineas = lineas.map((l) => sinEmoji(l).toUpperCase()).filter(Boolean).slice(0, 4);
  if (!lineas.length) return { svg: '', arriba: y, abajo: y, tam: 0 };
  let tam = tamMax;
  while (tam > 48 && lineas.some((l) => fuenteTitular.getAdvanceWidth(l, tam) > anchoMax)) tam -= 4;
  const inter = tam * 0.98;
  const primera = desdeAbajo ? y - inter * (lineas.length - 1) : y + tam * 0.78;
  const s = lineas.map((l, i) => texto(fuenteTitular, l, {
    x, y: primera + i * inter, tam, anchoMax, alinear,
    color: i === destacada ? COLORES.acento : COLORES.blanco,
  }).svg).join('');
  return { svg: s, arriba: primera - tam * 0.78, abajo: primera + inter * (lineas.length - 1), tam };
}

// Párrafo con salto de línea automático. Devuelve hasta dónde llegó.
function parrafo(str, { x = M, y, tam = 40, anchoMax = W - M * 2, color = '#E6E9F0', fuente = fuenteMedia, maxLineas = 6, inter = 1.42, alinear = 'izq' }) {
  const lineas = envolver(fuente, sinEmoji(str), tam, anchoMax, maxLineas);
  const s = lineas.map((l, i) => texto(fuente, l, { x, y: y + i * tam * inter, tam, anchoMax, color, alinear }).svg).join('');
  return { svg: s, abajo: lineas.length ? y + (lineas.length - 1) * tam * inter : y - tam * inter, lineas: lineas.length };
}

const contador = (n, total, H = 1350) =>
  total > 1 ? texto(fuenteMedia, `${String(n).padStart(2, '0')}/${String(total).padStart(2, '0')}`, { x: W - M, y: H > 1400 ? 200 : 120, tam: 26, anchoMax: 200, color: COLORES.gris, alinear: 'der' }).svg : '';

function precioSvg(p, promo, { x = M, y, tam = 110 }) {
  const lista = Number(p.precio);
  const final = promo?.descuento ? precioPromo(lista, promo) : lista;
  const grande = texto(fuenteTitular, fmt(final), { x, y, tam, anchoMax: 640, color: COLORES.blanco });
  let s = grande.svg;
  if (final < lista) {
    const viejo = texto(fuenteMedia, fmt(lista), { x: x + grande.ancho + 26, y: y - 12, tam: tam * 0.38, anchoMax: 300, color: COLORES.gris });
    s += viejo.svg + `<line x1="${x + grande.ancho + 22}" y1="${y - 12 - tam * 0.13}" x2="${x + grande.ancho + 30 + viejo.ancho}" y2="${y - 12 - tam * 0.13}" stroke="${COLORES.gris}" stroke-width="4"/>`;
  }
  return s;
}

// ───────── slides ─────────
// Cada uno recibe: s (textos del slide), H (alto), ctx { n, total, fotos, productos, promo, formato }

async function slidePortada(s, H, ctx) {
  const foto = ctx.fotoDe(s.producto_id) || ctx.fotoPrincipal;
  const base = foto ? await fondoFoto(foto, W, H) : await lienzo(W, H);
  const historia = H > 1400;
  const yCuerpo = H - (historia ? 300 : 150);
  const cuerpo = sinEmoji(s.cuerpo) + (ctx.formato === 'carrusel' && ctx.total > 1 ? '  ·  Deslizá »' : '');
  const lineasCuerpo = envolver(fuenteMedia, cuerpo, 38, W - M * 2, 2);
  const t = titular(s.titular, s.destacada, { y: yCuerpo - 80 - (lineasCuerpo.length - 1) * 52, tamMax: historia ? 190 : 170, desdeAbajo: true });
  let out = rotulo(sinEmoji(s.kicker) || `${negocio.nombre} · Río Cuarto`, M, historia ? 200 : 120) + contador(ctx.n, ctx.total, H) + t.svg;
  out += lineasCuerpo.map((l, i) => texto(fuenteMedia, l, { x: M, y: yCuerpo + i * 52, tam: 38, anchoMax: W - M * 2, color: COLORES.blanco }).svg).join('');
  if (!historia) out += pie(W, H);
  return aJpg(base, [{ input: svg(W, H, out) }]);
}

async function slideTexto(s, H, ctx) {
  const base = await lienzo(W, H);
  const historia = H > 1400;
  const y0 = historia ? 300 : 190;
  const t = titular(s.titular, s.destacada, { y: y0, tamMax: historia ? 130 : 112 });
  const c = parrafo(s.cuerpo, { y: t.abajo + 110, tam: historia ? 46 : 40, maxLineas: historia ? 9 : 7 });
  const capas = [];
  let out = rotulo(sinEmoji(s.kicker) || negocio.nombre, M, historia ? 200 : 120) + contador(ctx.n, ctx.total, H) + t.svg + c.svg;
  // Si el slide habla de un producto y queda lugar, va su foto abajo.
  const foto = ctx.fotoDe(s.producto_id);
  const arribaFoto = c.abajo + 70;
  const abajoFoto = H - (historia ? 220 : 130);
  if (foto && abajoFoto - arribaFoto >= 280) {
    capas.push({ input: await fotoRedonda(foto, W - M * 2, Math.round(abajoFoto - arribaFoto), 40), left: M, top: Math.round(arribaFoto) });
  }
  if (!historia) out += pie(W, H);
  return aJpg(base, [...capas, { input: svg(W, H, out) }]);
}

async function slideLista(s, H, ctx) {
  const base = await lienzo(W, H);
  const historia = H > 1400;
  const t = titular(s.titular, s.destacada, { y: historia ? 300 : 190, tamMax: historia ? 120 : 104 });
  const items = (s.items || []).map(sinEmoji).filter(Boolean).slice(0, 6);
  const inicio = t.abajo + 130;
  const fin = H - (historia ? 260 : 150);
  const paso = Math.min(historia ? 230 : 190, (fin - inicio) / Math.max(items.length, 1));
  const tam = paso < 150 ? 34 : 40;
  let out = rotulo(sinEmoji(s.kicker) || negocio.nombre, M, historia ? 200 : 120) + contador(ctx.n, ctx.total, H) + t.svg;
  items.forEach((it, i) => {
    const y = inicio + i * paso;
    out += `<circle cx="${M + 34}" cy="${y - tam * 0.36}" r="34" fill="${COLORES.acento}"/>`;
    out += texto(fuenteTitular, String(i + 1), { x: M + 34, y: y - tam * 0.36 + 14, tam: 40, anchoMax: 50, color: '#04060c', alinear: 'centro' }).svg;
    out += parrafo(it, { x: M + 100, y, tam, anchoMax: W - M * 2 - 100, color: COLORES.blanco, fuente: fuenteBold, maxLineas: 2, inter: 1.3 }).svg;
  });
  if (!historia) out += pie(W, H);
  return aJpg(base, [{ input: svg(W, H, out) }]);
}

async function slideProducto(s, H, ctx) {
  const p = ctx.producto(s.producto_id);
  if (!p) return slideTexto(s, H, ctx);
  const foto = ctx.fotoDe(p.id);
  const base = foto ? await fondoFoto(foto, W, H) : await lienzo(W, H);
  const historia = H > 1400;
  const promo = ctx.promo;
  let out = rotulo(sinEmoji(s.kicker) || etiqueta(p.categoria, p.nombre), M, historia ? 200 : 120) + contador(ctx.n, ctx.total, H);
  if (promo?.descuento) out += pastilla(`${promo.descuento}% OFF`, { x: W - M, y: historia ? 240 : 150, alto: 66, tam: 32, alinear: 'der' }).svg;
  // De abajo hacia arriba: precio, bajada, nombre
  let y = H - (historia ? 320 : 135);
  out += precioSvg(p, promo, { y });
  y -= 125;
  const bajada = envolver(fuenteMedia, sinEmoji(s.cuerpo), 34, W - M * 2, 2);
  bajada.slice().reverse().forEach((l, i) => { out += texto(fuenteMedia, l, { x: M, y: y - i * 46, tam: 34, anchoMax: W - M * 2, color: COLORES.blanco }).svg; });
  if (bajada.length) y -= 46 * bajada.length + 40;
  const nombre = s.titular?.length ? s.titular : envolver(fuenteTitular, p.nombre.toUpperCase(), 92, W - M * 2, 3);
  out += titular(nombre, s.titular?.length ? s.destacada : nombre.length - 1, { y, tamMax: 96, desdeAbajo: true }).svg;
  if (!historia) out += pie(W, H);
  return aJpg(base, [{ input: svg(W, H, out) }]);
}

async function slideComparativa(s, H, ctx) {
  const a = ctx.producto(s.producto_id);
  const b = ctx.producto(s.producto_id_b);
  if (!a || !b) return slideLista(s, H, ctx);
  const base = await lienzo(W, H);
  const historia = H > 1400;
  const t = titular(s.titular, s.destacada, { y: historia ? 300 : 190, tamMax: 100 });
  const colW = (W - M * 2 - 32) / 2;
  const fotoH = historia ? 560 : 400;
  const top = Math.round(t.abajo + 60);
  const capas = [];
  let out = rotulo(sinEmoji(s.kicker) || '¿Cuál te conviene?', M, historia ? 200 : 120) + contador(ctx.n, ctx.total, H) + t.svg;
  [[a, s.items], [b, s.items_b]].forEach(([p, items], i) => {
    const x = M + i * (colW + 32);
    let y = top + fotoH + 64;
    const nombre = envolver(fuenteTitular, p.nombre.toUpperCase(), 38, colW, 2);
    nombre.forEach((l, k) => { out += texto(fuenteTitular, l, { x, y: y + k * 44, tam: 38, anchoMax: colW, color: COLORES.blanco }).svg; });
    y += 44 * (nombre.length - 1) + 70;
    const final = ctx.promo?.descuento ? precioPromo(p.precio, ctx.promo) : Number(p.precio);
    out += texto(fuenteTitular, fmt(final), { x, y, tam: 52, anchoMax: colW, color: COLORES.acento }).svg;
    y += 64;
    (items || []).map(sinEmoji).filter(Boolean).slice(0, 3).forEach((it) => {
      out += `<circle cx="${x + 8}" cy="${y - 10}" r="7" fill="${COLORES.acento}"/>`;
      const r = parrafo(it, { x: x + 26, y, tam: 28, anchoMax: colW - 26, color: '#E6E9F0', maxLineas: 2, inter: 1.3 });
      out += r.svg;
      y = r.abajo + 50;
    });
  });
  for (const [i, p] of [a, b].entries()) {
    const f = ctx.fotoDe(p.id);
    if (f) capas.push({ input: await fotoRedonda(f, Math.round(colW), fotoH, 32), left: Math.round(M + i * (colW + 32)), top });
  }
  if (!historia) out += pie(W, H);
  return aJpg(base, [...capas, { input: svg(W, H, out) }]);
}

async function slideCta(s, H, ctx) {
  const historia = H > 1400;
  const foto = historia ? ctx.fotoPrincipal : null;
  const base = foto ? await fondoFoto(foto, W, H, 0.97) : await lienzo(W, H);
  const capas = foto ? [{ input: svg(W, H, '<rect width="100%" height="100%" fill="#000" fill-opacity="0.4"/>') }] : [];
  const lineas = s.titular?.length ? s.titular : ['¿CÓMO', 'COMPRO?'];
  const t = titular(lineas, s.titular?.length ? s.destacada : 1, { y: historia ? 520 : 200, tamMax: historia ? 180 : 160 });
  const yPasos = t.abajo + (historia ? 200 : 170);
  let out = rotulo(sinEmoji(s.kicker) || negocio.nombre, M, historia ? 200 : 120) + contador(ctx.n, ctx.total, H) + t.svg;
  out += pasos(W, yPasos, historia ? 46 : 44, historia ? 140 : 120);
  const yCaja = yPasos + (historia ? 420 : 330);
  out += cajaWhatsapp(W, yCaja, historia ? 56 : 50);
  out += texto(fuenteMedia, sinEmoji(s.cuerpo) || 'Envío gratis en Río Cuarto · 30 días de garantía', { x: W / 2, y: yCaja + (historia ? 230 : 190), tam: 32, anchoMax: W - M * 2, color: COLORES.gris, alinear: 'centro' }).svg;
  if (!historia) out += pie(W, H);
  return aJpg(base, [...capas, { input: svg(W, H, out) }]);
}

const DIBUJAR = { portada: slidePortada, texto: slideTexto, lista: slideLista, producto: slideProducto, comparativa: slideComparativa, cta: slideCta };

// ───────── textos con Claude ─────────

const PLANTILLAS = {
  producto: 'PRODUCTO DESTACADO: vendé UN producto. Portada con gancho fuerte → problema o deseo del cliente → 3 a 4 beneficios concretos (lista) → slide de producto con precio → para quién es / cómo se usa → cta.',
  coleccion: 'COLECCIÓN: mostrá varios productos (un slide "producto" por cada uno, en el orden que más venda). Portada con gancho → productos → cta.',
  comparativa: 'COMPARATIVA: ayudá a elegir entre productos. Portada con pregunta ("¿Cuál te conviene?") → slide "comparativa" con los 2 productos → para quién es cada uno (texto o lista) → slides "producto" de cada uno → cta.',
  tips: 'EDUCATIVO / TIPS: contenido de valor que la gente guarda y comparte (errores comunes, cómo cuidar, cómo elegir, mitos). Portada con gancho → 1 idea por slide (texto o lista) → al final, si hay productos elegidos, conectá con 1 producto → cta.',
  promo: 'PROMO: comunicá la promo vigente con urgencia real (fecha límite). Portada con la oferta → productos con precio promo → cómo aprovecharla → cta.',
  libre: 'LIBRE: seguí la idea del dueño al pie de la letra, eligiendo los tipos de slide que mejor la cuenten.',
};

const FORMATOS = {
  carrusel: 'CARRUSEL de Instagram (1080x1350): entre 6 y 9 slides. El primero SIEMPRE "portada" y el último SIEMPRE "cta".',
  post: 'POST ÚNICO de Instagram (1080x1350): exactamente 1 slide, tipo "portada" (o "producto" si es un solo producto con precio).',
  historias: 'HISTORIAS de Instagram (1080x1920): entre 3 y 5 historias que se ven en secuencia. Primera "portada" con gancho, última "cta".',
};

const ESQUEMA_SLIDE = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tipo: { type: 'string', enum: TIPOS },
    kicker: { type: 'string' },
    titular: { type: 'array', items: { type: 'string' } },
    destacada: { type: 'integer' },
    cuerpo: { type: 'string' },
    items: { type: 'array', items: { type: 'string' } },
    items_b: { type: 'array', items: { type: 'string' } },
    producto_id: { type: 'integer' },
    producto_id_b: { type: 'integer' },
  },
  required: ['tipo', 'kicker', 'titular', 'destacada', 'cuerpo', 'items', 'items_b', 'producto_id', 'producto_id_b'],
};

const VOZ = `Sos el director creativo de ${negocio.nombre} (${negocio.instagram}), tienda de tecnología de ${negocio.ciudad}: smartwatches, auriculares, cargadores, cables, fundas y accesorios.
Voz de marca: español rioplatense, directo, cercano, con energía pero sin exagerar. Frases cortas. Cero relleno. Nada de "¡Hola a todos!".
Reglas: nunca inventes especificaciones técnicas, precios, stock ni promos que no estén en los datos. Los precios los pone el sistema, no los escribas en los slides.
Datos del negocio: ${negocio.envios}. ${negocio.garantia}. ${negocio.mediosDePago}. WhatsApp ${negocio.whatsapp}.`;

const lineaProducto = (p, promo) =>
  `id ${p.id} | ${p.nombre} | ${p.categoria || 'Otro'} | ${fmt(p.precio)}${promo?.descuento ? ` (con promo ${fmt(precioPromo(p.precio, promo))})` : ''} | stock ${p.stock}${p.descripcion ? ` | ${String(p.descripcion).slice(0, 160)}` : ''}`;

async function escribirGuion({ formato, plantilla, tema, elegidos, promo }) {
  const prompt = `Formato: ${FORMATOS[formato]}
Plantilla: ${PLANTILLAS[plantilla] || PLANTILLAS.libre}
Idea del dueño: ${tema || 'ninguna, decidí vos el mejor ángulo para vender'}
Promo vigente: ${promo ? `${promo.descuento ? promo.descuento + '% OFF en todo' : 'regalo'} hasta el ${fechaCorta(promo.hasta)}` : 'NO hay promo, no menciones descuentos'}
Productos elegidos (usá SOLO estos ids en producto_id):
${elegidos.length ? elegidos.map((p) => lineaProducto(p, promo)).join('\n') : 'ninguno (contenido sin producto: producto_id = 0)'}

Tipos de slide:
- portada: gancho. titular 2-4 líneas cortas (máx 11 caracteres por línea), cuerpo = bajada de 1 línea.
- texto: titular 1-3 líneas + cuerpo de 1 a 3 oraciones (máx 220 caracteres). Si habla de un producto, poné su producto_id y se muestra la foto.
- lista: titular + items (3 a 5, máx 60 caracteres cada uno).
- producto: producto_id obligatorio. titular = nombre corto del producto en 2-3 líneas (máx 11 caracteres por línea), cuerpo = 1 beneficio clave (máx 70 caracteres). El precio lo pone el sistema.
- comparativa: producto_id y producto_id_b obligatorios. items = 3 puntos fuertes del primero, items_b = 3 del segundo (máx 40 caracteres).
- cta: titular corto (ej ["¿CÓMO", "COMPRO?"] o ["ESCRIBINOS", "YA"]), cuerpo = 1 línea de confianza. Los pasos y el WhatsApp los pone el sistema.
En todos: kicker = rótulo chico de arriba (máx 24 caracteres, ej "Tecno Riv · Río Cuarto", "Tip 1", "Nuevo ingreso"). destacada = índice de la línea del titular que va en celeste. Sin emojis dentro de los slides. Campos que no aplican: "" , [] o 0.

Además:
- titulo: nombre interno corto de la pieza (máx 50 caracteres).
- caption: caption para Instagram. Gancho en la primera línea, 3-6 líneas de valor con algún emoji, cierre con llamado a la acción a WhatsApp ${negocio.whatsapp} o DM. Sin hashtags (van aparte).
- hashtags: 8 a 12 hashtags relevantes, mezclando locales (#RioCuarto #Cordoba) y de producto. Sin el "#".`;

  const r = await generarEstructurado(VOZ, prompt, {
    type: 'object',
    properties: {
      titulo: { type: 'string' },
      slides: { type: 'array', items: ESQUEMA_SLIDE },
      caption: { type: 'string' },
      hashtags: { type: 'array', items: { type: 'string' } },
    },
    required: ['titulo', 'slides', 'caption', 'hashtags'],
  });
  const tags = (r.hashtags || []).map((h) => '#' + String(h).replace(/^#/, '').replace(/\s+/g, '')).filter((h) => h.length > 1);
  return {
    titulo: r.titulo,
    caption: [r.caption.trim(), tags.join(' ')].filter(Boolean).join('\n\n'),
    slides: normalizarSlides(r.slides, formato, elegidos),
  };
}

// Corrige lo que no cierra: ids inexistentes, cantidad de slides, portada y cta en su lugar.
function normalizarSlides(slides, formato, elegidos) {
  const ids = new Set(elegidos.map((p) => p.id));
  let out = (slides || []).map((s) => ({
    tipo: TIPOS.includes(s.tipo) ? s.tipo : 'texto',
    kicker: s.kicker || '',
    titular: (s.titular || []).filter(Boolean).slice(0, 4),
    destacada: Number.isInteger(s.destacada) ? s.destacada : 0,
    cuerpo: s.cuerpo || '',
    items: s.items || [],
    items_b: s.items_b || [],
    producto_id: ids.has(Number(s.producto_id)) ? Number(s.producto_id) : 0,
    producto_id_b: ids.has(Number(s.producto_id_b)) ? Number(s.producto_id_b) : 0,
  }));
  for (const s of out) {
    if (s.tipo === 'producto' && !s.producto_id) s.tipo = 'texto';
    if (s.tipo === 'comparativa' && (!s.producto_id || !s.producto_id_b)) s.tipo = 'lista';
  }
  out = out.slice(0, MAX_SLIDES[formato] || 10);
  if (!out.length) out = [{ tipo: 'portada', kicker: '', titular: ['TECNO', 'RIV'], destacada: 1, cuerpo: '', items: [], items_b: [], producto_id: elegidos[0]?.id || 0, producto_id_b: 0 }];
  return out;
}

// ───────── armado ─────────

// Dibuja todas las imágenes de un guion. Devuelve [Buffer jpg].
async function dibujarGuion({ formato, slides, productos, promo }) {
  const H = ALTO[formato] || 1350;
  const usados = [...new Set(slides.flatMap((s) => [s.producto_id, s.producto_id_b]).filter(Boolean))];
  const conFoto = productos.filter((p) => usados.includes(p.id) && p.imagen_url);
  const fotos = new Map();
  await Promise.all(conFoto.map(async (p) => {
    try { fotos.set(p.id, await bajarFoto(p.imagen_url)); } catch (e) { console.error(`No se pudo bajar la foto de ${p.nombre}:`, e.message); }
  }));
  const primera = usados.find((id) => fotos.has(id));
  const ctx = {
    formato, promo, total: slides.length,
    producto: (id) => productos.find((p) => p.id === Number(id)) || null,
    fotoDe: (id) => (id ? fotos.get(Number(id)) || null : null),
    fotoPrincipal: primera ? fotos.get(primera) : null,
  };
  const imagenes = [];
  for (let i = 0; i < slides.length; i++) {
    ctx.n = i + 1;
    imagenes.push(await (DIBUJAR[slides[i].tipo] || slideTexto)(slides[i], H, ctx));
  }
  return imagenes;
}

const aDataUrl = (buf) => 'data:image/jpeg;base64,' + buf.toString('base64');
const miniatura = async (buf) => aDataUrl(await sharp(buf).resize(300).jpeg({ quality: 70 }).toBuffer());

// Pieza de Instagram completa: textos + imágenes.
async function crearPiezaInstagram({ formato, plantilla, tema, elegidos, productos, promo }) {
  const guion = await escribirGuion({ formato, plantilla, tema, elegidos, promo });
  const imagenes = await dibujarGuion({ formato, slides: guion.slides, productos, promo });
  return { ...guion, imagenes };
}

// Publicación de Marketplace con la foto del producto (misma imagen que /gestion).
async function crearPiezaMarketplace({ producto: p, promo, detalles }) {
  if (!p.imagen_url) throw new Error(`${p.nombre} no tiene foto cargada. Agregale la URL de la foto en /gestion → Stock.`);
  const { crearPublicacion } = require('./publicacion');
  const lista = Number(p.precio);
  const conPromo = promo?.descuento ? precioPromo(lista, promo) : lista;
  const textoPromo = promo?.descuento ? `PROMO: ${promo.descuento}% OFF hasta el ${fechaCorta(promo.hasta)}. Mencioná la promo y su fecha límite (es real).` : '';
  const pub = await crearPublicacion({
    foto: await bajarFoto(p.imagen_url),
    nombre: p.nombre,
    precio: conPromo,
    precioAnterior: conPromo < lista ? lista : null,
    cuotas: Number(p.cuotas_sin_interes) || 0,
    detalles: [p.descripcion, detalles, textoPromo].filter(Boolean).join('. '),
  });
  return { titulo: `Marketplace · ${p.nombre}`, titulo_mkp: pub.titulo, caption: pub.descripcion, imagenes: [pub.imagen] };
}

// ───────── plan de la semana ─────────

async function planSemanal({ productos, promo, publicadas, desde }) {
  const disponibles = productos.filter((p) => p.activo !== false && p.stock > 0);
  const prompt = `Armá el plan de contenido de Instagram de los próximos 7 días empezando el ${desde} (fecha en formato AAAA-MM-DD, día 1 = ${desde}).
Objetivo: vender más y construir marca local. Mezclá formatos (carruseles que se guardan y comparten, posts de producto, historias para empujar ventas) y plantillas.
Priorizá productos con más stock y buen precio, y rotá categorías. Una idea por día.
Promo vigente: ${promo ? `${promo.descuento}% OFF hasta el ${fechaCorta(promo.hasta)}` : 'ninguna'}
Lo último que se publicó (no repitas lo mismo): ${publicadas.length ? publicadas.join(' · ') : 'nada todavía'}
Catálogo con stock:
${disponibles.map((p) => lineaProducto(p, promo)).join('\n')}

Para cada idea: fecha (AAAA-MM-DD), hora (HH:MM, horarios con más actividad en Argentina: 12:30 a 14:00 o 19:30 a 22:00), formato (carrusel | post | historias), plantilla (producto | coleccion | comparativa | tips | promo | libre — "promo" solo si hay promo vigente), tema (la idea concreta en 1 oración, lista para usar como consigna), producto_ids (0 a 4 ids del catálogo), objetivo (1 frase: por qué esta pieza).`;
  const r = await generarEstructurado(VOZ, prompt, {
    type: 'object',
    properties: {
      ideas: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            fecha: { type: 'string' },
            hora: { type: 'string' },
            formato: { type: 'string', enum: ['carrusel', 'post', 'historias'] },
            plantilla: { type: 'string', enum: Object.keys(PLANTILLAS) },
            tema: { type: 'string' },
            producto_ids: { type: 'array', items: { type: 'integer' } },
            objetivo: { type: 'string' },
          },
          required: ['fecha', 'hora', 'formato', 'plantilla', 'tema', 'producto_ids', 'objetivo'],
        },
      },
    },
    required: ['ideas'],
  });
  const ids = new Set(disponibles.map((p) => p.id));
  return (r.ideas || []).slice(0, 7).map((i) => ({
    ...i,
    plantilla: i.plantilla === 'promo' && !promo ? 'producto' : i.plantilla,
    producto_ids: (i.producto_ids || []).filter((id) => ids.has(id)).slice(0, 4),
  }));
}

module.exports = { crearPiezaInstagram, crearPiezaMarketplace, dibujarGuion, normalizarSlides, planSemanal, aDataUrl, miniatura, PLANTILLAS, MAX_SLIDES };
