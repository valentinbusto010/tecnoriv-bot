// Plantillas de WhatsApp que usa el bot fuera de la ventana de 24 h (ver src/postventa.js).
// Meta rechaza las plantillas que empiezan o terminan con una variable {{n}}.
module.exports = [
  {
    name: 'tr_seguimiento',
    category: 'UTILITY',
    text: 'Hola {{1}}! Te escribimos de Tecno Riv 👋 ¿Cómo te está funcionando tu {{2}}? Si tenés alguna duda o algo no anda bien, respondé este mensaje y te ayudamos.',
    example: ['Juan', 'Smartwatch D20'],
  },
  {
    name: 'tr_recompra',
    category: 'MARKETING',
    text: 'Hola {{1}}! Como compraste {{2}} en Tecno Riv, te guardamos un beneficio: {{3}}, {{4}}% OFF hasta el {{5}}. ¿Te lo reservamos? Respondé este mensaje. Si no querés recibir más ofertas, respondé BAJA.',
    example: ['Juan', 'Smartwatch D20', 'Malla para smartwatch a $3.149 (antes $3.499)', '10', '12/11'],
  },
  {
    name: 'tr_resumen',
    category: 'UTILITY',
    text: 'Buen día! Tu resumen de Tecno Riv: {{1}}. Respondé HOY para ver el detalle completo.',
    example: ['ayer $45.000 (2 pedidos) · mes $380.000 · 1 pendientes · 3 productos con stock bajo'],
  },
  {
    name: 'tr_aviso',
    category: 'UTILITY',
    text: '🔔 Aviso de Tecno Riv: {{1}}. Revisalo en tu panel de gestión.',
    example: ['🛒 NUEVA VENTA #12 · Cliente: +5493584123456 · Smartwatch D20 · $12.000'],
  },
];
