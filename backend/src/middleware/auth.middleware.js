import { sendError } from '../utils/response.js';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Access denied. No token provided.', 401);
  }

  const token = authHeader.split(' ')[1];
  try {
    // JWT verification placeholder
    req.user = { id: 'mock-user-id', role: 'admin' };
    next();
  } catch (error) {
    return sendError(res, 'Invalid or expired token', 403);
  }
};
