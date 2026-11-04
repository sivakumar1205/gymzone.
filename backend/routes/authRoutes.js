import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import asyncHandler from '../middleware/asyncHandler.js';
import {
  getMe, login, register, sendVerifyOtp, verifyEmail,
  requestPasswordReset, verifyResetOtp, resetPassword,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

router.post('/register', authLimiter, asyncHandler(register));
router.post('/login', authLimiter, asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(getMe));

router.post('/send-verify-otp', otpLimiter, asyncHandler(sendVerifyOtp));
router.post('/verify-email', otpLimiter, asyncHandler(verifyEmail));

router.post('/forgot-password', otpLimiter, asyncHandler(requestPasswordReset));
router.post('/verify-reset-otp', otpLimiter, asyncHandler(verifyResetOtp));
router.post('/reset-password', otpLimiter, asyncHandler(resetPassword));

export default router;
