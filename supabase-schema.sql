-- Database Schema for Women Safety Route Planner

-- Enable PostGIS for geospatial queries (optional but recommended for production)
-- create extension if not exists postgis;

-- 1. Profiles Table (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text default 'user' check (role in ('user', 'admin')),
  phone_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Emergency Contacts
create table emergency_contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  phone_number text not null,
  relationship text,
  is_verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Incidents
create table incidents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  incident_type text not null,
  severity text not null check (severity in ('Low', 'Medium', 'High')),
  description text,
  latitude double precision not null,
  longitude double precision not null,
  location_name text,
  tags text[],
  photo_url text,
  status text default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Flagged')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Lighting Points (Admin managed)
create table lighting_points (
  id uuid default gen_random_uuid() primary key,
  latitude double precision not null,
  longitude double precision not null,
  level text not null check (level in ('Poor', 'Adequate', 'Excellent')),
  status text default 'Active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Public Activity Areas (Admin managed)
create table activity_areas (
  id uuid default gen_random_uuid() primary key,
  latitude double precision not null,
  longitude double precision not null,
  type text not null,
  level text not null check (level in ('Low', 'Medium', 'High')),
  status text default 'Active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Route History
create table route_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  origin_name text,
  destination_name text,
  origin_lat double precision,
  origin_lng double precision,
  dest_lat double precision,
  dest_lng double precision,
  distance_km double precision,
  duration_mins integer,
  safety_score numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. SOS Sessions
create table sos_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  status text default 'Active' check (status in ('Active', 'Resolved')),
  start_time timestamp with time zone default timezone('utc'::text, now()) not null,
  end_time timestamp with time zone
);

-- 8. SOS Location Updates
create table sos_location_updates (
  id uuid default gen_random_uuid() primary key,
  sos_id uuid references sos_sessions(id) on delete cascade not null,
  latitude double precision not null,
  longitude double precision not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Safety Settings (Global weights)
create table safety_settings (
  id integer primary key default 1,
  lighting_weight integer default 30,
  activity_weight integer default 30,
  incident_weight integer default 40,
  constraint check_total check (lighting_weight + activity_weight + incident_weight = 100)
);

insert into safety_settings (id, lighting_weight, activity_weight, incident_weight) values (1, 30, 30, 40);

-- Row Level Security (RLS) Setup

-- Enable RLS
alter table profiles enable row level security;
alter table emergency_contacts enable row level security;
alter table incidents enable row level security;
alter table lighting_points enable row level security;
alter table activity_areas enable row level security;
alter table route_history enable row level security;
alter table sos_sessions enable row level security;
alter table sos_location_updates enable row level security;
alter table safety_settings enable row level security;

-- Profiles: Users can read/write their own profile. Admins can read all.
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Emergency Contacts: Users can manage their own.
create policy "Users manage own contacts" on emergency_contacts for all using (auth.uid() = user_id);

-- Incidents: Users can view approved incidents (for maps), and manage their own. Admins manage all.
create policy "Anyone can view approved incidents" on incidents for select using (status = 'Approved');
create policy "Users can view own incidents" on incidents for select using (auth.uid() = user_id);
create policy "Users can insert own incidents" on incidents for insert with check (auth.uid() = user_id);
create policy "Admins can manage all incidents" on incidents for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Lighting & Activity: Anyone can read. Admins can manage.
create policy "Anyone can view lighting" on lighting_points for select using (true);
create policy "Admins manage lighting" on lighting_points for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Anyone can view activity" on activity_areas for select using (true);
create policy "Admins manage activity" on activity_areas for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Route History: Users can manage their own.
create policy "Users manage own route history" on route_history for all using (auth.uid() = user_id);

-- SOS: Users can manage their own. Admins can view all.
create policy "Users manage own SOS" on sos_sessions for all using (auth.uid() = user_id);
create policy "Admins view all SOS" on sos_sessions for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Users manage own SOS locations" on sos_location_updates for all using (
  exists (select 1 from sos_sessions where sos_sessions.id = sos_id and sos_sessions.user_id = auth.uid())
);
create policy "Admins view all SOS locations" on sos_location_updates for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Safety Settings: Anyone can read. Admins can update.
create policy "Anyone can view safety settings" on safety_settings for select using (true);
create policy "Admins can update safety settings" on safety_settings for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
