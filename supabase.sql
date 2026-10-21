-- Pegá todo esto en Supabase -> SQL Editor -> Run. Se corre una sola vez.

-- Tus productos: el bot SOLO vende lo que está acá, con estos precios y stock.
create table if not exists productos (
  id bigint generated always as identity primary key,
  nombre text not null,
  precio numeric not null,
  stock integer not null default 0,
  descripcion text,
  cuotas_sin_interes integer not null default 0, -- 0 = no tiene cuotas sin interés
  activo boolean not null default true
);
alter table productos add column if not exists cuotas_sin_interes integer not null default 0;

-- Preguntas frecuentes (si ya la tenías, no se toca).
create table if not exists faqs (
  id bigint generated always as identity primary key,
  keywords text not null,
  respuesta text not null
);

-- Historial de chats de WhatsApp (para que el bot recuerde la conversación).
create table if not exists mensajes (
  id bigint generated always as identity primary key,
  telefono text not null,
  rol text not null,
  contenido text not null,
  created_at timestamptz not null default now()
);
create index if not exists mensajes_telefono_idx on mensajes (telefono, created_at desc);

-- Ventas que cerró el bot.
create table if not exists pedidos (
  id bigint generated always as identity primary key,
  telefono text not null,
  resumen text not null,
  created_at timestamptz not null default now()
);

-- Ejemplo (borralo o cambialo por tus productos reales):
insert into productos (nombre, precio, stock, descripcion, cuotas_sin_interes) values
  ('Auriculares inalámbricos Lenovo LP40 Pro', 45990, 5, 'Bluetooth 5.3, 30 hs de batería, negro y blanco', 3),
  ('Smartwatch T900 Ultra', 39990, 3, 'Pantalla 2", llamadas, notificaciones, malla naranja', 0),
  ('Cargador rápido 20W USB-C para iPhone', 14990, 10, 'Incluye cable USB-C a Lightning', 0);
