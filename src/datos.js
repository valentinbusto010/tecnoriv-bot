const { createClient } = require('@supabase/supabase-js');

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : null;

if (!supabase) console.warn('Supabase no configurado: el bot funciona sin catálogo ni historial.');

// Para el panel: dice si el bot puede leer el catálogo y, si no, por qué.
async function estadoCatalogo() {
  if (!supabase) return { ok: false, motivo: 'Faltan SUPABASE_URL o SUPABASE_KEY en Render.' };
  const clave = process.env.SUPABASE_KEY;
  let rol = clave.startsWith('sb_secret_') ? 'service_role' : clave.startsWith('sb_publishable_') ? 'anon' : null;
  if (!rol) {
    try {
      rol = JSON.parse(Buffer.from(clave.split('.')[1], 'base64').toString()).role;
    } catch (e) {}
  }
  if (rol === 'anon') {
    return { ok: false, motivo: 'SUPABASE_KEY es la clave pública (anon). Poné la clave service_role (o secret) en Render.' };
  }
  const { count, error } = await supabase.from('productos').select('*', { count: 'exact', head: true }).eq('activo', true);
  if (error) return { ok: false, motivo: `Supabase respondió: ${error.message}` };
  // El código del proyecto está en la URL: https://<codigo>.supabase.co
  const proyecto = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];
  if (!count) return { ok: false, motivo: `La tabla productos está vacía en el proyecto "${proyecto}" de Supabase.` };
  return { ok: true, productos: count, proyecto };
}

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

module.exports = { supabase, estadoCatalogo, obtenerProductos, obtenerFaqs, obtenerHistorial, guardarMensaje };
