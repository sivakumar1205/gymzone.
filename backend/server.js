import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import connectDatabase from './config/database.js';
import { initEmailTransport } from './utils/email.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
const port = Number(process.env.PORT) || 5000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random value of at least 32 characters in backend/.env.');
  process.exit(1);
}

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_request, response) => {
  const rzpId = process.env.RAZORPAY_KEY_ID;
  const rzpSecret = process.env.RAZORPAY_KEY_SECRET;
  response.json({
    status: 'ok',
    razorpayConfigured: Boolean(rzpId && rzpSecret && !rzpId.startsWith('your_') && !rzpSecret.startsWith('your_')),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/payment', paymentRoutes);

app.use((_request, response) => {
  response.status(404).json({ message: 'API route not found.' });
});
app.use(errorHandler);

try {
  await connectDatabase();
  // Verify SMTP credentials at startup so misconfiguration is caught early.
  await initEmailTransport();
  app.listen(port, () => {
    console.log(`GYMZONE API listening on http://localhost:${port}`);
  });
} catch (error) {
  console.error(`Unable to start GYMZONE API: ${error.message}`);
  process.exitCode = 1;
}
