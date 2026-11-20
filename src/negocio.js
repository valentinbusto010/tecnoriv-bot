// Datos de Tecno Riv. Editá esto cuando cambie algo (pagos, envíos, horarios).
module.exports = {
  nombre: 'Tecno Riv',
  instagram: '@tecno_riv',
  ciudad: 'Río Cuarto, Córdoba',
  web: '', // ej: https://tecnoriv.com.ar
  whatsapp: '358 517-8319', // número del bot: se muestra en la descripción de Marketplace
  mediosDePago: 'Todos los medios de pago: efectivo, transferencia, Mercado Pago y tarjetas de débito y crédito. Por ahora no hay cuotas sin interés',
  envios: 'Envío gratis dentro de Río Cuarto y a Las Higueras. A Holmberg el envío cuesta $3.000. No hacemos envíos a otras ciudades',
  // Entregas a domicilio: salen a partir de las 17:30. Pedido hasta las 20 hs = se entrega ese mismo día; después, al día siguiente.
  entregas: 'Las entregas a domicilio salen a partir de las 17:30 hs. Los pedidos confirmados hasta las 20 hs se entregan ese mismo día; los que llegan después, al día siguiente',
  // Punto de retiro: el bot lo puede dar cuando el cliente quiere retirar.
  retiro: 'Pasaje Público 2206, Banda Norte (barrio 130 Viviendas), Río Cuarto',
  // Datos para transferencias. El cliente paga cuando recibe el producto.
  transferencia: { alias: 'valentinbusto04', titular: 'Leandro Valentín Busto', banco: 'Mercado Pago' },
  garantia: 'Garantía de 30 días por fallas de fábrica',
  // Cambios: solo por falla, dentro de la garantía.
  cambios: 'Hacemos cambios solo por falla, dentro de los 30 días de garantía. El producto no tiene que estar rayado ni golpeado. No hay cambios por gusto o arrepentimiento',
  // Info que vale para todos los productos de una categoría (el detalle de cada uno va en el catálogo).
  infoProductos: [
    'Smartwatches (todos los modelos): funcionan con iPhone y Android, se usan con la app FitPro, vienen con malla incluida en la caja y son resistentes al sudor y a salpicaduras, pero NO son sumergibles (no sirven para nadar ni bañarse).',
    'Mallas e hidrogel para smartwatch: sirven para la mayoría de los relojes con pantalla de 2". Si el cliente tiene otra marca o modelo, preguntale la medida de la pantalla.',
    'Duración de batería: no tenemos un dato confirmado; no inventes horas ni días. Si preguntan, decí que depende del uso (brillo, notificaciones, llamadas) y que con todo activado conviene cargarlo a diario.',
  ],
  // Descuento pagando en efectivo (%). Se aplica sobre el precio que ve el cliente (incluida la promo, si hay).
  // Lo usan el catálogo, el bot y el registro de ventas. Poné 0 para sacarlo.
  descuentoEfectivo: 10,
  // Descuentos en efectivo distintos para algunos productos: si el nombre o la categoría contiene la palabra, usa ese %.
  efectivoEspecial: [{ palabra: 'funda', nombre: 'Fundas', descuento: 15 }],
  // ¿El descuento en efectivo se suma a una promo con % OFF? false = durante la promo el efectivo paga lo mismo.
  efectivoConPromo: false,
  horario: 'Lunes a sábado de 9 a 20 hs',
  // Catálogo de Meta (Commerce Manager) que se muestra en el perfil de WhatsApp. Se llena solo con /catalogo/meta.csv
  catalogoMeta: '3546779688833637',
};
