import { logActivity } from '../store.js';

/**
 * RBAC Authorization Middleware
 * 
 * Verifies whether the authenticated user possesses the required permission(s).
 * Accepts either a single permission string (e.g. 'affiliates:create') or an array
 * of alternative permissions (e.g. ['affiliates:read:all', 'affiliates:read:assigned', 'affiliates:read:own']).
 * 
 * @param {string|string[]} required
 */
export function requirePermission(required) {
  const requiredList = Array.isArray(required) ? required : [required];

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        code: 'MISSING_IDENTITY',
        message: 'Authentication required before permission verification.'
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredList.some(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      const errorPayload = {
        success: false,
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Access Denied: Missing required permission [${requiredList.join(' OR ')}]`,
        details: {
          user: req.user.id,
          role: req.user.role,
          requiredPermission: requiredList.length === 1 ? requiredList[0] : requiredList,
          attemptedAction: `${req.method} ${req.originalUrl}`
        }
      };

      await logActivity({
        userId: req.user.id,
        userRole: req.user.role,
        method: req.method,
        endpoint: req.originalUrl,
        requiredPermission: requiredList.join(' OR '),
        outcome: 'DENIED',
        statusCode: 403,
        details: `Insufficient permissions for action: ${req.method} ${req.originalUrl}`
      });

      return res.status(403).json(errorPayload);
    }

    // Permission granted - proceed to next middleware or route handler
    next();
  };
}

