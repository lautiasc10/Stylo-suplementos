begin;

-- Keep all original paths valid. Only processed masters can be catalog covers;
-- responsive siblings and archived originals remain ordinary Storage objects.
alter table public.catalog_images drop constraint catalog_images_path_check;
alter table public.catalog_images add constraint catalog_images_path_check check (
  path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}(\.(jpg|jpeg|png|webp)|-normalized-v1-(jpg|png|webp)-1000\.webp|-information-v1-(jpg|png|webp)\.webp)$'
);

create function public.catalog_media_capabilities() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_store_admin() then
    raise exception 'Admin with MFA required' using errcode = '42501';
  end if;
  return jsonb_build_object('normalizedUploads', true);
end;
$$;
revoke all on function public.catalog_media_capabilities() from public, anon;
grant execute on function public.catalog_media_capabilities() to authenticated;

commit;
