begin;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) > 0 and char_length(title) <= 100),
  description text not null check (char_length(btrim(description)) > 0 and char_length(description) <= 1000),
  photo_path text not null check (char_length(btrim(photo_path)) > 0),
  category text not null check (category in ('Clothing', 'Electronics', 'Books', 'Accessories', 'Other')),
  date_found date not null,
  collection_location text not null default 'School reception' check (collection_location = 'School reception'),
  returned boolean not null default false,
  created_at timestamptz not null default now()
);

create index items_newest_first on public.items (created_at desc, id desc);
alter table public.items enable row level security;
-- No client policies: anonymous/authenticated clients cannot access records.
revoke all on table public.items from public, anon, authenticated;
grant select, insert, update on table public.items to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket URLs allow downloads. No storage.objects client write policies
-- are added. Uploads and deletes use the server secret's service_role privileges.
commit;
