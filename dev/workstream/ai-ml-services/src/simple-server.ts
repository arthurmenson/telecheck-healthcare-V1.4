import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ai-ml-services',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AI/ML Services API',
    version: '1.0.0',
    endpoints: ['/health', '/ai/status']
  });
});

// AI endpoint
app.get('/ai/status', (req, res) => {
  res.json({
    status: 'operational',
    models: ['medical-coding', 'document-processing'],
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});