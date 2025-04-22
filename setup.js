/**
 * SmartMaintenance Setup Script
 * This script helps new users get started with the SmartMaintenance app.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to execute shell commands
function execCommand(command, callback) {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`Command stderr: ${stderr}`);
    }
    callback(stdout);
  });
}

// Helper function to get user input
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Main setup function
async function setup() {
  console.log('\n==========================');
  console.log('SmartMaintenance Setup');
  console.log('==========================\n');
  
  console.log('This script will help you set up the SmartMaintenance app.\n');
  
  // Step 1: Install dependencies
  console.log('Step 1: Installing dependencies...');
  execCommand('npm install', () => {
    console.log('✅ Dependencies installed successfully.\n');
    
    // Step 2: Create .env file
    createEnvFile();
  });
}

// Function to create .env file
async function createEnvFile() {
  console.log('Step 2: Setting up environment variables...');
  
  const backendEnvPath = path.join(__dirname, 'backend', '.env');
  
  // Check if .env file exists
  if (fs.existsSync(backendEnvPath)) {
    const overwrite = await askQuestion('An .env file already exists. Do you want to overwrite it? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Skipping .env file creation.\n');
      testDatabaseConnections();
      return;
    }
  }
  
  console.log('\nPlease provide the following information for your .env file:');
  console.log('(Press Enter to use default values where available)\n');
  
  const port = await askQuestion('Port (default: 5000): ') || '5000';
  const jwtSecret = await askQuestion('JWT Secret (default: smart_maintenance_secret_key): ') || 'smart_maintenance_secret_key';
  
  console.log('\n--- Supabase Configuration ---');
  const supabaseUrl = await askQuestion('Supabase URL: ');
  const supabaseKey = await askQuestion('Supabase Anon Key: ');
  
  console.log('\n--- InfluxDB Configuration (optional) ---');
  console.log('Note: You can skip this if you don\'t want to use InfluxDB for sensor data');
  const influxdbUrl = await askQuestion('InfluxDB URL (optional): ');
  const influxdbToken = await askQuestion('InfluxDB Token (optional): ');
  const influxdbOrg = await askQuestion('InfluxDB Organization (optional): ');
  const influxdbBucket = await askQuestion('InfluxDB Bucket (default: smart_maintenance): ') || 'smart_maintenance';
  
  // Create .env content
  let envContent = `# Server configuration
PORT=${port}

# JWT Authentication
JWT_SECRET=${jwtSecret}

# Supabase configuration
SUPABASE_URL=${supabaseUrl}
SUPABASE_KEY=${supabaseKey}
`;

  // Add InfluxDB configuration if provided
  if (influxdbUrl && influxdbToken && influxdbOrg) {
    envContent += `
# InfluxDB configuration
INFLUXDB_URL=${influxdbUrl}
INFLUXDB_TOKEN=${influxdbToken}
INFLUXDB_ORG=${influxdbOrg}
INFLUXDB_BUCKET=${influxdbBucket}
`;
  }
  
  // Ensure backend directory exists
  if (!fs.existsSync(path.join(__dirname, 'backend'))) {
    fs.mkdirSync(path.join(__dirname, 'backend'), { recursive: true });
  }
  
  // Write .env file
  fs.writeFileSync(backendEnvPath, envContent);
  console.log('✅ .env file created successfully.\n');
  
  // Step 3: Test database connections
  testDatabaseConnections();
}

// Function to test database connections
function testDatabaseConnections() {
  console.log('Step 3: Testing database connections...');
  
  // Test Supabase connection
  console.log('\nTesting Supabase connection...');
  execCommand('npm run test:supabase', (stdout) => {
    console.log(stdout);
    
    // Test InfluxDB connection if configured
    if (fs.existsSync(path.join(__dirname, 'backend', '.env')) && 
        fs.readFileSync(path.join(__dirname, 'backend', '.env'), 'utf8').includes('INFLUXDB_URL')) {
      console.log('\nTesting InfluxDB connection...');
      execCommand('npm run test:influxdb', (stdout) => {
        console.log(stdout);
        setupComplete();
      });
    } else {
      setupComplete();
    }
  });
}

// Function for setup completion
function setupComplete() {
  console.log('\n==========================');
  console.log('Setup Complete!');
  console.log('==========================\n');
  
  console.log('To start the application:');
  console.log('1. Start the backend:');
  console.log('   cd backend && npm start');
  console.log('\n2. In a new terminal, start the frontend:');
  console.log('   cd frontend && npm start');
  console.log('\nRefer to the README.md for more information and troubleshooting tips.');
  
  rl.close();
}

// Run setup
setup(); 