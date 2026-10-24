-- PUBLICACIONES DE MARKETPLACE guardadas desde /gestion. Pegá en Supabase -> SQL Editor -> Run.
-- Se puede correr más de una vez. No borra datos.
create table if not exists publicaciones (
  id bigint generated always as identity primary key,
  producto_id bigint references productos(id) on delete cascade,
  producto text not null,
  precio numeric not null,      -- precio con el que se generó la imagen (para avisar si cambió)
  titulo text not null,
  descripcion text not null,
  imagen text not null,         -- imagen JPG en base64 (data URL)
  created_at timestamptz not null default now()
);
create index if not exists publicaciones_producto_idx on publicaciones (producto_id);
alter table publicaciones enable row level security;
