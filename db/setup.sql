-- Run once in the Supabase SQL editor. No public database or storage writes.
create table if not exists public.manfan_content (
 id text primary key, kind text not null check(kind in ('page','product','article')),
 published boolean not null default false, data jsonb not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.manfan_inquiries (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 source text not null, data jsonb not null,
 status text not null default 'new' check(status in ('new','following','quoted','completed')),
 notes text not null default ''
);
create table if not exists public.manfan_limits (key text primary key, hits integer not null, expires_at timestamptz not null);
alter table public.manfan_content enable row level security;
alter table public.manfan_inquiries enable row level security;
alter table public.manfan_limits enable row level security;
revoke all on public.manfan_content,public.manfan_inquiries,public.manfan_limits from public,anon,authenticated;
grant usage on schema public to service_role;
grant all on public.manfan_content,public.manfan_inquiries,public.manfan_limits to service_role;
create or replace function public.manfan_rate_limit(bucket text, max_hits integer, window_seconds integer)
returns boolean language plpgsql security invoker set search_path=public as $$
declare count_now integer;
begin
 delete from manfan_limits where expires_at < now();
 insert into manfan_limits(key,hits,expires_at) values(bucket,1,now()+make_interval(secs=>window_seconds))
 on conflict(key) do update set hits=manfan_limits.hits+1 returning hits into count_now;
 return count_now<=max_hits;
end; $$;
revoke all on function public.manfan_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.manfan_rate_limit(text,integer,integer) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('manfan-images','manfan-images',true,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
