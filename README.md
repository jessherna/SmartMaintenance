# SmartMaintenance

A multi-user propulsion equipment health monitoring app with safety-threshold alarms, ML anomaly detection, AR-driven maintenance reporting, KPI dashboards, and free-tier hosting.

## Project Overview

SmartMaintenance is built in iterative phases:

- **Phase 1:** Core MVP with auth, data ingestion, basic dashboard
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

**Phase 1 - Core MVP** (In Progress)
- [x] Project setup
- [x] Express backend with routes
- [x] JWT auth with Supabase
- [x] Sensor data simulator
- [x] React Native Web setup
- [x] Login/Register screens
- [x] Basic dashboard

## Local Development

### Prerequisites
- Node.js 14+ and npm
- Supabase account (free tier)
- InfluxDB Cloud account (free tier)

### Setup

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
```

3. Create a `.env` file in the root directory with your credentials:
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
npm run dev:backend

# In another terminal (frontend)
npm run dev:frontend
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