import { createHmac } from 'node:crypto';
import Razorpay from 'razorpay';
import Order from '../models/Order.js';

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keyId.startsWith('your_')) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function createRazorpayOrder(request, response) {
  const razorpay = getRazorpay();
  if (!razorpay) {
    return response.status(503).json({ message: 'Payment gateway is not configured. Use cash on delivery.' });
  }

  const { orderId } = request.body;
  if (!orderId) return response.status(400).json({ message: 'orderId is required.' });

  const order = await Order.findById(orderId).select('+razorpayOrderId');
  if (!order) return response.status(404).json({ message: 'Order not found.' });
  if (String(order.user) !== String(request.user._id)) return response.status(403).json({ message: 'Forbidden.' });
  if (order.paymentStatus === 'paid') return response.status(400).json({ message: 'Order is already paid.' });

  const rzpOrder = await razorpay.orders.create({
    amount: Math.round(order.subtotal * 100),
    currency: 'INR',
    receipt: String(order._id),
  });

  order.razorpayOrderId = rzpOrder.id;
  await order.save();

  response.json({
    razorpayOrderId: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}

export async function verifyRazorpayPayment(request, response) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || keySecret.startsWith('your_')) {
    return response.status(503).json({ message: 'Payment gateway is not configured.' });
  }

  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = request.body;
  if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return response.status(400).json({ message: 'All payment fields are required.' });
  }

  const expectedSignature = createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    return response.status(400).json({ message: 'Payment verification failed. Signature mismatch.' });
  }

  const order = await Order.findById(orderId).select('+razorpayOrderId');
  if (!order) return response.status(404).json({ message: 'Order not found.' });
  if (String(order.user) !== String(request.user._id)) return response.status(403).json({ message: 'Forbidden.' });

  order.paymentStatus = 'paid';
  order.paymentMethod = 'razorpay';
  order.razorpayPaymentId = razorpayPaymentId;
  order.status = 'confirmed';
  await order.save();

  response.json({ message: 'Payment verified successfully.', order });
}

export async function razorpayWebhook(request, response) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (secret && !secret.startsWith('your_')) {
    const signature = request.headers['x-razorpay-signature'];
    const expected = createHmac('sha256', secret).update(JSON.stringify(request.body)).digest('hex');
    if (signature !== expected) return response.status(400).json({ message: 'Invalid webhook signature.' });
  }

  const { event, payload } = request.body;
  if (event === 'payment.captured') {
    const payment = payload?.payment?.entity;
    if (payment?.order_id) {
      await Order.findOneAndUpdate(
        { razorpayOrderId: payment.order_id },
        { paymentStatus: 'paid', razorpayPaymentId: payment.id, status: 'confirmed' },
      );
    }
  } else if (event === 'payment.failed') {
    const payment = payload?.payment?.entity;
    if (payment?.order_id) {
      await Order.findOneAndUpdate(
        { razorpayOrderId: payment.order_id },
        { paymentStatus: 'failed' },
      );
    }
  }
  response.json({ received: true });
}
