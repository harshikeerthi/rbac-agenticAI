import { Router } from 'express';
import { getUsers, getRoles, logActivity } from '../store.js';

const router = Router();

/**
 * GET /api/me
 * Resolves current user info and authorized permissions based on x-demo-user-id
 */
router.get('/me', async (req, res) => {
  await logActivity({
    userId: req.user.id,
    userRole: req.user.role,
    method: 'GET',
    endpoint: '/api/me',
    requiredPermission: 'authenticated_identity',
    outcome: 'ALLOWED',
    statusCode: 200,
    details: `Resolved demo user ${req.user.name} (${req.user.role})`
  });

  res.json({
    success: true,
    user: req.user,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * GET /api/users
 * Returns list of available demo personas for identity selection
 */
router.get('/users', (req, res) => {
  res.json({
    success: true,
    data: getUsers()
  });
});

/**
 * GET /api/roles
 * Returns role metadata and permission sets for RBAC inspection
 */
router.get('/roles', (req, res) => {
  res.json({
    success: true,
    data: getRoles()
  });
});

export default router;

