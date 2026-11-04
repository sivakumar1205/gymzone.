import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import {
  createProduct,
  deleteProduct,
  restoreProduct,
  listOrders,
  listProducts,
  listUsers,
  updateOrderStatus,
  updateProduct,
  updateUserStatus,
} from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.get('/products', asyncHandler(listProducts));
router.post('/products', asyncHandler(createProduct));
router.patch('/products/:id/restore', asyncHandler(restoreProduct));
router.patch('/products/:id', asyncHandler(updateProduct));
router.delete('/products/:id', asyncHandler(deleteProduct));
router.get('/users', asyncHandler(listUsers));
router.patch('/users/:id/status', asyncHandler(updateUserStatus));
router.get('/orders', asyncHandler(listOrders));
router.patch('/orders/:id/status', asyncHandler(updateOrderStatus));

export default router;
