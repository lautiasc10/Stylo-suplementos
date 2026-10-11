-- Fase 2. Apply after foundations, first in a test project.
begin;
create table public.catalog_state (id boolean primary key default true check(id), revision integer not null default 0 check(revision >= 0));
insert into public.catalog_state(id) values(true);
alter table public.catalog_state add column low_stock_threshold integer not null default 0 check(low_stock_threshold between 0 and 1000000);
create table public.catalog_brands (
  id uuid primary key, slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 100),
  name text not null check(length(trim(name)) between 1 and 100), active boolean not null, sort_order integer not null check(sort_order between 0 and 10000)
);
create table public.catalog_categories (like public.catalog_brands including all);
alter table public.catalog_brands add column logo text check(logo is null or logo ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$' and split_part(logo,'/',1)=id::text);
alter table public.catalog_categories add column detail text not null default '' check(length(detail) <= 200);
create table public.catalog_products (
  id uuid primary key, slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 160),
  brand_id uuid not null references public.catalog_brands(id) on delete restrict,
  active boolean not null, document jsonb not null check(jsonb_typeof(document) = 'object')
);
create table public.catalog_variants (
  id uuid primary key, product_id uuid not null references public.catalog_products(id) on delete restrict,
  sku text not null unique check(sku ~ '^[A-Z0-9][A-Z0-9._-]{1,63}$'),
  active boolean not null, list_price bigint not null check(list_price between 1 and 99999999999),
  cash_price bigint not null check(cash_price between 1 and 99999999999),
  stock integer not null check(stock between 0 and 1000000), document jsonb not null,
  unique(id, product_id)
);
create index catalog_variants_product on public.catalog_variants(product_id);
create table public.catalog_images (
  id uuid primary key, product_id uuid not null references public.catalog_products(id) on delete restrict,
  variant_id uuid, path text not null check(path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'),
  alt text not null check(length(trim(alt)) between 1 and 200), position integer not null check(position between 0 and 11),
  foreign key(variant_id, product_id) references public.catalog_variants(id, product_id) on delete restrict
);
create table public.inventory_movements (
  id bigint generated always as identity primary key, variant_id uuid not null references public.catalog_variants(id),
  quantity_delta integer not null check(quantity_delta <> 0), previous_quantity integer not null, new_quantity integer not null,
  reason text not null, admin_id uuid not null references public.admin_users(user_id), created_at timestamptz not null default now()
);
create table public.catalog_price_changes (
  id bigint generated always as identity primary key, variant_id uuid not null references public.catalog_variants(id),
  previous_list_price bigint, previous_cash_price bigint, new_list_price bigint not null, new_cash_price bigint not null,
  admin_id uuid not null references public.admin_users(user_id), created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['catalog_state','catalog_brands','catalog_categories','catalog_products','catalog_variants','catalog_images','inventory_movements','catalog_price_changes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy "Admin MFA reads" on public.%I for select to authenticated using ((select public.is_store_admin()))', t);
  end loop;
end $$;

insert into public.catalog_categories(id, slug, name, active, sort_order) values
('00000000-0000-4000-8000-000000000001','proteinas','Proteínas',true,0),
('00000000-0000-4000-8000-000000000002','creatinas','Creatinas',true,1),
('00000000-0000-4000-8000-000000000003','pre-entrenos','Pre-entrenos',true,2),
('00000000-0000-4000-8000-000000000004','vitaminas-y-minerales','Vitaminas y minerales',true,3),
('00000000-0000-4000-8000-000000000005','shakers-y-accesorios','Shakers y accesorios',true,4),
('00000000-0000-4000-8000-000000000006','aminoacidos','Aminoácidos',true,5),
('00000000-0000-4000-8000-000000000007','ganadores-de-masa','Ganadores de masa',true,6),
('00000000-0000-4000-8000-000000000008','colageno','Colágeno',true,7),
('00000000-0000-4000-8000-000000000009','barras-y-snacks','Barras y snacks proteicos',true,8);

create function public.catalog_snapshot() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare elevated boolean := false; result jsonb;
begin
  if auth.uid() is not null then elevated := public.is_store_admin(); end if;
  select jsonb_build_object(
    'revision', case when elevated then (select revision from public.catalog_state where id) else 0 end,
    'lowStockThreshold', case when elevated then (select low_stock_threshold from public.catalog_state where id) else null end,
    'brands', coalesce((select jsonb_agg(jsonb_build_object('id',id,'slug',slug,'name',name,'active',active,'sortOrder',sort_order,'logo',logo) order by sort_order, name) from public.catalog_brands where elevated or active),'[]'::jsonb),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id',id,'slug',slug,'name',name,'active',active,'sortOrder',sort_order,'detail',detail) order by sort_order, name) from public.catalog_categories where elevated or active),'[]'::jsonb),
    'products', coalesce((select jsonb_agg(p.document || jsonb_build_object(
      'variants', (select coalesce(jsonb_agg(v.document || jsonb_build_object('listPrice',v.list_price,'cashPrice',v.cash_price,'stock',v.stock) order by v.sku),'[]'::jsonb) from public.catalog_variants v where v.product_id=p.id and (elevated or v.active)),
      'images', (select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'path',i.path,'alt',i.alt,'variantId',i.variant_id,'position',i.position) order by i.position),'[]'::jsonb) from public.catalog_images i where i.product_id=p.id and (elevated or i.variant_id is null or exists(select 1 from public.catalog_variants iv where iv.id=i.variant_id and iv.active)))
    ) order by p.document->>'name') from public.catalog_products p where elevated or (
      p.active and exists(select 1 from public.catalog_brands b where b.id=p.brand_id and b.active)
      and exists(select 1 from public.catalog_variants v where v.product_id=p.id and v.active)
      and exists(select 1 from public.catalog_categories c where c.active and p.document->'categoryIds' @> to_jsonb(array[c.id::text]))
    )),'[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.catalog_snapshot() from public;
grant execute on function public.catalog_snapshot() to anon, authenticated;

create function public.save_catalog(payload jsonb, expected_revision integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare current_revision integer; g jsonb; p jsonb; v jsonb; img jsonb; previous_stock integer; previous_list bigint; previous_cash bigint; pid uuid; vid uuid; category_id text;
begin
  if not public.is_store_admin() then raise exception 'Access denied' using errcode='42501'; end if;
  if octet_length(payload::text) > 2097152 or jsonb_typeof(payload->'products') is distinct from 'array' or jsonb_typeof(payload->'brands') is distinct from 'array' or jsonb_typeof(payload->'categories') is distinct from 'array' then raise exception 'Invalid catalog'; end if;
  if jsonb_array_length(payload->'products')>2000 or jsonb_array_length(payload->'brands')>200 or jsonb_array_length(payload->'categories')>100 then raise exception 'Catalog too large'; end if;
  select revision into current_revision from public.catalog_state where id for update;
  if expected_revision is null or expected_revision<>current_revision then raise exception 'Catalog changed: reload before saving' using errcode='40001'; end if;
  if exists(select 1 from jsonb_array_elements(payload->'products') x group by x->>'id' having count(*)>1)
    or exists(select 1 from jsonb_array_elements(payload->'products') x group by x->>'slug' having count(*)>1)
    or exists(select 1 from jsonb_array_elements(payload->'brands') x group by x->>'id' having count(*)>1)
    or exists(select 1 from jsonb_array_elements(payload->'categories') x group by x->>'id' having count(*)>1)
    or exists(select 1 from jsonb_array_elements(payload->'products') product_row cross join lateral jsonb_array_elements(product_row.value->'variants') variant_row group by variant_row.value->>'sku' having count(*)>1)
    or exists(select 1 from jsonb_array_elements(payload->'products') product_row cross join lateral jsonb_array_elements(product_row.value->'variants') variant_row group by variant_row.value->>'id' having count(*)>1) then raise exception 'Duplicate catalog entries'; end if;
  for g in select value from jsonb_array_elements(payload->'brands') loop
    insert into public.catalog_brands(id,slug,name,active,sort_order,logo) values((g->>'id')::uuid,g->>'slug',g->>'name',(g->>'active')::boolean,(g->>'sortOrder')::integer,nullif(g->>'logo',''))
    on conflict(id) do update set slug=excluded.slug,name=excluded.name,active=excluded.active,sort_order=excluded.sort_order,logo=excluded.logo;
  end loop;
  for g in select value from jsonb_array_elements(payload->'categories') loop
    insert into public.catalog_categories(id,slug,name,active,sort_order,detail) values((g->>'id')::uuid,g->>'slug',g->>'name',(g->>'active')::boolean,(g->>'sortOrder')::integer,coalesce(g->>'detail',''))
    on conflict(id) do update set slug=excluded.slug,name=excluded.name,active=excluded.active,sort_order=excluded.sort_order,detail=excluded.detail;
  end loop;
  for p in select value from jsonb_array_elements(payload->'products') loop
    pid := (p->>'id')::uuid;
    if jsonb_typeof(p->'name') is distinct from 'string' or length(trim(p->>'name')) not between 1 and 140 or jsonb_typeof(p->'description') is distinct from 'string' or length(p->>'description')>10000
      or jsonb_typeof(p->'categoryIds') is distinct from 'array' or jsonb_array_length(p->'categoryIds') not between 1 and 100
      or jsonb_typeof(p->'tags') is distinct from 'array' or jsonb_array_length(p->'tags')>20
      or length(p->>'seoTitle')>140 or length(p->>'seoDescription')>320
      or jsonb_typeof(p->'variants') is distinct from 'array' or jsonb_array_length(p->'variants') not between 1 and 100
      or jsonb_typeof(p->'images') is distinct from 'array' or jsonb_array_length(p->'images')>12 then raise exception 'Invalid product'; end if;
    for category_id in select jsonb_array_elements_text(p->'categoryIds') loop
      if not exists(select 1 from public.catalog_categories where id=category_id::uuid) then raise exception 'Invalid category'; end if;
    end loop;
    insert into public.catalog_products values(pid,p->>'slug',(p->>'brandId')::uuid,(p->>'active')::boolean,p-'variants'-'images')
    on conflict(id) do update set slug=excluded.slug,brand_id=excluded.brand_id,active=excluded.active,document=excluded.document;
    for v in select value from jsonb_array_elements(p->'variants') loop
      vid := (v->>'id')::uuid;
      if length(v->>'flavor')>100 or length(v->>'size')>100 or length(v->>'presentation')>100 then raise exception 'Invalid variant'; end if;
      if exists(select 1 from public.catalog_variants where id=vid and product_id<>pid) then raise exception 'Cannot move variant'; end if;
      select stock,list_price,cash_price into previous_stock,previous_list,previous_cash from public.catalog_variants where id=vid;
      previous_stock := coalesce(previous_stock,0);
      insert into public.catalog_variants values(vid,pid,v->>'sku',(v->>'active')::boolean,(v->>'listPrice')::bigint,(v->>'cashPrice')::bigint,(v->>'stock')::integer,v)
      on conflict(id) do update set sku=excluded.sku,active=excluded.active,list_price=excluded.list_price,cash_price=excluded.cash_price,stock=excluded.stock,document=excluded.document;
      if previous_list is distinct from (v->>'listPrice')::bigint or previous_cash is distinct from (v->>'cashPrice')::bigint then
        insert into public.catalog_price_changes(variant_id,previous_list_price,previous_cash_price,new_list_price,new_cash_price,admin_id)
        values(vid,previous_list,previous_cash,(v->>'listPrice')::bigint,(v->>'cashPrice')::bigint,auth.uid());
      end if;
      if previous_stock<>(v->>'stock')::integer then
        insert into public.inventory_movements(variant_id,quantity_delta,previous_quantity,new_quantity,reason,admin_id)
        values(vid,(v->>'stock')::integer-previous_stock,previous_stock,(v->>'stock')::integer,'catalog_manual_adjustment',auth.uid());
      end if;
    end loop;
    delete from public.catalog_images where product_id=pid;
    for img in select value from jsonb_array_elements(p->'images') loop
      if split_part(img->>'path','/',1)<>pid::text then raise exception 'Invalid image folder'; end if;
      insert into public.catalog_images values((img->>'id')::uuid,pid,(img->>'variantId')::uuid,img->>'path',img->>'alt',(img->>'position')::integer);
    end loop;
  end loop;
  update public.catalog_state set revision=revision+1,low_stock_threshold=coalesce((payload->>'lowStockThreshold')::integer,low_stock_threshold) where id;
  perform public.record_admin_action('catalog_saved',(current_revision+1)::text);
  return current_revision+1;
end $$;
revoke all on function public.save_catalog(jsonb,integer) from public, anon;
grant execute on function public.save_catalog(jsonb,integer) to authenticated;
commit;
