import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { sendOrderConfirmationEmail } from '../utils/email.js';

const addressFields = ['fullName', 'email', 'phone', 'address', 'city', 'postalCode', 'country'];

export async function placeOrder(request, response) {
  const { items, shippingAddress, paymentMethod } = request.body;
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return response.status(400).json({ message: 'Your order must contain between 1 and 50 items.' });
  }
  if (!shippingAddress || addressFields.some((field) => typeof shippingAddress[field] !== 'string' || !shippingAddress[field].trim())) {
    return response.status(400).json({ message: 'Complete every shipping address field.' });
  }
  if (!['cash_on_delivery', 'razorpay'].includes(paymentMethod)) {
    return response.status(400).json({ message: 'Invalid payment method.' });
  }

  const normalizedItems = new Map();
  for (const item of items) {
    if (typeof item.productId !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      return response.status(400).json({ message: 'One or more order quantities are invalid.' });
    }
    normalizedItems.set(item.productId, (normalizedItems.get(item.productId) || 0) + item.quantity);
  }

  const reserved = [];
  try {
    const orderItems = [];
    let subtotal = 0;
    for (const [productId, quantity] of normalizedItems) {
      const product = await Product.findOneAndUpdate(
        { id: productId, active: true, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true },
      );
      if (!product) {
        const error = new Error(`Not enough stock is available for ${productId}. Refresh your cart and try again.`);
        error.status = 409;
        throw error;
      }
      reserved.push({ productId, quantity });
      subtotal += product.price * quantity;
      orderItems.push({
        productId: product.id,
        name: product.name,
        image: product.image,
        unitPrice: product.price,
        quantity,
      });
    }

    const order = await Order.create({
      user: request.user._id,
      items: orderItems,
      shippingAddress: Object.fromEntries(addressFields.map((field) => [field, shippingAddress[field].trim()])),
      subtotal,
      paymentMethod,
      paymentStatus: 'pending',
    });

    // Send confirmation email — fire and forget, don't block the response
    sendOrderConfirmationEmail(shippingAddress.email.trim(), order).catch(() => {});

    response.status(201).json({ order });
  } catch (error) {
    try {
      await Promise.all(reserved.map(({ productId, quantity }) => (
        Product.updateOne({ id: productId }, { $inc: { stock: quantity } })
      )));
    } catch (rollbackError) {
      console.error('Order inventory rollback failed.', rollbackError);
      const rollbackFailure = new Error('Order placement failed and inventory could not be restored. Contact support.');
      rollbackFailure.status = 500;
      throw rollbackFailure;
    }
    throw error;
  }
}

export async function listMyOrders(request, response) {
  const orders = await Order.find({ user: request.user._id }).sort({ createdAt: -1 });
  response.json({ orders });
}
