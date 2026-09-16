/**
 * Role-Based Access Control Middleware
 * Frontend-only role restrictions will not be considered sufficient.
 */

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        error: 'Unauthorized: User identity not established',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: Role '${req.user.role}' is not authorized to perform this operation. Required: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
}

module.exports = {
  authorizeRoles,
};
