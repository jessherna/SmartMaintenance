# Supabase Schema for Smart Maintenance App

## Users Table

The application requires a `users` table in your Supabase database with the following structure:

| Column   | Type          | Description                                   |
|----------|---------------|-----------------------------------------------|
| id       | uuid          | Primary key, auto-generated                   |
| email    | varchar       | User's email address (must be unique)         |
| password | varchar       | User's password (should be hashed in real app)|
| name     | varchar       | User's full name                              |
| role     | varchar       | User's role (technician, admin, etc.)         |
| created_at | timestamp   | Auto-generated timestamp                      |

## SQL to Create the Table

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR NOT NULL UNIQUE,
  password VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR NOT NULL DEFAULT 'technician',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for accessing users
CREATE POLICY "Users are viewable by anyone with the anon key" 
  ON users FOR SELECT 
  USING (true);

-- Create policy for inserting users
CREATE POLICY "Users can be inserted by anyone with the anon key" 
  ON users FOR INSERT 
  WITH CHECK (true);

-- Create policy for updating users
CREATE POLICY "Users can only be updated by themselves" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);
```

## Row-Level Security (RLS) Policies

For enhanced security in a production environment, you should set up more restrictive Row-Level Security policies. The example policies above are permissive for testing purposes.

## Setting Up Supabase

1. Create a Supabase project at https://supabase.com
2. Go to SQL Editor and run the SQL commands above to create the users table
3. Get your Supabase URL and anon key from the API settings page
4. Use these credentials in the test script and your application

## Testing Connection

Use the `supabase-auth-test.js` script to test your connection and authentication functionality. 