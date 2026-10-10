-- Fase 1: administrador único, auditoría y permisos de imágenes.
-- Aplicar primero en un proyecto de pruebas. No contiene usuarios ni secretos.
begin;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete restrict,
  singleton boolean not null default true unique check (singleton),
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
create policy "Administrador consulta su pertenencia" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

create function public.is_store_admin() returns boolean
language sql stable security invoker set search_path = ''
as $$
  select coalesce((auth.jwt()->>'aal') = 'aal2', false)
    and exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_store_admin() from public, anon;
grant execute on function public.is_store_admin() to authenticated;

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.admin_users(user_id) on delete restrict,
  action text not null check (char_length(action) between 1 and 100),
  target_id text check (char_length(target_id) <= 100),
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
create policy "Auditoría privada con MFA" on public.admin_audit_log
  for select to authenticated using ((select public.is_store_admin()));

create function public.record_admin_action(action_name text, target_identifier text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_store_admin() then
    raise exception 'Acceso denegado' using errcode = '42501';
  end if;
  insert into public.admin_audit_log(admin_id, action, target_id)
    values (auth.uid(), action_name, target_identifier);
end;
$$;
revoke all on function public.record_admin_action(text, text) from public, anon;
grant execute on function public.record_admin_action(text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-media', 'product-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
-- Lectura de objetos del bucket público; subidas/modificaciones solo admin con MFA.
create policy "STYLO subir imágenes" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-media' and (select public.is_store_admin()));
create policy "STYLO consultar biblioteca" on storage.objects
  for select to authenticated using (bucket_id = 'product-media' and (select public.is_store_admin()));
create policy "STYLO editar imágenes" on storage.objects
  for update to authenticated using (bucket_id = 'product-media' and (select public.is_store_admin()))
  with check (bucket_id = 'product-media' and (select public.is_store_admin()));
create policy "STYLO eliminar imágenes" on storage.objects
  for delete to authenticated using (bucket_id = 'product-media' and (select public.is_store_admin()));

commit;
