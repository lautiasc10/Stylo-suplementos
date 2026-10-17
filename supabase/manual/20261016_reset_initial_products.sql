-- Ejecutar una sola vez en Supabase SQL Editor, antes de importar el CSV completo.
-- Solo elimina los cuatro productos iniciales y, si existe, un único retiro
-- pendiente de prueba que use sus variantes. Conserva los pedidos finalizados,
-- marcas, categorías y archivos de Storage. La copia queda sin acceso
-- para anon/authenticated en public.catalog_reset_backups.
begin;

do $$
declare
  product_slugs text[];
  pending_count integer;
begin
  select array_agg(slug order by slug) into product_slugs
  from public.catalog_products;
  if product_slugs is distinct from array['creatina','mutant-mass','whey-protein','zma']::text[]
    or (select count(*) from public.catalog_variants) <> 9 then
    raise exception 'El catálogo inicial cambió; no se borró nada.';
  end if;
  select count(*) into pending_count
  from public.commerce_orders o
  where o.fulfillment_status = 'pending_pickup'
    and exists (
      select 1 from jsonb_array_elements(o.snapshot->'lines') line
      where (line->>'variantId')::uuid in (select id from public.catalog_variants)
    );
  if pending_count > 1 then
    raise exception 'Hay más de un retiro pendiente; no se borró nada. Revisá los pedidos antes de continuar.';
  end if;
end $$;

create table if not exists public.catalog_reset_backups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  snapshot jsonb not null
);
alter table public.catalog_reset_backups enable row level security;
revoke all on public.catalog_reset_backups from public, anon, authenticated;

insert into public.catalog_reset_backups(snapshot)
select jsonb_build_object(
  'products', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.catalog_products t),
  'variants', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.catalog_variants t),
  'images', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.catalog_images t),
  'inventoryMovements', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.inventory_movements t),
  'priceChanges', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from public.catalog_price_changes t),
  'testOrders', (
    select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
    from public.commerce_orders o
    where o.fulfillment_status = 'pending_pickup'
      and exists (
        select 1 from jsonb_array_elements(o.snapshot->'lines') line
        where (line->>'variantId')::uuid in (select id from public.catalog_variants)
      )
  ),
  'promotions', (select promotions from public.commerce_state where id),
  'catalogRevision', (select revision from public.catalog_state where id),
  'commerceRevision', (select revision from public.commerce_state where id)
);

-- El único retiro de prueba y las promociones dependen de variantes que van
-- a dejar de existir. Ambos ya están incluidos en la copia.
delete from public.commerce_orders o
where o.fulfillment_status = 'pending_pickup'
  and exists (
    select 1 from jsonb_array_elements(o.snapshot->'lines') line
    where (line->>'variantId')::uuid in (select id from public.catalog_variants)
  );
update public.commerce_state set promotions = '[]'::jsonb, revision = revision + 1 where id;
delete from public.catalog_images;
delete from public.inventory_movements;
delete from public.catalog_price_changes;
delete from public.catalog_variants;
delete from public.catalog_products;
update public.catalog_state set revision = revision + 1 where id;

commit;

select id, created_at from public.catalog_reset_backups order by created_at desc limit 1;
