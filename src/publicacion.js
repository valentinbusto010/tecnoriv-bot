const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');
const negocio = require('./negocio');
const { generarEstructurado } = require('./claude');
const { formatearPrecio } = require('./vendedor');

// Fuentes incluidas en el proyecto: el texto se dibuja igual en cualquier servidor.
const carpetaFuentes = path.join(require.resolve('@fontsource/montserrat/package.json'), '..', 'files');
const fuenteBold = opentype.loadSync(path.join(carpetaFuentes, 'montserrat-latin-800-normal.woff'));
const fuenteMedia = opentype.loadSync(path.join(carpetaFuentes, 'montserrat-latin-600-normal.woff'));

const COLORES = {
  fondoArriba: '#0B1020',
  fondoAbajo: '#1B2550',
  acento: '#00E0FF',
  blanco: '#FFFFFF',
  gris: '#A9B4D0',
};

const LADO = 1080;

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
- frase_imagen: gancho corto para la imagen, máximo 26 caracteres, sin emojis (ej: "Tu música sin cables").
- beneficios: exactamente 3 beneficios para la imagen, máximo 18 caracteres cada uno, sin emojis (ej: "Batería 30 hs").`;

  return generarEstructurado(system, prompt, 'publicacion', {
    type: 'object',
    properties: {
      titulo: { type: 'string' },
      descripcion: { type: 'string' },
      frase_imagen: { type: 'string' },
      beneficios: { type: 'array', items: { type: 'string' } },
    },
    required: ['titulo', 'descripcion', 'frase_imagen', 'beneficios'],
  });
}

// ---------- 2) Imagen ----------

// Convierte texto en un trazo SVG, achicando la letra hasta que entre en el ancho.
function texto(fuente, contenido, { x, y, tam, anchoMax, color, alinear = 'izq' }) {
  let t = tam;
  while (t > 10 && fuente.getAdvanceWidth(contenido, t) > anchoMax) t -= 2;
  const ancho = fuente.getAdvanceWidth(contenido, t);
  const xFinal = alinear === 'centro' ? x - ancho / 2 : alinear === 'der' ? x - ancho : x;
  const d = fuente.getPath(contenido, xFinal, y, t).toPathData(2);
  return { svg: `<path d="${d}" fill="${color}"/>`, ancho };
}

async function generarImagen({ foto, precio, precioAnterior, frase, beneficios }) {
  const capas = [];

  // Encabezado
  capas.push(texto(fuenteBold, negocio.nombre.toUpperCase(), { x: 70, y: 105, tam: 46, anchoMax: 500, color: COLORES.blanco }).svg);
  capas.push(texto(fuenteMedia, negocio.instagram, { x: LADO - 70, y: 100, tam: 30, anchoMax: 400, color: COLORES.acento, alinear: 'der' }).svg);

  // Frase gancho
  capas.push(texto(fuenteBold, frase.toUpperCase(), { x: LADO / 2, y: 200, tam: 62, anchoMax: LADO - 140, color: COLORES.blanco, alinear: 'centro' }).svg);

  // Beneficios (3 pastillas)
  const anchoPastilla = 300;
  const separacion = 20;
  const inicio = (LADO - (anchoPastilla * 3 + separacion * 2)) / 2;
  beneficios.slice(0, 3).forEach((b, i) => {
    const x = inicio + i * (anchoPastilla + separacion);
    capas.push(`<rect x="${x}" y="808" width="${anchoPastilla}" height="64" rx="32" fill="none" stroke="${COLORES.acento}" stroke-width="3"/>`);
    capas.push(texto(fuenteMedia, b, { x: x + anchoPastilla / 2, y: 850, tam: 26, anchoMax: anchoPastilla - 40, color: COLORES.blanco, alinear: 'centro' }).svg);
  });

  // Precio
  const p = texto(fuenteBold, formatearPrecio(precio), { x: 70, y: 1010, tam: 96, anchoMax: 620, color: COLORES.acento });
  capas.push(p.svg);
  if (precioAnterior) {
    const viejo = texto(fuenteMedia, formatearPrecio(precioAnterior), { x: 90 + p.ancho, y: 1005, tam: 38, anchoMax: 260, color: COLORES.gris });
    capas.push(viejo.svg);
    capas.push(`<line x1="${88 + p.ancho}" y1="992" x2="${92 + p.ancho + viejo.ancho}" y2="992" stroke="${COLORES.gris}" stroke-width="4"/>`);
  }
  capas.push(texto(fuenteMedia, '¡Escribinos ya!', { x: LADO - 70, y: 1000, tam: 34, anchoMax: 330, color: COLORES.blanco, alinear: 'der' }).svg);

  const fondo = `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${COLORES.fondoArriba}"/><stop offset="1" stop-color="${COLORES.fondoAbajo}"/>
      </linearGradient>
      <radialGradient id="brillo" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${COLORES.acento}" stop-opacity="0.35"/><stop offset="1" stop-color="${COLORES.acento}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${LADO / 2}" cy="510" r="430" fill="url(#brillo)"/>
    <rect x="150" y="240" width="780" height="540" rx="40" fill="#FFFFFF"/>
  </svg>`;

  const textos = `<svg xmlns="http://www.w3.org/2000/svg" width="${LADO}" height="${LADO}">${capas.join('')}</svg>`;

  const producto = await sharp(foto)
    .rotate() // respeta la orientación de fotos de celular
    .resize(720, 480, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: '#FFFFFF' })
    .toBuffer();

  return sharp(Buffer.from(fondo))
    .composite([
      { input: producto, left: 180, top: 270 },
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
    frase: textos.frase_imagen,
    beneficios: textos.beneficios,
  });
  return { titulo: textos.titulo, descripcion: textos.descripcion, imagen };
}

module.exports = { crearPublicacion, generarImagen };
