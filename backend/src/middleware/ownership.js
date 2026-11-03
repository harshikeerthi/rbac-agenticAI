import { getAffiliateById, logActivity } from '../store.js';

/**
 * Data Ownership & Assignment Middleware for Individual Affiliate Endpoints
 * 
 * Verifies whether the authenticated user has legitimate rights to access
 * or manipulate the specific affiliate resource specified by req.params.id.
 */
export async function enforceAffiliateOwnership(req, res, next) {
  const { id } = req.params;
  const affiliate = getAffiliateById(id);

  if (!affiliate) {
    return res.status(404).json({
      success: false,
      error: 'Not Found',
      code: 'AFFILIATE_NOT_FOUND',
      message: `Affiliate record [${id}] does not exist.`
    });
  }

  // Attach record to request for convenient downstream handler usage
  req.targetAffiliate = affiliate;

  // 1. Admin has global access to all records
  if (req.user.role === 'admin') {
    return next();
  }

  // 2. Affiliate Manager: Only permitted if assigned to this affiliate
  if (req.user.role === 'affiliate_manager') {
    if (affiliate.assignedManagerId !== req.user.id) {
      const errorPayload = {
        success: false,
        error: 'Forbidden',
        code: 'RESOURCE_ACCESS_DENIED',
        message: `Access Denied: Affiliate [${id}] is not assigned to your management portfolio.`,
        details: {
          user: req.user.id,
          role: req.user.role,
          reason: 'ASSIGNMENT_VIOLATION',
          targetRecordId: id,
          assignedTo: affiliate.assignedManagerId,
          attemptedAction: `${req.method} ${req.originalUrl}`
        }
      };

      await logActivity({
        userId: req.user.id,
        userRole: req.user.role,
        method: req.method,
        endpoint: req.originalUrl,
        requiredPermission: 'affiliate_assignment_match',
        outcome: 'DENIED',
        statusCode: 403,
        details: `Manager ${req.user.id} denied access to unassigned affiliate ${id}`
      });

      return res.status(403).json(errorPayload);
    }
    return next();
  }

  // 3. Affiliate User: Only permitted if this record belongs to them
  if (req.user.role === 'affiliate_user') {
    if (affiliate.userId !== req.user.id) {
      const errorPayload = {
        success: false,
        error: 'Forbidden',
        code: 'RESOURCE_ACCESS_DENIED',
        message: `Access Denied: You do not own affiliate record [${id}].`,
        details: {
          user: req.user.id,
          role: req.user.role,
          reason: 'OWNERSHIP_VIOLATION',
          targetRecordId: id,
          attemptedAction: `${req.method} ${req.originalUrl}`
        }
      };

      await logActivity({
        userId: req.user.id,
        userRole: req.user.role,
        method: req.method,
        endpoint: req.originalUrl,
        requiredPermission: 'affiliate_ownership_match',
        outcome: 'DENIED',
        statusCode: 403,
        details: `Affiliate user ${req.user.id} denied cross-tenant access to ${id}`
      });

      return res.status(403).json(errorPayload);
    }
    return next();
  }

  // 4. Any other role (e.g. AI agent) is denied access to individual affiliate records
  const errorPayload = {
    success: false,
    error: 'Forbidden',
    code: 'RESOURCE_ACCESS_DENIED',
    message: `Access Denied: Role [${req.user.role}] cannot access individual affiliate records.`,
    details: {
      user: req.user.id,
      role: req.user.role,
      reason: 'ROLE_DISALLOWED_FOR_RESOURCE',
      targetRecordId: id,
      attemptedAction: `${req.method} ${req.originalUrl}`
    }
  };

  await logActivity({
    userId: req.user.id,
    userRole: req.user.role,
    method: req.method,
    endpoint: req.originalUrl,
    requiredPermission: 'individual_affiliate_access',
    outcome: 'DENIED',
    statusCode: 403,
    details: `Role ${req.user.role} denied access to record ${id}`
  });

  return res.status(403).json(errorPayload);
}

/**
 * Field-Level Protection Middleware
 * 
 * Inspects req.body during updates/mutations to prevent unauthorized roles
 * from modifying privileged fields (e.g., commissionRate, assignedManagerId, status, id, userId).
 * 
 * Admins are exempt from field-level restrictions.
 * For non-admins, if any restricted field is present in the request body,
 * the request is strictly rejected with 403 RESTRICTED_FIELD_UPDATE_DENIED.
 * 
 * @param {string[]} restrictedFields
 */
export function enforceFieldSecurity(restrictedFields = ['commissionRate', 'assignedManagerId', 'status', 'id', 'userId']) {
  return async (req, res, next) => {
    // Admin has full field modification rights
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    // Identify which restricted fields the user attempted to provide
    const attemptedRestrictedFields = Object.keys(req.body).filter(field =>
      restrictedFields.includes(field)
    );

    if (attemptedRestrictedFields.length > 0) {
      const errorPayload = {
        success: false,
        error: 'Forbidden',
        code: 'RESTRICTED_FIELD_UPDATE_DENIED',
        message: `Access Denied: You do not possess permission to modify restricted field(s): [${attemptedRestrictedFields.join(', ')}]`,
        details: {
          user: req.user.id,
          role: req.user.role,
          restrictedFields: attemptedRestrictedFields,
          attemptedAction: `${req.method} ${req.originalUrl}`
        }
      };

      await logActivity({
        userId: req.user.id,
        userRole: req.user.role,
        method: req.method,
        endpoint: req.originalUrl,
        requiredPermission: 'privileged_field_mutation',
        outcome: 'DENIED',
        statusCode: 403,
        details: `Attempted modification of restricted fields: ${attemptedRestrictedFields.join(', ')}`
      });

      return res.status(403).json(errorPayload);
    }

    next();
  };
}

