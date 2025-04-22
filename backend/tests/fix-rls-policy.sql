-- SQL script to fix Row-Level Security policy for users table
-- Run this in your Supabase SQL Editor

-- First, let's check if RLS is enabled and what policies exist
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'users';

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Users are viewable by anyone with the anon key" ON users;
DROP POLICY IF EXISTS "Users can be inserted by anyone with the anon key" ON users;
DROP POLICY IF EXISTS "Users can only be updated by themselves" ON users;

-- Create new permissive policies for testing
-- Allow anyone to select users
CREATE POLICY "Allow select for users" 
ON public.users
FOR SELECT USING (true);

-- Allow anyone to insert users
CREATE POLICY "Allow insert for users" 
ON public.users
FOR INSERT WITH CHECK (true);

-- Allow anyone to update users
CREATE POLICY "Allow update for users" 
ON public.users
FOR UPDATE USING (true);

-- Allow anyone to delete users
CREATE POLICY "Allow delete for users" 
ON public.users
FOR DELETE USING (true);

-- If needed, you could temporarily disable RLS for testing
-- Uncomment the line below for testing only (not recommended for production)
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.users TO anon, authenticated, service_role; 