import { Router } from 'express';
import { getActivityLogs } from '../store.js';
import { requirePermission } from '../middleware/rbac.js';

const router = Router();

/**
 * GET /api/activity
 * Retrieves the in-app activity & access decision stream.
 * 
 * RBAC Rule:
 * Requires 'activity:read' (Admins and Affiliate Managers).
 * Prohibited for Affiliate Users and AI Agent.
 */
router.get(
  '/',
  requirePermission('activity:read'),
  (req, res) => {
    const logs = getActivityLogs();
    res.json({
      success: true,
      count: logs.length,
      data: logs,
      meta: {
        requester: req.user.id,
        role: req.user.role
      }
    });
  }
);

export default router;

