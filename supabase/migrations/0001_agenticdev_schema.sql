create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  photo_url text,
  email_verified boolean default false,
  role text default 'user',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.projects (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  project_type text default 'static-site',
  ai_model text default 'gemini-2.5-flash',
  agent_configs jsonb default '{}'::jsonb,
  global_skills text[] default array[]::text[],
  downloaded_skills text[] default array[]::text[],
  created_at timestamptz default now(),
  last_modified timestamptz default now()
);

create table if not exists public.project_files (
  project_id text not null references public.projects(id) on delete cascade,
  id text not null,
  path text not null,
  content text not null default '',
  language text not null default 'plaintext',
  last_modified timestamptz default now(),
  primary key (project_id, id)
);

create table if not exists public.project_tasks (
  project_id text not null references public.projects(id) on delete cascade,
  id text not null,
  title text not null,
  completed boolean not null default false,
  status text,
  created_at timestamptz default now(),
  primary key (project_id, id)
);

create table if not exists public.project_messages (
  project_id text not null references public.projects(id) on delete cascade,
  id text not null,
  role text not null,
  content text not null default '',
  timestamp timestamptz default now(),
  image_url text,
  attachments jsonb,
  is_debugger_proposal boolean default false,
  primary key (project_id, id)
);

create table if not exists public.available_skills (
  id text primary key,
  name text not null,
  description text not null default '',
  content text not null default '',
  category text not null default 'General'
);

create index if not exists projects_owner_last_modified_idx
  on public.projects(owner_id, last_modified desc);

create index if not exists project_files_project_path_idx
  on public.project_files(project_id, path asc);

create index if not exists project_tasks_project_created_idx
  on public.project_tasks(project_id, created_at desc);

create index if not exists project_messages_project_timestamp_idx
  on public.project_messages(project_id, timestamp asc);

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_messages enable row level security;
alter table public.available_skills enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select
  using (auth.uid() = id);

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
  for insert
  with check (auth.uid() = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists projects_select_own on public.projects;
create policy projects_select_own on public.projects
  for select
  using (auth.uid() = owner_id);

drop policy if exists projects_insert_own on public.projects;
create policy projects_insert_own on public.projects
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists projects_update_own on public.projects;
create policy projects_update_own on public.projects
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists projects_delete_own on public.projects;
create policy projects_delete_own on public.projects
  for delete
  using (auth.uid() = owner_id);

drop policy if exists project_files_owner_all on public.project_files;
create policy project_files_owner_all on public.project_files
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists project_tasks_owner_all on public.project_tasks;
create policy project_tasks_owner_all on public.project_tasks
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists project_messages_owner_all on public.project_messages;
create policy project_messages_owner_all on public.project_messages
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists available_skills_read_authenticated on public.available_skills;
create policy available_skills_read_authenticated on public.available_skills
  for select
  to authenticated
  using (true);

drop policy if exists available_skills_write_authenticated on public.available_skills;
create policy available_skills_write_authenticated on public.available_skills
  for all
  to authenticated
  using (true)
  with check (true);

do $$
begin
  alter publication supabase_realtime add table public.projects;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.project_files;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.project_tasks;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.project_messages;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.available_skills;
exception
  when duplicate_object then null;
end $$;
