// ASISTENTE IA de /gestion y /contenido: un chat que conoce los datos reales del negocio
// (stock, ventas, gastos, clientes, contenido) y puede hacer cambios.
// Regla de oro: consulta sola, pero NUNCA cambia nada sin que el dueño toque "Confirmar".
// Claude propone la acción → el panel muestra la tarjeta → recién ahí se ejecuta (POST /ejecutar).
const express = require('express');
const { supabase } = require('./datos');
const negocio = require('./negocio');
const { llamarClaude, MODELO_TEXTOS } = require('./claude');
const { promoVigente, precioPromo, precioEfectivo, efectivoVigente } = require('./promo');
const gestion = require('./gestion');

const TZ = 'America/Argentina/Buenos_Aires';
const fmt = gestion.fmt;
const hoyAR = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
const haceDias = (n) => new Date(Date.now() - n * 864e5).toLocaleDateString('en-CA', { timeZone: TZ });
const aISO = (dia, hora) => new Date(`${dia}T${hora || '20:00'}:00-03:00`).toISOString();
const fechaHoraAR = (ts) => (ts ? new Date(ts).toLocaleString('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) + ' hs' : '');

// ───────── HERRAMIENTAS ─────────
// "consulta": se ejecutan solas. "accion": se proponen y esperan confirmación.

const fecha = { type: 'string', description: 'Fecha YYYY-MM-DD' };
const HERRAMIENTAS = [
  {
    tipo: 'consulta',
    name: 'totales',
    description: 'Calcula totales EXACTOS de ventas y gastos en un período (usala siempre que tengas que sumar plata o unidades, no sumes a mano). Opcionalmente filtra por producto o categoría de producto.',
    input_schema: {
      type: 'object',
      properties: { desde: fecha, hasta: fecha, producto_id: { type: 'integer' }, categoria: { type: 'string' } },
      required: ['desde', 'hasta'],
    },
  },
  {
    tipo: 'consulta',
    name: 'buscar_pedidos',
    description: 'Lista pedidos (más de los que ves en el resumen, cualquier fecha). Filtros opcionales.',
    input_schema: {
      type: 'object',
      properties: {
        desde: fecha, hasta: fecha, cliente: { type: 'string', description: 'Parte del nombre o teléfono' },
        producto_id: { type: 'integer' }, estado: { type: 'string', enum: gestion.ESTADOS },
      },
    },
  },
  {
    tipo: 'consulta',
    name: 'buscar_clientes',
    description: 'Busca clientes por nombre o teléfono y devuelve sus compras.',
    input_schema: { type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'] },
  },
  {
    tipo: 'accion',
    name: 'registrar_venta',
    description: 'Carga una venta (pedido). El stock baja solo. monto = TOTAL cobrado (precio final × cantidad, con promo y descuento de efectivo si corresponde).',
    input_schema: {
      type: 'object',
      properties: {
        producto_id: { type: 'integer' }, cantidad: { type: 'integer' }, monto: { type: 'number' },
        cliente: { type: 'string' }, telefono: { type: 'string' },
        pago: { type: 'string', description: 'Efectivo, Transferencia, Mercado Pago, Tarjeta…' },
        canal: { type: 'string', description: 'WhatsApp, Instagram, Marketplace, Local…' },
        entrega: { type: 'string' }, estado: { type: 'string', enum: gestion.ESTADOS }, fecha,
      },
      required: ['producto_id', 'cantidad', 'monto', 'cliente'],
    },
  },
  {
    tipo: 'accion',
    name: 'cambiar_estado_pedido',
    description: 'Cambia el estado de un pedido (cancelado devuelve el stock).',
    input_schema: { type: 'object', properties: { pedido_id: { type: 'integer' }, estado: { type: 'string', enum: gestion.ESTADOS } }, required: ['pedido_id', 'estado'] },
  },
  {
    tipo: 'accion',
    name: 'cargar_gasto',
    description: 'Registra un gasto. "Stock" es compra de mercadería.',
    input_schema: {
      type: 'object',
      properties: { descripcion: { type: 'string' }, monto: { type: 'number' }, categoria: { type: 'string', enum: gestion.CATEGORIAS_GASTO }, fecha },
      required: ['descripcion', 'monto', 'categoria'],
    },
  },
  {
    tipo: 'accion',
    name: 'ajustar_stock',
    description: 'Suma (delta positivo, ej. llegó mercadería) o resta unidades de stock de un producto.',
    input_schema: { type: 'object', properties: { producto_id: { type: 'integer' }, delta: { type: 'integer' } }, required: ['producto_id', 'delta'] },
  },
  {
    tipo: 'accion',
    name: 'actualizar_producto',
    description: 'Cambia datos de un producto: precio de lista, costo, alerta de stock, cuotas, descripción, categoría, nombre, o activarlo/pausarlo. Mandá solo los campos que cambian.',
    input_schema: {
      type: 'object',
      properties: {
        producto_id: { type: 'integer' }, nombre: { type: 'string' }, categoria: { type: 'string' }, precio: { type: 'number' }, costo: { type: 'number' },
        alerta: { type: 'integer' }, cuotas_sin_interes: { type: 'integer' }, descripcion: { type: 'string' }, activo: { type: 'boolean' },
      },
      required: ['producto_id'],
    },
  },
  {
    tipo: 'accion',
    name: 'crear_producto',
    description: 'Da de alta un producto nuevo en el stock.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' }, categoria: { type: 'string' }, precio: { type: 'number' }, costo: { type: 'number' },
        stock: { type: 'integer' }, alerta: { type: 'integer' }, descripcion: { type: 'string' },
      },
      required: ['nombre', 'precio'],
    },
  },
  {
    tipo: 'accion',
    name: 'configurar_promo',
    description: 'Configura la promo general: descuento % (0 = sin descuento), fecha límite y producto de regalo para una categoría. Mandá solo lo que cambia.',
    input_schema: {
      type: 'object',
      properties: { promo_descuento: { type: 'number' }, promo_hasta: fecha, promo_regalo_id: { type: 'integer', description: '0 = sin regalo' }, promo_regalo_categoria: { type: 'string' } },
    },
  },
  {
    tipo: 'accion',
    name: 'crear_contenido',
    description: 'Crea una pieza de contenido con imágenes de la marca (tarda ~1 minuto). Opcionalmente la deja programada.',
    input_schema: {
      type: 'object',
      properties: {
        formato: { type: 'string', enum: ['carrusel', 'post', 'historias', 'marketplace'] },
        plantilla: { type: 'string', enum: ['producto', 'coleccion', 'comparativa', 'tips', 'promo', 'libre'], description: 'producto/coleccion/comparativa necesitan productos (comparativa: 2). marketplace: 1 producto.' },
        tema: { type: 'string', description: 'Idea, ángulo y detalles para el texto' },
        producto_ids: { type: 'array', items: { type: 'integer' } },
        programar_dia: fecha, programar_hora: { type: 'string', description: 'HH:MM (hora Argentina)' },
      },
      required: ['formato', 'plantilla', 'tema'],
    },
  },
  {
    tipo: 'accion',
    name: 'programar_contenido',
    description: 'Programa (o reprograma) una pieza ya creada para publicarse en Instagram. quitar=true la saca de la agenda.',
    input_schema: {
      type: 'object',
      properties: { pieza_id: { type: 'integer' }, dia: fecha, hora: { type: 'string', description: 'HH:MM' }, quitar: { type: 'boolean' } },
      required: ['pieza_id'],
    },
  },
];
const TIPO = Object.fromEntries(HERRAMIENTAS.map((h) => [h.name, h.tipo]));
const PARA_CLAUDE = HERRAMIENTAS.map(({ tipo, ...h }) => h);

// ───────── FOTO DEL NEGOCIO (va en el prompt) ─────────

async function fotoNegocio() {
  const desde = haceDias(120);
  const [prod, ped, gas, cli, piezas, promo] = await Promise.all([
    supabase.from('productos').select('id, nombre, categoria, precio, costo, stock, alerta, activo, imagen_url, cuotas_sin_interes').order('nombre'),
    supabase.from('pedidos').select('id, fecha, cliente, producto_id, producto, cantidad, monto, costo, estado, pago, canal').gte('fecha', desde).order('fecha', { ascending: false }).limit(600),
    supabase.from('gastos').select('fecha, categoria, monto, descripcion').gte('fecha', desde).order('fecha', { ascending: false }).limit(300),
    supabase.from('clientes').select('id', { count: 'exact', head: true }),
    supabase.from('piezas').select('id, formato, plantilla, titulo, estado, programado_para, publicado_at, error, producto_ids').order('created_at', { ascending: false }).limit(40),
    promoVigente(),
  ]);
  const productos = prod.data || [];
  const pedidos = ped.data || [];
  const nombreProd = Object.fromEntries(productos.map((p) => [p.id, p.nombre]));

  // Unidades vendidas en 30 días por producto: sirve para sugerir reposición.
  const hace30 = haceDias(30);
  const vendidas30 = {};
  for (const p of pedidos) if (p.estado !== 'cancelado' && p.fecha >= hace30 && p.producto_id) vendidas30[p.producto_id] = (vendidas30[p.producto_id] || 0) + Number(p.cantidad || 1);

  const lineasProd = productos.map((p) => {
    const precio = Number(p.precio) || 0;
    const final = promo?.descuento ? precioPromo(precio, promo) : precio;
    const margen = p.costo ? Math.round(((final - p.costo) / final) * 100) + '%' : 's/costo';
    return [p.id, p.nombre, p.categoria || '-', fmt(precio), final !== precio ? fmt(final) : '', fmt(precioEfectivo(final, promo)), p.costo ? fmt(p.costo) : '-', margen, p.stock, p.alerta, vendidas30[p.id] || 0, p.activo === false ? 'PAUSADO' : '', p.imagen_url ? 'foto' : 'SIN FOTO'].join(' | ');
  });
  const lineasPed = pedidos.slice(0, 150).map((p) => [p.id, p.fecha, p.cliente, p.producto || nombreProd[p.producto_id] || '-', p.cantidad, fmt(p.monto), p.costo != null ? fmt(p.costo) : '-', p.estado, p.pago || '-', p.canal || '-'].join(' | '));
  const lineasGas = (gas.data || []).slice(0, 80).map((g) => [g.fecha, g.categoria, fmt(g.monto), g.descripcion].join(' | '));
  const lineasPiezas = (piezas.data || []).map((p) => [p.id, p.formato, p.plantilla, p.titulo, p.estado, p.programado_para ? fechaHoraAR(p.programado_para) : '', p.publicado_at ? fechaHoraAR(p.publicado_at) : '', p.error || ''].join(' | '));

  const mes = hoyAR().slice(0, 8) + '01';
  const tot = await totales({ desde: mes, hasta: hoyAR() });
  return {
    productos,
    texto: `HOY: ${new Date().toLocaleDateString('es-AR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${hoyAR()}), ${new Date().toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })} hs.

MES EN CURSO (calculado): ventas ${fmt(tot.ventas)} en ${tot.pedidos} pedidos (${tot.unidades} unidades) · costo de lo vendido ${fmt(tot.costoVendido)} · gastos operativos ${fmt(tot.gastosOperativos)} · compras de stock ${fmt(tot.comprasStock)} · GANANCIA REAL ${fmt(tot.ganancia)}${tot.sinCosto ? ` (ojo: ${tot.sinCosto} ventas sin costo cargado)` : ''} · pendientes de entregar: ${pedidos.filter((p) => p.estado === 'pendiente').length}.
Clientes registrados: ${cli.count ?? '?'}.
PROMO: ${promo ? `${promo.descuento}% OFF hasta ${promo.hasta}${promo.regaloId ? ` + regalo "${nombreProd[promo.regaloId] || promo.regaloId}" en ${promo.regaloCategoria}` : ''}` : 'ninguna vigente'}.
Descuento por pago en efectivo hoy: ${efectivoVigente(promo)}%${promo?.descuento && !efectivoVigente(promo) ? ' (no se suma a la promo: durante la promo efectivo paga el precio promo)' : ''}.

PRODUCTOS (id | nombre | categoría | precio lista | precio con promo | precio efectivo | costo | margen | stock | alerta | vendidas 30d | estado | foto):
${lineasProd.join('\n')}

ÚLTIMOS PEDIDOS, 120 días (id | fecha | cliente | producto | cant | monto | costo | estado | pago | canal):
${lineasPed.join('\n') || '(ninguno)'}

ÚLTIMOS GASTOS (fecha | categoría | monto | descripción):
${lineasGas.join('\n') || '(ninguno)'}

CONTENIDO, últimas piezas (id | formato | plantilla | título | estado | programado | publicado | error):
${lineasPiezas.join('\n') || '(ninguna)'}`,
  };
}

const SISTEMA = (app, foto) => `Sos el asistente de negocio de ${negocio.nombre} (${negocio.ciudad}, Argentina), una tienda de tecnología (smartwatches, auriculares, AirPods, cargadores, accesorios) que vende por web, WhatsApp e Instagram (${negocio.instagram}). Hablás con Valen, el dueño (22 años, ejecutor). Ahora está en ${app === 'contenido' ? 'el estudio de CONTENIDO (Instagram y Marketplace)' : 'el sistema de GESTIÓN (ventas, stock, clientes, finanzas)'}, pero podés ayudar con todo el negocio.

CÓMO RESPONDÉS
- Español rioplatense, directo, sin relleno. Primero la respuesta, después el porqué en 1–3 líneas. Cerrá con el próximo paso concreto cuando sirva.
- Respuestas cortas, aptas para leer en el celular. Usá viñetas y negritas con **asteriscos**. Nada de tablas anchas.
- Plata en pesos con punto de miles ($45.990). Pensá en contexto argentino: inflación, reposición a costo actualizado, cuidar la caja.
- Usá SOLO los datos de abajo o de tus herramientas. Si algo no está, decilo. Nunca inventes ventas, costos ni números.
- Para sumar plata o unidades de un período usá la herramienta "totales" (no sumes a mano).

ACCIONES (cargar venta, gasto, stock, precios, promo, crear o programar contenido)
- Cuando Valen pida un cambio, llamá directamente a la herramienta: NO se ejecuta hasta que él toque "Confirmar" en la tarjeta. No le preguntes "¿confirmás?" en texto.
- Si falta un dato imprescindible (qué producto, cuánto), preguntá antes en una sola línea. Lo que tenga un valor obvio, completalo (cantidad 1, fecha hoy, estado pendiente, canal WhatsApp).
- Identificá productos por su id de la lista. Si hay dos parecidos y no está claro, preguntá cuál.
- Venta: monto = total cobrado. Usá el precio con promo si hay promo vigente; si paga en efectivo usá la columna "precio efectivo" (ya trae el descuento que corresponde hoy). Si Valen dice el monto, respetalo.
- Podés proponer varias acciones juntas si te las pide (ej. "llegaron 5 de cada uno").
- Contenido: para carrusel/post/historias elegí la plantilla que mejor encaje y escribí en "tema" el ángulo y el gancho. Si pide programar, horarios que suelen rendir en Instagram AR: 12–14 h y 19–22 h.

DATOS ACTUALES
${foto}`;

// ───────── CONSULTAS ─────────

async function totales({ desde, hasta, producto_id, categoria }) {
  let qp = supabase.from('pedidos').select('monto, costo, cantidad, estado, producto_id, pago, canal').gte('fecha', desde).lte('fecha', hasta).limit(5000);
  if (producto_id) qp = qp.eq('producto_id', producto_id);
  const filtrarProducto = Boolean(producto_id || categoria);
  const [{ data: ped }, { data: gas }, prods] = await Promise.all([
    qp,
    filtrarProducto ? { data: [] } : supabase.from('gastos').select('monto, categoria').gte('fecha', desde).lte('fecha', hasta).limit(5000),
    categoria ? supabase.from('productos').select('id').ilike('categoria', categoria) : { data: null },
  ]);
  let validos = (ped || []).filter((p) => p.estado !== 'cancelado');
  if (prods.data) {
    const ids = new Set(prods.data.map((p) => p.id));
    validos = validos.filter((p) => ids.has(p.producto_id));
  }
  const m = gestion.margenReal(validos, gas || []);
  const porPago = {};
  for (const p of validos) porPago[p.pago || 'sin dato'] = (porPago[p.pago || 'sin dato'] || 0) + Number(p.monto);
  return {
    desde, hasta, pedidos: validos.length, unidades: validos.reduce((a, p) => a + Number(p.cantidad || 1), 0),
    ventas: m.ventas, costoVendido: m.costoVendido, sinCosto: m.sinCosto,
    gastosOperativos: filtrarProducto ? null : m.gastosOperativos,
    comprasStock: filtrarProducto ? null : (gas || []).filter((g) => g.categoria === 'Stock').reduce((a, g) => a + Number(g.monto), 0),
    ganancia: filtrarProducto ? m.ventas - m.costoVendido : m.ganancia,
    ventasPorPago: porPago,
    cancelados: (ped || []).length - (ped || []).filter((p) => p.estado !== 'cancelado').length,
  };
}

async function buscarPedidos({ desde, hasta, cliente, producto_id, estado }) {
  let q = supabase.from('pedidos').select('id, fecha, cliente, telefono, producto, cantidad, monto, costo, estado, pago, canal, entrega').order('fecha', { ascending: false }).limit(80);
  if (desde) q = q.gte('fecha', desde);
  if (hasta) q = q.lte('fecha', hasta);
  if (producto_id) q = q.eq('producto_id', producto_id);
  if (estado) q = q.eq('estado', estado);
  if (cliente) q = q.or(`cliente.ilike.%${cliente.replace(/[,()%]/g, '')}%,telefono.ilike.%${cliente.replace(/\D/g, '') || 'x'}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

async function buscarClientes({ texto }) {
  const t = String(texto || '').replace(/[,()%]/g, '');
  const { data: clientes, error } = await supabase.from('clientes').select('id, nombre, telefono, notas, origen, ultimo_contacto')
    .or(`nombre.ilike.%${t}%,telefono.ilike.%${t.replace(/\D/g, '') || 'x'}%`).limit(10);
  if (error) throw new Error(error.message);
  if (!clientes.length) return [];
  const { data: ped } = await supabase.from('pedidos').select('cliente_id, fecha, producto, monto, estado').in('cliente_id', clientes.map((c) => c.id)).order('fecha', { ascending: false });
  return clientes.map((c) => {
    const compras = (ped || []).filter((p) => p.cliente_id === c.id && p.estado !== 'cancelado');
    return { ...c, compras: compras.length, total: compras.reduce((a, p) => a + Number(p.monto), 0), ultimas: compras.slice(0, 5) };
  });
}

const CONSULTAS = { totales, buscar_pedidos: buscarPedidos, buscar_clientes: buscarClientes };

// ───────── ACCIONES ─────────

// Texto corto para la tarjeta de confirmación.
function resumirAccion(nombre, d, productos) {
  const prod = (id) => productos.find((p) => p.id === Number(id))?.nombre || `producto #${id}`;
  switch (nombre) {
    case 'registrar_venta':
      return { titulo: 'Cargar venta', detalle: `${d.cantidad || 1}× ${prod(d.producto_id)} · ${fmt(d.monto)}\n${d.cliente}${d.telefono ? ' · ' + d.telefono : ''}${d.pago ? ' · ' + d.pago : ''}${d.canal ? ' · ' + d.canal : ''} · ${d.estado || 'pendiente'}${d.fecha && d.fecha !== hoyAR() ? ' · ' + d.fecha : ''}` };
    case 'cambiar_estado_pedido':
      return { titulo: 'Cambiar estado de pedido', detalle: `Pedido #${d.pedido_id} → ${d.estado}` };
    case 'cargar_gasto':
      return { titulo: 'Cargar gasto', detalle: `${fmt(d.monto)} · ${d.categoria} · ${d.descripcion}${d.fecha && d.fecha !== hoyAR() ? ' · ' + d.fecha : ''}` };
    case 'ajustar_stock': {
      const p = productos.find((x) => x.id === Number(d.producto_id));
      return { titulo: 'Ajustar stock', detalle: `${prod(d.producto_id)}: ${d.delta > 0 ? '+' : ''}${d.delta}${p ? ` (queda en ${Math.max(0, p.stock + Number(d.delta))})` : ''}` };
    }
    case 'actualizar_producto': {
      const p = productos.find((x) => x.id === Number(d.producto_id)) || {};
      const etiquetas = { nombre: 'Nombre', categoria: 'Categoría', precio: 'Precio', costo: 'Costo', alerta: 'Alerta', cuotas_sin_interes: 'Cuotas', descripcion: 'Descripción', activo: 'Activo' };
      const cambios = Object.keys(etiquetas).filter((k) => k in d).map((k) => {
        const v = (x) => (['precio', 'costo'].includes(k) ? fmt(x) : k === 'activo' ? (x === false ? 'pausado' : 'sí') : x ?? '—');
        return `${etiquetas[k]}: ${k in p ? v(p[k]) + ' → ' : ''}${v(d[k])}`;
      });
      return { titulo: `Editar ${prod(d.producto_id)}`, detalle: cambios.join('\n') || 'Sin cambios' };
    }
    case 'crear_producto':
      return { titulo: 'Nuevo producto', detalle: `${d.nombre} · ${d.categoria || 'sin categoría'} · ${fmt(d.precio)}${d.costo ? ' · costo ' + fmt(d.costo) : ''} · stock ${d.stock || 0}` };
    case 'configurar_promo':
      return {
        titulo: 'Configurar promo',
        detalle: [
          'promo_descuento' in d && `Descuento: ${d.promo_descuento}%`,
          d.promo_hasta && `Hasta: ${d.promo_hasta}`,
          'promo_regalo_id' in d && `Regalo: ${d.promo_regalo_id ? prod(d.promo_regalo_id) : 'ninguno'}`,
          d.promo_regalo_categoria && `Regalo con: ${d.promo_regalo_categoria}`,
        ].filter(Boolean).join('\n'),
      };
    case 'crear_contenido':
      return {
        titulo: `Crear ${d.formato}${d.formato !== 'marketplace' ? ' · ' + d.plantilla : ''}`,
        detalle: `${d.tema}${(d.producto_ids || []).length ? '\nProductos: ' + d.producto_ids.map(prod).join(', ') : ''}${d.programar_dia ? `\n📅 Programado: ${d.programar_dia} ${d.programar_hora || '20:00'}` : ''}\n(tarda ~1 minuto)`,
      };
    case 'programar_contenido':
      return { titulo: d.quitar ? 'Quitar de la agenda' : 'Programar publicación', detalle: `Pieza #${d.pieza_id}${d.quitar ? '' : ` → ${d.dia || hoyAR()} ${d.hora || '20:00'}`}` };
    default:
      return { titulo: nombre, detalle: JSON.stringify(d) };
  }
}

const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

const ACCIONES = {
  async registrar_venta(d) {
    const fila = await ok(await gestion.crearPedido({ ...d, cantidad: d.cantidad || 1, estado: d.estado || 'pendiente', canal: d.canal || 'WhatsApp', fecha: d.fecha || hoyAR() }));
    return { mensaje: `Venta #${fila.id} cargada: ${fila.cantidad}× ${fila.producto} · ${fmt(fila.monto)}. El stock ya se descontó.`, app: 'gestion' };
  },
  async cambiar_estado_pedido(d) {
    if (!gestion.ESTADOS.includes(d.estado)) throw new Error('Estado inválido');
    const f = await ok(await supabase.from('pedidos').update({ estado: d.estado }).eq('id', d.pedido_id).select('id, producto').single());
    return { mensaje: `Pedido #${f.id} (${f.producto}) → ${d.estado}.` };
  },
  async cargar_gasto(d) {
    if (!(Number(d.monto) > 0)) throw new Error('Monto inválido');
    const categoria = gestion.CATEGORIAS_GASTO.includes(d.categoria) ? d.categoria : 'Otro';
    await ok(await supabase.from('gastos').insert({ descripcion: d.descripcion || categoria, monto: Number(d.monto), categoria, fecha: d.fecha || hoyAR(), origen: 'asistente' }).select().single());
    return { mensaje: `Gasto cargado: ${fmt(d.monto)} · ${categoria} · ${d.descripcion}.` };
  },
  async ajustar_stock(d) {
    const p = await ok(await gestion.ajustarStock(d.producto_id, d.delta));
    return { mensaje: `${p.nombre}: stock ${p.stock}.` };
  },
  async actualizar_producto({ producto_id, ...d }) {
    const cambios = gestion.limpiar('productos', d);
    if (!Object.keys(cambios).length) throw new Error('No hay cambios');
    const p = await ok(await supabase.from('productos').update(cambios).eq('id', producto_id).select('nombre').single());
    return { mensaje: `${p.nombre} actualizado.` };
  },
  async crear_producto(d) {
    const fila = gestion.limpiar('productos', { stock: 0, alerta: 2, activo: true, ...d });
    const p = await ok(await supabase.from('productos').insert(fila).select('id, nombre').single());
    return { mensaje: `Producto creado: ${p.nombre} (#${p.id}). Cargale la foto en Stock.` };
  },
  async configurar_promo(d) {
    const claves = ['promo_descuento', 'promo_hasta', 'promo_regalo_id', 'promo_regalo_categoria'].filter((k) => k in d);
    if (!claves.length) throw new Error('No hay cambios');
    for (const k of claves) await gestion.guardarAjuste(k, d[k]);
    return { mensaje: 'Promo actualizada. Ya la usan el bot, el catálogo y el contenido.' };
  },
  async crear_contenido(d) {
    const { crearPieza } = require('./contenido');
    const programado_para = d.programar_dia ? aISO(d.programar_dia, d.programar_hora) : null;
    const id = await crearPieza({ formato: d.formato, plantilla: d.plantilla, tema: d.tema, producto_ids: d.producto_ids || [], programado_para });
    return { mensaje: `Pieza #${id} creada${programado_para ? ' y programada' : ''}. La ves en Contenido → Biblioteca.`, pieza_id: id };
  },
  async programar_contenido(d) {
    const c = d.quitar
      ? { programado_para: null, estado: 'borrador', avisado: false, error: null }
      : { programado_para: aISO(d.dia || hoyAR(), d.hora), estado: 'programado', avisado: false, error: null };
    const p = await ok(await supabase.from('piezas').update(c).eq('id', d.pieza_id).select('id, titulo').single());
    return { mensaje: d.quitar ? `"${p.titulo}" salió de la agenda.` : `"${p.titulo}" programada para ${fechaHoraAR(c.programado_para)}.`, pieza_id: p.id };
  },
};

// ───────── CONVERSACIÓN ─────────

async function conversar({ mensajes, app }) {
  const foto = await fotoNegocio();
  // Solo texto plano del historial, alternando usuario/asistente y empezando por el usuario.
  const hist = [];
  for (const m of (mensajes || []).slice(-20)) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = String(m.content || '').slice(0, 4000).trim();
    if (!content) continue;
    if (hist.length && hist[hist.length - 1].role === role) hist[hist.length - 1].content += '\n' + content;
    else hist.push({ role, content });
  }
  while (hist.length && hist[0].role !== 'user') hist.shift();
  if (!hist.length) throw Object.assign(new Error('Escribí algo'), { status: 400 });

  const system = SISTEMA(app, foto.texto);
  const msgs = [...hist];
  const textos = [];
  for (let vuelta = 0; vuelta < 6; vuelta++) {
    const r = await llamarClaude({ model: MODELO_TEXTOS, max_tokens: 4000, output_config: { effort: 'low' }, system, tools: PARA_CLAUDE, messages: msgs }, 90000);
    if (r.stop_reason === 'refusal') throw new Error('Claude no quiso responder ese mensaje');
    const texto = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (texto) textos.push(texto);
    const usos = r.content.filter((b) => b.type === 'tool_use');
    if (r.stop_reason !== 'tool_use' || !usos.length) break;

    const acciones = usos.filter((u) => TIPO[u.name] === 'accion');
    if (acciones.length) {
      return {
        texto: textos.join('\n\n'),
        acciones: acciones.map((u) => ({ herramienta: u.name, datos: u.input, ...resumirAccion(u.name, u.input, foto.productos) })),
      };
    }
    msgs.push({ role: 'assistant', content: r.content });
    const resultados = [];
    for (const u of usos) {
      let contenido;
      try {
        contenido = JSON.stringify(await CONSULTAS[u.name](u.input || {}));
      } catch (e) {
        contenido = `Error: ${e.message}`;
      }
      resultados.push({ type: 'tool_result', tool_use_id: u.id, content: contenido.slice(0, 30000) });
    }
    msgs.push({ role: 'user', content: resultados });
  }
  return { texto: textos.join('\n\n') || 'No pude armar una respuesta. Probá preguntarlo de otra forma.', acciones: [] };
}

function router(chequearClave, explicarError = (e) => e.message) {
  const r = express.Router();
  r.use(chequearClave);
  r.use((req, res, next) => (supabase ? next() : res.status(503).json({ error: 'Faltan SUPABASE_URL o SUPABASE_KEY en Render.' })));

  r.post('/chat', async (req, res) => {
    if (!process.env.CLAUDE_API_KEY) return res.status(503).json({ error: 'Falta CLAUDE_API_KEY en Render.' });
    try {
      res.json(await conversar({ mensajes: req.body.mensajes, app: req.body.app }));
    } catch (e) {
      console.error('Asistente:', e.response?.data || e.message);
      res.status(e.status || 500).json({ error: e.status ? e.message : explicarError(e) });
    }
  });

  // Ejecuta una acción que el dueño confirmó en la tarjeta.
  r.post('/ejecutar', async (req, res) => {
    const { herramienta, datos } = req.body || {};
    if (!ACCIONES[herramienta]) return res.status(400).json({ error: 'Acción desconocida' });
    try {
      res.json({ ok: true, ...(await ACCIONES[herramienta](datos || {})) });
    } catch (e) {
      console.error('Asistente acción:', herramienta, e.response?.data || e.message);
      res.status(e.status || 500).json({ error: e.status ? e.message : explicarError(e) });
    }
  });
  return r;
}

module.exports = { router, conversar, fotoNegocio, ACCIONES, resumirAccion, HERRAMIENTAS };
