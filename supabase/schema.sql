-- HUDDLE: run once in Supabase > SQL Editor
create table profiles(id uuid primary key references auth.users on delete cascade,username text unique not null check(username~'^[a-z0-9_.]{3,20}$'),bio text default '',avatar_url text,created_at timestamptz default now());
create table posts(id bigint generated always as identity primary key,user_id uuid not null default auth.uid() references profiles on delete cascade,media_url text not null,media_type text not null default 'image',caption text default '',is_reel boolean default false,created_at timestamptz default now());
create table likes(post_id bigint references posts on delete cascade,user_id uuid default auth.uid() references profiles on delete cascade,primary key(post_id,user_id));
create table comments(id bigint generated always as identity primary key,post_id bigint references posts on delete cascade,user_id uuid not null default auth.uid() references profiles on delete cascade,body text not null check(length(body)<=500),created_at timestamptz default now());
create table follows(follower uuid default auth.uid() references profiles on delete cascade,following uuid references profiles on delete cascade,primary key(follower,following),check(follower<>following));
create table messages(id bigint generated always as identity primary key,sender uuid not null default auth.uid() references profiles on delete cascade,receiver uuid not null references profiles on delete cascade,body text not null check(length(body)<=2000),created_at timestamptz default now());
create index on messages(sender,receiver,created_at);

create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,username) values(new.id,lower(coalesce(new.raw_user_meta_data->>'username','user'||substr(new.id::text,1,6)))); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Row Level Security: every table locked down
alter table profiles enable row level security; alter table posts enable row level security; alter table likes enable row level security;
alter table comments enable row level security; alter table follows enable row level security; alter table messages enable row level security;
create policy "read" on profiles for select to authenticated using(true);
create policy "edit own" on profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "read" on posts for select to authenticated using(true);
create policy "add own" on posts for insert to authenticated with check(user_id=auth.uid());
create policy "delete own" on posts for delete to authenticated using(user_id=auth.uid());
create policy "read" on likes for select to authenticated using(true);
create policy "add own" on likes for insert to authenticated with check(user_id=auth.uid());
create policy "delete own" on likes for delete to authenticated using(user_id=auth.uid());
create policy "read" on comments for select to authenticated using(true);
create policy "add own" on comments for insert to authenticated with check(user_id=auth.uid());
create policy "delete own" on comments for delete to authenticated using(user_id=auth.uid());
create policy "read" on follows for select to authenticated using(true);
create policy "add own" on follows for insert to authenticated with check(follower=auth.uid());
create policy "delete own" on follows for delete to authenticated using(follower=auth.uid());
-- Chat privacy: only the two people in a conversation can read or send its messages
create policy "participants read" on messages for select to authenticated using(auth.uid() in(sender,receiver));
create policy "send as self" on messages for insert to authenticated with check(sender=auth.uid());

-- Storage for photos/videos (uploads only into your own folder)
insert into storage.buckets(id,name,public) values('media','media',true) on conflict do nothing;
create policy "media upload own folder" on storage.objects for insert to authenticated with check(bucket_id='media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "media delete own" on storage.objects for delete to authenticated using(bucket_id='media' and (storage.foldername(name))[1]=auth.uid()::text);
alter publication supabase_realtime add table messages;
