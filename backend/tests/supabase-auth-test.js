// Standalone Supabase Auth Test Script
// This script tests if Supabase authentication is working without requiring server setup
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get user input helper function
const getUserInput = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
};

async function main() {
  try {
    console.log("=== Supabase Authentication Test ===");
    console.log("This script will test connection to Supabase and basic auth operations.\n");
    
    // Get Supabase credentials from user input
    const supabaseUrl = await getUserInput("Enter your Supabase URL: ");
    const supabaseKey = await getUserInput("Enter your Supabase anon/public key: ");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Error: Both Supabase URL and key are required.');
      rl.close();
      return;
    }

    // Initialize Supabase client
    console.log('\nInitializing Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test database connection
    console.log('Testing database connection...');
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
      rl.close();
      return;
    }
    
    // Ask for test user details
    console.log('\n--- Test User Details ---');
    const email = await getUserInput("Enter test email address: ");
    const password = await getUserInput("Enter test password: ");
    const name = await getUserInput("Enter test user name: ");
    
    const testUser = { email, password, name };
    
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
        rl.close();
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        console.log('⚠️ User already exists in the database');
        const deleteConfirm = await getUserInput("Do you want to delete this user and create a new one? (y/n): ");
        
        if (deleteConfirm.toLowerCase() === 'y') {
          // Delete existing user
          const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('email', testUser.email);
            
          if (deleteError) {
            console.error('❌ Error deleting existing user:', deleteError.message);
            rl.close();
            return;
          }
          
          console.log('✅ Existing user deleted successfully');
        } else {
          console.log('Skipping user creation step');
          // Skip to login test
          await testLogin(supabase, testUser);
          rl.close();
          return;
        }
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
        rl.close();
        return;
      }

      console.log('✅ User registered successfully:', newUser);
      
      // Test login after successful registration
      await testLogin(supabase, testUser);
      
    } catch (err) {
      console.error('❌ Unexpected error during sign up test:', err.message);
    }
    
    rl.close();
  } catch (error) {
    console.error('An unexpected error occurred:', error);
    rl.close();
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