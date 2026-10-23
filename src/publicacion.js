const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');
const negocio = require('./negocio');
const { generarEstructurado } = require('./claude');
const { formatearPrecio } = require('./vendedor');

// Fuentes incluidas en el proyecto: el texto se dibuja igual en cualquier servidor.
function cargarFuente(paquete, archivo) {
  return opentype.loadSync(path.join(require.resolve(`${paquete}/package.json`), '..', 'files', archivo));
}
const fuenteTitular = cargarFuente('@fontsource/archivo-black', 'archivo-black-latin-400-normal.woff');
const fuenteBold = cargarFuente('@fontsource/montserrat', 'montserrat-latin-800-normal.woff');
const fuenteMedia = cargarFuente('@fontsource/montserrat', 'montserrat-latin-600-normal.woff');

// Mismo estilo que los posts de @tecno_riv: foto real de fondo, titular blanco enorme con una línea en celeste.
const COLORES = {
  acento: '#1EB6FF',
  rojo: '#E5262B',
  blanco: '#FFFFFF',
  gris: '#C9CED8',
};

const LADO = 1080;
const MARGEN = 64;

// ---------- 1) Textos con IA ----------

async function generarTextos({ nombre, precio, precioAnterior, cuotas, detalles }) {
  const system = `Sos copywriter experto en Facebook Marketplace Argentina para ${negocio.nombre}, tienda de tecnología de ${negocio.ciudad}.
Escribís en español rioplatense, claro y vendedor. Nada de mentiras ni promesas que no estén en los datos.`;

  const prompt = `Producto: ${nombre}
Precio: ${formatearPrecio(precio)}${precioAnterior ? ` (antes ${formatearPrecio(precioAnterior)})` : ''}
Cuotas sin interés: ${cuotas > 0 ? cuotas + ' cuotas sin interés' : 'NO tiene, no menciones cuotas sin interés'}
Detalles que me pasó el dueño: ${detalles || 'ninguno'}
Datos del negocio: ${negocio.mediosDePago}. ${negocio.envios}. ${negocio.garantia}.
${negocio.whatsapp ? 'WhatsApp: ' + negocio.whatsapp : ''}

Generá:
- titulo: para Marketplace, máximo 70 caracteres. Producto + 1 gancho (ej: "Nuevo", "Original", "Con garantía"). Que se encuentre buscando.
- descripcion: 600 a 900 caracteres. Estructura: 1 línea gancho, 4 a 6 bullets con "✅" de características y beneficios, bloque de confianza (garantía, ${negocio.ciudad}, envíos, pagos), y cierre con llamado a la acción para escribir YA (stock limitado solo si el dueño lo dijo). Usá saltos de línea.
- etiqueta: rótulo chico arriba de la imagen, máximo 18 caracteres, en mayúsculas (ej: "NUEVO INGRESO", "ÚLTIMAS UNIDADES", "OFERTA").
- urgente: true solo si la etiqueta habla de últimas unidades u oferta por tiempo limitado (y el dueño lo dijo).
- titular_lineas: titular para la imagen en 2 o 3 líneas cortas, MÁXIMO 10 caracteres por línea, en mayúsculas, sin emojis. Estilo directo y con gancho (ej: ["CARGÁ", "TU", "IPHONE"], ["EL REGALO", "QUE", "PIDE."], ["¿CUÁL", "SMART-", "WATCH?"]).
- linea_destacada: índice (0, 1 o 2) de la línea que va en color, la palabra más importante.
- bajada: frase corta debajo del titular, máximo 60 caracteres, con datos separados por " · " (ej: "Original · Envío gratis en Río Cuarto · 30 días de garantía").`;

  return generarEstructurado(system, prompt, {
    type: 'object',
    properties: {
      titulo: { type: 'string' },
      descripcion: { type: 'string' },
      etiqueta: { type: 'string' },
      urgente: { type: 'boolean' },
      titular_lineas: { type: 'array', items: { type: 'string' } },
      linea_destacada: { type: 'integer' },
      bajada: { type: 'string' },
    },
    required: ['titulo', 'descripcion', 'etiqueta', 'urgente', 'titular_lineas', 'linea_destacada', 'bajada'],
  });
}

// ---------- 2) Imagen ----------

// Convierte texto en un trazo SVG, achicando la letra hasta que entre en el ancho.
// "espaciado" separa las letras (para los rótulos chicos en mayúscula).
function texto(fuente, contenido, { x, y, tam, anchoMax, color, alinear = 'izq', espaciado = 0 }) {
  const medir = (t) => fuente.getAdvanceWidth(contenido, t) + espaciado * t * Math.max(contenido.length - 1, 0);
  let t = tam;
  while (t > 10 && medir(t) > anchoMax) t -= 2;
  const ancho = medir(t);
  let cursor = alinear === 'centro' ? x - ancho / 2 : alinear === 'der' ? x - ancho : x;
  let d = '';
  if (!espaciado) {
    d = fuente.getPath(contenido, cursor, y, t).toPathData(2);
  } else {
    for (const letra of contenido) {
      d += fuente.getPath(letra, cursor, y, t).toPathData(2);
      cursor += fuente.getAdvanceWidth(letra, t) + espaciado * t;
    }
  }
  return { svg: `<path d="${d}" fill="${color}"/>`, ancho, tam: t };
}

async function generarImagen({ foto, precio, precioAnterior, cuotas, etiqueta, urgente, titular, destacada, bajada }) {
  const capas = [];

  // Rótulo de arriba: rojo si es urgente, si no un punto celeste y texto espaciado
  const rotulo = (etiqueta || 'NUEVO INGRESO').toUpperCase();
  if (urgente) {
    const r = texto(fuenteBold, rotulo, { x: MARGEN + 22, y: MARGEN + 38, tam: 24, anchoMax: 500, color: COLORES.blanco, espaciado: 0.12 });
    capas.unshift(`<rect x="${MARGEN}" y="${MARGEN}" width="${r.ancho + 44}" height="56" rx="6" fill="${COLORES.rojo}"/>`);
    capas.push(r.svg);
  } else {
    capas.push(`<circle cx="${MARGEN + 8}" cy="${MARGEN + 28}" r="8" fill="${COLORES.acento}"/>`);
    capas.push(texto(fuenteBold, rotulo, { x: MARGEN + 30, y: MARGEN + 37, tam: 24, anchoMax: 600, color: COLORES.blanco, espaciado: 0.15 }).svg);
  }

  // Titular gigante, de abajo hacia arriba para que siempre quede pegado a la bajada
  const lineas = titular.slice(0, 3).map((l) => l.toUpperCase());
  let tamTitular = lineas.length === 3 ? 132 : 150;
  for (const l of lineas) {
    while (tamTitular > 60 && fuenteTitular.getAdvanceWidth(l, tamTitular) > LADO - MARGEN * 2) tamTitular -= 4;
  }
  const interlineado = tamTitular * 0.96;
  const baseBajada = 905;
  let y = baseBajada - 56 - interlineado * (lineas.length - 1);
  lineas.forEach((l, i) => {
    const color = i === destacada ? COLORES.acento : COLORES.blanco;
    capas.push(texto(fuenteTitular, l, { x: MARGEN, y, tam: tamTitular, anchoMax: LADO - MARGEN * 2, color }).svg);
    y += interlineado;
  });

  // Bajada
  capas.push(texto(fuenteMedia, bajada, { x: MARGEN, y: baseBajada, tam: 28, anchoMax: LADO - MARGEN * 2, color: COLORES.blanco }).svg);

  // Pie: marca a la izquierda, precio a la derecha
  capas.push(texto(fuenteBold, negocio.nombre.toUpperCase(), { x: MARGEN, y: 1022, tam: 24, anchoMax: 300, color: COLORES.acento, espaciado: 0.15 }).svg);
  const p = texto(fuenteTitular, formatearPrecio(precio), { x: LADO - MARGEN, y: 1030, tam: 64, anchoMax: 520, color: COLORES.blanco, alinear: 'der' });
  capas.push(p.svg);
  let xIzq = LADO - MARGEN - p.ancho - 18;
  if (precioAnterior) {
    const viejo = texto(fuenteMedia, formatearPrecio(precioAnterior), { x: xIzq, y: 1024, tam: 28, anchoMax: 220, color: COLORES.gris, alinear: 'der' });
    capas.push(viejo.svg);
    capas.push(`<line x1="${xIzq - viejo.ancho - 2}" y1="1014" x2="${xIzq + 2}" y2="1014" stroke="${COLORES.gris}" stroke-width="3"/>`);
    xIzq -= viejo.ancho + 18;
  }
  if (cuotas > 0) {
    capas.push(texto(fuenteBold, `${cuotas} CUOTAS SIN INTERÉS`, { x: LADO - MARGEN, y: 958, tam: 22, anchoMax: 520, color: COLORES.acento, alinear: 'der', espaciado: 0.08 }).svg);
  }

  // Oscurecido para que el texto se lea sobre cualquier foto (igual que en los posts)
  const sombra = `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}">
    <defs>
      <linearGradient id="abajo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.25" stop-color="#000" stop-opacity="0"/>
        <stop offset="0.6" stop-color="#000" stop-opacity="0.55"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.92"/>
      </linearGradient>
      <linearGradient id="arriba" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity="0.45"/>
        <stop offset="0.18" stop-color="#000" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#abajo)"/>
    <rect width="100%" height="100%" fill="url(#arriba)"/>
  </svg>`;

  const textos = `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}">${capas.join('')}</svg>`;

  return sharp(foto)
    .rotate() // respeta la orientación de fotos de celular
    .resize(LADO, LADO, { fit: 'cover', position: 'centre' }) // foto a pantalla completa, recortada al centro
    .modulate({ saturation: 1.08 })
    .composite([
      { input: Buffer.from(sombra), left: 0, top: 0 },
      { input: Buffer.from(textos), left: 0, top: 0 },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

// ---------- Todo junto ----------

async function crearPublicacion({ foto, nombre, precio, precioAnterior, cuotas, detalles }) {
  const textos = await generarTextos({ nombre, precio, precioAnterior, cuotas, detalles });
  const imagen = await generarImagen({
    foto,
    precio,
    precioAnterior,
    cuotas,
    etiqueta: textos.etiqueta,
    urgente: textos.urgente,
    titular: textos.titular_lineas,
    destacada: textos.linea_destacada,
    bajada: textos.bajada,
  });
  return { titulo: textos.titulo, descripcion: textos.descripcion, imagen };
}

module.exports = { crearPublicacion, generarImagen };
