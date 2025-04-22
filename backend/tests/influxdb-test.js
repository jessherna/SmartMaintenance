// Test script to verify InfluxDB connection and configuration
require('dotenv').config();
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
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

// Main function
async function main() {
  console.log('=== InfluxDB Connection Test ===');
  
  // Get InfluxDB credentials from environment or user input
  let token = process.env.INFLUXDB_TOKEN || '';
  let url = process.env.INFLUXDB_URL || '';
  let org = process.env.INFLUXDB_ORG || '';
  let bucket = process.env.INFLUXDB_BUCKET || 'smart_maintenance';
  
  console.log('\nInfluxDB Configuration:');
  console.log('URL:', url || 'Not set');
  console.log('Token:', token ? '[Hidden]' : 'Not set');
  console.log('Organization:', org || 'Not set');
  console.log('Bucket:', bucket || 'Not set');
  
  // Ask user if they want to enter values manually
  const manualInput = await getUserInput('\nDo you want to enter InfluxDB credentials manually? (y/n): ');
  
  if (manualInput.toLowerCase() === 'y') {
    url = await getUserInput('Enter InfluxDB URL (e.g., https://your-instance.influxdata.com): ');
    token = await getUserInput('Enter InfluxDB Token: ');
    org = await getUserInput('Enter InfluxDB Organization: ');
    bucket = await getUserInput('Enter InfluxDB Bucket (default: smart_maintenance): ') || 'smart_maintenance';
  } else if (!url || !token || !org) {
    console.error('\n❌ Error: InfluxDB credentials are not set in .env file.');
    console.log('Add the following variables to your .env file:');
    console.log('INFLUXDB_URL=your_influxdb_url');
    console.log('INFLUXDB_TOKEN=your_influxdb_token');
    console.log('INFLUXDB_ORG=your_influxdb_org');
    console.log('INFLUXDB_BUCKET=your_influxdb_bucket (optional, default: smart_maintenance)');
    rl.close();
    return;
  }
  
  console.log('\nTesting InfluxDB connection...');
  
  try {
    // Initialize InfluxDB client
    const client = new InfluxDB({ url, token });
    
    // Test reading from the bucket
    console.log('\n1. Testing reading from bucket...');
    const queryApi = client.getQueryApi(org);
    const query = `from(bucket: "${bucket}") |> range(start: -1h) |> limit(n: 1)`;
    
    try {
      const results = await queryInflux(queryApi, query);
      if (results.length === 0) {
        console.log('✅ Successfully connected, but no data found in the bucket.');
      } else {
        console.log(`✅ Successfully read ${results.length} point(s) from the bucket.`);
        console.log('Sample data:', results[0]);
      }
    } catch (error) {
      console.error('❌ Error querying data:', error.message);
      console.log('\nPossible causes:');
      console.log('- The bucket does not exist');
      console.log('- Your token does not have read access');
      console.log('- The organization name is incorrect');
      
      // If we can't read, don't try to write
      rl.close();
      return;
    }
    
    // Test writing to the bucket
    console.log('\n2. Testing writing to bucket...');
    const writeApi = client.getWriteApi(org, bucket, 'ms');
    
    // Create a test point
    const point = new Point('test_measurement')
      .tag('test_type', 'connection_test')
      .floatField('value', Math.random() * 100)
      .timestamp(new Date());
    
    try {
      writeApi.writePoint(point);
      await writeApi.flush();
      console.log('✅ Successfully wrote test point to bucket');
    } catch (error) {
      console.error('❌ Error writing data:', error.message);
      console.log('\nPossible causes:');
      console.log('- The bucket does not exist');
      console.log('- Your token does not have write access');
      console.log('- The organization name is incorrect');
    }
    
    // Test creating a bucket (if we have permissions)
    console.log('\n3. Testing bucket management capabilities...');
    const testBucketName = `test_bucket_${Date.now()}`;
    
    try {
      const { BucketsAPI } = require('@influxdata/influxdb-client-apis');
      const bucketsApi = new BucketsAPI(client);
      
      // Try to create a bucket
      const buckets = await bucketsApi.getBuckets({ org });
      console.log(`✅ Successfully retrieved bucket list (${buckets.buckets.length} buckets)`);
      
      // Check if we can create a bucket
      try {
        await bucketsApi.postBuckets({ body: { name: testBucketName, orgID: buckets.buckets[0].orgID } });
        console.log(`✅ Successfully created test bucket: ${testBucketName}`);
        
        // Try to delete the test bucket
        try {
          const createdBucket = (await bucketsApi.getBuckets({ name: testBucketName })).buckets[0];
          await bucketsApi.deleteBucketsID({ bucketID: createdBucket.id });
          console.log(`✅ Successfully deleted test bucket: ${testBucketName}`);
        } catch (error) {
          console.log(`⚠️ Could not delete test bucket: ${error.message}`);
        }
      } catch (error) {
        console.log(`⚠️ Could not create test bucket: ${error.message}`);
        console.log('This is normal if your token does not have admin permissions.');
      }
    } catch (error) {
      console.log(`⚠️ Could not test bucket management: ${error.message}`);
      console.log('Note: This requires the @influxdata/influxdb-client-apis package.');
    }
    
    // Recommendations
    console.log('\n=== Recommendations for Your .env File ===');
    console.log('Add these lines to your .env file:');
    console.log(`INFLUXDB_URL=${url}`);
    console.log(`INFLUXDB_TOKEN=${token}`);
    console.log(`INFLUXDB_ORG=${org}`);
    console.log(`INFLUXDB_BUCKET=${bucket}`);
    
    console.log('\n=== Test Complete ===');
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
  }
  
  rl.close();
}

// Helper function to query InfluxDB
function queryInflux(queryApi, query) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    queryApi.queryRows(query, {
      next(row, tableMeta) {
        const result = tableMeta.toObject(row);
        results.push(result);
      },
      error(error) {
        reject(error);
      },
      complete() {
        resolve(results);
      }
    });
  });
}

// Run the test
try {
  main().catch(console.error);
} catch (error) {
  console.error('Error running tests:', error);
} 