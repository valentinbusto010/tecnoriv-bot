-- MARGEN REAL: costo de cada venta y precios atrasados. Pegá en Supabase -> SQL Editor -> Run.
-- Requiere haber corrido supabase-gestion.sql. Se puede correr más de una vez. No borra datos.

-- Cuándo se actualizó el costo de cada producto (para avisar precios atrasados por inflación).
alter table productos add column if not exists costo_actualizado timestamptz;
update productos set costo_actualizado = now() where costo is not null and costo_actualizado is null;

-- Costo total de cada pedido, congelado al momento de la venta.
-- Si después cambiás el costo del producto, las ventas viejas mantienen su ganancia real.
alter table pedidos add column if not exists costo numeric;

create or replace function costo_pedido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.producto_id is not null and (
       tg_op = 'INSERT' and new.costo is null
    or tg_op = 'UPDATE' and (new.producto_id is distinct from old.producto_id or new.cantidad <> old.cantidad)
  ) then
    select p.costo * new.cantidad into new.costo from productos p where p.id = new.producto_id;
  end if;
  return new;
end $$;

drop trigger if exists pedidos_costo on pedidos;
create trigger pedidos_costo before insert or update of producto_id, cantidad on pedidos
for each row execute function costo_pedido();

create or replace function marcar_costo_actualizado() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.costo is distinct from old.costo then new.costo_actualizado := now(); end if;
  return new;
end $$;

drop trigger if exists productos_costo_fecha on productos;
create trigger productos_costo_fecha before update of costo on productos
for each row execute function marcar_costo_actualizado();

-- Ajustes del sistema (iguales en la compu y el celu).
create table if not exists ajustes (
  clave text primary key,
  valor jsonb not null
);
insert into ajustes (clave, valor) values
  ('margen_objetivo', '40'),      -- % de margen que querés ganar sobre el precio de venta
  ('dias_costo_viejo', '30'),     -- después de estos días sin actualizar el costo, avisa
  ('redondeo_precio', '500')      -- el precio sugerido se redondea hacia arriba a este múltiplo
on conflict (clave) do nothing;
alter table ajustes enable row level security;
