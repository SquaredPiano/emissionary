-- Create 'profiles' table
create table profiles (
  id uuid primary key references auth.users(id) not null,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- Create 'receipts' table
create table receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) not null,
  file_url text,
  status text default 'uploaded',
  total_emissions numeric,
  store_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create 'receipt_items' table
create table receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid references receipts(id) on delete cascade not null,
  item_name text not null,
  quantity text,
  emissions numeric,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security
alter table profiles enable row level security;
alter table receipts enable row level security;
alter table receipt_items enable row level security;

create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

create policy "Users can view their own receipts." on receipts for select using (auth.uid() = profile_id);
create policy "Users can insert their own receipts." on receipts for insert with check (auth.uid() = profile_id);
create policy "Users can update their own receipts." on receipts for update using (auth.uid() = profile_id);

create policy "Users can view items for their own receipts." on receipt_items for select using (auth.uid() = (select profile_id from receipts where id = receipt_id));
create policy "Users can insert items for their own receipts." on receipt_items for insert with check (auth.uid() = (select profile_id from receipts where id = receipt_id));
