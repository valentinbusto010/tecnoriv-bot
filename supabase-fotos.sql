-- GALERÍA DE FOTOS POR PRODUCTO. Pegá en Supabase -> SQL Editor -> Run (se puede correr más de una vez).
-- Cada producto puede tener muchas fotos; /contenido elige la menos usada para no repetir en el feed.
create table if not exists producto_fotos (
  id bigserial primary key,
  producto_id bigint not null references productos(id) on delete cascade,
  url text not null,
  origen text not null default 'panel',   -- 'panel' | 'drive' | 'principal'
  origen_id text,                         -- id del archivo en Drive (evita importar dos veces)
  usos integer not null default 0,        -- cuántas piezas de contenido la usaron
  ultimo_uso timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists producto_fotos_origen on producto_fotos (origen_id) where origen_id is not null;
create unique index if not exists producto_fotos_url on producto_fotos (producto_id, url);
create index if not exists producto_fotos_producto on producto_fotos (producto_id);
alter table producto_fotos enable row level security;

-- La foto que ya tiene cada producto entra a su galería.
insert into producto_fotos (producto_id, url, origen)
select id, imagen_url, 'principal' from productos where imagen_url is not null and imagen_url <> ''
on conflict do nothing;
