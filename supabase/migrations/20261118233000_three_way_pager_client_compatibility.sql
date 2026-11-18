-- Older clients calculate the seventh-nurse rotation. Keep viewing available
-- while requiring the shared-Pager client for guarded roster writes.
update public.app_compatibility
set minimum_write_version = case when public.app_version_at_least_v49(minimum_write_version, '64.0')
      then minimum_write_version else '64.0' end,
    recommended_version = case when public.app_version_at_least_v49(recommended_version, '64.0')
      then recommended_version else '64.0' end,
    updated_at = now()
where id = 1
  and (not public.app_version_at_least_v49(minimum_write_version, '64.0')
       or not public.app_version_at_least_v49(recommended_version, '64.0'));
