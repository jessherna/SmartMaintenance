# SmartMaintenance

A multi-user propulsion equipment health monitoring app with safety-threshold alarms, ML anomaly detection, AR-driven maintenance reporting, KPI dashboards, and free-tier hosting.

## Project Overview

SmartMaintenance is built in iterative phases:

- **Phase 1:** ✅ Core MVP with auth, data ingestion, basic dashboard
- **Phase 2:** Safety alerts & real-time updates
- **Phase 3:** ML anomaly detection
- **Phase 4:** AR-driven maintenance reports
- **Phase 5:** KPI dashboard & polishing
- **Phase 6:** Deployment & scaling on free tiers

## Tech Stack

### Backend
- Express.js REST API
- Socket.IO for real-time data
- JWT authentication
- Supabase (PostgreSQL) for user data and reports
- InfluxDB Cloud for time-series sensor data
- FastAPI with scikit-learn for ML anomaly detection

### Frontend
- React Native Web (Expo) for cross-platform UI
- ViroReact/AR.js for Augmented Reality
- Socket.IO client for real-time updates
- Victory/Chart-kit for data visualization
- React Navigation for routing

## Current Status

**Phase 1 - Core MVP** (✅ Completed)
- [x] Project setup
- [x] Express backend with routes
- [x] JWT auth with Supabase
- [x] Sensor data simulator
- [x] React Native Web setup
- [x] Login/Register screens
- [x] Basic dashboard

**Phase 2 - Safety Alerts & Real-time Updates** (Next Up)
- [ ] Implement safety threshold alerts
- [ ] Add real-time dashboard updates
- [ ] Create alert notification system
- [ ] Build maintenance request workflow

## Quick Start

Run our setup script for the fastest way to get started:

```bash
# Run with Node.js
node setup.js

# Or use the npm script
npm run setup
```

This interactive script will:
1. Install all dependencies
2. Guide you through creating a `.env` file
3. Test your database connections
4. Provide next steps to start the application

## Manual Setup

### Prerequisites
- Node.js 14+ and npm
- Supabase account (free tier)
- InfluxDB Cloud account (free tier) - Optional for full functionality

### Installation Steps

1. Clone the repository:
```
git clone https://github.com/jessherna/SmartMaintenance.git
cd SmartMaintenance
```

2. Install dependencies:
```
npm install
cd frontend
npm install
cd ..
cd backend
npm install
cd ..
```

3. Create a `.env` file in the backend directory with your credentials:
```
PORT=5000
JWT_SECRET=your_jwt_secret
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
INFLUXDB_URL=your_influxdb_url
INFLUXDB_TOKEN=your_influxdb_token
INFLUXDB_ORG=your_influxdb_org
INFLUXDB_BUCKET=smart_maintenance
```

4. Start the development servers:
```
# In one terminal (backend)
cd backend
npm start

# In another terminal (frontend)
cd frontend
npm start
```

## Troubleshooting

### Backend Issues

1. **Missing Dependencies Error**:
   If you see errors like `Cannot find module 'dotenv'`, install the required dependencies:
   ```
   cd backend
   npm install dotenv cors express socket.io bcryptjs jsonwebtoken @supabase/supabase-js @influxdata/influxdb-client
   ```

2. **Database Connection Issues**:
   Run the provided test scripts to check your database connections:
   ```
   cd backend
   node tests/supabase-auth-test-env.js  # Test Supabase connection
   node tests/influxdb-test.js           # Test InfluxDB connection
   ```

3. **Row-Level Security (RLS) Policy Error**:
   If you encounter "row-level security policy" errors with Supabase, follow the instructions in `backend/tests/fix-rls-policy.sql` to update your RLS policies.

### Frontend Issues

1. **Network Error in API Calls**:
   If you see "AxiosError: Network Error" when making API calls:
   - Ensure the backend server is running
   - For Android emulators, the API should point to `10.0.2.2` instead of `localhost`
   - For iOS simulators, `localhost` should work fine
   - For physical devices, update the API URL in `frontend/src/services/api.js` to use your computer's local IP address

2. **Navigation Errors**:
   If you encounter React Navigation errors, ensure you've installed all required dependencies:
   ```
   cd frontend
   npm install @react-navigation/native @react-navigation/stack
   ```

## Database Schema

### Supabase Tables

**users**
- id (UUID, primary key)
- email (string, unique)
- password (string, hashed)
- name (string)
- role (string)
- created_at (timestamp)

**reports** (to be implemented)
- id (UUID, primary key)
- technician_id (UUID, foreign key to users)
- title (string)
- description (text)
- start_time (timestamp)
- end_time (timestamp)
- downtime (number)
- repair_duration (number)
- image_url (string, optional)
- created_at (timestamp)

### InfluxDB Measurements

**sensor_readings**
- Fields: value, is_safe
- Tags: sensor_type
- Timestamp: automatic

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login a user

### Sensors
- `GET /api/sensors` - Get latest sensor readings
- `GET /api/sensors/history` - Get sensor readings history

## Socket.IO Events

- `sensorReadings` - Real-time sensor data
- `safetyAlerts` - Safety threshold alerts (Phase 2)
- `anomalyAlerts` - ML anomaly alerts (Phase 3)

## Testing Resources

We've created several test scripts to help validate your setup:

1. **Supabase Authentication Test**:
   - `backend/tests/supabase-auth-test.js` - Interactive test script
   - `backend/tests/supabase-auth-test-env.js` - Environment-based test script
   - `backend/tests/supabase-schema.md` - Database schema information

2. **InfluxDB Tests**:
   - `backend/tests/influxdb-test.js` - Tests connection, read/write abilities
   - `backend/tests/influxdb-setup-guide.md` - Setup instructions

3. **RLS Policy Fix**:
   - `backend/tests/fix-rls-policy.sql` - SQL to fix Supabase RLS policies 