// Datos de Tecno Riv. Editá esto cuando cambie algo (pagos, envíos, horarios).
module.exports = {
  nombre: 'Tecno Riv',
  instagram: '@tecno_riv',
  ciudad: 'Río Cuarto, Córdoba',
  web: '', // ej: https://tecnoriv.com.ar
  whatsapp: '358 517-8319', // número del bot: se muestra en la descripción de Marketplace
  mediosDePago: 'Todos los medios de pago: efectivo, transferencia, Mercado Pago y tarjetas de débito y crédito. Por ahora no hay cuotas sin interés',
  envios: 'Envío gratis dentro de Río Cuarto o retiro a coordinar por WhatsApp. No hacemos envíos a otras ciudades',
  // Datos para transferencias. El cliente paga cuando recibe el producto.
  transferencia: { alias: 'valentinbusto04', titular: 'Leandro Valentín Busto', banco: 'Mercado Pago' },
  garantia: 'Garantía de 30 días',
  // Descuento pagando en efectivo (%). Se aplica sobre el precio que ve el cliente (incluida la promo, si hay).
  // Lo usan el catálogo, el bot y el registro de ventas. Poné 0 para sacarlo.
  descuentoEfectivo: 10,
  horario: 'Lunes a sábado de 9 a 20 hs',
};
