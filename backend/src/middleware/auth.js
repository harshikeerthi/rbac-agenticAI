import { getUserById, getRoles, logActivity } from '../store.js';

/**
 * Authentication Middleware (Simulated Demo Identity)
 * 
 * In this local prototype, identity is transmitted via the header:
 *   x-demo-user-id: <user_id>
 * 
 * IMPORTANT SECURITY NOTE:
 * In a real production system, authentication MUST NEVER rely on client-supplied
 * unauthenticated headers. Production systems require cryptographically signed JWTs,
 * secure HttpOnly session cookies, and identity verification (OAuth2/MFA).
 * 
 * In this prototype, we simulate identity selection to let developers quickly
 * inspect and test different roles without needing multiple browser sessions.
 * 
 * Crucially: The backend NEVER trusts a role provided by the client. The role
 * and permissions are strictly resolved from server-side storage (users.json and roles.json).
 */
export async function authenticateDemoUser(req, res, next) {
  const demoUserId = req.headers['x-demo-user-id'];

  if (!demoUserId) {
    const errorPayload = {
      success: false,
      error: 'Unauthorized',
      code: 'MISSING_IDENTITY',
      message: 'Access Denied: Missing demo identity header [x-demo-user-id]. Select a user identity from the top bar.',
      details: {
        method: req.method,
        path: req.originalUrl
      }
    };

    await logActivity({
      userId: 'anonymous',
      userRole: 'unauthenticated',
      method: req.method,
      endpoint: req.originalUrl,
      requiredPermission: 'authenticated_identity',
      outcome: 'DENIED',
      statusCode: 401,
      details: 'Missing x-demo-user-id header'
    });

    return res.status(401).json(errorPayload);
  }

  const user = getUserById(demoUserId);
  if (!user) {
    const errorPayload = {
      success: false,
      error: 'Unauthorized',
      code: 'INVALID_IDENTITY',
      message: `Access Denied: Demo identity [${demoUserId}] does not exist in local users store.`,
      details: {
        method: req.method,
        path: req.originalUrl
      }
    };

    await logActivity({
      userId: demoUserId,
      userRole: 'unrecognized',
      method: req.method,
      endpoint: req.originalUrl,
      requiredPermission: 'valid_identity',
      outcome: 'DENIED',
      statusCode: 401,
      details: `Unknown identity ID: ${demoUserId}`
    });

    return res.status(401).json(errorPayload);
  }

  // Resolve authoritative role and permissions from roles.json
  const roles = getRoles();
  const roleConfig = roles[user.role];
  const permissions = roleConfig ? roleConfig.permissions : [];

  // Hydrate req.user with verified server-side data
  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleName: roleConfig ? roleConfig.name : user.role,
    permissions
  };

  next();
}

