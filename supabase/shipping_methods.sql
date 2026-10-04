-- ============================================================
-- MUHAJ Multi Biz
-- Shipping Methods
-- ============================================================

create table if not exists public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  zone text not null default 'Nationwide Nigeria',
  fee numeric(12,2) not null default 0,
  free_shipping_threshold numeric(12,2),
  estimated_days text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipping_methods_active_idx
  on public.shipping_methods(is_active);

create index if not exists shipping_methods_sort_idx
  on public.shipping_methods(sort_order);

alter table public.shipping_methods enable row level security;

drop policy if exists "Shipping methods admin read"
on public.shipping_methods;

drop policy if exists "Shipping methods admin insert"
on public.shipping_methods;

drop policy if exists "Shipping methods admin update"
on public.shipping_methods;

drop policy if exists "Shipping methods admin delete"
on public.shipping_methods;

create policy "Shipping methods admin read"
on public.shipping_methods
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

create policy "Shipping methods admin insert"
on public.shipping_methods
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

create policy "Shipping methods admin update"
on public.shipping_methods
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

create policy "Shipping methods admin delete"
on public.shipping_methods
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

insert into public.shipping_methods (
  name,
  description,
  zone,
  fee,
  free_shipping_threshold,
  estimated_days,
  is_active,
  sort_order
)
select
  'Nationwide Delivery',
  'Standard delivery across Nigeria.',
  'Nationwide Nigeria',
  0,
  null,
  '3–7 business days',
  true,
  0
where not exists (
  select 1
  from public.shipping_methods
);

notify pgrst, 'reload schema';