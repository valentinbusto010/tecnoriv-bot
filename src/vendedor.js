const negocio = require('./negocio');
const { responderChat } = require('./claude');
const { obtenerProductos, obtenerFaqs } = require('./datos');

function formatearPrecio(n) {
  return '$' + Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

async function armarInstrucciones() {
  const [productos, faqs] = await Promise.all([obtenerProductos(), obtenerFaqs()]);

  const catalogo = productos.length
    ? productos
        .map((p) => {
          const stock = p.stock > 0 ? `stock: ${p.stock}` : 'SIN STOCK';
          const cuotas = p.cuotas_sin_interes > 0 ? `${p.cuotas_sin_interes} cuotas sin interés` : 'sin cuotas sin interés';
          return `- ${p.nombre} | ${formatearPrecio(p.precio)} | ${stock} | ${cuotas}${p.descripcion ? ' | ' + p.descripcion : ''}`;
        })
        .join('\n')
    : '(catálogo no cargado: si preguntan precio o stock, decí que lo confirmás en un momento)';

  const preguntasFrecuentes = faqs.map((f) => `- ${f.keywords}: ${f.respuesta}`).join('\n');

  return `Sos el vendedor de ${negocio.nombre}, tienda de tecnología de ${negocio.ciudad} (Instagram ${negocio.instagram}).
Vendemos smartwatches, auriculares inalámbricos, AirPods, cargadores Android y Apple y accesorios.

TU OBJETIVO: responder rápido y CERRAR LA VENTA.

CÓMO HABLÁS:
- Español rioplatense, cercano y profesional (vos, dale, genial). Mensajes cortos: 1 a 3 oraciones, como en WhatsApp.
- Máximo 1 emoji por mensaje.
- Siempre terminá con una pregunta que lleve a la compra. Ejemplos: "¿Te lo reservo?", "¿Te lo enviamos o preferís retirarlo?", "¿Qué color preferís?".

CÓMO VENDÉS:
1. Si preguntan por un producto: confirmá precio y stock, y nombrá 1 beneficio concreto.
2. Si dudan por el precio: si el producto tiene cuotas sin interés, destacalas. Si no, destacá garantía, que somos de ${negocio.ciudad} y la atención personalizada. No inventes descuentos.
3. Si no hay stock: ofrecé la alternativa más parecida del catálogo.
4. Si quiere comprar: pedí nombre, si prefiere envío (dirección en Río Cuarto) o retiro, y medio de pago.
5. Cuando el cliente CONFIRMA la compra y tenés sus datos, agregá al final de tu mensaje exactamente:
[VENTA: producto, precio, nombre, envío con dirección o retiro, medio de pago]

REGLAS:
- Usá SOLO precios y stock del catálogo. Nunca inventes productos, precios ni plazos.
- Solo enviamos dentro de Río Cuarto. Si el cliente es de otra ciudad, decíselo con amabilidad.
- Retiro: NUNCA des una dirección. Decí que se coordina el lugar y horario por WhatsApp.
- Cuotas sin interés: ofrecelas SOLO en los productos que las tienen en el catálogo, con esa cantidad de cuotas.
- Si no sabés algo, decí que lo consultás con el equipo y respondés enseguida.

DATOS DEL NEGOCIO:
- Medios de pago: ${negocio.mediosDePago}
- Envíos: ${negocio.envios}
- Garantía: ${negocio.garantia}
- Horario: ${negocio.horario}

CATÁLOGO (producto | precio | stock | cuotas | detalle):
${catalogo}
${preguntasFrecuentes ? '\nPREGUNTAS FRECUENTES:\n' + preguntasFrecuentes : ''}`;
}

// La API pide que los mensajes alternen cliente/bot y arranquen por el cliente.
function ordenarHistorial(historial) {
  const limpio = [];
  for (const m of historial) {
    if (!m.content) continue;
    const ultimo = limpio[limpio.length - 1];
    if (ultimo && ultimo.role === m.role) ultimo.content += '\n' + m.content;
    else limpio.push({ role: m.role, content: m.content });
  }
  while (limpio.length && limpio[0].role !== 'user') limpio.shift();
  return limpio;
}

// historial: [{role:'user'|'assistant', content}] terminando en el mensaje del cliente.
// Devuelve { texto, venta } donde venta es el resumen si el cliente confirmó la compra.
async function responderCliente(historial) {
  const system = await armarInstrucciones();
  const respuesta = await responderChat(system, ordenarHistorial(historial));

  const match = respuesta.match(/\[VENTA:\s*([^\]]+)\]/i);
  const texto = respuesta.replace(/\[VENTA:[^\]]*\]/i, '').trim();
  return { texto, venta: match ? match[1].trim() : null };
}

module.exports = { responderCliente, formatearPrecio };
