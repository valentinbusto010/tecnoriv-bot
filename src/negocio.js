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
  garantia: 'Garantía de 30 días',
  // Descuento pagando en efectivo (%). Se aplica sobre el precio que ve el cliente (incluida la promo, si hay).
  // Lo usan el catálogo, el bot y el registro de ventas. Poné 0 para sacarlo.
  descuentoEfectivo: 10,
  // ¿El descuento en efectivo se suma a una promo con % OFF? false = durante la promo el efectivo paga lo mismo.
  efectivoConPromo: false,
  horario: 'Lunes a sábado de 9 a 20 hs',
  // Catálogo de Meta (Commerce Manager) que se muestra en el perfil de WhatsApp. Se llena solo con /catalogo/meta.csv
  catalogoMeta: '3546779688833637',
};
