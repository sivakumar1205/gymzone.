import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { getCart, syncCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../controllers/cartController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(getCart));
router.post('/sync', asyncHandler(syncCart));
router.post('/add', asyncHandler(addToCart));
router.patch('/:productId', asyncHandler(updateCartItem));
router.delete('/:productId', asyncHandler(removeFromCart));
router.delete('/', asyncHandler(clearCart));

export default router;
