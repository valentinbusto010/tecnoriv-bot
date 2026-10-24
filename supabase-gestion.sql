-- SISTEMA DE GESTIÓN (clientes, ventas, gastos, pedidos, stock) conectado al bot.
-- Pegá todo en Supabase -> SQL Editor -> Run. Se puede correr más de una vez sin romper nada.
-- No borra datos: solo agrega tablas y columnas.

-- ───────── PRODUCTOS (la misma tabla que usa el bot) ─────────
alter table productos add column if not exists categoria text not null default 'Otro';
alter table productos add column if not exists alerta integer not null default 3;  -- stock mínimo antes de avisar
alter table productos add column if not exists costo numeric;                       -- opcional: lo que te sale a vos
alter table productos add column if not exists imagen_url text;                     -- el bot manda esta foto por WhatsApp

-- ───────── CLIENTES ─────────
create table if not exists clientes (
  id bigint generated always as identity primary key,
  nombre text,
  telefono text unique,             -- formato WhatsApp: 5493584123456
  notas text,
  origen text not null default 'WhatsApp',
  ultimo_contacto timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ───────── PEDIDOS (la tabla donde el bot ya guardaba las ventas) ─────────
alter table pedidos alter column telefono drop not null;
alter table pedidos alter column resumen drop not null;
alter table pedidos add column if not exists cliente_id bigint references clientes(id) on delete set null;
alter table pedidos add column if not exists cliente text;
alter table pedidos add column if not exists producto_id bigint references productos(id) on delete set null;
alter table pedidos add column if not exists producto text;
alter table pedidos add column if not exists cantidad integer not null default 1;
alter table pedidos add column if not exists monto numeric not null default 0;
alter table pedidos add column if not exists estado text not null default 'pendiente';
alter table pedidos add column if not exists canal text not null default 'WhatsApp';
alter table pedidos add column if not exists entrega text;
alter table pedidos add column if not exists pago text;
alter table pedidos add column if not exists origen text not null default 'bot'; -- 'bot' o 'panel'
alter table pedidos add column if not exists fecha date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
create index if not exists pedidos_fecha_idx on pedidos (fecha desc);

-- Pedidos viejos que guardó el bot antes de esto: quedan visibles con su resumen.
-- Toma el primer precio que aparece en el resumen ("$39.990") como monto.
update pedidos set
  producto = coalesce(producto, resumen),
  monto = coalesce(nullif(regexp_replace(substring(resumen from '\$\s*([0-9][0-9.]*)'), '\D', '', 'g'), '')::numeric, 0),
  fecha = (created_at at time zone 'America/Argentina/Buenos_Aires')::date
where producto is null;

-- Cada teléfono de pedidos viejos pasa a ser un cliente.
insert into clientes (telefono)
select distinct telefono from pedidos where telefono is not null
on conflict (telefono) do nothing;
update pedidos p set cliente_id = c.id from clientes c
where p.cliente_id is null and p.telefono = c.telefono;

-- ───────── GASTOS ─────────
create table if not exists gastos (
  id bigint generated always as identity primary key,
  descripcion text not null,
  monto numeric not null,
  categoria text not null default 'Otro',
  fecha date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
  origen text not null default 'panel', -- 'panel' o 'whatsapp'
  created_at timestamptz not null default now()
);

-- ───────── STOCK AUTOMÁTICO ─────────
-- Nuevo pedido -> baja el stock. Cancelado -> vuelve. Des-cancelado -> baja de nuevo.
-- Borrar un pedido pendiente o en camino devuelve el stock (uno entregado no).
create or replace function ajustar_stock_pedido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.producto_id is not null and new.estado <> 'cancelado' then
      update productos set stock = greatest(stock - new.cantidad, 0) where id = new.producto_id;
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.producto_id is not null and old.estado <> 'cancelado' then
      update productos set stock = stock + old.cantidad where id = old.producto_id;
    end if;
    if new.producto_id is not null and new.estado <> 'cancelado' then
      update productos set stock = greatest(stock - new.cantidad, 0) where id = new.producto_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.producto_id is not null and old.estado in ('pendiente', 'en camino') then
      update productos set stock = stock + old.cantidad where id = old.producto_id;
    end if;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists pedidos_stock on pedidos;
create trigger pedidos_stock
after insert or delete or update of estado, cantidad, producto_id on pedidos
for each row execute function ajustar_stock_pedido();

-- ───────── SEGURIDAD ─────────
-- Todo pasa por el servidor del bot con la clave service_role, que ignora estas reglas.
-- Con RLS activo y sin reglas, nadie más puede leer ni escribir con la clave pública.
alter table productos enable row level security;
alter table pedidos enable row level security;
alter table clientes enable row level security;
alter table gastos enable row level security;
alter table mensajes enable row level security;
alter table faqs enable row level security;
