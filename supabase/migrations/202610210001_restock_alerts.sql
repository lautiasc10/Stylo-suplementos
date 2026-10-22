-- Fase 3AB. Avisos voluntarios de reposición; aplicar primero en una base de prueba.
begin;

create table public.restock_alerts (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.catalog_variants(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254 and email = lower(trim(email))),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'queued', 'sending', 'sent', 'cancelled', 'failed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  confirmed_at timestamptz,
  claimed_at timestamptz,
  sent_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts between 0 and 3),
  provider_id text check (provider_id is null or char_length(provider_id) <= 200),
  unique (variant_id, email)
);
create index restock_alerts_queue on public.restock_alerts(next_attempt_at, created_at)
  where status in ('queued', 'sending');
alter table public.restock_alerts enable row level security;
revoke all on public.restock_alerts from public, anon, authenticated;
grant select on public.restock_alerts to authenticated;
create policy "Admin MFA lee avisos de reposición" on public.restock_alerts
  for select to authenticated using ((select public.is_store_admin()));

create function public.request_restock_alert(p_variant_id uuid, p_email text, p_token_hash text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare normalized text; accepted uuid;
begin
  normalized := lower(trim(p_email));
  if normalized is null or char_length(normalized) not between 3 and 254
    or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;
  if not exists (
    select 1 from public.catalog_variants v
    join public.catalog_products p on p.id = v.product_id
    where v.id = p_variant_id and v.active and p.active and v.stock = 0
  ) then return false; end if;
  -- One address can request a fresh confirmation after 15 minutes; confirmed
  -- requests never receive another confirmation for the same stock cycle.
  insert into public.restock_alerts(variant_id, email, token_hash)
  values (p_variant_id, normalized, p_token_hash)
  on conflict (variant_id, email) do update
    set token_hash = excluded.token_hash, status = 'pending', created_at = now(),
        expires_at = now() + interval '48 hours', confirmed_at = null,
        claimed_at = null, sent_at = null, attempts = 0,
        next_attempt_at = now(), provider_id = null
    where public.restock_alerts.status in ('sent', 'cancelled', 'failed')
       or (public.restock_alerts.status = 'pending'
           and public.restock_alerts.created_at < now() - interval '15 minutes')
  returning id into accepted;
  return accepted is not null;
end;
$$;
revoke all on function public.request_restock_alert(uuid, text, text) from public, anon, authenticated;
grant execute on function public.request_restock_alert(uuid, text, text) to service_role;

create function public.abandon_restock_request(p_token_hash text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.restock_alerts
  where token_hash = p_token_hash and status = 'pending';
end;
$$;
revoke all on function public.abandon_restock_request(text) from public, anon, authenticated;
grant execute on function public.abandon_restock_request(text) to service_role;

create function public.confirm_restock_alert(p_token_hash text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare alert_id uuid; available boolean;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  select a.id, v.stock > 0 and v.active and p.active into alert_id, available
  from public.restock_alerts a
  join public.catalog_variants v on v.id = a.variant_id
  join public.catalog_products p on p.id = v.product_id
  where a.token_hash = p_token_hash and a.status = 'pending' and a.expires_at > now()
  for update of a;
  if alert_id is null then return false; end if;
  update public.restock_alerts
    set status = case when available then 'queued' else 'confirmed' end,
        confirmed_at = now(), next_attempt_at = now()
  where id = alert_id;
  return true;
end;
$$;
revoke all on function public.confirm_restock_alert(text) from public, anon, authenticated;
grant execute on function public.confirm_restock_alert(text) to service_role;

create function public.cancel_restock_alert(p_token_hash text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare removed uuid;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  update public.restock_alerts set status = 'cancelled'
  where token_hash = p_token_hash and status in ('pending', 'confirmed', 'queued')
  returning id into removed;
  return removed is not null;
end;
$$;
revoke all on function public.cancel_restock_alert(text) from public, anon, authenticated;
grant execute on function public.cancel_restock_alert(text) to service_role;

create function public.queue_restock_alerts() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.active and new.stock > 0 and (old.stock = 0 or not old.active)
    and exists (select 1 from public.catalog_products p where p.id = new.product_id and p.active) then
    update public.restock_alerts set status = 'queued', next_attempt_at = now()
    where variant_id = new.id and status = 'confirmed';
  end if;
  return new;
end;
$$;
revoke all on function public.queue_restock_alerts() from public, anon, authenticated;
create trigger catalog_restock_queue after update of stock, active on public.catalog_variants
  for each row execute function public.queue_restock_alerts();

create function public.claim_restock_alerts(p_limit integer default 20)
returns table(alert_id uuid, variant_id uuid, recipient text, product_name text, product_slug text, flavor text)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_store_admin() and coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'Acceso denegado' using errcode = '42501';
  end if;
  return query
  with picked as (
    select a.id from public.restock_alerts a
    join public.catalog_variants v on v.id = a.variant_id
    join public.catalog_products p on p.id = v.product_id
    where v.stock > 0 and v.active and p.active and a.attempts < 3
      and ((a.status = 'queued' and a.next_attempt_at <= now())
        or (a.status = 'sending' and a.claimed_at < now() - interval '10 minutes'
            and a.claimed_at > now() - interval '23 hours'))
    order by a.created_at
    for update of a skip locked
    limit least(greatest(coalesce(p_limit, 20), 1), 20)
  ), updated as (
    update public.restock_alerts a
      set status = 'sending', claimed_at = now(), attempts = a.attempts + 1
    from picked where a.id = picked.id
    returning a.id, a.variant_id, a.email
  )
  select u.id, u.variant_id, u.email, p.document->>'name', p.slug, v.document->>'flavor'
  from updated u
  join public.catalog_variants v on v.id = u.variant_id
  join public.catalog_products p on p.id = v.product_id;
end;
$$;
revoke all on function public.claim_restock_alerts(integer) from public, anon;
grant execute on function public.claim_restock_alerts(integer) to authenticated, service_role;

create function public.complete_restock_alert(p_alert_id uuid, p_provider_id text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_store_admin() and coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'Acceso denegado' using errcode = '42501';
  end if;
  if p_provider_id is null or char_length(p_provider_id) not between 1 and 200 then
    raise exception 'Identificador del proveedor inválido';
  end if;
  update public.restock_alerts set status = 'sent', provider_id = p_provider_id, sent_at = now()
  where id = p_alert_id and status = 'sending';
end;
$$;
revoke all on function public.complete_restock_alert(uuid, text) from public, anon;
grant execute on function public.complete_restock_alert(uuid, text) to authenticated, service_role;

create function public.fail_restock_alert(p_alert_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_store_admin() and coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'Acceso denegado' using errcode = '42501';
  end if;
  update public.restock_alerts
    set status = case when attempts < 3 then 'queued' else 'failed' end,
        next_attempt_at = now() + interval '5 minutes'
  where id = p_alert_id and status = 'sending';
end;
$$;
revoke all on function public.fail_restock_alert(uuid) from public, anon;
grant execute on function public.fail_restock_alert(uuid) to authenticated, service_role;

commit;
