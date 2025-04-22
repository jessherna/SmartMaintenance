# InfluxDB Setup Guide for Smart Maintenance App

This guide will help you set up InfluxDB for the Smart Maintenance application. The application stores sensor data in InfluxDB and retrieves it for display on the dashboard.

## InfluxDB Options

You have two options for using InfluxDB:

1. **InfluxDB Cloud** (Recommended for beginners) - Free tier available, no installation required
2. **Self-hosted InfluxDB** - Requires installation and configuration on your own server

## Option 1: InfluxDB Cloud Setup

1. **Sign up for InfluxDB Cloud**:
   - Go to [https://cloud2.influxdata.com/signup](https://cloud2.influxdata.com/signup)
   - Create a free account

2. **Create a Bucket**:
   - After signing in, navigate to "Load Data" > "Buckets"
   - Click "Create Bucket"
   - Name it `smart_maintenance`
   - Set retention period (free tier allows up to 30 days)
   - Click "Create"

3. **Create an API Token**:
   - Go to "Load Data" > "API Tokens"
   - Click "Generate API Token" > "All Access API Token"
   - Name it `smart_maintenance_token`
   - Click "Generate"
   - **Important**: Copy and save this token immediately; you won't be able to see it again!

4. **Get Your Organization ID**:
   - Click on your profile icon in the lower left corner
   - Select "About" 
   - Copy your Organization ID

5. **Update Your .env File**:
   ```
   INFLUXDB_URL=https://your-region.influxdata.com
   INFLUXDB_TOKEN=your-token
   INFLUXDB_ORG=your-org-id
   INFLUXDB_BUCKET=smart_maintenance
   ```

## Option 2: Self-hosted InfluxDB Setup

1. **Install InfluxDB**:
   - Follow the [official installation guide](https://docs.influxdata.com/influxdb/v2/install/)
   - For Docker: `docker run -p 8086:8086 influxdb:2.0`

2. **Initial Setup**:
   - Visit `http://localhost:8086`
   - Follow the setup wizard
   - Create an organization, bucket named `smart_maintenance`, and admin user

3. **Create an API Token**:
   - Go to "Load Data" > "API Tokens"
   - Click "Generate API Token" > "All Access API Token"
   - Name it `smart_maintenance_token`
   - Click "Generate"
   - Copy the token

4. **Update Your .env File**:
   ```
   INFLUXDB_URL=http://localhost:8086
   INFLUXDB_TOKEN=your-token
   INFLUXDB_ORG=your-org-name
   INFLUXDB_BUCKET=smart_maintenance
   ```

## Testing Your InfluxDB Connection

Run the test script to verify your InfluxDB setup:

```bash
node backend/tests/influxdb-test.js
```

If you encounter any errors, the script will provide detailed information on what might be wrong.

## Troubleshooting

### Common Issues:

1. **Connection Failed**: 
   - Check that your URL is correct and accessible
   - Ensure there are no firewalls blocking the connection

2. **Authentication Failed**: 
   - Verify your token is correct
   - Check if the token has the necessary permissions

3. **Bucket Access Failed**:
   - Confirm your token has access to the specified bucket
   - Check if the bucket actually exists

4. **Organization Not Found**:
   - Make sure you're using the correct Organization ID or name

## Data Schema

The Smart Maintenance app uses the following schema for sensor data:

- **Measurement**: `sensor_readings`
- **Tags**:
  - `sensor_type`: The type of sensor (TEMPERATURE, VIBRATION, CURRENT)
- **Fields**:
  - `value`: The sensor reading value
  - `is_safe`: Boolean indicating if the value is within safe limits

## Backing Up InfluxDB Data

For self-hosted installations, you can back up your data using:

```bash
influx backup /path/to/backup -t your-token
```

For InfluxDB Cloud, you can export data using Tasks or the InfluxDB API.

## Further Resources

- [InfluxDB Documentation](https://docs.influxdata.com/influxdb/v2/)
- [Flux Query Language Tutorial](https://docs.influxdata.com/flux/v0/)
- [InfluxDB Client Libraries](https://docs.influxdata.com/influxdb/v2/api-guide/client-libraries/) 