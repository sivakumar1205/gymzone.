import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { listMyOrders, placeOrder } from '../controllers/orderController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/mine', asyncHandler(listMyOrders));
router.post('/', asyncHandler(placeOrder));

export default router;
