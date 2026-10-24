-- Fase 3AT. Run after the existing catalog and commerce migrations.
begin;

alter table public.commerce_orders
  add column paid_at timestamptz,
  add column picked_up_at timestamptz,
  add column cost_total bigint check (cost_total is null or cost_total >= 0),
  add column fee_total bigint not null default 0 check (fee_total >= 0),
  add column expense_total bigint not null default 0 check (expense_total >= 0),
  add column refund_total bigint not null default 0 check (refund_total >= 0),
  add column customer_name text generated always as (customer->>'name') stored,
  add column operation_at timestamptz generated always as (coalesce(paid_at,created_at)) stored;

-- Older paid sales were collected when recorded. Their purchase cost is unknown.
update public.commerce_orders set paid_at=created_at where payment_status='paid';
alter table public.commerce_orders add constraint commerce_orders_paid_time check (
  (payment_status='pending' and paid_at is null and picked_up_at is null) or
  (payment_status='paid' and paid_at is not null)
);
alter table public.commerce_orders drop constraint manual_order_states;
alter table public.commerce_orders add constraint manual_order_states check (
  (payment_status='pending' and fulfillment_status='pending_pickup') or
  (payment_status='paid' and fulfillment_status in ('delivered','picked_up'))
);
create index commerce_orders_paid_at_idx on public.commerce_orders(paid_at desc, id desc) where payment_status='paid';
create index commerce_orders_created_at_idx on public.commerce_orders(created_at desc, id desc);
create index commerce_orders_operation_at_idx on public.commerce_orders(operation_at desc, id desc);
create index commerce_orders_pending_idx on public.commerce_orders(created_at desc) where fulfillment_status='pending_pickup';

-- Cost is private: never place it in catalog_variants.document or the public catalog RPC.
create table public.catalog_variant_costs (
  variant_id uuid primary key references public.catalog_variants(id) on delete restrict,
  unit_cost bigint not null check(unit_cost between 0 and 99999999999),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.admin_users(user_id)
);
alter table public.catalog_variant_costs enable row level security;
revoke all on public.catalog_variant_costs from public, anon, authenticated;
grant select on public.catalog_variant_costs to authenticated;
create policy "Admin MFA reads purchase costs" on public.catalog_variant_costs
  for select to authenticated using ((select public.is_store_admin()));

create function public.set_variant_purchase_cost(p_variant_id uuid, p_unit_cost bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_store_admin() then raise exception 'Access denied' using errcode='42501'; end if;
  if p_variant_id is null or (p_unit_cost is not null and p_unit_cost not between 0 and 99999999999) then
    raise exception 'Invalid purchase cost';
  end if;
  perform 1 from public.catalog_state where id for update;
  if not exists(select 1 from public.catalog_variants where id=p_variant_id) then
    raise exception 'Unknown variant';
  end if;
  if p_unit_cost is null then
    delete from public.catalog_variant_costs where variant_id=p_variant_id;
  else
    insert into public.catalog_variant_costs(variant_id,unit_cost,updated_by)
      values(p_variant_id,p_unit_cost,auth.uid())
      on conflict(variant_id) do update set unit_cost=excluded.unit_cost,updated_at=now(),updated_by=excluded.updated_by;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_id)
    values(auth.uid(),'variant_purchase_cost_saved',p_variant_id);
end $$;
revoke all on function public.set_variant_purchase_cost(uuid,bigint) from public, anon, authenticated;
grant execute on function public.set_variant_purchase_cost(uuid,bigint) to authenticated;

create function public.order_purchase_cost(p_snapshot jsonb) returns bigint
language sql stable security definer set search_path='' as $$
  select case when jsonb_typeof(p_snapshot->'lines') <> 'array' or jsonb_array_length(p_snapshot->'lines')=0
    or count(*) <> jsonb_array_length(p_snapshot->'lines')
    or count(c.unit_cost) <> count(*) then null
    else sum(c.unit_cost * (line->>'quantity')::integer) end
  from jsonb_array_elements(case when jsonb_typeof(p_snapshot->'lines')='array' then p_snapshot->'lines' else '[]'::jsonb end) line
  left join public.catalog_variant_costs c on c.variant_id=(line->>'variantId')::uuid;
$$;
revoke all on function public.order_purchase_cost(jsonb) from public, anon, authenticated;

-- The order trigger snapshots cost at collection; later price/cost edits cannot rewrite history.
create function public.snapshot_paid_order() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.payment_status='paid' and (tg_op='INSERT' or old.payment_status='pending') then
    new.paid_at:=coalesce(new.paid_at,now());
    new.cost_total:=public.order_purchase_cost(new.snapshot);
  end if;
  return new;
end $$;
revoke all on function public.snapshot_paid_order() from public, anon, authenticated;
create trigger commerce_order_paid_snapshot before insert or update of payment_status on public.commerce_orders
  for each row execute function public.snapshot_paid_order();

-- A pending pickup is not a sale until collection. Lock the catalog revision to
-- serialize against catalog saves/cost edits, then lock variants and debit once.
create function public.complete_manual_pickup_order(p_order_id uuid, p_received boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.commerce_orders; line jsonb; previous_stock integer; q integer; variant_id uuid;
begin
  if not public.is_store_admin() then raise exception 'Access denied' using errcode='42501'; end if;
  if p_order_id is null or p_received is distinct from true then raise exception 'Confirm collection'; end if;
  perform 1 from public.catalog_state where id for update;
  select * into o from public.commerce_orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if o.payment_status='paid' and o.fulfillment_status='picked_up' then
    return jsonb_build_object('id',o.id,'paidAt',o.paid_at,'pickedUpAt',o.picked_up_at);
  end if;
  if o.payment_status<>'pending' or o.fulfillment_status<>'pending_pickup' then
    raise exception 'Order cannot be collected';
  end if;
  if jsonb_typeof(o.snapshot->'lines') <> 'array' then raise exception 'Invalid order lines'; end if;
  for line in select * from jsonb_array_elements(o.snapshot->'lines') loop
    variant_id:=(line->>'variantId')::uuid;
    q:=(line->>'quantity')::integer;
    if q is null or q not between 1 and 999 then raise exception 'Invalid order quantity'; end if;
    select stock into previous_stock from public.catalog_variants where id=variant_id for update;
    if not found or previous_stock<q then raise exception 'Insufficient stock for %',line->>'name' using errcode='23514'; end if;
    update public.catalog_variants set stock=stock-q where id=variant_id;
    insert into public.inventory_movements(variant_id,quantity_delta,previous_quantity,new_quantity,reason,admin_id)
      values(variant_id,-q,previous_stock,previous_stock-q,'manual_pickup_collected',auth.uid());
  end loop;
  update public.catalog_state set revision=revision+1 where id;
  update public.commerce_orders set payment_status='paid',fulfillment_status='picked_up',
    paid_at=now(),picked_up_at=now() where id=p_order_id returning * into o;
  insert into public.admin_audit_log(admin_id,action,target_id)
    values(auth.uid(),'manual_pickup_collected',p_order_id);
  return jsonb_build_object('id',o.id,'paidAt',o.paid_at,'pickedUpAt',o.picked_up_at);
end $$;
revoke all on function public.complete_manual_pickup_order(uuid,boolean) from public, anon, authenticated;
grant execute on function public.complete_manual_pickup_order(uuid,boolean) to authenticated;

-- One database aggregate for the current month and 12 historical months.
create function public.admin_sales_summary() returns jsonb
language sql stable security definer set search_path='' as $$
  with clock as (select (now() at time zone 'America/Argentina/Buenos_Aires')::date as today),
  bounds as (select date_trunc('month',today)::timestamp as month_start from clock),
  months as (select generate_series(month_start-interval '11 months',month_start,interval '1 month') as month_start from bounds),
  grouped as (
    select date_trunc('month',o.paid_at at time zone 'America/Argentina/Buenos_Aires') as month_start,
      count(*)::integer as sales, coalesce(sum((o.snapshot->>'total')::bigint-o.refund_total),0)::bigint as revenue,
      count(*) filter(where o.cost_total is null)::integer as missing_costs,
      sum((o.snapshot->>'total')::bigint-o.refund_total-o.fee_total-o.expense_total-o.cost_total)::bigint as profit
    from public.commerce_orders o,bounds b
    where o.payment_status='paid' and o.paid_at >= (b.month_start-interval '11 months') at time zone 'America/Argentina/Buenos_Aires'
      and o.paid_at < (b.month_start+interval '1 month') at time zone 'America/Argentina/Buenos_Aires'
    group by 1
  ), history as (
    select to_char(m.month_start,'YYYY-MM') as month,coalesce(g.sales,0) as sales,
      coalesce(g.revenue,0) as revenue,
      case when coalesce(g.missing_costs,0)=0 then coalesce(g.profit,0) else null end as profit,
      coalesce(g.missing_costs,0) as missing_costs
    from months m left join grouped g using(month_start) order by m.month_start
  )
  select case when public.is_store_admin() then jsonb_build_object(
    'month',(select to_char(month_start,'YYYY-MM') from bounds),
    'history',(select jsonb_agg(to_jsonb(h) order by h.month) from history h),
    'pendingPickups',(select count(*) from public.commerce_orders where fulfillment_status='pending_pickup')
  ) else null end;
$$;
revoke all on function public.admin_sales_summary() from public, anon, authenticated;
grant execute on function public.admin_sales_summary() to authenticated;
commit;
