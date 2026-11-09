-- ESTUDIO IA (/contenido → IA): historial de imágenes creadas o editadas con Nano Banana.
-- Pegá en Supabase -> SQL Editor -> Run (se puede correr más de una vez).
create table if not exists ia_imagenes (
  id bigserial primary key,
  tipo text not null default 'crear',     -- 'crear' | 'editar'
  prompt text,
  url text not null,
  modelo text,
  formato text,
  producto_id bigint references productos(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ia_imagenes_fecha on ia_imagenes (created_at desc);
alter table ia_imagenes enable row level security;
