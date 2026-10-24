require('dotenv').config();
const path = require('path');
const express = require('express');
const axios = require('axios');
const multer = require('multer');
const { responderCliente } = require('./src/vendedor');
const { crearPublicacion } = require('./src/publicacion');
const { estadoCatalogo, obtenerHistorial, guardarMensaje } = require('./src/datos');
const gestion = require('./src/gestion');

const app = express();
app.use(express.json());
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const { WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN, OWNER_PHONE, PANEL_PASSWORD } = process.env;

// ================= WhatsApp =================

async function enviarWhatsApp(to, body) {
  // Argentina: Meta manda los celulares como 549XXXXXXXXXX, pero para enviar hay que sacar el 9
  to = String(to).replace(/^549/, '54');
  await axios.post(
    `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
    { messaging_product: 'whatsapp', to, type: 'text', text: { body } },
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } }
  );
}

async function enviarImagen(to, link, caption) {
  to = String(to).replace(/^549/, '54');
  await axios.post(
    `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
    { messaging_product: 'whatsapp', to, type: 'image', image: { link, caption } },
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' } }
  );
}

app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    console.log('Webhook verificado correctamente');
    return res.status(200).send(req.query['hub.challenge']);
  }
  res.sendStatus(403);
});

const procesados = new Set(); // evita responder dos veces si Meta reenvía el mismo mensaje

// Descarga una foto que mandó el cliente (Meta da un ID, hay que pedir la URL y después bajarla).
async function descargarMedia(mediaId) {
  const auth = { Authorization: `Bearer ${WHATSAPP_TOKEN}` };
  const { data: info } = await axios.get(`https://graph.facebook.com/v21.0/${mediaId}`, { headers: auth });
  const { data } = await axios.get(info.url, { headers: auth, responseType: 'arraybuffer' });
  return { base64: Buffer.from(data).toString('base64'), mimeType: info.mime_type };
}

const AVISO_AUDIO = 'Por ahora no puedo escuchar audios 🙏 ¿Me lo escribís? Así te respondo al toque.';
const AVISO_OTRO = 'Por ahora solo puedo leer mensajes de texto y fotos. ¿Me escribís tu consulta? 🙌';

async function avisarDueno(texto) {
  if (!OWNER_PHONE) return;
  await enviarWhatsApp(OWNER_PHONE, texto).catch((e) =>
    console.error('No se pudo avisar al dueño:', e.response?.data?.error?.message || e.message)
  );
}

app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // respondemos a Meta al instante, después procesamos

  try {
    if (req.body.object !== 'whatsapp_business_account') return;
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message || procesados.has(message.id)) return;
    procesados.add(message.id);
    if (procesados.size > 1000) procesados.clear();

    const from = message.from;
    const nombrePerfil = req.body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || null;

    // Comandos del dueño (gasto, resumen, ayuda): se responden sin pasar por la IA.
    if (message.type === 'text' && gestion.esDueno(from)) {
      const respuesta = await gestion.comandoDueno(message.text.body).catch((e) => `Error: ${e.message}`);
      if (respuesta) {
        await enviarWhatsApp(from, respuesta);
        return;
      }
    }

    // Todo el que escribe queda como cliente en el sistema de gestión.
    await gestion.registrarContacto(from, nombrePerfil).catch((e) => console.error('Error registrando cliente:', e.message));

    // Audios, stickers, ubicaciones, etc.: respuesta fija, sin gastar IA.
    if (message.type !== 'text' && message.type !== 'image') {
      console.log(`Mensaje de ${from}: [${message.type}]`);
      const aviso = message.type === 'audio' ? AVISO_AUDIO : AVISO_OTRO;
      await enviarWhatsApp(from, aviso);
      await guardarMensaje(from, 'user', `[El cliente mandó un ${message.type}]`);
      await guardarMensaje(from, 'assistant', aviso);
      return;
    }

    let text;
    let imagen = null;
    if (message.type === 'image') {
      const caption = message.image.caption?.trim() || '';
      text = `[El cliente mandó una foto]${caption ? ' ' + caption : ''}`;
      try {
        imagen = await descargarMedia(message.image.id);
      } catch (e) {
        console.error('No se pudo descargar la foto:', e.response?.data?.error?.message || e.message);
      }
    } else {
      text = message.text.body.trim();
    }
    console.log(`Mensaje de ${from}: ${text}`);

    const historial = await obtenerHistorial(from);
    await guardarMensaje(from, 'user', text);
    const { texto, ventas, humano, fotos } = await responderCliente([...historial, { role: 'user', content: text }], imagen);

    for (const foto of fotos) {
      await enviarImagen(from, foto.url, foto.nombre).catch((e) =>
        console.error('No se pudo mandar la foto:', e.response?.data?.error?.message || e.message)
      );
    }
    await enviarWhatsApp(from, texto);
    await guardarMensaje(from, 'assistant', texto);
    console.log(`Respuesta enviada a ${from}`);

    if (ventas.length) {
      // Una marca [VENTA] por producto: si el cliente sumó un complemento, entran los dos.
      const lineas = [];
      let total = 0;
      let ids = [];
      for (const venta of ventas) {
        console.log(`VENTA CERRADA con ${from}: ${venta}`);
        const { pedido, duplicado, venta: v } = await gestion.registrarVenta(from, venta, nombrePerfil);
        if (duplicado) { console.log(`Venta repetida de ${from}, no se cargó de nuevo`); continue; }
        if (pedido) ids.push('#' + pedido.id);
        if (v) {
          total += v.monto;
          lineas.push(`${v.cantidad > 1 ? v.cantidad + 'x ' : ''}${v.productoTexto} · ${gestion.fmt(v.monto)}${v.producto ? '' : ' ⚠️ no está en el catálogo, revisalo'}`);
          if (!lineas.datos) lineas.datos = `${v.nombre || ''}${v.entrega ? ' · ' + v.entrega : ''}${v.pago ? ' · ' + v.pago : ''}`;
        } else lineas.push(venta);
      }
      if (lineas.length) {
        const extra = lineas.length > 1 ? `\nTotal: ${gestion.fmt(total)} (sumó complemento 🙌)` : '';
        await avisarDueno(`🛒 NUEVA VENTA ${ids.join(' ')}\nCliente: +${from}\n${lineas.join('\n')}${extra}\n${lineas.datos || ''}\nYa está en /gestion como pendiente.`);
      }
    }
    if (humano) {
      console.log(`DERIVADO A HUMANO ${from}: ${humano}`);
      await avisarDueno(`🙋 UN CLIENTE NECESITA ATENCIÓN\nCliente: +${from}\nMotivo: ${humano}\nÚltimo mensaje: ${text}`);
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
});

// ================= Panel (Marketplace) =================

// "25.999" o "$25,999" -> 25999 (en Argentina el punto es separador de miles)
function aNumero(valor) {
  return Number(String(valor || '').replace(/\D/g, '')) || 0;
}

// Traduce los errores comunes a algo que se entienda desde el panel.
function explicarError(error) {
  const status = error.response?.status;
  const mensaje = error.response?.data?.error?.message || error.message || '';
  if (error.config?.url?.includes('anthropic.com')) {
    if (status === 401) return 'La clave de Claude (CLAUDE_API_KEY) es incorrecta. Revisala en Render.';
    if (/credit balance/i.test(mensaje)) return 'Tu cuenta de Claude no tiene saldo. Cargá crédito en console.anthropic.com → Billing.';
    if (status === 429) return 'Claude está saturado o llegaste al límite. Probá de nuevo en un minuto.';
    return `Error de Claude: ${mensaje}`;
  }
  if (/unsupported image format|Input buffer/i.test(mensaje)) {
    return 'No se pudo leer la foto. Probá con otra en formato JPG o PNG.';
  }
  return `Error: ${mensaje}`;
}

function chequearClave(req, res, next) {
  if (!PANEL_PASSWORD) {
    return res.status(503).json({ error: 'Falta configurar PANEL_PASSWORD en el hosting' });
  }
  if (req.get('x-panel-key') !== PANEL_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  next();
}

app.get('/panel', (req, res) => res.sendFile(path.join(__dirname, 'public', 'panel.html')));

// Sistema de gestión: clientes, ventas, pedidos, stock y gastos (misma base que el bot)
app.get('/gestion', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gestion.html')));
app.get('/gestion.js', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gestion.js')));
// App instalable: el service worker no se cachea para que siempre tome la última versión.
app.get('/gestion-sw.js', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'gestion-sw.js'));
});
app.use('/app', express.static(path.join(__dirname, 'public', 'app'), { maxAge: '7d' }));
app.use('/api/gestion', gestion.router(chequearClave, explicarError));

app.get('/api/estado', chequearClave, async (req, res) => res.json(await estadoCatalogo()));

// Crea imagen + título + descripción para publicar en Marketplace
app.post('/api/publicacion', chequearClave, subida.single('foto'), async (req, res) => {
  try {
    const { nombre, precio, precioAnterior, cuotas, detalles } = req.body;
    if (!req.file || !nombre || !aNumero(precio)) {
      return res.status(400).json({ error: 'Faltan la foto, el nombre o el precio' });
    }
    const pub = await crearPublicacion({
      foto: req.file.buffer,
      nombre,
      precio: aNumero(precio),
      precioAnterior: aNumero(precioAnterior) || null,
      cuotas: aNumero(cuotas),
      detalles,
    });
    res.json({
      titulo: pub.titulo,
      descripcion: pub.descripcion,
      imagen: 'data:image/jpeg;base64,' + pub.imagen.toString('base64'),
    });
  } catch (error) {
    console.error('Error creando publicación:', error.response?.data || error.message);
    res.status(500).json({ error: explicarError(error) });
  }
});

// Sugiere la respuesta para una consulta que llegó por Marketplace
app.post('/api/responder', chequearClave, async (req, res) => {
  try {
    const { conversacion } = req.body; // [{role, content}]
    if (!Array.isArray(conversacion) || !conversacion.length) {
      return res.status(400).json({ error: 'Pegá el mensaje del cliente' });
    }
    const { texto, venta } = await responderCliente(conversacion);
    res.json({ texto, venta });
  } catch (error) {
    console.error('Error respondiendo:', error.response?.data || error.message);
    res.status(500).json({ error: explicarError(error) });
  }
});

app.get('/privacidad', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacidad.html')));
app.get('/eliminar-datos', (req, res) => res.sendFile(path.join(__dirname, 'public', 'eliminar-datos.html')));

app.get('/', (req, res) => res.send('TecnoRiv Bot activo! Panel en /panel · Gestión en /gestion'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
