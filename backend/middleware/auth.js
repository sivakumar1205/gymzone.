import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import asyncHandler from './asyncHandler.js';

export const requireAuth = asyncHandler(async (request, _response, next) => {
  const token = request.headers.authorization?.startsWith('Bearer ')
    ? request.headers.authorization.slice(7)
    : '';
  if (!token) {
    const error = new Error('Sign in to continue.');
    error.status = 401;
    throw error;
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    const error = new Error('Your session has expired. Please sign in again.');
    error.status = 401;
    throw error;
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    const error = new Error('This account is unavailable. Please contact support.');
    error.status = 401;
    throw error;
  }
  request.user = user;
  next();
});

export function requireAdmin(request, _response, next) {
  if (request.user?.role !== 'admin') {
    const error = new Error('Administrator access is required.');
    error.status = 403;
    return next(error);
  }
  next();
}
