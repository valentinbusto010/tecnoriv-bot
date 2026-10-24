// Genera los íconos de la app (public/app/*.png). Correr: node gestion/iconos.js
const path = require('path');
const sharp = require('sharp');
const opentype = require('opentype.js');

const fuente = opentype.loadSync(path.join(require.resolve('@fontsource/archivo-black/package.json'), '..', 'files', 'archivo-black-latin-400-normal.woff'));

// maskable: el logo ocupa el 60% central para que Android lo recorte bien en círculo.
function svg(tam, { maskable = false } = {}) {
  const radio = maskable ? 0 : tam * 0.22;
  const alto = tam * (maskable ? 0.3 : 0.42);
  const p = fuente.getPath('TR', 0, 0, alto);
  const b = p.getBoundingBox();
  const x = (tam - (b.x2 - b.x1)) / 2 - b.x1;
  const y = (tam - (b.y2 - b.y1)) / 2 - b.y1;
  const letras = fuente.getPath('TR', x, y, alto).toPathData(2);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a7bff"/><stop offset="1" stop-color="#0047c2"/></linearGradient></defs>
  <rect width="${tam}" height="${tam}" rx="${radio}" fill="url(#g)"/>
  <path d="${letras}" fill="#fff"/>
  <rect x="${tam * 0.3}" y="${tam * (maskable ? 0.66 : 0.74)}" width="${tam * 0.4}" height="${tam * 0.035}" rx="${tam * 0.017}" fill="#00E0FF"/>
</svg>`);
}

(async () => {
  const salida = path.join(__dirname, '..', 'public', 'app');
  const hacer = (nombre, tam, op) => sharp(svg(tam, op)).png().toFile(path.join(salida, nombre));
  await hacer('icono-192.png', 192);
  await hacer('icono-512.png', 512);
  await hacer('icono-maskable-512.png', 512, { maskable: true });
  await hacer('apple-touch-icon.png', 180, { maskable: true }); // iOS redondea solo
  await hacer('favicon-32.png', 32);
  console.log('Íconos listos en public/app');
})();
