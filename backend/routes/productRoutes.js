import { Router } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { getProduct, listProducts } from '../controllers/productController.js';

const router = Router();

router.get('/', asyncHandler(listProducts));
router.get('/:id', asyncHandler(getProduct));

export default router;
