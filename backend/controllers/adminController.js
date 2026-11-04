import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

export async function listProducts(_request, response) {
  response.json({ products: await Product.find().sort({ createdAt: 1 }) });
}

export async function createProduct(request, response) {
  const product = await Product.create({ ...request.body, id: request.body.id?.trim() });
  response.status(201).json({ product });
}

export async function updateProduct(request, response) {
  const product = await Product.findOneAndUpdate(
    { id: request.params.id },
    request.body,
    { new: true, runValidators: true },
  );
  if (!product) return response.status(404).json({ message: 'Product not found.' });
  response.json({ product });
}

export async function deleteProduct(request, response) {
  const product = await Product.findOneAndUpdate({ id: request.params.id }, { active: false }, { new: true });
  if (!product) return response.status(404).json({ message: 'Product not found.' });
  response.json({ message: 'Product archived.' });
}

export async function restoreProduct(request, response) {
  const product = await Product.findOneAndUpdate({ id: request.params.id }, { active: true }, { new: true });
  if (!product) return response.status(404).json({ message: 'Product not found.' });
  response.json({ message: 'Product restored.' });
}

export async function listUsers(_request, response) {
  const users = await User.find().sort({ createdAt: -1 });
  response.json({ users: users.map((user) => user.toSafeObject()) });
}

export async function updateUserStatus(request, response) {
  const user = await User.findById(request.params.id);
  if (!user) return response.status(404).json({ message: 'User not found.' });
  if (user.role === 'admin') return response.status(400).json({ message: 'Administrator accounts cannot be disabled here.' });
  user.isActive = Boolean(request.body.isActive);
  await user.save();
  response.json({ user: user.toSafeObject() });
}

export async function listOrders(_request, response) {
  const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
  response.json({ orders });
}

export async function updateOrderStatus(request, response) {
  const allowedStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!allowedStatuses.includes(request.body.status)) {
    return response.status(400).json({ message: 'Choose a valid order status.' });
  }
  const order = await Order.findById(request.params.id);
  if (!order) return response.status(404).json({ message: 'Order not found.' });
  if (order.status === 'cancelled' && request.body.status !== 'cancelled') {
    return response.status(400).json({ message: 'A cancelled order cannot be reopened.' });
  }
  const released = [];
  if (request.body.status === 'cancelled' && order.status !== 'cancelled') {
    try {
      for (const item of order.items) {
        await Product.updateOne({ id: item.productId }, { $inc: { stock: item.quantity } });
        released.push(item);
      }
    } catch (error) {
      try {
        await Promise.all(released.map((item) => Product.updateOne(
          { id: item.productId },
          { $inc: { stock: -item.quantity } },
        )));
      } catch (rollbackError) {
        console.error('Order cancellation inventory rollback failed.', rollbackError);
        const rollbackFailure = new Error('Order cancellation failed and inventory could not be restored. Contact support.');
        rollbackFailure.status = 500;
        throw rollbackFailure;
      }
      throw error;
    }
  }
  order.status = request.body.status;
  try {
    await order.save();
  } catch (error) {
    if (released.length) {
      try {
        await Promise.all(released.map((item) => Product.updateOne(
          { id: item.productId },
          { $inc: { stock: -item.quantity } },
        )));
      } catch (rollbackError) {
        console.error('Order status inventory rollback failed.', rollbackError);
        const rollbackFailure = new Error('Order status update failed and inventory could not be restored. Contact support.');
        rollbackFailure.status = 500;
        throw rollbackFailure;
      }
    }
    throw error;
  }
  response.json({ order });
}
