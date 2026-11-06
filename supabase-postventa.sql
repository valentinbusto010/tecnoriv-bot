-- POSTVENTA + RESUMEN DIARIO. Pegá en Supabase -> SQL Editor -> Run (se puede correr más de una vez).

-- Cuándo se entregó cada pedido y qué mensajes automáticos ya se mandaron.
alter table pedidos add column if not exists entregado_at timestamptz;
alter table pedidos add column if not exists seguimiento_at timestamptz;
alter table pedidos add column if not exists recompra_at timestamptz;

-- Los pedidos que ya estaban entregados NO reciben mensajes (para no escribirle a clientes viejos de golpe).
update pedidos set seguimiento_at = now(), recompra_at = now()
where estado = 'entregado' and entregado_at is null and seguimiento_at is null;

create or replace function marcar_entregado() returns trigger
language plpgsql as $$
begin
  if new.estado = 'entregado' and (tg_op = 'INSERT' or old.estado is distinct from 'entregado') and new.entregado_at is null then
    new.entregado_at := now();
  end if;
  return new;
end $$;

drop trigger if exists pedidos_entregado on pedidos;
create trigger pedidos_entregado before insert or update of estado on pedidos
for each row execute function marcar_entregado();

-- Clientes que pidieron no recibir ofertas, y el beneficio de recompra que tienen guardado.
alter table clientes add column if not exists no_contactar boolean not null default false;
alter table clientes add column if not exists beneficio jsonb; -- { producto_id, nombre, descuento, hasta }

-- Registro de todo lo que se manda solo (seguimiento, oferta, resumen).
create table if not exists mensajes_auto (
  id bigserial primary key,
  tipo text not null,            -- 'seguimiento' | 'recompra' | 'resumen'
  telefono text,
  cliente text,
  pedido_id bigint,
  texto text,
  via text,                      -- 'texto' | 'plantilla'
  estado text not null,          -- 'enviado' | 'error'
  error text,
  wa_id text,                    -- id del mensaje en WhatsApp (para saber si después falló)
  created_at timestamptz not null default now()
);
create index if not exists mensajes_auto_fecha on mensajes_auto (created_at desc);
alter table mensajes_auto add column if not exists wa_id text;
create index if not exists mensajes_auto_wa on mensajes_auto (wa_id);
alter table mensajes_auto enable row level security;

-- Ajustes (se cambian desde /gestion -> Clientes -> Automatizaciones)
insert into ajustes (clave, valor) values
  ('postventa_activa', '1'),
  ('dias_seguimiento', '3'),
  ('dias_recompra', '35'),
  ('recompra_descuento', '10'),
  ('resumen_activo', '1'),
  ('resumen_hora', '8')
on conflict (clave) do nothing;
