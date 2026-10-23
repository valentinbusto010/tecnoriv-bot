require('dotenv').config();
const path = require('path');
const express = require('express');
const axios = require('axios');
const multer = require('multer');
const { responderCliente } = require('./src/vendedor');
const { crearPublicacion } = require('./src/publicacion');
const { estadoCatalogo, obtenerHistorial, guardarMensaje, guardarPedido } = require('./src/datos');

const app = express();
app.use(express.json());
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const { WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN, OWNER_PHONE, PANEL_PASSWORD } = process.env;

// ================= WhatsApp =================

async function enviarWhatsApp(to, body) {
  await axios.post(
    `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
    { messaging_product: 'whatsapp', to, type: 'text', text: { body } },
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

app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // respondemos a Meta al instante, después procesamos

  try {
    if (req.body.object !== 'whatsapp_business_account') return;
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message || message.type !== 'text' || procesados.has(message.id)) return;
    procesados.add(message.id);
    if (procesados.size > 1000) procesados.clear();

    const from = message.from;
    const text = message.text.body.trim();
    console.log(`Mensaje de ${from}: ${text}`);

    const historial = await obtenerHistorial(from);
    await guardarMensaje(from, 'user', text);
    const { texto, venta } = await responderCliente([...historial, { role: 'user', content: text }]);

    await enviarWhatsApp(from, texto);
    await guardarMensaje(from, 'assistant', texto);
    console.log(`Respuesta enviada a ${from}`);

    if (venta) {
      console.log(`VENTA CERRADA con ${from}: ${venta}`);
      await guardarPedido(from, venta);
      if (OWNER_PHONE) {
        await enviarWhatsApp(OWNER_PHONE, `🛒 NUEVA VENTA\nCliente: +${from}\n${venta}`).catch((e) =>
          console.error('No se pudo avisar al dueño:', e.response?.data?.error?.message || e.message)
        );
      }
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

app.get('/', (req, res) => res.send('TecnoRiv Bot activo! Panel en /panel'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
