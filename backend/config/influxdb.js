const { InfluxDB, Point } = require('@influxdata/influxdb-client');

// You can generate a Token from the "Tokens Tab" in the UI
const token = process.env.INFLUXDB_TOKEN || '';
const url = process.env.INFLUXDB_URL || '';
const org = process.env.INFLUXDB_ORG || '';
const bucket = process.env.INFLUXDB_BUCKET || 'smart_maintenance';

/**
 * Create InfluxDB client
 */
const client = new InfluxDB({ url, token });

/**
 * Create write API for InfluxDB
 */
const writeApi = client.getWriteApi(org, bucket, 'ms');

/**
 * Create read API for InfluxDB
 */
const queryApi = client.getQueryApi(org);

/**
 * Write data point to InfluxDB
 * @param {String} measurement - Measurement name
 * @param {Object} tags - Tags for the data point
 * @param {Object} fields - Fields for the data point
 * @returns {Promise<void>}
 */
const writePoint = async (measurement, tags = {}, fields = {}) => {
  try {
    const point = new Point(measurement);
    
    // Add tags
    Object.entries(tags).forEach(([key, value]) => {
      point.tag(key, String(value));
    });
    
    // Add fields
    Object.entries(fields).forEach(([key, value]) => {
      if (typeof value === 'number') {
        point.floatField(key, value);
      } else if (typeof value === 'boolean') {
        point.booleanField(key, value);
      } else {
        point.stringField(key, String(value));
      }
    });
    
    writeApi.writePoint(point);
    await writeApi.flush();
    
    return true;
  } catch (error) {
    console.error('Error writing to InfluxDB:', error);
    throw error;
  }
};

module.exports = {
  client,
  writeApi,
  queryApi,
  writePoint
}; 