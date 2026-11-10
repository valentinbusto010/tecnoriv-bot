-- CHECKOUT DEL CATÁLOGO (/catalogo): compras hechas desde el carrito web, con el medio de pago elegido.
-- Pegá en Supabase -> SQL Editor -> Run (se puede correr más de una vez).
alter table pedidos add column if not exists compra text;        -- código de la compra web (ej: W-K3MPQ2); une los productos del mismo carrito
alter table pedidos add column if not exists pago_estado text;   -- 'esperando' | 'link' | 'a_confirmar' | 'contraentrega' | 'aprobado' | 'vencido'
alter table pedidos add column if not exists pago_ref text;      -- número de pago de Mercado Pago
create index if not exists pedidos_compra_idx on pedidos (compra) where compra is not null;
