import { Router } from 'express';
import { resetStore, logActivity } from '../store.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

/**
 * GET /api/health
 * Public health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Affiliate Access Lab API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * POST /api/reset-data
 * Resets local JSON storage back to seed data.
 * Protected: Requires 'affiliates:create' or Admin role.
 */
router.post(
  '/reset-data',
  requirePermission('affiliates:create'),
  async (req, res) => {
    await resetStore();

    await logActivity({
      userId: req.user.id,
      userRole: req.user.role,
      method: 'POST',
      endpoint: '/api/reset-data',
      requiredPermission: 'affiliates:create',
      outcome: 'ALLOWED',
      statusCode: 200,
      details: 'All local demo data reset to seed state'
    });

    res.json({
      success: true,
      message: 'Demo data store successfully reset to seed state.'
    });
  }
);

export default router;

