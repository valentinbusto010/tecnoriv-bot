// AUTOMATIZACIONES POR WHATSAPP
// 1) Seguimiento: X días después de entregado, "¿cómo te está funcionando?" (y el bot pide reseña si está todo bien).
// 2) Recompra: Y días después, una oferta de un accesorio que combine con lo que compró, con % OFF por 7 días.
// 3) Resumen diario al dueño a la mañana: ventas, pendientes, stock, contenido del día y un consejo de la IA.
// Fuera de la ventana de 24 h de WhatsApp se usan las plantillas tr_seguimiento, tr_recompra y tr_resumen (ver README).
const express = require('express');
const { supabase } = require('./datos');
const negocio = require('./negocio');
const wa = require('./whatsapp');
const { promoVigente, precioPromo, precioEfectivo } = require('./promo');

const TZ = 'America/Argentina/Buenos_Aires';
const hoyAR = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ });
const sumarDias = (dia, n) => { const d = new Date(dia + 'T12:00:00-03:00'); d.setDate(d.getDate() + n); return hoyAR(d); };
const horaAR = () => Number(new Date().toLocaleString('en-US', { timeZone: TZ, hour: '2-digit', hour12: false })) % 24;
const diaSemanaAR = () => new Date().toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short' });
const haceDias = (n) => new Date(Date.now() - n * 864e5).toISOString();
const fmt = (n) => '$' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fechaCorta = (dia) => { const [, m, d] = dia.split('-'); return `${Number(d)}/${Number(m)}`; };

const PLANTILLAS = { seguimiento: 'tr_seguimiento', recompra: 'tr_recompra', resumen: 'tr_resumen' };
const DEFECTO = { postventa_activa: 1, dias_seguimiento: 3, dias_recompra: 35, recompra_descuento: 10, resumen_activo: 1, resumen_hora: 8 };
// Claves internas en "ajustes" (no se muestran como ajustes en /gestion)
const INTERNAS = ['resumen_ultimo', 'resumen_texto', 'dueno_ultimo'];

async function leerConfig() {
  const { data } = await supabase.from('ajustes').select('clave, valor').in('clave', [...Object.keys(DEFECTO), ...INTERNAS]);
  const c = { ...DEFECTO };
  for (const a of data || []) c[a.clave] = INTERNAS.includes(a.clave) ? String(a.valor ?? '') : Number(a.valor);
  return c;
}
const guardarInterna = (clave, valor) => supabase.from('ajustes').upsert({ clave, valor }, { onConflict: 'clave' });

// "358 412-3456" / "5493584123456" -> "5493584123456"
function telInternacional(t) {
  let d = String(t || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('9')) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);
  d = d.replace(/^(\d{2,4})15/, '$1');
  return d.length >= 10 ? '549' + d : '';
}
const variantes = (tel) => { const d = tel.slice(3); return [tel, '54' + d, d]; };

const primerNombre = (n) => {
  const x = String(n || '').trim().split(/\s+/)[0] || '';
  return /^\+?\d/.test(x) ? '' : x.charAt(0).toUpperCase() + x.slice(1).toLowerCase();
};

// ¿La persona nos escribió en las últimas 24 h? (entonces se puede mandar texto libre)
async function ventanaAbierta(tel) {
  const { data } = await supabase.from('mensajes').select('created_at').in('telefono', variantes(tel)).eq('rol', 'user').gte('created_at', haceDias(0.95)).limit(1);
  return Boolean(data?.length);
}

async function registrar(fila) {
  await supabase.from('mensajes_auto').insert(fila).then(({ error }) => error && console.error('mensajes_auto:', error.message));
}

// Manda texto libre si la ventana está abierta; si no, la plantilla. Deja registro y guarda el mensaje en el historial del bot.
async function mandar({ tipo, tel, cliente, pedido_id, texto, params, ventana }) {
  const abierta = ventana ?? (await ventanaAbierta(tel));
  const via = abierta ? 'texto' : 'plantilla';
  try {
    const wa_id = abierta ? await wa.enviarTexto(tel, texto) : await wa.enviarPlantilla(tel, PLANTILLAS[tipo], params);
    await registrar({ tipo, telefono: tel, cliente, pedido_id, texto, via, estado: 'enviado', wa_id });
    if (tipo !== 'resumen') await supabase.from('mensajes').insert({ telefono: tel, rol: 'assistant', contenido: texto });
    return { ok: true, via };
  } catch (e) {
    const error = wa.explicarErrorWA(e);
    console.error(`Postventa ${tipo} a ${tel}:`, error);
    await registrar({ tipo, telefono: tel, cliente, pedido_id, texto, via, estado: 'error', error });
    return { ok: false, via, error };
  }
}

// ───────── RECOMPRA: qué ofrecerle según lo que compró ─────────
const COMPLEMENTOS = [
  { si: /smartwatch|reloj|watch|wearable/i, ofrecer: [/malla|correa/i, /hidrogel|protector/i, /funda.*(smartwatch|reloj)/i] },
  { si: /malla|correa|funda.*smartwatch/i, ofrecer: [/hidrogel.*smartwatch/i, /malla/i] },
  { si: /funda.*iphone|iphone/i, ofrecer: [/magsafe/i, /cabezal.*apple|cargador.*apple/i, /cable apple/i] },
  { si: /lightning|cable apple/i, ofrecer: [/cabezal.*apple|cargador.*apple/i, /magsafe/i] },
  { si: /cabezal|cargador/i, ofrecer: [/cable apple usb-c|cable.*usb-c a/i, /cable/i] },
  { si: /cable/i, ofrecer: [/cabezal|cargador/i] },
  { si: /auricular|airpods|audio/i, ofrecer: [/smartwatch/i] },
];

function elegirComplemento(comprados, productos, yaTiene) {
  const texto = comprados.map((p) => `${p.nombre} ${p.categoria || ''}`).join(' ');
  for (const regla of COMPLEMENTOS) {
    if (!regla.si.test(texto)) continue;
    for (const patron of regla.ofrecer) {
      const op = productos
        .filter((p) => p.activo !== false && p.stock > 0 && Number(p.precio) > 0 && patron.test(p.nombre) && !yaTiene.has(p.id))
        .sort((a, b) => Number(a.precio) - Number(b.precio))[0];
      if (op) return op;
    }
  }
  return null;
}

// Agrupa por teléfono: un solo mensaje aunque haya comprado varias cosas.
function agrupar(pedidos) {
  const g = new Map();
  for (const p of pedidos) {
    const tel = telInternacional(p.telefono);
    if (!tel) continue;
    if (!g.has(tel)) g.set(tel, []);
    g.get(tel).push(p);
  }
  return g;
}

async function clientesNoContactar(tels) {
  if (!tels.length) return new Set();
  const todas = tels.flatMap(variantes);
  const { data } = await supabase.from('clientes').select('telefono').in('telefono', todas).eq('no_contactar', true);
  return new Set((data || []).map((c) => telInternacional(c.telefono)));
}

async function correrSeguimientos(cfg, max = 10) {
  const dias = cfg.dias_seguimiento;
  const { data: pedidos } = await supabase.from('pedidos')
    .select('id, telefono, cliente, producto, cantidad, entregado_at')
    .eq('estado', 'entregado').is('seguimiento_at', null).not('telefono', 'is', null)
    .lte('entregado_at', haceDias(dias)).gte('entregado_at', haceDias(dias + 10)).limit(200);
  const grupos = agrupar(pedidos || []);
  const baja = await clientesNoContactar([...grupos.keys()]);
  let enviados = 0;
  for (const [tel, ps] of grupos) {
    const ids = ps.map((p) => p.id);
    if (baja.has(tel)) { await supabase.from('pedidos').update({ seguimiento_at: new Date().toISOString() }).in('id', ids); continue; }
    if (enviados >= max) break;
    const nombre = primerNombre(ps[0].cliente);
    const producto = [...new Set(ps.map((p) => p.producto).filter(Boolean))].slice(0, 2).join(' y ') || 'compra';
    const texto = `Hola${nombre ? ' ' + nombre : ''}! Te escribimos de ${negocio.nombre} 👋 ¿Cómo te está funcionando tu ${producto}? Si tenés alguna duda o algo no anda bien, respondé este mensaje y te ayudamos.`;
    const r = await mandar({ tipo: 'seguimiento', tel, cliente: ps[0].cliente, pedido_id: ids[0], texto, params: [nombre || 'de nuevo', producto] });
    // Se marca aunque falle, para no reintentar en loop (el error queda registrado en el panel).
    await supabase.from('pedidos').update({ seguimiento_at: new Date().toISOString() }).in('id', ids);
    if (r.ok) enviados++;
  }
  return enviados;
}

async function correrRecompras(cfg, max = 10) {
  const dias = cfg.dias_recompra;
  const [{ data: pedidos }, { data: productos }, promo] = await Promise.all([
    supabase.from('pedidos').select('id, telefono, cliente, cliente_id, producto_id, producto, created_at')
      .eq('estado', 'entregado').is('recompra_at', null).not('telefono', 'is', null)
      .lte('entregado_at', haceDias(dias)).gte('entregado_at', haceDias(dias + 14)).limit(200),
    supabase.from('productos').select('id, nombre, categoria, precio, stock, activo'),
    promoVigente(),
  ]);
  const grupos = agrupar(pedidos || []);
  const baja = await clientesNoContactar([...grupos.keys()]);
  const hace60 = haceDias(60);
  let enviados = 0;
  for (const [tel, ps] of grupos) {
    const ids = ps.map((p) => p.id);
    const marcar = () => supabase.from('pedidos').update({ recompra_at: new Date().toISOString() }).in('id', ids);
    if (baja.has(tel)) { await marcar(); continue; }
    if (enviados >= max) break;
    // Si ya volvió a comprar o le mandamos una oferta hace poco, no lo molestamos.
    const desde = ps.map((p) => p.created_at).sort().pop();
    const [{ data: otras }, { data: ofertas }] = await Promise.all([
      supabase.from('pedidos').select('id, producto_id').in('telefono', [...variantes(tel), ...ps.map((p) => p.telefono)]).neq('estado', 'cancelado'),
      supabase.from('mensajes_auto').select('id').eq('tipo', 'recompra').eq('estado', 'enviado').in('telefono', variantes(tel)).gte('created_at', hace60).limit(1),
    ]);
    const volvio = (otras || []).some((o) => !ids.includes(o.id) && o.id > Math.max(...ids));
    if (volvio || ofertas?.length || desde < haceDias(dias + 30)) { await marcar(); continue; }

    const comprados = ps.map((p) => (productos || []).find((x) => x.id === p.producto_id) || { nombre: p.producto || '', categoria: '' });
    const yaTiene = new Set((otras || []).map((o) => o.producto_id).filter(Boolean));
    const comp = elegirComplemento(comprados, productos || [], yaTiene);
    if (!comp) { await marcar(); continue; }

    const d = Math.min(50, Math.max(1, cfg.recompra_descuento));
    const base = promo?.descuento ? precioPromo(comp.precio, promo) : Number(comp.precio);
    const conBeneficio = Math.round(base * (1 - d / 100));
    const hasta = sumarDias(hoyAR(), 7);
    const nombre = primerNombre(ps[0].cliente);
    const compro = [...new Set(ps.map((p) => p.producto).filter(Boolean))].slice(0, 2).join(' y ');
    const oferta = `${comp.nombre} a ${fmt(conBeneficio)} (antes ${fmt(base)})`;
    const texto = `Hola${nombre ? ' ' + nombre : ''}! Como compraste ${compro} en ${negocio.nombre}, te guardamos un beneficio: ${oferta}, ${d}% OFF hasta el ${fechaCorta(hasta)}. ¿Te lo reservamos? Respondé este mensaje. Si no querés recibir más ofertas, respondé BAJA.`;
    const r = await mandar({ tipo: 'recompra', tel, cliente: ps[0].cliente, pedido_id: ids[0], texto, params: [nombre || 'de nuevo', compro, oferta, String(d), fechaCorta(hasta)] });
    await marcar();
    if (r.ok) {
      enviados++;
      const beneficio = { producto_id: comp.id, nombre: comp.nombre, descuento: d, hasta };
      await supabase.from('clientes').update({ beneficio }).in('telefono', [...variantes(tel), ...ps.map((p) => p.telefono)]);
    }
  }
  return enviados;
}

// ───────── RESUMEN DIARIO ─────────

async function armarResumen() {
  const hoy = hoyAR();
  const ayer = sumarDias(hoy, -1);
  const mes = hoy.slice(0, 8) + '01';
  // Mismo tramo del mes pasado, para comparar
  const mesPasado = sumarDias(mes, -1).slice(0, 8) + '01';
  const mismoDiaMesPasado = sumarDias(mesPasado, Number(hoy.slice(8)) - 2);
  const [{ data: ped }, { data: gas }, { data: prods }, { data: piezas }, { data: autos }] = await Promise.all([
    supabase.from('pedidos').select('id, fecha, cliente, producto, monto, costo, estado').gte('fecha', mesPasado).limit(5000),
    supabase.from('gastos').select('monto, categoria, fecha').gte('fecha', mes).limit(2000),
    supabase.from('productos').select('nombre, stock, alerta, activo'),
    supabase.from('piezas').select('titulo, formato, estado, programado_para').eq('estado', 'programado').order('programado_para').limit(20),
    supabase.from('mensajes_auto').select('tipo, estado').gte('created_at', new Date(ayer + 'T00:00:00-03:00').toISOString()).lt('created_at', new Date(hoy + 'T00:00:00-03:00').toISOString()),
  ]);
  const validos = (ped || []).filter((p) => p.estado !== 'cancelado');
  const suma = (arr) => arr.reduce((a, p) => a + Number(p.monto), 0);
  const deAyer = validos.filter((p) => p.fecha === ayer);
  const delMes = validos.filter((p) => p.fecha >= mes && p.fecha <= hoy);
  const comparable = validos.filter((p) => p.fecha >= mesPasado && p.fecha <= mismoDiaMesPasado);
  const { margenReal } = require('./gestion');
  const m = margenReal(delMes, gas || []);
  const pendientes = validos.filter((p) => p.estado === 'pendiente' || p.estado === 'en camino');
  const activos = (prods || []).filter((p) => p.activo !== false);
  const agotados = activos.filter((p) => p.stock <= 0).map((p) => p.nombre);
  const bajos = activos.filter((p) => p.stock > 0 && p.stock <= (p.alerta || 1)).map((p) => `${p.nombre} (${p.stock})`);
  const paraHoy = (piezas || []).filter((p) => hoyAR(new Date(p.programado_para)) === hoy);
  const seg = (autos || []).filter((a) => a.tipo === 'seguimiento' && a.estado === 'enviado').length;
  const rec = (autos || []).filter((a) => a.tipo === 'recompra' && a.estado === 'enviado').length;
  const variacion = suma(comparable) ? Math.round(((suma(delMes) - suma(comparable)) / suma(comparable)) * 100) : null;
  const hora = (ts) => new Date(ts).toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
  const diaTxt = new Date().toLocaleDateString('es-AR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });

  let consejo = '';
  try {
    const { fotoNegocio } = require('./asistente');
    const { responderChat } = require('./claude');
    const foto = await fotoNegocio();
    consejo = await responderChat(
      `Sos el asesor de negocio de ${negocio.nombre}, tienda de tecnología en ${negocio.ciudad}, Argentina. Contexto argentino (inflación, cuidar la caja). Datos reales:\n${foto.texto}`,
      [{ role: 'user', content: 'Dame UN solo consejo concreto y accionable para HOY, basado en estos datos (qué reponer, qué empujar, qué publicar o a quién escribirle). Máximo 2 oraciones, en rioplatense, sin saludo ni introducción.' }]
    );
  } catch (e) {
    console.error('Resumen: sin consejo IA:', e.message);
  }

  const lineas = [
    `☀️ *Buen día, Valen* · ${diaTxt}`,
    '',
    `💰 *Ayer:* ${fmt(suma(deAyer))} en ${deAyer.length} pedido${deAyer.length === 1 ? '' : 's'}`,
    `📈 *Mes:* ${fmt(suma(delMes))} · ganancia real ${fmt(m.ganancia)}${variacion !== null ? ` · ${variacion >= 0 ? '+' : ''}${variacion}% vs mes pasado` : ''}`,
    '',
    pendientes.length ? `📦 *Pendientes de entregar (${pendientes.length}):*\n${pendientes.slice(0, 6).map((p) => `• #${p.id} ${p.cliente || ''} · ${p.producto || ''}`).join('\n')}` : '📦 Sin pedidos pendientes',
    agotados.length ? `⛔ *Agotados:* ${agotados.slice(0, 6).join(', ')}${agotados.length > 6 ? '…' : ''}` : '',
    bajos.length ? `⚠️ *Stock bajo:* ${bajos.slice(0, 6).join(', ')}${bajos.length > 6 ? '…' : ''}` : '',
    '',
    paraHoy.length ? `📅 *Contenido de hoy:*\n${paraHoy.map((p) => `• ${hora(p.programado_para)} ${p.titulo}`).join('\n')}` : '📅 Nada programado para hoy en Instagram: publicá algo para no perder alcance.',
    seg + rec ? `🤝 *Postventa ayer:* ${seg} seguimiento${seg === 1 ? '' : 's'} · ${rec} oferta${rec === 1 ? '' : 's'}` : '',
    consejo ? `\n💡 *Consejo:* ${consejo}` : '',
  ];
  const texto = lineas.filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i > 0)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const corto = `ayer ${fmt(suma(deAyer))} (${deAyer.length} pedido${deAyer.length === 1 ? '' : 's'}) · mes ${fmt(suma(delMes))} · ${pendientes.length} pendientes · ${agotados.length + bajos.length} productos con stock bajo`;
  return { texto, corto };
}

async function enviarResumen() {
  if (!process.env.OWNER_PHONE) throw new Error('Falta OWNER_PHONE en Render');
  const tel = telInternacional(process.env.OWNER_PHONE);
  const cfg = await leerConfig();
  const { texto, corto } = await armarResumen();
  await guardarInterna('resumen_texto', texto);
  // El dueño escribe comandos que no quedan en "mensajes": su ventana de 24 h se guarda aparte.
  const abierta = cfg.dueno_ultimo && Date.now() - new Date(cfg.dueno_ultimo).getTime() < 23 * 3600e3;
  const r = await mandar({ tipo: 'resumen', tel, cliente: 'Dueño', texto, params: [corto], ventana: Boolean(abierta) });
  return { ...r, texto };
}

// Lo llama el webhook cuando escribe el dueño (abre su ventana de 24 h).
const duenoEscribio = () => guardarInterna('dueno_ultimo', new Date().toISOString()).then(() => {}, () => {});

// "hoy" desde el WhatsApp del dueño: el último resumen completo.
async function ultimoResumen() {
  const cfg = await leerConfig();
  return cfg.resumen_texto || (await armarResumen()).texto;
}

// ───────── WEBHOOK: bajas, estados y beneficio del cliente ─────────

const BAJA = /^\s*(baja|stop|no (me )?(escrib|mand)\w*( m[aá]s)?( ofertas| mensajes)?|no quiero (recibir )?m[aá]s (ofertas|mensajes))\s*[.!]*\s*$/i;
async function procesarBaja(from, texto) {
  if (!BAJA.test(texto || '')) return null;
  await supabase.from('clientes').update({ no_contactar: true, beneficio: null }).in('telefono', variantes(telInternacional(from)));
  return 'Listo, no te mandamos más ofertas 👍 Si necesitás algo, escribinos cuando quieras.';
}

// Meta avisa después si un mensaje no se pudo entregar (ej. plantilla no aprobada).
async function registrarEstado(st) {
  if (!st?.id || st.status !== 'failed') return;
  const error = wa.explicarErrorWA({ response: { data: { error: st.errors?.[0] || {} } } });
  await supabase.from('mensajes_auto').update({ estado: 'error', error }).eq('wa_id', st.id);
}

async function beneficioDe(telefono) {
  const tel = telInternacional(telefono);
  if (!tel) return null;
  const { data } = await supabase.from('clientes').select('id, beneficio').in('telefono', variantes(tel)).not('beneficio', 'is', null).limit(1);
  const b = data?.[0]?.beneficio;
  return b && b.hasta >= hoyAR() ? { ...b, cliente_id: data[0].id } : null;
}

// Texto extra para las instrucciones del bot de ventas.
async function contextoCliente(telefono) {
  const b = await beneficioDe(telefono).catch(() => null);
  if (!b) return '';
  const [{ data: p }, promo] = await Promise.all([supabase.from('productos').select('precio').eq('id', b.producto_id).maybeSingle(), promoVigente()]);
  if (!p) return '';
  const base = promo?.descuento ? precioPromo(p.precio, promo) : Number(p.precio);
  const precio = Math.round(base * (1 - b.descuento / 100));
  return `\nBENEFICIO DE ESTE CLIENTE (se lo ofrecimos por WhatsApp): ${b.nombre} con ${b.descuento}% OFF hasta el ${fechaCorta(b.hasta)} → ${fmt(precio)}${negocio.descuentoEfectivo ? ` (efectivo ${fmt(precioEfectivo(precio))})` : ''}. Si lo quiere, respetá ese precio en la confirmación y en la marca [VENTA].`;
}

// ───────── PROGRAMADOR ─────────

let ocupado = false;
async function tick() {
  if (ocupado || !supabase || !process.env.WHATSAPP_TOKEN) return;
  ocupado = true;
  try {
    const cfg = await leerConfig();
    const h = horaAR();
    if (cfg.resumen_activo && process.env.OWNER_PHONE && h >= cfg.resumen_hora && h < 23 && cfg.resumen_ultimo !== hoyAR()) {
      await guardarInterna('resumen_ultimo', hoyAR()); // primero se marca: nunca dos resúmenes el mismo día
      const r = await enviarResumen();
      console.log('Resumen diario enviado por', r.via, r.ok ? '' : r.error);
    }
    // A clientes solo de lunes a sábado, de 10 a 20 h.
    if (cfg.postventa_activa && h >= 10 && h < 20 && diaSemanaAR() !== 'Sun') {
      const s = await correrSeguimientos(cfg);
      const r = await correrRecompras(cfg);
      if (s || r) console.log(`Postventa: ${s} seguimientos, ${r} ofertas`);
    }
  } catch (e) {
    console.error('Automatizaciones:', e.message);
  } finally {
    ocupado = false;
  }
}

function iniciar() {
  setTimeout(tick, 30 * 1000);
  setInterval(tick, 5 * 60 * 1000);
}

// ───────── API DEL PANEL ─────────

function router(chequearClave, explicarError = (e) => e.message) {
  const r = express.Router();
  r.use(chequearClave);
  r.use((req, res, next) => (supabase ? next() : res.status(503).json({ error: 'Faltan SUPABASE_URL o SUPABASE_KEY en Render.' })));

  r.get('/estado', async (req, res) => {
    const cfg = await leerConfig();
    const [{ data: ultimos, error }, seg, rec] = await Promise.all([
      supabase.from('mensajes_auto').select('id, tipo, cliente, telefono, texto, via, estado, error, created_at').order('created_at', { ascending: false }).limit(40),
      supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('estado', 'entregado').is('seguimiento_at', null).not('telefono', 'is', null),
      supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('estado', 'entregado').is('recompra_at', null).not('telefono', 'is', null),
    ]);
    if (error) return res.status(500).json({ error: /does not exist|schema cache/i.test(error.message) ? 'Falta correr supabase-postventa.sql en Supabase' : error.message });
    const { resumen_texto, dueno_ultimo, resumen_ultimo, ...config } = cfg;
    res.json({
      config, ultimos, resumenUltimo: resumen_ultimo || null,
      enCola: { seguimiento: seg.count || 0, recompra: rec.count || 0 },
      whatsapp: Boolean(process.env.WHATSAPP_TOKEN && process.env.PHONE_NUMBER_ID), dueno: Boolean(process.env.OWNER_PHONE),
      plantillas: PLANTILLAS,
    });
  });

  r.get('/resumen', async (req, res) => {
    try { res.json(await armarResumen()); } catch (e) { res.status(500).json({ error: explicarError(e) }); }
  });

  r.post('/resumen', async (req, res) => {
    try {
      const r = await enviarResumen();
      if (!r.ok) return res.status(400).json({ error: r.error, texto: r.texto });
      res.json(r);
    } catch (e) { res.status(500).json({ error: explicarError(e) }); }
  });
  return r;
}

module.exports = {
  iniciar, router, tick, procesarBaja, registrarEstado, contextoCliente, beneficioDe, duenoEscribio, ultimoResumen,
  armarResumen, elegirComplemento, telInternacional, correrSeguimientos, correrRecompras, INTERNAS,
};
