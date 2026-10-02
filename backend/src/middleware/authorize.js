export const authorizeRoles = (...roles) => {
  let customMessage = null;
  let allowedRoles = roles;

  // If last argument is a string that is not an uppercase role, treat as custom message
  if (
    roles.length > 1 &&
    typeof roles[roles.length - 1] === 'string' &&
    !['ADMIN', 'MANAGER', 'USER'].includes(roles[roles.length - 1].toUpperCase())
  ) {
    customMessage = roles[roles.length - 1];
    allowedRoles = roles.slice(0, -1);
  }

  const normalizedAllowedRoles = allowedRoles.map((r) => r.toUpperCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userRole = req.user.role.toUpperCase();

    if (!normalizedAllowedRoles.includes(userRole)) {
      const message =
        customMessage !== null
          ? customMessage
          : normalizedAllowedRoles.length === 1 && normalizedAllowedRoles[0] === 'ADMIN'
          ? 'You do not have permission to create users'
          : 'You do not have permission to perform this action';

      return res.status(403).json({
        success: false,
        message,
      });
    }

    next();
  };
};

export default authorizeRoles;
