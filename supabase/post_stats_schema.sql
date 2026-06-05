-- ============================================================
-- Gallery 文章浏览 / 下载统计（热门推荐数据源）
-- 在 Supabase Dashboard → SQL Editor 运行
-- ============================================================

create table if not exists public.post_stats (
  post_slug text primary key,
  view_count bigint not null default 0 check (view_count >= 0),
  download_count bigint not null default 0 check (download_count >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists idx_post_stats_popularity
  on public.post_stats ((view_count + download_count * 3) desc);

comment on table public.post_stats is 'Gallery 文章浏览与下载计数（post_slug 对应 Notion 文章 slug）';

-- 原子递增，避免并发丢计数
create or replace function public.increment_post_stat(p_slug text, p_field text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_slug is null or length(trim(p_slug)) = 0 then
    return;
  end if;
  if p_field not in ('view', 'download') then
    return;
  end if;

  insert into public.post_stats (post_slug, view_count, download_count)
  values (
    trim(p_slug),
    case when p_field = 'view' then 1 else 0 end,
    case when p_field = 'download' then 1 else 0 end
  )
  on conflict (post_slug) do update
  set
    view_count = post_stats.view_count + case when p_field = 'view' then 1 else 0 end,
    download_count = post_stats.download_count + case when p_field = 'download' then 1 else 0 end,
    updated_at = now();
end;
$$;

alter table public.post_stats enable row level security;
-- 不创建 public 策略：仅 service_role 通过服务端 API 读写
