-- Create saved_trips table
CREATE TABLE saved_trips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title text,
  origin_name text NOT NULL,
  origin_latitude double precision NOT NULL,
  origin_longitude double precision NOT NULL,
  destination_name text NOT NULL,
  destination_latitude double precision NOT NULL,
  destination_longitude double precision NOT NULL,
  distance_meters integer,
  duration_seconds integer,
  safety_score integer,
  route_type text,
  route_geometry jsonb,
  lighting_score integer,
  activity_score integer,
  incident_score integer,
  safe_place_score integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE saved_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips" ON saved_trips 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips" ON saved_trips 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON saved_trips 
  FOR DELETE USING (auth.uid() = user_id);
