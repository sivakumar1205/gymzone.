import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

export async function getCart(request, response) {
  const cart = await Cart.findOne({ user: request.user._id });
  response.json({ items: cart?.items || [] });
}

export async function syncCart(request, response) {
  const { items } = request.body;
  if (!Array.isArray(items)) return response.status(400).json({ message: 'Items must be an array.' });

  const validated = [];
  for (const item of items) {
    if (typeof item.productId !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1) continue;
    const product = await Product.findOne({ id: item.productId, active: true });
    if (!product) continue;
    validated.push({ productId: item.productId, quantity: Math.min(item.quantity, product.stock || 99) });
  }

  const cart = await Cart.findOneAndUpdate(
    { user: request.user._id },
    { items: validated },
    { upsert: true, new: true },
  );
  response.json({ items: cart.items });
}

export async function addToCart(request, response) {
  const { productId, quantity = 1 } = request.body;
  if (typeof productId !== 'string' || !Number.isInteger(quantity) || quantity < 1) {
    return response.status(400).json({ message: 'Invalid product or quantity.' });
  }
  const product = await Product.findOne({ id: productId, active: true });
  if (!product) return response.status(404).json({ message: 'Product not found.' });
  if (product.stock < 1) return response.status(409).json({ message: 'Product is out of stock.' });

  let cart = await Cart.findOne({ user: request.user._id });
  if (!cart) cart = new Cart({ user: request.user._id, items: [] });

  const existing = cart.items.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity = Math.min(product.stock, existing.quantity + quantity);
  } else {
    cart.items.push({ productId, quantity: Math.min(product.stock, quantity) });
  }
  await cart.save();
  response.json({ items: cart.items });
}

export async function updateCartItem(request, response) {
  const { productId } = request.params;
  const { quantity } = request.body;
  if (!Number.isInteger(quantity) || quantity < 0) {
    return response.status(400).json({ message: 'Invalid quantity.' });
  }

  const cart = await Cart.findOne({ user: request.user._id });
  if (!cart) return response.status(404).json({ message: 'Cart not found.' });

  if (quantity === 0) {
    cart.items = cart.items.filter((i) => i.productId !== productId);
  } else {
    const product = await Product.findOne({ id: productId, active: true });
    if (!product) return response.status(404).json({ message: 'Product not found.' });
    const item = cart.items.find((i) => i.productId === productId);
    if (item) item.quantity = Math.min(product.stock, quantity);
  }
  await cart.save();
  response.json({ items: cart.items });
}

export async function removeFromCart(request, response) {
  const { productId } = request.params;
  const cart = await Cart.findOne({ user: request.user._id });
  if (cart) {
    cart.items = cart.items.filter((i) => i.productId !== productId);
    await cart.save();
  }
  response.json({ items: cart?.items || [] });
}

export async function clearCart(request, response) {
  await Cart.findOneAndUpdate({ user: request.user._id }, { items: [] });
  response.json({ items: [] });
}
