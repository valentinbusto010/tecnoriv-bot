// Conecta el bot con el sistema de gestión: clientes, ventas, gastos y stock
// viven en las mismas tablas de Supabase que lee el panel /gestion.
const express = require('express');
const { supabase } = require('./datos');

const CATEGORIAS_GASTO = ['Stock', 'Marketing', 'Envíos', 'Operativo', 'Impuestos', 'Otro'];
const ESTADOS = ['pendiente', 'en camino', 'entregado', 'cancelado'];

const normalizar = (t) =>
  String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// "$45.990" -> 45990 · "15k" / "15mil" -> 15000
function aMonto(valor) {
  const t = String(valor || '').toLowerCase().trim();
  const miles = /^\$?\s*[\d.,]+\s*(k|mil)$/.test(t);
  const n = Number(t.replace(/,\d{1,2}$/, '').replace(/\D/g, '')) || 0;
  return miles ? n * 1000 : n;
}

const fmt = (n) => '$' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const hoyAR = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

// 5493584123456 y 543584123456 son el mismo número
const normalizarTel = (t) => String(t || '').replace(/\D/g, '').replace(/^549/, '54');

function esDueno(telefono) {
  return Boolean(process.env.OWNER_PHONE) && normalizarTel(telefono) === normalizarTel(process.env.OWNER_PHONE);
}

// ───────── CLIENTES ─────────

// Cada persona que escribe queda como cliente (aunque todavía no compre).
async function registrarContacto(telefono, nombrePerfil) {
  if (!supabase || !telefono) return null;
  const { data: existente } = await supabase.from('clientes').select('id, nombre').eq('telefono', telefono).maybeSingle();
  if (existente) {
    const cambios = { ultimo_contacto: new Date().toISOString() };
    if (!existente.nombre && nombrePerfil) cambios.nombre = nombrePerfil;
    await supabase.from('clientes').update(cambios).eq('id', existente.id);
    return existente.id;
  }
  const { data, error } = await supabase
    .from('clientes')
    .upsert({ telefono, nombre: nombrePerfil || null }, { onConflict: 'telefono' })
    .select('id')
    .single();
  if (error) console.error('Error guardando cliente:', error.message);
  return data?.id || null;
}

// ───────── VENTAS DEL BOT ─────────

function buscarProducto(texto, productos) {
  const t = normalizar(texto);
  if (!t) return null;
  const contenidos = productos.filter((p) => t.includes(normalizar(p.nombre)));
  if (contenidos.length) return contenidos.sort((a, b) => b.nombre.length - a.nombre.length)[0];
  // Si el modelo abrevió el nombre: el producto con más palabras en común (mínimo 60%).
  let mejor = null;
  let puntaje = 0;
  for (const p of productos) {
    const palabras = normalizar(p.nombre).split(' ').filter((w) => w.length > 2);
    if (!palabras.length) continue;
    const s = palabras.filter((w) => t.split(' ').includes(w)).length / palabras.length;
    if (s > puntaje) [mejor, puntaje] = [p, s];
  }
  return puntaje >= 0.6 ? mejor : null;
}

// Entiende la marca [VENTA: ...] del bot. Formato nuevo con "|", y el viejo con comas.
function parsearVenta(resumen, productos) {
  const partes = resumen.includes('|') ? resumen.split('|').map((s) => s.trim()) : null;
  let textoProducto, cantidad = 1, precioTexto, nombre, entrega, pago;

  if (partes && partes.length >= 6) {
    [textoProducto, cantidad, precioTexto, nombre] = partes;
    pago = partes[partes.length - 1];
    entrega = partes.slice(4, -1).join(' | ');
    cantidad = parseInt(cantidad, 10) || 1;
  } else {
    const p = resumen.split(',').map((s) => s.trim());
    const iPrecio = p.findIndex((s, i) => i > 0 && /\$\s*\d|^\d[\d.]{3,}$/.test(s));
    const base = iPrecio > 0 ? iPrecio : 1;
    textoProducto = p.slice(0, base).join(', ');
    precioTexto = p[base];
    nombre = p[base + 1];
    pago = p.length > base + 3 ? p[p.length - 1] : null;
    entrega = p.slice(base + 2, pago ? -1 : undefined).join(', ') || null;
    const c = textoProducto.match(/(?:^|\s)(\d{1,2})\s*(?:u\b|u\.|unid|x\b)|x\s*(\d{1,2})\b/i);
    if (c) cantidad = parseInt(c[1] || c[2], 10) || 1;
  }

  cantidad = Math.min(Math.max(cantidad, 1), 50);
  const producto = buscarProducto(textoProducto, productos) || buscarProducto(resumen, productos);
  // El precio sale de la base, no de lo que escribió el modelo.
  const monto = producto ? Number(producto.precio) * cantidad : aMonto(precioTexto);
  return {
    producto,
    productoTexto: producto ? producto.nombre : textoProducto,
    cantidad,
    monto,
    nombre: nombre || null,
    entrega: entrega || null,
    pago: pago || null,
  };
}

// Guarda la venta como pedido pendiente. Devuelve { pedido, duplicado }.
async function registrarVenta(telefono, resumen, nombrePerfil) {
  if (!supabase) return { pedido: null, duplicado: false };
  const { data: productos } = await supabase.from('productos').select('id, nombre, precio');
  const v = parsearVenta(resumen, productos || []);

  // Evita cargar dos veces la misma venta si el cliente vuelve a confirmar.
  const hace30 = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  let q = supabase.from('pedidos').select('id').eq('telefono', telefono).neq('estado', 'cancelado').gte('created_at', hace30);
  q = v.producto ? q.eq('producto_id', v.producto.id) : q.eq('producto', v.productoTexto);
  const { data: repetido } = await q.limit(1);
  if (repetido?.length) return { pedido: null, duplicado: true, venta: v };

  const clienteId = await registrarContacto(telefono, nombrePerfil);
  if (clienteId && v.nombre) await supabase.from('clientes').update({ nombre: v.nombre }).eq('id', clienteId);

  const { data, error } = await supabase
    .from('pedidos')
    .insert({
      telefono,
      resumen,
      cliente_id: clienteId,
      cliente: v.nombre || nombrePerfil || `+${telefono}`,
      producto_id: v.producto?.id || null,
      producto: v.productoTexto,
      cantidad: v.cantidad,
      monto: v.monto,
      estado: 'pendiente',
      canal: 'WhatsApp',
      entrega: v.entrega,
      pago: v.pago,
      origen: 'bot',
      fecha: hoyAR(),
    })
    .select()
    .single();
  if (error) console.error('Error guardando pedido:', error.message);
  return { pedido: data || null, duplicado: false, venta: v };
}

// ───────── COMANDOS DEL DUEÑO POR WHATSAPP ─────────

const AYUDA_DUENO = `Comandos:
• gasto 15000 marketing Meta Ads
• gasto 35k stock reposición cables
• resumen → ventas y gastos del mes
Categorías: ${CATEGORIAS_GASTO.join(', ')}`;

async function cargarGasto(texto) {
  const [, montoTxt = '', resto = ''] = texto.match(/^gastos?\s+(\S+)\s*(.*)$/i) || [];
  const monto = aMonto(montoTxt);
  if (!monto) return `No entendí el monto. Ejemplo:\ngasto 15000 marketing Meta Ads`;
  const [primera = '', ...demas] = resto.trim().split(/\s+/);
  const cat = CATEGORIAS_GASTO.find((c) => normalizar(c).startsWith(normalizar(primera).replace(/s$/, '')) && primera.length >= 3);
  const categoria = cat || 'Otro';
  const descripcion = (cat ? demas.join(' ') : resto.trim()) || categoria;
  const { error } = await supabase.from('gastos').insert({ descripcion, monto, categoria, fecha: hoyAR(), origen: 'whatsapp' });
  if (error) return `No se pudo guardar el gasto: ${error.message}`;
  return `✅ Gasto cargado: ${fmt(monto)} · ${categoria} · ${descripcion}`;
}

async function resumenMes() {
  const inicio = hoyAR().slice(0, 8) + '01';
  const [{ data: pedidos }, { data: gastos }, { data: productos }] = await Promise.all([
    supabase.from('pedidos').select('monto, estado').gte('fecha', inicio),
    supabase.from('gastos').select('monto').gte('fecha', inicio),
    supabase.from('productos').select('nombre, stock, alerta').eq('activo', true),
  ]);
  const validos = (pedidos || []).filter((p) => p.estado !== 'cancelado');
  const ventas = validos.reduce((a, p) => a + Number(p.monto), 0);
  const gasto = (gastos || []).reduce((a, g) => a + Number(g.monto), 0);
  const pendientes = validos.filter((p) => p.estado === 'pendiente').length;
  const bajo = (productos || []).filter((p) => p.stock <= p.alerta).map((p) => `${p.nombre} (${p.stock})`);
  return `📊 Resumen del mes
Ventas: ${fmt(ventas)} (${validos.length} pedidos)
Gastos: ${fmt(gasto)}
Resultado: ${fmt(ventas - gasto)}
Pendientes de entregar: ${pendientes}${bajo.length ? `\n⚠️ Stock bajo: ${bajo.join(', ')}` : ''}`;
}

// Si el mensaje del dueño es un comando, devuelve la respuesta. Si no, null (y el bot responde normal).
async function comandoDueno(texto) {
  if (!supabase) return null;
  const t = texto.trim();
  if (/^gastos?\s+\S/i.test(t)) return cargarGasto(t);
  if (/^resumen$/i.test(t)) return resumenMes();
  if (/^(ayuda|comandos)$/i.test(t)) return AYUDA_DUENO;
  return null;
}

// ───────── API DEL PANEL /gestion ─────────

const CAMPOS = {
  productos: ['nombre', 'categoria', 'precio', 'costo', 'stock', 'alerta', 'descripcion', 'cuotas_sin_interes', 'activo', 'imagen_url'],
  pedidos: ['cliente', 'cliente_id', 'telefono', 'producto_id', 'producto', 'cantidad', 'monto', 'estado', 'canal', 'entrega', 'pago', 'fecha'],
  gastos: ['descripcion', 'monto', 'categoria', 'fecha'],
  clientes: ['nombre', 'telefono', 'notas', 'origen'],
};
const NUMERICOS = ['precio', 'costo', 'stock', 'alerta', 'cuotas_sin_interes', 'cantidad', 'monto', 'producto_id', 'cliente_id'];

function limpiar(tabla, body) {
  const out = {};
  for (const k of CAMPOS[tabla]) {
    if (!(k in body)) continue;
    let v = body[k];
    if (v === '') v = null;
    if (NUMERICOS.includes(k) && v !== null) v = Number(v);
    out[k] = v;
  }
  if (out.estado && !ESTADOS.includes(out.estado)) delete out.estado;
  if (tabla === 'clientes' && out.telefono) out.telefono = out.telefono.replace(/\D/g, '') || null;
  return out;
}

function router(chequearClave) {
  const r = express.Router();
  r.use(chequearClave);
  r.use((req, res, next) => (supabase ? next() : res.status(503).json({ error: 'Faltan SUPABASE_URL o SUPABASE_KEY en Render.' })));

  const responder = (res, { data, error }) => (error ? res.status(400).json({ error: error.message }) : res.json(data ?? { ok: true }));

  r.get('/datos', async (req, res) => {
    const [productos, pedidos, gastos, clientes] = await Promise.all([
      supabase.from('productos').select('*').order('nombre'),
      supabase.from('pedidos').select('*').order('created_at', { ascending: false }).limit(2000),
      supabase.from('gastos').select('*').order('fecha', { ascending: false }).limit(2000),
      supabase.from('clientes').select('*').order('ultimo_contacto', { ascending: false }).limit(2000),
    ]);
    const error = productos.error || pedidos.error || gastos.error || clientes.error;
    if (error) {
      const falta = /does not exist|schema cache|column/i.test(error.message);
      return res.status(500).json({ error: falta ? `Falta correr supabase-gestion.sql en Supabase (${error.message})` : error.message });
    }
    res.json({ productos: productos.data, pedidos: pedidos.data, gastos: gastos.data, clientes: clientes.data });
  });

  // Pedido cargado a mano: resuelve el producto y el cliente.
  r.post('/pedidos', async (req, res) => {
    const p = limpiar('pedidos', req.body);
    if (p.producto_id) {
      const { data: prod } = await supabase.from('productos').select('nombre').eq('id', p.producto_id).maybeSingle();
      if (prod) p.producto = prod.nombre;
    }
    if (!p.cliente_id && p.cliente) {
      const tel = (p.telefono || '').replace(/\D/g, '') || null;
      const { data: c } = tel
        ? await supabase.from('clientes').select('id').eq('telefono', tel).maybeSingle()
        : await supabase.from('clientes').select('id').ilike('nombre', p.cliente).is('telefono', null).maybeSingle();
      if (c) p.cliente_id = c.id;
      else {
        const { data: nuevo } = await supabase.from('clientes').insert({ nombre: p.cliente, telefono: tel, origen: p.canal || 'Panel' }).select('id').single();
        p.cliente_id = nuevo?.id || null;
      }
      p.telefono = tel;
    }
    responder(res, await supabase.from('pedidos').insert({ ...p, origen: 'panel' }).select().single());
  });

  // Ajuste +/- de stock desde el panel.
  r.post('/productos/:id/stock', async (req, res) => {
    const { data: prod, error } = await supabase.from('productos').select('stock').eq('id', req.params.id).single();
    if (error) return res.status(400).json({ error: error.message });
    const stock = Math.max(0, prod.stock + (Number(req.body.delta) || 0));
    responder(res, await supabase.from('productos').update({ stock }).eq('id', req.params.id).select().single());
  });

  for (const tabla of Object.keys(CAMPOS)) {
    if (tabla !== 'pedidos') {
      r.post(`/${tabla}`, async (req, res) => responder(res, await supabase.from(tabla).insert(limpiar(tabla, req.body)).select().single()));
    }
    r.patch(`/${tabla}/:id`, async (req, res) =>
      responder(res, await supabase.from(tabla).update(limpiar(tabla, req.body)).eq('id', req.params.id).select().single())
    );
    r.delete(`/${tabla}/:id`, async (req, res) => responder(res, await supabase.from(tabla).delete().eq('id', req.params.id)));
  }
  return r;
}

module.exports = { registrarContacto, registrarVenta, parsearVenta, comandoDueno, esDueno, router, fmt };
