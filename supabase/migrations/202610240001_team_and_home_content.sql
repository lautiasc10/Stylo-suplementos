begin;

-- Private inbox. Public visitors can submit through one validated RPC only.
create table public.team_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null check(kind in ('athlete','teacher','both')),
  name text not null check(length(trim(name)) between 2 and 120),
  email text not null check(length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  instagram text not null default '' check(length(instagram) <= 80),
  discipline text not null check(length(trim(discipline)) between 2 and 120),
  message text not null default '' check(length(message) <= 2000),
  consent_version text not null check(consent_version = 'team-contact-v1'),
  status text not null default 'new' check(status in ('new','reviewing','contacted','closed')),
  notes text not null default '' check(length(notes) <= 2000)
);
create index team_applications_recent on public.team_applications(created_at desc, id);
create index team_applications_email_recent on public.team_applications(email, created_at desc);
alter table public.team_applications enable row level security;
revoke all on public.team_applications from public, anon, authenticated;
grant select on public.team_applications to authenticated;
create policy "Admin MFA reads team inbox" on public.team_applications for select to authenticated
  using ((select public.is_store_admin()));

create function public.submit_team_application(p_payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare clean jsonb; existing public.team_applications; result uuid;
begin
  if p_payload is null or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>12000 then
    raise exception 'Invalid application' using errcode='22023';
  end if;
  clean := jsonb_build_object(
    'kind',trim(p_payload->>'kind'), 'name',trim(p_payload->>'name'),
    'email',lower(trim(p_payload->>'email')), 'instagram',trim(coalesce(p_payload->>'instagram','')),
    'discipline',trim(p_payload->>'discipline'), 'message',trim(coalesce(p_payload->>'message',''))
  );
  if p_payload->'consent' is distinct from 'true'::jsonb or
    clean->>'kind' is null or clean->>'kind' not in ('athlete','teacher','both') or
    length(coalesce(clean->>'name','')) not between 2 and 120 or
    length(coalesce(clean->>'discipline','')) not between 2 and 120 or
    length(coalesce(clean->>'email','')) not between 5 and 254 or
    (clean->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or
    length(clean->>'instagram')>80 or length(clean->>'message')>2000 then
    raise exception 'Invalid application' using errcode='22023';
  end if;
  -- Serialize admission so simultaneous submissions cannot evade the limits.
  perform pg_advisory_xact_lock(20261024,1);
  select * into existing from public.team_applications
    where email=clean->>'email' and created_at>now()-interval '15 minutes'
    order by created_at desc limit 1;
  if found then
    if existing.kind=clean->>'kind' and existing.name=clean->>'name' and
      existing.instagram=clean->>'instagram' and existing.discipline=clean->>'discipline' and
      existing.message=clean->>'message' then return existing.id; end if;
    raise exception 'Please wait before submitting again' using errcode='P0001';
  end if;
  if (select count(*) from public.team_applications where created_at>now()-interval '1 hour')>=50 or
     (select count(*) from public.team_applications where created_at>now()-interval '1 day')>=500 then
    raise exception 'Please wait before submitting again' using errcode='P0001';
  end if;
  insert into public.team_applications(kind,name,email,instagram,discipline,message,consent_version)
    values(clean->>'kind',clean->>'name',clean->>'email',clean->>'instagram',clean->>'discipline',clean->>'message','team-contact-v1')
    returning id into result;
  return result;
end $$;
revoke all on function public.submit_team_application(jsonb) from public;
grant execute on function public.submit_team_application(jsonb) to anon, authenticated;

create function public.review_team_application(p_id uuid, p_status text, p_notes text, p_expected_updated_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_store_admin() then raise exception 'Access denied' using errcode='42501'; end if;
  if p_status is null or p_status not in ('new','reviewing','contacted','closed') or p_notes is null or length(p_notes)>2000 then
    raise exception 'Invalid review' using errcode='22023';
  end if;
  update public.team_applications set status=p_status,notes=p_notes,updated_at=clock_timestamp()
    where id=p_id and updated_at=p_expected_updated_at;
  if not found then raise exception 'Reload application' using errcode='40001'; end if;
  insert into public.admin_audit_log(admin_id,action,target_id) values(auth.uid(),'team_application_reviewed',p_id);
end $$;
revoke all on function public.review_team_application(uuid,text,text,timestamptz) from public,anon;
grant execute on function public.review_team_application(uuid,text,text,timestamptz) to authenticated;

create index commerce_orders_paid_month on public.commerce_orders(created_at) where payment_status='paid';

-- Aggregate only. No customer fields, amounts, unit totals or historic queries
-- are exposed. Calendar months use Buenos Aires, matching the admin dashboard.
create function public.storefront_content_snapshot() returns jsonb
language sql stable security definer set search_path = '' as $$
  with bounds as (
    select date_trunc('month',now() at time zone 'America/Argentina/Buenos_Aires') as start
  ), sold as (
    select v.product_id,v.id as variant_id,sum(case when line->>'quantity' ~ '^[0-9]{1,9}$' then (line->>'quantity')::integer else 0 end) as units
    from public.commerce_orders o
    cross join bounds
    cross join lateral jsonb_array_elements(case when jsonb_typeof(o.snapshot->'lines')='array' then o.snapshot->'lines' else '[]'::jsonb end) line
    join public.catalog_variants v on v.id=case when line->>'variantId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (line->>'variantId')::uuid end
    join public.catalog_products p on p.id=v.product_id
    join public.catalog_brands b on b.id=p.brand_id
    where o.payment_status='paid' and v.active and p.active and b.active
      and o.created_at>=bounds.start at time zone 'America/Argentina/Buenos_Aires'
      and o.created_at<(bounds.start+interval '1 month') at time zone 'America/Argentina/Buenos_Aires'
      and case when line->>'quantity' ~ '^[0-9]{1,9}$' then (line->>'quantity')::integer else 0 end>0
    group by v.product_id,v.id
  ), ranked as (
    select product_id,variant_id,sum(units) over(partition by product_id) as total,
      row_number() over(partition by product_id order by units desc,variant_id) as choice
    from sold
  ), top_three as (
    select product_id,variant_id,total from ranked where choice=1 order by total desc,product_id limit 3
  )
  select jsonb_build_object('teamApplications',true,'ranking',coalesce((
    select jsonb_agg(jsonb_build_object('productId',product_id,'variantId',variant_id) order by total desc,product_id) from top_three
  ),'[]'::jsonb));
$$;
revoke all on function public.storefront_content_snapshot() from public;
grant execute on function public.storefront_content_snapshot() to anon,authenticated;

commit;
