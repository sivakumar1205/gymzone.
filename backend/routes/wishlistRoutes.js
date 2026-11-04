import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { getWishlist, toggleWishlist, syncWishlist } from '../controllers/wishlistController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(getWishlist));
router.post('/toggle', asyncHandler(toggleWishlist));
router.post('/sync', asyncHandler(syncWishlist));

export default router;
