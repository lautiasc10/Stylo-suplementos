begin;

-- Paid redemptions live outside the editable promotion JSON. The order trigger
-- enforces the limit even if a future payment flow confirms concurrently.
create table public.commerce_promotion_usage (
  promotion_id uuid primary key,
  used integer not null default 0 check (used >= 0)
);
alter table public.commerce_promotion_usage enable row level security;
revoke all on public.commerce_promotion_usage from public, anon, authenticated;

create function public.check_promotion_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p jsonb; current_used integer;
begin
  for p in select * from jsonb_array_elements(new.promotions) loop
    if p ? 'maxUses' and p->'maxUses' <> 'null'::jsonb then
      if jsonb_typeof(p->'maxUses') <> 'number' or
         (p->>'maxUses') !~ '^[0-9]+$' or
         (p->>'maxUses')::numeric not between 1 and 1000000 then
        raise exception 'Invalid promotion limit';
      end if;
      select coalesce(used, 0) into current_used
        from public.commerce_promotion_usage where promotion_id=(p->>'id')::uuid;
      if current_used > (p->>'maxUses')::integer then
        raise exception 'Promotion limit below paid usage';
      end if;
      if p->>'kind' = 'quantity' and
         (p->>'maxUses')::integer < (p->'components'->0->>'quantity')::integer then
        raise exception 'Promotion limit below minimum quantity';
      end if;
    end if;
  end loop;
  -- Client-supplied usage is never stored or trusted.
  select coalesce(jsonb_agg(entry.p - 'used' order by entry.ord), '[]'::jsonb)
    into new.promotions
    from jsonb_array_elements(new.promotions) with ordinality as entry(p, ord);
  return new;
end $$;
create trigger check_promotion_limits_before_save
  before update of promotions on public.commerce_state
  for each row execute function public.check_promotion_limits();

create or replace function public.commerce_promotions() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'limitsEnabled', true,
    'revision', case when auth.uid() is not null and public.is_store_admin() then revision else 0 end,
    'promotions', coalesce((
      select jsonb_agg(entry.p || jsonb_build_object('used',coalesce(usage.used,0)) order by entry.ord)
      from jsonb_array_elements(state.promotions) with ordinality as entry(p,ord)
      left join public.commerce_promotion_usage usage on usage.promotion_id=(entry.p->>'id')::uuid
      where (auth.uid() is not null and public.is_store_admin()) or (entry.p->>'active')::boolean
    ), '[]'::jsonb)
  ) from public.commerce_state state where id;
$$;

create or replace function public.commerce_price_items(items jsonb, method text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare item jsonb; v record; lines jsonb := '[]'; base bigint := 0; best bigint := 0;
  winner text := null; winner_id uuid := null; winner_uses integer := 0;
  p jsonb; c jsonb; line jsonb; repeats integer; regular bigint; saving bigint;
  unit bigint; q integer; uses_needed integer; sold integer;
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
    repeats := 999; regular := 0; saving := 0; uses_needed := 0;
    for c in select * from jsonb_array_elements(p->'components') loop
      select x into line from jsonb_array_elements(lines) x where x->>'variantId'=c->>'variantId';
      if line is null or (line->>'quantity')::integer<(c->>'quantity')::integer then repeats:=0; exit; end if;
      repeats := least(repeats,(line->>'quantity')::integer/(c->>'quantity')::integer);
      regular := regular+(line->>'unitPrice')::bigint*(c->>'quantity')::integer;
      uses_needed := (line->>'quantity')::integer;
      saving := ((line->>'unitPrice')::bigint-(p->>case when method='mercado-pago' then 'listPrice' else 'cashPrice' end)::bigint)*(line->>'quantity')::integer;
    end loop;
    if repeats=0 then continue; end if;
    if p->>'kind'='bundle' then
      saving:=(regular-(p->>case when method='mercado-pago' then 'listPrice' else 'cashPrice' end)::bigint)*repeats;
      uses_needed:=repeats;
    end if;
    if p->>'maxUses' is not null then
      select coalesce(used, 0) into sold from public.commerce_promotion_usage where promotion_id=(p->>'id')::uuid;
      if coalesce(sold, 0)+uses_needed>(p->>'maxUses')::integer then continue; end if;
    end if;
    if saving>best and saving<=base then
      best:=saving; winner:=p->>'name'; winner_id:=(p->>'id')::uuid; winner_uses:=uses_needed;
    end if;
  end loop;
  return jsonb_build_object('lines',lines,'base',base,'discount',best,'total',base-best,
    'promotion',winner,'promotionId',winner_id,'promotionUses',winner_uses,
    'paymentMethod',method,'currency','ARS');
end $$;

create function public.count_paid_promotion() returns trigger
language plpgsql security definer set search_path = '' as $$
declare promo_id uuid; uses_needed integer; max_uses integer;
begin
  if new.payment_status <> 'paid' or (tg_op = 'UPDATE' and old.payment_status = 'paid') then return new; end if;
  promo_id := (new.snapshot->>'promotionId')::uuid;
  uses_needed := coalesce((new.snapshot->>'promotionUses')::integer, 0);
  if promo_id is null or uses_needed < 1 then return new; end if;
  select (p->>'maxUses')::integer into max_uses
    from public.commerce_state s, jsonb_array_elements(s.promotions) p
    where s.id and p->>'id'=promo_id::text;
  insert into public.commerce_promotion_usage(promotion_id,used)
    values(promo_id,uses_needed)
    on conflict (promotion_id) do update
      set used=public.commerce_promotion_usage.used+excluded.used
      where max_uses is null or public.commerce_promotion_usage.used+excluded.used<=max_uses;
  if not found then raise exception 'Promotion limit exhausted' using errcode='40001'; end if;
  return new;
end $$;
create trigger count_paid_promotion_on_order
  after insert or update of payment_status on public.commerce_orders
  for each row execute function public.count_paid_promotion();

commit;
