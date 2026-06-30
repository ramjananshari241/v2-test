-- 贩售机全站开关：后台可即时切换，ISR 再生后各主题隐藏入口
alter table public.blog_site_settings
  add column if not exists vending_enabled boolean not null default true;

comment on column public.blog_site_settings.vending_enabled is
  '是否在各主题展示贩售机入口（Standard / Gallery / Tweet）';
