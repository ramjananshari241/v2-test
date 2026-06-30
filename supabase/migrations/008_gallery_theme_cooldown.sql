-- Gallery 主题切换冷却：离开 Gallery 后 24h 内不可再次切入
alter table public.blog_site_settings
  add column if not exists gallery_theme_cooldown_until timestamptz;

comment on column public.blog_site_settings.gallery_theme_cooldown_until is
  'Gallery 主题冷却截止时间；离开 Gallery 后写入，到期前禁止再次切换至 Gallery';
