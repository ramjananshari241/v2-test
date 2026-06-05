-- ============================================================
-- PRO BLOG 商用图库模块 · Supabase 一键建表
-- 在 Supabase Dashboard → SQL Editor → New query → 粘贴运行
-- ============================================================

-- 扩展（Supabase 默认已启用 uuid）
create extension if not exists "pgcrypto";

-- 一套图库 = 一篇作品（用 post_slug 与 Notion 文章关联）
create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null,
  post_notion_id text,
  title text,
  image_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint galleries_post_slug_unique unique (post_slug)
);

create index if not exists idx_galleries_post_slug on public.galleries (post_slug);

-- 单张图片（文件在兰空，这里只存 URL）
create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  url text not null,
  thumb_url text,
  sort_order integer not null default 0,
  width integer,
  height integer,
  file_size integer,
  created_at timestamptz not null default now()
);

-- file_size：上传时记录的压缩后字节数，用于后台图库容量统计（默认上限 50GB）

create index if not exists idx_gallery_images_gallery_sort
  on public.gallery_images (gallery_id, sort_order);

-- 自动更新 updated_at
create or replace function public.set_galleries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_galleries_updated_at on public.galleries;
create trigger trg_galleries_updated_at
  before update on public.galleries
  for each row
  execute function public.set_galleries_updated_at();

-- 同步 image_count
create or replace function public.sync_gallery_image_count()
returns trigger
language plpgsql
as $$
declare
  gid uuid;
begin
  if tg_op = 'DELETE' then
    gid := old.gallery_id;
  else
    gid := new.gallery_id;
  end if;
  update public.galleries g
  set image_count = (
    select count(*)::integer from public.gallery_images i where i.gallery_id = gid
  )
  where g.id = gid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_gallery_image_count_ins on public.gallery_images;
create trigger trg_sync_gallery_image_count_ins
  after insert on public.gallery_images
  for each row
  execute function public.sync_gallery_image_count();

drop trigger if exists trg_sync_gallery_image_count_del on public.gallery_images;
create trigger trg_sync_gallery_image_count_del
  after delete on public.gallery_images
  for each row
  execute function public.sync_gallery_image_count();

-- 安全：开启 RLS，不开放匿名读写；仅服务端用 service_role 访问
alter table public.galleries enable row level security;
alter table public.gallery_images enable row level security;

-- 不创建 public 策略 = 匿名/登录用户无法直接访问表（service_role 仍可读写）

comment on table public.galleries is 'Gallery 主题作品图库（与 Notion post_slug 关联）';
comment on table public.gallery_images is '图库内单张图片（兰空 URL）';
