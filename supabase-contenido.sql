-- ESTUDIO DE CONTENIDO (/contenido): carruseles, posts, historias y Marketplace.
-- Pegá en Supabase -> SQL Editor -> Run. Se puede correr más de una vez. No borra datos.

create table if not exists piezas (
  id bigint generated always as identity primary key,
  formato text not null,                    -- 'carrusel' | 'post' | 'historias' | 'marketplace'
  plantilla text,                           -- 'producto' | 'coleccion' | 'comparativa' | 'tips' | 'promo' | 'libre'
  titulo text not null,                     -- nombre interno de la pieza
  tema text,                                -- la idea que escribiste al crearla
  caption text,                             -- caption de Instagram o descripción de Marketplace
  titulo_mkp text,                          -- título de Marketplace
  estado text not null default 'borrador',  -- 'borrador' | 'programado' | 'publicado'
  programado_para timestamptz,
  publicado_at timestamptz,
  avisado boolean not null default false,   -- ya se mandó el recordatorio por WhatsApp
  ig_media_id text,
  ig_permalink text,
  error text,                               -- último error al publicar
  producto_ids bigint[] not null default '{}',
  guion jsonb,                              -- textos de cada slide (para editarlos y rehacer las imágenes)
  miniatura text,                           -- portada chica (data URL) para la biblioteca
  created_at timestamptz not null default now()
);
create index if not exists piezas_estado_idx on piezas (estado, programado_para);
alter table piezas enable row level security;

create table if not exists pieza_imagenes (
  id bigint generated always as identity primary key,
  pieza_id bigint not null references piezas(id) on delete cascade,
  orden integer not null default 0,
  imagen text not null,                     -- JPG en base64 (data URL)
  -- link público e imposible de adivinar: Instagram descarga la imagen desde acá al publicar
  clave text not null default md5(random()::text || clock_timestamp()::text)
);
create index if not exists pieza_imagenes_pieza_idx on pieza_imagenes (pieza_id, orden);
create unique index if not exists pieza_imagenes_clave_idx on pieza_imagenes (clave);
alter table pieza_imagenes enable row level security;
