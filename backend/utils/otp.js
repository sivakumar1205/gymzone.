import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import Otp from '../models/Otp.js';
import { sendOtpEmail } from './email.js';

const OTP_TTL_MS = 5 * 60 * 1000;       // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;    // 60 seconds between resends
const MAX_ATTEMPTS = 5;

function hashOtp(otp, email, purpose) {
  return createHmac('sha256', process.env.JWT_SECRET)
    .update(`${email}\0${purpose}\0${otp}`)
    .digest();
}

// ─── Issue (create + send) ────────────────────────────────────────────────────

export async function issueOtp(email, purpose) {
  // Check for an active, unexpired, unused OTP to enforce resend cooldown.
  const existing = await Otp.findOne({
    email,
    purpose,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (existing) {
    const elapsed = Date.now() - existing.lastSentAt.getTime();
    const remaining = RESEND_COOLDOWN_MS - elapsed;
    if (remaining > 0) {
      const err = new Error(
        `Please wait ${Math.ceil(remaining / 1000)} seconds before requesting a new code.`,
      );
      err.status = 429;
      err.retryAfter = Math.ceil(remaining / 1000);
      throw err;
    }
  }

  // Remove expired/used records before creating the next one.
  await Otp.deleteMany({ email, purpose });

  const otp = String(randomInt(100000, 1000000));

  let record;
  try {
    record = await Otp.create({
      email,
      otpHash: hashOtp(otp, email, purpose).toString('hex'),
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      lastSentAt: new Date(),
      attempts: 0,
      used: false,
    });
  } catch (error) {
    if (error.code === 11000) {
      const cooldownError = new Error('A code was just requested. Wait 60 seconds before requesting another.');
      cooldownError.status = 429;
      cooldownError.retryAfter = 60;
      throw cooldownError;
    }
    throw error;
  }

  try {
    await sendOtpEmail(email, otp, purpose);
  } catch (error) {
    await Otp.deleteOne({ _id: record._id });
    throw error;
  }

  return otp; // returned so controllers can expose devOtp in non-production
}

// ─── Verify and consume ───────────────────────────────────────────────────────
// Marks the OTP as used=true on success, preventing replay.

export async function verifyOtp(email, purpose, candidate) {
  if (typeof candidate !== 'string' || !/^\d{6}$/.test(candidate.trim())) {
    const err = new Error('Enter a valid 6-digit code.');
    err.status = 400;
    throw err;
  }

  const record = await Otp.findOne({
    email,
    purpose,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    const err = new Error('The code has expired or is invalid. Request a new one.');
    err.status = 400;
    throw err;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: record._id });
    const err = new Error('Too many incorrect attempts. Request a new code.');
    err.status = 429;
    throw err;
  }

  const candidateHash = hashOtp(candidate.trim(), email, purpose);
  const storedHash = Buffer.from(record.otpHash, 'hex');
  const matches = candidateHash.length === storedHash.length && timingSafeEqual(candidateHash, storedHash);

  if (!matches) {
    const updated = await Otp.findOneAndUpdate(
      { _id: record._id, used: false, attempts: { $lt: MAX_ATTEMPTS } },
      { $inc: { attempts: 1 } },
      { new: true },
    );
    if (!updated) {
      await Otp.deleteOne({ _id: record._id, used: false });
      const err = new Error('Too many incorrect attempts. Request a new code.');
      err.status = 429;
      throw err;
    }
    const remaining = MAX_ATTEMPTS - updated.attempts;
    if (remaining === 0) {
      await Otp.deleteOne({ _id: record._id, used: false });
      const err = new Error('Too many incorrect attempts. Request a new code.');
      err.status = 429;
      throw err;
    }
    const err = new Error(
      `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    );
    err.status = 400;
    throw err;
  }

  // Correct — mark as used so it cannot be replayed.
  const consumed = await Otp.updateOne(
    {
      _id: record._id,
      otpHash: record.otpHash,
      used: false,
      attempts: { $lt: MAX_ATTEMPTS },
      expiresAt: { $gt: new Date() },
    },
    { $set: { used: true } },
  );
  if (consumed.modifiedCount !== 1) {
    const err = new Error('The code has expired or is invalid. Request a new one.');
    err.status = 400;
    throw err;
  }
}
