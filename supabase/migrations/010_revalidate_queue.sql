-- ISR / revalidate 队列：保存内容时先入队，稍后按 site_id + path 合并消费。
-- 执行位置：Supabase SQL Editor。

create table if not exists public.blog_revalidate_queue (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null,
  path text not null check (path <> '' and left(path, 1) = '/'),
  scope text not null default 'unknown',
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  priority integer not null default 0,
  scheduled_at timestamptz not null default now(),
  claimed_at timestamptz,
  processed_at timestamptz,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  fresh_theme boolean not null default false,
  clear_caches boolean not null default true,
  warm_paths boolean not null default false,
  expected_theme text,
  content_change boolean not null default false,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_blog_revalidate_queue_site_status_due
  on public.blog_revalidate_queue (site_id, status, scheduled_at, priority desc);

create index if not exists idx_blog_revalidate_queue_created_at
  on public.blog_revalidate_queue (created_at desc);

create unique index if not exists uq_blog_revalidate_queue_pending_path
  on public.blog_revalidate_queue (site_id, path)
  where status = 'pending';

create or replace function public.set_blog_revalidate_queue_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_blog_revalidate_queue_updated_at
  on public.blog_revalidate_queue;

create trigger trg_blog_revalidate_queue_updated_at
before update on public.blog_revalidate_queue
for each row execute function public.set_blog_revalidate_queue_updated_at();

alter table public.blog_revalidate_queue enable row level security;

comment on table public.blog_revalidate_queue is
  'Blog ISR 刷新队列。只由服务端 service_role 读写，按 site_id + path 合并 pending 刷新任务。';
