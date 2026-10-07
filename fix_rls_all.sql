-- Fix RLS Policies for Profiles and Emergency Contacts
-- This script ensures that authenticated users can correctly insert and read their own data.

-- 1. Profiles Table RLS Fixes
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Emergency Contacts Table RLS Fixes
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own emergency contacts" ON emergency_contacts;
DROP POLICY IF EXISTS "Users can insert own emergency contacts" ON emergency_contacts;
DROP POLICY IF EXISTS "Users can update own emergency contacts" ON emergency_contacts;
DROP POLICY IF EXISTS "Users can delete own emergency contacts" ON emergency_contacts;

CREATE POLICY "Users can view own emergency contacts" ON emergency_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emergency contacts" ON emergency_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emergency contacts" ON emergency_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own emergency contacts" ON emergency_contacts FOR DELETE USING (auth.uid() = user_id);
