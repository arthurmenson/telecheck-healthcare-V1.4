import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'core-services',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Core Services API',
    version: '1.0.0',
    endpoints: ['/health', '/api/patients', '/api/appointments']
  });
});

// Core endpoint
app.get('/core/status', (req, res) => {
  res.json({
    status: 'operational',
    services: ['patients', 'appointments', 'providers'],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});