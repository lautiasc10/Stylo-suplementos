begin;
-- Cash is exclusively an admin-recorded, already collected in-person sale.
alter table public.commerce_orders drop constraint commerce_orders_payment_status_check;
alter table public.commerce_orders drop constraint commerce_orders_fulfillment_status_check;
alter table public.commerce_orders add constraint manual_order_states check (
  (payment_status='pending' and fulfillment_status='pending_pickup') or
  (payment_status='paid' and fulfillment_status='delivered')
);
create function public.create_manual_cash_sale(request_id uuid, items jsonb, customer jsonb, received boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare saved public.commerce_orders; payload jsonb; price jsonb; order_id uuid; line jsonb; previous_stock integer; quantity integer;
begin
  if not public.is_store_admin() then raise exception 'Access denied' using errcode='42501'; end if;
  if received is distinct from true or request_id is null or octet_length(items::text)>10000 or jsonb_typeof(customer) is distinct from 'object' or
    jsonb_typeof(customer->'name') is distinct from 'string' or length(trim(customer->>'name')) not between 1 and 100 or
    jsonb_typeof(customer->'phone') is distinct from 'string' or length(customer->>'phone')>30 then raise exception 'Invalid cash sale'; end if;
  payload:=jsonb_build_object('kind','cash-sale','items',items,'customer',jsonb_build_object('name',trim(customer->>'name'),'phone',customer->>'phone'));
  perform 1 from public.catalog_state where id for update;
  perform 1 from public.commerce_state where id for update;
  select * into saved from public.commerce_orders o where o.request_id=create_manual_cash_sale.request_id;
  if found then
    if saved.request_payload<>payload then raise exception 'Idempotency conflict' using errcode='40001'; end if;
    return jsonb_build_object('id',saved.id,'snapshot',saved.snapshot);
  end if;
  price:=public.commerce_price_items(items,'efectivo'); order_id:=gen_random_uuid();
  insert into public.commerce_orders(id,request_id,source,payment_status,fulfillment_status,customer,request_payload,snapshot,admin_id)
    values(order_id,request_id,'manual','paid','delivered',payload->'customer',payload,price,auth.uid());
  for line in select * from jsonb_array_elements(price->'lines') loop
    quantity:=(line->>'quantity')::integer;
    select stock into previous_stock from public.catalog_variants where id=(line->>'variantId')::uuid for update;
    update public.catalog_variants set stock=stock-quantity where id=(line->>'variantId')::uuid;
    insert into public.inventory_movements(variant_id,quantity_delta,previous_quantity,new_quantity,reason,admin_id)
      values((line->>'variantId')::uuid,-quantity,previous_stock,previous_stock-quantity,'manual_cash_sale',auth.uid());
  end loop;
  update public.catalog_state set revision=revision+1 where id;
  insert into public.admin_audit_log(admin_id,action,target_id) values(auth.uid(),'manual_cash_sale_created',order_id);
  return jsonb_build_object('id',order_id,'snapshot',price);
end $$;
revoke all on function public.create_manual_cash_sale(uuid,jsonb,jsonb,boolean) from public;
grant execute on function public.create_manual_cash_sale(uuid,jsonb,jsonb,boolean) to authenticated;
commit;
