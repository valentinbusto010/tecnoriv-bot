-- CONTENIDO DE INSTAGRAM generado desde /gestion (historias, carrusel y caption).
-- Pegá en Supabase -> SQL Editor -> Run. Se puede correr más de una vez. No borra datos.
create table if not exists contenido (
  id bigint generated always as identity primary key,
  grupo text not null,          -- ej: 'regreso'
  formato text not null,        -- 'historia', 'carrusel' o 'caption'
  orden integer not null default 0,
  nombre text not null,
  imagen text,                  -- PNG/JPG en base64 (data URL); vacío para el caption
  texto text,                   -- caption con hashtags
  created_at timestamptz not null default now()
);
create index if not exists contenido_grupo_idx on contenido (grupo, formato, orden);
alter table contenido enable row level security;
