import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'GYMZONE Admin' } = process.env;

if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set MONGO_URI, ADMIN_EMAIL, and ADMIN_PASSWORD in backend/.env first.');
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 12) {
  console.error('ADMIN_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

try {
  await mongoose.connect(MONGO_URI);
  const existingUser = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existingUser) {
    console.error('That email is already in use. Choose another ADMIN_EMAIL.');
    process.exitCode = 1;
  } else {
    const user = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
      isEmailVerified: true,
    });
    console.log(`Administrator created: ${user.email}`);
  }
} catch (error) {
  console.error(`Unable to create administrator: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
