import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/init';

// Import routes
import summaryRoutes from './routes/summary';
import driversRoutes from './routes/drivers';
import riskFactorsRoutes from './routes/risk-factors';
import recommendationsRoutes from './routes/recommendations';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/summary', summaryRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/risk-factors', riskFactorsRoutes);
app.use('/api/recommendations', recommendationsRoutes);

// Also expose quarters endpoint at root level for convenience
app.get('/api/quarters', (_req, res) => {
  try {
    const { getAvailableQuarters } = require('./db/queries');
    const quarters = getAvailableQuarters();
    res.json({ quarters });
  } catch (error) {
    console.error('Error in /api/quarters:', error);
    res.status(500).json({ error: 'Failed to get available quarters' });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   SkyGeni Revenue Intelligence API                         ║
║   Server running on http://localhost:${PORT}                  ║
║                                                            ║
║   Endpoints:                                               ║
║   - GET /api/health                                        ║
║   - GET /api/quarters                                      ║
║   - GET /api/summary?quarter=Q1 2026                       ║
║   - GET /api/drivers?quarter=Q1 2026                       ║
║   - GET /api/risk-factors?quarter=Q1 2026                  ║
║   - GET /api/recommendations?quarter=Q1 2026               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
