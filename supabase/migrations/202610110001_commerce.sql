-- Fase 3. Apply after catalog, first in a test project. No payment confirmation.
begin;
create table public.commerce_state (
  id boolean primary key default true check(id), revision integer not null default 0 check(revision >= 0),
  promotions jsonb not null default '[]'::jsonb check(jsonb_typeof(promotions) = 'array')
);
insert into public.commerce_state(id) values(true);
alter table public.commerce_state enable row level security;
revoke all on public.commerce_state from anon, authenticated;
grant select on public.commerce_state to authenticated;
create policy "Admin MFA reads commerce" on public.commerce_state for select to authenticated using ((select public.is_store_admin()));
create function public.commerce_promotions() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('revision',case when auth.uid() is not null and public.is_store_admin() then revision else 0 end,
    'promotions',case when auth.uid() is not null and public.is_store_admin() then promotions else
      coalesce((select jsonb_agg(p) from jsonb_array_elements(promotions) p where (p->>'active')::boolean),'[]'::jsonb) end)
  from public.commerce_state where id;
$$;
revoke all on function public.commerce_promotions() from public;
grant execute on function public.commerce_promotions() to anon, authenticated;
create function public.save_commerce_promotions(payload jsonb, expected_revision integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare current_revision integer; p jsonb; c jsonb;
begin
  if not public.is_store_admin() then raise exception 'Access denied' using errcode='42501'; end if;
  if octet_length(payload::text) > 100000 or jsonb_typeof(payload) is distinct from 'array' or jsonb_array_length(payload)>100 then raise exception 'Invalid promotions'; end if;
  select revision into current_revision from public.commerce_state where id for update;
  if expected_revision is null or expected_revision<>current_revision then raise exception 'Reload promotions' using errcode='40001'; end if;
  if exists(select 1 from jsonb_array_elements(payload) x group by x->>'id' having count(*)>1) then raise exception 'Duplicate promotion'; end if;
  for p in select * from jsonb_array_elements(payload) loop
    if p->>'id' is null or (p->>'id')!~'^[0-9a-f-]{36}$' or (p->>'id')::uuid is null or
      jsonb_typeof(p->'name') is distinct from 'string' or length(trim(p->>'name')) not between 1 and 100 or
      p->>'kind' is null or p->>'kind' not in ('sale','quantity','bundle') or
      jsonb_typeof(p->'active') is distinct from 'boolean' or
      jsonb_typeof(p->'listPrice') is distinct from 'number' or (p->>'listPrice')!~'^[0-9]+$' or (p->>'listPrice')::bigint not between 1 and 99999999999 or
      jsonb_typeof(p->'cashPrice') is distinct from 'number' or (p->>'cashPrice')!~'^[0-9]+$' or (p->>'cashPrice')::bigint not between 1 and 99999999999 or
      jsonb_typeof(p->'components') is distinct from 'array' or jsonb_array_length(p->'components') not between 1 and 12 then raise exception 'Invalid promotion'; end if;
    if p->>'kind'<>'bundle' and jsonb_array_length(p->'components')<>1 then raise exception 'One variant required'; end if;
    if not (p ? 'startsAt' and p ? 'endsAt') or jsonb_typeof(p->'startsAt') not in ('null','string') or jsonb_typeof(p->'endsAt') not in ('null','string') then raise exception 'Invalid schedule'; end if;
    if p->>'startsAt' is not null then perform (p->>'startsAt')::timestamptz; end if;
    if p->>'endsAt' is not null then perform (p->>'endsAt')::timestamptz; end if;
    if p->>'startsAt' is not null and p->>'endsAt' is not null and (p->>'startsAt')::timestamptz>=(p->>'endsAt')::timestamptz then raise exception 'Invalid schedule'; end if;
    if exists(select 1 from jsonb_array_elements(p->'components') x group by x->>'variantId' having count(*)>1) then raise exception 'Duplicate component'; end if;
    for c in select * from jsonb_array_elements(p->'components') loop
      if c->>'variantId' is null or not exists(select 1 from public.catalog_variants v where v.id=(c->>'variantId')::uuid) or
        jsonb_typeof(c->'quantity') is distinct from 'number' or (c->>'quantity')!~'^[0-9]+$' or (c->>'quantity')::integer not between 1 and 999 then raise exception 'Invalid component'; end if;
      if p->>'kind'='sale' and (c->>'quantity')::integer<>1 or p->>'kind'='quantity' and (c->>'quantity')::integer<2 then raise exception 'Invalid quantity'; end if;
    end loop;
  end loop;
  update public.commerce_state set promotions=payload, revision=revision+1 where id;
  insert into public.admin_audit_log(admin_id,action,target_id) values(auth.uid(),'promotions_saved',null);
  return current_revision+1;
end $$;
revoke all on function public.save_commerce_promotions(jsonb,integer) from public;
grant execute on function public.save_commerce_promotions(jsonb,integer) to authenticated;
-- Server pricing for manual pickup orders. No submitted price is trusted.
create function public.commerce_price_items(items jsonb, method text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare item jsonb; v record; lines jsonb := '[]'; base bigint := 0; best bigint := 0; winner text := null;
  p jsonb; c jsonb; line jsonb; repeats integer; regular bigint; saving bigint; unit bigint; q integer;
begin
  if method not in ('mercado-pago','transferencia','efectivo') or method is null then raise exception 'Invalid payment'; end if;
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 30 or
    exists(select 1 from jsonb_array_elements(items) x group by x->>'variantId' having count(*)>1) then raise exception 'Invalid items'; end if;
  for item in select * from jsonb_array_elements(items) loop
    if item->>'variantId' is null or jsonb_typeof(item->'quantity') is distinct from 'number' or (item->>'quantity')!~'^[0-9]+$' then raise exception 'Invalid item'; end if;
    q := (item->>'quantity')::integer;
    select cv.*, cp.document as product_document into v from public.catalog_variants cv
      join public.catalog_products cp on cp.id=cv.product_id join public.catalog_brands cb on cb.id=cp.brand_id
      where cv.id=(item->>'variantId')::uuid and cv.active and cp.active and cb.active and
        exists(select 1 from public.catalog_categories cc where cc.active and cp.document->'categoryIds' @> to_jsonb(array[cc.id::text]));
    if not found or q not between 1 and 999 or q>v.stock then raise exception 'Product or stock unavailable'; end if;
    unit := case when method='mercado-pago' then v.list_price else v.cash_price end;
    base := base+unit*q;
    lines := lines||jsonb_build_array(jsonb_build_object('variantId',v.id,'sku',v.sku,'name',v.product_document->>'name',
      'flavor',v.document->>'flavor','size',v.document->>'size','presentation',v.document->>'presentation','quantity',q,'unitPrice',unit,'subtotal',unit*q));
  end loop;
  for p in select x from public.commerce_state cs cross join lateral jsonb_array_elements(cs.promotions) x where cs.id order by x->>'id' loop
    if not (p->>'active')::boolean or p->>'startsAt' is not null and now()<(p->>'startsAt')::timestamptz or
      p->>'endsAt' is not null and now()>=(p->>'endsAt')::timestamptz then continue; end if;
    repeats := 999; regular := 0; saving := 0;
    for c in select * from jsonb_array_elements(p->'components') loop
      select x into line from jsonb_array_elements(lines) x where x->>'variantId'=c->>'variantId';
      if line is null or (line->>'quantity')::integer<(c->>'quantity')::integer then repeats:=0; exit; end if;
      repeats := least(repeats,(line->>'quantity')::integer/(c->>'quantity')::integer);
      regular := regular+(line->>'unitPrice')::bigint*(c->>'quantity')::integer;
      saving := ((line->>'unitPrice')::bigint-(p->>case when method='mercado-pago' then 'listPrice' else 'cashPrice' end)::bigint)*(line->>'quantity')::integer;
    end loop;
    if repeats=0 then continue; end if;
    if p->>'kind'='bundle' then saving:=(regular-(p->>case when method='mercado-pago' then 'listPrice' else 'cashPrice' end)::bigint)*repeats; end if;
    if saving>best and saving<=base then best:=saving; winner:=p->>'name'; end if;
  end loop;
  return jsonb_build_object('lines',lines,'base',base,'discount',best,'total',base-best,'promotion',winner,'paymentMethod',method,'currency','ARS');
end $$;
revoke all on function public.commerce_price_items(jsonb,text) from public,anon,authenticated;

create table public.commerce_orders (
  id uuid primary key, request_id uuid not null unique, source text not null check(source='manual'),
  payment_status text not null check(payment_status='pending'), fulfillment_status text not null check(fulfillment_status='pending_pickup'),
  customer jsonb not null, request_payload jsonb not null, snapshot jsonb not null,
  admin_id uuid not null references public.admin_users(user_id), created_at timestamptz not null default now()
);
alter table public.commerce_orders enable row level security;
revoke all on public.commerce_orders from anon,authenticated;
grant select on public.commerce_orders to authenticated;
create policy "Admin MFA reads orders" on public.commerce_orders for select to authenticated using ((select public.is_store_admin()));
create function public.create_manual_pickup_order(request_id uuid, items jsonb, customer jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare saved public.commerce_orders; payload jsonb; price jsonb; order_id uuid;
begin
  if not public.is_store_admin() then raise exception 'Access denied' using errcode='42501'; end if;
  if request_id is null or octet_length(items::text)>10000 or jsonb_typeof(customer) is distinct from 'object' or
    jsonb_typeof(customer->'name') is distinct from 'string' or length(trim(customer->>'name')) not between 1 and 100 or
    jsonb_typeof(customer->'phone') is distinct from 'string' or length(customer->>'phone')>30 then raise exception 'Invalid customer'; end if;
  payload:=jsonb_build_object('items',items,'customer',jsonb_build_object('name',trim(customer->>'name'),'phone',customer->>'phone'));
  perform 1 from public.catalog_state where id for update;
  perform 1 from public.commerce_state where id for update;
  select * into saved from public.commerce_orders o where o.request_id=create_manual_pickup_order.request_id;
  if found then
    if saved.request_payload<>payload then raise exception 'Idempotency conflict' using errcode='40001'; end if;
    return jsonb_build_object('id',saved.id,'snapshot',saved.snapshot);
  end if;
  price:=public.commerce_price_items(items,'efectivo'); order_id:=gen_random_uuid();
  insert into public.commerce_orders(id,request_id,source,payment_status,fulfillment_status,customer,request_payload,snapshot,admin_id)
    values(order_id,request_id,'manual','pending','pending_pickup',payload->'customer',payload,price,auth.uid());
  insert into public.admin_audit_log(admin_id,action,target_id) values(auth.uid(),'manual_pickup_order_created',order_id);
  return jsonb_build_object('id',order_id,'snapshot',price);
end $$;
revoke all on function public.create_manual_pickup_order(uuid,jsonb,jsonb) from public;
grant execute on function public.create_manual_pickup_order(uuid,jsonb,jsonb) to authenticated;
commit;
