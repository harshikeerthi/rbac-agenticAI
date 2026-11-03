import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { initStore, getUsers, getRoles } from './store.js';
import { authenticateDemoUser } from './middleware/auth.js';

// Route imports
import systemRoutes from './routes/system.js';
import authRoutes from './routes/auth.js';
import affiliateRoutes from './routes/affiliates.js';
import commissionRoutes from './routes/commissions.js';
import reportRoutes from './routes/reports.js';
import activityRoutes from './routes/activity.js';

const app = express();

// Standard middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-demo-user-id']
}));
app.use(express.json());

// 1. Public Unauthenticated Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Affiliate Access Lab API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Public identity inspection endpoints for dropdown & permission matrix
app.get('/api/users', (req, res) => {
  res.json({
    success: true,
    data: getUsers()
  });
});

app.get('/api/roles', (req, res) => {
  res.json({
    success: true,
    data: getRoles()
  });
});

// 2. Simulated Authentication Middleware (enforced for all remaining /api/* routes)
app.use('/api', authenticateDemoUser);

// 3. Protected Resource Routes
app.use('/api', systemRoutes); // /api/reset-data (protected)
app.use('/api', authRoutes); // /api/me (protected)
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/activity', activityRoutes);

// 4. Fallback 404 handler for unknown routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    code: 'ROUTE_NOT_FOUND',
    message: `API endpoint [${req.method} ${req.originalUrl}] does not exist.`
  });
});

let serverInstance = null;

export async function startServer(port = 5000) {
  await initStore();
  return new Promise((resolve) => {
    serverInstance = app.listen(port, () => {
      console.log(`[Affiliate Access Lab] Backend listening on port ${port}`);
      resolve(serverInstance);
    });
  });
}

export async function stopServer() {
  if (serverInstance) {
    return new Promise((resolve) => {
      serverInstance.close(() => {
        console.log('[Affiliate Access Lab] Backend stopped.');
        resolve();
      });
    });
  }
}

// Auto-start if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 5000;
  startServer(PORT);
}

export default app;

