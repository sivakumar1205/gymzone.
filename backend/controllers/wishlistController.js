import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';

export async function getWishlist(request, response) {
  const wishlist = await Wishlist.findOne({ user: request.user._id });
  response.json({ productIds: wishlist?.productIds || [] });
}

export async function toggleWishlist(request, response) {
  const { productId } = request.body;
  if (typeof productId !== 'string') return response.status(400).json({ message: 'productId is required.' });

  const product = await Product.findOne({ id: productId, active: true });
  if (!product) return response.status(404).json({ message: 'Product not found.' });

  let wishlist = await Wishlist.findOne({ user: request.user._id });
  if (!wishlist) wishlist = new Wishlist({ user: request.user._id, productIds: [] });

  const index = wishlist.productIds.indexOf(productId);
  if (index === -1) {
    wishlist.productIds.push(productId);
  } else {
    wishlist.productIds.splice(index, 1);
  }
  await wishlist.save();
  response.json({ productIds: wishlist.productIds });
}

export async function syncWishlist(request, response) {
  const { productIds } = request.body;
  if (!Array.isArray(productIds)) return response.status(400).json({ message: 'productIds must be an array.' });

  const validIds = [];
  for (const id of productIds) {
    if (typeof id !== 'string') continue;
    const exists = await Product.exists({ id, active: true });
    if (exists) validIds.push(id);
  }

  const wishlist = await Wishlist.findOneAndUpdate(
    { user: request.user._id },
    { productIds: validIds },
    { upsert: true, new: true },
  );
  response.json({ productIds: wishlist.productIds });
}
