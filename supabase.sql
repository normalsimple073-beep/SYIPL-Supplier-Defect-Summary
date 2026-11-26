-- Run this in Supabase SQL Editor. Review policies before production deployment.
create table public.suppliers (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 email text not null unique,
 created_at timestamptz default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'supplier' check (role in ('admin','supplier')),
 supplier_id uuid references public.suppliers(id),
 email text
);
create table public.defects (
 id uuid primary key default gen_random_uuid(),
 part_no text not null,
 defect text not null,
 defect_date date not null,
 supplier_id uuid references public.suppliers(id),
 created_at timestamptz default now()
);
create table public.action_plans (
 id uuid primary key default gen_random_uuid(),
 defect_id uuid not null unique references public.defects(id) on delete cascade,
 root_cause text,
 corrective_action text,
 preventive_action text,
 target_date date,
 submitted boolean default false,
 updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
alter table public.suppliers enable row level security;
alter table public.defects enable row level security;
alter table public.action_plans enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;
create or replace function public.my_supplier_id() returns uuid language sql stable security definer set search_path=public as $$ select supplier_id from public.profiles where id=auth.uid() $$;

create policy "profile read self or admin" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "admin profile manage" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "supplier read own supplier" on public.suppliers for select using (id=public.my_supplier_id() or public.is_admin());
create policy "admin manage suppliers" on public.suppliers for all using (public.is_admin()) with check (public.is_admin());
create policy "supplier read assigned defects" on public.defects for select using (supplier_id=public.my_supplier_id() or public.is_admin());
create policy "admin defects manage" on public.defects for all using (public.is_admin()) with check (public.is_admin());
create policy "supplier read own plans" on public.action_plans for select using (exists(select 1 from public.defects d where d.id=defect_id and d.supplier_id=public.my_supplier_id()) or public.is_admin());
create policy "supplier insert own plan" on public.action_plans for insert with check (exists(select 1 from public.defects d where d.id=defect_id and d.supplier_id=public.my_supplier_id()) and not public.is_admin());
create policy "supplier update own plan" on public.action_plans for update using (exists(select 1 from public.defects d where d.id=defect_id and d.supplier_id=public.my_supplier_id()) and not public.is_admin()) with check (exists(select 1 from public.defects d where d.id=defect_id and d.supplier_id=public.my_supplier_id()) and not public.is_admin());
create policy "admin plan manage" on public.action_plans for all using (public.is_admin()) with check (public.is_admin());

-- Realtime publication for dashboards:
alter publication supabase_realtime add table public.defects;
alter publication supabase_realtime add table public.action_plans;

-- After the first signup, replace USER_UUID with the UUID from Authentication > Users:
-- insert into public.profiles(id,role,email) values('USER_UUID','admin','your-email@example.com');
-- For supplier accounts: create supplier row, then profile row with supplier_id linking them.
