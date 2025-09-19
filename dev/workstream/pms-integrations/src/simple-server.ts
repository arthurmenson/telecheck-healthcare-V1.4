import express from 'express';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'pms-integrations',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'PMS Integrations Service',
    version: '1.0.0',
    status: 'running',
    port: PORT
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`PMS Integrations service running on port ${PORT}`);
});

export default app;