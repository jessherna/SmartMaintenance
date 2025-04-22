// Standalone Supabase Auth Test Script using environment variables
// This script tests if Supabase authentication is working without requiring server setup
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Test user details - you can modify these as needed
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

async function main() {
  try {
    console.log("=== Supabase Authentication Test ===");
    console.log("Using environment variables for Supabase credentials\n");
    
    // Validate environment variables
    if (!supabaseUrl || !supabaseKey) {
      console.error('Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file');
      console.log('Current values:');
      console.log('SUPABASE_URL:', supabaseUrl || 'not set');
      console.log('SUPABASE_KEY:', supabaseKey ? '[hidden for security]' : 'not set');
      return;
    }

    // Initialize Supabase client
    console.log('Initializing Supabase client...');
    console.log('Using URL:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test database connection
    console.log('\nTesting database connection...');
    try {
      // Simple query to test connection
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .single();
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Successfully connected to Supabase database');
      console.log('User count in database:', data?.count || 'unknown');
    } catch (err) {
      console.error('❌ Failed to connect to Supabase:', err.message);
      console.log('\nPossible issues:');
      console.log('1. Invalid Supabase URL or key');
      console.log('2. "users" table does not exist');
      console.log('3. Missing permissions for the "users" table');
      return;
    }
    
    // Test signup
    console.log('\n--- Testing Sign Up ---');
    console.log(`Attempting to register user: ${testUser.email}`);
    
    try {
      // Check if user already exists
      const { data: existingUsers, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('email', testUser.email);

      if (queryError) {
        console.error('❌ Error checking if user exists:', queryError.message);
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        console.log('⚠️ User already exists in the database. Attempting to delete...');
        
        // Delete existing user
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('email', testUser.email);
          
        if (deleteError) {
          console.error('❌ Error deleting existing user:', deleteError.message);
          console.log('Continuing with login test only...');
          await testLogin(supabase, testUser);
          return;
        }
        
        console.log('✅ Existing user deleted successfully');
      }

      // Create new user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([
          {
            email: testUser.email,
            password: testUser.password, // Note: In a real app, this should be hashed
            name: testUser.name,
            role: 'technician'
          }
        ])
        .select();

      if (error) {
        console.error('❌ Error creating user:', error.message);
        return;
      }

      console.log('✅ User registered successfully:', newUser);
      
      // Test login after successful registration
      await testLogin(supabase, testUser);
      
    } catch (err) {
      console.error('❌ Unexpected error during sign up test:', err.message);
    }
  } catch (error) {
    console.error('An unexpected error occurred:', error);
  }
}

// Function to test user login
async function testLogin(supabase, testUser) {
  console.log('\n--- Testing Sign In ---');
  console.log(`Attempting to login user: ${testUser.email}`);

  try {
    // Query the user from database (simulating our custom auth)
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', testUser.email)
      .single();

    if (error) {
      console.error('❌ Error logging in:', error.message);
      return;
    }

    if (!user) {
      console.error('❌ User not found');
      return;
    }

    // In a real app, we would hash and compare passwords
    if (user.password === testUser.password) {
      console.log('✅ Login successful:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
    } else {
      console.error('❌ Invalid password');
    }
  } catch (err) {
    console.error('❌ Unexpected error during sign in test:', err.message);
  }
}

// Run the main function
main(); 