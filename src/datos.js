const { createClient } = require('@supabase/supabase-js');

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : null;

if (!supabase) console.warn('Supabase no configurado: el bot funciona sin catálogo ni historial.');

async function obtenerProductos() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('productos').select('*').eq('activo', true);
  if (error) console.error('Error leyendo productos:', error.message);
  return data || [];
}

async function obtenerFaqs() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('faqs').select('*');
  if (error) console.error('Error leyendo faqs:', error.message);
  return data || [];
}

async function obtenerHistorial(telefono, limite = 12) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('mensajes')
    .select('rol, contenido')
    .eq('telefono', telefono)
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) console.error('Error leyendo historial:', error.message);
  return (data || []).reverse().map((m) => ({ role: m.rol, content: m.contenido }));
}

async function guardarMensaje(telefono, rol, contenido) {
  if (!supabase) return;
  const { error } = await supabase.from('mensajes').insert({ telefono, rol, contenido });
  if (error) console.error('Error guardando mensaje:', error.message);
}

async function guardarPedido(telefono, resumen) {
  if (!supabase) return;
  const { error } = await supabase.from('pedidos').insert({ telefono, resumen });
  if (error) console.error('Error guardando pedido:', error.message);
}

module.exports = { obtenerProductos, obtenerFaqs, obtenerHistorial, guardarMensaje, guardarPedido };
