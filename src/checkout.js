// CHECKOUT DEL CATÁLOGO (/catalogo): el cliente arma el carrito, deja sus datos y elige cómo pagar.
// Cada producto del carrito es una fila de "pedidos" (igual que las ventas del bot), unidas por el código de compra (W-XXXXXX).
// El stock baja solo al insertarse el pedido (trigger de supabase-gestion.sql) y vuelve si se cancela.
//
// Medios de pago:
// - Tarjeta: con MP_ACCESS_TOKEN en Render se cobra online con Mercado Pago (Checkout Pro). Sin esa variable,
//   el pedido queda registrado y el dueño le manda el link de pago por WhatsApp.
// - Transferencia: se muestran el alias y el titular (src/negocio.js) y el cliente manda el comprobante por WhatsApp.
// - Efectivo: paga al recibir o retirar (con el descuento en efectivo, si corre).
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { supabase } = require('./datos');
const negocio = require('./negocio');
const { promoVigente, precioPromo, precioEfectivo, hoyAR } = require('./promo');

const MP = 'https://api.mercadopago.com';
const mpActivo = () => Boolean(process.env.MP_ACCESS_TOKEN);
const mpHeaders = () => ({ Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' });
const fmt = (n) => '$' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const urlBase = (req) => (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `https://${req.get('host')}`).replace(/\/$/, '');

const MINUTOS_PAGO = 30;     // cuánto dura el link de pago con tarjeta
const MINUTOS_RESERVA = 45;  // pasado ese tiempo sin pago con tarjeta, el pedido se cancela y el stock vuelve
const PAGOS = { tarjeta: 'Tarjeta (Mercado Pago)', transferencia: 'Transferencia', efectivo: 'Efectivo' };
const ESTADO_TXT = {
  esperando: 'esperando el pago con tarjeta', link: 'hay que mandarle el link de pago', a_confirmar: 'esperando el comprobante',
  contraentrega: 'paga al recibir', aprobado: 'PAGADO', vencido: 'venció sin pago',
};

// "358 412-3456", "0358 15 4123456" o "+54 9 358 4123456" -> "5493584123456" (como llega por WhatsApp). null si no es válido.
function telefonoAR(texto) {
  let d = String(texto || '').replace(/\D/g, '');
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('9') && d.length > 10) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 12) {
    // Sacamos el "15" que va después de la característica (de 2, 3 o 4 dígitos).
    const largos = d.startsWith('11') ? [2] : [3, 4, 2];
    const l = largos.find((n) => d.substr(n, 2) === '15');
    if (l) d = d.slice(0, l) + d.slice(l + 2);
  }
  return d.length === 10 && !d.startsWith('0') ? '549' + d : null;
}

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para que no se confundan
const nuevoCodigo = () => 'W-' + Array.from(crypto.randomBytes(6), (b) => LETRAS[b % LETRAS.length]).join('');
const esCodigo = (c) => /^W-[A-Z2-9]{6}$/.test(c);

// Límite simple en memoria para que nadie llene el sistema de pedidos falsos.
const golpes = new Map();
function dentroDelLimite(clave, max, ms) {
  const ahora = Date.now();
  const l = (golpes.get(clave) || []).filter((t) => ahora - t < ms);
  if (l.length >= max) { golpes.set(clave, l); return false; }
  l.push(ahora);
  golpes.set(clave, l);
  if (golpes.size > 5000) for (const [k, v] of golpes) if (!v.some((t) => ahora - t < 3600e3)) golpes.delete(k);
  return true;
}
const ipDe = (req) => String(req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || '').trim();

const error = (msg, status = 400) => Object.assign(new Error(msg), { status });

// Valida el carrito contra la base (precios, promo y stock reales) y arma las líneas del pedido.
// Devuelve { lineas: [{ producto_id, producto, cantidad, monto, regalo }], total }.
async function armarLineas(items, pago) {
  const pedido = new Map();
  for (const it of Array.isArray(items) ? items.slice(0, 30) : []) {
    const id = Number(it?.id);
    const n = Math.floor(Number(it?.n));
    if (!id || !(n > 0)) continue;
    pedido.set(id, Math.min((pedido.get(id) || 0) + n, 20));
  }
  if (!pedido.size) throw error('El carrito está vacío.');
  const [{ data: productos, error: e }, promo] = await Promise.all([
    supabase.from('productos').select('id, nombre, categoria, precio, stock, activo').eq('activo', true),
    promoVigente(),
  ]);
  if (e) throw error('No se pudo leer el catálogo. Probá de nuevo en un momento.', 500);
  const lineas = [];
  let paraRegalo = 0;
  for (const [id, n] of pedido) {
    const p = (productos || []).find((x) => x.id === id);
    if (!p || !(Number(p.precio) > 0)) throw error('Uno de los productos ya no está disponible. Actualizá el catálogo y probá de nuevo.');
    if ((Number(p.stock) || 0) < n) throw error((Number(p.stock) || 0) <= 0 ? `Se agotó: ${p.nombre}. Sacalo del carrito para seguir.` : `No hay stock suficiente de ${p.nombre}. Probá con menos unidades.`);
    let unidad = promo?.descuento ? precioPromo(p.precio, promo) : Number(p.precio);
    if (pago === 'efectivo') unidad = precioEfectivo(unidad, promo);
    lineas.push({ producto_id: p.id, producto: p.nombre, cantidad: n, monto: unidad * n, regalo: false });
    if (promo?.regaloId && p.id !== promo.regaloId && (p.categoria || '') === promo.regaloCategoria) paraRegalo += n;
  }
  // Regalo de la promo: uno por cada producto de la categoría, mientras haya stock.
  if (paraRegalo && promo?.regaloId) {
    const r = (productos || []).find((x) => x.id === promo.regaloId);
    const libres = r ? (Number(r.stock) || 0) - (pedido.get(r.id) || 0) : 0;
    const n = Math.min(paraRegalo, Math.max(0, libres));
    if (n > 0) lineas.push({ producto_id: r.id, producto: r.nombre, cantidad: n, monto: 0, regalo: true });
  }
  return { lineas, total: lineas.reduce((a, l) => a + l.monto, 0) };
}

// ───────── Mercado Pago (Checkout Pro) ─────────

// Fecha con el huso de Argentina, como la pide Mercado Pago.
const isoAR = (ms) => new Date(ms - 3 * 3600e3).toISOString().replace('Z', '-03:00');

async function crearLinkDePago({ codigo, lineas, nombre, base, venceEn = MINUTOS_PAGO }) {
  const body = {
    items: lineas.filter((l) => l.monto > 0).map((l) => ({
      id: String(l.producto_id), title: String(l.producto).slice(0, 250), quantity: l.cantidad,
      unit_price: Math.round(l.monto / l.cantidad), currency_id: 'ARS',
    })),
    payer: { name: nombre },
    external_reference: codigo,
    back_urls: {
      success: `${base}/catalogo?pago=ok&c=${codigo}`,
      failure: `${base}/catalogo?pago=error&c=${codigo}`,
      pending: `${base}/catalogo?pago=pendiente&c=${codigo}`,
    },
    auto_return: 'approved',
    notification_url: `${base}/api/mp/webhook`,
    statement_descriptor: 'TECNO RIV',
    binary_mode: true, // el pago se aprueba o se rechaza en el momento (sin "pendiente")
    payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] }, // solo tarjetas y dinero en cuenta
    expires: true,
    expiration_date_to: isoAR(Date.now() + venceEn * 60e3),
  };
  const { data } = await axios.post(`${MP}/checkout/preferences`, body, { headers: mpHeaders(), timeout: 20000 });
  if (!data.init_point) throw new Error('Mercado Pago no devolvió el link de pago');
  return data.init_point;
}

// Pago aprobado de esa compra según Mercado Pago (o null).
async function pagoAprobadoEnMP(codigo) {
  const { data } = await axios.get(`${MP}/v1/payments/search`, { headers: mpHeaders(), params: { external_reference: codigo, sort: 'date_created', criteria: 'desc' }, timeout: 20000 });
  return (data.results || []).find((p) => p.status === 'approved') || null;
}

// ───────── Compras ─────────

async function leerCompra(codigo) {
  const { data } = await supabase.from('pedidos').select('*').eq('compra', codigo).order('id');
  return data || [];
}

const textoLineas = (filas) => filas.map((f) => (Number(f.monto) > 0 ? `${f.cantidad}x ${f.producto} · ${fmt(f.monto)}` : `🎁 ${f.cantidad}x ${f.producto} (regalo)`)).join('\n');
const totalDe = (filas) => filas.reduce((a, f) => a + Number(f.monto || 0), 0);

// Marca la compra como pagada (una sola vez, aunque avisen a la vez el webhook y la vuelta del cliente).
async function confirmarPago(codigo, pago, avisar) {
  const filas = await leerCompra(codigo);
  if (!filas.length || filas.every((f) => f.pago_estado === 'aprobado')) return false;
  const total = totalDe(filas);
  if (Number(pago.transaction_amount) + 1 < total) {
    await avisar(`⚠️ PAGO POR MENOS EN ${codigo}: llegaron ${fmt(pago.transaction_amount)} y el pedido es de ${fmt(total)}. Revisalo en Mercado Pago (pago ${pago.id}).`);
    return false;
  }
  const vencida = filas.some((f) => f.estado === 'cancelado');
  const { data: cambiadas } = await supabase.from('pedidos')
    .update({ pago_estado: 'aprobado', pago_ref: String(pago.id), ...(vencida ? { estado: 'pendiente' } : {}) })
    .eq('compra', codigo).neq('pago_estado', 'aprobado').select('id');
  if (!cambiadas?.length) return false; // otro proceso ya la confirmó
  const f = filas[0];
  await avisar(`💳 PAGO APROBADO ${codigo} · ${fmt(total)}\nCliente: ${f.cliente} +${f.telefono}\n${textoLineas(filas)}\nEntrega: ${f.entrega}\nYa está en /gestion como pendiente de entrega.${vencida ? '\n⚠️ El pedido había vencido y se reactivó: revisá que haya stock.' : ''}`);
  return true;
}

// Cancela las compras con tarjeta que no se pagaron a tiempo (el stock vuelve solo).
async function vencerImpagas(avisar = async () => {}) {
  if (!supabase) return 0;
  const limite = new Date(Date.now() - MINUTOS_RESERVA * 60e3).toISOString();
  const { data } = await supabase.from('pedidos').select('compra').eq('pago_estado', 'esperando').eq('estado', 'pendiente').lt('created_at', limite).not('compra', 'is', null);
  let n = 0;
  for (const codigo of [...new Set((data || []).map((x) => x.compra))]) {
    try {
      const pago = mpActivo() ? await pagoAprobadoEnMP(codigo) : null;
      if (pago) { await confirmarPago(codigo, pago, avisar); continue; }
      await supabase.from('pedidos').update({ estado: 'cancelado', pago_estado: 'vencido' }).eq('compra', codigo).eq('pago_estado', 'esperando');
      n++;
    } catch (e) { console.error('Vencer compra', codigo, e.response?.data?.message || e.message); }
  }
  return n;
}

// Lo que ve el cliente de su compra (sin datos personales).
const publico = (filas) => ({
  codigo: filas[0].compra,
  pago: Object.keys(PAGOS).find((k) => PAGOS[k] === filas[0].pago) || 'tarjeta',
  pago_estado: filas[0].pago_estado,
  cancelado: filas.every((f) => f.estado === 'cancelado'),
  total: totalDe(filas),
  lineas: filas.map((f) => ({ producto: f.producto, cantidad: f.cantidad, monto: Number(f.monto), regalo: Number(f.monto) === 0 })),
  ...(filas[0].pago === PAGOS.transferencia ? { transferencia: negocio.transferencia } : {}),
});

// ───────── Contexto para el bot de WhatsApp ─────────
// Si el cliente que escribe hizo una compra en el catálogo web, el bot lo sabe y no la carga de nuevo.
// Solo se le pasan datos nuestros (productos, total, estado): nunca el texto libre que escribió el cliente en el formulario.
async function contextoCliente(telefono, texto = '') {
  if (!supabase) return '';
  const cod = (String(texto).toUpperCase().match(/\bW-?([A-Z2-9]{6})\b/) || [])[1];
  const desde = new Date(Date.now() - 5 * 864e5).toISOString();
  let q = supabase.from('pedidos').select('*').not('compra', 'is', null).neq('estado', 'entregado').gte('created_at', desde).order('id', { ascending: false }).limit(20);
  q = cod ? q.eq('compra', 'W-' + cod) : q.eq('telefono', telefono).neq('estado', 'cancelado');
  const { data } = await q;
  if (!data?.length) return '';
  const codigo = data[0].compra;
  const filas = data.filter((f) => f.compra === codigo).reverse();
  const f = filas[0];
  const t = negocio.transferencia;
  const pasos = {
    a_confirmar: `Eligió pagar por TRANSFERENCIA y todavía no confirmamos el pago. Datos: alias ${t.alias}, titular ${t.titular}, ${t.banco}. Si manda el comprobante (una foto) o dice que ya transfirió, agradecé, decile que lo verificamos y le avisamos para coordinar la entrega, y agregá [HUMANO: comprobante del pedido ${codigo}].`,
    link: `Eligió pagar con TARJETA: decile que en un momento le pasamos el link de pago y agregá [HUMANO: mandar link de pago del pedido ${codigo}].`,
    esperando: 'Eligió pagar con TARJETA en la web y el pago todavía no se completó. Si tuvo un problema, ofrecele transferencia o efectivo.',
    aprobado: `Ya está PAGADO. Coordiná la entrega (día y horario) y agregá [HUMANO: coordinar entrega del pedido ${codigo}].`,
    contraentrega: `Paga en EFECTIVO al recibir. Coordiná la entrega (día y horario) y agregá [HUMANO: coordinar entrega del pedido ${codigo}].`,
    vencido: 'El pedido VENCIÓ porque no se completó el pago. Ofrecele hacerlo de nuevo o cerrarlo por acá.',
  };
  return `\nPEDIDO WEB DE ESTE CLIENTE (lo hizo en el catálogo web y YA ESTÁ CARGADO en el sistema: NO agregues [VENTA] por estos productos): ${codigo} · ${filas.map((x) => `${x.cantidad}x ${x.producto}${Number(x.monto) > 0 ? '' : ' (regalo)'}`).join(', ')} · Total ${fmt(totalDe(filas))} · Entrega: ${String(f.entrega || '').startsWith('Retiro') ? 'retiro a coordinar' : 'envío a domicilio (la dirección ya la tenemos)'}. ${pasos[f.pago_estado] || ''} Confirmale el pedido en una línea, sin volver a pedirle datos que ya dio.`;
}

// ───────── Rutas ─────────

function router(avisarDueno = async () => {}) {
  const r = express.Router();
  const listo = (req, res, next) => (supabase ? next() : res.status(503).json({ error: 'La tienda no está disponible en este momento.' }));
  const fallar = (res, e) => {
    if (!e.status || e.status >= 500) console.error('Checkout:', e.response?.data || e.message);
    res.status(e.status || 500).json({ error: e.status ? e.message : 'No pudimos procesar el pedido. Probá de nuevo o escribinos por WhatsApp.' });
  };

  // { items: [{ id, n }], nombre, telefono, entrega: 'envio'|'retiro', direccion, nota, pago: 'tarjeta'|'transferencia'|'efectivo' }
  r.post('/catalogo/pedido', listo, async (req, res) => {
    try {
      const b = req.body || {};
      if (!dentroDelLimite('ip:' + ipDe(req), 6, 10 * 60e3) || !dentroDelLimite('todos', 60, 3600e3)) throw error('Hiciste muchos pedidos seguidos. Esperá unos minutos o escribinos por WhatsApp.', 429);
      const nombre = String(b.nombre || '').replace(/\s+/g, ' ').trim().slice(0, 80);
      if (nombre.length < 3) throw error('Escribí tu nombre y apellido.');
      const telefono = telefonoAR(b.telefono);
      if (!telefono) throw error('Revisá tu número de WhatsApp: va con característica y sin 0 ni 15 (ej: 358 4123456).');
      if (!PAGOS[b.pago]) throw error('Elegí cómo querés pagar.');
      const retiro = b.entrega === 'retiro';
      const direccion = String(b.direccion || '').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!retiro && direccion.length < 4) throw error('Escribí la dirección de entrega en Río Cuarto.');
      const nota = String(b.nota || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      const entrega = (retiro ? 'Retiro a coordinar' : `Envío a ${direccion}`) + (nota ? ` (${nota})` : '');

      const { lineas, total } = await armarLineas(b.items, b.pago);

      // Doble toque en "Confirmar": si hizo la misma compra hace menos de 2 minutos, devolvemos esa.
      const { data: recientes } = await supabase.from('pedidos').select('*').eq('telefono', telefono).eq('origen', 'catalogo').neq('estado', 'cancelado').gte('created_at', new Date(Date.now() - 24 * 3600e3).toISOString()).order('id', { ascending: false });
      const firma = (ls) => ls.map((l) => `${l.producto_id}x${l.cantidad}`).sort().join(',');
      const ultima = (recientes || []).filter((f) => f.compra === recientes[0].compra);
      let codigo;
      let filas;
      if (ultima.length && Date.now() - new Date(ultima[0].created_at).getTime() < 2 * 60e3 && ultima[0].pago === PAGOS[b.pago] && firma(ultima) === firma(lineas)) {
        codigo = ultima[0].compra;
        filas = [...ultima].reverse();
      } else {
        const sinPagar = new Set((recientes || []).filter((f) => ['esperando', 'link', 'a_confirmar'].includes(f.pago_estado) && f.estado === 'pendiente').map((f) => f.compra));
        if (sinPagar.size >= 3) throw error('Ya tenés pedidos esperando el pago. Escribinos por WhatsApp y lo resolvemos.');
        codigo = nuevoCodigo();
        const pagoEstado = b.pago === 'tarjeta' ? (mpActivo() ? 'esperando' : 'link') : b.pago === 'transferencia' ? 'a_confirmar' : 'contraentrega';
        const clienteId = await require('./gestion').registrarContacto(telefono, nombre);
        if (clienteId) {
          const { data: c } = await supabase.from('clientes').select('nombre, origen').eq('id', clienteId).maybeSingle();
          const cambios = { ...(c?.nombre ? {} : { nombre }), ...(c?.origen ? {} : { origen: 'Catálogo web' }) };
          if (Object.keys(cambios).length) await supabase.from('clientes').update(cambios).eq('id', clienteId);
        }
        const resumen = `Pedido web ${codigo}: ${lineas.map((l) => `${l.cantidad}x ${l.producto}`).join(', ')}`;
        filas = [];
        for (const l of lineas) {
          const { data, error: e } = await supabase.from('pedidos').insert({
            telefono, resumen, cliente_id: clienteId, cliente: nombre, producto_id: l.producto_id, producto: l.producto, cantidad: l.cantidad, monto: l.monto,
            estado: 'pendiente', canal: 'Catálogo web', entrega, pago: PAGOS[b.pago], origen: 'catalogo', fecha: hoyAR(), compra: codigo, pago_estado: pagoEstado,
          }).select().single();
          if (e) {
            // Si falla a mitad de camino, se cancela lo que ya entró (el stock vuelve solo).
            if (filas.length) await supabase.from('pedidos').update({ estado: 'cancelado', pago_estado: 'vencido' }).eq('compra', codigo);
            throw error(/compra|pago_estado|column/i.test(e.message) ? 'Falta correr supabase-checkout.sql en Supabase.' : 'No se pudo guardar el pedido. Probá de nuevo.', 500);
          }
          filas.push(data);
        }
        if (pagoEstado !== 'esperando') {
          const aviso = { link: 'Pago: TARJETA → mandale el link de pago por WhatsApp.', a_confirmar: 'Pago: TRANSFERENCIA → esperá el comprobante y marcalo como pagado en /gestion.', contraentrega: 'Pago: EFECTIVO al recibir.' }[pagoEstado];
          await avisarDueno(`🛒 NUEVO PEDIDO WEB ${codigo}\nCliente: ${nombre} +${telefono}\n${textoLineas(filas)}\nTotal: ${fmt(total)}\n${aviso}\nEntrega: ${entrega}\nYa está en /gestion como pendiente.`);
        }
      }

      const salida = publico(filas);
      if (salida.pago_estado === 'esperando') {
        try {
          salida.init_point = await crearLinkDePago({ codigo, lineas: filas, nombre, base: urlBase(req) });
        } catch (e) {
          console.error('Mercado Pago:', e.response?.data || e.message);
          // No se pudo abrir Mercado Pago: el pedido queda para pagar con link por WhatsApp.
          await supabase.from('pedidos').update({ pago_estado: 'link' }).eq('compra', codigo);
          salida.pago_estado = 'link';
          await avisarDueno(`🛒 NUEVO PEDIDO WEB ${codigo}\nCliente: ${nombre} +${telefono}\n${textoLineas(filas)}\nTotal: ${fmt(total)}\nPago: TARJETA → Mercado Pago falló al crear el pago: mandale el link por WhatsApp.\nEntrega: ${entrega}`);
        }
      }
      res.json(salida);
    } catch (e) { fallar(res, e); }
  });

  // Estado de una compra (lo consulta el catálogo al volver de Mercado Pago).
  r.get('/catalogo/pedido/:codigo', listo, async (req, res) => {
    try {
      const codigo = String(req.params.codigo).toUpperCase();
      if (!esCodigo(codigo) || !dentroDelLimite('ver:' + ipDe(req), 40, 10 * 60e3)) throw error('No encontramos ese pedido.', 404);
      let filas = await leerCompra(codigo);
      if (!filas.length) throw error('No encontramos ese pedido.', 404);
      if (filas[0].pago_estado === 'esperando' && mpActivo()) {
        const pago = await pagoAprobadoEnMP(codigo).catch(() => null);
        if (pago) { await confirmarPago(codigo, pago, avisarDueno); filas = await leerCompra(codigo); }
      }
      res.json(publico(filas));
    } catch (e) { fallar(res, e); }
  });

  // Reintentar el pago con tarjeta de una compra que quedó sin pagar.
  r.post('/catalogo/pedido/:codigo/pagar', listo, async (req, res) => {
    try {
      const codigo = String(req.params.codigo).toUpperCase();
      if (!esCodigo(codigo) || !dentroDelLimite('pagar:' + ipDe(req), 10, 10 * 60e3)) throw error('No encontramos ese pedido.', 404);
      const filas = await leerCompra(codigo);
      const restan = filas.length ? MINUTOS_RESERVA - 5 - (Date.now() - new Date(filas[0].created_at).getTime()) / 60e3 : 0;
      if (!filas.length || filas[0].pago_estado !== 'esperando' || filas[0].estado !== 'pendiente' || restan < 3 || !mpActivo()) throw error('Ese pedido ya venció. Armalo de nuevo desde el carrito.', 410);
      res.json({ init_point: await crearLinkDePago({ codigo, lineas: filas, nombre: filas[0].cliente, base: urlBase(req), venceEn: Math.min(MINUTOS_PAGO, restan) }) });
    } catch (e) { fallar(res, e); }
  });

  // Aviso de Mercado Pago: nunca confiamos en lo que manda, vamos a buscar el pago con nuestra clave.
  r.post('/mp/webhook', async (req, res) => {
    res.sendStatus(200);
    try {
      const tipo = req.body?.type || req.query.type || req.query.topic;
      const id = req.body?.data?.id || req.query['data.id'] || req.query.id;
      if (tipo !== 'payment' || !/^\d+$/.test(String(id || '')) || !mpActivo() || !supabase) return;
      const { data: pago } = await axios.get(`${MP}/v1/payments/${id}`, { headers: mpHeaders(), timeout: 20000 });
      if (pago.status === 'approved' && esCodigo(pago.external_reference || '')) await confirmarPago(pago.external_reference, pago, avisarDueno);
    } catch (e) { console.error('Webhook Mercado Pago:', e.response?.data?.message || e.message); }
  });

  return r;
}

// Revisa cada 5 minutos las compras con tarjeta que quedaron sin pagar.
function iniciar(avisarDueno) {
  setInterval(() => vencerImpagas(avisarDueno).catch((e) => console.error('Vencer compras:', e.message)), 5 * 60e3).unref();
}

module.exports = { router, iniciar, contextoCliente, telefonoAR, armarLineas, vencerImpagas, confirmarPago, mpActivo, PAGOS, ESTADO_TXT };
