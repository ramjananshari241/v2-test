-- 全主题切换配额：24 小时滑动窗口内最多 4 次有效切换
alter table public.blog_site_settings
  add column if not exists theme_switch_window_start timestamptz,
  add column if not exists theme_switch_count integer not null default 0;

comment on column public.blog_site_settings.theme_switch_window_start is
  '当前主题切换配额窗口起始时间';
comment on column public.blog_site_settings.theme_switch_count is
  '当前 24h 窗口内已完成的主题切换次数（上限 4）';
