require('dotenv').config();
const path = require('path');
const express = require('express');
const axios = require('axios');
const multer = require('multer');
const { responderCliente } = require('./src/vendedor');
const { crearPublicacion } = require('./src/publicacion');
const { estadoCatalogo, obtenerHistorial, guardarMensaje } = require('./src/datos');
const gestion = require('./src/gestion');
const contenido = require('./src/contenido');
const catalogo = require('./src/catalogo');

const app = express();
app.use(express.json({ limit: '2mb' })); // 2 MB: alcanza para subir el logo de la marca
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const { WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN, OWNER_PHONE, PANEL_PASSWORD } = process.env;

// ================= WhatsApp =================

// Envío por WhatsApp (src/whatsapp.js). Texto libre: solo dentro de las 24 h desde el último mensaje de la persona.
const wa = require('./src/whatsapp');
const postventa = require('./src/postventa');
const enviarWhatsApp = (to, body) => wa.enviarTexto(to, body);
const enviarImagen = (to, link, caption) => wa.enviarImagen(to, link, caption);

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

// Texto libre si el dueño escribió en las últimas 23 h; si no, plantilla tr_aviso (ver src/postventa.js).
async function avisarDueno(texto) {
  const r = await postventa.avisarDueno(texto).catch((e) => ({ ok: false, error: e.message }));
  if (!r.ok) console.error('No se pudo avisar al dueño:', r.error);
}

app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // respondemos a Meta al instante, después procesamos

  try {
    if (req.body.object !== 'whatsapp_business_account') return;
    // Estados de mensajes enviados: si una plantilla o un aviso falla, queda registrado en /gestion.
    for (const st of req.body.entry?.[0]?.changes?.[0]?.value?.statuses || []) {
      await postventa.registrarEstado(st).catch(() => {});
    }
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message || procesados.has(message.id)) return;
    procesados.add(message.id);
    if (procesados.size > 1000) procesados.clear();

    const from = message.from;
    const nombrePerfil = req.body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || null;

    // Comandos del dueño (gasto, resumen, ayuda): se responden sin pasar por la IA.
    if (gestion.esDueno(from)) postventa.duenoEscribio(); // abre la ventana de 24 h para el resumen completo
    if (message.type === 'text' && gestion.esDueno(from)) {
      const respuesta = await gestion.comandoDueno(message.text.body).catch((e) => `Error: ${e.message}`);
      if (respuesta) {
        await enviarWhatsApp(from, respuesta);
        return;
      }
    }

    // Todo el que escribe queda como cliente en el sistema de gestión.
    await gestion.registrarContacto(from, nombrePerfil).catch((e) => console.error('Error registrando cliente:', e.message));

    // "BAJA": deja de recibir ofertas automáticas.
    if (message.type === 'text') {
      const baja = await postventa.procesarBaja(from, message.text.body).catch(() => null);
      if (baja) {
        await enviarWhatsApp(from, baja);
        await guardarMensaje(from, 'user', message.text.body);
        await guardarMensaje(from, 'assistant', baja);
        return;
      }
    }

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
    const conocido = await gestion.origenDe(from).catch(() => null);
    const extra = (await postventa.contextoCliente(from).catch(() => '')) +
      (conocido ? `\nCÓMO NOS CONOCIÓ: ya lo sabemos (${conocido}), no lo preguntes.` : '');
    const { texto, ventas, humano, fotos, origen } = await responderCliente([...historial, { role: 'user', content: text }], imagen, extra);

    const enviadas = [];
    for (const foto of fotos) {
      await enviarImagen(from, foto.url, foto.nombre).then(
        () => enviadas.push(foto.nombre),
        (e) => console.error('No se pudo mandar la foto:', e.response?.data?.error?.message || e.message)
      );
    }
    await enviarWhatsApp(from, texto);
    // Nota interna en el historial (el cliente no la ve) para que el bot no repita las fotos.
    await guardarMensaje(from, 'assistant', texto + (enviadas.length ? `\n[Fotos ya enviadas: ${enviadas.join(', ')}]` : ''));
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
          lineas.push(`${v.cantidad > 1 ? v.cantidad + 'x ' : ''}${v.productoTexto} · ${v.regalo ? '🎁 regalo promo' : gestion.fmt(v.monto)}${v.producto ? '' : ' ⚠️ no está en el catálogo, revisalo'}`);
          if (!lineas.datos) lineas.datos = `${v.nombre || ''}${v.entrega ? ' · ' + v.entrega : ''}${v.pago ? ' · ' + v.pago : ''}`;
        } else lineas.push(venta);
      }
      if (lineas.length) {
        const extra = lineas.length > 1 ? `\nTotal: ${gestion.fmt(total)}` : '';
        await avisarDueno(`🛒 NUEVA VENTA ${ids.join(' ')}\nCliente: +${from}\n${lineas.join('\n')}${extra}\n${lineas.datos || ''}\nYa está en /gestion como pendiente.`);
      }
    }
    if (humano) {
      console.log(`DERIVADO A HUMANO ${from}: ${humano}`);
      await avisarDueno(`🙋 UN CLIENTE NECESITA ATENCIÓN\nCliente: +${from}\nMotivo: ${humano}\nÚltimo mensaje: ${text}`);
    }
    if (origen && !conocido) {
      const o = await gestion.guardarOrigen(from, origen, nombrePerfil).catch((e) => console.error('Error guardando origen:', e.message));
      if (o) console.log(`${from} nos conoció por: ${o}`);
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

// Catálogo público para clientes (sin contraseña): productos y precios en vivo
app.get('/catalogo', (req, res) => res.sendFile(path.join(__dirname, 'public', 'catalogo.html')));
app.get('/catalogo.js', (req, res) => res.sendFile(path.join(__dirname, 'public', 'catalogo.js')));
app.get('/api/catalogo', catalogo.api);

// Estudio de contenido: carruseles, posts, historias y Marketplace (app aparte, misma contraseña)
app.get('/contenido', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contenido.html')));
app.get('/contenido.js', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contenido.js')));
app.get('/contenido-sw.js', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'contenido-sw.js'));
});
app.get('/contenido/img/:clave.jpg', contenido.imagenPublica);
app.get('/marca/logo', contenido.logoPublico);
app.use('/api/contenido', contenido.router(chequearClave, explicarError));
// Asistente IA (chat con datos reales + acciones con confirmación), compartido por /gestion y /contenido
// Automatizaciones: postventa por WhatsApp y resumen diario
app.use('/api/auto', postventa.router(chequearClave, explicarError));
app.use('/api/asistente', require('./src/asistente').router(chequearClave, explicarError));

app.get('/api/estado', chequearClave, async (req, res) => res.json(await estadoCatalogo()));

// Crea las plantillas de WhatsApp que faltan y muestra el estado de todas
app.post('/api/whatsapp/plantillas', chequearClave, async (req, res) => {
  const wabaId = String(req.body.wabaId || '').replace(/\D/g, '');
  if (!wabaId) return res.status(400).json({ error: 'Falta el ID de la cuenta de WhatsApp.' });
  try {
    res.json({ plantillas: await wa.crearPlantillas(wabaId) });
  } catch (error) {
    console.error('Error con las plantillas:', error.response?.data || error.message);
    res.status(500).json({ error: wa.explicarErrorWA(error) });
  }
});

// Activa el número de WhatsApp del bot (registro con PIN + suscripción de la app a la cuenta)
app.post('/api/whatsapp/activar', chequearClave, async (req, res) => {
  const pin = String(req.body.pin || '').trim();
  const wabaId = String(req.body.wabaId || '').replace(/\D/g, '');
  if (!/^\d{6}$/.test(pin)) return res.status(400).json({ error: 'El PIN tiene que tener 6 números.' });
  if (!process.env.PHONE_NUMBER_ID) return res.status(400).json({ error: 'Falta PHONE_NUMBER_ID en Render.' });
  try {
    res.json(await wa.activarNumero({ pin, wabaId }));
  } catch (error) {
    console.error('Error activando número:', error.response?.data || error.message);
    res.status(500).json({ error: wa.explicarErrorWA(error) });
  }
});

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

app.get('/', (req, res) => res.send('TecnoRiv Bot activo! Panel en /panel · Gestión en /gestion · Contenido en /contenido · Catálogo en /catalogo'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
contenido.iniciarProgramador(avisarDueno);
postventa.iniciar();
