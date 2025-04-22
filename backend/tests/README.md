# Testing and Fixing Registration Issues

## Fixing Axios Network Error

If you're encountering `AxiosError: Network Error` during registration, follow these steps to fix it:

### 1. Ensure your backend is running

The backend server must be running on the correct port (5000 by default):

```bash
# Navigate to backend folder
cd backend

# Install dependencies (if not already done)
npm install

# Start the server
npm start
```

### 2. Check API URL configuration

For mobile apps, `localhost` won't work properly. The API URL needs to be:

- For Android emulators: `http://10.0.2.2:5000`
- For iOS simulators: `http://localhost:5000`
- For physical devices: Use your computer's actual local IP address (e.g., `http://192.168.1.100:5000`)

This is already configured in your `api.js` file.

### 3. Verify Supabase Connection

Run the test script to verify your Supabase connection:

```bash
# Navigate to backend folder
cd backend

# Edit .env file with your Supabase credentials
# Add these lines:
# SUPABASE_URL=your_supabase_url
# SUPABASE_KEY=your_supabase_anon_key
# JWT_SECRET=your_jwt_secret
# PORT=5000

# Run the test
node tests/supabase-auth-test-env.js
```

### 4. Common Issues and Solutions

- **Cross-Origin Resource Sharing (CORS)**: If you're testing from a different domain or port, ensure CORS is properly configured in the backend.

- **SSL/HTTPS Issues**: If you're using HTTPS on one end and HTTP on the other, browsers may block mixed content.

- **Network Connectivity**: Ensure there are no firewall or network restrictions preventing the connection.

- **Invalid API URL**: Double-check the API URL in frontend/src/services/api.js.

- **Backend Server Not Running**: Ensure the backend server is running and listening on the expected port.

## Debugging Tips

Add more console logs in API error handlers to see the specific error details:

```javascript
// In your api.js file:
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.log('API Error Details:', {
      message: error.message,
      config: error.config,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Rest of your error handling code...
    return Promise.reject(error);
  }
); 