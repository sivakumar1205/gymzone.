import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { createRazorpayOrder, verifyRazorpayPayment, razorpayWebhook } from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Webhook must use raw body — handled before json middleware in server.js
router.post('/webhook', asyncHandler(razorpayWebhook));

router.use(requireAuth);
router.post('/create-order', asyncHandler(createRazorpayOrder));
router.post('/verify', asyncHandler(verifyRazorpayPayment));

export default router;
