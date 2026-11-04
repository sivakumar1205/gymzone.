import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const pendingSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true },
  phone:     { type: String, default: '' },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

// TTL — MongoDB auto-deletes expired pending registrations.
pendingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

pendingSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

export default mongoose.model('PendingRegistration', pendingSchema);
